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

  async function ensureSelfRosterMember() {
    if (!window.S.activeTeam || !window.S.user) return;

    const alreadyLinked = window.S.rosterMembers.some(m => m.userId === window.S.user.id);
    if (alreadyLinked) return;

    try {
      await window.createRosterMember(window.S.activeTeam.id, {
        name: window.S.profile?.full_name || window.S.user.email?.split('@')[0] || 'Team member',
        color: window.nextColor(window.S.rosterMembers),
        maxPTO: window.DEFAULT_MAX_PTO,
        maxParental: 0,
        userId: window.S.user.id
      });

      window.S.rosterMembers = await window.loadRosterMembers(window.S.activeTeam.id);
    } catch (err) {
      console.warn('Could not auto-create self roster member', err);
    }
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

    await ensureSelfRosterMember();

    if (!window.S.rosterMembers.find(m => m.id === window.S.selectedMemberId)) {
      const mine = window.currentUserRosterMember();
      window.S.selectedMemberId = mine?.id || (window.S.rosterMembers.length ? window.S.rosterMembers[0].id : null);
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
    if (!window.S.selectedMemberId) return;
    if (!window.canEditSelectedMember()) return;

    if (!window.S.pickStart) {
      window.S.pickStart = ds;
      window.render();
      return;
    }

    const s = window.dmin(window.S.pickStart, ds);
    const e = window.dmax(window.S.pickStart, ds);

    window.S.pickStart = null;
    window.S.modalRange = { s, e };
    window.render();
  }

  async function confirmDayOffType(type) {
    if (!window.S.modalRange || !window.S.selectedMemberId || !window.S.activeTeam) return;
    if (!window.canEditSelectedMember()) return;

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
    if (!window.isAdmin() || !window.S.activeTeam) return;

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
    if (!m || !window.isAdmin()) return;

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

  function handleAuthEnter(e) {
    if (e.key !== 'Enter') return;

    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (target.id === 'login-email' || target.id === 'login-password') {
      e.preventDefault();
      window.$('login-btn')?.click();
      return;
    }

    if (target.id === 'reg-full-name' || target.id === 'reg-email' || target.id === 'reg-password') {
      e.preventDefault();
      window.$('register-btn')?.click();
      return;
    }

    if (target.id === 'team-name' || target.id === 'creator-display-name') {
      e.preventDefault();
      window.$('create-team-btn')?.click();
    }
  }

  async function doSignOut() {
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
      window.S.modalRange = null;
      window.S.editingMember = null;

      window.location.replace(window.SABEE_CONFIG.APP_URL);
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Sign out failed.');
      window.render();
    }
  }

  window.bindGlobal = function () {
    if (window.S.listenersBound) return;
    window.S.listenersBound = true;

    document.addEventListener('keydown', handleAuthEnter);

    document.addEventListener('click', async e => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      if (target.closest('#sign-out-btn')) {
        await doSignOut();
        return;
      }

      if (target.closest('#go-admin-btn') || target.closest('#view-admin-btn')) {
        if (window.isAdmin()) {
          window.S.appView = 'admin';
          window.render();
        }
        return;
      }

      if (target.closest('#go-calendar-btn') || target.closest('#view-calendar-btn')) {
        window.S.appView = 'calendar';
        window.render();
        return;
      }

      if (target.closest('#continue-invite-btn')) {
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

      if (target.closest('#tab-login')) {
        window.clearError();
        window.clearMessage();
        window.S.authMode = 'login';
        window.render();
        return;
      }

      if (target.closest('#tab-register')) {
        window.clearError();
        window.clearMessage();
        window.S.authMode = 'register';
        window.render();
        return;
      }

      if (target.closest('#google-btn')) {
        try {
          await window.signInWithGoogle();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Google sign-in failed.');
          window.render();
        }
        return;
      }

      if (target.closest('#login-btn')) {
        const email = window.$('login-email')?.value?.trim();
        const password = window.$('login-password')?.value || '';

        try {
          window.clearError();
          window.clearMessage();
          await window.signInWithEmail({ email, password });
          await refreshActiveTeamState();
          await continueInviteFlowAfterAuth();
          if (!window.S.activeTeam) await refreshBrowseTeams();
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Login failed.');
          window.render();
        }
        return;
      }

      if (target.closest('#register-btn')) {
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

      if (target.closest('#tab-create-team')) {
        window.clearError();
        window.clearMessage();
        window.S.landingMode = 'create';
        window.render();
        return;
      }

      if (target.closest('#tab-join-team')) {
        window.clearError();
        window.clearMessage();
        window.S.landingMode = 'join';
        await refreshBrowseTeams();
        window.render();
        return;
      }

      if (target.closest('#create-team-btn')) {
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

      const requestJoinBtn = target.closest('.request-join-btn');
      if (requestJoinBtn) {
        const teamId = requestJoinBtn.dataset.teamId;
        const teamName = requestJoinBtn.dataset.teamName || 'this team';

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

      const approveBtn = target.closest('.approve-request-btn');
      if (approveBtn) {
        try {
          await window.approveJoinRequest(approveBtn.dataset.requestId);
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

      const rejectBtn = target.closest('.reject-request-btn');
      if (rejectBtn) {
        try {
          await window.rejectJoinRequest(rejectBtn.dataset.requestId);
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

      if (target.closest('#copy-invite-btn')) {
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

      if (target.closest('#invite-btn')) {
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

      const promoteBtn = target.closest('.promote-admin-btn');
      if (promoteBtn) {
        try {
          await window.promoteToAdmin(promoteBtn.dataset.membershipId);
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

      const summaryCard = target.closest('.summary-card');
      if (summaryCard) {
        window.S.selectedMemberId = summaryCard.dataset.mid;
        window.S.pickStart = null;
        window.render();
        return;
      }

      if (target.closest('#prev-month')) {
        navMonth(-1);
        return;
      }

      if (target.closest('#next-month')) {
        navMonth(1);
        return;
      }

      const cell = target.closest('.day-cell.cm');
      if (cell && window.S.appView === 'calendar') {
        onDayClick(cell.dataset.d);
        return;
      }

      if (target.closest('#selection-cancel')) {
        window.S.pickStart = null;
        window.render();
        return;
      }

      if (target.closest('#modal-cancel')) {
        window.S.modalRange = null;
        window.render();
        return;
      }

      if (target.closest('#modal-btn-pto')) {
        await confirmDayOffType('pto');
        return;
      }

      if (target.closest('#modal-btn-sick')) {
        await confirmDayOffType('sick');
        return;
      }

      if (target.closest('#modal-btn-parental')) {
        await confirmDayOffType('parental');
        return;
      }

      const deleteEntryBtn = target.closest('.entry-delete-btn');
      if (deleteEntryBtn) {
        if (!window.canEditSelectedMember()) return;
        if (!window.confirm('Delete this day off entry?')) return;

        try {
          await window.deleteDayOff(deleteEntryBtn.dataset.entryId);
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

      if (target.closest('#add-roster-member-btn')) {
        await addRosterMember();
        return;
      }

      const editRosterBtn = target.closest('.edit-roster-member-btn');
      if (editRosterBtn) {
        window.S.editingMember = window.rosterMember(editRosterBtn.dataset.mid);
        window.render();
        return;
      }

      if (target.closest('#cancel-edit-member-btn')) {
        window.S.editingMember = null;
        window.render();
        return;
      }

      if (target.closest('#save-edit-member-btn')) {
        await saveEditedRosterMember();
        return;
      }

      const deleteRosterBtn = target.closest('.delete-roster-member-btn');
      if (deleteRosterBtn) {
        if (!window.confirm('Delete this roster member and all related days off?')) return;

        try {
          await window.deleteRosterMember(deleteRosterBtn.dataset.mid);
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

      if (target.closest('#reset-team-data-btn')) {
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
      }
    });

    document.addEventListener('input', async e => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      if (target.id === 'team-search') {
        await refreshBrowseTeams(target.value || '');
        const box = window.$('browse-team-results');
        if (box) box.innerHTML = window.renderBrowseTeamResults();
      }
    });
  };

  window.init = async function () {
    window.bindGlobal();

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
