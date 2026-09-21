// ============================================================
// Fill these in from: Supabase Dashboard > Project Settings > API
// SUPABASE_URL   -> "Project URL"
// SUPABASE_ANON_KEY -> "anon public" key (safe to expose client-side)
// ============================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Base URL of your deployed redirect edge function (see supabase/functions/redirect)
const REDIRECT_BASE_URL = "https://YOUR-PROJECT-REF.functions.supabase.co/redirect";

// UPI payment details shown on the Pricing page
const UPI_ID = "yourname@upi";
const PLAN_PRICES = { starter: 12, growth: 39 }; // amounts your UPI QR/link should request

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
