import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zvekwikzpjssudzeeian.supabase.co'
const supabaseKey = 'sb_publishable_2PzXSYHPmhFVHbD4z3toYQ_6l1TJkpg'

export const supabase = createClient(supabaseUrl, supabaseKey)