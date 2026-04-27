(function () {
  'use strict';

  window.PALETTE = [
    '#EF4444', '#F97316', '#F43F5E', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];

  window.MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  window.TYPE_LABEL = {
    pto: 'Paid Time Off',
    sick: 'Sick Leave',
    parental: 'Parental Leave'
  };

  window.TYPE_ICON = {
    pto: '🏖️',
    sick: '🤒',
    parental: '👶'
  };

  window.DEFAULT_MAX_PTO = 25;

  window.S = {
    session: null,
    user: null,
    profile: null,
    activeTeam: null,
    membership: null,
    memberships: [],
    browseTeams: [],
    joinRequests: [],

    rosterMembers: [],
    daysOff: [],
    selectedMemberId: null,

    month: { y: new Date().getFullYear(), m: new Date().getMonth() },
    pickStart: null,
    hoverDate: null,
    modalRange: null,
    prevFocus: null,

    pendingInviteToken: null,
    invitePreview: null,
    inviteContinueRequested: false,
    activeInvite: null,

    authMode: 'login',
    landingMode: 'create',
    appView: 'calendar', // calendar | admin
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

  window.dstr = function (y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  window.pdate = function (s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  window.today = function () {
    const n = new Date();
    return window.dstr(n.getFullYear(), n.getMonth(), n.getDate());
  };

  window.dmin = function (a, b) {
    return a <= b ? a : b;
  };

  window.dmax = function (a, b) {
    return a >= b ? a : b;
  };

  window.dim = function (y, m) {
    return new Date(y, m + 1, 0).getDate();
  };

  window.sdow = function (y, m) {
    return (new Date(y, m, 1).getDay() + 6) % 7;
  };

  window.dspan = function (a, b) {
    return Math.round((window.pdate(b) - window.pdate(a)) / 864e5) + 1;
  };

  window.fmtS = function (s) {
    return window.pdate(s).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  window.fmtL = function (s) {
    return window.pdate(s).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  window.rosterMember = function (id) {
    return window.S.rosterMembers.find(m => m.id === id) || null;
  };

  window.entFor = function (ds) {
    return window.S.daysOff.filter(e => ds >= e.s && ds <= e.e);
  };

  window.usedDays = function (mid, t) {
    return window.S.daysOff
      .filter(e => e.mid === mid && (!t || e.t === t))
      .reduce((n, e) => n + window.dspan(e.s, e.e), 0);
  };

  window.overlap = function (mid, s, e, xid) {
    return window.S.daysOff.some(en =>
      en.mid === mid &&
      en.id !== xid &&
      s <= en.e &&
      e >= en.s
    );
  };

  window.nextColor = function (list) {
    const used = new Set(list.map(m => m.color));
    return window.PALETTE.find(c => !used.has(c)) || window.PALETTE[list.length % window.PALETTE.length];
  };

  window.statusCls = function (used, max) {
    if (!max || max <= 0) return 'neutral';
    const r = used / max;
    return r >= 0.9 ? 'danger' : r >= 0.7 ? 'warning' : 'low';
  };

  window.isAdmin = function () {
    return ['owner', 'admin'].includes(window.S.membership?.role);
  };
})();
