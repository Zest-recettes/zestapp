import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ljlwlsefivdiuszmuzsb.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbHdsc2VmaXZkaXVzem11enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Nzg2MDgsImV4cCI6MjA4OTA1NDYwOH0.PVe_wvdB5I17ebAtL3SioyzMEM2sBcgvMlOauQJ_kDo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
