/**
 * Members & Admin Dashboard controller (dashboard.html).
 * Page guard ensures user is logged in; PostgreSQL RLS restricts visible rows and mutations.
 */

import { supabase } from './supabaseClient.js';
import {
  createEl,
  populateMembersShell,
  requireAuth,
} from './auth.js';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showFeedback(type, message) {
  const box = document.getElementById('dashActionFeedback');
  if (!box) return;
  box.className = `alert alert-${type} mb-3`;
  box.textContent = message;
  box.classList.remove('d-none');
}

function renderUsersTable(users, currentUserId, isAdmin, reloadFn) {
  const tbody = document.getElementById('usersTableBody');
  const actionHead = document.getElementById('usersActionColHead');
  const countEl = document.getElementById('statUsersCount');
  if (!tbody) return;

  if (countEl) countEl.textContent = String(users.length);
  if (actionHead) actionHead.classList.toggle('d-none', !isAdmin);

  if (users.length === 0) {
    const tr = document.createElement('tr');
    const td = createEl('td', 'text-muted', 'No user profiles visible for your account.');
    td.colSpan = isAdmin ? 7 : 6;
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return;
  }

  const rows = users.map((u) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    const userWrap = createEl('div', 'd-flex align-items-center');
    const initials = (u.full_name || u.email || 'SW')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'SW';
    userWrap.appendChild(createEl('span', 'sw-ta-user-avatar', initials));
    userWrap.appendChild(createEl('span', 'font-weight-bold', u.full_name));
    nameTd.appendChild(userWrap);
    tr.appendChild(nameTd);

    tr.appendChild(createEl('td', null, u.email));
    tr.appendChild(createEl('td', null, u.phone || '-'));
    tr.appendChild(createEl('td', null, u.organisation || '-'));

    const roleTd = document.createElement('td');
    roleTd.appendChild(
      createEl('span', u.role === 'admin' ? 'badge badge-primary' : 'badge badge-light border', u.role)
    );
    tr.appendChild(roleTd);
    tr.appendChild(createEl('td', null, formatDate(u.created_at)));

    if (isAdmin) {
      const actionTd = document.createElement('td');
      if (u.id === currentUserId) {
        actionTd.appendChild(createEl('small', 'text-muted', 'Current user'));
      } else {
        const nextRole = u.role === 'admin' ? 'client' : 'admin';
        const btn = createEl(
          'button',
          u.role === 'admin' ? 'btn btn-outline-secondary btn-xs' : 'btn btn-outline-royal btn-xs',
          u.role === 'admin' ? 'Set Client' : 'Make Admin'
        );
        btn.type = 'button';
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await supabase
            .from('profiles')
            .update({ role: nextRole })
            .eq('id', u.id);
          if (error) {
            showFeedback('danger', `Role update blocked: ${error.message}`);
            btn.disabled = false;
            return;
          }
          showFeedback('success', `Updated ${u.full_name} role to ${nextRole}.`);
          await reloadFn();
        });
        actionTd.appendChild(btn);
      }
      tr.appendChild(actionTd);
    }
    return tr;
  });

  tbody.replaceChildren(...rows);
}

