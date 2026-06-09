import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  under_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  draft: 'Borrador',
  pending_signature: 'Firma pendiente',
  active: 'Activo',
  renewal_pending: 'Renovación pendiente',
  closed: 'Cerrado',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const busqueda = searchParams.get('busqueda') || ''
    const fechaInicio = searchParams.get('fechaInicio') || ''
    const fechaFin = searchParams.get('fechaFin') || ''
    const montoMin = searchParams.get('montoMin') || ''
    const montoMax = searchParams.get('montoMax') || ''

    const supabase = createClient()

    let query = supabase.from('applications').select('*').order('created_at', { ascending: false })

    if (fechaInicio) query = query.gte('submitted_at', fechaInicio)
    if (fechaFin) query = query.lte('submitted_at', fechaFin + 'T23:59:59')
    if (montoMin) query = query.gte('credit_amount', Number(montoMin))
    if (montoMax) query = query.lte('credit_amount', Number(montoMax))

    const { data, error } = await query
    if (error) throw error

    let registros = data || []

    if (busqueda) {
      const q = busqueda.toLowerCase()
      registros = registros.filter((r: any) =>
        r.denominacion?.toLowerCase().includes(q) ||
        r.rfc?.toLowerCase().includes(q)
      )
    }

    const XLSX = await import('xlsx')

    const filas = registros.map((r: any) => ({
      'Razón Social': r.denominacion || '',
      'RFC': r.rfc?.trim() || '',
      '# Embarques': r.vendor_info?.embarques_mes || 0,
      'Monto Solicitado (MXN)': r.credit_amount || 0,
      'Monto Autorizado (MXN)': r.approved_credit_amount || 0,
      'Días de Crédito Solicitados': r.credit_days || 0,
      'Días de Crédito Autorizados': r.approved_credit_days || 0,
      'Status': statusLabel[r.status] || r.status || '',
      'Folio Vendedor': r.vendor_folio || '',
      'Vendedor': r.vendor_info?.nombre_vendedor || '',
      'Email Contacto': r.email_contacto || '',
      'Fecha Solicitud': r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('es-MX') : '',
      'Fecha Resolución': r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('es-MX') : '',
      'Método de Pago': r.facturacion?.metodo_pago || '',
      'Moneda Facturación': r.facturacion?.moneda || '',
      'Contrato Firmado': r.signed_contract_url ? 'Sí' : 'No',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas)

    ws['!cols'] = [
      { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
      { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 18 },
      { wch: 14 }, { wch: 25 }, { wch: 35 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fecha = new Date().toISOString().split('T')[0]

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="SBM_Credito_${fecha}.xlsx"`,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al generar Excel' }, { status: 500 })
  }
}
