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
            ${window.S.activeTeam ? `<span class="meta"><strong>${window.esc(window.S.activeTeam.name)}</strong></span>` : ''}
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
                    <button id="continue-invite-btn" class="btn btn-primary" type="button">Continue to join this team</button>
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
              <h2>${window.S.pendingInviteToken && window.S.inviteContinueRequested ? 'Sign in to continue' : 'Set up your team'}</h2>
              <p>${
                window.S.pendingInviteToken && window.S.inviteContinueRequested
                  ? 'Log in or register to continue joining this invited team.'
                  : 'Create a new team or sign in to join one.'
              }</p>
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
          <label for="creator-display-name">Your display name inside the team roster</label>
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

  window.renderSummaryList = function () {
    if (!window.S.rosterMembers.length) {
      return `<div class="empty">No team members yet.</div>`;
    }

    return window.S.rosterMembers.map(m => {
      const usedPTO = window.usedDays(m.id, 'pto');
      const usedParental = window.usedDays(m.id, 'parental');
      const linkedSelf = window.S.user && m.userId === window.S.user.id;

      return `
        <button type="button" class="summary-card ${window.S.selectedMemberId === m.id ? 'active' : ''}" data-mid="${m.id}" style="--member-color:${m.color}">
          <div class="summary-card-head">
            <span class="summary-card-name">${window.esc(m.name)} ${linkedSelf ? '<span class="small muted">(you)</span>' : ''}</span>
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
        </button>
      `;
    }).join('');
  };

  window.renderEntries = function () {
    const m = window.rosterMember(window.S.selectedMemberId);
    if (!m) return `<div class="empty">Select a team member.</div>`;

    const entries = window.S.daysOff
      .filter(e => e.mid === m.id)
      .sort((a, b) => a.s.localeCompare(b.s));

    if (!entries.length) {
      return `<div class="empty">No days off logged yet.</div>`;
    }

    const canEdit = window.canEditSelectedMember();

    return entries.map(e => {
      const days = window.dspan(e.s, e.e);
      return `
        <div class="entry-card">
          <div>
            <div class="entry-title">${window.TYPE_ICON[e.t]} ${window.TYPE_LABEL[e.t]}</div>
            <div class="entry-meta">${window.fmtS(e.s)} → ${window.fmtS(e.e)} · ${days} day${days > 1 ? 's' : ''}</div>
          </div>
          ${canEdit ? `<button type="button" class="btn btn-ghost entry-delete-btn" data-entry-id="${e.id}">Delete</button>` : ''}
        </div>
      `;
    }).join('');
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
      const m = window.rosterMember(e.mid);
      if (!m) return '';

      if (e.t === 'sick') {
        return `<span class="dot dot-sick" style="color:${m.color}; border-color:${m.color}"></span>`;
      }

      if (e.t === 'parental') {
        return `<span class="dot dot-parental" style="background:${m.color}"></span>`;
      }

      return `<span class="dot" style="background:${m.color}"></span>`;
    }).join('');

    if (extra) h += `<span class="small muted">…</span>`;
    return h;
  };

  window.renderCalendar = function () {
    const { y, m } = window.S.month;
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
      const isToday = ds === td;
      const selStart = window.S.pickStart === ds;

      const cls = [
        'day-cell',
        window.canEditSelectedMember() ? 'cm' : '',
        wk ? 'weekend' : '',
        isToday ? 'today' : '',
        selStart ? 'selection-start' : ''
      ].filter(Boolean).join(' ');

      const entries = window.entFor(ds);

      h += `
        <div class="${cls}" data-d="${ds}" role="gridcell" tabindex="0">
          <span class="day-number">${d}</span>
          <div class="day-dots">${window.renderDots(entries)}</div>
        </div>
      `;
    }

    const tot = start + days;
    const rem = (7 - (tot % 7)) % 7;
    for (let i = 1; i <= rem; i++) {
      h += `<div class="day-cell other-month" aria-hidden="true"><span class="day-number">${i}</span></div>`;
    }

    return h;
  };

  window.renderSelectionStatus = function () {
    if (!window.S.selectedMemberId) {
      return `<div class="alert alert-info">Select a team member from the right-hand list.</div>`;
    }

    if (!window.canEditSelectedMember()) {
      return `<div class="alert alert-info">You can view all team calendars. Owners and admins can edit anyone. Regular users can edit only their own calendar.</div>`;
    }

    if (window.S.pickStart) {
      return `
        <div class="selection-status">
          <span id="selection-text">Start: ${window.fmtS(window.S.pickStart)} — click another day to complete</span>
          <button id="selection-cancel" class="btn btn-ghost" type="button">Cancel</button>
        </div>
      `;
    }

    return `<div class="alert alert-info">Click a start date and an end date to add time off for the selected team member.</div>`;
  };

  window.renderCalendarView = function () {
    const sel = window.rosterMember(window.S.selectedMemberId);
    const canAdmin = window.isAdmin();

    return `
      <div class="stack">
        <div class="card main-card">
          <div class="row" style="justify-content:space-between;align-items:center">
            <div>
              <h2 style="margin:0 0 6px">Calendar</h2>
              <div class="meta">Everyone can view all team calendars. Owners/admins can edit anyone. Regular users can edit only their own calendar.</div>
            </div>
            ${canAdmin ? `<button id="go-admin-btn" class="btn btn-secondary" type="button">Open Admin Page</button>` : ''}
          </div>
        </div>

        <div class="calendar-wrap">
          <section class="calendar-panel">
            <div class="calendar-nav">
              <button id="prev-month" class="btn btn-ghost nav-btn" type="button">‹</button>
              <h2>${window.MONTHS[window.S.month.m]} ${window.S.month.y}</h2>
              <button id="next-month" class="btn btn-ghost nav-btn" type="button">›</button>
            </div>

            <div class="calendar-weekdays">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span>
              <span>Fri</span><span>Sat</span><span>Sun</span>
            </div>

            <div id="calendar-days" class="calendar-grid">${window.renderCalendar()}</div>

            <div style="margin-top:14px">
              ${window.renderSelectionStatus()}
            </div>
          </section>

          <aside class="side-panel">
            <h3 style="margin:0 0 12px">Team Members</h3>
            <div id="summary-list" class="summary-list">${window.renderSummaryList()}</div>

            <div class="hr"></div>

            <h3 style="margin:0 0 12px">${sel ? `${window.esc(sel.name)}'s Days Off` : 'Days Off'}</h3>
            <div id="entries-list" class="entry-list">${window.renderEntries()}</div>
          </aside>
        </div>
      </div>
    `;
  };

  window.renderPendingRequests = function () {
    if (!window.S.joinRequests.length) {
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
    if (!window.S.memberships.length) {
      return `<div class="empty">No team users loaded.</div>`;
    }

    return window.S.memberships.map(m => {
      const badgeClass =
        m.role === 'owner' ? 'badge-owner' :
        m.role === 'admin' ? 'badge-admin' :
        'badge-member';

      const canPromote = window.isOwner() && m.role === 'member';

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

  window.renderRosterManagementList = function () {
    if (!window.S.rosterMembers.length) {
      return '<div class="empty">No roster members yet.</div>';
    }

    return window.S.rosterMembers.map(m => `
      <div class="list-item">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="summary-card-dot" style="background:${m.color}"></span>
            <strong>${window.esc(m.name)}</strong>
          </div>
          <div class="small muted">PTO ${m.maxPTO} · Parental ${m.maxParental}${m.userId ? ' · linked user' : ' · placeholder'}</div>
        </div>
        <div class="inline-actions">
          <button class="btn btn-secondary edit-roster-member-btn" data-mid="${m.id}" type="button">Edit</button>
          <button class="btn btn-danger delete-roster-member-btn" data-mid="${m.id}" type="button">Delete</button>
        </div>
      </div>
    `).join('');
  };

  window.renderAdminView = function () {
    const activeInvite = window.S.activeInvite;

    return `
      <div class="stack">
        <div class="card main-card">
          <div class="row" style="justify-content:space-between;align-items:center">
            <div>
              <h2 style="margin:0 0 6px">Admin Page</h2>
              <div class="meta">Manage roster members, invites, join requests, allowances, and team administration.</div>
            </div>
            <button id="go-calendar-btn" class="btn btn-secondary" type="button">Back to Calendar</button>
          </div>
        </div>

        <div class="admin-grid">
          <section class="admin-section">
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
                      <button id="invite-btn" class="btn btn-primary" type="button">Show / refresh invite</button>
                      <button id="copy-invite-btn" class="btn btn-secondary" type="button">Copy link</button>
                    </div>
                  `
                  : `
                    <div class="empty">No active invite yet.</div>
                    <div class="row">
                      <button id="invite-btn" class="btn btn-primary" type="button">Create invite</button>
                    </div>
                  `
              }
            </div>
          </section>

          <section class="admin-section">
            <h3 class="section-title">Pending join requests</h3>
            <div class="list">${window.renderPendingRequests()}</div>
          </section>

          <section class="admin-section">
            <h3 class="section-title">Team user accounts</h3>
            <div class="alert alert-info">
              Owners can grant admin rights. Admins can manage roster members and team data but cannot promote other users.
            </div>
            <div class="list">${window.renderMemberships()}</div>
          </section>

          <section class="admin-section">
            <h3 class="section-title">Add roster member</h3>
            <div class="grid-2" style="margin-bottom:14px">
              <div class="field">
                <label for="new-member-name">Name</label>
                <input id="new-member-name" class="input" type="text" placeholder="e.g. Anna">
              </div>
              <div class="field">
                <label for="new-member-color">Color</label>
                <input id="new-member-color" class="input" type="color" value="${window.nextColor(window.S.rosterMembers)}">
              </div>
              <div class="field">
                <label for="new-member-pto">PTO allowance</label>
                <input id="new-member-pto" class="input" type="number" min="0" value="25">
              </div>
              <div class="field">
                <label for="new-member-parental">Parental allowance</label>
                <input id="new-member-parental" class="input" type="number" min="0" value="0">
              </div>
            </div>

            <div class="row">
              <button id="add-roster-member-btn" class="btn btn-primary" type="button">Add roster member</button>
            </div>
          </section>

          <section class="admin-section">
            <h3 class="section-title">Roster members</h3>
            <div class="list">${window.renderRosterManagementList()}</div>
          </section>

          <section class="admin-section">
            <h3 class="section-title">Danger zone</h3>
            <div class="alert alert-warn">
              Resetting team data will delete all roster members and all days off for this team.
              It will not delete authenticated user accounts or remove the team itself.
            </div>
            <div class="row">
              <button id="reset-team-data-btn" class="btn btn-danger" type="button">Reset team data</button>
            </div>
          </section>
        </div>
      </div>
    `;
  };

  window.renderEditMemberModal = function () {
    const m = window.S.editingMember;
    if (!m) return '';

    return `
      <div id="edit-member-overlay" class="modal-overlay">
        <div class="modal-content">
          <h3 class="modal-title">Edit roster member</h3>
          <p class="modal-subtitle">Update this team member’s display and allowance values.</p>

          <div class="stack">
            <div class="field">
              <label for="edit-member-name">Name</label>
              <input id="edit-member-name" class="input" type="text" value="${window.esc(m.name)}">
            </div>

            <div class="field">
              <label for="edit-member-color">Color</label>
              <input id="edit-member-color" class="input" type="color" value="${window.esc(m.color)}">
            </div>

            <div class="grid-2">
              <div class="field">
                <label for="edit-member-pto">PTO allowance</label>
                <input id="edit-member-pto" class="input" type="number" min="0" value="${m.maxPTO}">
              </div>
              <div class="field">
                <label for="edit-member-parental">Parental allowance</label>
                <input id="edit-member-parental" class="input" type="number" min="0" value="${m.maxParental}">
              </div>
            </div>

            <div class="row">
              <button id="save-edit-member-btn" class="btn btn-primary" type="button">Save changes</button>
              <button id="cancel-edit-member-btn" class="btn btn-secondary" type="button">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  window.renderDayOffModal = function () {
    if (!window.S.modalRange) return '';

    const m = window.rosterMember(window.S.selectedMemberId);
    if (!m) return '';

    const { s, e } = window.S.modalRange;
    const rangeDays = window.dspan(s, e);
    const usedPTO = window.usedDays(m.id, 'pto');
    const usedParental = window.usedDays(m.id, 'parental');
    const hasOverlap = window.overlap(m.id, s, e);

    return `
      <div id="modal-overlay" class="modal-overlay">
        <div class="modal-content">
          <h3 class="modal-title">Log Days Off</h3>
          <p class="modal-subtitle">
            <strong>${window.esc(m.name)}</strong> · ${window.esc(window.fmtS(s))} → ${window.esc(window.fmtS(e))}
          </p>

          ${hasOverlap ? `<div class="alert alert-error">This range overlaps with an existing day-off entry.</div>` : ''}

          <div class="modal-options">
            <button id="modal-btn-pto" class="modal-option" type="button" ${hasOverlap ? 'disabled' : ''}>
              <div>
                <span class="option-label">🏖️ Paid Time Off</span>
                <span class="option-detail">${rangeDays} day${rangeDays > 1 ? 's' : ''} · used ${usedPTO}/${m.maxPTO}</span>
              </div>
            </button>

            <button id="modal-btn-sick" class="modal-option" type="button" ${hasOverlap ? 'disabled' : ''}>
              <div>
                <span class="option-label">🤒 Sick Leave</span>
                <span class="option-detail">${rangeDays} day${rangeDays > 1 ? 's' : ''}</span>
              </div>
            </button>

            <button id="modal-btn-parental" class="modal-option" type="button" ${(hasOverlap || m.maxParental <= 0) ? 'disabled' : ''}>
              <div>
                <span class="option-label">👶 Parental Leave</span>
                <span class="option-detail">${rangeDays} day${rangeDays > 1 ? 's' : ''} · used ${usedParental}/${m.maxParental}</span>
              </div>
            </button>
          </div>

          <button id="modal-cancel" class="btn btn-secondary" type="button">Cancel</button>
        </div>
      </div>
    `;
  };

  window.renderAppShell = function () {
    const canAdmin = window.isAdmin();

    return `
      <div class="page">
        ${window.renderTopbar()}
        <div class="container">
          ${window.renderMessageBlock()}

          ${
            window.S.appView === 'admin' && canAdmin
              ? window.renderAdminView()
              : window.renderCalendarView()
          }
        </div>

        ${window.renderDayOffModal()}
        ${window.renderEditMemberModal()}
      </div>
    `;
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

    if (window.S.invitePreview && !window.S.user && !window.S.inviteContinueRequested) {
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
