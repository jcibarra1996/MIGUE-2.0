'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOGO = 'https://i.imgur.com/JJTbpFw.png'
const filtrosVacios = { busqueda: '', fechaInicio: '', fechaFin: '', montoMin: '', montoMax: '' }
const POR_PAGINA = 10
const SESSION_REFRESH_INTERVAL = 25 * 60 * 1000

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

function Paginacion({ pagina, total, porPagina, onChange }: { pagina: number; total: number; porPagina: number; onChange: (p: number) => void }) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (totalPaginas <= 1) return null
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
      <p className="text-xs text-gray-500">Página {pagina} de {totalPaginas} · {total} registros</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(1)} disabled={pagina === 1} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">«</button>
        <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">‹</button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1).map((p, i, arr) => (
          <span key={p}>
            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-xs px-1 text-gray-400">…</span>}
            <button onClick={() => onChange(p)} className={'text-xs px-2 py-1 rounded border ' + (p === pagina ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-white')}>{p}</button>
          </span>
        ))}
        <button onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">›</button>
        <button onClick={() => onChange(totalPaginas)} disabled={pagina === totalPaginas} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40">»</button>
      </div>
    </div>
  )
}

function aplicarFiltros(lista: any[], filtros: any) {
  return lista.filter(c => {
    if (filtros.busqueda) { const q = filtros.busqueda.toLowerCase(); if (!c.denominacion?.toLowerCase().includes(q) && !c.rfc?.toLowerCase().includes(q)) return false }
    if (filtros.fechaInicio) { if (!c.submitted_at || new Date(c.submitted_at) < new Date(filtros.fechaInicio)) return false }
    if (filtros.fechaFin) { if (!c.submitted_at || new Date(c.submitted_at) > new Date(filtros.fechaFin + 'T23:59:59')) return false }
    if (filtros.montoMin) { if (!c.credit_amount || Number(c.credit_amount) < Number(filtros.montoMin)) return false }
    if (filtros.montoMax) { if (!c.credit_amount || Number(c.credit_amount) > Number(filtros.montoMax)) return false }
    return true
  })
}

