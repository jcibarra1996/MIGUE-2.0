"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { saveAs } from "file-saver";

type DocumentKey =
  | "actaConstitutiva"
  | "poderNotarial"
  | "ine"
  | "comprobanteDomicilio"
  | "templateContrato";

interface DocumentSlot {
  key: DocumentKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  accept?: string;
}

interface FileState {
  actaConstitutiva: File | null;
  poderNotarial: File | null;
  ine: File | null;
  comprobanteDomicilio: File | null;
  templateContrato: File | null;
}

const FileIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const IdCardIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c0 1.306.835 2.417 2 2.829" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    key: "actaConstitutiva",
    label: "Acta Constitutiva",
    description: "Documento de constitución de la empresa",
    icon: <BuildingIcon />,
    accept: ".pdf",
  },
  {
    key: "poderNotarial",
    label: "Poder Notarial",
    description: "Instrumento que acredita la representación legal",
    icon: <FileIcon />,
    accept: ".pdf",
  },
  {
    key: "ine",
    label: "INE",
    description: "Identificación oficial del representante",
    icon: <IdCardIcon />,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "comprobanteDomicilio",
    label: "Comprobante de Domicilio",
    description: "No mayor a 3 meses de antigüedad",
    icon: <HomeIcon />,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
];

function DropZone({
  slot,
  file,
  onFile,
  variant = "normal",
}: {
  slot: DocumentSlot;
  file: File | null;
  onFile: (key: DocumentKey, file: File) => void;
  variant?: "normal" | "template";
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(slot.key, dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(slot.key, selected);
  };

  const isLoaded = !!file;
  const isTemplate = variant === "template";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative group cursor-pointer rounded-xl border-2 transition-all duration-200 p-6
        ${isLoaded
          ? isTemplate
            ? "border-violet-600 bg-violet-900/20"
            : "border-slate-600 bg-slate-800/60"
          : dragging
          ? isTemplate
            ? "border-violet-400 bg-violet-950/30 scale-[1.02]"
            : "border-blue-400 bg-blue-950/30 scale-[1.02]"
          : isTemplate
          ? "border-violet-800/60 bg-violet-900/10 hover:border-violet-600 hover:bg-violet-900/20"
          : "border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={slot.accept ?? ".pdf,.jpg,.jpeg,.png"}
        className="hidden"
        onChange={handleChange}
      />

      {isLoaded && (
        <span className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          isTemplate
            ? "text-violet-300 bg-violet-400/10"
            : "text-emerald-400 bg-emerald-400/10"
        }`}>
          <CheckIcon />
          Cargado
        </span>
      )}

      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-2 rounded-lg transition-colors ${
          isLoaded
            ? isTemplate
              ? "text-violet-400 bg-violet-400/10"
              : "text-emerald-400 bg-emerald-400/10"
            : isTemplate
            ? "text-violet-500/70 bg-violet-900/30 group-hover:text-violet-400 group-hover:bg-violet-400/10"
            : "text-slate-400 bg-slate-700/50 group-hover:text-blue-400 group-hover:bg-blue-400/10"
        }`}>
          {slot.icon}
        </div>

        <div className="min-w-0">
          <p className={`text-sm font-semibold mb-0.5 ${isLoaded ? "text-slate-200" : "text-slate-300"}`}>
            {slot.label}
          </p>
          {isLoaded ? (
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{file.name}</p>
          ) : (
            <p className={`text-xs ${isTemplate ? "text-slate-500" : "text-slate-500"}`}>{slot.description}</p>
          )}
          {!isLoaded && (
            <p className={`text-xs mt-2 ${isTemplate ? "text-violet-400/70" : "text-blue-400/70"}`}>
              Arrastra o haz clic para seleccionar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type StatusVariant = "info" | "success" | "error" | "warning";

export default function Home() {
  const [files, setFiles] = useState<FileState>({
    actaConstitutiva: null,
    poderNotarial: null,
    ine: null,
    comprobanteDomicilio: null,
    templateContrato: null,
  });
  const [montoCredito, setMontoCredito] = useState("");
  const [diasCredito, setDiasCredito] = useState("15");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ mensaje: string; variant: StatusVariant } | null>(null);

  const handleFile = (key: DocumentKey, file: File) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setStatus(null);
  };

  const loadedCount = Object.values(files).filter(Boolean).length;
  const allLoaded = loadedCount === 5;

  const handleSubmit = async () => {
    if (!allLoaded) return;
    setProcessing(true);
    setStatus({ mensaje: "Extrayendo texto del Acta Constitutiva…", variant: "info" });

    try {
      // Construye el FormData con los 5 archivos
      const form = new FormData();
      form.append("actaConstitutiva",    files.actaConstitutiva!);
      form.append("poderNotarial",       files.poderNotarial!);
      form.append("ine",                 files.ine!);
      form.append("comprobanteDomicilio",files.comprobanteDomicilio!);
      form.append("templateContrato",    files.templateContrato!);
      form.append("monto_credito",        montoCredito);
      form.append("dias_credito",         diasCredito);

      setStatus({ mensaje: "Analizando poderes e identidad con IA…", variant: "info" });

      const res = await fetch("/api/procesar", { method: "POST", body: form });

      if (!res.ok) {
        // El servidor devuelve JSON con { error, detalle? }
        const payload = await res.json().catch(() => ({ error: "Error desconocido del servidor." }));

        // 422 = revisión manual requerida (no es un error técnico, es un resultado de negocio)
        if (res.status === 422) {
          setStatus({
            mensaje: `${payload.error} ${payload.detalle ?? ""}`.trim(),
            variant: "warning",
          });
        } else {
          setStatus({ mensaje: payload.error ?? "Ocurrió un error al procesar.", variant: "error" });
        }
        return;
      }

      // Respuesta exitosa: el servidor devuelve el .docx como binario
      const blob = await res.blob();
      // Extrae el nombre de archivo sugerido por el servidor desde el header
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const nombreMatch  = disposition.match(/filename="([^"]+)"/);
      const nombreArchivo = nombreMatch?.[1] ?? "contrato_generado.docx";

      // file-saver inicia la descarga en el navegador del usuario
      saveAs(blob, nombreArchivo);

      setStatus({
        mensaje: `¡Contrato generado y descargado correctamente! (${nombreArchivo})`,
        variant: "success",
      });
    } catch (e) {
      setStatus({
        mensaje: `Error de red o inesperado: ${(e as Error).message}`,
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles({
      actaConstitutiva: null,
      poderNotarial: null,
      ine: null,
      comprobanteDomicilio: null,
      templateContrato: null,
    });
    setStatus(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-wide text-slate-200">
              LegalTech <span className="text-slate-500 font-normal">/ Interno</span>
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">v1.0.0</span>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Herramienta interna
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-50 mb-3">
            Automatización de Contratos
          </h1>
          <p className="text-slate-400 text-base max-w-xl">
            Carga los documentos societarios y de identidad para generar automáticamente
            el contrato con los datos extraídos. Procesamiento local y seguro.
          </p>
        </div>

        {/* Progress bar — sobre 5 archivos */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 bg-slate-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                allLoaded ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${(loadedCount / 5) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap font-mono">
            {loadedCount} / 5 archivos
          </span>
        </div>

        {/* Grid de 4 documentos principales */}
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Documentos societarios y de identidad
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {DOCUMENT_SLOTS.map((slot) => (
            <DropZone key={slot.key} slot={slot} file={files[slot.key]} onFile={handleFile} />
          ))}
        </div>

        {/* Zona de plantilla — ancho completo, visualmente diferenciada */}
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Plantilla del contrato
        </p>
        <div className="mb-8">
          <DropZone
            slot={{
              key: "templateContrato",
              label: "Plantilla de Contrato (.docx)",
              description: "Placeholders: {denominacion_social} {nombre_apoderado} {domicilio} {facultades_texto} {monto_credito} {dias_credito}",
              icon: <TemplateIcon />,
              accept: ".docx",
            }}
            file={files.templateContrato}
            onFile={handleFile}
            variant="template"
          />
        </div>

        <p className="text-xs text-slate-600 mb-8 text-center">
          Documentos: PDF, JPG, PNG · Plantilla: .docx · Máximo recomendado: 10 MB por archivo
        </p>

        {/* Panel de condiciones de crédito */}
        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Condiciones de crédito
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monto de crédito */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Monto de crédito autorizado
              </label>
              <input
                type="text"
                value={montoCredito}
                onChange={(e) => setMontoCredito(e.target.value)}
                placeholder="Ej. 500,000.00"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Días de crédito */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Días de crédito autorizados
              </label>
              <select
                value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="45">45 días</option>
                <option value="60">60 días</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status con variantes de color */}
        {status && (
          <div className={`mb-6 rounded-lg border px-4 py-3 ${
            status.variant === "success"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : status.variant === "error"
              ? "border-red-500/20 bg-red-500/5"
              : status.variant === "warning"
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-blue-500/20 bg-blue-500/5"
          }`}>
            <p className={`text-sm ${
              status.variant === "success"
                ? "text-emerald-300"
                : status.variant === "error"
                ? "text-red-300"
                : status.variant === "warning"
                ? "text-amber-300"
                : "text-blue-300"
            }`}>
              {status.mensaje}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!allLoaded || processing}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
              ${allLoaded && !processing
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {processing && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {processing ? "Procesando…" : "Generar contrato"}
          </button>

          {loadedCount > 0 && !processing && (
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-slate-600">Uso interno · Datos procesados localmente</p>
          <p className="text-xs text-slate-600 font-mono">Powered by Next.js · Anthropic SDK</p>
        </div>
      </footer>
    </div>
  );
}
