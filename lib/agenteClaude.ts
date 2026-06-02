import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Cliente ──────────────────────────────────────────────────────────────────

// Singleton de módulo — solo se ejecuta en el servidor (Server Actions).
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// "gemini-2.5-flash: rápido, bajo costo, excelente para extracción estructurada y visión.
const MODELO = ""gemini-2.5-flash;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface Apoderado {
  nombre_completo: string;
  facultades: string[];
  tipo_ejercicio: "individual" | "mancomunado" | string;
}

export interface ResultadoPoderes {
  apoderados: Apoderado[];
}

export interface ResultadoIdentidad {
  nombre_completo_ine: string;
  curp: string;
  domicilio_completo: string;
}

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Extrae el primer bloque JSON válido de un string.
 * Gemini, al igual que Claude, a veces envuelve la respuesta en ```json … ```;
 * este helper lo elimina antes de parsear.
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

export interface ResultadoActa {
  denominacion: string;
  apoderados: Apoderado[];
}

// ─── Función 0: análisis completo del Acta Constitutiva (PDF nativo) ──────────

/**
 * Recibe el Acta Constitutiva como base64 y se lo pasa a Gemini directamente
 * como inlineData con mimeType "application/pdf".
 * Gemini lee el PDF nativo sin necesidad de pdf-parse ni extracción previa de texto.
 *
 * Extrae en una sola llamada:
 *   - denominacion: razón social completa con tipo societario
 *   - apoderados:   lista con nombre, facultades y tipo de ejercicio
 */
export async function analizarActaConstitutiva(
  actaBase64: string
): Promise<ResultadoActa> {
  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { temperature: 0 },
  });

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
- Si un apoderado puede actuar por sí solo: tipo_ejercicio = "individual".
- Si requiere actuar junto con otro: tipo_ejercicio = "mancomunado".
- Copia las facultades exactamente como están redactadas (ej. "Pleitos y Cobranzas", "Actos de Administración").
- Si no encuentras apoderados, usa: "apoderados": []
- Si no encuentras la denominación, usa: "denominacion": ""
- No inventes ni infieras datos que no estén explícitamente en el documento.`,
    },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: actaBase64,
      },
    },
    {
      text: "Devuelve ahora el JSON con los campos 'denominacion' y 'apoderados'.",
    },
  ]);

  const texto = resultado.response.text();
  return parsearJsonSeguro<ResultadoActa>(texto);
}



/**
 * Envía el fragmento de texto del Acta/Poder Notarial a Gemini y devuelve
 * la lista estructurada de apoderados con sus facultades.
 *
 * Se usa temperature: 0 para garantizar determinismo total.
 */
export async function analizarTextoPoderes(
  textoRecortado: string
): Promise<ResultadoPoderes> {
  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { temperature: 0 },
  });

  const prompt = `Eres un abogado corporativo mexicano experto en derecho societario y notarial.
Tu única tarea es leer el siguiente fragmento de un instrumento notarial mexicano y extraer
con precisión absoluta la información de los apoderados legales.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin explicaciones.
2. El JSON debe tener exactamente esta estructura:
   {
     "apoderados": [
       {
         "nombre_completo": "string — nombre tal como aparece en el documento",
         "facultades": ["string — nombre exacto de cada poder otorgado"],
         "tipo_ejercicio": "individual | mancomunado"
       }
     ]
   }
3. Si un apoderado puede actuar por sí solo, tipo_ejercicio es "individual".
   Si requiere actuar junto con otro apoderado, es "mancomunado".
4. Si no encuentras apoderados, devuelve: { "apoderados": [] }
5. Copia las facultades exactamente como están redactadas
   (ej. "Pleitos y Cobranzas", "Actos de Administración", "Actos de Dominio").
6. No inventes ni inferencias datos que no estén explícitamente en el texto.

FRAGMENTO A ANALIZAR:
${textoRecortado}`;

  const resultado = await model.generateContent(prompt);
  const texto = resultado.response.text();

  return parsearJsonSeguro<ResultadoPoderes>(texto);
}

// ─── Función 2: análisis de documentos de identidad (visión) ─────────────────

/**
 * Envía INE y comprobante de domicilio como imágenes en una sola llamada
 * aprovechando las capacidades de visión de gemini-3.5-flash.
 *
 * @param ineBase64          - INE en base64 (sin prefijo data:)
 * @param comprobanteBase64  - Comprobante en base64 (sin prefijo data:)
 * @param ineMediaType       - MIME type de la imagen INE
 * @param comprobanteMediaType - MIME type del comprobante
 */
export async function analizarDocumentosIdentidad(
  ineBase64: string,
  comprobanteBase64: string,
  ineMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg",
  comprobanteMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<ResultadoIdentidad> {
  const model = genAI.getGenerativeModel({
    model: MODELO,
    generationConfig: { temperature: 0 },
  });

  // Gemini recibe imágenes como partes inline con mimeType + data base64
  const resultado = await model.generateContent([
    {
      text: `Eres un sistema de extracción de datos de documentos de identidad mexicanos.
Lee las dos imágenes que te proporciono y extrae los datos exactamente como aparecen escritos,
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

La PRIMERA imagen es el INE. La SEGUNDA imagen es el comprobante de domicilio.`,
    },
    // Primera imagen: INE
    {
      inlineData: {
        mimeType: ineMediaType,
        data: ineBase64,
      },
    },
    // Segunda imagen: comprobante de domicilio
    {
      inlineData: {
        mimeType: comprobanteMediaType,
        data: comprobanteBase64,
      },
    },
    {
      text: "Devuelve ahora el JSON con los tres campos: nombre_completo_ine, curp y domicilio_completo.",
    },
  ]);

  const texto = resultado.response.text();
  return parsearJsonSeguro<ResultadoIdentidad>(texto);
}
