export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { to, type, data } = await request.json()

    const PORTAL_URL = 'https://www.creditossdb.com.mx/dashboard'
    const ADMIN_URL = 'https://www.creditossdb.com.mx/admin'
    const DIRECTOR_URL = 'https://www.creditossdb.com.mx/director'

    let subject = ''
    let html = ''

    if (type === 'solicitud_recibida') {
      subject = 'SBM — Recibimos tu solicitud de crédito'
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">Hemos recibido tu solicitud de crédito. Aquí está el resumen de tu registro:</p>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #1E40AF;"><strong>Datos registrados:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Empresa: <strong>${data.denominacion}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">RFC: <strong>${data.rfc}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Correo registrado: <strong>${data.email}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Monto solicitado: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días de crédito: <strong>${data.dias} días</strong></p>
            </div>
            <p style="font-size: 13px; color: #374151;">El equipo de crédito de Savino del Bene México revisará tu expediente y te notificará por este correo el resultado.</p>
            <p style="font-size: 13px; color: #374151; margin-top: 12px;">Puedes consultar el estado de tu solicitud en cualquier momento con tu RFC y correo:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://www.creditossdb.com.mx" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Ver mi solicitud</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'nueva_solicitud') {
      subject = 'SBM — Nueva solicitud de crédito: ' + data.cliente
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">Se recibió una <strong>nueva solicitud de crédito</strong> en el portal.</p>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #1E40AF;"><strong>Detalles:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Cliente: <strong>${data.cliente}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">RFC: <strong>${data.rfc}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Monto solicitado: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días solicitados: <strong>${data.dias} días</strong></p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${ADMIN_URL}" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Revisar en el panel</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'aprobacion') {
      subject = 'SBM — Tu línea de crédito fue pre-aprobada'
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">¡Felicidades! Tu línea de crédito ha sido <strong>pre-aprobada</strong>.</p>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #15803D;"><strong>Condiciones aprobadas:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Monto: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días de crédito: <strong>${data.dias} días</strong></p>
            </div>
            <p style="font-size: 13px; color: #374151;">Descarga tu contrato en el siguiente link:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${PORTAL_URL}" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">SBM Portal de Crédito</a>
            </div>
            <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #C2410C;"><strong>Importante:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.6;">El beneficio será formalizado una vez que se firme el contrato, se cargue al portal y se envíe en físico a la siguiente dirección:</p>
              <p style="margin: 12px 0 0; font-size: 13px; color: #111827; font-weight: bold;">Av. Insurgentes Sur 800, Piso 15, Colonia Del Valle, Alcaldía Benito Juárez, Ciudad de México, CP 03100, México</p>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'rechazo') {
      subject = 'SBM — Tu solicitud requiere correcciones'
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">Tu solicitud de crédito requiere <strong>correcciones</strong>:</p>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #DC2626;"><strong>Documentos con inconsistencia:</strong></p>
              <ul style="margin: 0; padding-left: 16px;">
                ${data.docs.map((d: string) => `<li style="font-size: 13px; color: #111827; margin-bottom: 4px;">${d}</li>`).join('')}
              </ul>
              ${data.motivo ? `<p style="margin: 12px 0 0; font-size: 13px; color: #374151;"><strong>Motivo:</strong> ${data.motivo}</p>` : ''}
            </div>
            <p style="font-size: 13px; color: #374151;">Verifica tus documentos en el siguiente link:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${PORTAL_URL}" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">SBM Portal de Crédito</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'director_revision') {
      subject = 'SBM — Solicitud pendiente de aprobación: ' + data.cliente
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito — Dirección Financiera</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">El analista de crédito ha pre-aprobado una solicitud y requiere tu aprobación final.</p>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #1E40AF;"><strong>Detalles de la solicitud:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Cliente: <strong>${data.cliente}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Monto propuesto: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días de crédito: <strong>${data.dias} días</strong></p>
            </div>
            <p style="font-size: 13px; color: #374151;">Revisa el expediente y toma la decisión en el portal de Dirección Financiera:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${DIRECTOR_URL}" style="background: #1E3A5F; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Portal de Dirección Financiera</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'director_aprobado') {
      subject = 'SBM — Dirección Financiera aprobó la solicitud: ' + data.cliente
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">La Dirección Financiera ha <strong>aprobado</strong> la siguiente solicitud y el contrato fue enviado al cliente.</p>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #15803D;"><strong>Solicitud aprobada:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Cliente: <strong>${data.cliente}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Monto: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días de crédito: <strong>${data.dias} días</strong></p>
            </div>
            <p style="font-size: 13px; color: #374151;">El contrato fue enviado al cliente. Puedes dar seguimiento desde el panel:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${ADMIN_URL}" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Panel del Analista</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`

    } else if (type === 'director_rechazado') {
      subject = 'SBM — Dirección Financiera rechazó la solicitud: ' + data.cliente
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; text-align: center;">
            <h1 style="color: white; font-size: 18px; margin: 0;">Savino del Bene México</h1>
            <p style="color: #CBD5E1; font-size: 12px; margin: 4px 0 0;">Portal de Crédito</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 14px; color: #111827;">La Dirección Financiera ha <strong>rechazado</strong> la siguiente solicitud de crédito.</p>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #DC2626;"><strong>Solicitud rechazada:</strong></p>
              <p style="margin: 0; font-size: 13px; color: #111827;">Cliente: <strong>${data.cliente}</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Monto propuesto: <strong>$${Number(data.monto).toLocaleString()} USD</strong></p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #111827;">Días propuestos: <strong>${data.dias} días</strong></p>
              <p style="margin: 12px 0 0; font-size: 13px; color: #374151;"><strong>Motivo de rechazo:</strong> ${data.motivo}</p>
            </div>
            <p style="font-size: 13px; color: #374151;">Revisa el caso y comunica la decisión al cliente desde el panel del analista:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${ADMIN_URL}" style="background: #111827; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold;">Panel del Analista</a>
            </div>
            <p style="font-size: 11px; color: #9CA3AF; margin-top: 32px;">Savino del Bene México — Documento confidencial de uso interno</p>
          </div>
        </div>`
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SBM Portal de Crédito <no-reply@creditossdb.com.mx>',
        to,
        subject,
        html,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      console.error('Resend error:', result)
      return NextResponse.json({ error: result }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error enviando email:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
