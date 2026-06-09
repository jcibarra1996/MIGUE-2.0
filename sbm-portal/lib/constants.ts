import { DocType } from './types'

export const DOC_LABELS: Record<DocType, string> = {
  situacion_fiscal:     'Constancia de Situación Fiscal',
  opinion_cumplimiento: 'Opinión de Cumplimiento',
  comprobante_domicilio:'Comprobante de domicilio',
  acta_constitutiva:   'Acta Constitutiva',
  poder_notarial:      'Poder Notarial',
  id_representante:    'ID Representante Legal',
  formato_facturacion: 'Formato Información Cliente Facturación',
  solicitud_credito:   'Solicitud de Crédito',
  carta_consignee:     'Carta Consignee',
  autorizacion_buro:   'Autorización Buró de Crédito',
}

export const ALL_DOC_TYPES: DocType[] = Object.keys(DOC_LABELS) as DocType[]

export const STATUS_LABELS = {
  draft:        'Borrador',
  under_review: 'En revisión',
  approved:     'Aprobado',
  rejected:     'Rechazado',
}