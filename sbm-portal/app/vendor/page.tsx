'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOGO = 'https://i.imgur.com/JJTbpFw.png'

export default function VendorPage() {
  const [vista, setVista] = useState('login')
  const [folio, setFolio] = useState('')
  const [folioError, setFolioError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    giro_cliente: '',
    manejo_carga: '',
    embarques_mes: '',
    tipo_operacion: [] as string[],
    puertos_principales: '',
    origen_pais: '',
    destino_puerto: '',
    modalidad: [] as string[],
    tipo_carga: [] as string[],
    profit_porcentaje: '',
    profit_moneda: 'MXN',
    profit_monto: '',
    nombre_vendedor: '',
    comentarios: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function handleBuscarFolio() {
    if (!folio.trim()) { setFolioError('Ingresa el folio de la solicitud.'); return }
    setBuscando(true)
    setFolioError('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('applications')
        .select('id, denominacion, vendor_info')
        .eq('vendor_folio', folio.trim().toUpperCase())
        .single()

      if (error || !data) {
        setFolioError('Folio no encontrado. Verifica el número e intenta de nuevo.')
        return
      }

      setApplicationId(data.id)
      setClienteNombre(data.denominacion || 'Cliente')
      if (data.vendor_info) {
        setForm(data.vendor_info)
        setEnviado(true)
        setVista('confirmacion')
        return
      }
      setVista('form')
    } catch (err) {
      setFolioError('Error al buscar. Intenta de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  function toggleMulti(field: string, value: string) {
    setForm(prev => {
      const current = prev[field as keyof typeof prev] as string[]
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [field]: updated }
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  function validar() {
    const e: Record<string, string> = {}
    if (!form.giro_cliente.trim()) e.giro_cliente = 'Campo requerido'
    if (!form.manejo_carga.trim()) e.manejo_carga = 'Campo requerido'
    if (!form.embarques_mes.trim()) e.embarques_mes = 'Campo requerido'
    if (form.tipo_operacion.length === 0) e.tipo_operacion = 'Selecciona al menos uno'
    if (!form.puertos_principales.trim()) e.puertos_principales = 'Campo requerido'
    if (!form.origen_pais.trim()) e.origen_pais = 'Campo requerido'
    if (!form.destino_puerto.trim()) e.destino_puerto = 'Campo requerido'
    if (form.modalidad.length === 0) e.modalidad = 'Selecciona al menos uno'
    if (form.tipo_carga.length === 0) e.tipo_carga = 'Selecciona al menos uno'
    if (!form.profit_porcentaje.trim()) e.profit_porcentaje = 'Campo requerido'
    if (!form.profit_monto.trim()) e.profit_monto = 'Campo requerido'
    if (!form.nombre_vendedor.trim()) e.nombre_vendedor = 'Campo requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleEnviar() {
    if (!validar()) { showToast('Completa todos los campos requeridos.'); return }
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('applications')
        .update({ vendor_info: form })
        .eq('id', applicationId)
      if (error) throw error
      setEnviado(true)
      setVista('confirmacion')
    } catch (err) {
      showToast('Error al enviar. Intenta de nuevo.')
    }
  }

  const CheckButton = ({ field, value, label }: { field: string; value: string; label: string }) => {
    const current = form[field as keyof typeof form] as string[]
    const selected = current.includes(value)
    return (
      <button
        type="button"
        onClick={() => toggleMulti(field, value)}
        className={'flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm transition-all ' + (selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}
      >
        <span className={'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ' + (selected ? 'bg-white border-white' : 'border-gray-300')}>
          {selected && <span className="text-gray-900 text-xs font-bold">✓</span>}
        </span>
        {label}
      </button>
    )
  }

  if (vista === 'confirmacion') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {/* Card principal */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header verde */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-white mb-1">¡Información enviada!</h1>
              <p className="text-green-100 text-sm">El pronóstico de embarques fue registrado correctamente</p>
            </div>

            {/* Resumen */}
            <div className="px-8 py-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Resumen del envío</p>
                <div className="grid gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Cliente</span>
                    <span className="text-xs font-medium text-gray-900">{clienteNombre}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Vendedor</span>
                    <span className="text-xs font-medium text-gray-900">{form.nombre_vendedor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Embarques/mes</span>
                    <span className="text-xs font-medium text-gray-900">{form.embarques_mes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Servicios</span>
                    <span className="text-xs font-medium text-gray-900 text-right max-w-48">
                      {form.modalidad.map(m => ({
                        aereo: 'Aéreo', maritimo: 'Marítimo', terrestre: 'Terrestre',
                        seguro_carga: 'Seguro de Carga', despacho_aduanal: 'Despacho Aduanal'
                      }[m] || m)).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tipo de operación</span>
                    <span className="text-xs font-medium text-gray-900">
                      {form.tipo_operacion.map(t => t === 'importacion' ? 'Importación' : 'Exportación').join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Profit estimado</span>
                    <span className="text-xs font-medium text-gray-900">{form.profit_porcentaje}% · {form.profit_moneda} {Number(form.profit_monto).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-blue-700">El analista de crédito de Savino del Bene ya puede consultar esta información en el portal de crédito.</p>
              </div>
            </div>
          </div>

          {/* Logo al fondo */}
          <div className="flex justify-center mt-6">
            <img src={LOGO} alt="Savino del Bene" className="h-8 object-contain opacity-50" />
          </div>
        </div>
        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
      </div>
    )
  }

  if (vista === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex flex-col items-center">
            <img src={LOGO} alt="Savino del Bene" className="h-12 object-contain mb-3" />
            <p className="text-sm font-medium text-gray-900">Portal de Vendedores</p>
            <p className="text-xs text-gray-500 mt-1">Ingresa el folio de la solicitud</p>
          </div>
          <div className="p-6 grid gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Folio de solicitud</label>
              <input
                value={folio}
                onChange={e => setFolio(e.target.value.toUpperCase())}
                placeholder="Ej. A1B2C3D4"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none uppercase tracking-widest font-mono"
              />
              {folioError && <p className="text-xs text-red-500 mt-1">{folioError}</p>}
            </div>
            <button onClick={handleBuscarFolio} disabled={buscando} className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {buscando ? 'Buscando...' : 'Acceder'}
            </button>
          </div>
        </div>
        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="Savino del Bene" className="h-10 object-contain" />
            <div>
              <p className="text-sm font-medium text-gray-900">Portal de Vendedores</p>
              <p className="text-xs text-gray-500">Cliente: {clienteNombre}</p>
            </div>
          </div>
          {enviado && <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">Enviado</span>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium">Información del cliente y pronóstico de embarques</h2>
            <p className="text-xs text-gray-500 mt-0.5">Completa toda la información sobre el cliente y el manejo de su mercancía</p>
          </div>
          <div className="p-6 grid gap-6">

            <div className="border-b border-gray-100 pb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Información del cliente</p>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Giro o actividad del cliente <span className="text-red-500">*</span></label>
                  <input name="giro_cliente" value={form.giro_cliente} onChange={handleChange} placeholder="Ej. Importador de electrónicos, fabricante automotriz..." className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.giro_cliente ? 'border-red-300' : 'border-gray-200')} />
                  {errors.giro_cliente && <p className="text-xs text-red-500 mt-1">{errors.giro_cliente}</p>}
                  <p className="text-xs text-gray-400 mt-1">Describe brevemente a qué se dedica el cliente</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Información sobre manejo de la carga <span className="text-red-500">*</span></label>
                  <textarea name="manejo_carga" value={form.manejo_carga} onChange={handleChange} rows={3} placeholder="Describe el tipo de mercancía que maneja, condiciones especiales de almacenamiento, temperatura, fragilidad, peligrosidad, etc." className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none ' + (errors.manejo_carga ? 'border-red-300' : 'border-gray-200')} />
                  {errors.manejo_carga && <p className="text-xs text-red-500 mt-1">{errors.manejo_carga}</p>}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100 pb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Pronóstico de embarques</p>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Embarques considerados en el mes <span className="text-red-500">*</span></label>
                  <input name="embarques_mes" value={form.embarques_mes} onChange={handleChange} placeholder="Ej. 5" type="number" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.embarques_mes ? 'border-red-300' : 'border-gray-200')} />
                  {errors.embarques_mes && <p className="text-xs text-red-500 mt-1">{errors.embarques_mes}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Tipo de operación <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <CheckButton field="tipo_operacion" value="importacion" label="Importación" />
                    <CheckButton field="tipo_operacion" value="exportacion" label="Exportación" />
                  </div>
                  {errors.tipo_operacion && <p className="text-xs text-red-500 mt-1">{errors.tipo_operacion}</p>}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Puertos principales <span className="text-red-500">*</span></label>
                  <input name="puertos_principales" value={form.puertos_principales} onChange={handleChange} placeholder="Ej. Manzanillo, Veracruz, Lázaro Cárdenas" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.puertos_principales ? 'border-red-300' : 'border-gray-200')} />
                  {errors.puertos_principales && <p className="text-xs text-red-500 mt-1">{errors.puertos_principales}</p>}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Principal país de origen <span className="text-red-500">*</span></label>
                  <input
                    name="origen_pais"
                    value={form.origen_pais}
                    onChange={handleChange}
                    placeholder="Ej. China, Estados Unidos, Alemania..."
                    className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.origen_pais ? 'border-red-300' : 'border-gray-200')}
                  />
                  {errors.origen_pais && <p className="text-xs text-red-500 mt-1">{errors.origen_pais}</p>}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Principal puerto de destino <span className="text-red-500">*</span></label>
                  <input name="destino_puerto" value={form.destino_puerto} onChange={handleChange} placeholder="Ej. Puerto de Manzanillo, Col." className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.destino_puerto ? 'border-red-300' : 'border-gray-200')} />
                  {errors.destino_puerto && <p className="text-xs text-red-500 mt-1">{errors.destino_puerto}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Servicios a prestar <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-3">
                    <CheckButton field="modalidad" value="aereo" label="Aéreo" />
                    <CheckButton field="modalidad" value="maritimo" label="Marítimo" />
                    <CheckButton field="modalidad" value="terrestre" label="Terrestre" />
                    <CheckButton field="modalidad" value="seguro_carga" label="Seguro de Carga" />
                    <CheckButton field="modalidad" value="despacho_aduanal" label="Despacho Aduanal" />
                  </div>
                  {errors.modalidad && <p className="text-xs text-red-500 mt-1">{errors.modalidad}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-2">Tipo de carga <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-3">
                    <CheckButton field="tipo_carga" value="consolidada" label="Consolidada (LCL)" />
                    <CheckButton field="tipo_carga" value="contenedor" label="Contenedor completo (FCL)" />
                  </div>
                  {errors.tipo_carga && <p className="text-xs text-red-500 mt-1">{errors.tipo_carga}</p>}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100 pb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Profit estimado</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Porcentaje (%) <span className="text-red-500">*</span></label>
                  <input name="profit_porcentaje" value={form.profit_porcentaje} onChange={handleChange} placeholder="Ej. 15" type="number" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.profit_porcentaje ? 'border-red-300' : 'border-gray-200')} />
                  {errors.profit_porcentaje && <p className="text-xs text-red-500 mt-1">{errors.profit_porcentaje}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Moneda</label>
                  <select name="profit_moneda" value={form.profit_moneda} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto <span className="text-red-500">*</span></label>
                  <input name="profit_monto" value={form.profit_monto} onChange={handleChange} placeholder="Ej. 50000" type="number" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.profit_monto ? 'border-red-300' : 'border-gray-200')} />
                  {errors.profit_monto && <p className="text-xs text-red-500 mt-1">{errors.profit_monto}</p>}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Datos del vendedor</p>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre del vendedor <span className="text-red-500">*</span></label>
                  <input name="nombre_vendedor" value={form.nombre_vendedor} onChange={handleChange} placeholder="Tu nombre completo" className={'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ' + (errors.nombre_vendedor ? 'border-red-300' : 'border-gray-200')} />
                  {errors.nombre_vendedor && <p className="text-xs text-red-500 mt-1">{errors.nombre_vendedor}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Comentarios adicionales <span className="text-gray-400">(opcional)</span></label>
                  <textarea name="comentarios" value={form.comentarios} onChange={handleChange} rows={3} placeholder="Información adicional relevante sobre el cliente o los embarques..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
              </div>
            </div>

            <button onClick={handleEnviar} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700">
              {enviado ? 'Actualizar información' : 'Enviar pronóstico de embarques'}
            </button>
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
