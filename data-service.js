(function () {
  'use strict';

  window.getSession = async function () {
    const { data, error } = await window.sb.auth.getSession();
    if (error) throw error;
    return data.session;
  };

  window.getCurrentUser = async function () {
    const { data, error } = await window.sb.auth.getUser();
    if (error) throw error;
    return data.user;
  };

  window.signUpWithEmail = async function ({ email, password, fullName }) {
    const { error } = await window.sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;
  };

  window.signInWithEmail = async function ({ email, password }) {
    const { error } = await window.sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
  };

  window.signInWithGoogle = async function () {
    const { error } = await window.sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.SABEE_CONFIG.APP_URL
      }
    });

    if (error) throw error;
  };

  window.signOut = async function () {
    const { error } = await window.sb.auth.signOut();
    if (error) throw error;
  };

  window.loadProfile = async function () {
    const user = await window.getCurrentUser();
    if (!user) return null;

    const { data, error } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  };

  window.updateProfile = async function (patch) {
    const user = await window.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await window.sb
      .from('profiles')
      .update(patch)
      .eq('id', user.id);

    if (error) throw error;
  };

  window.createTeam = async function ({ teamName, creatorDisplayName }) {
    const { data, error } = await window.sb.rpc('create_team_with_owner', {
      p_team_name: teamName,
      p_creator_name: creatorDisplayName || null
    });

    if (error) throw error;
    return data;
  };

  window.loadMyMembership = async function () {
    const user = await window.getCurrentUser();
    if (!user) return null;

    const { data, error } = await window.sb
      .from('team_memberships')
      .select('*, team:teams(*)')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  };

  window.loadBrowseTeams = async function (search = '') {
    let q = window.sb
      .from('teams')
      .select('id, name, slug, created_at')
      .order('name', { ascending: true });

    if (search.trim()) {
      q = q.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await q.limit(50);
    if (error) throw error;
    return data || [];
  };

  window.createJoinRequest = async function ({ teamId, message }) {
    const user = await window.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await window.sb
      .from('team_join_requests')
      .insert([{
        team_id: teamId,
        requester_user_id: user.id,
        message: message || null,
        status: 'pending'
      }]);

    if (error) throw error;
  };

  window.loadPendingRequestsForMyTeam = async function (teamId) {
    const { data, error } = await window.sb
      .from('team_join_requests')
      .select('*, requester:profiles!team_join_requests_requester_user_id_fkey(id, email, full_name)')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  window.approveJoinRequest = async function (requestId) {
    const { error } = await window.sb.rpc('approve_join_request', {
      p_request_id: requestId
    });

    if (error) throw error;
  };

  window.rejectJoinRequest = async function (requestId) {
    const { error } = await window.sb.rpc('reject_join_request', {
      p_request_id: requestId
    });

    if (error) throw error;
  };

  window.createInvite = async function (teamId) {
    const { data, error } = await window.sb.rpc('create_team_invite', {
      p_team_id: teamId,
      p_expiry_hours: 72
    });

    if (error) throw error;
    return data;
  };

  window.acceptInvite = async function (token) {
    const { data, error } = await window.sb.rpc('accept_team_invite', {
      p_token: token
    });

    if (error) throw error;
    return data;
  };

  window.loadTeamMembers = async function (teamId) {
    const { data, error } = await window.sb
      .from('team_memberships')
      .select('*, profile:profiles(id, email, full_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  window.promoteToAdmin = async function (membershipId) {
    const { error } = await window.sb.rpc('promote_member_to_admin', {
      p_membership_id: membershipId
    });

    if (error) throw error;
  };

  window.bootstrapAuthState = async function () {
    const session = await window.getSession();
    const user = session?.user || null;

    window.S.session = session;
    window.S.user = user;

    if (!user) {
      window.S.profile = null;
      window.S.activeTeam = null;
      window.S.membership = null;
      return;
    }

    const [profile, membership] = await Promise.all([
      window.loadProfile(),
      window.loadMyMembership()
    ]);

    window.S.profile = profile;
    window.S.membership = membership;
    window.S.activeTeam = membership?.team || null;
  };
})();