function generarResumenPDF(cliente: any) {
  const docsRows = documentos.map(d => { const tiene = cliente.docs_urls?.[d.id]; return `<div class="row"><span class="label">${d.label}</span><span class="badge ${tiene ? 'recibido' : 'pendiente'}">${tiene ? 'Recibido' : 'Pendiente'}</span></div>` }).join('')
  const facRows = cliente.facturacion ? [['Método de pago', cliente.facturacion.metodo_pago], ['Forma de pago', cliente.facturacion.forma_pago], ['Uso de CFDI', cliente.facturacion.uso_cfdi], ['Régimen Fiscal', cliente.facturacion.regimen_fiscal], ['Moneda', cliente.facturacion.moneda], ['Email facturas', cliente.facturacion.email_facturas], ['Contacto CxP', cliente.facturacion.contacto_cxp], ['Teléfono CxP', cliente.facturacion.telefono_cxp], ['Email CxP', cliente.facturacion.email_cxp], ['Razón social facturación', cliente.facturacion.razon_social_factura], ['Representante Legal', cliente.facturacion.representante_legal]].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v || '—'}</span></div>`).join('') : '<p class="empty">Sin información de facturación.</p>'
  const vendRows = cliente.vendor_info ? [['Vendedor', cliente.vendor_info.nombre_vendedor], ['Giro del cliente', cliente.vendor_info.giro_cliente], ['Embarques por mes', cliente.vendor_info.embarques_mes], ['Tipo de operación', cliente.vendor_info.tipo_operacion?.join(', ')], ['Puertos principales', cliente.vendor_info.puertos_principales], ['País de origen', cliente.vendor_info.origen_pais], ['Puerto de destino', cliente.vendor_info.destino_puerto], ['Modalidad', cliente.vendor_info.modalidad?.join(', ')], ['Tipo de carga', cliente.vendor_info.tipo_carga?.join(', ')], ['Profit estimado', (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString()], ['Manejo de carga', cliente.vendor_info.manejo_carga], ['Comentarios', cliente.vendor_info.comentarios]].filter(([, v]) => v).map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('') : '<p class="empty">Sin información del vendedor.</p>'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Expediente ${cliente.denominacion}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:40px}.header{background:#1E3A5F;color:white;padding:20px 40px;margin:-40px -40px 28px -40px}.header h1{font-size:18px;margin-bottom:4px}.header p{font-size:11px;color:#CBD5E1}h2{font-size:12px;font-weight:bold;color:#1E40AF;text-transform:uppercase;margin:24px 0 6px;border-bottom:1px solid #E5E7EB;padding-bottom:4px}.row{display:flex;padding:5px 0;border-bottom:1px solid #F9FAFB;gap:12px}.label{color:#6B7280;width:200px;flex-shrink:0;font-weight:bold;font-size:11px}.value{color:#111827;font-size:11px}.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:bold}.recibido{background:#DCFCE7;color:#15803D}.pendiente{background:#FEE2E2;color:#DC2626}.empty{color:#9CA3AF;font-size:11px;padding:8px 0}.footer{margin-top:40px;font-size:10px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px;text-align:center}.tip{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:11px;color:#1E40AF}@media print{.tip{display:none}body{padding:20px}.header{margin:-20px -20px 20px -20px}}</style></head><body><div class="header"><h1>Savino del Bene México</h1><p>Portal de Crédito — Expediente para revisión de Dirección Financiera · Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div><div class="tip">Para guardar como PDF: presiona <strong>Ctrl+P</strong> y selecciona <strong>"Guardar como PDF"</strong>.</div><h2>Propuesta del Analista</h2><div class="row"><span class="label">Monto propuesto</span><span class="value">$${Number(cliente.approved_credit_amount || 0).toLocaleString('es-MX')} USD</span></div><div class="row"><span class="label">Días de crédito</span><span class="value">${cliente.approved_credit_days || '—'} días</span></div><h2>Datos Generales</h2><div class="row"><span class="label">Razón Social</span><span class="value">${cliente.denominacion || '—'}</span></div><div class="row"><span class="label">RFC</span><span class="value">${cliente.rfc?.trim() || '—'}</span></div><div class="row"><span class="label">Email de Contacto</span><span class="value">${cliente.email_contacto || '—'}</span></div><div class="row"><span class="label">Folio Vendedor</span><span class="value">${cliente.vendor_folio || '—'}</span></div><div class="row"><span class="label">Monto Solicitado</span><span class="value">$${Number(cliente.credit_amount || 0).toLocaleString('es-MX')} USD</span></div><div class="row"><span class="label">Días Solicitados</span><span class="value">${cliente.credit_days || '—'} días</span></div><div class="row"><span class="label">Fecha de Solicitud</span><span class="value">${cliente.submitted_at ? new Date(cliente.submitted_at).toLocaleDateString('es-MX') : '—'}</span></div><h2>Documentos del Cliente</h2>${docsRows}<h2>Información de Facturación</h2>${facRows}<h2>Información del Vendedor</h2>${vendRows}<div class="footer">Savino del Bene México — Documento confidencial de uso interno · Dirección Financiera</div></body></html>`
  const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function TablaHistorial({ historialPagina, historialSelected, setHistorialSelected, onBloquear }: any) {
  const tableRef = useRef<HTMLDivElement>(null)
  function scrollLeft() { tableRef.current?.scrollBy({ left: -300, behavior: 'smooth' }) }
  function scrollRight() { tableRef.current?.scrollBy({ left: 300, behavior: 'smooth' }) }
  const statusLabel: Record<string, string> = { under_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', draft: 'Borrador' }
  const statusColor: Record<string, string> = { under_review: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', draft: 'bg-gray-100 text-gray-600' }
  return (
    <div className="relative">
      <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-gray-50 text-gray-600">‹</button>
      <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-gray-50 text-gray-600">›</button>
      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Cliente</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">RFC</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Crédito aprobado</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Estado</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Bloqueo</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Motivo rechazo</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Fecha resolución</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {historialPagina.map((c: any) => (
              <tr key={c.id} className={'border-t border-gray-100 ' + (historialSelected === c.id ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                <td className="px-6 py-3 font-medium whitespace-nowrap">{c.denominacion || 'Sin nombre'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{c.rfc?.trim() || '—'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">${Number(c.approved_credit_amount || 0).toLocaleString()} · {c.approved_credit_days || 0} días</td>
                <td className="px-6 py-3 whitespace-nowrap"><span className={'text-xs px-2 py-1 rounded-full ' + (statusColor[c.status] || 'bg-gray-100 text-gray-600')}>{statusLabel[c.status] || c.status}</span></td>
                <td className="px-6 py-3 whitespace-nowrap">{c.bloqueado ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Bloqueado</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Activo</span>}</td>
                <td className="px-6 py-3 text-gray-500" style={{ maxWidth: '180px' }}>{c.status === 'rejected' && c.rejection_reason ? <span className="text-xs text-red-600">{c.rejection_reason}</span> : '—'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString('es-MX') : '—'}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button onClick={() => setHistorialSelected(historialSelected === c.id ? null : c.id)} className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (historialSelected === c.id ? 'bg-gray-900 text-white' : 'border border-gray-200 hover:bg-gray-50')}>{historialSelected === c.id ? 'Cerrar' : 'Ver'}</button>
                    {c.status === 'approved' && (<button onClick={() => onBloquear(c)} className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (c.bloqueado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200')}>{c.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DirectorPage() {
  const [vista, setVista] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [tab, setTab] = useState('solicitudes')
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [historialSelected, setHistorialSelected] = useState<string | null>(null)
  const [seccion, setSeccion] = useState('resumen')
  const [pdfVisible, setPdfVisible] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)
  const [montoDirector, setMontoDirector] = useState('')
  const [diasDirector, setDiasDirector] = useState('')
  const [filtrosHistorial, setFiltrosHistorial] = useState(filtrosVacios)
  const [bloqueoModal, setBloqueoModal] = useState<any>(null)
  const [motivoBloqueo, setMotivoBloqueo] = useState('')
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)
  const [paginaHistorial, setPaginaHistorial] = useState(1)

  // FIX 1: Ref para refresh de sesión
  const sessionRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const cliente = solicitudes.find(s => s.id === selected)
  const clienteHistorial = historial.find(c => c.id === historialSelected)
  const historialFiltrado = aplicarFiltros(historial, filtrosHistorial)
  const historialPagina = historialFiltrado.slice((paginaHistorial - 1) * POR_PAGINA, paginaHistorial * POR_PAGINA)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  // FIX 1: Iniciar refresh de sesión cada 25 min
  function iniciarRefreshSesion() {
    if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current)
    sessionRefreshRef.current = setInterval(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        clearInterval(sessionRefreshRef.current!)
        setVista('login')
        setSolicitudes([])
        setSelected(null)
        setHistorial([])
      }
    }, SESSION_REFRESH_INTERVAL)
  }

  function detenerRefreshSesion() {
    if (sessionRefreshRef.current) {
      clearInterval(sessionRefreshRef.current)
      sessionRefreshRef.current = null
    }
  }

  useEffect(() => {
    return () => detenerRefreshSesion()
  }, [])

  // FIX REFRESH: Al montar, verificar si ya hay sesión activa y restaurar dashboard
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || profile.role !== 'director') return
      setVista('dashboard')
      iniciarRefreshSesion()
      cargarSolicitudes()
    }
    checkSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function abrirExpediente(id: string) {
    const s = solicitudes.find(x => x.id === id)
    if (!s) return
    setSelected(id)
    setSeccion('resumen')
    setAccion(null)
    setMotivoRechazo('')
    const monto = parseFloat(String(s.approved_credit_amount ?? ''))
    const dias = parseInt(String(s.approved_credit_days ?? ''), 10)
    setMontoDirector(!isNaN(monto) && monto > 0 ? String(monto) : '')
    setDiasDirector(!isNaN(dias) && dias > 0 ? String(dias) : '')
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setLoginError('Ingresa tu correo y contraseña.'); return }
    setCargando(true); setLoginError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setLoginError('Credenciales incorrectas.'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoginError('Error al obtener usuario.'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || profile.role !== 'director') { setLoginError('No tienes permisos para acceder a este portal.'); await supabase.auth.signOut(); return }
      setVista('dashboard')
      iniciarRefreshSesion() // FIX 1
      cargarSolicitudes()
    } catch { setLoginError('Error al iniciar sesión.') } finally { setCargando(false) }
  }

  async function cargarSolicitudes() {
    setLoadingSolicitudes(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('applications').select('*').eq('director_status', 'pending').order('created_at', { ascending: false })
      if (data) setSolicitudes(data)
    } catch (err) { console.error(err) } finally { setLoadingSolicitudes(false) }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true)
    try { const supabase = createClient(); const { data } = await supabase.from('applications').select('*').in('status', ['approved', 'rejected']).order('reviewed_at', { ascending: false }); if (data) setHistorial(data) } catch (err) { console.error(err) } finally { setLoadingHistorial(false) }
  }

  function exportarExcel() {
    const params = new URLSearchParams()
    if (filtrosHistorial.busqueda) params.set('busqueda', filtrosHistorial.busqueda)
    if (filtrosHistorial.fechaInicio) params.set('fechaInicio', filtrosHistorial.fechaInicio)
    if (filtrosHistorial.fechaFin) params.set('fechaFin', filtrosHistorial.fechaFin)
    if (filtrosHistorial.montoMin) params.set('montoMin', filtrosHistorial.montoMin)
    if (filtrosHistorial.montoMax) params.set('montoMax', filtrosHistorial.montoMax)
    window.open('/api/export/excel?' + params.toString(), '_blank')
  }

  async function handleAprobar() {
    if (!cliente) return
    const montoFinal = parseFloat(montoDirector)
    const diasFinal = parseInt(diasDirector, 10)
    if (isNaN(montoFinal) || montoFinal <= 0) { showToast('Ingresa un monto válido.'); return }
    if (isNaN(diasFinal) || diasFinal <= 0) { showToast('Ingresa días de crédito válidos.'); return }

    setProcesando(true)
    try {
      const supabase = createClient()
      await supabase.from('applications').update({
        director_status: 'approved',
        director_reviewed_at: new Date().toISOString(),
        approved_credit_amount: montoFinal,
        approved_credit_days: diasFinal,
      }).eq('id', cliente.id)

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'juancarlos.ibarra@savinodelbene.com', type: 'director_aprobado', data: { cliente: cliente.denominacion, monto: montoFinal, dias: diasFinal } })
      })

      setSolicitudes(prev => prev.filter(s => s.id !== cliente.id))
      setSelected(null)
      setAccion(null)
      setMontoDirector('')
      setDiasDirector('')
      showToast('Solicitud aprobada. Se notificó al analista.')
    } catch { showToast('Error al aprobar.') } finally { setProcesando(false) }
  }

  async function handleRechazar() {
    if (!cliente) return
    if (!motivoRechazo.trim()) { showToast('Debes ingresar el motivo de rechazo.'); return }
    setProcesando(true)
    try {
      const supabase = createClient()
      await supabase.from('applications').update({
        director_status: 'rejected',
        director_motivo: motivoRechazo,
        director_reviewed_at: new Date().toISOString(),
        status: 'rejected',
        rejection_reason: motivoRechazo,
        reviewed_at: new Date().toISOString()
      }).eq('id', cliente.id)

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'juancarlos.ibarra@savinodelbene.com', type: 'director_rechazado', data: { cliente: cliente.denominacion, motivo: motivoRechazo, monto: cliente.approved_credit_amount, dias: cliente.approved_credit_days } })
      })

      setSolicitudes(prev => prev.filter(s => s.id !== cliente.id))
      setSelected(null)
      setAccion(null)
      setMotivoRechazo('')
      showToast('Solicitud rechazada. Se notificó al analista.')
    } catch { showToast('Error al rechazar.') } finally { setProcesando(false) }
  }

  async function handleBloqueo() {
    if (!bloqueoModal) return
    if (!bloqueoModal.bloqueado && !motivoBloqueo.trim()) { showToast('Debes ingresar el motivo de bloqueo.'); return }
    setGuardandoBloqueo(true)
    try {
      const supabase = createClient()
      const nuevoEstado = !bloqueoModal.bloqueado
      await supabase.from('applications').update({ bloqueado: nuevoEstado, motivo_bloqueo: nuevoEstado ? motivoBloqueo : '' }).eq('id', bloqueoModal.id)
      setHistorial(prev => prev.map(c => c.id === bloqueoModal.id ? { ...c, bloqueado: nuevoEstado, motivo_bloqueo: nuevoEstado ? motivoBloqueo : '' } : c))
      setBloqueoModal(null); setMotivoBloqueo('')
      showToast(nuevoEstado ? 'Cliente bloqueado.' : 'Cliente desbloqueado.')
    } catch { showToast('Error al actualizar bloqueo.') } finally { setGuardandoBloqueo(false) }
  }

  async function handleLogout() {
    detenerRefreshSesion() // FIX 1
    const supabase = createClient(); await supabase.auth.signOut()
    setVista('login'); setSolicitudes([]); setSelected(null); setHistorial([])
  }

  if (vista === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex flex-col items-center">
            <img src={LOGO} alt="Savino del Bene" className="h-12 object-contain mb-3" />
            <p className="text-sm font-medium text-gray-900">Portal de Dirección Financiera</p>
            <p className="text-xs text-gray-500 mt-1">Savino del Bene México</p>
          </div>
          <div className="p-6 grid gap-4">
            <div><label className="text-xs text-gray-500 block mb-1">Correo electrónico</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="gabriela.vazquez@savinodelbene.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}
            <button onClick={handleLogin} disabled={cargando} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">{cargando ? 'Entrando...' : 'Iniciar sesión'}</button>
          </div>
        </div>
        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={LOGO} alt="Savino del Bene" className="h-10 object-contain" />
            <div><p className="text-sm font-medium text-gray-900">Portal de Dirección Financiera</p><p className="text-xs text-gray-500">Gabriela Vázquez · Dirección Financiera</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full">{solicitudes.length} pendiente{solicitudes.length !== 1 ? 's' : ''}</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => { setTab('solicitudes'); setSelected(null) }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (tab === 'solicitudes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            Solicitudes pendientes {solicitudes.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{solicitudes.length}</span>}
          </button>
          <button onClick={() => { setTab('historial'); setHistorialSelected(null); if (historial.length === 0) cargarHistorial() }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (tab === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            Historial
          </button>
        </div>

        {tab === 'solicitudes' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h2 className="text-sm font-medium">Solicitudes pendientes de aprobación</h2><p className="text-xs text-gray-500 mt-0.5">Pre-aprobadas por el analista de crédito</p></div>
                <p className="text-xs text-gray-400">{solicitudes.length} solicitudes</p>
              </div>
              {loadingSolicitudes ? (<div className="px-6 py-8 text-center text-sm text-gray-400">Cargando...</div>) : solicitudes.length === 0 ? (<div className="px-6 py-8 text-center text-sm text-gray-400">No hay solicitudes pendientes de revisión.</div>) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Cliente</th>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">RFC</th>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Propuesta analista</th>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Vendedor</th>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Fecha solicitud</th>
                      <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map(s => (
                      <tr key={s.id} className={'border-t border-gray-100 ' + (selected === s.id ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                        <td className="px-6 py-3 font-medium">{s.denominacion || 'Sin nombre'}</td>
                        <td className="px-6 py-3 text-gray-500">{s.rfc?.trim() || '—'}</td>
                        <td className="px-6 py-3">
                          {parseFloat(String(s.approved_credit_amount ?? '')) > 0
                            ? <span className="font-medium text-gray-900">${Number(s.approved_credit_amount).toLocaleString()} USD · {s.approved_credit_days} días</span>
                            : <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">Sin propuesta</span>
                          }
                        </td>
                        <td className="px-6 py-3">{s.vendor_info ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{s.vendor_info.nombre_vendedor}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                        <td className="px-6 py-3 text-gray-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('es-MX') : '—'}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => selected === s.id ? setSelected(null) : abrirExpediente(s.id)}
                            className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (selected === s.id ? 'bg-gray-900 text-white' : 'border border-gray-200 hover:bg-gray-50')}
                          >
                            {selected === s.id ? 'Cerrar' : 'Revisar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {cliente && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div><h2 className="text-sm font-medium">Expediente: {cliente.denominacion}</h2><p className="text-xs text-gray-500 mt-0.5">RFC: {cliente.rfc?.trim()} · Email: <strong>{cliente.email_contacto}</strong></p></div>
                  <div className="flex gap-2">
                    <button onClick={() => generarResumenPDF(cliente)} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">Ver resumen PDF</button>
                    <button onClick={() => setSelected(null)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Cerrar</button>
                  </div>
                </div>
                <div className="flex gap-1 p-4 border-b border-gray-100 bg-gray-50 overflow-x-auto">
                  {['resumen', 'documentos', 'facturacion', 'vendedor', 'decision'].map(s => (
                    <button key={s} onClick={() => setSeccion(s)} className={'px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ' + (seccion === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700')}>
                      {s === 'resumen' ? 'Resumen' : s === 'documentos' ? 'Documentos' : s === 'facturacion' ? 'Facturación' : s === 'vendedor' ? 'Info Vendedor' : 'Decisión'}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {seccion === 'resumen' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 col-span-2">
                        <p className="text-xs font-medium text-blue-700 mb-3">Propuesta del analista de crédito</p>
                        <div className="flex gap-4">
                          <div className="bg-white border border-blue-200 rounded-lg px-4 py-3 flex-1 text-center">
                            <p className="text-xs text-gray-500 mb-1">Monto propuesto</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {parseFloat(String(cliente.approved_credit_amount ?? '')) > 0 ? `$${Number(cliente.approved_credit_amount).toLocaleString()} USD` : <span className="text-red-500 text-sm">Sin datos</span>}
                            </p>
                          </div>
                          <div className="bg-white border border-blue-200 rounded-lg px-4 py-3 flex-1 text-center">
                            <p className="text-xs text-gray-500 mb-1">Días de crédito</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {parseInt(String(cliente.approved_credit_days ?? ''), 10) > 0 ? `${cliente.approved_credit_days} días` : <span className="text-red-500 text-sm">Sin datos</span>}
                            </p>
                          </div>
                          <div className="bg-white border border-blue-100 rounded-lg px-4 py-3 flex-1 text-center">
                            <p className="text-xs text-gray-500 mb-1">Solicitado por cliente</p>
                            <p className="text-lg font-semibold text-gray-900">${Number(cliente.credit_amount || 0).toLocaleString()} USD</p>
                          </div>
                        </div>
                      </div>
                      {[{ label: 'Razón Social', value: cliente.denominacion }, { label: 'RFC', value: cliente.rfc?.trim() }, { label: 'Email', value: cliente.email_contacto }, { label: 'Folio Vendedor', value: cliente.vendor_folio }, { label: 'Fecha de solicitud', value: cliente.submitted_at ? new Date(cliente.submitted_at).toLocaleDateString('es-MX') : '—' }, { label: 'Vendedor', value: cliente.vendor_info?.nombre_vendedor }].map(f => (<div key={f.label} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}
                    </div>
                  )}
                  {seccion === 'documentos' && (
                    <div className="grid gap-2">
                      {documentos.map(doc => { const url = cliente.docs_urls?.[doc.id]; return (<div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm"><span>{doc.label}</span><div className="flex items-center gap-2">{url && <button onClick={() => setPdfVisible(url)} className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1 hover:bg-gray-100">Ver PDF</button>}<span className={'text-xs px-2 py-1 rounded-full ' + (url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>{url ? 'Recibido' : 'Pendiente'}</span></div></div>) })}
                    </div>
                  )}
                  {seccion === 'facturacion' && (
                    <div>{cliente.facturacion ? (<div className="grid grid-cols-2 gap-4">{[{ label: 'Método de pago', value: cliente.facturacion.metodo_pago }, { label: 'Forma de pago', value: cliente.facturacion.forma_pago }, { label: 'Uso de CFDI', value: cliente.facturacion.uso_cfdi }, { label: 'Régimen Fiscal', value: cliente.facturacion.regimen_fiscal }, { label: 'Moneda de facturación', value: cliente.facturacion.moneda }, { label: 'Email facturas', value: cliente.facturacion.email_facturas }, { label: 'Contacto CxP', value: cliente.facturacion.contacto_cxp }, { label: 'Teléfono CxP', value: cliente.facturacion.telefono_cxp }, { label: 'Email CxP', value: cliente.facturacion.email_cxp }, { label: 'Razón social facturación', value: cliente.facturacion.razon_social_factura }, { label: 'Representante Legal', value: cliente.facturacion.representante_legal }].map(f => (<div key={f.label} className={'bg-gray-50 rounded-lg p-3 ' + (f.label === 'Representante Legal' ? 'col-span-2' : '')}><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}</div>) : <div className="text-center py-8 text-sm text-gray-400">Sin información de facturación.</div>}</div>
                  )}
                  {seccion === 'vendedor' && (
                    <div>{cliente.vendor_info ? (<div className="grid grid-cols-2 gap-4">{[{ label: 'Vendedor', value: cliente.vendor_info.nombre_vendedor }, { label: 'Giro del cliente', value: cliente.vendor_info.giro_cliente }, { label: 'Embarques por mes', value: cliente.vendor_info.embarques_mes }, { label: 'Tipo de operación', value: cliente.vendor_info.tipo_operacion?.join(', ') }, { label: 'Puertos principales', value: cliente.vendor_info.puertos_principales }, { label: 'País de origen', value: cliente.vendor_info.origen_pais }, { label: 'Puerto de destino', value: cliente.vendor_info.destino_puerto }, { label: 'Modalidad', value: cliente.vendor_info.modalidad?.join(', ') }, { label: 'Tipo de carga', value: cliente.vendor_info.tipo_carga?.join(', ') }, { label: 'Profit estimado', value: (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString() }].map(f => (<div key={f.label} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}{cliente.vendor_info.manejo_carga && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Manejo de carga</p><p className="text-sm">{cliente.vendor_info.manejo_carga}</p></div>)}{cliente.vendor_info.comentarios && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Comentarios</p><p className="text-sm">{cliente.vendor_info.comentarios}</p></div>)}</div>) : <div className="text-center py-8 text-sm text-gray-400">Sin información del vendedor.</div>}</div>
                  )}
                  {seccion === 'decision' && (
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                        <p className="text-xs font-medium text-blue-700 mb-2">Propuesta del analista</p>
                        <div className="flex gap-6">
                          <div>
                            <p className="text-xs text-gray-500">Monto propuesto</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {parseFloat(String(cliente.approved_credit_amount ?? '')) > 0 ? `$${Number(cliente.approved_credit_amount).toLocaleString()} USD` : <span className="text-red-500">Sin datos</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Días de crédito</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {parseInt(String(cliente.approved_credit_days ?? ''), 10) > 0 ? `${cliente.approved_credit_days} días` : <span className="text-red-500">Sin datos</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Solicitado por cliente</p>
                            <p className="text-sm font-semibold text-gray-900">${Number(cliente.credit_amount || 0).toLocaleString()} USD · {cliente.credit_days} días</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4">
                        <button onClick={() => setAccion('aprobar')} className={'text-sm font-medium rounded-lg px-4 py-2 border ' + (accion === 'aprobar' ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100')}>Aprobar solicitud</button>
                        <button onClick={() => setAccion('rechazar')} className={'text-sm font-medium rounded-lg px-4 py-2 border ' + (accion === 'rechazar' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')}>Rechazar solicitud</button>
                      </div>

                      {accion === 'aprobar' && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-sm font-medium text-green-700 mb-1">Confirmar y ajustar condiciones de crédito</p>
                          <p className="text-xs text-green-600 mb-4">Campos pre-cargados con la propuesta del analista. Modifícalos si es necesario.</p>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1 font-medium">Monto de crédito (USD) <span className="text-red-500">*</span></label>
                              <input type="number" value={montoDirector} onChange={e => setMontoDirector(e.target.value)} placeholder="Ej. 50000" className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 bg-white" />
                              {Number(cliente.approved_credit_amount) > 0 && Number(montoDirector) !== Number(cliente.approved_credit_amount) && montoDirector !== '' && (
                                <p className="text-xs text-amber-600 mt-1">Propuesta analista: ${Number(cliente.approved_credit_amount).toLocaleString()} USD</p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1 font-medium">Días de crédito <span className="text-red-500">*</span></label>
                              <input type="number" value={diasDirector} onChange={e => setDiasDirector(e.target.value)} placeholder="Ej. 30" className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 bg-white" />
                              {Number(cliente.approved_credit_days) > 0 && Number(diasDirector) !== Number(cliente.approved_credit_days) && diasDirector !== '' && (
                                <p className="text-xs text-amber-600 mt-1">Propuesta analista: {cliente.approved_credit_days} días</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">Se notificará al analista: <strong>juancarlos.ibarra@savinodelbene.com</strong></p>
                          <button onClick={handleAprobar} disabled={procesando || !montoDirector || !diasDirector} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                            {procesando ? 'Procesando...' : 'Confirmar aprobación'}
                          </button>
                        </div>
                      )}

                      {accion === 'rechazar' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-sm font-medium text-red-700 mb-3">Motivo de rechazo</p>
                          <p className="text-xs text-red-600 mb-3">Al rechazar, se notificará al analista de crédito con el motivo.</p>
                          <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} rows={3} placeholder="Describe el motivo del rechazo..." className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none mb-3" />
                          <p className="text-xs text-gray-500 mb-3">Notificación a: <strong>juancarlos.ibarra@savinodelbene.com</strong></p>
                          <button onClick={handleRechazar} disabled={procesando} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">{procesando ? 'Procesando...' : 'Rechazar y notificar al analista'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'historial' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3"><p className="text-xs font-medium text-gray-700">Filtros</p><button onClick={() => { setFiltrosHistorial(filtrosVacios); setPaginaHistorial(1) }} className="text-xs text-gray-400 hover:text-gray-600 underline">Limpiar filtros</button></div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div><label className="text-xs text-gray-500 block mb-1">Razón social o RFC</label><input value={filtrosHistorial.busqueda} onChange={e => { setFiltrosHistorial(prev => ({ ...prev, busqueda: e.target.value })); setPaginaHistorial(1) }} placeholder="Buscar..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Fecha inicio</label><input type="date" value={filtrosHistorial.fechaInicio} onChange={e => { setFiltrosHistorial(prev => ({ ...prev, fechaInicio: e.target.value })); setPaginaHistorial(1) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Fecha fin</label><input type="date" value={filtrosHistorial.fechaFin} onChange={e => { setFiltrosHistorial(prev => ({ ...prev, fechaFin: e.target.value })); setPaginaHistorial(1) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Monto mínimo</label><input type="number" value={filtrosHistorial.montoMin} onChange={e => { setFiltrosHistorial(prev => ({ ...prev, montoMin: e.target.value })); setPaginaHistorial(1) }} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Monto máximo</label><input type="number" value={filtrosHistorial.montoMax} onChange={e => { setFiltrosHistorial(prev => ({ ...prev, montoMax: e.target.value })); setPaginaHistorial(1) }} placeholder="Sin límite" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h2 className="text-sm font-medium">Historial de solicitudes</h2><p className="text-xs text-gray-500 mt-0.5">Solicitudes aprobadas y rechazadas</p></div>
                <div className="flex items-center gap-3"><p className="text-xs text-gray-400">{historialFiltrado.length} de {historial.length} solicitudes</p><button onClick={exportarExcel} className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">Exportar Excel</button></div>
              </div>
              {loadingHistorial ? (<div className="px-6 py-8 text-center text-sm text-gray-400">Cargando historial...</div>) : historialFiltrado.length === 0 ? (<div className="px-6 py-8 text-center text-sm text-gray-400">{historial.length === 0 ? 'No hay solicitudes en el historial.' : 'No hay solicitudes que coincidan.'}</div>) : (
                <>
                  <TablaHistorial historialPagina={historialPagina} historialSelected={historialSelected} setHistorialSelected={setHistorialSelected} onBloquear={(c: any) => { setBloqueoModal(c); setMotivoBloqueo('') }} />
                  <Paginacion pagina={paginaHistorial} total={historialFiltrado.length} porPagina={POR_PAGINA} onChange={p => { setPaginaHistorial(p); setHistorialSelected(null) }} />
                </>
              )}
            </div>

            {clienteHistorial && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div><h2 className="text-sm font-medium">Expediente: {clienteHistorial.denominacion}</h2><p className="text-xs text-gray-500 mt-0.5">RFC: {clienteHistorial.rfc?.trim()} · Email: <strong>{clienteHistorial.email_contacto}</strong></p></div>
                  <button onClick={() => setHistorialSelected(null)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Cerrar</button>
                </div>
                {clienteHistorial.bloqueado && clienteHistorial.motivo_bloqueo && (<div className="px-6 py-3 bg-red-50 border-b border-red-100"><p className="text-xs text-red-600"><span className="font-medium">Motivo de bloqueo:</span> {clienteHistorial.motivo_bloqueo}</p></div>)}
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[{ label: 'Razón Social', value: clienteHistorial.denominacion }, { label: 'RFC', value: clienteHistorial.rfc?.trim() }, { label: 'Email', value: clienteHistorial.email_contacto }, { label: 'Monto aprobado', value: '$' + Number(clienteHistorial.approved_credit_amount || 0).toLocaleString() + ' USD' }, { label: 'Días de crédito', value: (clienteHistorial.approved_credit_days || 0) + ' días' }, { label: 'Fecha aprobación', value: clienteHistorial.reviewed_at ? new Date(clienteHistorial.reviewed_at).toLocaleDateString('es-MX') : '—' }].map(f => (<div key={f.label} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {bloqueoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="text-sm font-medium">{bloqueoModal.bloqueado ? 'Desbloquear cliente' : 'Bloquear cliente'}</h3><p className="text-xs text-gray-500 mt-0.5">{bloqueoModal.denominacion}</p></div>
            <div className="p-6">
              {bloqueoModal.bloqueado ? (<div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4"><p className="text-sm text-green-700">¿Confirmas desbloquear a este cliente?</p>{bloqueoModal.motivo_bloqueo && <p className="text-xs text-gray-500 mt-2">Motivo actual: {bloqueoModal.motivo_bloqueo}</p>}</div>) : (<div className="mb-4"><label className="text-xs text-gray-500 block mb-1">Motivo de bloqueo <span className="text-red-500">*</span></label><textarea value={motivoBloqueo} onChange={e => setMotivoBloqueo(e.target.value)} rows={3} placeholder="Describe el motivo del bloqueo..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none" /></div>)}
              <div className="flex gap-3">
                <button onClick={handleBloqueo} disabled={guardandoBloqueo} className={'flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ' + (bloqueoModal.bloqueado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700')}>{guardandoBloqueo ? 'Guardando...' : bloqueoModal.bloqueado ? 'Confirmar desbloqueo' : 'Confirmar bloqueo'}</button>
                <button onClick={() => { setBloqueoModal(null); setMotivoBloqueo('') }} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pdfVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-4/5 h-4/5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium">Vista previa del documento</h3>
              <div className="flex items-center gap-2"><a href={pdfVisible} target="_blank" rel="noreferrer" className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50">Abrir en nueva pestaña</a><button onClick={() => setPdfVisible(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button></div>
            </div>
            <iframe src={pdfVisible} className="flex-1 w-full" title="Vista previa PDF" />
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
