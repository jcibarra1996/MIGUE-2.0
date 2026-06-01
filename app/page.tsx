"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { saveAs } from "file-saver";
import { createClient } from "@supabase/supabase-js";
import { procesarContratoAction, type UrlsPayload } from "./actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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
  accept: string;
}

interface FileState {
  actaConstitutiva: File | null;
  poderNotarial: File | null;
  ine: File | null;
  comprobanteDomicilio: File | null;
  templateContrato: File | null;
}

interface Toast {
  mensaje: string;
  tipo: "ok" | "error" | "info";
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SLOTS: DocumentSlot[] = [
  {
    key: "actaConstitutiva",
    label: "Acta Constitutiva",
    description: "PDF constitutivo de la empresa",
    accept: ".pdf",
  },
  {
    key: "poderNotarial",
    label: "Poder Notarial",
    description: "Instrumento de representación legal",
    accept: ".pdf",
  },
  {
    key: "ine",
    label: "INE del Representante",
    description: "Identificación oficial vigente",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    key: "comprobanteDomicilio",
    label: "Comprobante de Domicilio",
    description: "Máximo 3 meses de antigüedad",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
];

// ─── Íconos inline (sin dependencia extra) ───────────────────────────────────

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Componente DropZone ──────────────────────────────────────────────────────

function DropZone({
  slot,
  file,
  onFile,
}: {
  slot: DocumentSlot;
  file: File | null;
  onFile: (key: DocumentKey, file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const pick = (f: File) => onFile(slot.key, f);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pick(f);
  };

  const loaded = !!file;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-5 transition-all duration-150 select-none
        ${loaded
          ? "border-gray-300 bg-gray-50"
          : over
          ? "border-gray-400 bg-gray-100 scale-[1.01]"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }
      `}
    >
      <input ref={ref} type="file" accept={slot.accept} className="hidden" onChange={onChange} />

      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          loaded ? "bg-gray-900" : "bg-gray-100"
        }`}>
          {loaded
            ? <IconCheck className="w-4 h-4 text-white" />
            : <IconUpload className="w-4 h-4 text-gray-400" />
          }
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{slot.label}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {loaded ? file!.name : slot.description}
          </p>
        </div>

        {loaded && (
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
            {(file!.size / 1024).toFixed(0)} KB
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

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
  const [step, setStep] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  // Auto-oculta el toast a los 6 segundos
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFile = (key: DocumentKey, file: File) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const loaded = Object.values(files).filter(Boolean).length;
  const allLoaded = loaded === 5;

  const handleReset = () => {
    setFiles({ actaConstitutiva: null, poderNotarial: null, ine: null, comprobanteDomicilio: null, templateContrato: null });
    setMontoCredito("");
    setDiasCredito("15");
    setStep("");
  };

  const handleSubmit = async () => {
    if (!allLoaded || processing) return;

    setProcessing(true);
    setToast(null);

    // ── Pasos de progreso visible ────────────────────────────────────────────
    const steps = [
      "Subiendo documentos…",
      "Extrayendo texto del Acta…",
      "Analizando poderes con IA…",
      "Procesando identidad…",
      "Generando contrato…",
    ];
    let i = 0;
    setStep(steps[0]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStep(steps[i]);
    }, 4000);

    try {
      // ── 1. Inicializar cliente Supabase (clave pública, solo anon) ───────────
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase    = createClient(supabaseUrl, supabaseKey);

      const BUCKET = "temporales";
      // Prefijo único por sesión para evitar colisiones entre usuarios concurrentes
      const sesion = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // ── 2. Subir los 5 archivos directamente desde el navegador ─────────────
      // Cada upload es un multipart directo a Supabase Storage (bypassea el servidor de Next.js)
      type FileEntry = { key: keyof typeof files; nombre: string };
      const entradas: FileEntry[] = [
        { key: "actaConstitutiva",    nombre: "acta" },
        { key: "poderNotarial",       nombre: "poder" },
        { key: "ine",                 nombre: "ine" },
        { key: "comprobanteDomicilio",nombre: "comprobante" },
        { key: "templateContrato",    nombre: "template" },
      ];

      const subidas = await Promise.all(
        entradas.map(async ({ key, nombre }) => {
          const archivo   = files[key]!;
          const extension = archivo.name.split(".").pop() ?? "bin";
          const path      = `${sesion}/${nombre}.${extension}`;

          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, archivo, { upsert: true });

          if (error) throw new Error(`Error subiendo ${nombre}: ${error.message}`);

          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
          return { key, path, url: data.publicUrl };
        })
      );

      // ── 3. Construir el payload de URLs para la Server Action ────────────────
      const byKey = Object.fromEntries(subidas.map((s) => [s.key, s]));

      const payload: UrlsPayload = {
        urls: {
          actaConstitutiva:    byKey.actaConstitutiva.url,
          poderNotarial:       byKey.poderNotarial.url,
          ine:                 byKey.ine.url,
          comprobanteDomicilio:byKey.comprobanteDomicilio.url,
          templateContrato:    byKey.templateContrato.url,
        },
        paths: {
          actaConstitutiva:    byKey.actaConstitutiva.path,
          poderNotarial:       byKey.poderNotarial.path,
          ine:                 byKey.ine.path,
          comprobanteDomicilio:byKey.comprobanteDomicilio.path,
          templateContrato:    byKey.templateContrato.path,
        },
        monto_credito: montoCredito,
        dias_credito:  diasCredito,
      };

      // ── 4. Llamar al Server Action con el payload JSON ligero ────────────────
      const resultado = await procesarContratoAction(payload);

      clearInterval(interval);

      if (!resultado.success) {
        setToast({ mensaje: resultado.error, tipo: "error" });
        return;
      }

      // ── 5. Reconstruir el Blob y descargar con file-saver ────────────────────
      const byteChars = atob(resultado.fileBase64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let j = 0; j < byteChars.length; j++) byteArray[j] = byteChars.charCodeAt(j);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(blob, resultado.fileName);
      setToast({ mensaje: `Contrato generado: ${resultado.fileName}`, tipo: "ok" });
    } catch (e) {
      clearInterval(interval);
      setToast({ mensaje: `Error: ${(e as Error).message}`, tipo: "error" });
    } finally {
      setProcessing(false);
      setStep("");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://i.imgur.com/JJTbpFw.png" alt="Logo" className="h-10 w-auto object-contain" />
            <div>
              <p className="font-medium text-gray-900 leading-tight">Migue 2.0</p>
              <p className="text-xs text-gray-500">Automatización Legal Corporativa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
              JC
            </div>
            <span className="text-sm text-gray-600">Juan Carlos Ibarra · Legal</span>
          </div>
        </div>
      </header>

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-8 py-6">

        {/* Título de sección */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Generar contrato</h1>
          <p className="text-sm text-gray-500 mt-1">
            Carga los documentos requeridos y configura las condiciones de crédito para generar el contrato automáticamente.
          </p>
        </div>

        {/* ── Panel: documentos societarios ──── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Documentos societarios e identidad</h2>
            <p className="text-xs text-gray-400 mt-0.5">PDF · JPG · PNG — máx. 50 MB por archivo</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {SLOTS.map((slot) => (
              <DropZone key={slot.key} slot={slot} file={files[slot.key]} onFile={handleFile} />
            ))}
          </div>
        </div>

        {/* ── Panel: plantilla del contrato ──── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Plantilla del contrato</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Archivo .docx con placeholders:{" "}
              <span className="font-mono">
                {"{denominacion_social} {nombre_apoderado} {domicilio} {facultades_texto} {monto_credito} {dias_credito}"}
              </span>
            </p>
          </div>
          <div className="p-6">
            <DropZone
              slot={{
                key: "templateContrato",
                label: "Plantilla de Contrato (.docx)",
                description: "Arrastra o haz clic para seleccionar",
                accept: ".docx",
              }}
              file={files.templateContrato}
              onFile={handleFile}
            />
          </div>
        </div>

        {/* ── Panel: condiciones de crédito ──── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Condiciones de crédito</h2>
            <p className="text-xs text-gray-400 mt-0.5">Estos valores se inyectan directamente en el contrato generado</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Monto de crédito autorizado
              </label>
              <input
                type="text"
                value={montoCredito}
                onChange={(e) => setMontoCredito(e.target.value)}
                placeholder="Ej. 500,000.00"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Días de crédito autorizados
              </label>
              <select
                value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors appearance-none cursor-pointer"
              >
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="45">45 días</option>
                <option value="60">60 días</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Barra de progreso + acciones ──── */}
        <div className="flex items-center justify-between gap-4">
          {/* Indicador de archivos */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-500 ${allLoaded ? "bg-gray-900" : "bg-gray-400"}`}
                style={{ width: `${(loaded / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
              {loaded} / 5 archivos
            </span>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2">
            {loaded > 0 && !processing && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allLoaded || processing}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                allLoaded && !processing
                  ? "bg-gray-900 text-white hover:bg-gray-700 shadow-sm"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {processing && <IconSpinner className="w-4 h-4" />}
              {processing ? step || "Procesando…" : "Generar contrato"}
            </button>
          </div>
        </div>
      </main>

      {/* ── Toast notificación (esquina inferior derecha) ─────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm z-50 transition-all ${
            toast.tipo === "ok"
              ? "bg-gray-900 text-white"
              : toast.tipo === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          {toast.tipo === "ok" && <IconCheck className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />}
          <span>{toast.mensaje}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
