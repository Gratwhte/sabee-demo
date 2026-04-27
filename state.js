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
invitePreview: null,
inviteContinueRequested: false,
activeInvite: null,

    authMode: 'login',
    landingMode: 'create',
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

  window.formatRemaining = function (expiresAt) {
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };
})();
