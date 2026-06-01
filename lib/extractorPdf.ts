import { PDFParse } from "pdf-parse";

export interface ResultadoActa {
  denominacion: string;
  textoPoderes: string;
}

// ─── Patrones de denominación social ────────────────────────────────────────

// Captura el nombre que antecede inmediatamente a la cláusula "se denominará"
// o "denominación social" y recoge todo hasta encontrar el tipo societario.
// Grupo 1 → nombre libre, Grupo 2 → tipo societario (S.A. DE C.V., S.A.P.I., etc.)
const RE_DENOMINACION_CLAUSULA = /denominaci[oó]n\s+social[^:]*?[:\s"«]+([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9\s,.'"-]{2,80}?)\s+(S\.?A\.?\s*(?:DE\s+C\.?V\.?|P\.?I\.?|B\.?)?|S\.?C\.?|S\.?R\.?L\.?(?:\s+DE\s+C\.?V\.?)?)/i;

// Alternativa: busca "denominará" seguido del nombre y tipo societario.
// Cubre redacciones notariales como "…la sociedad se denominará ACME S.A. DE C.V."
const RE_DENOMINACION_DENOMINARA = /se\s+denominar[aá]\s+"?([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9\s,.'"-]{2,80}?)\s*(S\.?A\.?\s*(?:DE\s+C\.?V\.?|P\.?I\.?|B\.?)?|S\.?C\.?|S\.?R\.?L\.?(?:\s+DE\s+C\.?V\.?)?)/i;

