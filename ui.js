(function () {
  'use strict';

  window.buildSwatchesHTML = function (currentColor, contextPrefix, index) {
    return window.PALETTE.map(clr =>
      `<button type="button" class="color-swatch${clr===currentColor?' active':''}"
        style="background:${clr}" data-ctx="${contextPrefix}" data-i="${index}" data-color="${clr}"
        aria-label="Color ${clr}${clr===currentColor?' (selected)':''}"></button>`
    ).join('');
  };

  window.closeAllPopovers = function () {
    document.querySelectorAll('.color-popover.open').forEach(p => p.classList.remove('open'));
    window.activePopover = null;
  };

  window.togglePopover = function (triggerEl) {
    const popover = triggerEl.querySelector('.color-popover') || triggerEl.nextElementSibling;
    if (!popover || !popover.classList.contains('color-popover')) return;

    if (popover.classList.contains('open')) {
      popover.classList.remove('open');
      window.activePopover = null;
    } else {
      window.closeAllPopovers();
      popover.classList.add('open');
      window.activePopover = popover;
      const first = popover.querySelector('.color-swatch');
      if (first) setTimeout(() => first.focus(), 50);
    }
  };

  document.addEventListener('click', e => {
    if (
      window.activePopover &&
      !e.target.closest('.color-popover-anchor') &&
      !e.target.closest('.color-popover')
    ) {
      window.closeAllPopovers();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window.activePopover) {
      window.closeAllPopovers();
    }
  });

  window.setSyncStatus = function (status) {
    const el = document.getElementById('sync-status');
    if (!el) return;

    const map = {
      saved:    { text: '✓ Synced', cls: 'sync-ok' },
      saving:   { text: '↑ Saving…', cls: 'sync-busy' },
      offline:  { text: '⚡ Offline — local only', cls: 'sync-warn' },
      conflict: { text: '↻ Newer data found…', cls: 'sync-warn' },
      updated:  { text: '↓ Updated from team', cls: 'sync-info' }
    };

    const s = map[status] || map.saved;
    el.textContent = s.text;
    el.className = 'sync-status ' + s.cls;
  };

  window.showOnboarding = function () {
    window.OB.members = [];
    window.$('onboarding').classList.remove('hidden');
    window.$('app-wrap').classList.remove('active');
    window.renderOnboarding();
    setTimeout(() => window.$('ob-name-input').focus(), 100);
  };

  window.renderOnboarding = function () {
    const list = window.$('ob-members');

    if (!window.OB.members.length) {
      list.innerHTML = '<p class="onboarding-empty">No team members added yet.</p>';
    } else {
      list.innerHTML = window.OB.members.map((m, i) =>
        `<div class="onboarding-member">
          <div class="color-popover-anchor">
            <span class="onboarding-member-color" style="background:${m.color}"
              data-ctx="ob" data-i="${i}" role="button" tabindex="0"
              aria-label="Change color for ${window.esc(m.name)}"></span>
            <div class="color-popover" aria-label="Choose color">${window.buildSwatchesHTML(m.color, 'ob', i)}</div>
          </div>
          <span class="onboarding-member-name">${window.esc(m.name)}</span>
          <button class="btn btn-ghost onboarding-member-remove" data-i="${i}" aria-label="Remove ${window.esc(m.name)}">✕</button>
        </div>`
      ).join('');
    }

    const n = window.OB.members.length;
    window.$('ob-count').textContent = n ? `${n} member${n > 1 ? 's' : ''} added` : '';
    window.$('ob-start-btn').disabled = n < 1;
  };

  window.render = function () {
    window.renderHeader();

    if (window.S.admin) {
      window.$('user-mode').classList.add('hidden');
      window.$('admin-mode').classList.remove('hidden');
      window.renderAdmin();
    } else {
      window.$('admin-mode').classList.add('hidden');
      window.$('user-mode').classList.remove('hidden');
      window.renderCalendar();
      window.renderSidebar();
      window.renderEntries();
    }
  };

  window.renderHeader = function () {
    const m = window.member(window.S.selId);
    window.$('user-color-dot').style.background = m ? m.color : '#ccc';
    window.$('active-user-name').textContent = m ? m.name : '';
    window.$('active-user').classList.toggle('hidden', window.S.admin);
    window.$('admin-toggle').textContent = window.S.admin ? '← Calendar' : '⚙ Admin';
  };

  window.renderCalendar = function () {
    const { y, m } = window.S.month;
    window.$('month-title').textContent = `${window.MONTHS[m]} ${y}`;

    const days = window.dim(y, m);
    const start = window.sdow(y, m);
    const td = window.today();
    const prevDays = window.dim(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);

    let h = '';

    for (let i = 0; i < start; i++) {
      const d = prevDays - start + 1 + i;
      h += `<div class="day-cell other-month" aria-hidden="true"><span class="day-number">${d}</span></div>`;
    }

    for (let d = 1; d <= days; d++) {
      const ds = window.dstr(y, m, d);
      const dt = new Date(y, m, d);
      const wk = dt.getDay() === 0 || dt.getDay() === 6;
      const t = ds === td;
      const ss = window.S.pickStart === ds;

      let ir = false;
      if (window.S.pickStart && window.S.hoverDate && !window.S.modalRange) {
        const rs = window.dmin(window.S.pickStart, window.S.hoverDate);
        const re = window.dmax(window.S.pickStart, window.S.hoverDate);
        ir = ds >= rs && ds <= re;
      }

      const cls = [
        'day-cell',
        'cm',
        wk ? 'weekend' : '',
        t ? 'today' : '',
        ss ? 'selection-start' : '',
        ir ? 'in-range' : ''
      ].filter(Boolean).join(' ');

      const entries = window.entFor(ds);

      h += `<div class="${cls}" data-d="${ds}" role="gridcell" tabindex="0"
            aria-label="${window.fmtL(ds)}${entries.length ? '. ' + entries.length + ' day(s) off logged' : ''}">
            <span class="day-number">${d}</span>
            <div class="day-dots">${window.renderDots(entries)}</div></div>`;
    }

    const tot = start + days;
    const rem = (7 - tot % 7) % 7;
    for (let i = 1; i <= rem; i++) {
      h += `<div class="day-cell other-month" aria-hidden="true"><span class="day-number">${i}</span></div>`;
    }

    window.$('calendar-days').innerHTML = h;
    window.updateSelectionStatus();
  };

  window.renderDots = function (entries) {
    if (!entries.length) return '';

    const MAX = 7;
    let show = entries;
    let extra = false;

    if (entries.length > MAX) {
      show = entries.slice(0, MAX - 1);
      extra = true;
    }

    let h = show.map(e => {
      const m = window.member(e.mid);
      if (!m) return '';

      if (e.t === 'sick') {
        return `<span class="dot dot-sick" style="border-color:${m.color}" aria-label="${window.esc(m.name)}: Sick Leave"></span>`;
      }

      if (e.t === 'parental') {
        return `<span class="dot dot-parental" style="background:${m.color}" aria-label="${window.esc(m.name)}: Parental Leave"></span>`;
      }

      return `<span class="dot" style="background:${m.color}" aria-label="${window.esc(m.name)}: PTO"></span>`;
    }).join('');

    if (extra) {
      const r = entries.length - (MAX - 1);
      h += `<span class="dot-ellipsis" title="+${r} more" aria-label="${r} more entries">…</span>`;
    }

    return h;
  };

  window.updateSelectionStatus = function () {
    const box = window.$('selection-status');

    if (window.S.pickStart && !window.S.modalRange) {
      box.classList.remove('hidden');
      window.$('selection-text').textContent = `Start: ${window.fmtS(window.S.pickStart)} — click another day to complete`;
    } else {
      box.classList.add('hidden');
    }
  };

  window.updateRangeHighlight = function () {
    document.querySelectorAll('.day-cell.cm').forEach(cell => {
      const ds = cell.dataset.d;
      cell.classList.remove('in-range');

      if (window.S.pickStart && window.S.hoverDate && !window.S.modalRange) {
        const rs = window.dmin(window.S.pickStart, window.S.hoverDate);
        const re = window.dmax(window.S.pickStart, window.S.hoverDate);
        if (ds >= rs && ds <= re) cell.classList.add('in-range');
      }
    });
  };

  window.renderSidebar = function () {
    if (!window.S.members.length) {
      window.$('summary-list').innerHTML = '<p class="empty-note">No team members yet.</p>';
      return;
    }

    window.$('summary-list').innerHTML = window.S.members.map(m => {
      const usedPTO = window.usedDays(m.id, 'pto');
      const usedParental = window.usedDays(m.id, 'parental');

      return `<button class="summary-card ${window.S.selId===m.id?'active':''}" data-mid="${m.id}" style="--member-color:${m.color}">
        <div class="summary-card-head">
          <span class="summary-card-name">${window.esc(m.name)}</span>
          <span class="summary-card-dot" style="background:${m.color}"></span>
        </div>

        <div class="summary-meter-block">
          <div class="summary-label-row">
            <span>PTO</span>
            <span>${usedPTO}/${m.maxPTO}</span>
          </div>
          <div class="meter">
            <span class="meter-fill ${window.statusCls(usedPTO, m.maxPTO)}" style="width:${Math.min(100, m.maxPTO ? (usedPTO / m.maxPTO) * 100 : 0)}%"></span>
          </div>
        </div>

        <div class="summary-meter-block">
          <div class="summary-label-row">
            <span>Parental</span>
            <span>${usedParental}/${m.maxParental}</span>
          </div>
          <div class="meter">
            <span class="meter-fill ${window.statusCls(usedParental, m.maxParental)}" style="width:${Math.min(100, m.maxParental ? (usedParental / m.maxParental) * 100 : 0)}%"></span>
          </div>
        </div>
      </button>`;
    }).join('');
  };

  window.renderEntries = function () {
    const m = window.member(window.S.selId);
    if (!m) {
      window.$('entries-list').innerHTML = '<p class="empty-note">Select a team member.</p>';
      return;
    }

    const entries = window.S.daysOff
      .filter(e => e.mid === m.id)
      .sort((a, b) => a.s.localeCompare(b.s));

    if (!entries.length) {
      window.$('entries-list').innerHTML = '<p class="empty-note">No days off logged yet.</p>';
      return;
    }

    window.$('entries-list').innerHTML = entries.map(e => {
      const days = window.dspan(e.s, e.e);
      return `<div class="entry-card">
        <div class="entry-main">
          <div class="entry-title">${window.TYPE_ICON[e.t]} ${window.TYPE_LABEL[e.t]}</div>
          <div class="entry-meta">${window.fmtS(e.s)} → ${window.fmtS(e.e)} · ${days} day${days > 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn-ghost entry-delete" data-eid="${e.id}" aria-label="Delete entry">✕</button>
      </div>`;
    }).join('');
  };

  window.renderAdmin = function () {
    if (!window.S.draft) {
      window.S.draft = {
        members: window.S.members.map(m => ({ ...m })),
        removedIds: []
      };
    }

    const rows = window.S.draft.members.map((m, i) => {
      const usedPTO = window.usedDays(m.id, 'pto');
      const usedParental = window.usedDays(m.id, 'parental');

      return `<div class="admin-member-row">
        <div class="admin-member-main">
          <div class="color-popover-anchor">
            <button type="button" class="admin-color-trigger" style="background:${m.color}" aria-label="Change color for ${window.esc(m.name || 'member')}"></button>
            <div class="color-popover" aria-label="Choose color">${window.buildSwatchesHTML(m.color, 'admin', i)}</div>
          </div>

          <input id="an${i}" class="input admin-name-input" data-i="${i}" value="${window.esc(m.name)}" placeholder="Name" />

          <div class="admin-number-group">
            <label>PTO</label>
            <input class="input admin-pto-input" data-i="${i}" type="number" min="0" value="${m.maxPTO}" />
          </div>

          <div class="admin-number-group">
            <label>Parental</label>
            <input class="input admin-parental-input" data-i="${i}" type="number" min="0" value="${m.maxParental}" />
          </div>

          <button type="button" class="btn btn-ghost admin-remove" data-i="${i}" aria-label="Remove member">✕</button>
        </div>

        <div class="admin-usage-row">
          <span>Used PTO: ${usedPTO}</span>
          <span>Used Parental: ${usedParental}</span>
        </div>
      </div>`;
    }).join('');

    window.$('admin-members').innerHTML =
      rows || '<p class="empty-note">No members yet.</p>';

    const saveBtn = window.$('admin-save-btn');
    if (saveBtn) saveBtn.disabled = !window.S.draftDirty;
  };

window.openModal = function (start, end) {
  const m = window.member(window.S.selId);
  if (!m) return;

  window.S.modalRange = { s: start, e: end };
  window.S.prevFocus = document.activeElement;

  const memberEl = window.$('modal-member');
  const datesEl = window.$('modal-dates');
  const parentalBtn = window.$('modal-btn-parental');
  const overlay = window.$('modal-overlay');

  if (memberEl) memberEl.textContent = m.name;
  if (datesEl) datesEl.textContent = `${window.fmtL(start)} → ${window.fmtL(end)}`;
  if (parentalBtn) parentalBtn.disabled = m.maxParental <= 0;

  overlay.classList.remove('hidden');

  setTimeout(() => {
    const btn = window.$('modal-btn-pto');
    if (btn) btn.focus();
  }, 30);
};

  window.closeModal = function () {
    window.S.modalRange = null;
    window.$('modal-overlay').classList.add('hidden');
    if (window.S.prevFocus && window.S.prevFocus.focus) {
      window.S.prevFocus.focus();
    }
  };

  window.showTooltip = function (cell, ds) {
    const tip = window.$('tooltip');
    if (!tip) return;

    const entries = window.entFor(ds);
    if (!entries.length) {
      tip.classList.remove('visible');
      return;
    }

    tip.innerHTML = entries.map(e => {
      const m = window.member(e.mid);
      if (!m) return '';
      return `<div class="tooltip-entry">
        <span class="tooltip-dot" style="background:${m.color}"></span>
        <span>${window.esc(m.name)} — ${window.TYPE_LABEL[e.t]}</span>
      </div>`;
    }).join('');

    const r = cell.getBoundingClientRect();
    tip.style.left = `${window.scrollX + r.left + r.width / 2}px`;
    tip.style.top = `${window.scrollY + r.top - 8}px`;
    tip.classList.add('visible');
  };

  window.hideTooltip = function () {
    const tip = window.$('tooltip');
    if (tip) tip.classList.remove('visible');
  };
})();
