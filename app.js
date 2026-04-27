(function () {
  'use strict';

  window.obAdd = function () {
    const inp = window.$('ob-name-input');
    const err = window.$('ob-error');
    if (!inp) return;

    const name = inp.value.trim();

    if (err) {
      err.textContent = '';
      err.classList.remove('visible');
    }

    if (!name) {
      if (err) {
        err.textContent = 'Please enter a name.';
        err.classList.add('visible');
      }
      inp.focus();
      return;
    }

    if (window.OB.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      if (err) {
        err.textContent = 'This name is already in the list.';
        err.classList.add('visible');
      }
      inp.focus();
      return;
    }

    window.OB.members.push({
      name,
      color: window.nextColor(window.OB.members)
    });

    inp.value = '';
    window.renderOnboarding();
    inp.focus();
  };

  window.obRemove = function (i) {
    window.OB.members.splice(i, 1);
    window.renderOnboarding();
  };

  window.obStart = async function () {
    if (!window.OB.members.length) return;

    try {
      for (const m of window.OB.members) {
        await window.createMember({
          id: crypto.randomUUID(),
          name: m.name,
          color: m.color,
          maxPTO: window.DEFAULT_MAX_PTO,
          maxParental: 0
        });
      }

      await window.loadFromSupabase();
      window.S.selId = window.S.members.length ? window.S.members[0].id : null;

      window.$('onboarding')?.classList.add('hidden');
      window.$('app-wrap')?.classList.add('active');
      window.bindApp();
      window.render();
    } catch (e) {
      console.error('Onboarding failed', e);
      alert('Failed to create team.');
    }
  };

  window.confirmType = async function (type) {
    if (!window.S.modalRange || !window.S.selId) return;

    const m = window.member(window.S.selId);
    if (!m) return;

    const { s, e } = window.S.modalRange;

    if (window.overlap(m.id, s, e)) return;
    if (type === 'parental' && m.maxParental <= 0) return;

    try {
      await window.createDayOff({
        id: crypto.randomUUID(),
        mid: m.id,
        s,
        e,
        t: type,
        note: ''
      });

      await window.loadFromSupabase();
      window.closeModal();
      window.render();
    } catch (err) {
      console.error('Failed to create day off entry', err);
      alert('Failed to save day off entry.');
    }
  };

  window.onDayClick = function (ds) {
    if (!window.S.selId) return;

    if (!window.S.pickStart) {
      window.S.pickStart = ds;
      window.S.hoverDate = ds;
      window.renderCalendar();
      return;
    }

    const s = window.dmin(window.S.pickStart, ds);
    const e = window.dmax(window.S.pickStart, ds);

    window.S.pickStart = null;
    window.S.hoverDate = null;
    window.renderCalendar();
    window.openModal(s, e);
  };

  window.navMonth = function (dir) {
    let { y, m } = window.S.month;
    m += dir;

    if (m < 0) {
      m = 11;
      y -= 1;
    }

    if (m > 11) {
      m = 0;
      y += 1;
    }

    window.S.month = { y, m };
    window.renderCalendar();
  };

  window.toggleAdmin = function () {
    window.S.admin = !window.S.admin;

    if (window.S.admin) {
      window.S.draft = {
        members: window.S.members.map(m => ({ ...m })),
        removedIds: []
      };
      window.S.draftDirty = false;
    }

    window.render();
  };

  window.adminDiscard = function () {
    window.S.draft = {
      members: window.S.members.map(m => ({ ...m })),
      removedIds: []
    };
    window.S.draftDirty = false;
    window.renderAdmin();
  };

  window.adminAdd = function () {
    if (!window.S.draft) return;

    window.S.draft.members.push({
      id: crypto.randomUUID(),
      name: '',
      color: window.nextColor(window.S.draft.members),
      maxPTO: window.DEFAULT_MAX_PTO,
      maxParental: 0
    });

    window.S.draftDirty = true;
    window.closeAllPopovers();
    window.renderAdmin();

    const idx = window.S.draft.members.length - 1;
    setTimeout(() => {
      const inp = window.$('an' + idx);
      if (inp) inp.focus();
    }, 60);
  };

  window.adminRemove = function (i) {
    if (!window.S.draft || !window.S.draft.members[i]) return;

    const removed = window.S.draft.members[i];
    if (removed && removed.id) {
      window.S.draft.removedIds.push(removed.id);
    }

    window.S.draft.members.splice(i, 1);
    window.S.draftDirty = true;
    window.closeAllPopovers();
    window.renderAdmin();
  };

  window.adminReset = async function () {
    const ok = confirm('This will permanently delete all members and all days off for this workspace. Continue?');
    if (!ok) return;

    try {
      await window.clearAllWorkspaceData();

      window.S.members = [];
      window.S.daysOff = [];
      window.S.selId = null;
      window.S.pickStart = null;
      window.S.hoverDate = null;
      window.S.admin = false;
      window.S.draft = null;
      window.S.draftDirty = false;
      window.S.modalRange = null;

      window.closeModal();
      window.showOnboarding();
    } catch (err) {
      console.error('Admin reset failed', err);
      alert('Failed to reset workspace data.');
    }
  };

  window.adminSave = async function () {
    if (!window.S.draft) return;

    if (window.S.draft.members.some(m => !m.name.trim())) {
      alert('All members must have a name.');
      return;
    }

    const names = window.S.draft.members.map(m => m.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      alert('Member names must be unique.');
      return;
    }

    try {
      const currentById = new Map(window.S.members.map(m => [m.id, m]));
      const draftById = new Map(window.S.draft.members.map(m => [m.id, m]));

      for (const existing of window.S.members) {
        if (!draftById.has(existing.id)) {
          await window.deleteMember(existing.id);
        }
      }

      for (const draftMember of window.S.draft.members) {
        const existing = currentById.get(draftMember.id);

        if (!existing) {
          await window.createMember(draftMember);
          continue;
        }

        const changed =
          existing.name !== draftMember.name ||
          existing.color !== draftMember.color ||
          existing.maxPTO !== draftMember.maxPTO ||
          existing.maxParental !== draftMember.maxParental;

        if (changed) {
          await window.updateMember(draftMember);
        }
      }

      await window.loadFromSupabase();

      if (!window.S.members.find(m => m.id === window.S.selId)) {
        window.S.selId = window.S.members.length ? window.S.members[0].id : null;
      }

      window.S.draftDirty = false;
      window.render();

      const b = window.$('admin-save-btn');
      if (b) {
        const t = b.textContent;
        b.textContent = '✓ Saved!';
        b.disabled = true;
        setTimeout(() => {
          b.textContent = t;
          b.disabled = false;
        }, 1200);
      }
    } catch (err) {
      console.error('Admin save failed', err);
      alert('Failed to save team changes.');
    }
  };

  window.trapFocus = function (e) {
    if (e.key !== 'Tab' || !window.S.modalRange) return;

    const nodes = Array.from(
      document.querySelectorAll('#modal-overlay button, #modal-overlay [href], #modal-overlay input, #modal-overlay select, #modal-overlay textarea, #modal-overlay [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.disabled);

    if (!nodes.length) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  window.bindOnboarding = function () {
    const addBtn = window.$('ob-add-btn');
    const input = window.$('ob-name-input');
    const members = window.$('ob-members');
    const startBtn = window.$('ob-start-btn');

    if (addBtn) addBtn.addEventListener('click', window.obAdd);

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.obAdd();
        }
      });
    }

    if (members) {
      members.addEventListener('click', e => {
        const btn = e.target.closest('.onboarding-member-remove');
        if (btn) {
          window.obRemove(parseInt(btn.dataset.i, 10));
          return;
        }

        const dot = e.target.closest('.onboarding-member-color');
        if (dot) {
          e.stopPropagation();
          window.togglePopover(dot.parentElement);
          return;
        }

        const swatch = e.target.closest('.color-swatch[data-ctx="ob"]');
        if (swatch) {
          const i = parseInt(swatch.dataset.i, 10);
          const clr = swatch.dataset.color;
          if (!isNaN(i) && window.OB.members[i] && clr) {
            window.OB.members[i].color = clr;
            window.closeAllPopovers();
            window.renderOnboarding();
          }
        }
      });

      members.addEventListener('keydown', e => {
        const dot = e.target.closest('.onboarding-member-color');
        if (dot && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          window.togglePopover(dot.parentElement);
        }
      });
    }

    if (startBtn) startBtn.addEventListener('click', window.obStart);
  };

  window.bindApp = function () {
    if (window.appBound) return;
    window.appBound = true;

    const prevMonth = window.$('prev-month');
    const nextMonth = window.$('next-month');
    const adminToggle = window.$('admin-toggle');
    const calendarDays = window.$('calendar-days');
    const selectionCancel = window.$('selection-cancel');
    const summaryList = window.$('summary-list');
    const modalBtnPto = window.$('modal-btn-pto');
    const modalBtnSick = window.$('modal-btn-sick');
    const modalBtnParental = window.$('modal-btn-parental');
    const modalCancel = window.$('modal-cancel');
    const modalOverlay = window.$('modal-overlay');
    const entriesList = window.$('entries-list');
    const adminMembers = window.$('admin-members');
    const adminAddBtn = window.$('admin-add-btn');
    const adminSaveBtn = window.$('admin-save-btn');
    const adminDiscardBtn = window.$('admin-discard-btn');
    const adminResetBtn = window.$('admin-reset-btn');

    if (prevMonth) prevMonth.addEventListener('click', () => window.navMonth(-1));
    if (nextMonth) nextMonth.addEventListener('click', () => window.navMonth(1));
    if (adminToggle) adminToggle.addEventListener('click', window.toggleAdmin);

    if (calendarDays) {
      calendarDays.addEventListener('click', e => {
        const c = e.target.closest('.day-cell.cm');
        if (c) window.onDayClick(c.dataset.d);
      });

      calendarDays.addEventListener('mouseover', e => {
        const c = e.target.closest('.day-cell.cm');
        if (!c) return;

        if (window.S.pickStart && !window.S.modalRange) {
          window.S.hoverDate = c.dataset.d;
          window.updateRangeHighlight();
        }

        window.showTooltip(c, c.dataset.d);
      });

      calendarDays.addEventListener('mouseleave', () => {
        window.S.hoverDate = null;
        window.hideTooltip();
        window.updateRangeHighlight();
      });

      calendarDays.addEventListener('keydown', e => {
        const c = e.target.closest('.day-cell.cm');
        if (c && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          window.onDayClick(c.dataset.d);
        }
      });
    }

    if (selectionCancel) {
      selectionCancel.addEventListener('click', () => {
        window.S.pickStart = null;
        window.S.hoverDate = null;
        window.renderCalendar();
      });
    }

    document.addEventListener('keydown', e => {
      if (window.S.modalRange) {
        window.trapFocus(e);
        return;
      }

      if (e.key === 'Escape' && window.S.pickStart) {
        window.S.pickStart = null;
        window.S.hoverDate = null;
        window.renderCalendar();
      }
    });

    if (summaryList) {
      summaryList.addEventListener('click', e => {
        const card = e.target.closest('.summary-card[data-mid]');
        if (!card) return;

        window.S.selId = card.dataset.mid;
        window.S.pickStart = null;
        window.S.hoverDate = null;
        window.render();
      });

      summaryList.addEventListener('keydown', e => {
        const card = e.target.closest('.summary-card[data-mid]');
        if (card && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          window.S.selId = card.dataset.mid;
          window.S.pickStart = null;
          window.S.hoverDate = null;
          window.render();
        }
      });
    }

    if (modalBtnPto) modalBtnPto.addEventListener('click', () => window.confirmType('pto'));
    if (modalBtnSick) modalBtnSick.addEventListener('click', () => window.confirmType('sick'));
    if (modalBtnParental) modalBtnParental.addEventListener('click', () => window.confirmType('parental'));
    if (modalCancel) modalCancel.addEventListener('click', window.closeModal);

    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === e.currentTarget) window.closeModal();
      });
    }

    if (entriesList) {
      entriesList.addEventListener('click', async e => {
        const btn = e.target.closest('.entry-delete');
        if (!btn) return;
        if (!confirm('Delete this day off entry?')) return;

        try {
          await window.deleteDayOff(btn.dataset.eid);
          await window.loadFromSupabase();
          window.render();
        } catch (err) {
          console.error('Failed to delete day off entry', err);
          alert('Failed to delete entry.');
        }
      });
    }

    if (adminMembers) {
      adminMembers.addEventListener('click', e => {
        const trigger = e.target.closest('.admin-color-trigger');
        if (trigger) {
          e.stopPropagation();
          window.togglePopover(trigger.parentElement);
          return;
        }

        const swatch = e.target.closest('.color-swatch[data-ctx="admin"]');
        if (swatch) {
          const i = parseInt(swatch.dataset.i, 10);
          const clr = swatch.dataset.color;
          if (!isNaN(i) && window.S.draft && window.S.draft.members[i] && clr) {
            window.S.draft.members[i].color = clr;
            window.S.draftDirty = true;
            window.closeAllPopovers();
            window.renderAdmin();
          }
          return;
        }

        const btn = e.target.closest('.admin-remove');
        if (btn) window.adminRemove(parseInt(btn.dataset.i, 10));
      });

      adminMembers.addEventListener('input', e => {
        const i = parseInt(e.target.dataset.i, 10);
        if (isNaN(i) || !window.S.draft || !window.S.draft.members[i]) return;

        if (e.target.classList.contains('admin-name-input')) {
          window.S.draft.members[i].name = e.target.value;
          window.S.draftDirty = true;
          window.refreshAdminSaveState();
          return;
        }

        if (e.target.classList.contains('admin-pto-input')) {
          window.S.draft.members[i].maxPTO = Math.max(0, parseInt(e.target.value || '0', 10));
          window.S.draftDirty = true;
          window.refreshAdminSaveState();
          return;
        }

        if (e.target.classList.contains('admin-parental-input')) {
          window.S.draft.members[i].maxParental = Math.max(0, parseInt(e.target.value || '0', 10));
          window.S.draftDirty = true;
          window.refreshAdminSaveState();
        }
      });
    }

    if (adminAddBtn) adminAddBtn.addEventListener('click', window.adminAdd);
    if (adminSaveBtn) adminSaveBtn.addEventListener('click', window.adminSave);
    if (adminDiscardBtn) adminDiscardBtn.addEventListener('click', window.adminDiscard);
    if (adminResetBtn) adminResetBtn.addEventListener('click', window.adminReset);
  };

  window.init = async function () {
    window.bindOnboarding();

    if (await window.load()) {
      window.$('onboarding')?.classList.add('hidden');
      window.$('app-wrap')?.classList.add('active');
      window.bindApp();
      window.render();
    } else {
      window.showOnboarding();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.init);
  } else {
    window.init();
  }
})();
