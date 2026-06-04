"use server";

import { createClient } from "@supabase/supabase-js";
import { analizarActaConstitutiva, analizarDocumentosIdentidad } from "@/lib/agenteClaude";
import { validarIdentidad } from "@/lib/validador";
import { generarContratoWord } from "@/lib/generadorWord";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type AccionExitosa = {
  success: true;
  fileBase64: string;
  fileName: string;
};

export type AccionFallida = {
  success: false;
  error: string;
};

export type ResultadoAccion = AccionExitosa | AccionFallida;

/** Payload que el cliente envía después de subir los archivos a Supabase Storage. */
export interface UrlsPayload {
  urls: {
    actaConstitutiva: string;
    poderNotarial: string;
    ine?: string;
    comprobanteDomicilio?: string;
    templateContrato: string;
  };
  /** Rutas dentro del bucket para poder borrarlas al terminar. */
  paths: {
    actaConstitutiva: string;
    poderNotarial: string;
    ine?: string;
    comprobanteDomicilio?: string;
    templateContrato: string;
  };
  monto_credito: string;
  dias_credito: string;
}

// ─── Cliente Supabase (solo servidor) ────────────────────────────────────────

// Usamos la service_role key para poder borrar archivos del bucket temporal.
// Esta key NUNCA se expone al navegador — solo vive en el entorno de servidor.
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key);
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Descarga un archivo desde una URL pública de Supabase Storage
 * y lo devuelve como Buffer de Node.js.
 */
