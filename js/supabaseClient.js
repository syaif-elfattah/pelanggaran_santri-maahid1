import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lwbnkkluilxmwaaljntv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3Ym5ra2x1aWx4bXdhYWxqbnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTkzOTEsImV4cCI6MjA5OTE5NTM5MX0.caHPla9sYZQdinPlvr-zyXGmbUY1uRdmuzdc3PuLl0U'

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
window.supabase = client
window.dispatchEvent(new Event('supabase-ready'))

//import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

//const SUPABASE_URL = 'https://qjcnqeyrzryuclwpmala.supabase.co'
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqY25xZXlyenJ5dWNsd3BtYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDIwNjgsImV4cCI6MjA3Nzk3ODA2OH0.WwYGa4gKjoJ8n4fuqpQifgpLPJxHlZuUbtdhiF0OGs8'

//window.supabase = createClient(supabaseUrl, supabaseKey);

// beri tahu app-logic kalau sudah siap
//window.dispatchEvent(new Event('supabase-ready'));