// Alternativa de último recurso: captura texto en mayúsculas seguido del tipo
// societario al inicio del documento (primeros 3 000 caracteres).
// Útil cuando el acta comienza con la razón social sin preámbulo.
const RE_DENOMINACION_INICIO = /([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9\s,.'"-]{2,80}?)\s+(S\.A\.\s+DE\s+C\.V\.|S\.A\.P\.I\.\s+DE\s+C\.V\.|S\.A\.|S\.C\.|S\.R\.L\.\s+DE\s+C\.V\.|S\.R\.L\.)/;

// ─── Patrones de inicio del capítulo de poderes ─────────────────────────────

// Detecta títulos de cláusula/capítulo que abren la sección de poderes.
// Cubre variantes notariales: "ADMINISTRACIÓN", "REPRESENTACIÓN",
// "OTORGAMIENTO DE PODERES", "PODERES Y FACULTADES", "FACULTADES DEL ADMINISTRADOR".
const RE_INICIO_PODERES =
  /(?:CL[AÁ]USULA|CAP[IÍ]TULO|ART[IÍ]CULO|SECCI[OÓ]N)[\s\w]*[-–—.]?\s*(?:DE\s+LA\s+)?(?:ADMINISTRACI[OÓ]N|REPRESENTACI[OÓ]N|OTORGAMIENTO\s+DE\s+PODERES?|PODERES?\s+(?:Y\s+)?(?:FACULTADES?)?|FACULTADES?\s+(?:DEL\s+)?(?:ADMINISTRADOR|REPRESENTANTE|APODERADO))/i;

// ─── Patrones de basura a eliminar ──────────────────────────────────────────

// Detecta el inicio de la sección "OBJETO SOCIAL" para recortar desde ahí
// hasta que empiece la sección de administración/poderes.
// Captura variantes: "OBJETO", "OBJETO SOCIAL", "OBJETO DE LA SOCIEDAD".
const RE_INICIO_OBJETO =
  /(?:CL[AÁ]USULA|CAP[IÍ]TULO|ART[IÍ]CULO|SECCI[OÓ]N)[\s\w]*[-–—.]?\s*(?:OBJETO\s*(?:SOCIAL)?(?:\s+DE\s+LA\s+SOCIEDAD)?)/i;

// Detecta bloques de estatutos generales, disposiciones generales y
// capital social que no aportan información sobre poderes.
const RE_BASURA_ESTATUTOS =
  /(?:ESTATUTOS?\s+(?:GENERALES?|SOCIALES?)|DISPOSICIONES?\s+GENERALES?|CAPITAL\s+SOCIAL|DURACI[OÓ]N\s+DE\s+LA\s+SOCIEDAD)/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normaliza saltos de línea múltiples y espacios redundantes del texto OCR. */
function limpiarTexto(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")   // colapsa espacios múltiples
    .replace(/\n{3,}/g, "\n\n")   // máximo una línea en blanco entre párrafos
    .trim();
}

/** Intenta extraer la denominación social usando los tres patrones en cascada. */
function extraerDenominacion(texto: string): string {
  // Busca primero en los primeros 5 000 caracteres para mayor precisión.
  const cabecera = texto.slice(0, 5000);

  const m1 = RE_DENOMINACION_CLAUSULA.exec(cabecera);
  if (m1) return `${m1[1].trim()} ${m1[2].trim()}`;

  const m2 = RE_DENOMINACION_DENOMINARA.exec(cabecera);
  if (m2) return `${m2[1].trim()} ${m2[2].trim()}`;

  // Último recurso: búsqueda en los primeros 3 000 caracteres con el patrón de inicio.
  const m3 = RE_DENOMINACION_INICIO.exec(texto.slice(0, 3000));
  if (m3) return `${m3[1].trim()} ${m3[2].trim()}`;

  return "";
}

/**
 * Recorta el texto eliminando la sección del objeto social y los estatutos
 * generales. Devuelve el texto limpio con solo la parte útil (poderes).
 *
 * Estrategia:
 *   1. Localiza el inicio del objeto social → marca el fin del preámbulo útil.
 *   2. Localiza el inicio del capítulo de poderes → marca el inicio del fragmento.
 *   3. Toma 10 000 caracteres a partir de ese punto.
 */
function aislarTextoPoderes(texto: string): string {
  const idxPoderes = texto.search(RE_INICIO_PODERES);

  // Si no se encuentra la sección de poderes, intento con búsqueda de la
  // palabra clave "PODERES" sola como fallback.
  const indiceInicio =
    idxPoderes !== -1
      ? idxPoderes
      : texto.search(/\bPODERES?\b/i);

  if (indiceInicio === -1) return "";

  // Elimina bloques de basura que puedan haberse colado antes del índice
  // de poderes (e.g., fragmentos de objeto social que no abrieron sección propia).
  let fragmento = texto.slice(indiceInicio, indiceInicio + 10000);

  // Si dentro del fragmento aparece una sección de basura conocida,
  // la cortamos para no contaminar el resultado.
  const idxBasura = fragmento.search(RE_BASURA_ESTATUTOS);
  if (idxBasura !== -1 && idxBasura > 500) {
    // Solo recortamos si la basura aparece después de al menos 500 caracteres útiles.
    fragmento = fragmento.slice(0, idxBasura);
  }

  return fragmento.trim();
}

// ─── Función principal exportada ─────────────────────────────────────────────

export async function procesarActaConstitutiva(
  fileBuffer: Buffer
): Promise<ResultadoActa> {
  // pdf-parse v2: acepta Uint8Array en la propiedad `data` del constructor.
  const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
  const result = await parser.getText();
  const textoLimpio = limpiarTexto(result.text);

  // Localiza y elimina la sección del objeto social antes de procesar poderes,
  // para no confundir actividades comerciales con facultades del apoderado.
  const idxObjeto = textoLimpio.search(RE_INICIO_OBJETO);
  const idxPoderes = textoLimpio.search(RE_INICIO_PODERES);

  // Construye el texto de trabajo:
  // - Si hay objeto antes que poderes, descarta el bloque intermedio.
  // - Si no hay objeto detectado, usa el texto completo (el aislador se encarga).
  let textoDeTrabajo = textoLimpio;
  if (idxObjeto !== -1 && idxPoderes !== -1 && idxObjeto < idxPoderes) {
    // Conserva el preámbulo (antes del objeto) + todo lo que viene desde poderes.
    textoDeTrabajo =
      textoLimpio.slice(0, idxObjeto) + textoLimpio.slice(idxPoderes);
  }

  const denominacion = extraerDenominacion(textoLimpio);
  const textoPoderes = aislarTextoPoderes(textoDeTrabajo);

  return { denominacion, textoPoderes };
}