async function urlABuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar el archivo desde Storage (${res.status}): ${url}`
    );
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Descarga un archivo y devuelve su contenido como base64,
 * junto con el MIME type detectado desde la URL.
 */
async function urlABase64(
  url: string
): Promise<{ base64: string; mime: "image/jpeg" | "image/png" | "image/gif" | "image/webp" }> {
  if (!url || url.trim().length === 0) {
    return { base64: "", mime: "image/jpeg" };
  }
  const buf = await urlABuffer(url);
  const base64 = buf.toString("base64");
  const lower = url.toLowerCase();
  const mime =
    lower.includes(".png") ? "image/png" :
    lower.includes(".gif") ? "image/gif" :
    lower.includes(".webp") ? "image/webp" :
    "image/jpeg";
  return { base64, mime };
}

/** Elimina en paralelo todas las rutas temporales del bucket. */
async function limpiarBucket(paths: UrlsPayload["paths"]): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const rutas = Object.values(paths).filter((r): r is string => !!r && r.length > 0);
    if (rutas.length === 0) return;
    const { error } = await supabase.storage.from("temporales").remove(rutas);
    if (error) {
      // No lanzamos — la limpieza es best-effort para no ocultar el éxito de la operación
      console.warn("[limpiarBucket] No se pudieron borrar los temporales:", error.message);
    }
  } catch (e) {
    console.warn("[limpiarBucket] Error al intentar limpiar:", (e as Error).message);
  }
}

// ─── Server Action principal ──────────────────────────────────────────────────

/**
 * Recibe las URLs públicas de los 5 archivos ya subidos a Supabase Storage
 * por el cliente, descarga los buffers en el servidor y ejecuta el pipeline
 * completo de generación del contrato.
 *
 * Al no recibir archivos binarios, el payload JSON es < 1 KB,
 * eliminando definitivamente el error 413 en Vercel Hobby.
 *
 * Flujo:
 *   1. Descarga en paralelo: Acta+Poder (→ base64) + template (→ buffer) + imágenes
 *   2. Analiza el Acta directamente con Gemini PDF nativo (sin pdf-parse)
 *   3. Analiza INE + comprobante con Gemini visión
 *   4. Valida identidad con Dice coefficient (sin API)
 *   5. Genera contrato Word con docxtemplater (sin API)
 *   6. Borra los temporales del bucket
 *   7. Retorna el .docx como base64
 */
export async function procesarContratoAction(
  payload: UrlsPayload
): Promise<ResultadoAccion> {
  const { urls, paths, monto_credito, dias_credito } = payload;

  // ── 0. Validación básica del payload ──────────────────────────────────────
  const camposObligatorios: (keyof typeof urls)[] = ["actaConstitutiva", "poderNotarial", "templateContrato"];
  for (const campo of camposObligatorios) {
    const url = urls[campo];
    if (!url || typeof url !== "string") {
      return { success: false, error: `URL inválida para el campo "${campo}".` };
    }
  }

  try {
    // ── 1. Descargar todos los archivos en paralelo ───────────────────────────
    // El Acta se descarga como Buffer — File API lo escribe en disco y lo sube a Google.
    // Las imágenes siguen como base64 (inlineData) porque son archivos pequeños.
    // La plantilla se descarga como Buffer para docxtemplater.
    const [actaBuffer, , templateBuffer, ineData, comprobanteData] =
      await Promise.all([
        urlABuffer(urls.actaConstitutiva),
        urlABuffer(urls.poderNotarial),              // incluido para validación futura
        urlABuffer(urls.templateContrato),
        urlABase64(urls.ine ?? ""),
        urlABase64(urls.comprobanteDomicilio ?? ""),
      ]);

    // ── 2. Analizar el Acta con Gemini File API (evita el error 400 por payload grande) ─
    const { denominacion, apoderados } = await analizarActaConstitutiva(actaBuffer);

    if (apoderados.length === 0) {
      await limpiarBucket(paths);
      return {
        success: false,
        error:
          "Gemini no encontró apoderados en el Acta Constitutiva. Verifica que el PDF incluya la cláusula de Administración o Poderes y que no esté protegido.",
      };
    }

    // ── 3. Analizar documentos de identidad con Gemini visión ─────────────────
    const { nombre_completo_ine, curp: _curp, domicilio_completo } =
      await analizarDocumentosIdentidad(
        ineData.base64,
        comprobanteData.base64,
        ineData.mime,
        comprobanteData.mime
      );

    // ── 5. Validar identidad (Dice, sin API) ──────────────────────────────────
    const validacion = validarIdentidad(nombre_completo_ine, apoderados);

    if (validacion.estatus === "RECHAZADO") {
      await limpiarBucket(paths);
      return {
        success: false,
        error: `Identidad rechazada. El nombre del INE ("${nombre_completo_ine}") no coincide con ningún apoderado del acta (similitud: ${(validacion.rating * 100).toFixed(1)}%).`,
      };
    }

    if (validacion.estatus === "REVISIÓN MANUAL") {
      await limpiarBucket(paths);
      return {
        success: false,
        error: `Revisión manual requerida (similitud ${(validacion.rating * 100).toFixed(1)}%). Posible coincidencia: "${validacion.apoderado?.nombre_completo ?? "N/A"}".`,
      };
    }

    // ── 6. Generar contrato Word ───────────────────────────────────────────────
    const apoderadoValidado = validacion.apoderado!;
    const facultades_texto  = apoderadoValidado.facultades.join(", ");

    const denominacionFinal = denominacion || "NO DETECTADA";
    const wordBuffer = generarContratoWord(templateBuffer, {
      // Nombres canónicos
      denominacion_social: denominacionFinal,
      nombre_apoderado:    nombre_completo_ine,
      domicilio:           domicilio_completo,
      facultades_texto,
      monto_credito:  monto_credito  || "0.00",
      dias_credito:   dias_credito   || "15",
      // Alias alternativos
      domicilio_cliente:   domicilio_completo,
      nombre_cliente:      nombre_completo_ine,
      razon_social:        denominacionFinal,
      denominacion:        denominacionFinal,
    });

    // ── 7. Limpiar temporales (best-effort, no bloquea la respuesta) ──────────
    await limpiarBucket(paths);

    // ── 8. Retornar .docx como base64 ─────────────────────────────────────────
    const fileBase64 = wordBuffer.toString("base64");
    const fileName   = `contrato_${(denominacion || "generado").replace(/\s+/g, "_")}.docx`;

    return { success: true, fileBase64, fileName };
  } catch (e) {
    console.error("[procesarContratoAction] Error interno:", e);
    // Intenta limpiar incluso en caso de error
    await limpiarBucket(paths).catch(() => null);
    return {
      success: false,
      error: `Error interno: ${(e as Error).message}`,
    };
  }
}
