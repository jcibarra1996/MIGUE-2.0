import stringSimilarity from "string-similarity";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface Apoderado {
  nombre_completo: string;
  facultades: string[];
  tipo_ejercicio: string;
}

export type EstatusValidacion = "APROBADO" | "REVISIÓN MANUAL" | "RECHAZADO";

export interface ResultadoValidacion {
  estatus: EstatusValidacion;
  // Coeficiente Dice entre 0 y 1 entregado por string-similarity
  rating: number;
  // El apoderado con mayor similitud al nombre del INE; null si rating < 0.80
  apoderado: Apoderado | null;
}

// ─── Umbral de decisión ───────────────────────────────────────────────────────

// Umbral mínimo para considerar un match válido sin intervención humana.
const UMBRAL_APROBADO = 0.9;
// Umbral mínimo para enviar a revisión manual en lugar de rechazar directamente.
const UMBRAL_REVISION = 0.8;

// ─── Función auxiliar exportada ───────────────────────────────────────────────

/**
 * Normaliza un string para comparación robusta de nombres:
 *   1. Convierte a mayúsculas.
 *   2. Descompone caracteres acentuados (NFD) y elimina los diacríticos (Mn).
 *   3. Colapsa secuencias de espacios en blanco a un solo espacio.
 *
 * Ejemplo: "José María Pérez" → "JOSE MARIA PEREZ"
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toUpperCase()
    // NFD separa el carácter base del diacrítico: "É" → "E" + combinig accent
    .normalize("NFD")
    // \p{Mn} = Mark, Nonspacing → elimina todos los diacríticos Unicode
    .replace(/\p{Mn}/gu, "")
    // Colapsa tabs, saltos de línea y espacios múltiples a un solo espacio
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Función principal exportada ──────────────────────────────────────────────

/**
 * Cruza el nombre del INE contra la lista de apoderados extraídos del acta/poder.
 *
 * Algoritmo:
 *   1. Normaliza el nombre del INE y todos los nombres de apoderados.
 *   2. Usa stringSimilarity.findBestMatch para calcular el coeficiente Dice
 *      entre el nombre del INE y cada nombre de apoderado en una sola pasada.
 *   3. Aplica los umbrales de negocio para decidir el estatus.
 *
 * Por qué Dice (string-similarity) en lugar de IA:
 *   - Determinista: el mismo input siempre produce el mismo rating.
 *   - Sin costo de API: es matemática pura sobre bigramas de caracteres.
 *   - Robusto ante errores tipográficos menores y variaciones de orden de apellidos.
 *
 * @param nombreIne   - Nombre tal como aparece en el INE (sin normalizar).
 * @param apoderados  - Lista de apoderados extraídos por Claude.
 */
export function validarIdentidad(
  nombreIne: string,
  apoderados: Apoderado[]
): ResultadoValidacion {
  // Caso borde: lista vacía, no hay con quién comparar.
  if (apoderados.length === 0) {
    return { estatus: "RECHAZADO", rating: 0, apoderado: null };
  }

  // Paso 1 — normalización
  const nombreIneNormalizado = normalizarTexto(nombreIne);
  const nombresNormalizados = apoderados.map((a) =>
    normalizarTexto(a.nombre_completo)
  );

  // Paso 2 — comparación vectorial con Dice coefficient (O(n) sobre bigramas)
  const resultado = stringSimilarity.findBestMatch(
    nombreIneNormalizado,
    nombresNormalizados
  );

  const { rating, target: nombreMatch } = resultado.bestMatch;

  // Paso 3 — recuperamos el apoderado original que corresponde al nombre ganador
  // Usamos el índice del bestMatch para evitar falsos positivos por nombres idénticos.
  const indiceMatch = resultado.bestMatchIndex;
  const apoderadoMatch = apoderados[indiceMatch];

  // Paso 4 — lógica de negocio por umbrales
  if (rating >= UMBRAL_APROBADO) {
    return {
      estatus: "APROBADO",
      rating,
      apoderado: apoderadoMatch,
    };
  }

  if (rating >= UMBRAL_REVISION) {
    return {
      estatus: "REVISIÓN MANUAL",
      rating,
      apoderado: apoderadoMatch,
    };
  }

  // Evitamos exponer el apoderado cuando el match es demasiado débil
  // para no inducir al operador a aceptar un match incorrecto.
  void nombreMatch; // referencia silenciada — no la exponemos en RECHAZADO
  return {
    estatus: "RECHAZADO",
    rating,
    apoderado: null,
  };
}
