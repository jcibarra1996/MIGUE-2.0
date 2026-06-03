import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Clientes ─────────────────────────────────────────────────────────────────

const genAI      = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

// gemini-2.5-flash: soporta File API y documentos de hasta 1 000 páginas.
const MODELO = "gemini-2.5-flash";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface Apoderado {
  nombre_completo: string;
  facultades: string[];
  tipo_ejercicio: "individual" | "mancomunado" | string;
}

export interface ResultadoActa {
  denominacion: string;
  apoderados: Apoderado[];
}

export interface ResultadoPoderes {
  apoderados: Apoderado[];
}

export interface ResultadoIdentidad {
  nombre_completo_ine: string;
  curp: string;
  domicilio_completo: string;
}

// ─── Helper: parseo seguro de JSON ───────────────────────────────────────────

/**
 * Elimina bloques markdown opcionales y extrae el primer objeto JSON válido
 * de la respuesta del modelo.
 */
function parsearJsonSeguro<T>(raw: string): T {
  const sinMarkdown = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const inicio = sinMarkdown.indexOf("{");
  if (inicio === -1) {
    throw new Error(`La respuesta no contiene JSON válido:\n${raw}`);
  }

  return JSON.parse(sinMarkdown.slice(inicio)) as T;
}

// ─── Helper: subida de PDF a Google File API ─────────────────────────────────

/**
 * 1. Escribe el buffer en un archivo temporal en os.tmpdir().
 * 2. Sube el archivo a la bóveda de Google con FileManager.
 * 3. Devuelve el fileUri para usarlo en generateContent.
 * 4. El llamador es responsable de limpiar (ver limpiarArchivoGoogle).
 */
async function subirPdfAGoogle(
  buffer: Buffer,
  nombreBase: string
): Promise<{ fileUri: string; tempPath: string; googleName: string }> {
  const tempPath = path.join(os.tmpdir(), `${Date.now()}-${nombreBase}.pdf`);

  fs.writeFileSync(tempPath, buffer);

  const uploadResponse = await fileManager.uploadFile(tempPath, {
    mimeType: "application/pdf",
    displayName: nombreBase,
  });

  const googleName = uploadResponse.file.name;

  // Esperar a que Google procese el archivo antes de usarlo en generateContent.
  // Sin este polling, generateContent puede recibir un archivo en estado PROCESSING
  // y responder con 400 "Unable to process input image".
  let file = await fileManager.getFile(googleName);
  while (file.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 2000));
    file = await fileManager.getFile(googleName);
  }

  if (file.state === "FAILED") {
    throw new Error(`Google File API rechazó el archivo "${nombreBase}": estado FAILED.`);
  }

  return {
    fileUri:    uploadResponse.file.uri,
    tempPath,
    googleName,
  };
}

/**
 * Limpieza estricta:
 * - Borra el archivo temporal del sistema de ficheros de Vercel.
 * - Borra el archivo de la bóveda de Google (evita acumulación y costos).
 * Siempre se llama en un bloque finally — los errores solo se loguean.
 */
async function limpiarArchivoGoogle(
  tempPath: string,
  googleName: string
): Promise<void> {
  try {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  } catch (e) {
    console.warn("[limpiarArchivoGoogle] No se pudo borrar el temporal:", e);
  }
  try {
    await fileManager.deleteFile(googleName);
  } catch (e) {
    console.warn("[limpiarArchivoGoogle] No se pudo borrar de Google:", e);
  }
}

// ─── Función 1: análisis del Acta Constitutiva vía File API ──────────────────

/**
 * Sube el Acta Constitutiva a Google File API y pide a Gemini que extraiga
 * la denominación social y todos los apoderados en una sola llamada.
 *
 * Se usa File API en lugar de inlineData para evitar el error
 * "400 Bad Request: Unable to process input" causado por payloads Base64
 * demasiado grandes. File API pre-procesa el documento en los servidores
 * de Google antes de pasarlo al modelo.
 *
 * @param actaBuffer - Buffer del PDF del Acta Constitutiva
 */
