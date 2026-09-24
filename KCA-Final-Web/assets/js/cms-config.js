/* ============================================================
   KCA website editor — settings
   Paste the two values from Supabase → Project Settings → API.
   (The "anon public" key is meant to be public; the database
   rules in supabase/setup.sql are what protect your content.)
   ============================================================ */
window.KCA_CMS = {
  supabaseUrl: 'https://ludagoefybarccnkqdjf.supabase.co',      // e.g. 'https://abcdxyz.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGFnb2VmeWJhcmNjbmtxZGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDU3NTQsImV4cCI6MjEwNTgyMTc1NH0.AAaVJbRrOwMddgn2LkTWogdt9a5ifyOPLxR_mM2Y7k4',    // e.g. 'eyJhbGciOi...'
  allowedDomain: 'kca.org.ua'
};
