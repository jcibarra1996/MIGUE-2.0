'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOGO = 'https://i.imgur.com/JJTbpFw.png'

const documentos = [
  { id: 'situacion_fiscal', label: 'Constancia de Situación Fiscal' },
  { id: 'opinion_cumplimiento', label: 'Opinión de Cumplimiento' },
  { id: 'comprobante_domicilio', label: 'Comprobante de domicilio' },
  { id: 'acta_constitutiva', label: 'Acta Constitutiva' },
  { id: 'poder_notarial', label: 'Poder Notarial' },
  { id: 'id_representante', label: 'ID Representante Legal' },
  { id: 'formato_facturacion', label: 'Formato Información Cliente Facturación' },
  { id: 'solicitud_credito', label: 'Solicitud de Crédito' },
  { id: 'carta_consignee', label: 'Carta Consignee' },
  { id: 'autorizacion_buro', label: 'Autorización Buró de Crédito' },
  { id: 'nda_firmado', label: 'NDA firmado (Acuerdo de Confidencialidad)' },
]

const formatos = [
  { id: 'nda', label: 'Formato NDA (Acuerdo de Confidencialidad)', url: 'https://nhdvdgtvttccfjosuxio.supabase.co/storage/v1/object/public/formatos/NDA%20SBM.docx' },
  { id: 'buro', label: 'Formato Autorización Buró de Crédito', url: 'https://nhdvdgtvttccfjosuxio.supabase.co/storage/v1/object/public/formatos/Formato%20Autorizacion%20Buro%20Credito%20(1).doc' },
  { id: 'consignee', label: 'Carta Consignee', url: 'https://nhdvdgtvttccfjosuxio.supabase.co/storage/v1/object/public/formatos/Carta%20CONSIGNEE%20%20SHIPPER%20(1).docx' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  under_review: { label: 'En revisión', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazado — Pendiente de corrección', color: 'bg-red-100 text-red-700' },
}

const SESSION_KEY = 'sbm_portal_state'
function saveSession(data: any) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch {} }
function loadSession() { try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null } }
function formatMonto(value: string) { const num = value.replace(/[^0-9]/g, ''); return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

function rfcValido(rfc: string) { return rfc.trim().length >= 12 && rfc.trim().length <= 13 }
function emailValido(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

type MascotMode = 'barco' | 'avion' | 'camion'

function Barco({ blinking }: { blinking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="50" cy="95" rx="30" ry="4" fill="#00000015" />
      <path d="M5 75 Q15 70 25 75 Q35 80 45 75 Q55 70 65 75 Q75 80 85 75 Q95 70 100 75 L100 100 L0 100 Z" fill="#BAE6FD" opacity="0.5" />
      <path d="M15 68 Q50 85 85 68 L80 58 L20 58 Z" fill="#1E40AF" />
      <rect x="20" y="42" width="60" height="18" rx="4" fill="#2563EB" />
      <rect x="32" y="26" width="36" height="18" rx="6" fill="#1D4ED8" />
      <rect x="46" y="14" width="10" height="16" rx="3" fill="#DC2626" />
      <rect x="44" y="12" width="14" height="5" rx="2" fill="#B91C1C" />
      <circle cx="48" cy="9" r="3" fill="#9CA3AF" opacity="0.5" />
      <circle cx="52" cy="6" r="2.5" fill="#9CA3AF" opacity="0.35" />
      <circle cx="55" cy="3" r="2" fill="#9CA3AF" opacity="0.2" />
      <rect x="36" y="30" width="28" height="10" rx="5" fill="white" opacity="0.95" />
      {blinking ? (
        <><rect x="40" y="33" width="7" height="2" rx="1" fill="#1E3A5F" /><rect x="53" y="33" width="7" height="2" rx="1" fill="#1E3A5F" /></>
      ) : (
        <><ellipse cx="43" cy="34" rx="4" ry="4" fill="#1E3A5F" /><ellipse cx="57" cy="34" rx="4" ry="4" fill="#1E3A5F" /><circle cx="45" cy="32" r="1.5" fill="white" /><circle cx="59" cy="32" r="1.5" fill="white" /></>
      )}
      <path d="M40 39 Q50 45 60 39" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="36" cy="38" rx="5" ry="3" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="64" cy="38" rx="5" ry="3" fill="#FCA5A5" opacity="0.5" />
      <text x="50" y="54" textAnchor="middle" fontSize="8" fill="#93C5FD" opacity="0.8">⚓</text>
      <line x1="78" y1="42" x2="78" y2="30" stroke="#DC2626" strokeWidth="1.5" />
      <path d="M78 30 L88 33 L78 36 Z" fill="#DC2626" />
    </svg>
  )
}

function Avion({ blinking }: { blinking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="50" cy="95" rx="30" ry="4" fill="#00000015" />
      <ellipse cx="15" cy="20" rx="10" ry="6" fill="white" opacity="0.6" />
      <ellipse cx="22" cy="17" rx="8" ry="5" fill="white" opacity="0.6" />
      <ellipse cx="82" cy="25" rx="10" ry="6" fill="white" opacity="0.6" />
      <ellipse cx="88" cy="22" rx="7" ry="5" fill="white" opacity="0.6" />
      <ellipse cx="50" cy="55" rx="38" ry="16" fill="#2563EB" />
      <ellipse cx="88" cy="55" rx="10" ry="10" fill="#1D4ED8" />
      <path d="M12 55 Q5 50 8 42 L20 48 Z" fill="#1D4ED8" />
      <path d="M35 48 Q50 20 70 42 L60 48 Z" fill="#1E40AF" />
      <path d="M35 62 Q50 80 70 68 L60 62 Z" fill="#1E40AF" />
      <path d="M16 54 Q14 38 24 36 L28 50 Z" fill="#DC2626" />
      <path d="M20 48 Q50 52 86 52 Q86 58 50 58 Q20 62 20 58 Z" fill="#DC2626" opacity="0.7" />
      <ellipse cx="65" cy="50" rx="20" ry="8" fill="white" opacity="0.95" />
      {blinking ? (
        <><rect x="56" y="48" width="7" height="2" rx="1" fill="#1E3A5F" /><rect x="68" y="48" width="7" height="2" rx="1" fill="#1E3A5F" /></>
      ) : (
        <><ellipse cx="60" cy="49" rx="4" ry="4" fill="#1E3A5F" /><ellipse cx="72" cy="49" rx="4" ry="4" fill="#1E3A5F" /><circle cx="62" cy="47" r="1.5" fill="white" /><circle cx="74" cy="47" r="1.5" fill="white" /></>
      )}
      <path d="M57 54 Q66 60 75 54" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="55" cy="53" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="77" cy="53" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="48" cy="68" rx="8" ry="4" fill="#1E3A5F" />
      <ellipse cx="48" cy="68" rx="5" ry="2.5" fill="#374151" />
      <text x="38" y="57" textAnchor="middle" fontSize="5" fill="white" fontFamily="monospace" fontWeight="bold" opacity="0.8">SBM</text>
    </svg>
  )
}

function Camion({ blinking }: { blinking: boolean }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="50" cy="95" rx="35" ry="4" fill="#00000015" />
      <rect x="28" y="30" width="68" height="44" rx="4" fill="#2563EB" />
      <rect x="4" y="42" width="28" height="32" rx="6" fill="#1D4ED8" />
      <rect x="8" y="46" width="20" height="20" rx="5" fill="white" opacity="0.95" />
      {blinking ? (
        <><rect x="10" y="52" width="6" height="2" rx="1" fill="#1E3A5F" /><rect x="20" y="52" width="6" height="2" rx="1" fill="#1E3A5F" /></>
      ) : (
        <><ellipse cx="13" cy="53" rx="3.5" ry="3.5" fill="#1E3A5F" /><ellipse cx="23" cy="53" rx="3.5" ry="3.5" fill="#1E3A5F" /><circle cx="15" cy="51" r="1.2" fill="white" /><circle cx="25" cy="51" r="1.2" fill="white" /></>
      )}
      <path d="M10 59 Q18 65 26 59" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="9" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.5" />
      <ellipse cx="27" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.5" />
      <rect x="28" y="42" width="6" height="32" fill="#1E40AF" />
      <rect x="32" y="34" width="60" height="6" rx="2" fill="#1E40AF" />
      <rect x="32" y="62" width="60" height="6" rx="2" fill="#1E40AF" />
      <rect x="38" y="40" width="46" height="20" rx="3" fill="#1E40AF" opacity="0.3" />
      <text x="61" y="53" textAnchor="middle" fontSize="9" fill="white" fontFamily="monospace" fontWeight="bold">SBM</text>
      <text x="61" y="62" textAnchor="middle" fontSize="5" fill="#93C5FD" fontFamily="monospace">LOGISTICS</text>
      <rect x="0" y="48" width="5" height="8" rx="2" fill="#374151" />
      <ellipse cx="5" cy="68" rx="4" ry="3" fill="#FCD34D" opacity="0.9" />
      <ellipse cx="5" cy="68" rx="2.5" ry="2" fill="#FDE68A" />
      <circle cx="20" cy="78" r="9" fill="#1E3A5F" />
      <circle cx="20" cy="78" r="6" fill="#374151" />
      <circle cx="20" cy="78" r="3" fill="#60A5FA" />
      <circle cx="50" cy="78" r="9" fill="#1E3A5F" />
      <circle cx="50" cy="78" r="6" fill="#374151" />
      <circle cx="50" cy="78" r="3" fill="#60A5FA" />
      <circle cx="76" cy="78" r="9" fill="#1E3A5F" />
      <circle cx="76" cy="78" r="6" fill="#374151" />
      <circle cx="76" cy="78" r="3" fill="#60A5FA" />
      <rect x="28" y="22" width="5" height="12" rx="2" fill="#374151" />
      <circle cx="30" cy="20" r="3" fill="#9CA3AF" opacity="0.5" />
      <circle cx="32" cy="16" r="2" fill="#9CA3AF" opacity="0.3" />
    </svg>
  )
}

function ContyMascota({ blinking, mode }: { blinking: boolean; mode: MascotMode }) {
  if (mode === 'barco') return <Barco blinking={blinking} />
  if (mode === 'avion') return <Avion blinking={blinking} />
  return <Camion blinking={blinking} />
}

const ERROR_MESSAGE = 'En este momento no puedo ayudarte. Contacta a miguel.felix@savinodelbene.com 📧'

function Conty({ paso, form }: { paso: number; form: any }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [blinking, setBlinking] = useState(false)
  const [mode, setMode] = useState<MascotMode>('barco')
  const [transitioning, setTransitioning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevPasoRef = useRef(paso)

  const mensajesPorPaso: Record<number, string> = {
    1: '¡Hola! Soy Conty 😊 Estoy aquí para ayudarte con tu solicitud de crédito. ¡Empieza llenando los datos de tu empresa!',
    2: '¡Vamos bien! Ahora toca la información de facturación. El método PPD es el más común. ¿Tienes alguna duda?',
    3: 'Paso clave: el expediente. Necesitas 11 documentos. Descarga primero los 3 formatos, fírmalos en tinta azul y súbelos. ¿Te explico alguno?',
    4: '¡Felicidades, tu crédito fue aprobado! 🎉 Descarga el contrato, fírmalo en tinta azul y regresa aquí.',
    5: '¡Último paso! Sube el contrato firmado en PDF y habrás terminado. ¡Casi lo logramos!',
  }

  const sugerenciasPorPaso: Record<number, string[]> = {
    1: ['¿Qué RFC ingreso?', '¿Qué días puedo pedir?', '¿Cuánto tarda el proceso?'],
    2: ['¿Qué es PPD?', '¿Qué CFDI elijo?', '¿Qué es el régimen fiscal?'],
    3: ['¿Qué es el NDA?', '¿Para qué es el Buró?', '¿Qué es la Carta Consignee?'],
    4: ['¿Dónde firmo?', '¿Qué es tinta azul?', '¿Dónde mando el físico?'],
    5: ['¿Cómo escaneo?', '¿Qué formato necesito?', '¿Qué pasa después?'],
  }

  const modos: MascotMode[] = ['barco', 'avion', 'camion']

  useEffect(() => {
    const interval = setInterval(() => {
      setTransitioning(true)
      setTimeout(() => {
        setMode(prev => { const idx = modos.indexOf(prev); return modos[(idx + 1) % modos.length] })
        setTransitioning(false)
      }, 400)
    }, 25000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 150)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (prevPasoRef.current !== paso) {
      prevPasoRef.current = paso
      setMessages([{ role: 'assistant', content: mensajesPorPaso[paso] }])
      setOpen(true)
    } else if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: mensajesPorPaso[paso] }])
    }
  }, [paso])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage(text?: string) {
    const content = text || input.trim()
    if (!content) return
    if (content.length > 500) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Tu mensaje es demasiado largo. Por favor, escribe una pregunta más corta.' }])
      return
    }
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-conty-token': process.env.NEXT_PUBLIC_CONTY_TOKEN || '' },
        body: JSON.stringify({ messages: newMessages, paso, form })
      })
      if (res.status === 429) { setMessages(prev => [...prev, { role: 'assistant', content: 'Demasiadas preguntas seguidas. Espera un momento e intenta de nuevo.' }]); return }
      if (res.status === 403) { setMessages(prev => [...prev, { role: 'assistant', content: ERROR_MESSAGE }]); return }
      const data = await res.json()
      const reply = data.reply || ERROR_MESSAGE
      const isTechnicalError = reply.startsWith('Gemini error') || reply.startsWith('Error:') || reply.startsWith('{')
      setMessages(prev => [...prev, { role: 'assistant', content: isTechnicalError ? ERROR_MESSAGE : reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: ERROR_MESSAGE }])
    } finally {
      setLoading(false)
    }
  }

  const modeLabel: Record<MascotMode, string> = { barco: '🚢', avion: '✈️', camion: '🚛' }

  return (
    <>
      <style>{`
        @keyframes contyFloat { 0%, 100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes contyFadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '460px' }}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: '#1E3A5F' }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 32, height: 32 }}><ContyMascota blinking={false} mode={mode} /></div>
                <div>
                  <p className="text-xs font-medium text-white">Conty {modeLabel[mode]}</p>
                  <p className="text-xs text-blue-300">Asistente SBM</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1" style={{ width: 28, height: 28 }}><ContyMascota blinking={false} mode={mode} /></div>
                  )}
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-gray-900 text-white rounded-br-none' : 'bg-blue-50 text-gray-700 rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0" style={{ width: 28, height: 28 }}><ContyMascota blinking={false} mode={mode} /></div>
                  <div className="bg-blue-50 px-3 py-2 rounded-xl rounded-bl-none">
                    <span className="text-xs text-gray-400">Conty está escribiendo...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex flex-wrap gap-1 mb-2">
                {(sugerenciasPorPaso[paso] || []).map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="text-xs border border-blue-200 rounded-full px-2 py-1 hover:bg-blue-50 text-blue-600">{s}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Pregúntale a Conty..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none" />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-blue-700">Enviar</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          {!open && (
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs text-gray-600 whitespace-nowrap">¿Tienes alguna duda? 💬</div>
          )}
          <button onClick={() => setOpen(o => !o)} className="focus:outline-none" style={{ width: 90, height: 90, animation: 'contyFloat 3s ease-in-out infinite', opacity: transitioning ? 0 : 1, transition: 'opacity 0.4s ease' }} title="Hablar con Conty">
            <ContyMascota blinking={blinking} mode={mode} />
          </button>
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [vista, setVista] = useState('identificacion')
  const [paso, setPaso] = useState(1)
  const [archivos, setArchivos] = useState<Record<string, { nombre: string; url: string }>>({})
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success')
  const [enviado, setEnviado] = useState(false)
  const [status, setStatus] = useState('draft')
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [signedContract, setSignedContract] = useState<{ nombre: string; url: string } | null>(null)
  const [subiendoFirma, setSubiendoFirma] = useState(false)
  const [firmaEnviada, setFirmaEnviada] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [credenciales, setCredenciales] = useState({ rfc: '', email: '' })
  const [credError, setCredError] = useState('')
  const [montoAprobado, setMontoAprobado] = useState('')
  const [diasAprobados, setDiasAprobados] = useState('')
  const [montoDisplay, setMontoDisplay] = useState('')
  const [guardandoDraft, setGuardandoDraft] = useState(false)
  const [ultimoGuardado, setUltimoGuardado] = useState<Date | null>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState({
    denominacion: '', representante: '', rfc: '', email: '', monto: '', dias: '',
  })
  const [facturacion, setFacturacion] = useState({
    metodo_pago: '', forma_pago: '', uso_cfdi: '', regimen_fiscal: '', monedas: [] as string[],
    email_rl: '', email_facturas: '', contacto_cxp: '', telefono_cxp: '', email_cxp: '',
    razon_social_factura: '', representante_legal: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [facturacionErrors, setFacturacionErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const session = loadSession()
    if (session) {
      if (session.vista) setVista(session.vista)
      if (session.paso) setPaso(session.paso)
      if (session.form) { setForm(session.form); setMontoDisplay(formatMonto(session.form.monto || '')) }
      if (session.facturacion) setFacturacion(session.facturacion)
      if (session.archivos) setArchivos(session.archivos)
      if (session.applicationId) setApplicationId(session.applicationId)
      if (session.contractUrl) setContractUrl(session.contractUrl)
      if (session.status) setStatus(session.status)
      if (session.enviado) setEnviado(session.enviado)
      if (session.firmaEnviada) setFirmaEnviada(session.firmaEnviada)
      if (session.montoAprobado) setMontoAprobado(session.montoAprobado)
      if (session.diasAprobados) setDiasAprobados(session.diasAprobados)
    }
  }, [])

  useEffect(() => {
    if (vista === 'solicitud' || applicationId) {
      saveSession({ vista, paso, form, facturacion, archivos, applicationId, contractUrl, status, enviado, firmaEnviada, montoAprobado, diasAprobados })
    }
  }, [vista, paso, form, facturacion, archivos, applicationId, contractUrl, status, enviado, firmaEnviada, montoAprobado, diasAprobados])

  useEffect(() => {
    if (applicationId) {
      const interval = setInterval(async () => {
        const supabase = createClient()
        const { data } = await supabase.from('applications').select('status, contract_url, credit_amount, credit_days').eq('id', applicationId).single()
        if (data) {
          setStatus(data.status)
          if (data.contract_url && !contractUrl) {
            setContractUrl(data.contract_url)
            if (data.credit_amount) setMontoAprobado(String(data.credit_amount))
            if (data.credit_days) setDiasAprobados(String(data.credit_days))
            setPaso(4)
          }
          if (data.status === 'rejected') { setEnviado(false); setPaso(3) }
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [applicationId, contractUrl])

  const guardarDraft = useCallback(async (
    formData = form,
    facturacionData = facturacion,
    archivosData = archivos,
    currentApplicationId = applicationId
  ) => {
    if (!rfcValido(formData.rfc) || !emailValido(formData.email)) return
    setGuardandoDraft(true)
    try {
      const supabase = createClient()
      const docsUrls: Record<string, string> = {}
      Object.entries(archivosData).forEach(([k, v]) => { docsUrls[k] = (v as any).url })
      const payload: any = {
        status: 'draft',
        denominacion: formData.denominacion,
        representante: formData.representante,
        rfc: formData.rfc.trim().toUpperCase(),
        email_contacto: formData.email,
        credit_amount: Number(formData.monto) || null,
        credit_days: Number(formData.dias) || null,
        facturacion: facturacionData,
        docs_urls: docsUrls,
      }
      if (currentApplicationId) {
        const { data: existing } = await supabase.from('applications').select('status').eq('id', currentApplicationId).single()
        if (existing?.status === 'draft') {
          await supabase.from('applications').update(payload).eq('id', currentApplicationId)
        }
      } else {
        const { data, error } = await supabase
          .from('applications')
          .upsert({ ...payload }, { onConflict: 'rfc', ignoreDuplicates: false })
          .select('id, status')
          .single()
        if (error) throw error
        if (data) {
          setApplicationId(data.id)
          if (data.status !== 'draft') setStatus(data.status)
        }
      }
      setUltimoGuardado(new Date())
    } catch {
      // silent fail
    } finally {
      setGuardandoDraft(false)
    }
  }, [form, facturacion, archivos, applicationId])

  const scheduleAutoSave = useCallback((newForm = form, newFacturacion = facturacion, newArchivos = archivos) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      guardarDraft(newForm, newFacturacion, newArchivos, applicationId)
    }, 1500)
  }, [form, facturacion, archivos, applicationId, guardarDraft])

  useEffect(() => {
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
  }, [])

  function showToast(msg: string, type: 'success' | 'info' | 'error' = 'success') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 4000)
  }

  function toggleMoneda(m: string) {
    const newFacturacion = { ...facturacion, monedas: facturacion.monedas.includes(m) ? facturacion.monedas.filter(x => x !== m) : [...facturacion.monedas, m] }
    setFacturacion(newFacturacion)
    setFacturacionErrors(prev => ({ ...prev, monedas: '' }))
    scheduleAutoSave(form, newFacturacion, archivos)
  }

  function handleSalir() {
    sessionStorage.removeItem(SESSION_KEY)
    setVista('identificacion'); setPaso(1)
    setForm({ denominacion: '', representante: '', rfc: '', email: '', monto: '', dias: '' })
    setMontoDisplay('')
    setFacturacion({ metodo_pago: '', forma_pago: '', uso_cfdi: '', regimen_fiscal: '', monedas: [], email_rl: '', email_facturas: '', contacto_cxp: '', telefono_cxp: '', email_cxp: '', razon_social_factura: '', representante_legal: '' })
    setArchivos({}); setApplicationId(null); setContractUrl(null); setStatus('draft')
    setEnviado(false); setFirmaEnviada(false); setMontoAprobado(''); setDiasAprobados('')
    setUltimoGuardado(null)
  }

  async function handleBuscarSolicitud() {
    if (!credenciales.rfc.trim() || !credenciales.email.trim()) { setCredError('Ingresa tu RFC y correo electrónico.'); return }
    setBuscando(true); setCredError('')
    try {
      const supabase = createClient()
      const { data: todos } = await supabase.from('applications').select('*').order('created_at', { ascending: false })
      const data = todos?.find((r: any) =>
        r.rfc?.trim().toUpperCase() === credenciales.rfc.trim().toUpperCase() &&
        r.email_contacto?.toLowerCase() === credenciales.email.trim().toLowerCase()
      ) || null
      if (!data) { setCredError('No encontramos una solicitud con esos datos. Verifica tu RFC y correo.'); return }
      setApplicationId(data.id); setStatus(data.status)
      setForm({ denominacion: data.denominacion || '', representante: data.representante || '', rfc: data.rfc?.trim() || '', email: data.email_contacto || '', monto: String(data.credit_amount || ''), dias: String(data.credit_days || '') })
      setMontoDisplay(formatMonto(String(data.credit_amount || '')))
      if (data.facturacion) setFacturacion(data.facturacion)
      if (data.docs_urls) {
        const rebuilt: Record<string, { nombre: string; url: string }> = {}
        Object.entries(data.docs_urls as Record<string, string>).forEach(([k, url]) => { if (url) rebuilt[k] = { nombre: k + '.pdf', url } })
        setArchivos(rebuilt)
      }
      if (data.contract_url) setContractUrl(data.contract_url)
      if (data.credit_amount) setMontoAprobado(String(data.credit_amount))
      if (data.credit_days) setDiasAprobados(String(data.credit_days))
      if (data.signed_contract_url) { setPaso(5); setFirmaEnviada(true) }
      else if (data.status === 'approved' && data.contract_url) { setPaso(4) }
      else if (data.status === 'approved' && !data.contract_url) { setPaso(3); setEnviado(true) }
      else if (data.status === 'under_review') { setPaso(3); setEnviado(true) }
      else if (data.status === 'rejected') { setPaso(3); setEnviado(false) }
      else if (data.status === 'draft') { if (data.facturacion?.metodo_pago) setPaso(3); else setPaso(2) }
      else { setPaso(2) }
      setVista('solicitud')
    } catch { setCredError('Error al buscar. Intenta de nuevo.') } finally { setBuscando(false) }
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const newForm = { ...form, [e.target.name]: e.target.value }
    setForm(newForm); setFormErrors(prev => ({ ...prev, [e.target.name]: '' }))
    scheduleAutoSave(newForm, facturacion, archivos)
  }

  function handleMontoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setMontoDisplay(formatMonto(raw))
    const newForm = { ...form, monto: raw }
    setForm(newForm); setFormErrors(prev => ({ ...prev, monto: '' }))
    scheduleAutoSave(newForm, facturacion, archivos)
  }

  function handleFacturacionChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const newFacturacion = { ...facturacion, [e.target.name]: e.target.value }
    setFacturacion(newFacturacion); setFacturacionErrors(prev => ({ ...prev, [e.target.name]: '' }))
    scheduleAutoSave(form, newFacturacion, archivos)
  }

  function validarPaso1() {
    const errors: Record<string, string> = {}
    if (!form.denominacion.trim()) errors.denominacion = 'Campo requerido'
    if (!form.representante.trim()) errors.representante = 'Campo requerido'
    if (!form.rfc.trim()) errors.rfc = 'Campo requerido'
    else if (!rfcValido(form.rfc)) errors.rfc = 'RFC inválido'
    if (!form.email.trim()) errors.email = 'Campo requerido'
    else if (!emailValido(form.email)) errors.email = 'Email inválido'
    if (!form.monto.trim()) errors.monto = 'Campo requerido'
    if (!form.dias.trim()) errors.dias = 'Campo requerido'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validarPaso2() {
    const errors: Record<string, string> = {}
    if (!facturacion.metodo_pago) errors.metodo_pago = 'Campo requerido'
    if (!facturacion.forma_pago) errors.forma_pago = 'Campo requerido'
    if (!facturacion.uso_cfdi) errors.uso_cfdi = 'Campo requerido'
    if (!facturacion.regimen_fiscal.trim()) errors.regimen_fiscal = 'Campo requerido'
    if (!facturacion.monedas || facturacion.monedas.length === 0) errors.monedas = 'Selecciona al menos una moneda'
    if (!facturacion.email_rl.trim()) errors.email_rl = 'Campo requerido'
    else if (!emailValido(facturacion.email_rl)) errors.email_rl = 'Email inválido'
    if (!facturacion.email_facturas.trim()) errors.email_facturas = 'Campo requerido'
    if (!facturacion.contacto_cxp.trim()) errors.contacto_cxp = 'Campo requerido'
    if (!facturacion.telefono_cxp.trim()) errors.telefono_cxp = 'Campo requerido'
    if (!facturacion.email_cxp.trim()) errors.email_cxp = 'Campo requerido'
    if (!facturacion.razon_social_factura.trim()) errors.razon_social_factura = 'Campo requerido'
    if (!facturacion.representante_legal.trim()) errors.representante_legal = 'Campo requerido'
    setFacturacionErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleArchivo(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { showToast('Solo se aceptan archivos PDF.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('El archivo no debe superar 5MB.', 'error'); return }
    setSubiendo(id)
    try {
      const supabase = createClient()
      const fileName = id + '_' + Date.now() + '.pdf'
      const { error: uploadError } = await supabase.storage.from('expedientes').upload(fileName, file, { contentType: 'application/pdf' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(fileName)
      const newArchivos = { ...archivos, [id]: { nombre: file.name, url: urlData.publicUrl } }
      setArchivos(newArchivos)
      showToast('Archivo cargado: ' + file.name)
      await guardarDraft(form, facturacion, newArchivos, applicationId)
    } catch { showToast('Error al subir archivo. Intenta de nuevo.', 'error') } finally { setSubiendo(null) }
  }

  async function handleEnviar() {
    const subidos = Object.keys(archivos).length
    if (subidos < documentos.length) { showToast('Debes subir los ' + documentos.length + ' documentos antes de enviar.', 'error'); return }
    try {
      const supabase = createClient()
      const docsUrls: Record<string, string> = {}
      documentos.forEach(doc => { if (archivos[doc.id]?.url) docsUrls[doc.id] = archivos[doc.id].url })
      if (applicationId) {
        await supabase.from('applications').update({
          status: 'under_review', docs_urls: docsUrls, facturacion, submitted_at: new Date().toISOString()
        }).eq('id', applicationId)
      } else {
        const { data, error } = await supabase.from('applications').insert({
          status: 'under_review', credit_amount: Number(form.monto), credit_days: Number(form.dias),
          email_contacto: form.email, denominacion: form.denominacion, representante: form.representante,
          rfc: form.rfc.trim().toUpperCase(), docs_urls: docsUrls, facturacion, submitted_at: new Date().toISOString(),
        }).select().single()
        if (error) throw error
        setApplicationId(data.id)
      }
      setEnviado(true)
      setStatus('under_review')
      // Notificación interna a Miguel
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'miguel.felix@savinodelbene.com',
          type: 'nueva_solicitud',
          data: {
            cliente: form.denominacion,
            rfc: form.rfc.trim().toUpperCase(),
            monto: form.monto,
            dias: form.dias,
          }
        })
      })
      // Confirmación al cliente
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.email,
          type: 'solicitud_recibida',
          data: {
            denominacion: form.denominacion,
            rfc: form.rfc.trim().toUpperCase(),
            email: form.email,
            monto: form.monto,
            dias: form.dias,
          }
        })
      })
      showToast('Expediente enviado. Recibirás actualizaciones en ' + form.email)
    } catch { showToast('Error al enviar. Intenta de nuevo.', 'error') }
  }

  async function handleSubirFirma(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { showToast('Solo se aceptan archivos PDF.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('El archivo no debe superar 5MB.', 'error'); return }
    setSubiendoFirma(true)
    try {
      const supabase = createClient()
      const fileName = 'firmado_' + applicationId + '_' + Date.now() + '.pdf'
      const { error: uploadError } = await supabase.storage.from('expedientes').upload(fileName, file, { contentType: 'application/pdf' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('expedientes').getPublicUrl(fileName)
      setSignedContract({ nombre: file.name, url: urlData.publicUrl })
      showToast('Contrato firmado cargado.')
    } catch { showToast('Error al subir el contrato firmado.', 'error') } finally { setSubiendoFirma(false) }
  }

  async function handleEnviarFirma() {
    if (!signedContract) { showToast('Debes subir el contrato firmado primero.', 'error'); return }
    try {
      const supabase = createClient()
      const { error } = await supabase.from('applications').update({ signed_contract_url: signedContract.url }).eq('id', applicationId)
      if (error) throw error
      setFirmaEnviada(true); setPaso(5)
      showToast('Contrato firmado enviado correctamente.')
    } catch { showToast('Error al enviar contrato firmado.', 'error') }
  }

  const subidos = Object.keys(archivos).length

  function DraftIndicator() {
    if (status !== 'draft') return null
    if (guardandoDraft) return <span className="text-xs text-gray-400 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />Guardando...</span>
    if (ultimoGuardado) {
      const mins = Math.floor((Date.now() - ultimoGuardado.getTime()) / 60000)
      const label = mins === 0 ? 'ahora mismo' : `hace ${mins} min`
      return <span className="text-xs text-gray-400 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />Borrador guardado {label}</span>
    }
    return null
  }

  const PasoIndicador = () => (
    <div className="flex items-center gap-2 mb-8 overflow-x-auto">
      {[{ n: 1, label: 'Datos' }, { n: 2, label: 'Facturación' }, { n: 3, label: 'Expediente' }, { n: 4, label: 'Contrato' }, { n: 5, label: 'Firma' }].map((s, i, arr) => (
        <div key={s.n} className="flex items-center gap-2 flex-shrink-0">
          <div className={'flex items-center gap-2 text-sm font-medium ' + (paso === s.n ? 'text-gray-900' : 'text-gray-400')}>
            <span className={'w-6 h-6 rounded-full flex items-center justify-center text-xs ' + (paso >= s.n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500')}>{s.n}</span>
            {s.label}
          </div>
          {i < arr.length - 1 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )

  if (vista === 'identificacion') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex flex-col items-center">
            <img src={LOGO} alt="Savino del Bene" className="h-12 object-contain mb-3" />
            <p className="text-xs text-gray-500">Portal de Crédito</p>
          </div>
          <div className="p-6 grid gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-700">¿Ya tienes una solicitud en proceso? Ingresa tu RFC y correo para continuar donde lo dejaste.</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">RFC de la empresa</label>
              <input value={credenciales.rfc} onChange={e => setCredenciales(prev => ({ ...prev, rfc: e.target.value }))} placeholder="EMP900101ABC" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none uppercase" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Correo electrónico</label>
              <input type="email" value={credenciales.email} onChange={e => setCredenciales(prev => ({ ...prev, email: e.target.value }))} placeholder="contacto@empresa.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            {credError && <p className="text-xs text-red-500">{credError}</p>}
            <button onClick={handleBuscarSolicitud} disabled={buscando} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {buscando ? 'Buscando...' : 'Continuar solicitud existente'}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">o</span></div>
            </div>
            <button onClick={() => { setVista('solicitud'); setPaso(1) }} className="w-full border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Nueva solicitud de crédito
            </button>
          </div>
        </div>
        {toast && <div className={`fixed bottom-6 right-6 text-white text-sm px-4 py-3 rounded-xl shadow-lg ${toastType === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>{toast}</div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Savino del Bene" className="h-10 object-contain" />
            <div>
              <p className="text-sm font-medium text-gray-900">Portal de Crédito</p>
              <p className="text-xs text-gray-500">Solicitud de línea de crédito</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DraftIndicator />
            <span className={'text-xs px-3 py-1.5 rounded-full font-medium ' + (statusConfig[status]?.color || 'bg-gray-100 text-gray-600')}>
              {statusConfig[status]?.label || status}
            </span>
            <button onClick={handleSalir} className="text-xs text-gray-400 hover:text-gray-600 underline">Salir</button>
          </div>
        </div>

        <PasoIndicador />

        {paso === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Paso 1 — Datos de la empresa</h2>
              <p className="text-xs text-gray-500 mt-0.5">Completa la información general de tu empresa</p>
            </div>
            <div className="p-6 grid gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Denominación Social <span className="text-red-500">*</span></label>
                <input name="denominacion" value={form.denominacion} onChange={handleFormChange} placeholder="Empresa SA de CV" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (formErrors.denominacion ? 'border-red-300' : 'border-gray-200')} />
                {formErrors.denominacion && <p className="text-xs text-red-500 mt-1">{formErrors.denominacion}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre del Representante Legal <span className="text-red-500">*</span></label>
                <input name="representante" value={form.representante} onChange={handleFormChange} placeholder="Juan Pérez López" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (formErrors.representante ? 'border-red-300' : 'border-gray-200')} />
                {formErrors.representante && <p className="text-xs text-red-500 mt-1">{formErrors.representante}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">RFC <span className="text-red-500">*</span></label>
                <input name="rfc" value={form.rfc} onChange={handleFormChange} placeholder="EMP900101ABC" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none uppercase ' + (formErrors.rfc ? 'border-red-300' : 'border-gray-200')} />
                {formErrors.rfc && <p className="text-xs text-red-500 mt-1">{formErrors.rfc}</p>}
                {rfcValido(form.rfc) && emailValido(form.email) && !applicationId && (
                  <p className="text-xs text-blue-500 mt-1">Tu progreso se guardará automáticamente</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Correo para recibir actualizaciones <span className="text-red-500">*</span></label>
                <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="contacto@empresa.com" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (formErrors.email ? 'border-red-300' : 'border-gray-200')} />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Crédito solicitado (USD) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input value={montoDisplay} onChange={handleMontoChange} placeholder="500,000" className={'w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none ' + (formErrors.monto ? 'border-red-300' : 'border-gray-200')} />
                  </div>
                  {formErrors.monto && <p className="text-xs text-red-500 mt-1">{formErrors.monto}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Días de crédito solicitados <span className="text-red-500">*</span></label>
                  <select name="dias" value={form.dias} onChange={handleFormChange} className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (formErrors.dias ? 'border-red-300' : 'border-gray-200')}>
                    <option value="">Selecciona</option>
                    <option value="30">30 días</option>
                    <option value="45">45 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                    <option value="120">120 días</option>
                  </select>
                  {formErrors.dias && <p className="text-xs text-red-500 mt-1">{formErrors.dias}</p>}
                </div>
              </div>
              <button onClick={() => { if (validarPaso1()) setPaso(2) }} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 mt-2">
                Continuar — Información de facturación →
              </button>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Paso 2 — Información de facturación</h2>
              <p className="text-xs text-gray-500 mt-0.5">Completa los datos fiscales y de cuentas por pagar</p>
            </div>
            <div className="p-6 grid gap-5">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Método de pago <span className="text-red-500">*</span></label>
                <div className="grid gap-2">
                  {[{ value: 'PUE', label: 'PUE — Pago en una sola exhibición' }, { value: 'PIP', label: 'PIP — Pago inicial y parcialidades' }, { value: 'PPD', label: 'PPD — Pago en parcialidades o diferido' }].map(op => (
                    <label key={op.value} className={'flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer ' + (facturacion.metodo_pago === op.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50')}>
                      <input type="radio" name="metodo_pago" value={op.value} checked={facturacion.metodo_pago === op.value} onChange={handleFacturacionChange} className="accent-gray-900" />
                      <span className="text-sm text-gray-700">{op.label}</span>
                    </label>
                  ))}
                </div>
                {facturacionErrors.metodo_pago && <p className="text-xs text-red-500 mt-1">{facturacionErrors.metodo_pago}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Forma de pago <span className="text-red-500">*</span></label>
                <div className="grid gap-2">
                  {[{ value: 'deposito', label: 'Depósito' }, { value: 'transferencia', label: 'Transferencia' }, { value: 'por_definir', label: '99 — Por definir' }].map(op => (
                    <label key={op.value} className={'flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer ' + (facturacion.forma_pago === op.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50')}>
                      <input type="radio" name="forma_pago" value={op.value} checked={facturacion.forma_pago === op.value} onChange={handleFacturacionChange} className="accent-gray-900" />
                      <span className="text-sm text-gray-700">{op.label}</span>
                    </label>
                  ))}
                </div>
                {facturacionErrors.forma_pago && <p className="text-xs text-red-500 mt-1">{facturacionErrors.forma_pago}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Uso de CFDI <span className="text-red-500">*</span></label>
                <div className="grid gap-2">
                  {[{ value: 'G01', label: 'G01 — Adquisición de mercancías' }, { value: 'G03', label: 'G03 — Gastos en general' }].map(op => (
                    <label key={op.value} className={'flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer ' + (facturacion.uso_cfdi === op.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50')}>
                      <input type="radio" name="uso_cfdi" value={op.value} checked={facturacion.uso_cfdi === op.value} onChange={handleFacturacionChange} className="accent-gray-900" />
                      <span className="text-sm text-gray-700">{op.label}</span>
                    </label>
                  ))}
                </div>
                {facturacionErrors.uso_cfdi && <p className="text-xs text-red-500 mt-1">{facturacionErrors.uso_cfdi}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Régimen Fiscal <span className="text-red-500">*</span></label>
                <input name="regimen_fiscal" value={facturacion.regimen_fiscal} onChange={handleFacturacionChange} placeholder="Ej. 601 General de Ley Personas Morales" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (facturacionErrors.regimen_fiscal ? 'border-red-300' : 'border-gray-200')} />
                {facturacionErrors.regimen_fiscal && <p className="text-xs text-red-500 mt-1">{facturacionErrors.regimen_fiscal}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Moneda de facturación <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(puedes seleccionar más de una)</span></label>
                <div className="flex gap-3">
                  {['USD', 'MXN', 'EUR'].map(m => (
                    <label key={m} className={'flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer flex-1 justify-center ' + (facturacion.monedas?.includes(m) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-700')}>
                      <input type="checkbox" checked={facturacion.monedas?.includes(m) || false} onChange={() => toggleMoneda(m)} className="hidden" />
                      <span className="text-sm font-medium">{m}</span>
                    </label>
                  ))}
                </div>
                {facturacionErrors.monedas && <p className="text-xs text-red-500 mt-1">{facturacionErrors.monedas}</p>}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-3">Datos del Representante Legal</p>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Correo electrónico del Representante Legal <span className="text-red-500">*</span></label>
                  <input name="email_rl" type="email" value={facturacion.email_rl} onChange={handleFacturacionChange} placeholder="rl@empresa.com" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (facturacionErrors.email_rl ? 'border-red-300' : 'border-gray-200')} />
                  {facturacionErrors.email_rl && <p className="text-xs text-red-500 mt-1">{facturacionErrors.email_rl}</p>}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-3">Datos de facturación y cuentas por pagar</p>
                <div className="grid gap-3">
                  {[
                    { name: 'email_facturas', label: 'Correo para envío de facturas y complementos de pago', type: 'email', placeholder: 'facturas@empresa.com' },
                    { name: 'contacto_cxp', label: 'Contacto cuentas por pagar', type: 'text', placeholder: 'Nombre del contacto' },
                    { name: 'telefono_cxp', label: 'Teléfono cuentas por pagar', type: 'text', placeholder: '+52 55 1234 5678' },
                    { name: 'email_cxp', label: 'Correo cuentas por pagar', type: 'email', placeholder: 'cxp@empresa.com' },
                    { name: 'razon_social_factura', label: 'Razón social a la que se factura', type: 'text', placeholder: 'Empresa SA de CV' },
                    { name: 'representante_legal', label: 'Nombre del Representante Legal', type: 'text', placeholder: 'Juan Pérez López' },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="text-xs text-gray-500 block mb-1">{f.label} <span className="text-red-500">*</span></label>
                      <input name={f.name} type={f.type} value={facturacion[f.name as keyof typeof facturacion] as string} onChange={handleFacturacionChange} placeholder={f.placeholder} className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (facturacionErrors[f.name] ? 'border-red-300' : 'border-gray-200')} />
                      {facturacionErrors[f.name] && <p className="text-xs text-red-500 mt-1">{facturacionErrors[f.name]}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setPaso(1)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">← Regresar</button>
                <button onClick={() => { if (validarPaso2()) setPaso(3) }} className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700">Continuar — Expediente →</button>
              </div>
            </div>
          </div>
        )}

        {paso === 3 && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Empresa:</span> <span className="font-medium">{form.denominacion}</span></div>
                <div><span className="text-gray-400">RFC:</span> <span className="font-medium">{form.rfc}</span></div>
                <div><span className="text-gray-400">Método pago:</span> <span className="font-medium">{facturacion.metodo_pago}</span></div>
                <div><span className="text-gray-400">Moneda(s):</span> <span className="font-medium">{facturacion.monedas?.join(', ')}</span></div>
              </div>
              {!enviado && <button onClick={() => setPaso(1)} className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline">Editar datos</button>}
            </div>
            {status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-red-700">Solicitud rechazada — Correcciones necesarias</p>
                <p className="text-xs text-red-600 mt-1">Revisa el correo con el detalle de las correcciones, sube los documentos correctos y vuelve a enviar.</p>
              </div>
            )}
            {enviado && status === 'under_review' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-yellow-700">Expediente en revisión</p>
                <p className="text-xs text-yellow-600 mt-1">Tu expediente fue enviado. Cuando el analista lo apruebe aparecerá el contrato aquí. Esta página se actualiza automáticamente cada 5 segundos.</p>
              </div>
            )}
            {!enviado && (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Progreso del expediente</p>
                    <p className="text-xs text-gray-500 mt-0.5">{subidos} de {documentos.length} documentos cargados</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: (subidos / documentos.length * 100) + '%' }} />
                    </div>
                    <span className="text-xs font-medium">{Math.round(subidos / documentos.length * 100)}%</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-medium">Formatos obligatorios para descargar</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Descarga, llena y súbelos en la sección de documentos</p>
                  </div>
                  <div className="p-4 grid gap-3">
                    {formatos.map(f => (
                      <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <span className="text-sm text-gray-700">{f.label}</span>
                        <a href={f.url} target="_blank" rel="noreferrer" download className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700">Descargar</a>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-medium">Documentos requeridos</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Solo se aceptan archivos PDF de máximo 5MB</p>
                  </div>
                  <div className="p-4 grid gap-3">
                    {documentos.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm text-gray-700">{doc.label}</p>
                          {archivos[doc.id] && <p className="text-xs text-gray-400 mt-0.5">{archivos[doc.id].nombre}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={'text-xs px-2 py-1 rounded-full ' + (archivos[doc.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {archivos[doc.id] ? 'Cargado' : 'Pendiente'}
                          </span>
                          <label className={'text-xs border border-gray-200 bg-white rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-100 ' + (subiendo === doc.id ? 'opacity-50' : '')}>
                            {subiendo === doc.id ? 'Subiendo...' : archivos[doc.id] ? 'Cambiar' : 'Subir PDF'}
                            <input type="file" accept=".pdf" className="hidden" onChange={e => handleArchivo(doc.id, e)} disabled={subiendo === doc.id} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleEnviar} disabled={enviado} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                  Enviar expediente para revisión
                </button>
              </>
            )}
          </>
        )}

        {paso === 4 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Paso 4 — Descarga tu contrato de crédito</h2>
              <p className="text-xs text-gray-500 mt-0.5">Descarga el contrato, fírmalo y súbelo en el siguiente paso.</p>
            </div>
            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-green-700 mb-3">¡Felicidades! Su crédito ha sido pre-aprobado</p>
                <div className="flex gap-4 mb-3">
                  <div className="bg-white border border-green-200 rounded-lg px-4 py-3 flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-1">Monto aprobado</p>
                    <p className="text-lg font-medium text-gray-900">${Number(montoAprobado || form.monto).toLocaleString()} USD</p>
                  </div>
                  <div className="bg-white border border-green-200 rounded-lg px-4 py-3 flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-1">Días de crédito</p>
                    <p className="text-lg font-medium text-gray-900">{diasAprobados || form.dias} días</p>
                  </div>
                </div>
                <p className="text-xs text-green-700 leading-relaxed mb-3">Dicho beneficio será formalizado una vez que cargue a este portal el contrato firmado por su Representante Legal en tinta azul, y el mismo sea compartido en físico a Savino del Bene México a la siguiente dirección:</p>
                <div className="bg-white border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-700 leading-relaxed">Av. Insurgentes Sur 800, Piso 15, Colonia Del Valle, Alcaldía Benito Juárez, Ciudad de México, CP 03100, México</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-900">Contrato de crédito</p>
                  <p className="text-xs text-gray-500 mt-0.5">Generado por Savino del Bene México</p>
                </div>
                <div className="flex gap-2">
                  <a href={contractUrl || ''} target="_blank" rel="noreferrer" className="text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-100">Ver contrato</a>
                  <a href={contractUrl || ''} target="_blank" rel="noreferrer" className="text-xs bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-700">Descargar</a>
                </div>
              </div>
              <button onClick={() => setPaso(5)} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700">
                Continuar — Subir contrato firmado →
              </button>
            </div>
          </div>
        )}

        {paso === 5 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Paso 5 — Sube el contrato firmado</h2>
              <p className="text-xs text-gray-500 mt-0.5">Firma el contrato y súbelo en formato PDF para completar el proceso.</p>
            </div>
            <div className="p-6">
              {firmaEnviada ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-green-700 mb-2">Proceso completado</p>
                  <p className="text-xs text-green-600">Tu contrato firmado fue recibido. El equipo de Savino del Bene México se pondrá en contacto contigo para los siguientes pasos.</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-blue-700 mb-1">Instrucciones</p>
                    <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                      <li>Descarga el contrato del paso anterior si aún no lo tienes</li>
                      <li>Fírmalo con el Representante Legal en tinta azul</li>
                      <li>Escanéalo en formato PDF</li>
                      <li>Súbelo aquí</li>
                    </ol>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <label className="text-xs text-gray-500 block mb-2">Contrato firmado (PDF, máximo 5MB)</label>
                    <label className={'text-xs border border-gray-200 bg-white rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 inline-block ' + (subiendoFirma ? 'opacity-50' : '')}>
                      {subiendoFirma ? 'Subiendo...' : signedContract ? 'Cambiar archivo' : 'Seleccionar PDF firmado'}
                      <input type="file" accept=".pdf" className="hidden" onChange={handleSubirFirma} disabled={subiendoFirma} />
                    </label>
                    {signedContract && <p className="text-xs text-green-600 mt-2">Archivo listo: {signedContract.nombre}</p>}
                  </div>
                  <button onClick={handleEnviarFirma} disabled={!signedContract} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                    Enviar contrato firmado
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Conty paso={paso} form={form} />

      {toast && (
        <div className={`fixed bottom-6 right-6 text-white text-sm px-4 py-3 rounded-xl shadow-lg transition-all ${toastType === 'error' ? 'bg-red-600' : toastType === 'info' ? 'bg-blue-600' : 'bg-gray-900'}`}>
          {toast}
        </div>
      )}
    </div>
  )
}
