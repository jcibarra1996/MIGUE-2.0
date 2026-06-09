import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://nhdvdgtvttccfjosuxio.supabase.co',
    'sb_publishable_Pk5l1MLC7rp-4Ln9tw8N4g_65T5536z'
  )
}