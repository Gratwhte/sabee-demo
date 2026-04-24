(function () {
  'use strict';

  window._realtimeChannel = null;

  window.dbMemberToUi = function (row) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      maxPTO: row.max_pto,
      maxParental: row.max_parental
    };
  };

  window.uiMemberToDb = function (member) {
    return {
      id: member.id,
      workspace_id: window.SABEE_CONFIG.WORKSPACE_ID,
      name: member.name,
      color: member.color,
      max_pto: member.maxPTO,
      max_parental: member.maxParental
    };
  };

  window.dbDayOffToUi = function (row) {
    return {
      id: row.id,
      mid: row.member_id,
      s: row.start_date,
      e: row.end_date,
      t: row.type,
      note: row.note || ''
    };
  };

  window.uiDayOffToDb = function (entry) {
    return {
      id: entry.id,
      workspace_id: window.SABEE_CONFIG.WORKSPACE_ID,
      member_id: entry.mid,
      start_date: entry.s,
      end_date: entry.e,
      type: entry.t,
      note: entry.note || null
    };
  };

  window.loadFromSupabase = async function () {
    const workspaceId = window.SABEE_CONFIG.WORKSPACE_ID;

    const [membersRes, daysOffRes] = await Promise.all([
      window.sb
        .from('members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true }),

      window.sb
        .from('days_off')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('start_date', { ascending: true })
    ]);

    if (membersRes.error) throw membersRes.error;
    if (daysOffRes.error) throw daysOffRes.error;

    window.S.members = (membersRes.data || []).map(window.dbMemberToUi);
    window.S.daysOff = (daysOffRes.data || []).map(window.dbDayOffToUi);

    if (!window.S.members.find(m => m.id === window.S.selId)) {
      window.S.selId = window.S.members.length ? window.S.members[0].id : null;
    }

    try {
      localStorage.setItem(
        window.STORAGE_KEY,
        JSON.stringify({
          members: window.S.members,
          daysOff: window.S.daysOff
        })
      );
    } catch (_) {}
  };

  window.load = async function () {
    try {
      await window.loadFromSupabase();
      window.setSyncStatus('saved');
      window.startRealtime();
      return window.S.members.length > 0;
    } catch (e) {
      console.warn('Supabase load failed, trying localStorage', e);
      window.setSyncStatus('offline');
    }

    try {
      const d = JSON.parse(localStorage.getItem(window.STORAGE_KEY));
      if (d && Array.isArray(d.members) && d.members.length) {
        window.S.members = d.members;
        window.S.daysOff = (d.daysOff || []).map(e => ({ ...e }));
        window.S.selId = window.S.members[0].id;
        return true;
      }
    } catch (e) {
      console.error('localStorage load failed', e);
    }

    return false;
  };

  window.save = async function () {
    try {
      localStorage.setItem(
        window.STORAGE_KEY,
        JSON.stringify({
          members: window.S.members,
          daysOff: window.S.daysOff
        })
      );
    } catch (_) {}

    window.setSyncStatus('saved');
  };

  window.stopRealtime = function () {
    if (window._realtimeChannel) {
      window.sb.removeChannel(window._realtimeChannel);
      window._realtimeChannel = null;
    }
  };

  window.startRealtime = function () {
    window.stopRealtime();

    const workspaceId = window.SABEE_CONFIG.WORKSPACE_ID;

    window._realtimeChannel = window.sb
      .channel('sabee-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `workspace_id=eq.${workspaceId}`
        },
        async () => {
          try {
            await window.loadFromSupabase();
            window.setSyncStatus('updated');
            if (!window.S.admin) window.render();
            setTimeout(() => window.setSyncStatus('saved'), 1500);
          } catch (e) {
            console.warn('Realtime members refresh failed', e);
            window.setSyncStatus('offline');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'days_off',
          filter: `workspace_id=eq.${workspaceId}`
        },
        async () => {
          try {
            await window.loadFromSupabase();
            window.setSyncStatus('updated');
            if (!window.S.admin) window.render();
            setTimeout(() => window.setSyncStatus('saved'), 1500);
          } catch (e) {
            console.warn('Realtime days_off refresh failed', e);
            window.setSyncStatus('offline');
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          window.setSyncStatus('saved');
        }
      });
  };

  window.createMember = async function (member) {
    window.setSyncStatus('saving');

    const { error } = await window.sb
      .from('members')
      .insert([window.uiMemberToDb(member)]);

    if (error) {
      window.setSyncStatus('offline');
      throw error;
    }

    window.setSyncStatus('saved');
  };

  window.updateMember = async function (member) {
    window.setSyncStatus('saving');

    const { error } = await window.sb
      .from('members')
      .update({
        name: member.name,
        color: member.color,
        max_pto: member.maxPTO,
        max_parental: member.maxParental
      })
      .eq('id', member.id)
      .eq('workspace_id', window.SABEE_CONFIG.WORKSPACE_ID);

    if (error) {
      window.setSyncStatus('offline');
      throw error;
    }

    window.setSyncStatus('saved');
  };

  window.deleteMember = async function (memberId) {
    window.setSyncStatus('saving');

    const { error } = await window.sb
      .from('members')
      .delete()
      .eq('id', memberId)
      .eq('workspace_id', window.SABEE_CONFIG.WORKSPACE_ID);

    if (error) {
      window.setSyncStatus('offline');
      throw error;
    }

    window.setSyncStatus('saved');
  };

  window.createDayOff = async function (entry) {
    window.setSyncStatus('saving');

    const { error } = await window.sb
      .from('days_off')
      .insert([window.uiDayOffToDb(entry)]);

    if (error) {
      window.setSyncStatus('offline');
      throw error;
    }

    window.setSyncStatus('saved');
  };

  window.deleteDayOff = async function (entryId) {
    window.setSyncStatus('saving');

    const { error } = await window.sb
      .from('days_off')
      .delete()
      .eq('id', entryId)
      .eq('workspace_id', window.SABEE_CONFIG.WORKSPACE_ID);

    if (error) {
      window.setSyncStatus('offline');
      throw error;
    }

    window.setSyncStatus('saved');
  };

  window.clearAllWorkspaceData = async function () {
    const workspaceId = window.SABEE_CONFIG.WORKSPACE_ID;

    window.setSyncStatus('saving');

    const { error: daysOffError } = await window.sb
      .from('days_off')
      .delete()
      .eq('workspace_id', workspaceId);

    if (daysOffError) {
      window.setSyncStatus('offline');
      throw daysOffError;
    }

    const { error: membersError } = await window.sb
      .from('members')
      .delete()
      .eq('workspace_id', workspaceId);

    if (membersError) {
      window.setSyncStatus('offline');
      throw membersError;
    }

    window.setSyncStatus('saved');
  };
})();
