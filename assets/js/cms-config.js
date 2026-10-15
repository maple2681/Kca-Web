/* ============================================================
   KCA website editor — settings
   Paste the two values from Supabase → Project Settings → API.
   (The "anon public" key is meant to be public; the database
   rules in supabase/setup.sql are what protect your content.)
   ============================================================ */
window.KCA_CMS = {
  supabaseUrl: 'https://llxceawtuhbinpdgklog.supabase.co',      // e.g. 'https://abcdxyz.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxseGNlYXd0dWhiaW5wZGdrbG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODYzMjksImV4cCI6MjEwNjc2MjMyOX0.GUj81eioWh-mLIAy6WGH9__z956F8iFJvQFc75YyEbs',    // e.g. 'eyJhbGciOi...'
  allowedDomain: 'kca.org.ua'
};
