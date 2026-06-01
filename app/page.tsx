"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

type DocumentKey =
  | "actaConstitutiva"
  | "poderNotarial"
  | "ine"
  | "comprobanteDomicilio";

interface DocumentSlot {
  key: DocumentKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface FileState {
  actaConstitutiva: File | null;
  poderNotarial: File | null;
  ine: File | null;
  comprobanteDomicilio: File | null;
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

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    key: "actaConstitutiva",
    label: "Acta Constitutiva",
    description: "Documento de constitución de la empresa",
    icon: <BuildingIcon />,
  },
  {
    key: "poderNotarial",
    label: "Poder Notarial",
    description: "Instrumento que acredita la representación legal",
    icon: <FileIcon />,
  },
  {
    key: "ine",
    label: "INE",
    description: "Identificación oficial del representante",
    icon: <IdCardIcon />,
  },
  {
    key: "comprobanteDomicilio",
    label: "Comprobante de Domicilio",
    description: "No mayor a 3 meses de antigüedad",
    icon: <HomeIcon />,
  },
];

function DropZone({
  slot,
  file,
  onFile,
}: {
  slot: DocumentSlot;
  file: File | null;
  onFile: (key: DocumentKey, file: File) => void;
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

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative group cursor-pointer rounded-xl border-2 transition-all duration-200 p-6
        ${isLoaded
          ? "border-slate-600 bg-slate-800/60"
          : dragging
          ? "border-blue-400 bg-blue-950/30 scale-[1.02]"
          : "border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />

      {isLoaded && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
          <CheckIcon />
          Cargado
        </span>
      )}

      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-2 rounded-lg transition-colors ${
          isLoaded
            ? "text-emerald-400 bg-emerald-400/10"
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
            <p className="text-xs text-slate-500">{slot.description}</p>
          )}
          {!isLoaded && (
            <p className="text-xs text-blue-400/70 mt-2">Arrastra o haz clic para seleccionar</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<FileState>({
    actaConstitutiva: null,
    poderNotarial: null,
    ine: null,
    comprobanteDomicilio: null,
  });
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = (key: DocumentKey, file: File) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setStatus(null);
  };

  const loadedCount = Object.values(files).filter(Boolean).length;
  const allLoaded = loadedCount === 4;

  const handleSubmit = async () => {
    if (!allLoaded) return;
    setProcessing(true);
    setStatus("Procesando documentos…");
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("Documentos recibidos correctamente. La generación del contrato estará disponible en breve.");
    setProcessing(false);
  };

  const handleReset = () => {
    setFiles({ actaConstitutiva: null, poderNotarial: null, ine: null, comprobanteDomicilio: null });
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

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(loadedCount / 4) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap font-mono">
            {loadedCount} / 4 documentos
          </span>
        </div>

        {/* Upload grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {DOCUMENT_SLOTS.map((slot) => (
            <DropZone key={slot.key} slot={slot} file={files[slot.key]} onFile={handleFile} />
          ))}
        </div>

        <p className="text-xs text-slate-600 mb-8 text-center">
          Formatos aceptados: PDF, JPG, PNG · Tamaño máximo recomendado: 10 MB por archivo
        </p>

        {/* Status */}
        {status && (
          <div className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <p className="text-sm text-blue-300">{status}</p>
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
            {processing ? "Procesando…" : "Procesar documentos"}
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
