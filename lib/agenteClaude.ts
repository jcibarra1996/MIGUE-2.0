import Anthropic from "@anthropic-ai/sdk";

// ─── Cliente ─────────────────────────────────────────────────────────────────

// El cliente se crea una sola vez al cargar el módulo (singleton de módulo).
// En Next.js App Router este archivo solo se ejecuta en el servidor (Route Handlers / Server Actions),
// por lo que process.env está disponible en tiempo de ejecución sin exponer la clave al navegador.
// IMPORTANT: usa NEXT_PUBLIC_ para que Next.js no la bloquee en el bundle de servidor,
// pero nunca se importa este módulo en componentes cliente.
const client = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
});

const MODELO = "claude-3-5-sonnet-latest";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface Apoderado {
  nombre_completo: string;
  // Lista de facultades otorgadas, ej. ["Pleitos y Cobranzas", "Actos de Administración"]
  facultades: string[];
  // "individual" si puede actuar solo; "mancomunado" si requiere otro apoderado
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

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Extrae el primer bloque JSON válido de un string.
 * Claude a veces envuelve la respuesta en markdown (```json … ```);
 * este helper lo elimina antes de parsear.
 */
function parsearJsonSeguro<T>(raw: string): T {
  // Elimina bloques de código markdown si los hay
  const sinMarkdown = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Localiza el primer '{' para evitar texto introductorio ocasional
  const inicio = sinMarkdown.indexOf("{");
  if (inicio === -1) {
    throw new Error(`La respuesta no contiene JSON válido:\n${raw}`);
  }

  return JSON.parse(sinMarkdown.slice(inicio)) as T;
}

// ─── Función 1: análisis de texto de poderes ─────────────────────────────────

/**
 * Envía el fragmento de texto extraído del Acta/Poder Notarial a Claude y
 * obtiene la lista estructurada de apoderados con sus facultades.
 *
 * Se usa temperature: 0 para garantizar determinismo total: dado el mismo texto
 * de entrada siempre se obtiene el mismo JSON de salida, sin variación creativa.
 */
export async function analizarTextoPoderes(
  textoRecortado: string
): Promise<ResultadoPoderes> {
  const respuesta = await client.messages.create({
    model: MODELO,
    max_tokens: 1024,
    temperature: 0,
    system: `Eres un abogado corporativo mexicano experto en derecho societario y notarial.
Tu única tarea es leer fragmentos de actas constitutivas o poderes notariales y extraer
con precisión absoluta la información de los apoderados legales que se otorgan.

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
4. Si no encuentras apoderados en el texto, devuelve: { "apoderados": [] }
5. Copia las facultades exactamente como están redactadas en el documento
   (ej. "Pleitos y Cobranzas", "Actos de Administración", "Actos de Dominio", "Títulos y Operaciones de Crédito").
6. No inventes ni inferencias datos que no estén explícitamente en el texto.`,
    messages: [
      {
        role: "user",
        content: `Analiza el siguiente fragmento de un instrumento notarial mexicano y extrae todos los apoderados con sus facultades:\n\n${textoRecortado}`,
      },
    ],
  });

  // Tomamos el primer bloque de texto de la respuesta
  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") {
    throw new Error("Claude no devolvió un bloque de texto en la respuesta.");
  }

  return parsearJsonSeguro<ResultadoPoderes>(bloque.text);
}

// ─── Función 2: análisis de documentos de identidad (visión) ─────────────────

/**
 * Envía INE y comprobante de domicilio como imágenes en una sola llamada
 * aprovechando las capacidades de visión de Claude.
 *
 * Ambas imágenes viajan como base64 en el mismo mensaje para minimizar
 * el número de llamadas a la API (política de mínimo uso de API externa).
 *
 * @param ineBase64        - Imagen del INE codificada en base64 (sin prefijo data:)
 * @param comprobanteBase64 - Imagen del comprobante de domicilio en base64 (sin prefijo data:)
 * @param ineMediaType     - MIME type de la imagen INE (default: image/jpeg)
 * @param comprobanteMediaType - MIME type del comprobante (default: image/jpeg)
 */
export async function analizarDocumentosIdentidad(
  ineBase64: string,
  comprobanteBase64: string,
  ineMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg",
  comprobanteMediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<ResultadoIdentidad> {
  const respuesta = await client.messages.create({
    model: MODELO,
    max_tokens: 512,
    temperature: 0,
    system: `Eres un sistema de extracción de datos de documentos de identidad mexicanos.
Tu única tarea es leer las imágenes que se te presentan y extraer los datos exactamente
como aparecen escritos, sin correcciones ortográficas ni inferencias.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown.
2. El JSON debe tener exactamente estos tres campos:
   {
     "nombre_completo_ine": "string — nombre tal como aparece en el INE, en mayúsculas",
     "curp": "string — 18 caracteres alfanuméricos del CURP en el INE",
     "domicilio_completo": "string — dirección completa del comprobante de domicilio incluyendo calle, número, colonia, municipio, estado y CP"
   }
3. Copia los datos carácter por carácter. No corrijas acentos, mayúsculas ni abreviaciones.
4. Si algún campo no es legible, coloca el valor "NO LEGIBLE" en ese campo.
5. El CURP siempre tiene exactamente 18 caracteres. Si ves menos, revisa la imagen.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "A continuación te presento dos imágenes. La PRIMERA es un INE (credencial para votar mexicana). La SEGUNDA es un comprobante de domicilio. Extrae los datos solicitados.",
          },
          // Primera imagen: INE
          {
            type: "image",
            source: {
              type: "base64",
              media_type: ineMediaType,
              data: ineBase64,
            },
          },
          {
            type: "text",
            text: "La imagen anterior es el INE. La siguiente imagen es el comprobante de domicilio:",
          },
          // Segunda imagen: comprobante de domicilio
          {
            type: "image",
            source: {
              type: "base64",
              media_type: comprobanteMediaType,
              data: comprobanteBase64,
            },
          },
          {
            type: "text",
            text: "Ahora devuelve el JSON con los tres campos: nombre_completo_ine, curp y domicilio_completo.",
          },
        ],
      },
    ],
  });

  const bloque = respuesta.content.find((b) => b.type === "text");
  if (!bloque || bloque.type !== "text") {
    throw new Error("Claude no devolvió un bloque de texto en la respuesta.");
  }

  return parsearJsonSeguro<ResultadoIdentidad>(bloque.text);
}
