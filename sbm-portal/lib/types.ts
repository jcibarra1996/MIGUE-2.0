export type UserRole = 'client' | 'credit_manager' | 'admin'
export type AppStatus = 'draft' | 'under_review' | 'approved' | 'rejected'
export type DocStatus = 'pending' | 'uploaded' | 'approved' | 'rejected'

export type DocType =
  | 'situacion_fiscal'
  | 'opinion_cumplimiento'
  | 'comprobante_domicilio'
  | 'acta_constitutiva'
  | 'poder_notarial'
  | 'id_representante'
  | 'formato_facturacion'
  | 'solicitud_credito'
  | 'carta_consignee'
  | 'autorizacion_buro'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  company_id: string | null
  created_at: string
}

export interface Application {
  id: string
  company_id: string
  status: AppStatus
  credit_amount: number | null
  credit_days: number | null
  contract_url: string | null
  rejection_reason: string | null
  rejected_doc: DocType | null
  submitted_at: string | null
  created_at: string
}

export interface Document {
  id: string
  application_id: string
  doc_type: DocType
  file_url: string | null
  file_name: string | null
  status: DocStatus
  uploaded_at: string | null
}