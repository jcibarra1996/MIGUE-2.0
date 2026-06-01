import { NextRequest, NextResponse } from "next/server";
import { procesarActaConstitutiva } from "@/lib/extractorPdf";
import { analizarTextoPoderes, analizarDocumentosIdentidad } from "@/lib/agenteClaude";
import { validarIdentidad } from "@/lib/validador";
import { generarContratoWord } from "@/lib/generadorWord";

// Next.js App Router — configuración del segmento de ruta
export const runtime = "nodejs";

// Aumenta el límite de body a 50 MB para aceptar PDFs grandes (Actas Constitutivas)
// más imágenes de INE/comprobante en un mismo FormData.
// En App Router, Route Handlers leen el body como stream de Node.js sin body-parser,
// por lo que este límite se aplica a nivel del segmento mediante la API oficial de Next.js.
export const maxDuration = 60; // segundos — necesario para llamadas a Claude API

// Segmento de configuración compatible con App Router (Next.js 13.4+)
// Referencia: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae un File del FormData y lanza si no está presente. */
function requerirArchivo(form: FormData, campo: string): File {
  const archivo = form.get(campo);
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error(`Falta el archivo requerido: "${campo}"`);
  }
  return archivo;
}

/** Convierte un File en Buffer de Node.js. */
async function fileABuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Convierte un File en string base64 (sin prefijo data:). */
async function fileABase64(file: File): Promise<string> {
  const buffer = await fileABuffer(file);
  return buffer.toString("base64");
}

/** Devuelve una respuesta JSON de error con el código HTTP indicado. */
function errorJson(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

// ─── Route Handler POST /api/procesar ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 0. Parsear FormData ────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorJson("No se pudo leer el formulario multipart.", 400);
  }

  // Valida que los 5 archivos estén presentes antes de iniciar el procesamiento
  let actaFile: File, poderFile: File, ineFile: File, comprobanteFile: File, templateFile: File;
  try {
    actaFile        = requerirArchivo(form, "actaConstitutiva");
    poderFile       = requerirArchivo(form, "poderNotarial");
    ineFile         = requerirArchivo(form, "ine");
    comprobanteFile = requerirArchivo(form, "comprobanteDomicilio");
    templateFile    = requerirArchivo(form, "templateContrato");
  } catch (e) {
    return errorJson((e as Error).message, 400);
  }

  try {
    // ── 1. Extraer texto del Acta Constitutiva (sin API) ──────────────────────
    const actaBuffer = await fileABuffer(actaFile);
    const { denominacion, textoPoderes } = await procesarActaConstitutiva(actaBuffer);

    if (!textoPoderes) {
      return errorJson(
        "No se encontró la sección de poderes en el Acta Constitutiva. Verifica que el PDF sea legible.",
        400
      );
    }

    // ── 2. Analizar poderes con Claude ────────────────────────────────────────
    // Solo se llama a la API para extracción semántica que regex no puede resolver.
    const { apoderados } = await analizarTextoPoderes(textoPoderes);

    if (apoderados.length === 0) {
      return errorJson(
        "Claude no encontró apoderados en el fragmento de poderes extraído. Revisa el documento.",
        400
      );
    }

    // ── 3. Analizar documentos de identidad con Claude (visión) ───────────────
    // Ambas imágenes viajan en una sola llamada para minimizar el uso de API.
    const ineBase64         = await fileABase64(ineFile);
    const comprobanteBase64 = await fileABase64(comprobanteFile);

    // Detecta el MIME type real del archivo para pasarlo correctamente a Claude
    const ineMime = (ineFile.type || "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const comprobanteMime = (comprobanteFile.type || "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const { nombre_completo_ine, curp: _curp, domicilio_completo } =
      await analizarDocumentosIdentidad(ineBase64, comprobanteBase64, ineMime, comprobanteMime);

    // ── 4. Validar identidad (matemática determinista, sin API) ───────────────
    const validacion = validarIdentidad(nombre_completo_ine, apoderados);

    if (validacion.estatus === "RECHAZADO") {
      return errorJson(
        `Identidad rechazada. El nombre del INE ("${nombre_completo_ine}") no coincide con ningún apoderado del acta (mejor similitud: ${(validacion.rating * 100).toFixed(1)}%). Verifica los documentos.`,
        400
      );
    }

    if (validacion.estatus === "REVISIÓN MANUAL") {
      // La solicitud no se procesa automáticamente; se informa al operador
      return NextResponse.json(
        {
          error: "REVISIÓN MANUAL requerida.",
          detalle: `La similitud del nombre (${(validacion.rating * 100).toFixed(1)}%) está por debajo del umbral de aprobación automática. Un operador debe verificar manualmente.`,
          nombre_ine: nombre_completo_ine,
          posible_apoderado: validacion.apoderado?.nombre_completo ?? null,
        },
        { status: 422 }
      );
    }

    // validacion.estatus === "APROBADO" → continuamos
    const apoderadoValidado = validacion.apoderado!;

    // ── 5. Generar contrato Word ───────────────────────────────────────────────
    const templateBuffer = await fileABuffer(templateFile);

    const facultades_texto = apoderadoValidado.facultades.join(", ");

    const wordBuffer = generarContratoWord(templateBuffer, {
      // Denominación extraída del Acta por regex (paso 1)
      denominacion_social: denominacion || "NO DETECTADA",
      // Nombre del apoderado tal como aparece en el INE (fuente de verdad de identidad)
      nombre_apoderado: nombre_completo_ine,
      // Domicilio extraído del comprobante por Claude
      domicilio: domicilio_completo,
      // Facultades del apoderado validado, separadas por coma
      facultades_texto,
    });

    // ── 6. Devolver el .docx como descarga binaria ────────────────────────────
    // Convertimos a Uint8Array porque NextResponse acepta BodyInit (no Buffer directamente en TS estricto)
    return new NextResponse(new Uint8Array(wordBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // El nombre del archivo incluye la denominación social para identificarlo fácilmente
        "Content-Disposition": `attachment; filename="contrato_${denominacion.replace(/\s+/g, "_")}.docx"`,
      },
    });
  } catch (e) {
    console.error("[/api/procesar] Error interno:", e);
    return errorJson(
      `Error interno del servidor: ${(e as Error).message}`,
      500
    );
  }
}
