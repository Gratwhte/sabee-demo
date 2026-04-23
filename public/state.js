window.DEFAULT_MAX_PTO = 25;
window.STORAGE_KEY = 'sabee-data';

window.PALETTE = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#ea580c',
  '#db2777',
  '#0891b2',
  '#65a30d'
];

window.S = {
  members: [],
  daysOff: [],
  selId: null,
  admin: false,
  draft: null,
  draftDirty: false,
  modalRange: null
};

window.OB = {
  members: []
};

window.$ = function (id) {
  return document.getElementById(id);
};

window.esc = function (s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
};

window.member = function (id) {
  return window.S.members.find(m => m.id === id) || null;
};

window.nextColor = function (members) {
  return window.PALETTE[members.length % window.PALETTE.length];
};
