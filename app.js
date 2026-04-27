(function () {
  'use strict';

  async function refreshActiveTeamState() {
    await window.bootstrapAuthState();

    if (window.S.activeTeam) {
      try {
        const [requests, memberships] = await Promise.all([
          (window.S.membership?.role === 'owner' || window.S.membership?.role === 'admin')
            ? window.loadPendingRequestsForMyTeam(window.S.activeTeam.id)
            : Promise.resolve([]),
          window.loadTeamMembers(window.S.activeTeam.id)
        ]);

        window.S.joinRequests = requests;
        window.S.teams = memberships;
      } catch (err) {
        console.error(err);
        window.setError(err.message || 'Failed to load team data.');
      }
    } else {
      window.S.joinRequests = [];
      window.S.teams = [];
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

  async function handleInviteTokenIfPresent() {
    const token = window.getInviteTokenFromUrl();
    if (!token) return;

    if (!window.S.user) {
      window.S.pendingInviteToken = token;
      window.setMessage('Sign in first to accept this team invite.', 'info');
      return;
    }

    const ok = window.confirm(
      'In this version of Sabee, you can only belong to one team at a time. ' +
      'Accepting this invite will replace your current team membership if you already belong to another team. Continue?'
    );

    if (!ok) return;

    try {
      await window.acceptInvite(token);
      window.removeInviteTokenFromUrl();
      window.setMessage('Invite accepted. Your active team has been updated.', 'success');
      await refreshActiveTeamState();
    } catch (err) {
      console.error(err);
      window.setError(err.message || 'Could not accept invite.');
    }
  }

  window.bindGlobal = function () {
    document.addEventListener('click', async e => {
      const target = e.target;

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
          await handleInviteTokenIfPresent();
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
          window.S.teams = [];
          window.S.joinRequests = [];
          window.clearError();
          window.setMessage('Signed out.', 'success');
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
          await refreshActiveTeamState();
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
          await refreshActiveTeamState();
          window.setMessage('Request rejected.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not reject request.');
          window.render();
        }
        return;
      }

      if (target.id === 'invite-btn') {
        try {
          const token = await window.createInvite(window.S.activeTeam.id);
          const url = `${window.SABEE_CONFIG.APP_URL}?invite=${token}`;

          const area = window.$('invite-link-area');
          if (area) {
            area.innerHTML = `
              <div class="alert alert-success">Invite created. It expires in 72 hours and can be used once.</div>
              <div class="codebox">${window.esc(url)}</div>
              <div class="row">
                <button id="copy-invite-btn" class="btn btn-secondary" type="button">Copy link</button>
              </div>
            `;
          }
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not create invite.');
          window.render();
        }
        return;
      }

      if (target.id === 'copy-invite-btn') {
        const codebox = document.querySelector('#invite-link-area .codebox');
        if (!codebox) return;

        try {
          await navigator.clipboard.writeText(codebox.textContent);
          window.setMessage('Invite link copied.', 'success');
          window.render();
        } catch {
          window.setError('Could not copy invite link.');
          window.render();
        }
        return;
      }

      if (target.classList.contains('promote-admin-btn')) {
        const membershipId = target.dataset.membershipId;
        try {
          await window.promoteToAdmin(membershipId);
          await refreshActiveTeamState();
          window.setMessage('Member promoted to admin.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Could not promote member.');
          window.render();
        }
        return;
      }

      if (target.id === 'refresh-team-data-btn') {
        try {
          await refreshActiveTeamState();
          window.setMessage('Team data refreshed.', 'success');
          window.render();
        } catch (err) {
          console.error(err);
          window.setError(err.message || 'Refresh failed.');
          window.render();
        }
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
  };

  window.init = async function () {
    window.S.loading = true;
    window.clearError();
    window.clearMessage();
    window.render();

    try {
      await window.bootstrapAuthState();
      await handleInviteTokenIfPresent();

      if (!window.S.activeTeam && window.S.user) {
        await refreshBrowseTeams();
      }

      if (window.S.activeTeam) {
        await refreshActiveTeamState();
      }

      window.sb.auth.onAuthStateChange(async (_event, session) => {
        window.S.session = session;
        window.S.user = session?.user || null;

        try {
          await window.bootstrapAuthState();
          await handleInviteTokenIfPresent();

          if (!window.S.activeTeam && window.S.user) {
            await refreshBrowseTeams();
          }

          if (window.S.activeTeam) {
            await refreshActiveTeamState();
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