export async function analizarActaConstitutiva(
  actaBuffer: Buffer
): Promise<ResultadoActa> {
  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { temperature: 0 },
  });

  let tempPath = "";
  let googleName = "";

  try {
    // ── 1. Subir el PDF a Google File API ─────────────────────────────────────
    const upload = await subirPdfAGoogle(actaBuffer, "acta-constitutiva");
    tempPath   = upload.tempPath;
    googleName = upload.googleName;

    // ── 2. Llamar a Gemini con fileData (no inlineData) ───────────────────────
    const resultado = await model.generateContent([
      {
        text: `Eres un abogado corporativo mexicano experto en derecho societario y notarial.
Lee el documento PDF adjunto (Acta Constitutiva o Poder Notarial) y extrae con precisión absoluta:

1. La DENOMINACIÓN SOCIAL completa de la empresa (nombre + tipo societario, ej. "ACME S.A. DE C.V.").
2. Todos los APODERADOS LEGALES con sus facultades otorgadas.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown.
- El JSON debe tener exactamente esta estructura:
  {
    "denominacion": "string — razón social completa tal como aparece en el acta",
    "apoderados": [
      {
        "nombre_completo": "string — nombre tal como aparece en el documento",
        "facultades": ["string — nombre exacto de cada poder otorgado"],
        "tipo_ejercicio": "individual | mancomunado"
      }
    ]
  }
- tipo_ejercicio = "individual" si puede actuar solo; "mancomunado" si requiere otro apoderado.
- Copia las facultades exactamente (ej. "Pleitos y Cobranzas", "Actos de Administración").
- Si no encuentras apoderados: "apoderados": []
- Si no encuentras la denominación: "denominacion": ""
- No inventes ni infieras datos que no estén en el documento.`,
      },
      {
        fileData: {
          fileUri:  upload.fileUri,
          mimeType: "application/pdf",
        },
      },
      {
        text: "Devuelve ahora el JSON con los campos 'denominacion' y 'apoderados'.",
      },
    ]);

    const texto = resultado.response.text();
    return parsearJsonSeguro<ResultadoActa>(texto);
  } finally {
    // Limpieza estricta: siempre se ejecuta, haya error o no
    if (googleName) await limpiarArchivoGoogle(tempPath, googleName);
  }
}

// ─── Función 2: análisis de documentos de identidad (visión, inlineData) ─────

/**
 * Las imágenes del INE y comprobante son documentos pequeños (< 5 MB habitualmente)
 * por lo que inlineData sigue siendo apropiado — File API es necesario solo
 * para PDFs pesados como el Acta Constitutiva.
 */
function limpiarBase64(raw: string): string {
  const idx = raw.indexOf("base64,");
  return idx !== -1 ? raw.slice(idx + 7) : raw.trim();
}

export async function analizarDocumentosIdentidad(
  ineBase64: string,
  comprobanteBase64: string,
  ineMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg",
  comprobanteMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<ResultadoIdentidad> {
  const inePayload         = limpiarBase64(ineBase64);
  const comprobantePayload = limpiarBase64(comprobanteBase64);

  const tieneIne         = inePayload.length > 100;
  const tieneComprobante = comprobantePayload.length > 100;

  // Si no hay ninguna imagen real, evitar la llamada a Gemini por completo.
  if (!tieneIne && !tieneComprobante) {
    return {
      nombre_completo_ine: "NO PROPORCIONADO",
      curp:                "NO PROPORCIONADO",
      domicilio_completo:  "NO PROPORCIONADO",
    };
  }

  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { temperature: 0 },
  });

  // Construir el array de partes con tipos explícitos para satisfacer el SDK.
  type Parte =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const partes: Parte[] = [
    {
      text: `Eres un sistema de extracción de datos de documentos de identidad mexicanos.
Lee las imágenes que te proporciono y extrae los datos exactamente como aparecen escritos,
sin correcciones ortográficas ni inferencias.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown.
2. El JSON debe tener exactamente estos tres campos:
   {
     "nombre_completo_ine": "string — nombre tal como aparece en el INE, en mayúsculas",
     "curp": "string — 18 caracteres alfanuméricos del CURP que aparece en el INE",
     "domicilio_completo": "string — dirección completa del comprobante: calle, número, colonia, municipio, estado y CP"
   }
3. Copia los datos carácter por carácter. No corrijas acentos, mayúsculas ni abreviaciones.
4. Si algún campo no es legible, coloca "NO LEGIBLE".
5. El CURP siempre tiene exactamente 18 caracteres.
${tieneIne && tieneComprobante ? "\nLa PRIMERA imagen es el INE. La SEGUNDA imagen es el comprobante de domicilio." : ""}`,
    },
  ];

  if (tieneIne) {
    partes.push({ inlineData: { mimeType: ineMediaType, data: inePayload } });
  }
  if (tieneComprobante) {
    partes.push({ inlineData: { mimeType: comprobanteMediaType, data: comprobantePayload } });
  }

  partes.push({
    text: "Devuelve ahora el JSON con los tres campos: nombre_completo_ine, curp y domicilio_completo.",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultado = await model.generateContent(partes as any);
  const texto = resultado.response.text();
  return parsearJsonSeguro<ResultadoIdentidad>(texto);
}
