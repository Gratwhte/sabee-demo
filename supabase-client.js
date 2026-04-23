(function () {
  'use strict';

  window.SABEE_CONFIG = {
    SUPABASE_URL: 'sabee-data',
    SUPABASE_ANON_KEY: 'https://kubkxexclpawcnxpgoxu.supabase.co',
    WORKSPACE_ID: '6ce77f35-92a6-4261-8830-9d1cc421c672'
  };

  window.sb = window.supabase.createClient(
    window.SABEE_CONFIG.SUPABASE_URL,
    window.SABEE_CONFIG.SUPABASE_ANON_KEY
  );
})();
