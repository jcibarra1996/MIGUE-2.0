'use client'

import { useState, useEffect } from 'react'
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

function generarResumenPDF(cliente: any) {
  const docsRows = documentos.map(d => {
    const tiene = cliente.docs_urls?.[d.id]
    return `<div class="row"><span class="label">${d.label}</span><span class="badge ${tiene ? 'recibido' : 'pendiente'}">${tiene ? 'Recibido' : 'Pendiente'}</span></div>`
  }).join('')

  const facRows = cliente.facturacion ? [
    ['Método de pago', cliente.facturacion.metodo_pago],
    ['Forma de pago', cliente.facturacion.forma_pago],
    ['Uso de CFDI', cliente.facturacion.uso_cfdi],
    ['Régimen Fiscal', cliente.facturacion.regimen_fiscal],
    ['Moneda', cliente.facturacion.moneda],
    ['Email facturas', cliente.facturacion.email_facturas],
    ['Contacto CxP', cliente.facturacion.contacto_cxp],
    ['Teléfono CxP', cliente.facturacion.telefono_cxp],
    ['Email CxP', cliente.facturacion.email_cxp],
    ['Razón social facturación', cliente.facturacion.razon_social_factura],
    ['Representante Legal', cliente.facturacion.representante_legal],
  ].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v || '—'}</span></div>`).join('')
    : '<p class="empty">Sin información de facturación.</p>'

  const vendRows = cliente.vendor_info ? [
    ['Vendedor', cliente.vendor_info.nombre_vendedor],
    ['Giro del cliente', cliente.vendor_info.giro_cliente],
    ['Embarques por mes', cliente.vendor_info.embarques_mes],
    ['Tipo de operación', cliente.vendor_info.tipo_operacion?.join(', ')],
    ['Puertos principales', cliente.vendor_info.puertos_principales],
    ['País de origen', cliente.vendor_info.origen_pais],
    ['Puerto de destino', cliente.vendor_info.destino_puerto],
    ['Modalidad', cliente.vendor_info.modalidad?.join(', ')],
    ['Tipo de carga', cliente.vendor_info.tipo_carga?.join(', ')],
    ['Profit estimado', (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString()],
    ['Manejo de carga', cliente.vendor_info.manejo_carga],
    ['Comentarios', cliente.vendor_info.comentarios],
  ].filter(([, v]) => v).map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')
    : '<p class="empty">Sin información del vendedor.</p>'

  const estadoBloqueo = cliente.bloqueado
    ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#DC2626;font-weight:bold;">Cliente BLOQUEADO</p>
        <p style="margin:4px 0 0;font-size:12px;color:#374151;">Motivo: ${cliente.motivo_bloqueo || '—'}</p>
       </div>`
    : `<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#15803D;font-weight:bold;">Cliente ACTIVO</p>
       </div>`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expediente ${cliente.denominacion}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; padding: 40px; }
    .header { background: #1E3A5F; color: white; padding: 20px 40px; margin: -40px -40px 28px -40px; }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header p { font-size: 11px; color: #CBD5E1; }
    h2 { font-size: 12px; font-weight: bold; color: #1E40AF; text-transform: uppercase; margin: 24px 0 6px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .row { display: flex; padding: 5px 0; border-bottom: 1px solid #F9FAFB; gap: 12px; }
    .label { color: #6B7280; width: 200px; flex-shrink: 0; font-weight: bold; font-size: 11px; }
    .value { color: #111827; font-size: 11px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .recibido { background: #DCFCE7; color: #15803D; }
    .pendiente { background: #FEE2E2; color: #DC2626; }
    .empty { color: #9CA3AF; font-size: 11px; padding: 8px 0; }
    .footer { margin-top: 40px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 8px; text-align: center; }
    .tip { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:10px 16px; margin-bottom:20px; font-size:11px; color:#1E40AF; }
    @media print { .tip { display: none; } body { padding: 20px; } .header { margin: -20px -20px 20px -20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Savino del Bene México</h1>
    <p>Portal de Crédito — Expediente de Cliente · Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
  <div class="tip">Para guardar como PDF: presiona <strong>Ctrl+P</strong> y selecciona <strong>"Guardar como PDF"</strong>.</div>

  <h2>Estado del cliente</h2>
  ${estadoBloqueo}

  <h2>Datos Generales</h2>
  <div class="row"><span class="label">Razón Social</span><span class="value">${cliente.denominacion || '—'}</span></div>
  <div class="row"><span class="label">RFC</span><span class="value">${cliente.rfc?.trim() || '—'}</span></div>
  <div class="row"><span class="label">Email de Contacto</span><span class="value">${cliente.email_contacto || '—'}</span></div>
  <div class="row"><span class="label">Folio Vendedor</span><span class="value">${cliente.vendor_folio || '—'}</span></div>
  <div class="row"><span class="label">Monto Autorizado</span><span class="value">$${Number(cliente.approved_credit_amount || 0).toLocaleString('es-MX')} MXN</span></div>
  <div class="row"><span class="label">Días de Crédito Autorizados</span><span class="value">${cliente.approved_credit_days || '—'} días</span></div>
  <div class="row"><span class="label">Fecha de Aprobación</span><span class="value">${cliente.reviewed_at ? new Date(cliente.reviewed_at).toLocaleDateString('es-MX') : '—'}</span></div>

  <h2>Documentos del Cliente</h2>
  ${docsRows}

  <h2>Información de Facturación</h2>
  ${facRows}

  <h2>Información del Vendedor</h2>
  ${vendRows}

  <div class="footer">Savino del Bene México — Documento confidencial de uso interno · Cobranza</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CobranzaPage() {
  const [vista, setVista] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [seccion, setSeccion] = useState('documentos')
  const [pdfVisible, setPdfVisible] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [toast, setToast] = useState('')
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)
  const [motivoBloqueo, setMotivoBloqueo] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const cliente = clientes.find(c => c.id === selected)
  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchBusqueda = !busqueda || c.denominacion?.toLowerCase().includes(q) || c.rfc?.toLowerCase().includes(q)
    const matchFiltro = filtro === 'todos' || (filtro === 'bloqueados' && c.bloqueado) || (filtro === 'activos' && !c.bloqueado)
    return matchBusqueda && matchFiltro
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setLoginError('Ingresa tu correo y contraseña.'); return }
    setCargando(true)
    setLoginError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setLoginError('Credenciales incorrectas. Verifica e intenta de nuevo.'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoginError('Error al obtener usuario.'); return }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile) { setLoginError('No tienes acceso a este portal.'); return }

      if (profile.role !== 'cobranza_responsable' && profile.role !== 'cobranza_ejecutivo') {
        setLoginError('No tienes permisos para acceder a este portal.')
        await supabase.auth.signOut()
        return
      }

      setPerfil(profile)
      setVista('dashboard')
      cargarClientes()
    } catch (err) {
      setLoginError('Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function cargarClientes() {
    setLoadingClientes(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
      if (data) setClientes(data)
    } catch (err) { console.error(err) } finally { setLoadingClientes(false) }
  }

  async function handleToggleBloqueo() {
    if (!cliente) return
    if (cliente.bloqueado === false && !motivoBloqueo.trim()) {
      showToast('Debes ingresar el motivo de bloqueo.')
      return
    }
    setGuardandoBloqueo(true)
    try {
      const supabase = createClient()
      const nuevoEstado = !cliente.bloqueado
      const { error } = await supabase.from('applications').update({
        bloqueado: nuevoEstado,
        motivo_bloqueo: nuevoEstado ? motivoBloqueo : '',
      }).eq('id', cliente.id)
      if (error) throw error
      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, bloqueado: nuevoEstado, motivo_bloqueo: nuevoEstado ? motivoBloqueo : '' } : c))
      setMotivoBloqueo('')
      showToast(nuevoEstado ? 'Cliente bloqueado.' : 'Cliente desbloqueado.')
    } catch { showToast('Error al actualizar estado.') } finally { setGuardandoBloqueo(false) }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setVista('login')
    setPerfil(null)
    setClientes([])
    setSelected(null)
  }

  if (vista === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex flex-col items-center">
            <img src={LOGO} alt="Savino del Bene" className="h-12 object-contain mb-3" />
            <p className="text-sm font-medium text-gray-900">Portal de Cobranza</p>
            <p className="text-xs text-gray-500 mt-1">Savino del Bene México</p>
          </div>
          <div className="p-6 grid gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@savinodelbene.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}
            <button onClick={handleLogin} disabled={cargando} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {cargando ? 'Entrando...' : 'Iniciar sesión'}
            </button>
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
            <div>
              <p className="text-sm font-medium text-gray-900">Portal de Cobranza</p>
              <p className="text-xs text-gray-500">{perfil?.full_name} · {perfil?.role === 'cobranza_responsable' ? 'Responsable' : 'Ejecutivo'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Cerrar sesión</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Clientes con crédito aprobado</h2>
              <p className="text-xs text-gray-500 mt-0.5">{clientesFiltrados.length} de {clientes.length} clientes</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {['todos', 'activos', 'bloqueados'].map(f => (
                  <button key={f} onClick={() => setFiltro(f)} className={'px-3 py-1 rounded-md text-xs font-medium transition-all ' + (filtro === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Bloqueados'}
                  </button>
                ))}
              </div>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por razón social o RFC..." className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none w-64" />
            </div>
          </div>

          {loadingClientes ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No hay clientes que coincidan.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">RFC</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Monto autorizado</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Días</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Estado</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Expediente</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(c => (
                  <tr key={c.id} className={'border-t border-gray-100 ' + (selected === c.id ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                    <td className="px-6 py-3 font-medium">{c.denominacion || 'Sin nombre'}</td>
                    <td className="px-6 py-3 text-gray-500">{c.rfc?.trim() || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">${Number(c.approved_credit_amount || 0).toLocaleString()} MXN</td>
                    <td className="px-6 py-3 text-gray-500">{c.approved_credit_days || 0} días</td>
                    <td className="px-6 py-3">
                      <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (c.bloqueado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                        {c.bloqueado ? 'Bloqueado' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => { setSelected(selected === c.id ? null : c.id); setSeccion('documentos'); setMotivoBloqueo('') }} className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (selected === c.id ? 'bg-gray-900 text-white' : 'border border-gray-200 hover:bg-gray-50')}>
                        {selected === c.id ? 'Cerrar' : 'Ver expediente'}
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
              <div>
                <h2 className="text-sm font-medium">Expediente: {cliente.denominacion}</h2>
                <p className="text-xs text-gray-500 mt-0.5">RFC: {cliente.rfc?.trim()} · Email: <strong>{cliente.email_contacto}</strong></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => generarResumenPDF(cliente)} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">
                  Descargar PDF
                </button>
                <button onClick={() => setSelected(null)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Cerrar</button>
              </div>
            </div>

            <div className="flex gap-1 p-4 border-b border-gray-100 bg-gray-50 overflow-x-auto">
              {['documentos', 'facturacion', 'vendedor', ...(perfil?.role === 'cobranza_responsable' ? ['bloqueo'] : [])].map(s => (
                <button key={s} onClick={() => setSeccion(s)} className={'px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ' + (seccion === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700')}>
                  {s === 'documentos' ? 'Documentos' : s === 'facturacion' ? 'Facturación' : s === 'vendedor' ? 'Info Vendedor' : 'Bloqueo'}
                  {s === 'bloqueo' && cliente.bloqueado && <span className="ml-1 text-red-500">●</span>}
                </button>
              ))}
            </div>

            <div className="p-6">
              {seccion === 'documentos' && (
                <div className="grid gap-2">
                  {documentos.map(doc => {
                    const url = cliente.docs_urls?.[doc.id]
                    return (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                        <span>{doc.label}</span>
                        <div className="flex items-center gap-2">
                          {url && <button onClick={() => setPdfVisible(url)} className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1 hover:bg-gray-100">Ver PDF</button>}
                          {url && <a href={url} target="_blank" rel="noreferrer" download className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1 hover:bg-gray-100">Descargar</a>}
                          <span className={'text-xs px-2 py-1 rounded-full ' + (url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>{url ? 'Recibido' : 'Pendiente'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {seccion === 'facturacion' && (
                <div>
                  {cliente.facturacion ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Método de pago', value: cliente.facturacion.metodo_pago },
                        { label: 'Forma de pago', value: cliente.facturacion.forma_pago },
                        { label: 'Uso de CFDI', value: cliente.facturacion.uso_cfdi },
                        { label: 'Régimen Fiscal', value: cliente.facturacion.regimen_fiscal },
                        { label: 'Moneda de facturación', value: cliente.facturacion.moneda },
                        { label: 'Email facturas', value: cliente.facturacion.email_facturas },
                        { label: 'Contacto CxP', value: cliente.facturacion.contacto_cxp },
                        { label: 'Teléfono CxP', value: cliente.facturacion.telefono_cxp },
                        { label: 'Email CxP', value: cliente.facturacion.email_cxp },
                        { label: 'Razón social facturación', value: cliente.facturacion.razon_social_factura },
                        { label: 'Representante Legal', value: cliente.facturacion.representante_legal },
                      ].map(f => (
                        <div key={f.label} className={'bg-gray-50 rounded-lg p-3 ' + (f.label === 'Representante Legal' ? 'col-span-2' : '')}>
                          <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                          <p className="text-sm font-medium">{f.value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-400">Sin información de facturación.</div>
                  )}
                </div>
              )}

              {seccion === 'vendedor' && (
                <div>
                  {cliente.vendor_info ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Vendedor', value: cliente.vendor_info.nombre_vendedor },
                        { label: 'Giro del cliente', value: cliente.vendor_info.giro_cliente },
                        { label: 'Embarques por mes', value: cliente.vendor_info.embarques_mes },
                        { label: 'Tipo de operación', value: cliente.vendor_info.tipo_operacion?.join(', ') },
                        { label: 'Puertos principales', value: cliente.vendor_info.puertos_principales },
                        { label: 'País de origen', value: cliente.vendor_info.origen_pais },
                        { label: 'Puerto de destino', value: cliente.vendor_info.destino_puerto },
                        { label: 'Modalidad', value: cliente.vendor_info.modalidad?.join(', ') },
                        { label: 'Tipo de carga', value: cliente.vendor_info.tipo_carga?.join(', ') },
                        { label: 'Profit estimado', value: (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString() },
                      ].map(f => (
                        <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                          <p className="text-sm font-medium">{f.value || '—'}</p>
                        </div>
                      ))}
                      {cliente.vendor_info.manejo_carga && (
                        <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Manejo de carga</p>
                          <p className="text-sm">{cliente.vendor_info.manejo_carga}</p>
                        </div>
                      )}
                      {cliente.vendor_info.comentarios && (
                        <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Comentarios</p>
                          <p className="text-sm">{cliente.vendor_info.comentarios}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-400">Sin información del vendedor.</div>
                  )}
                </div>
              )}

              {seccion === 'bloqueo' && perfil?.role === 'cobranza_responsable' && (
                <div>
                  <div className={'rounded-xl p-4 mb-6 ' + (cliente.bloqueado ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200')}>
                    <p className={'text-sm font-medium ' + (cliente.bloqueado ? 'text-red-700' : 'text-green-700')}>
                      Estado actual: {cliente.bloqueado ? 'BLOQUEADO' : 'ACTIVO'}
                    </p>
                    {cliente.bloqueado && cliente.motivo_bloqueo && (
                      <p className="text-xs text-red-600 mt-1">Motivo: {cliente.motivo_bloqueo}</p>
                    )}
                  </div>

                  {!cliente.bloqueado && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 block mb-1">Motivo de bloqueo <span className="text-red-500">*</span></label>
                      <textarea
                        value={motivoBloqueo}
                        onChange={e => setMotivoBloqueo(e.target.value)}
                        rows={3}
                        placeholder="Describe el motivo por el que se bloquea al cliente..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleToggleBloqueo}
                    disabled={guardandoBloqueo}
                    className={'w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 ' + (cliente.bloqueado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700')}
                  >
                    {guardandoBloqueo ? 'Guardando...' : cliente.bloqueado ? 'Desbloquear cliente' : 'Bloquear cliente'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {pdfVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-4/5 h-4/5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium">Vista previa del documento</h3>
              <div className="flex items-center gap-2">
                <a href={pdfVisible} target="_blank" rel="noreferrer" className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50">Abrir en nueva pestaña</a>
                <button onClick={() => setPdfVisible(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
            </div>
            <iframe src={pdfVisible} className="flex-1 w-full" title="Vista previa PDF" />
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
