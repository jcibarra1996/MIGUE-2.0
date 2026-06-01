"use server";

import { procesarActaConstitutiva } from "@/lib/extractorPdf";
import { analizarTextoPoderes, analizarDocumentosIdentidad } from "@/lib/agenteClaude";
import { validarIdentidad } from "@/lib/validador";
import { generarContratoWord } from "@/lib/generadorWord";

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export type AccionExitosa = {
  success: true;
  // Buffer del .docx generado codificado en base64 para cruzar el límite servidor→cliente
  fileBase64: string;
  // Nombre de archivo sugerido para la descarga
  fileName: string;
};

export type AccionFallida = {
  success: false;
  error: string;
};

export type ResultadoAccion = AccionExitosa | AccionFallida;

// ─── Helpers internos ─────────────────────────────────────────────────────────

function requerirArchivo(form: FormData, campo: string): File {
  const archivo = form.get(campo);
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error(`Falta el archivo requerido: "${campo}"`);
  }
  return archivo;
}

async function fileABuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function fileABase64(file: File): Promise<string> {
  const buffer = await fileABuffer(file);
  return buffer.toString("base64");
}

// ─── Server Action principal ──────────────────────────────────────────────────

/**
 * Orquesta el pipeline completo de generación de contratos.
 * Al vivir como Server Action, Next.js aplica el bodySizeLimit configurado
 * en next.config.ts (50 MB), resolviendo el error 413 con Actas grandes.
 *
 * Flujo:
 *   1. Extraer texto del Acta Constitutiva (pdf-parse, sin API)
 *   2. Analizar poderes con Claude (API call #1)
 *   3. Analizar INE + comprobante con visión de Claude (API call #2)
 *   4. Validar identidad con Dice coefficient (sin API)
 *   5. Generar contrato Word con docxtemplater (sin API)
 *   6. Retornar el .docx como base64 al cliente
 */
export async function procesarContratoAction(
  formData: FormData
): Promise<ResultadoAccion> {
  // ── 0. Extraer archivos y campos del FormData ──────────────────────────────
  let actaFile: File,
    poderFile: File,
    ineFile: File,
    comprobanteFile: File,
    templateFile: File;
  let monto_credito: string, dias_credito: string;

  try {
    actaFile        = requerirArchivo(formData, "actaConstitutiva");
    poderFile       = requerirArchivo(formData, "poderNotarial");
    ineFile         = requerirArchivo(formData, "ine");
    comprobanteFile = requerirArchivo(formData, "comprobanteDomicilio");
    templateFile    = requerirArchivo(formData, "templateContrato");

    monto_credito = (formData.get("monto_credito") as string | null)?.trim() || "0.00";
    dias_credito  = (formData.get("dias_credito")  as string | null)?.trim() || "15";
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  // Referencia para suprimir warning de variable no usada (poderNotarial se valida
  // pero su texto se delega a extractorPdf que lee el acta; se incluye para futura extracción)
  void poderFile;

  try {
    // ── 1. Extraer texto del Acta Constitutiva (sin API) ──────────────────────
    const actaBuffer = await fileABuffer(actaFile);
    const { denominacion, textoPoderes } = await procesarActaConstitutiva(actaBuffer);

    if (!textoPoderes) {
      return {
        success: false,
        error:
          "No se encontró la sección de poderes en el Acta Constitutiva. Verifica que el PDF sea legible y contenga texto seleccionable.",
      };
    }

    // ── 2. Analizar poderes con Claude ────────────────────────────────────────
    const { apoderados } = await analizarTextoPoderes(textoPoderes);

    if (apoderados.length === 0) {
      return {
        success: false,
        error:
          "No se encontraron apoderados en el fragmento de poderes extraído. Revisa que el Acta incluya la cláusula de Administración o Poderes.",
      };
    }

    // ── 3. Analizar documentos de identidad con Claude (visión) ───────────────
    const ineBase64         = await fileABase64(ineFile);
    const comprobanteBase64 = await fileABase64(comprobanteFile);

    const ineMime = (ineFile.type || "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const comprobanteMime = (comprobanteFile.type || "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const { nombre_completo_ine, curp: _curp, domicilio_completo } =
      await analizarDocumentosIdentidad(
        ineBase64,
        comprobanteBase64,
        ineMime,
        comprobanteMime
      );

    // ── 4. Validar identidad (Dice coefficient, sin API) ──────────────────────
    const validacion = validarIdentidad(nombre_completo_ine, apoderados);

    if (validacion.estatus === "RECHAZADO") {
      return {
        success: false,
        error: `Identidad rechazada. El nombre del INE ("${nombre_completo_ine}") no coincide con ningún apoderado del acta (similitud: ${(validacion.rating * 100).toFixed(1)}%). Verifica los documentos.`,
      };
    }

    if (validacion.estatus === "REVISIÓN MANUAL") {
      return {
        success: false,
        error: `Revisión manual requerida. Similitud del nombre: ${(validacion.rating * 100).toFixed(1)}%. Posible coincidencia: "${validacion.apoderado?.nombre_completo ?? "N/A"}". Un operador debe verificar manualmente.`,
      };
    }

    // ── 5. Generar contrato Word ───────────────────────────────────────────────
    const apoderadoValidado = validacion.apoderado!;
    const templateBuffer    = await fileABuffer(templateFile);
    const facultades_texto  = apoderadoValidado.facultades.join(", ");

    const wordBuffer = generarContratoWord(templateBuffer, {
      denominacion_social: denominacion || "NO DETECTADA",
      nombre_apoderado:    nombre_completo_ine,
      domicilio:           domicilio_completo,
      facultades_texto,
      monto_credito,
      dias_credito,
    });

    // ── 6. Retornar el .docx como base64 ──────────────────────────────────────
    // Server Actions no pueden retornar un Response HTTP binario;
    // convertimos a base64 para que el cliente lo reconstruya como Blob.
    const fileBase64 = wordBuffer.toString("base64");
    const fileName   = `contrato_${denominacion.replace(/\s+/g, "_") || "generado"}.docx`;

    return { success: true, fileBase64, fileName };
  } catch (e) {
    console.error("[procesarContratoAction] Error interno:", e);
    return {
      success: false,
      error: `Error interno: ${(e as Error).message}`,
    };
  }
}
