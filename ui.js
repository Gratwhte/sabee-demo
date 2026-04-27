(function () {
  'use strict';

  window.renderMessageBlock = function () {
    if (window.S.error) {
      return `<div class="alert alert-error">${window.esc(window.S.error)}</div>`;
    }

    if (window.S.message) {
      const map = {
        info: 'alert-info',
        success: 'alert-success',
        warn: 'alert-warn',
        error: 'alert-error'
      };
      return `<div class="alert ${map[window.S.message.type] || 'alert-info'}">${window.esc(window.S.message.text)}</div>`;
    }

    return '';
  };

  window.renderTopbar = function () {
    const profile = window.S.profile;
    return `
      <div class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div>
              <h1>Sa<span>bee</span></h1>
              <span class="version">beta v6</span>
            </div>
          </div>
          <div class="topbar-right">
            ${profile ? `<span class="meta">${window.esc(profile.full_name || profile.email || 'Signed in')}</span>` : ''}
            ${profile ? `<button class="btn btn-secondary" id="sign-out-btn" type="button">Sign out</button>` : ''}
          </div>
        </div>
      </div>
    `;
  };

  window.renderInvitePreviewPage = function () {
    const preview = window.S.invitePreview;

    return `
      <div class="page">
        ${window.renderTopbar()}
        <div class="hero-wrap">
          <div class="card auth-card">
            <div class="auth-head">
              <h2>Team invitation</h2>
              <p>You were invited to join a Sabee team.</p>
            </div>

            ${window.renderMessageBlock()}

            ${
              !preview ? `
                <div class="alert alert-error">This invite could not be loaded.</div>
              ` : !preview.is_valid ? `
                <div class="alert alert-error">This invite has expired or is no longer valid.</div>
                <div class="field">
                  <label>Team</label>
                  <div class="input">${window.esc(preview.team_name || 'Unknown team')}</div>
                </div>
              ` : `
                <div class="stack">
                  <div class="field">
                    <label>Invited team</label>
                    <div class="input">${window.esc(preview.team_name)}</div>
                  </div>

                  <div class="alert alert-info">
  This invite expires in <span id="invite-preview-countdown">${window.esc(window.formatRemaining(preview.expires_at))}</span>.
</div>

                  <div class="alert alert-warn">
                    In this version of Sabee, each user can belong to only one team at a time.
                    If you continue with this invitation and join the team, your current active team access will be replaced.
                  </div>

                  <div class="row">
                    <button id="continue-invite-btn" class="btn btn-primary" type="button">
                      Continue to join this team
                    </button>
                  </div>
                </div>
              `
            }
          </div>
        </div>
      </div>
    `;
  };

  window.renderAuthPage = function () {
    const mode = window.S.authMode;

    return `
      <div class="page">
        ${window.renderTopbar()}
        <div class="hero-wrap">
          <div class="card auth-card">
            <div class="auth-head">
              <h2>${window.S.pendingInviteToken ? 'Sign in to continue' : 'Set up your team'}</h2>
              <p>${window.S.pendingInviteToken ? 'Authenticate first, then we will continue your invite flow.' : 'Create a new team or sign in to join one.'}</p>
            </div>

            <div class="tabs">
              <button id="tab-login" class="tab-btn ${mode === 'login' ? 'active' : ''}" type="button">Log in</button>
              <button id="tab-register" class="tab-btn ${mode === 'register' ? 'active' : ''}" type="button">Register</button>
            </div>

            ${window.renderMessageBlock()}

            <div class="stack">
              ${mode === 'register' ? `
                <div class="field">
                  <label for="reg-full-name">Full name</label>
                  <input id="reg-full-name" class="input" type="text" placeholder="Your name">
                </div>
              ` : ''}

              <div class="field">
                <label for="${mode === 'register' ? 'reg-email' : 'login-email'}">Email</label>
                <input id="${mode === 'register' ? 'reg-email' : 'login-email'}" class="input" type="email" placeholder="you@example.com">
              </div>

              <div class="field">
                <label for="${mode === 'register' ? 'reg-password' : 'login-password'}">Password</label>
                <input id="${mode === 'register' ? 'reg-password' : 'login-password'}" class="input" type="password" placeholder="••••••••">
              </div>

              ${mode === 'register' ? `
                <div class="legal-box">
                  <strong>Demo data handling notice</strong><br><br>
                  Sabee is currently a demo application. If you create an account, we store your email address,
                  profile information you provide, your team membership, and team-related activity inside Supabase.
                  Google sign-in may also provide us with your name and avatar if available.<br><br>
                  This demo is not intended for sensitive personal, financial, health, or legally confidential data.
                  Please do not upload anything private that you would not want visible to demo administrators or testers.
                  Features, storage rules, and data retention may change while the demo evolves.
                </div>
              ` : ''}

              <div class="row">
                <button id="${mode === 'register' ? 'register-btn' : 'login-btn'}" class="btn btn-primary" type="button">
                  ${mode === 'register' ? 'Create account' : 'Log in'}
                </button>
                <button id="google-btn" class="btn btn-secondary" type="button">Continue with Google</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.renderTeamGatewayPage = function () {
    const mode = window.S.landingMode;

    return `
      <div class="page">
        ${window.renderTopbar()}
        <div class="hero-wrap">
          <div class="card auth-card">
            <div class="auth-head">
              <h2>Set up your team</h2>
              <p>Create a new team or request access to an existing one.</p>
            </div>

            <div class="tabs">
              <button id="tab-create-team" class="tab-btn ${mode === 'create' ? 'active' : ''}" type="button">Create team</button>
              <button id="tab-join-team" class="tab-btn ${mode === 'join' ? 'active' : ''}" type="button">Join team</button>
            </div>

            ${window.renderMessageBlock()}

            ${mode === 'create' ? window.renderCreateTeamPane() : window.renderJoinTeamPane()}
          </div>
        </div>
      </div>
    `;
  };

  window.renderCreateTeamPane = function () {
    return `
      <div class="stack">
        <div class="field">
          <label for="team-name">Team name</label>
          <input id="team-name" class="input" type="text" placeholder="e.g. Product Europe">
        </div>

        <div class="field">
          <label for="creator-display-name">Your display name inside the team</label>
          <input id="creator-display-name" class="input" type="text" placeholder="e.g. Anna">
        </div>

        <div class="alert alert-info">
          Team names must be unique.
          In this version of Sabee, each account can belong to only one team at a time.
          If you later join a different team, your active team assignment will switch.
        </div>

        <div class="row">
          <button id="create-team-btn" class="btn btn-primary" type="button">Create team</button>
        </div>
      </div>
    `;
  };

  window.renderJoinTeamPane = function () {
    return `
      <div class="stack">
        <div class="field">
          <label for="team-search">Search teams by name</label>
          <input id="team-search" class="input" type="text" placeholder="Search teams...">
        </div>

        <div class="alert alert-warn">
          In this demo version, you can only belong to one team at a time.
          If an admin approves your request for another team, you will lose access to your current team.
        </div>

        <div id="browse-team-results" class="team-list">
          ${window.renderBrowseTeamResults()}
        </div>
      </div>
    `;
  };

  window.renderBrowseTeamResults = function () {
    if (!window.S.browseTeams.length) {
      return `<div class="empty">No teams found.</div>`;
    }

    return window.S.browseTeams.map(team => `
      <div class="team-card">
        <div>
          <h4>${window.esc(team.name)}</h4>
          <p>Team slug: ${window.esc(team.slug)}</p>
        </div>
        <div class="inline-actions">
          <button class="btn btn-primary request-join-btn" data-team-id="${team.id}" data-team-name="${window.esc(team.name)}" type="button">
            Request access
          </button>
        </div>
      </div>
    `).join('');
  };

  window.renderAppShell = function () {
    const team = window.S.activeTeam;
    const membership = window.S.membership;
    const role = membership?.role || 'member';
    const activeInvite = window.S.activeInvite;

    return `
      <div class="page">
        ${window.renderTopbar()}
        <div class="container">
          ${window.renderMessageBlock()}

          <div class="shell">
            <aside class="card sidebar">
              <div class="stack">
                <div>
                  <h3>Profile</h3>
                  <div class="meta">${window.esc(window.S.profile?.full_name || '')}</div>
                  <div class="meta">${window.esc(window.S.profile?.email || '')}</div>
                </div>

                <div class="hr"></div>

                <div>
                  <h3>Active team</h3>
                  <div><strong>${window.esc(team?.name || 'No team')}</strong></div>
                  <div class="meta">Role: ${window.esc(role)}</div>
                </div>

                <div class="hr"></div>

                <div class="stack">
                  <button id="refresh-team-data-btn" class="btn btn-secondary" type="button">Refresh</button>
                  ${(role === 'owner' || role === 'admin') ? `
                    <button id="invite-btn" class="btn btn-primary" type="button">Generate / Show invite</button>
                  ` : ''}
                </div>
              </div>
            </aside>

            <main class="card main-card">
              <div class="stack">
                <div>
                  <h2 style="margin:0 0 8px">Sabee beta v6 foundation</h2>
                  <div class="meta">
                    Authentication, teams, join requests, invite links, roles, and profile handling are now active.
                  </div>
                </div>

                <div class="alert alert-info">
                  Current team access is now based on your authenticated membership. In this version, joining another team replaces your previous team access.
                </div>

                <div>
                  <h3 class="section-title">Pending join requests</h3>
                  <div id="pending-requests-list" class="list">
                    ${window.renderPendingRequests()}
                  </div>
                </div>

                <div>
                  <h3 class="section-title">Team members</h3>
                  <div id="team-memberships-list" class="list">
                    ${window.renderMemberships()}
                  </div>
                </div>

                <div>
  <h3 class="section-title">Invite link</h3>
  <div id="invite-link-area" class="stack">
    ${
      activeInvite && activeInvite.is_active
        ? `
          <div class="alert alert-success">
            Active invite available. Expires in
            <span id="active-invite-countdown">${window.esc(window.formatRemaining(activeInvite.expires_at))}</span>.
          </div>
          <div class="codebox" id="active-invite-link">${window.esc(`${window.SABEE_CONFIG.APP_URL}?invite=${activeInvite.token}`)}</div>
          <div class="row">
            <button id="copy-invite-btn" class="btn btn-secondary" type="button">Copy link</button>
          </div>
        `
        : '<div class="empty">No active invite yet.</div>'
    }
  </div>
</div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    `;
  };

  window.renderPendingRequests = function () {
    if (!window.S.activeTeam || !window.S.joinRequests.length) {
      return `<div class="empty">No pending requests.</div>`;
    }

    return window.S.joinRequests.map(req => `
      <div class="list-item">
        <div>
          <div><strong>${window.esc(req.requester?.full_name || req.requester?.email || 'Unknown user')}</strong></div>
          <div class="small muted">${window.esc(req.requester?.email || '')}</div>
          ${req.message ? `<div class="small muted">${window.esc(req.message)}</div>` : ''}
        </div>
        <div class="inline-actions">
          <button class="btn btn-primary approve-request-btn" data-request-id="${req.id}" type="button">Approve</button>
          <button class="btn btn-secondary reject-request-btn" data-request-id="${req.id}" type="button">Reject</button>
        </div>
      </div>
    `).join('');
  };

  window.renderMemberships = function () {
    if (!window.S.teams.length) {
      return `<div class="empty">No memberships loaded.</div>`;
    }

    return window.S.teams.map(m => {
      const badgeClass =
        m.role === 'owner' ? 'badge-owner' :
        m.role === 'admin' ? 'badge-admin' :
        'badge-member';

      const canPromote =
        window.S.membership?.role === 'owner' &&
        m.role === 'member';

      return `
        <div class="list-item">
          <div>
            <div><strong>${window.esc(m.profile?.full_name || m.profile?.email || 'Unknown user')}</strong></div>
            <div class="small muted">${window.esc(m.profile?.email || '')}</div>
          </div>
          <div class="inline-actions">
            <span class="badge ${badgeClass}">${window.esc(m.role)}</span>
            ${canPromote ? `<button class="btn btn-secondary promote-admin-btn" data-membership-id="${m.id}" type="button">Make admin</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  window.render = function () {
    const app = window.$('app');
    if (!app) return;

    if (window.S.loading) {
      app.innerHTML = `
        <div class="page">
          ${window.renderTopbar()}
          <div class="hero-wrap">
            <div class="card auth-card">
              <div class="auth-head">
                <h2>Loading Sabee…</h2>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (window.S.invitePreview && !window.S.user) {
      app.innerHTML = window.renderInvitePreviewPage();
      return;
    }

    if (!window.S.user) {
      app.innerHTML = window.renderAuthPage();
      return;
    }

    if (!window.S.activeTeam) {
      app.innerHTML = window.renderTeamGatewayPage();
      return;
    }

    app.innerHTML = window.renderAppShell();
  };
})();
