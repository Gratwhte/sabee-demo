(function () {
  'use strict';

  window.S = {
    session: null,
    user: null,
    profile: null,
    activeTeam: null,
    membership: null,
    teams: [],
    browseTeams: [],
    joinRequests: [],
    pendingInviteToken: null,

    authMode: 'login',        // login | register
    landingMode: 'create',    // create | join
    loading: true,
    message: null,
    error: null
  };

  window.$ = function (id) {
    return document.getElementById(id);
  };

  window.esc = function (s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  };

  window.slugify = function (s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  window.setMessage = function (text, type = 'info') {
    window.S.message = { text, type };
  };

  window.clearMessage = function () {
    window.S.message = null;
  };

  window.setError = function (text) {
    window.S.error = text;
  };

  window.clearError = function () {
    window.S.error = null;
  };

  window.getInviteTokenFromUrl = function () {
    const url = new URL(window.location.href);
    return url.searchParams.get('invite');
  };

  window.removeInviteTokenFromUrl = function () {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
  };
})();