async function loadAdminEnrollments() {
  const tbody = document.getElementById('adminEnrollmentsBody');
  const countEl = document.getElementById('statEnrollmentsCount');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('training_enrollments')
    .select('id, status, payment_status, payment_method, payment_reference, amount_paid_ugx, created_at, profiles(full_name, email), trainings(title, fee_ugx)')
    .order('created_at', { ascending: false });

  if (error) {
    const tr = document.createElement('tr');
    const td = createEl('td', 'text-danger', `Error: ${error.message}`);
    td.colSpan = 4;
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (countEl) countEl.textContent = String(rows.length);

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = createEl('td', 'text-muted', 'No service orders yet.');
    td.colSpan = 4;
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return rows;
  }

  const trNodes = rows.map((row) => {
    const tr = document.createElement('tr');
    const applicantName = row.profiles?.full_name || row.profiles?.email || 'Client';
    tr.appendChild(createEl('td', null, applicantName));
    tr.appendChild(createEl('td', null, row.trainings?.title || 'Web Service'));

    const payTd = document.createElement('td');
    const payStatus = row.payment_status || 'unpaid';
    const badgeCls =
      payStatus === 'paid'
        ? 'badge badge-success'
        : payStatus === 'pending_verification'
          ? 'badge badge-info'
          : payStatus === 'pay_on_arrival'
            ? 'badge badge-light border'
            : 'badge badge-secondary';
    payTd.appendChild(createEl('span', badgeCls, payStatus));
    const displayFee = row.amount_paid_ugx > 0 ? row.amount_paid_ugx : row.trainings?.fee_ugx;
    if (typeof displayFee === 'number') {
      payTd.appendChild(createEl('div', 'small text-muted', `UGX ${displayFee.toLocaleString('en-UG')}`));
    }
    if (row.payment_reference) {
      payTd.appendChild(createEl('div', 'small text-muted', row.payment_reference));
    }
    tr.appendChild(payTd);

    const statusTd = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'form-control form-control-sm';
    select.setAttribute('aria-label', `Order status for ${applicantName}`);
    ['pending', 'confirmed', 'cancelled'].forEach((optVal) => {
      const opt = createEl('option', null, optVal);
      opt.value = optVal;
      if (row.status === optVal) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error: updErr } = await supabase
        .from('training_enrollments')
        .update({ status: select.value })
        .eq('id', row.id);
      select.disabled = false;
      if (updErr) {
        showFeedback('danger', `Status update failed: ${updErr.message}`);
      } else {
        showFeedback('success', `Order status updated to ${select.value}.`);
      }
    });
    statusTd.appendChild(select);
    tr.appendChild(statusTd);
    return tr;
  });

  tbody.replaceChildren(...trNodes);
  return rows;
}

async function loadAdminMessages() {
  const tbody = document.getElementById('adminMessagesBody');
  const countEl = document.getElementById('statMessagesCount');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('contact_messages')
    .select('id, name, email, subject, message, is_read, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    const tr = document.createElement('tr');
    const td = createEl('td', 'text-danger', `Error: ${error.message}`);
    td.colSpan = 3;
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  const unreadCount = rows.filter((m) => !m.is_read).length;
  if (countEl) countEl.textContent = String(unreadCount);

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = createEl('td', 'text-muted', 'No contact messages received yet.');
    td.colSpan = 3;
    tr.appendChild(td);
    tbody.replaceChildren(tr);
    return rows;
  }

  const trNodes = rows.map((m) => {
    const tr = document.createElement('tr');
    const senderTd = document.createElement('td');
    senderTd.appendChild(createEl('div', 'font-weight-bold', m.name));
    senderTd.appendChild(createEl('small', 'text-muted', m.email));
    tr.appendChild(senderTd);

    const msgTd = document.createElement('td');
    if (m.subject) {
      msgTd.appendChild(createEl('div', 'font-weight-bold small', m.subject));
    }
    msgTd.appendChild(createEl('div', 'small', m.message));
    tr.appendChild(msgTd);

    const actTd = document.createElement('td');
    const readBtn = createEl(
      'button',
      m.is_read ? 'btn btn-outline-secondary btn-xs mr-1 mb-1' : 'btn btn-outline-royal btn-xs mr-1 mb-1',
      m.is_read ? 'Read' : 'Mark Read'
    );
    readBtn.type = 'button';
    readBtn.addEventListener('click', async () => {
      readBtn.disabled = true;
      await supabase.from('contact_messages').update({ is_read: !m.is_read }).eq('id', m.id);
      await loadAdminMessages();
    });

    const delBtn = createEl('button', 'btn btn-outline-danger btn-xs mb-1', 'Delete');
    delBtn.type = 'button';
    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      await supabase.from('contact_messages').delete().eq('id', m.id);
      await loadAdminMessages();
    });

    actTd.appendChild(readBtn);
    actTd.appendChild(delBtn);
    tr.appendChild(actTd);
    return tr;
  });

  tbody.replaceChildren(...trNodes);
  return rows;
}

