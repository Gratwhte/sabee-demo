(function () {
  'use strict';

  let inviteCountdownTimer = null;

  function startInviteCountdown() {
    if (inviteCountdownTimer) {
      clearInterval(inviteCountdownTimer);
      inviteCountdownTimer = null;
    }

    inviteCountdownTimer = setInterval(() => {
      if (window.S.activeInvite && window.S.activeInvite.is_active) {
        const countdownEl = window.$('active-invite-countdown');
        if (countdownEl) {
          countdownEl.textContent = window.formatRemaining(window.S.activeInvite.expires_at);
        }
      }

      if (window.S.invitePreview && !window.S.user) {
        const previewCountdown = window.$('invite-preview-countdown');
        if (previewCountdown && window.S.invitePreview?.expires_at) {
          previewCountdown.textContent = window.formatRemaining(window.S.invitePreview.expires_at);
        }
      }
    }, 1000);
  }

  async function refreshTeamScopedData() {
    if (!window.S.activeTeam) return;

    const teamId = window.S.activeTeam.id;

    const promises = [
      window.loadTeamMemberships(teamId),
      window.loadRosterMembers(teamId),
      window.loadDaysOff(teamId),
      window.loadActiveInvite(teamId)
    ];

    if (window.isAdmin()) {
      promises.unshift(window.loadPendingRequestsForMyTeam(teamId));
    } else {
      promises.unshift(Promise.resolve([]));
    }

    const [requests, memberships, rosterMembers, daysOff, activeInvite] = await Promise.all(promises);

    window.S.joinRequests = requests;
    window.S.memberships = memberships;
    window.S.rosterMembers = rosterMembers;
    window.S.daysOff = daysOff;
    window.S.activeInvite = activeInvite;

    if (!window.S.rosterMembers.find(m => m.id === window.S.selectedMemberId)) {
      window.S.selectedMemberId = window.S.rosterMembers.length ? window.S.rosterMembers[0].id : null;
    }
  }

  async function refreshActiveTeamState() {
    await window.bootstrapAuthState();

    if (window.S.activeTeam) {
      try {
        await refreshTeamScopedData();
      } catch (err) {
        console.error(err);
        window.setError(err.message || 'Failed to load team data.');
      }
    } else {
      window.S.joinRequests = [];
      window.S.memberships = [];
      window.S.rosterMembers = [];
      window.S.daysOff = [];
      window.S.activeInvite = null;
      window.S.selectedMemberId = null;
    }
  }

  async function refreshBrowseTeams(search = '') {
    try {
      window.S.browseTeams = await window.loadBrowseTeams(search);
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Failed to load teams.');
    }
  }

  async function loadInvitePreviewIfPresent() {
    const token = window.getInviteTokenFromUrl();
    window.S.pendingInviteToken = token || null;
    window.S.invitePreview = null;
    window.S.inviteContinueRequested = false;

    if (!token) return;

    try {
      const preview = await window.loadInvitePreview(token);
      window.S.invitePreview = preview;
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Could not load invite preview.');
    }
  }

  async function continueInviteFlowAfterAuth() {
    if (!window.S.pendingInviteToken) return;
    if (!window.S.user) return;

    const ok = window.confirm(
      'In this version of Sabee, you can only belong to one team at a time. ' +
      'Joining this invited team will replace your current active team membership if you already have one. Continue?'
    );

    if (!ok) return;

    try {
      await window.acceptInvite(window.S.pendingInviteToken);
      window.removeInviteTokenFromUrl();
      window.S.pendingInviteToken = null;
      window.S.invitePreview = null;
      window.S.inviteContinueRequested = false;
      window.setMessage('Invite accepted. Your active team has been updated.', 'success');
      await refreshActiveTeamState();
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Could not accept invite.');
    }
  }

  function navMonth(dir) {
    let { y, m } = window.S.month;
    m += dir;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    window.S.month = { y, m };
    window.render();
  }

  function onDayClick(ds) {
    if (!window.isAdmin()) return;
    if (!window.S.selectedMemberId) return;

    if (!window.S.pickStart) {
      window.S.pickStart = ds;
      window.S.hoverDate = ds;
      window.render();
      return;
    }

    const s = window.dmin(window.S.pickStart, ds);
    const e = window.dmax(window.S.pickStart, ds);

    window.S.pickStart = null;
    window.S.hoverDate = null;
    window.S.modalRange = { s, e };
    window.render();
  }

  async function confirmDayOffType(type) {
    if (!window.S.modalRange || !window.S.selectedMemberId || !window.S.activeTeam) return;

    const m = window.rosterMember(window.S.selectedMemberId);
    if (!m) return;

    const { s, e } = window.S.modalRange;

    if (window.overlap(m.id, s, e)) return;
    if (type === 'parental' && m.maxParental <= 0) return;

    try {
      await window.createDayOff(window.S.activeTeam.id, {
        mid: m.id,
        s,
        e,
        t: type,
        note: ''
      });

      window.S.modalRange = null;
      await refreshTeamScopedData();
      window.setMessage('Day off entry created.', 'success');
      window.render();
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Failed to create day off entry.');
      window.render();
    }
  }

  async function addRosterMember() {
    if (!window.S.activeTeam) return;

    const name = window.$('new-member-name')?.value?.trim();
    const color = window.$('new-member-color')?.value || window.nextColor(window.S.rosterMembers);
    const maxPTO = Math.max(0, parseInt(window.$('new-member-pto')?.value || '25', 10));
    const maxParental = Math.max(0, parseInt(window.$('new-member-parental')?.value || '0', 10));

    if (!name) {
      window.setError('Roster member name is required.');
      window.render();
      return;
    }

    try {
      await window.createRosterMember(window.S.activeTeam.id, {
        name,
        color,
        maxPTO,
        maxParental,
        userId: null
      });

      await refreshTeamScopedData();
      window.setMessage('Roster member added.', 'success');
      window.render();
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Failed to add roster member.');
      window.render();
    }
  }

  async function saveEditedRosterMember() {
    const m = window.S.editingMember;
    if (!m) return;

    const name = window.$('edit-member-name')?.value?.trim();
    const color = window.$('edit-member-color')?.value || m.color;
    const maxPTO = Math.max(0, parseInt(window.$('edit-member-pto')?.value || '0', 10));
    const maxParental = Math.max(0, parseInt(window.$('edit-member-parental')?.value || '0', 10));

    if (!name) {
      window.setError('Roster member name is required.');
      window.render();
      return;
    }

    try {
      await window.updateRosterMember({
        ...m,
        name,
        color,
        maxPTO,
        maxParental
      });

      window.S.editingMember = null;
      await refreshTeamScopedData();
      window.setMessage('Roster member updated.', 'success');
      window.render();
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Failed to update roster member.');
      window.render();
    }
  }

  window.bindGlobal = function () {
    document.addEventListener('click', async e => {
      const target = e.target;

      if (target.id === 'continue-invite-btn') {
        window.clearError();
        window.clearMessage();

        if (!window.S.user) {
          window.S.inviteContinueRequested = true;
          window.S.authMode = 'login';
          window.setMessage('Log in or register to continue joining this team.', 'info');
          window.render();
          return;
        }

        await continueInviteFlowAfterAuth();
        window.render();
        return;
      }

      if (target.id === 'tab-login') {
        window.clearError();
        window.clearMessage();
        window.S.authMode = 'login';
        window.render();
        return;
      }

      if (target.id === 'tab-register') {
        window.clearError();
        window.clearMessage();
        window.S.authMode = 'register';
        window.render();
        return;
      }

      if (target.id === 'google-btn') {
        try {
          await window.signInWithGoogle();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Google sign-in failed.');
          window.render();
        }
        return;
      }

      if (target.id === 'login-btn') {
        const email = window.$('login-email')?.value?.trim();
        const password = window.$('login-password')?.value || '';

        try {
          window.clearError();
          window.clearMessage();
          await window.signInWithEmail({ email, password });
          await refreshActiveTeamState();
          await continueInviteFlowAfterAuth();
          if (!window.S.activeTeam) {
            await refreshBrowseTeams();
          }
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Login failed.');
          window.render();
        }
        return;
      }

      if (target.id === 'register-btn') {
        const fullName = window.$('reg-full-name')?.value?.trim();
        const email = window.$('reg-email')?.value?.trim();
        const password = window.$('reg-password')?.value || '';

        try {
          window.clearError();
          window.clearMessage();
          await window.signUpWithEmail({ email, password, fullName });
          window.setMessage(
            'Registration submitted. If email confirmation is enabled, check your inbox. Otherwise you can log in now.',
            'success'
          );
          window.S.authMode = 'login';
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Registration failed.');
          window.render();
        }
        return;
      }

      if (target.id === 'sign-out-btn') {
        try {
          await window.signOut();
          window.S.session = null;
          window.S.user = null;
          window.S.profile = null;
          window.S.activeTeam = null;
          window.S.membership = null;
          window.S.memberships = [];
          window.S.rosterMembers = [];
          window.S.daysOff = [];
          window.S.joinRequests = [];
          window.S.activeInvite = null;
          window.S.selectedMemberId = null;
          window.S.pickStart = null;
          window.S.hoverDate = null;
          window.S.modalRange = null;
          window.clearError();
          window.setMessage('Signed out.', 'success');
          await loadInvitePreviewIfPresent();
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Sign out failed.');
          window.render();
        }
        return;
      }

      if (target.id === 'tab-create-team') {
        window.clearError();
        window.clearMessage();
        window.S.landingMode = 'create';
        window.render();
        return;
      }

      if (target.id === 'tab-join-team') {
        window.clearError();
        window.clearMessage();
        window.S.landingMode = 'join';
        await refreshBrowseTeams();
        window.render();
        return;
      }

      if (target.id === 'create-team-btn') {
        const teamName = window.$('team-name')?.value?.trim();
        const creatorDisplayName = window.$('creator-display-name')?.value?.trim();

        try {
          window.clearError();
          window.clearMessage();
          await window.createTeam({ teamName, creatorDisplayName });
          await refreshActiveTeamState();
          window.setMessage('Team created successfully.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Failed to create team.');
          window.render();
        }
        return;
      }

      if (target.classList.contains('request-join-btn')) {
        const teamId = target.dataset.teamId;
        const teamName = target.dataset.teamName || 'this team';

        const ok = window.confirm(
          `You are requesting access to "${teamName}". ` +
          `In this version of Sabee, if your request is later approved, your active team will switch and you will lose access to your previous team. Continue?`
        );
        if (!ok) return;

        const message = window.prompt('Optional message to the admins of this team:', '') || '';

        try {
          window.clearError();
          window.clearMessage();
          await window.createJoinRequest({ teamId, message });
          window.setMessage('Join request sent.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not send join request.');
          window.render();
        }
        return;
      }

      if (target.classList.contains('approve-request-btn')) {
        const requestId = target.dataset.requestId;
        try {
          await window.approveJoinRequest(requestId);
          await refreshTeamScopedData();
          window.setMessage('Request approved.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not approve request.');
          window.render();
        }
        return;
      }

      if (target.classList.contains('reject-request-btn')) {
        const requestId = target.dataset.requestId;
        try {
          await window.rejectJoinRequest(requestId);
          await refreshTeamScopedData();
          window.setMessage('Request rejected.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not reject request.');
          window.render();
        }
        return;
      }

      if (target.id === 'copy-invite-btn') {
        const linkEl = window.$('active-invite-link');
        if (!linkEl) return;

        try {
          await navigator.clipboard.writeText(linkEl.textContent);
          window.setMessage('Invite link copied to clipboard.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError('Could not copy invite link.');
          window.render();
        }
        return;
      }

      if (target.id === 'invite-btn') {
        try {
          await window.createInvite(window.S.activeTeam.id);
          window.S.activeInvite = await window.loadActiveInvite(window.S.activeTeam.id);
          window.setMessage('Invite link is ready.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not create invite.');
          window.render();
        }
        return;
      }

      if (target.classList.contains('promote-admin-btn')) {
        const membershipId = target.dataset.membershipId;
        try {
          await window.promoteToAdmin(membershipId);
          await refreshTeamScopedData();
          window.setMessage('Member promoted to admin.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not promote member.');
          window.render();
        }
        return;
      }

      if (target.id === 'view-calendar-btn') {
        window.S.appView = 'calendar';
        window.render();
        return;
      }

      if (target.id === 'view-admin-btn') {
        window.S.appView = 'admin';
        window.render();
        return;
      }

      if (target.classList.contains('summary-card')) {
        const mid = target.dataset.mid;
        window.S.selectedMemberId = mid;
        window.S.pickStart = null;
        window.S.hoverDate = null;
        window.render();
        return;
      }

      if (target.id === 'prev-month') {
        navMonth(-1);
        return;
      }

      if (target.id === 'next-month') {
        navMonth(1);
        return;
      }

      const cell = target.closest('.day-cell.cm');
      if (cell && window.S.appView === 'calendar') {
        onDayClick(cell.dataset.d);
        return;
      }

      if (target.id === 'selection-cancel') {
        window.S.pickStart = null;
        window.S.hoverDate = null;
        window.render();
        return;
      }

      if (target.id === 'modal-cancel') {
        window.S.modalRange = null;
        window.render();
        return;
      }

      if (target.id === 'modal-btn-pto') {
        await confirmDayOffType('pto');
        return;
      }

      if (target.id === 'modal-btn-sick') {
        await confirmDayOffType('sick');
        return;
      }

      if (target.id === 'modal-btn-parental') {
        await confirmDayOffType('parental');
        return;
      }

      if (target.classList.contains('entry-delete-btn')) {
        const entryId = target.dataset.entryId;
        if (!window.confirm('Delete this day off entry?')) return;

        try {
          await window.deleteDayOff(entryId);
          await refreshTeamScopedData();
          window.setMessage('Day off entry deleted.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not delete entry.');
          window.render();
        }
        return;
      }

      if (target.id === 'add-roster-member-btn') {
        await addRosterMember();
        return;
      }

      if (target.classList.contains('edit-roster-member-btn')) {
        const mid = target.dataset.mid;
        window.S.editingMember = window.rosterMember(mid);
        window.render();
        return;
      }

      if (target.id === 'cancel-edit-member-btn') {
        window.S.editingMember = null;
        window.render();
        return;
      }

      if (target.id === 'save-edit-member-btn') {
        await saveEditedRosterMember();
        return;
      }

      if (target.classList.contains('delete-roster-member-btn')) {
        const mid = target.dataset.mid;
        if (!window.confirm('Delete this roster member and all related days off?')) return;

        try {
          await window.deleteRosterMember(mid);
          await refreshTeamScopedData();
          window.setMessage('Roster member deleted.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not delete roster member.');
          window.render();
        }
        return;
      }

      if (target.id === 'reset-team-data-btn') {
        if (!window.confirm('Reset all roster members and all days off for this team?')) return;

        try {
          await window.clearTeamAppData(window.S.activeTeam.id);
          await refreshTeamScopedData();
          window.setMessage('Team data reset.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not reset team data.');
          window.render();
        }
        return;
      }
    });

    document.addEventListener('input', async e => {
      const target = e.target;

      if (target.id === 'team-search') {
        await refreshBrowseTeams(target.value || '');
        const box = window.$('browse-team-results');
        if (box) box.innerHTML = window.renderBrowseTeamResults();
      }
    });

    document.addEventListener('mouseover', e => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const cell = target.closest('.day-cell.cm');
  if (!cell || !window.S.pickStart || window.S.modalRange) return;

  window.S.hoverDate = cell.dataset.d;
  window.render();
});

document.addEventListener('mouseout', e => {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;

  const grid = target.closest('#calendar-days');
  if (!grid) return;

  const related = e.relatedTarget instanceof Element ? e.relatedTarget : null;

  if (related && grid.contains(related)) {
    return;
  }

  if (window.S.pickStart) {
    window.S.hoverDate = null;
    window.render();
  }
});
  };

  window.init = async function () {
    window.S.loading = true;
    window.clearError();
    window.clearMessage();
    window.render();

    try {
      await loadInvitePreviewIfPresent();
      await window.bootstrapAuthState();

      if (window.S.activeTeam) {
        await refreshActiveTeamState();
      } else if (window.S.user) {
        await refreshBrowseTeams();
      }

      window.sb.auth.onAuthStateChange(async (_event, session) => {
        window.S.session = session;
        window.S.user = session?.user || null;

        try {
          await loadInvitePreviewIfPresent();
          await window.bootstrapAuthState();

          if (window.S.activeTeam) {
            await refreshActiveTeamState();
          } else if (window.S.user) {
            await refreshBrowseTeams();
          }

          window.S.loading = false;
          window.render();
        } catch (err) {
          console.error(err);
          window.S.loading = false;
          window.setError(err.message || 'Auth state refresh failed.');
          window.render();
        }
      });

      window.bindGlobal();
      startInviteCountdown();

      window.S.loading = false;
      window.render();
    } catch (err) {
      console.error(err);
      window.S.loading = false;
      window.setError(err.message || 'App initialization failed.');
      window.render();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.init);
  } else {
    window.init();
  }
})();
