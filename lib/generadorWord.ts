import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/**
 * Variables que se inyectan en el template .docx.
 * El template debe contener las mismas claves entre llaves: {denominacion_social}, etc.
 */
export interface DatosContrato {
  denominacion_social: string;
  nombre_apoderado: string;
  domicilio: string;
  // Ej. "Pleitos y Cobranzas, Actos de Administración, Actos de Dominio"
  facultades_texto: string;
  // Ej. "500,000.00" — se inserta tal cual en el placeholder {monto_credito}
  monto_credito: string;
  // Ej. "30" — días de crédito autorizados; placeholder {dias_credito}
  dias_credito: string;
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
  // PizZip descomprime el .docx (que internamente es un ZIP de XMLs)
  const zip = new PizZip(templateBuffer);

  // Docxtemplater toma el ZIP abierto y prepara el motor de plantillas
  const doc = new Docxtemplater(zip, {
    // paragraphLoop: true permite iterar sobre párrafos si en el futuro
    // se añaden listas de facultades con {#facultades}…{/facultades}
    paragraphLoop: true,
    // linebreaks: true convierte \n en saltos de línea Word dentro del template
    linebreaks: true,
  });

  // Inyecta los datos en los placeholders del template
  doc.render(datos);

  // Genera el ZIP resultante como Buffer de Node.js
  // "nodebuffer" es el tipo de salida compatible con NextResponse
  const outputBuffer = doc.getZip().generate({ type: "nodebuffer" });

  return outputBuffer;
}