const dashState = {
  users: [],
  enrollments: [],
  messages: [],
  trainings: [],
  projectsCount: 0,
  barMode: 'monthly',
  searchQuery: '',
};

function filteredUsers() {
  const q = dashState.searchQuery.trim().toLowerCase();
  if (!q) return dashState.users;
  return dashState.users.filter((u) =>
    [u.full_name, u.email, u.organisation, u.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  );
}

async function loadDashboardData(auth) {
  const { user, profile } = auth;
  const isAdmin = profile?.role === 'admin';

  const [{ count: projCount }, { data: usersData, error: usersErr }, { data: trainingsData }] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, organisation, role, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('trainings').select('id, title, level, fee_ugx').eq('is_open', true),
  ]);

  dashState.projectsCount = projCount ?? 0;
  dashState.trainings = Array.isArray(trainingsData) ? trainingsData : [];
  dashState.users = Array.isArray(usersData) ? usersData : [];

  const statProj = document.getElementById('statProjectsCount');
  if (statProj) statProj.textContent = String(dashState.projectsCount);

  if (usersErr) {
    showFeedback('danger', `Unable to load profiles: ${usersErr.message}`);
  } else {
    renderUsersTable(filteredUsers(), user.id, isAdmin, () => loadDashboardData(auth));
    const statUsersEl = document.getElementById('statUsersCount');
    if (statUsersEl) statUsersEl.textContent = String(dashState.users.length);
  }

  const clientNotice = document.getElementById('clientRoleNotice');
  const adminSection = document.getElementById('adminSection');

  if (!isAdmin) {
    if (clientNotice) {
      clientNotice.textContent =
        'You are signed in as a registered client. Supabase Row Level Security limits the Registered Users table to your own profile and restricts the Admin section to role = admin.';
      clientNotice.classList.remove('d-none');
    }
    if (adminSection) adminSection.classList.add('d-none');

    const { count: ownEnrollCount } = await supabase
      .from('training_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const statEnroll = document.getElementById('statEnrollmentsCount');
    if (statEnroll) statEnroll.textContent = String(ownEnrollCount ?? 0);
    return;
  }

  if (clientNotice) clientNotice.classList.add('d-none');
  if (adminSection) adminSection.classList.remove('d-none');

  const [enrollmentsRows, messagesRows] = await Promise.all([loadAdminEnrollments(), loadAdminMessages()]);
  dashState.enrollments = Array.isArray(enrollmentsRows) ? enrollmentsRows : [];
  dashState.messages = Array.isArray(messagesRows) ? messagesRows : [];

  if (window.SWDashboardUI) {
    window.SWDashboardUI.renderAll(dashState, dashState.barMode);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAuth({ redirectTo: 'login.html' });
  if (!auth) return;

  // Enforce role routing: only admins access dashboard.html; clients are directed to the actual website (index.html)
  if (!auth.profile || auth.profile.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }

  populateMembersShell({ user: auth.user, profile: auth.profile, activePage: 'dashboard' });

  const loadingBox = document.getElementById('dashLoading');
  const contentBox = document.getElementById('dashContent');
  if (loadingBox) loadingBox.classList.add('d-none');
  if (contentBox) contentBox.classList.remove('d-none');

  const searchInput = document.getElementById('dashUserSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      dashState.searchQuery = searchInput.value || '';
      renderUsersTable(filteredUsers(), auth.user.id, true, () => loadDashboardData(auth));
    });
  }

  document.querySelectorAll('[data-dash-bar-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dashState.barMode = btn.getAttribute('data-dash-bar-mode') || 'monthly';
      document.querySelectorAll('[data-dash-bar-mode]').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      if (window.SWDashboardUI) {
        window.SWDashboardUI.renderBarOnly(dashState, dashState.barMode);
      }
    });
  });

  const refreshBtn = document.getElementById('dashRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      try {
        await loadDashboardData(auth);
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

  try {
    await loadDashboardData(auth);
  } catch (err) {
    showFeedback('danger', `Unable to load dashboard data: ${err?.message || 'Unexpected error'}`);
  }
});
