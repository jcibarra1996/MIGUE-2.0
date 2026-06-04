import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/**
 * Variables que se inyectan en el template .docx.
 * El template debe contener las mismas claves entre llaves: {denominacion_social}, etc.
 */
export interface DatosContrato {
  // Nombres canónicos
  denominacion_social: string;
  nombre_apoderado: string;
  domicilio: string;
  facultades_texto: string;
  monto_credito: string;
  dias_credito: string;
  // Alias alternativos — para templates que usen nombres distintos
  domicilio_cliente: string;
  nombre_cliente: string;
  razon_social: string;
  denominacion: string;
}

// ─── Función principal exportada ──────────────────────────────────────────────

/**
 * Recibe el buffer binario de un template .docx con placeholders Docxtemplater
 * y los datos del contrato, y devuelve un Buffer con el .docx generado.
 *
 * Esta función corre exclusivamente en el servidor (Route Handler).
 * El navegador descarga el Buffer resultante a través de NextResponse;
 * file-saver se usa en el cliente para iniciar la descarga desde el blob.
 *
 * Placeholders esperados en el template (sintaxis Docxtemplater):
 *   {denominacion_social}  → Razón social extraída del Acta
 *   {nombre_apoderado}     → Nombre completo del apoderado validado
 *   {domicilio}            → Domicilio del comprobante
 *   {facultades_texto}     → Facultades unidas por coma
 *   {monto_credito}        → Monto de crédito autorizado (ej. "500,000.00")
 *   {dias_credito}         → Días de crédito autorizados (ej. "30")
 */
export function generarContratoWord(
  templateBuffer: Buffer,
  datos: DatosContrato
): Buffer {
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Variables no encontradas en el template → string vacío en lugar de error fatal
    nullGetter() { return ""; },
  });

  try {
    doc.render(datos);
  } catch (err: unknown) {
    // Docxtemplater lanza errores con una propiedad `properties.errors` detallada.
    // La re-lanzamos como Error estándar para que actions.ts la serialice correctamente.
    const e = err as { properties?: { errors?: unknown[] }; message?: string };
    if (e?.properties?.errors?.length) {
      const detalle = (e.properties.errors as Array<{ properties?: { explanation?: string } }>)
        .map((x) => x?.properties?.explanation ?? JSON.stringify(x))
        .join("; ");
      throw new Error(`Error en la plantilla .docx: ${detalle}`);
    }
    throw new Error(`Error al renderizar la plantilla: ${e?.message ?? String(err)}`);
  }

  const outputBuffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return outputBuffer;
}
