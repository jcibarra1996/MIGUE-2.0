'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

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

const LOGO = 'https://i.imgur.com/JJTbpFw.png'
const filtrosVacios = { busqueda: '', fechaInicio: '', fechaFin: '', montoMin: '', montoMax: '' }
const POR_PAGINA = 10
// 30 minutos en ms — se usa para renovar la sesión antes de que expire
const SESSION_REFRESH_INTERVAL = 25 * 60 * 1000

type DocStatus = 'ok' | 'rechazado' | 'excepcion' | null

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

function FiltrosPanel({ filtros, onChange, onLimpiar }: { filtros: any; onChange: (key: string, value: string) => void; onLimpiar: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-700">Filtros</p>
        <button onClick={onLimpiar} className="text-xs text-gray-400 hover:text-gray-600 underline">Limpiar filtros</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div><label className="text-xs text-gray-500 block mb-1">Razón social o RFC</label><input value={filtros.busqueda} onChange={e => onChange('busqueda', e.target.value)} placeholder="Buscar..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">Fecha inicio</label><input type="date" value={filtros.fechaInicio} onChange={e => onChange('fechaInicio', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">Fecha fin</label><input type="date" value={filtros.fechaFin} onChange={e => onChange('fechaFin', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">Monto mínimo</label><input type="number" value={filtros.montoMin} onChange={e => onChange('montoMin', e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
        <div><label className="text-xs text-gray-500 block mb-1">Monto máximo</label><input type="number" value={filtros.montoMax} onChange={e => onChange('montoMax', e.target.value)} placeholder="Sin límite" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" /></div>
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
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen ${cliente.denominacion}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:40px}.header{background:#1E3A5F;color:white;padding:20px 40px;margin:-40px -40px 28px -40px}.header h1{font-size:18px;margin-bottom:4px}.header p{font-size:11px;color:#CBD5E1}h2{font-size:12px;font-weight:bold;color:#1E40AF;text-transform:uppercase;margin:24px 0 6px;border-bottom:1px solid #E5E7EB;padding-bottom:4px;letter-spacing:.05em}.row{display:flex;padding:5px 0;border-bottom:1px solid #F9FAFB;gap:12px}.label{color:#6B7280;width:200px;flex-shrink:0;font-weight:bold;font-size:11px}.value{color:#111827;font-size:11px}.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:bold}.recibido{background:#DCFCE7;color:#15803D}.pendiente{background:#FEE2E2;color:#DC2626}.empty{color:#9CA3AF;font-size:11px;padding:8px 0}.footer{margin-top:40px;font-size:10px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px;text-align:center}.tip{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:11px;color:#1E40AF}@media print{.tip{display:none}body{padding:20px}.header{margin:-20px -20px 20px -20px}}</style></head><body><div class="header"><h1>Savino del Bene México</h1><p>Portal de Crédito — Resumen de Expediente · Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p></div><div class="tip">Para guardar como PDF: presiona <strong>Ctrl+P</strong> y selecciona <strong>"Guardar como PDF"</strong>.</div><h2>Datos Generales</h2><div class="row"><span class="label">Razón Social</span><span class="value">${cliente.denominacion || '—'}</span></div><div class="row"><span class="label">RFC</span><span class="value">${cliente.rfc?.trim() || '—'}</span></div><div class="row"><span class="label">Email de Contacto</span><span class="value">${cliente.email_contacto || '—'}</span></div><div class="row"><span class="label">Folio Vendedor</span><span class="value">${cliente.vendor_folio || '—'}</span></div><div class="row"><span class="label">Monto Solicitado</span><span class="value">$${Number(cliente.credit_amount || 0).toLocaleString('es-MX')} USD</span></div><div class="row"><span class="label">Días de Crédito Solicitados</span><span class="value">${cliente.credit_days || '—'} días</span></div><div class="row"><span class="label">Fecha de Solicitud</span><span class="value">${cliente.submitted_at ? new Date(cliente.submitted_at).toLocaleDateString('es-MX') : '—'}</span></div><h2>Documentos del Cliente</h2>${docsRows}<h2>Información de Facturación</h2>${facRows}<h2>Información del Vendedor</h2>${vendRows}<div class="footer">Savino del Bene México — Documento confidencial de uso interno</div></body></html>`
  const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ExpedienteDetalle({ cliente, onClose }: { cliente: any; onClose: () => void }) {
  const [seccion, setSeccion] = useState('documentos')
  const [pdfVisible, setPdfVisible] = useState<string | null>(null)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Expediente: {cliente.denominacion}</h2>
          <p className="text-xs text-gray-500 mt-0.5">RFC: {cliente.rfc?.trim()} · Email: <strong>{cliente.email_contacto}</strong> · Folio: <span className="font-mono bg-gray-100 px-1 rounded">{cliente.vendor_folio || '—'}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {cliente.bloqueado && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Bloqueado por cobranza</span>}
          <button onClick={onClose} className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Cerrar</button>
        </div>
      </div>
      {cliente.bloqueado && cliente.motivo_bloqueo && (<div className="px-6 py-3 bg-red-50 border-b border-red-100"><p className="text-xs text-red-600"><span className="font-medium">Motivo de bloqueo:</span> {cliente.motivo_bloqueo}</p></div>)}
      <div className="flex gap-1 p-4 border-b border-gray-100 bg-gray-50 overflow-x-auto">
        {['documentos', 'facturacion', 'vendedor'].map(s => (
          <button key={s} onClick={() => setSeccion(s)} className={'px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ' + (seccion === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700')}>
            {s === 'documentos' ? 'Documentos' : s === 'facturacion' ? 'Facturación' : 'Info Vendedor'}
            {s === 'vendedor' && cliente.vendor_info && <span className="ml-1 text-green-500">●</span>}
            {s === 'vendedor' && !cliente.vendor_info && <span className="ml-1 text-yellow-500">●</span>}
          </button>
        ))}
      </div>
      <div className="p-6">
        {seccion === 'documentos' && (
          <div className="grid gap-2">
            {documentos.map(doc => { const url = cliente.docs_urls?.[doc.id]; return (<div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm"><span>{doc.label}</span><div className="flex items-center gap-2">{url && <button onClick={() => setPdfVisible(url)} className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1 hover:bg-gray-100">Ver PDF</button>}<span className={'text-xs px-2 py-1 rounded-full ' + (url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>{url ? 'Recibido' : 'Pendiente'}</span></div></div>) })}
          </div>
        )}
        {seccion === 'facturacion' && (
          <div className="grid grid-cols-2 gap-4">
            {cliente.facturacion ? [{ label: 'Método de pago', value: cliente.facturacion.metodo_pago }, { label: 'Forma de pago', value: cliente.facturacion.forma_pago }, { label: 'Uso de CFDI', value: cliente.facturacion.uso_cfdi }, { label: 'Régimen Fiscal', value: cliente.facturacion.regimen_fiscal }, { label: 'Moneda de facturación', value: cliente.facturacion.moneda }, { label: 'Email facturas', value: cliente.facturacion.email_facturas }, { label: 'Contacto CxP', value: cliente.facturacion.contacto_cxp }, { label: 'Teléfono CxP', value: cliente.facturacion.telefono_cxp }, { label: 'Email CxP', value: cliente.facturacion.email_cxp }, { label: 'Razón social facturación', value: cliente.facturacion.razon_social_factura }, { label: 'Representante Legal', value: cliente.facturacion.representante_legal }].map(f => (<div key={f.label} className={'bg-gray-50 rounded-lg p-3 ' + (f.label === 'Representante Legal' ? 'col-span-2' : '')}><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>)) : <div className="col-span-2 text-center py-8 text-sm text-gray-400">Sin información de facturación.</div>}
          </div>
        )}
        {seccion === 'vendedor' && (
          <div>
            {cliente.vendor_info ? (
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Vendedor', value: cliente.vendor_info.nombre_vendedor }, { label: 'Giro del cliente', value: cliente.vendor_info.giro_cliente }, { label: 'Embarques por mes', value: cliente.vendor_info.embarques_mes }, { label: 'Tipo de operación', value: cliente.vendor_info.tipo_operacion?.join(', ') }, { label: 'Puertos principales', value: cliente.vendor_info.puertos_principales }, { label: 'País de origen', value: cliente.vendor_info.origen_pais }, { label: 'Puerto de destino', value: cliente.vendor_info.destino_puerto }, { label: 'Modalidad', value: cliente.vendor_info.modalidad?.join(', ') }, { label: 'Tipo de carga', value: cliente.vendor_info.tipo_carga?.join(', ') }, { label: 'Profit estimado', value: (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString() }].map(f => (<div key={f.label} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}
                {cliente.vendor_info.manejo_carga && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Manejo de carga</p><p className="text-sm">{cliente.vendor_info.manejo_carga}</p></div>)}
                {cliente.vendor_info.comentarios && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Comentarios</p><p className="text-sm">{cliente.vendor_info.comentarios}</p></div>)}
              </div>
            ) : (<div className="text-center py-8"><p className="text-sm text-gray-500 mb-2">El vendedor aún no ha llenado el pronóstico.</p><p className="text-xs text-gray-400">Folio: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cliente.vendor_folio}</span></p></div>)}
          </div>
        )}
      </div>
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
    </div>
  )
}

function TablaHistorial({ historialPagina, historialSelected, setHistorialSelected, statusColor, statusLabel }: any) {
  const tableRef = useRef<HTMLDivElement>(null)
  function scrollLeft() { tableRef.current?.scrollBy({ left: -300, behavior: 'smooth' }) }
  function scrollRight() { tableRef.current?.scrollBy({ left: 300, behavior: 'smooth' }) }
  return (
    <div className="relative">
      <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-gray-50 text-gray-600">‹</button>
      <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-gray-50 text-gray-600">›</button>
      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Cliente</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">RFC</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Folio</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Crédito aprobado</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Estado</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Bloqueo</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Motivo rechazo</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Fecha resolución</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Contrato firmado</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">Expediente</th>
            </tr>
          </thead>
          <tbody>
            {historialPagina.map((c: any) => (
              <tr key={c.id} className={'border-t border-gray-100 ' + (historialSelected === c.id ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                <td className="px-6 py-3 font-medium whitespace-nowrap">{c.denominacion || 'Sin nombre'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{c.rfc?.trim() || '—'}</td>
                <td className="px-6 py-3 whitespace-nowrap"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{c.vendor_folio || '—'}</span></td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">${Number(c.approved_credit_amount || 0).toLocaleString()} · {c.approved_credit_days || 0} días</td>
                <td className="px-6 py-3 whitespace-nowrap"><span className={'text-xs px-2 py-1 rounded-full ' + (statusColor[c.status] || 'bg-gray-100 text-gray-600')}>{statusLabel[c.status] || c.status}</span></td>
                <td className="px-6 py-3 whitespace-nowrap">{c.bloqueado ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Bloqueado</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Activo</span>}</td>
                <td className="px-6 py-3 text-gray-500" style={{ maxWidth: '200px' }}>{c.status === 'rejected' && c.rejection_reason ? <span className="text-xs text-red-600">{c.rejection_reason}</span> : '—'}</td>
                <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString('es-MX') : '—'}</td>
                <td className="px-6 py-3 whitespace-nowrap">{c.signed_contract_url ? <a href={c.signed_contract_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">Ver contrato</a> : <span className="text-xs text-gray-400">Pendiente</span>}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <button onClick={() => setHistorialSelected(historialSelected === c.id ? null : c.id)} className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (historialSelected === c.id ? 'bg-gray-900 text-white' : 'border border-gray-200 hover:bg-gray-50')}>
                    {historialSelected === c.id ? 'Cerrar' : 'Ver expediente'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [vista, setVista] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginCargando, setLoginCargando] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [tab, setTab] = useState('pendientes')
  const [pendientes, setPendientes] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [enEsperaDirector, setEnEsperaDirector] = useState<any[]>([])
  const [aprobadosDirector, setAprobadosDirector] = useState<any[]>([])
  const [rechazadosDirector, setRechazadosDirector] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [historialSelected, setHistorialSelected] = useState<string | null>(null)
  const [selectedAprobado, setSelectedAprobado] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const [monto, setMonto] = useState('')
  const [dias, setDias] = useState('')
  const [motivo, setMotivo] = useState('')
  const [docsRechazo, setDocsRechazo] = useState<string[]>([])
  const [docsStatus, setDocsStatus] = useState<Record<string, DocStatus>>({})
  const [docComentarios, setDocComentarios] = useState<Record<string, string>>({})
  const [guardandoDocs, setGuardandoDocs] = useState(false)
  const [toast, setToast] = useState('')
  const [pdfVisible, setPdfVisible] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [contratoFinal, setContratoFinal] = useState<string | null>(null)
  const [subiendoContratoFinal, setSubiendoContratoFinal] = useState(false)
  const [enviandoCliente, setEnviandoCliente] = useState(false)
  const [seccion, setSeccion] = useState('documentos')
  const [filtrosPendientes, setFiltrosPendientes] = useState(filtrosVacios)
  const [filtrosHistorial, setFiltrosHistorial] = useState(filtrosVacios)
  const [enviandoADirector, setEnviandoADirector] = useState(false)
  const [notificandoRechazo, setNotificandoRechazo] = useState<string | null>(null)
  const [regresandoAPendientes, setRegresandoAPendientes] = useState<string | null>(null)
  const [paginaHistorial, setPaginaHistorial] = useState(1)
  const [confirmBorrar, setConfirmBorrar] = useState<string | null>(null) // id de solicitud a borrar

  // FIX 1: Ref para el intervalo de refresh de sesión
  const sessionRefreshRef = useRef<NodeJS.Timeout | null>(null)

  const cliente = pendientes.find(c => c.id === selected)
  const clienteHistorial = historial.find(c => c.id === historialSelected)
  const pendientesFiltrados = aplicarFiltros(pendientes, filtrosPendientes)
  const historialFiltrado = aplicarFiltros(historial, filtrosHistorial)
  const historialPagina = historialFiltrado.slice((paginaHistorial - 1) * POR_PAGINA, paginaHistorial * POR_PAGINA)
  const statusLabel: Record<string, string> = { under_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', draft: 'Borrador' }
  const statusColor: Record<string, string> = { under_review: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', draft: 'bg-gray-100 text-gray-600' }

  // FIX 1: Iniciar/detener refresh automático de sesión
  function iniciarRefreshSesion() {
    if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current)
    sessionRefreshRef.current = setInterval(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        // Si el refresh falla, la sesión expiró de verdad — redirigir a login
        clearInterval(sessionRefreshRef.current!)
        setVista('login')
        setPerfil(null)
      }
    }, SESSION_REFRESH_INTERVAL)
  }

  function detenerRefreshSesion() {
    if (sessionRefreshRef.current) {
      clearInterval(sessionRefreshRef.current)
      sessionRefreshRef.current = null
    }
  }

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => detenerRefreshSesion()
  }, [])

  // FIX REFRESH: Al montar, verificar si ya hay sesión activa y restaurar dashboard
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // no hay sesión, quedarse en login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || !['credit_manager', 'admin'].includes(profile.role)) return
      setPerfil(profile)
      setVista('dashboard')
      iniciarRefreshSesion()
    }
    checkSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (vista === 'dashboard') cargarPendientes() }, [vista])
  useEffect(() => { if (tab === 'historial' && historial.length === 0) cargarHistorial() }, [tab])
  useEffect(() => { if (tab === 'director') { cargarEnEsperaDirector(); cargarAprobadosPorDirector(); cargarRechazadosPorDirector() } }, [tab])
  useEffect(() => { setPaginaHistorial(1) }, [filtrosHistorial])

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) { setLoginError('Ingresa tu correo y contraseña.'); return }
    setLoginCargando(true); setLoginError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) { setLoginError('Credenciales incorrectas. Verifica e intenta de nuevo.'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoginError('Error al obtener usuario.'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || !['credit_manager', 'admin'].includes(profile.role)) { setLoginError('No tienes permisos para acceder a este panel.'); await supabase.auth.signOut(); return }
      setPerfil(profile)
      setVista('dashboard')
      iniciarRefreshSesion() // FIX 1: arrancar el refresh
    } catch { setLoginError('Error al iniciar sesión. Intenta de nuevo.') } finally { setLoginCargando(false) }
  }

  async function handleLogout() {
    detenerRefreshSesion() // FIX 1: detener el refresh
    const supabase = createClient()
    await supabase.auth.signOut()
    setVista('login'); setPerfil(null); setPendientes([]); setHistorial([]); setSelected(null)
  }

  async function cargarPendientes() {
    try { const supabase = createClient(); const { data } = await supabase.from('applications').select('*').eq('status', 'under_review').order('created_at', { ascending: false }); if (data) setPendientes(data) } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true)
    try { const supabase = createClient(); const { data } = await supabase.from('applications').select('*').in('status', ['approved', 'rejected']).order('reviewed_at', { ascending: false }); if (data) setHistorial(data) } catch (err) { console.error(err) } finally { setLoadingHistorial(false) }
  }

  async function cargarEnEsperaDirector() {
    try { const supabase = createClient(); const { data } = await supabase.from('applications').select('*').eq('director_status', 'pending').eq('status', 'under_review').order('created_at', { ascending: false }); if (data) setEnEsperaDirector(data) } catch (err) { console.error(err) }
  }

  async function cargarAprobadosPorDirector() {
    try { const supabase = createClient(); const { data } = await supabase.from('applications').select('*').eq('director_status', 'approved').eq('status', 'under_review').order('director_reviewed_at', { ascending: false }); if (data) setAprobadosDirector(data) } catch (err) { console.error(err) }
  }

  async function cargarRechazadosPorDirector() {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('applications').select('*').eq('director_status', 'rejected').eq('analista_notifico_rechazo', false).order('director_reviewed_at', { ascending: false })
      if (data) setRechazadosDirector(data)
    } catch (err) { console.error(err) }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000) }
  function toggleDoc(doc: string) { setDocsRechazo(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]) }

  function setDocStatus(docId: string, status: DocStatus) {
    setDocsStatus(prev => ({ ...prev, [docId]: prev[docId] === status ? null : status }))
  }

  // FIX 3: Guardar decisión de docs en Supabase
  const guardarDecisionDocs = useCallback(async (applicationId: string, status: Record<string, DocStatus>, comentarios: Record<string, string>) => {
    setGuardandoDocs(true)
    try {
      const supabase = createClient()
      await supabase.from('applications').update({
        docs_review: { status, comentarios }
      }).eq('id', applicationId)
    } catch (err) {
      console.error('Error al guardar revisión de docs:', err)
    } finally {
      setGuardandoDocs(false)
    }
  }, [])

  // FIX 3: Wrapper que actualiza estado local y persiste
  function handleSetDocStatus(docId: string, status: DocStatus) {
    const newStatus = { ...docsStatus, [docId]: docsStatus[docId] === status ? null : status }
    setDocsStatus(newStatus)
    if (selected) guardarDecisionDocs(selected, newStatus, docComentarios)
  }

  function handleSetDocComentario(docId: string, texto: string) {
    const newComentarios = { ...docComentarios, [docId]: texto }
    setDocComentarios(newComentarios)
    // Guardar con debounce implícito — se guarda al perder focus (onBlur) para no spamear
  }

  function handleGuardarComentarioBlur(docId: string) {
    if (selected) guardarDecisionDocs(selected, docsStatus, { ...docComentarios, [docId]: docComentarios[docId] || '' })
  }

  // FIX 3: Al abrir un expediente, cargar la revisión de docs guardada previamente
  function abrirExpediente(id: string) {
    const app = pendientes.find(c => c.id === id)
    setSelected(id)
    setAction(null)
    setDocsRechazo([])
    setSeccion('documentos')
    // Restaurar revisión previa si existe
    if (app?.docs_review) {
      setDocsStatus(app.docs_review.status || {})
      setDocComentarios(app.docs_review.comentarios || {})
    } else {
      setDocsStatus({})
      setDocComentarios({})
    }
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

  async function handleDescargarZip() {
    if (!cliente?.docs_urls || Object.keys(cliente.docs_urls).length === 0) { showToast('No hay documentos para descargar.'); return }
    setDescargando(true); showToast('Preparando ZIP...')
    try {
      const JSZip = (await import('jszip')).default; const zip = new JSZip()
      for (const [id, url] of Object.entries(cliente.docs_urls)) { const docInfo = documentos.find(d => d.id === id); const nombre = docInfo ? docInfo.label : id; const response = await fetch(url as string); const blob = await response.blob(); zip.file(nombre + '.pdf', blob) }
      const content = await zip.generateAsync({ type: 'blob' }); const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = (cliente.denominacion || 'expediente') + '.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href)
      showToast('ZIP descargado.')
    } catch { showToast('Error al generar ZIP.') } finally { setDescargando(false) }
  }

  async function handleSubirContratoFinal(e: React.ChangeEvent<HTMLInputElement>, clienteId: string) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.type !== 'application/pdf') { showToast('Solo se aceptan archivos PDF.'); return }
    setSubiendoContratoFinal(true)
    try {
      const supabase = createClient(); const fileName = 'contrato_final_' + clienteId + '_' + Date.now() + '.pdf'
      const { error } = await supabase.storage.from('contratos').upload(fileName, file, { contentType: 'application/pdf' })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('contratos').getPublicUrl(fileName)
      setContratoFinal(urlData.publicUrl); showToast('Contrato cargado.')
    } catch { showToast('Error al subir contrato.') } finally { setSubiendoContratoFinal(false) }
  }

  async function handleEnviarAprobacionCliente(clienteData: any) {
    if (!contratoFinal) { showToast('Debes subir el contrato primero.'); return }
    setEnviandoCliente(true)
    try {
      const supabase = createClient()
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clienteData.email_contacto,
          type: 'aprobacion',
          data: { monto: clienteData.approved_credit_amount, dias: clienteData.approved_credit_days }
        })
      })
      await supabase.from('applications').update({
        status: 'approved',
        contract_url: contratoFinal,
        reviewed_at: new Date().toISOString()
      }).eq('id', clienteData.id)
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'juancarlos.ibarra@savinodelbene.com',
          type: 'director_aprobado',
          data: { cliente: clienteData.denominacion, monto: clienteData.approved_credit_amount, dias: clienteData.approved_credit_days }
        })
      })
      setAprobadosDirector(prev => prev.filter(a => a.id !== clienteData.id))
      setSelectedAprobado(null)
      setContratoFinal(null)
      showToast('Contrato subido y aprobación enviada al cliente.')
    } catch { showToast('Error al enviar.') } finally { setEnviandoCliente(false) }
  }

  async function handleNotificarRechazoCliente(clienteData: any) {
    setNotificandoRechazo(clienteData.id)
    try {
      const supabase = createClient()
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: clienteData.email_contacto, type: 'rechazo', data: { docs: ['Decisión de Dirección Financiera'], motivo: clienteData.director_motivo || clienteData.rejection_reason } })
      })
      await supabase.from('applications').update({ analista_notifico_rechazo: true }).eq('id', clienteData.id)
      setRechazadosDirector(prev => prev.filter(r => r.id !== clienteData.id)); showToast('Rechazo notificado al cliente.')
    } catch { showToast('Error al notificar.') } finally { setNotificandoRechazo(null) }
  }

  async function handleRegresarAPendientes(clienteData: any) {
    setRegresandoAPendientes(clienteData.id)
    try {
      const supabase = createClient()
      // Resetear director_status y limpiar campos de rechazo para que vuelva a pendientes
      await supabase.from('applications').update({
        director_status: null,
        director_motivo: null,
        director_reviewed_at: null,
        status: 'under_review',
        rejection_reason: null,
        reviewed_at: null,
        analista_notifico_rechazo: false,
      }).eq('id', clienteData.id)
      // Quitar de la lista de rechazados y agregar a pendientes
      setRechazadosDirector(prev => prev.filter(r => r.id !== clienteData.id))
      setPendientes(prev => [{ ...clienteData, director_status: null, director_motivo: null, status: 'under_review', rejection_reason: null }, ...prev])
      setTab('pendientes')
      showToast('Solicitud regresada a pendientes. Puedes editarla y reenviarla.')
    } catch { showToast('Error al regresar la solicitud.') } finally { setRegresandoAPendientes(null) }
  }

  async function handleEnviarADirector() {
    if (!cliente?.email_contacto) { showToast('Este cliente no tiene email registrado.'); return }
    if (!monto || !dias) { showToast('Debes ingresar monto y días de crédito.'); return }
    if (cliente.director_status === 'pending') { showToast('Esta solicitud ya está en espera de dirección.'); return }
    if (cliente.director_status === 'approved') { showToast('Esta solicitud ya fue aprobada por dirección.'); return }

    setEnviandoADirector(true)

    try {
      const supabase = createClient()
      const montoNumerico = parseFloat(monto)
      const diasNumericos = parseInt(dias, 10)

      if (isNaN(montoNumerico) || isNaN(diasNumericos)) {
        showToast('El monto y los días deben ser números válidos.')
        setEnviandoADirector(false)
        return
      }

      const { error } = await supabase.from('applications').update({
        director_status: 'pending',
        approved_credit_amount: montoNumerico,
        approved_credit_days: diasNumericos,
        director_motivo: null,
        analista_notifico_rechazo: false,
        rejection_reason: null,
      }).eq('id', cliente.id)

      if (error) {
        showToast(`Error en BD: ${error.message}`)
        setEnviandoADirector(false)
        return
      }

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'gabriela.vazquez@savinodelbene.com',
          type: 'director_revision',
          data: { cliente: cliente.denominacion, monto: montoNumerico, dias: diasNumericos, applicationId: cliente.id }
        })
      })

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'miguel.felix@savinodelbene.com',
          type: 'nueva_solicitud',
          data: { cliente: cliente.denominacion, monto: montoNumerico, dias: diasNumericos }
        })
      })

      // FIX: Quitar de pendientes, cerrar panel, ir a tab director y recargar
      setPendientes(prev => prev.filter(c => c.id !== cliente.id))
      setSelected(null)
      setAction(null)
      setMonto('')
      setDias('')
      setTab('director')
      cargarEnEsperaDirector()
      showToast('Expediente enviado a Dirección Financiera.')

    } catch (err: any) {
      showToast(`Error del sistema: ${err.message || 'Falla inesperada'}`)
    } finally {
      setEnviandoADirector(false)
    }
  }

  async function handleRechazar() {
    if (!cliente?.email_contacto) { showToast('Este cliente no tiene email registrado.'); return }
    if (docsRechazo.length === 0) { showToast('Selecciona al menos un documento.'); return }
    const supabase = createClient()
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cliente.email_contacto, type: 'rechazo', data: { docs: docsRechazo, motivo } })
      })
      await supabase.from('applications').update({ status: 'rejected', rejection_reason: motivo, reviewed_at: new Date().toISOString() }).eq('id', cliente.id)
      setPendientes(prev => prev.filter(c => c.id !== cliente.id)); setSelected(null); setAction(null)
      showToast('Rechazo notificado a ' + cliente.email_contacto)
    } catch { showToast('Error al enviar.') }
    setDocsRechazo([]); setMotivo('')
  }

  async function handleBorrar(id: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('applications').delete().eq('id', id)
      if (error) { showToast('Error al borrar: ' + error.message); return }
      setPendientes(prev => prev.filter(c => c.id !== id))
      if (selected === id) setSelected(null)
      setConfirmBorrar(null)
      showToast('Solicitud eliminada.')
    } catch { showToast('Error al borrar la solicitud.') }
  }

  if (vista === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex flex-col items-center">
            <img src={LOGO} alt="Savino del Bene" className="h-12 object-contain mb-3" />
            <p className="text-sm font-medium text-gray-900">Panel del Analista de Crédito</p>
            <p className="text-xs text-gray-500 mt-1">Savino del Bene México</p>
          </div>
          <div className="p-6 grid gap-4">
            <div><label className="text-xs text-gray-500 block mb-1">Correo electrónico</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="juancarlos.ibarra@savinodelbene.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">Contraseña</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}
            <button onClick={handleLogin} disabled={loginCargando} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">{loginCargando ? 'Entrando...' : 'Iniciar sesión'}</button>
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
              <p className="text-sm font-medium text-gray-900">Portal de Crédito</p>
              <p className="text-xs text-gray-500">Panel del Analista de Crédito · {perfil?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full">{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Cerrar sesión</button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => { setTab('pendientes'); setSelected(null) }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (tab === 'pendientes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            Solicitudes pendientes {pendientes.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{pendientes.length}</span>}
          </button>
          <button onClick={() => { setTab('director'); setSelected(null); cargarEnEsperaDirector(); cargarAprobadosPorDirector(); cargarRechazadosPorDirector() }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (tab === 'director' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            En dirección {(enEsperaDirector.length + aprobadosDirector.length + rechazadosDirector.length) > 0 && <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{enEsperaDirector.length + aprobadosDirector.length + rechazadosDirector.length}</span>}
          </button>
          <button onClick={() => { setTab('historial'); setSelected(null); setHistorialSelected(null) }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (tab === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>Historial</button>
        </div>

        {tab === 'pendientes' && (
          <>
            <FiltrosPanel filtros={filtrosPendientes} onChange={(key, value) => setFiltrosPendientes(prev => ({ ...prev, [key]: value }))} onLimpiar={() => setFiltrosPendientes(filtrosVacios)} />
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-medium">Solicitudes pendientes de revisión</h2>
                <p className="text-xs text-gray-400">{pendientesFiltrados.length} de {pendientes.length} solicitudes</p>
              </div>
              {loading ? (<div className="px-6 py-8 text-center text-sm text-gray-400">Cargando...</div>) : pendientesFiltrados.length === 0 ? (<div className="px-6 py-8 text-center text-sm text-gray-400">No hay solicitudes que coincidan con los filtros.</div>) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Cliente</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">RFC</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Folio vendedor</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Crédito solicitado</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Vendedor</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Fecha</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Acciones</th></tr></thead>
                  <tbody>
                    {pendientesFiltrados.map(c => (
                      <tr key={c.id} className={'border-t border-gray-100 ' + (selected === c.id ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                        <td className="px-6 py-3 font-medium">{c.denominacion || 'Sin nombre'}</td>
                        <td className="px-6 py-3 text-gray-500">{c.rfc?.trim() || '—'}</td>
                        <td className="px-6 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{c.vendor_folio || '—'}</span></td>
                        <td className="px-6 py-3 text-gray-500">${Number(c.credit_amount || 0).toLocaleString()} · {c.credit_days} días</td>
                        <td className="px-6 py-3">{c.vendor_info ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{c.vendor_info.nombre_vendedor}</span> : <span className="text-xs text-gray-400">Pendiente</span>}</td>
                        <td className="px-6 py-3 text-gray-500">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('es-MX') : '—'}</td>
                        {/* FIX: Usar abrirExpediente en vez de setSelected directo */}
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => selected === c.id ? setSelected(null) : abrirExpediente(c.id)}
                              className={'text-xs rounded-lg px-3 py-1.5 font-medium ' + (selected === c.id ? 'bg-gray-900 text-white' : 'border border-gray-200 hover:bg-gray-50')}
                            >
                              {selected === c.id ? 'Revisando' : 'Revisar'}
                            </button>
                            <button
                              onClick={() => setConfirmBorrar(c.id)}
                              className="text-xs rounded-lg px-3 py-1.5 font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            >
                              Eliminar
                            </button>
                          </div>
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
                    <p className="text-xs text-gray-500 mt-0.5">RFC: {cliente.rfc?.trim()} · Email: <strong>{cliente.email_contacto}</strong> · Folio: <span className="font-mono bg-gray-100 px-1 rounded">{cliente.vendor_folio}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => generarResumenPDF(cliente)} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700">Resumen PDF</button>
                    <button onClick={handleDescargarZip} disabled={descargando} className="text-xs bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-700 disabled:opacity-50">{descargando ? 'Generando...' : 'Descargar ZIP'}</button>
                    <button onClick={() => setSelected(null)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">Cerrar</button>
                  </div>
                </div>
                <div className="flex gap-1 p-4 border-b border-gray-100 bg-gray-50 overflow-x-auto">
                  {['documentos', 'facturacion', 'vendedor', 'decision'].map(s => (
                    <button key={s} onClick={() => setSeccion(s)} className={'px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ' + (seccion === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700')}>
                      {s === 'documentos' ? 'Documentos' : s === 'facturacion' ? 'Facturación' : s === 'vendedor' ? 'Info Vendedor' : 'Decisión'}
                      {s === 'vendedor' && !cliente.vendor_info && <span className="ml-1 text-yellow-500">●</span>}
                      {s === 'vendedor' && cliente.vendor_info && <span className="ml-1 text-green-500">●</span>}
                      {/* FIX 3: Indicador de revisión guardada en tab Documentos */}
                      {s === 'documentos' && Object.keys(docsStatus).some(k => docsStatus[k] !== null) && (
                        <span className="ml-1 text-blue-500">●</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {seccion === 'documentos' && (
                    <div>
                      {/* FIX 3: Indicador de guardado */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-500">Marca cada documento y agrega comentarios si aplica. La revisión se guarda automáticamente.</p>
                        {guardandoDocs && <p className="text-xs text-blue-500 animate-pulse">Guardando...</p>}
                      </div>
                      <div className="grid gap-2">
                        {documentos.map(doc => {
                          const url = cliente.docs_urls?.[doc.id]
                          const ds = docsStatus[doc.id]
                          return (
                            <div key={doc.id} className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span>{doc.label}</span>
                                <div className="flex items-center gap-2">
                                  {url && <button onClick={() => setPdfVisible(url)} className="text-xs border border-gray-200 bg-white rounded-lg px-2 py-1 hover:bg-gray-100">Ver PDF</button>}
                                  {/* FIX 3: Usar handleSetDocStatus en vez de setDocStatus */}
                                  <button onClick={() => handleSetDocStatus(doc.id, 'ok')} className={'text-xs px-2 py-1 rounded-full border transition-all ' + (ds === 'ok' ? 'bg-green-600 text-white border-green-600' : 'border-green-200 text-green-700 hover:bg-green-50')}>OK</button>
                                  <button onClick={() => handleSetDocStatus(doc.id, 'rechazado')} className={'text-xs px-2 py-1 rounded-full border transition-all ' + (ds === 'rechazado' ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-700 hover:bg-red-50')}>Rechazar</button>
                                  <button onClick={() => handleSetDocStatus(doc.id, 'excepcion')} className={'text-xs px-2 py-1 rounded-full border transition-all ' + (ds === 'excepcion' ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 text-amber-700 hover:bg-amber-50')}>Excepción dir.</button>
                                </div>
                              </div>
                              {ds === 'excepcion' && (
                                <div className="mt-2">
                                  <textarea
                                    value={docComentarios[doc.id] || ''}
                                    onChange={e => handleSetDocComentario(doc.id, e.target.value)}
                                    onBlur={() => handleGuardarComentarioBlur(doc.id)}
                                    rows={2}
                                    placeholder="Describe la excepción para Dirección Financiera..."
                                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-amber-400 bg-amber-50"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {seccion === 'facturacion' && (<div className="grid grid-cols-2 gap-4">{cliente.facturacion ? [{ label: 'Método de pago', value: cliente.facturacion.metodo_pago }, { label: 'Forma de pago', value: cliente.facturacion.forma_pago }, { label: 'Uso de CFDI', value: cliente.facturacion.uso_cfdi }, { label: 'Régimen Fiscal', value: cliente.facturacion.regimen_fiscal }, { label: 'Moneda de facturación', value: cliente.facturacion.moneda }, { label: 'Email facturas', value: cliente.facturacion.email_facturas }, { label: 'Contacto CxP', value: cliente.facturacion.contacto_cxp }, { label: 'Teléfono CxP', value: cliente.facturacion.telefono_cxp }, { label: 'Email CxP', value: cliente.facturacion.email_cxp }, { label: 'Razón social facturación', value: cliente.facturacion.razon_social_factura }, { label: 'Representante Legal', value: cliente.facturacion.representante_legal }].map(f => (<div key={f.label} className={'bg-gray-50 rounded-lg p-3 ' + (f.label === 'Representante Legal' ? 'col-span-2' : '')}><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>)) : <div className="col-span-2 text-center py-8 text-sm text-gray-400">Sin información de facturación.</div>}</div>)}
                  {seccion === 'vendedor' && (<div>{cliente.vendor_info ? (<div className="grid grid-cols-2 gap-4">{[{ label: 'Vendedor', value: cliente.vendor_info.nombre_vendedor }, { label: 'Giro del cliente', value: cliente.vendor_info.giro_cliente }, { label: 'Embarques por mes', value: cliente.vendor_info.embarques_mes }, { label: 'Tipo de operación', value: cliente.vendor_info.tipo_operacion?.join(', ') }, { label: 'Puertos principales', value: cliente.vendor_info.puertos_principales }, { label: 'País de origen', value: cliente.vendor_info.origen_pais }, { label: 'Puerto de destino', value: cliente.vendor_info.destino_puerto }, { label: 'Modalidad', value: cliente.vendor_info.modalidad?.join(', ') }, { label: 'Tipo de carga', value: cliente.vendor_info.tipo_carga?.join(', ') }, { label: 'Profit estimado', value: (cliente.vendor_info.profit_porcentaje || '') + '% · ' + (cliente.vendor_info.profit_moneda || '') + ' ' + Number(cliente.vendor_info.profit_monto || 0).toLocaleString() }].map(f => (<div key={f.label} className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">{f.label}</p><p className="text-sm font-medium">{f.value || '—'}</p></div>))}{cliente.vendor_info.manejo_carga && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Manejo de carga</p><p className="text-sm">{cliente.vendor_info.manejo_carga}</p></div>)}{cliente.vendor_info.comentarios && (<div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 mb-1">Comentarios</p><p className="text-sm">{cliente.vendor_info.comentarios}</p></div>)}</div>) : (<div className="text-center py-8"><p className="text-sm text-gray-500 mb-2">El vendedor aún no ha llenado el pronóstico.</p><p className="text-xs text-gray-400">Folio: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cliente.vendor_folio}</span></p></div>)}</div>)}
                  {seccion === 'decision' && (
                    <div>
                      {!cliente.vendor_info && (<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4"><p className="text-sm font-medium text-yellow-700">Falta información del vendedor</p><p className="text-xs text-yellow-600 mt-1">Folio: <span className="font-mono">{cliente.vendor_folio}</span></p></div>)}
                      <div className="flex gap-3 mb-4">
                        <button onClick={() => setAction('approve')} className={'text-sm font-medium rounded-lg px-4 py-2 border ' + (action === 'approve' ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100')}>Enviar a Dirección Financiera</button>
                        <button onClick={() => setAction('reject')} className={'text-sm font-medium rounded-lg px-4 py-2 border ' + (action === 'reject' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')}>Rechazar solicitud</button>
                      </div>
                      {action === 'approve' && (<div className="bg-green-50 border border-green-200 rounded-xl p-4"><p className="text-sm font-medium text-green-700 mb-1">Propuesta de crédito para Dirección Financiera</p><p className="text-xs text-green-600 mb-3">El expediente se enviará a Gabriela Vázquez. El contrato se sube después de su aprobación.</p><div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-xs text-gray-500 block mb-1">Monto propuesto (USD) <span className="text-red-500">*</span></label><input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="500000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div><div><label className="text-xs text-gray-500 block mb-1">Días de crédito <span className="text-red-500">*</span></label><input type="number" value={dias} onChange={e => setDias(e.target.value)} placeholder="30" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div></div><button onClick={handleEnviarADirector} disabled={!monto || !dias || enviandoADirector} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">{enviandoADirector ? 'Enviando...' : 'Enviar a Dirección Financiera'}</button></div>)}
                      {action === 'reject' && (<div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-sm font-medium text-red-700 mb-3">Documentos con inconsistencia</p><div className="grid gap-2 mb-4">{documentos.map(doc => (<label key={doc.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"><input type="checkbox" checked={docsRechazo.includes(doc.label)} onChange={() => toggleDoc(doc.label)} className="rounded" />{doc.label}</label>))}</div><div className="mb-4"><label className="text-xs text-gray-500 block mb-1">Motivo del rechazo</label><textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Describe la inconsistencia..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" /></div>{docsRechazo.length > 0 && <p className="text-xs text-red-600 mb-3">Seleccionados: {docsRechazo.join(', ')}</p>}<p className="text-xs text-gray-500 mb-3">Notificación a: <strong>{cliente.email_contacto}</strong></p><button onClick={handleRechazar} className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700">Notificar rechazo al cliente</button></div>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'director' && (
          <>
            {rechazadosDirector.length > 0 && (
              <div className="bg-white border border-red-200 rounded-xl overflow-hidden mb-4">
                <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between bg-red-50">
                  <div><h2 className="text-sm font-medium text-red-700">Rechazados por Dirección Financiera</h2><p className="text-xs text-red-500 mt-0.5">Decide si corriges la solicitud o notificas el rechazo al cliente</p></div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{rechazadosDirector.length} solicitudes</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {rechazadosDirector.map(r => (
                    <div key={r.id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{r.denominacion}</p>
                          <p className="text-xs text-gray-500 mt-0.5">RFC: {r.rfc?.trim()} · Email: <strong>{r.email_contacto}</strong></p>
                          {r.director_motivo && (
                            <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              <p className="text-xs text-red-700"><span className="font-medium">Motivo de rechazo (Dirección Financiera):</span> {r.director_motivo}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRegresarAPendientes(r)}
                            disabled={regresandoAPendientes === r.id}
                            className="text-xs bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {regresandoAPendientes === r.id ? 'Regresando...' : 'Corregir y reenviar'}
                          </button>
                          <button
                            onClick={() => handleNotificarRechazoCliente(r)}
                            disabled={notificandoRechazo === r.id}
                            className="text-xs bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {notificandoRechazo === r.id ? 'Notificando...' : 'Notificar rechazo al cliente'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {aprobadosDirector.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div><h2 className="text-sm font-medium">Aprobados por Dirección Financiera — pendientes de contrato</h2><p className="text-xs text-gray-500 mt-0.5">Sube el contrato para notificar al cliente</p></div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{aprobadosDirector.length} solicitudes</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {aprobadosDirector.map(a => (
                    <div key={a.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-sm font-medium">{a.denominacion}</p><p className="text-xs text-gray-500 mt-0.5">RFC: {a.rfc?.trim()} · Email: <strong>{a.email_contacto}</strong></p></div>
                        <div className="flex items-center gap-3"><div className="text-right"><p className="text-xs text-gray-500">Monto aprobado por dirección</p><p className="text-sm font-medium">${Number(a.approved_credit_amount || 0).toLocaleString()} USD · {a.approved_credit_days} días</p></div><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Dir. Financiera aprobó</span></div>
                      </div>
                      {selectedAprobado === a.id ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-sm font-medium text-green-700 mb-1">Subir contrato y notificar al cliente</p>
                          <p className="text-xs text-green-600 mb-3">Al subir el contrato se enviará automáticamente el email de aprobación al cliente.</p>
                          <div className="mb-4"><label className="text-xs text-gray-500 block mb-1">Contrato de crédito (PDF) <span className="text-red-500">*</span></label><input type="file" accept=".pdf" onChange={e => handleSubirContratoFinal(e, a.id)} disabled={subiendoContratoFinal} className="text-sm" />{subiendoContratoFinal && <p className="text-xs text-gray-400 mt-1">Subiendo...</p>}{contratoFinal && <p className="text-xs text-green-600 mt-1">Contrato cargado.</p>}</div>
                          <p className="text-xs text-gray-500 mb-3">Se enviará email de aprobación a: <strong>{a.email_contacto}</strong></p>
                          <div className="flex gap-2">
                            <button onClick={() => handleEnviarAprobacionCliente(a)} disabled={!contratoFinal || enviandoCliente} className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">{enviandoCliente ? 'Enviando...' : 'Subir contrato y notificar cliente'}</button>
                            <button onClick={() => { setSelectedAprobado(null); setContratoFinal(null) }} className="border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
                          </div>
                        </div>
                      ) : (<button onClick={() => { setSelectedAprobado(a.id); setContratoFinal(null) }} className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">Subir contrato y notificar</button>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h2 className="text-sm font-medium">En espera de aprobación de Dirección Financiera</h2><p className="text-xs text-gray-500 mt-0.5">Solicitudes enviadas a Gabriela Vázquez</p></div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{enEsperaDirector.length} solicitudes</span>
              </div>
              {enEsperaDirector.length === 0 ? (<div className="px-6 py-8 text-center text-sm text-gray-400">No hay solicitudes en espera de Dirección Financiera.</div>) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Cliente</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">RFC</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Monto propuesto</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Días propuestos</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Fecha envío</th><th className="text-left px-6 py-3 text-xs text-gray-500 font-medium">Estado</th></tr></thead>
                  <tbody>{enEsperaDirector.map(c => (<tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-6 py-3 font-medium">{c.denominacion || 'Sin nombre'}</td><td className="px-6 py-3 text-gray-500">{c.rfc?.trim() || '—'}</td><td className="px-6 py-3 text-gray-500">${Number(c.approved_credit_amount || 0).toLocaleString()} USD</td><td className="px-6 py-3 text-gray-500">{c.approved_credit_days || 0} días</td><td className="px-6 py-3 text-gray-500">{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString('es-MX') : '—'}</td><td className="px-6 py-3"><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">En espera de Dirección Financiera</span></td></tr>))}</tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'historial' && (
          <>
            <FiltrosPanel filtros={filtrosHistorial} onChange={(key, value) => { setFiltrosHistorial(prev => ({ ...prev, [key]: value })); setPaginaHistorial(1) }} onLimpiar={() => { setFiltrosHistorial(filtrosVacios); setPaginaHistorial(1) }} />
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h2 className="text-sm font-medium">Historial de solicitudes</h2><p className="text-xs text-gray-500 mt-0.5">Solicitudes aprobadas y rechazadas</p></div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">{historialFiltrado.length} de {historial.length} solicitudes</p>
                  <button onClick={exportarExcel} className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">Exportar Excel</button>
                </div>
              </div>
              {loadingHistorial ? (<div className="px-6 py-8 text-center text-sm text-gray-400">Cargando historial...</div>) : historialFiltrado.length === 0 ? (<div className="px-6 py-8 text-center text-sm text-gray-400">{historial.length === 0 ? 'No hay solicitudes en el historial.' : 'No hay solicitudes que coincidan con los filtros.'}</div>) : (
                <><TablaHistorial historialPagina={historialPagina} historialSelected={historialSelected} setHistorialSelected={setHistorialSelected} statusColor={statusColor} statusLabel={statusLabel} /><Paginacion pagina={paginaHistorial} total={historialFiltrado.length} porPagina={POR_PAGINA} onChange={p => { setPaginaHistorial(p); setHistorialSelected(null) }} /></>
              )}
            </div>
            {clienteHistorial && <ExpedienteDetalle cliente={clienteHistorial} onClose={() => setHistorialSelected(null)} />}
          </>
        )}
      </div>
      {pdfVisible && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-xl w-4/5 h-4/5 flex flex-col overflow-hidden"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h3 className="text-sm font-medium">Vista previa del documento</h3><div className="flex items-center gap-2"><a href={pdfVisible} target="_blank" rel="noreferrer" className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50">Abrir en nueva pestaña</a><button onClick={() => setPdfVisible(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button></div></div><iframe src={pdfVisible} className="flex-1 w-full" title="Vista previa PDF" /></div></div>)}
      {confirmBorrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Eliminar solicitud</h3>
              <p className="text-xs text-gray-500 mt-1">{pendientes.find(c => c.id === confirmBorrar)?.denominacion}</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">Esta acción es permanente y no se puede deshacer. ¿Confirmas eliminar esta solicitud?</p>
              <div className="flex gap-3">
                <button onClick={() => handleBorrar(confirmBorrar)} className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700">Sí, eliminar</button>
                <button onClick={() => setConfirmBorrar(null)} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
