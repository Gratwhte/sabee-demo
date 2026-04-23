(function () {
  'use strict';

  window.SABEE_CONFIG = {
    SUPABASE_URL: 'sabee-data',
    SUPABASE_ANON_KEY: 'https://kubkxexclpawcnxpgoxu.supabase.co',
    WORKSPACE_ID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Ymt4ZXhjbHBhd2NueHBnb3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzQ4MzAsImV4cCI6MjA5MjUxMDgzMH0.d5BzmGVhJvMYKVEKce8V0D_8unAf_oFIuZ1zqdY83vI'
  };

  window.sb = window.supabase.createClient(
    window.SABEE_CONFIG.SUPABASE_URL,
    window.SABEE_CONFIG.SUPABASE_ANON_KEY
  );
})();
