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
        redirectTo: window.location.href
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

  window.loadActiveInvite = async function (teamId) {
    const { data, error } = await window.sb.rpc('get_active_team_invite', {
      p_team_id: teamId
    });

    if (error) throw error;
    return (data && data[0]) || null;
  };

  window.loadInvitePreview = async function (token) {
    const { data, error } = await window.sb.rpc('get_invite_preview', {
      p_token: token
    });

    if (error) throw error;
    return (data && data[0]) || null;
  };

  window.acceptInvite = async function (token) {
    const { data, error } = await window.sb.rpc('accept_team_invite', {
      p_token: token
    });

    if (error) throw error;
    return data;
  };

  window.loadTeamMemberships = async function (teamId) {
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

  window.loadRosterMembers = async function (teamId) {
    const { data, error } = await window.sb
      .from('members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
      maxPTO: row.max_pto,
      maxParental: row.max_parental,
      userId: row.user_id || null
    }));
  };

  window.loadDaysOff = async function (teamId) {
    const { data, error } = await window.sb
      .from('days_off')
      .select('*')
      .eq('team_id', teamId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      mid: row.member_id,
      s: row.start_date,
      e: row.end_date,
      t: row.type,
      note: row.note || ''
    }));
  };

  window.createRosterMember = async function (teamId, member) {
    const { error } = await window.sb
      .from('members')
      .insert([{
        team_id: teamId,
        user_id: member.userId || null,
        name: member.name,
        color: member.color,
        max_pto: member.maxPTO,
        max_parental: member.maxParental
      }]);

    if (error) throw error;
  };

  window.updateRosterMember = async function (member) {
    const { error } = await window.sb
      .from('members')
      .update({
        name: member.name,
        color: member.color,
        max_pto: member.maxPTO,
        max_parental: member.maxParental
      })
      .eq('id', member.id);

    if (error) throw error;
  };

  window.deleteRosterMember = async function (memberId) {
    const { error } = await window.sb
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  };

  window.createDayOff = async function (teamId, entry) {
    const { error } = await window.sb
      .from('days_off')
      .insert([{
        team_id: teamId,
        member_id: entry.mid,
        start_date: entry.s,
        end_date: entry.e,
        type: entry.t,
        note: entry.note || null
      }]);

    if (error) throw error;
  };

  window.deleteDayOff = async function (entryId) {
    const { error } = await window.sb
      .from('days_off')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  };

  window.clearTeamAppData = async function (teamId) {
    const { error: daysError } = await window.sb
      .from('days_off')
      .delete()
      .eq('team_id', teamId);

    if (daysError) throw daysError;

    const { error: membersError } = await window.sb
      .from('members')
      .delete()
      .eq('team_id', teamId);

    if (membersError) throw membersError;
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
