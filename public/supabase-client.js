window.SABEE_CONFIG = {
  const STORAGE_KEY = 'sabee-data';
  const SUPABASE_URL = 'https://kubkxexclpawcnxpgoxu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Ymt4ZXhjbHBhd2NueHBnb3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ4MzAsImV4cCI6MjA5MjUxMDgzMH0.d5BzmGVhJvMYKVEKce8V0D_8unAf_oFIuZ1zqdY83vI';
};

window.sb = window.supabase.createClient(
  window.SABEE_CONFIG.SUPABASE_URL,
  window.SABEE_CONFIG.SUPABASE_ANON_KEY
);
