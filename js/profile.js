/**
 * Client Profile page controller (profile.html).
 * Enforces session check (or displays newly registered pending client profile),
 * loads and updates public.profiles (never sending role), and displays training_enrollments.
 */

import { supabase } from './supabaseClient.js';
import {
  createEl,
  getSessionAndProfile,
  populateMembersShell,
  setFieldValidation,
} from './auth.js';

const PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
const LOCAL_ENROLLMENTS_KEY = 'sw_training_enrollments';
const LAST_CLIENT_KEY = 'sw_last_registered_client';

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSavedPendingClient() {
  try {
    const raw = localStorage.getItem(LAST_CLIENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function getSavedLocalEnrollments() {
  try {
    const raw = localStorage.getItem(LOCAL_ENROLLMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function validateProfileForm() {
  const nameInput = document.getElementById('profileFullName');
  const phoneInput = document.getElementById('profilePhone');
  const orgInput = document.getElementById('profileOrganisation');

  const nameErr = document.getElementById('profileFullNameError');
  const phoneErr = document.getElementById('profilePhoneError');
  const orgErr = document.getElementById('profileOrganisationError');

  const nameVal = (nameInput?.value || '').trim();
  const phoneVal = (phoneInput?.value || '').trim();
  const orgVal = (orgInput?.value || '').trim();

  let nameMsg = '';
  if (!nameVal) nameMsg = 'Full name is required.';
  else if (nameVal.length < 2 || nameVal.length > 100) nameMsg = 'Full name must be 2 to 100 characters.';

  let phoneMsg = '';
  if (phoneVal && !PHONE_PATTERN.test(phoneVal)) {
    phoneMsg = 'Enter a valid phone number (7–20 digits) or leave blank.';
  }

  let orgMsg = '';
  if (orgVal.length > 120) orgMsg = 'Organisation name cannot exceed 120 characters.';

  const ok = [
    setFieldValidation(nameInput, nameErr, nameMsg),
    setFieldValidation(phoneInput, phoneErr, phoneMsg),
    setFieldValidation(orgInput, orgErr, orgMsg),
  ];

  return ok.every(Boolean);
}

function statusBadgeClass(status) {
  if (status === 'confirmed') return 'badge badge-success';
  if (status === 'cancelled') return 'badge badge-danger';
  return 'badge badge-warning';
}

function paymentStatusBadge(paymentStatus) {
  if (paymentStatus === 'paid') return { className: 'badge badge-success mr-1', label: 'Paid' };
  if (paymentStatus === 'pending_verification') return { className: 'badge badge-info mr-1', label: 'Sandbox Paid / Verifying' };
  if (paymentStatus === 'pay_on_arrival') return { className: 'badge badge-light border mr-1', label: 'Pay on Arrival' };
  if (paymentStatus === 'failed') return { className: 'badge badge-danger mr-1', label: 'Payment Failed' };
  return { className: 'badge badge-secondary mr-1', label: 'Unpaid' };
}

function renderEnrollmentRows(rows, onCancel) {
  const box = document.getElementById('myEnrollmentsBox');
  const countEl = document.getElementById('myEnrollmentsCount');
  if (!box) return;

  if (countEl) countEl.textContent = String(rows.length);

  if (rows.length === 0) {
    const emptyP = createEl('p', 'text-muted mb-3', 'You have not booked any web design services or packages yet.');
    const link = createEl('a', 'btn btn-outline-royal btn-sm', 'Explore Web Services');
    link.href = 'services.html';
    box.replaceChildren(emptyP, link);
    return;
  }

  const list = createEl('ul', 'list-group list-group-flush');
  rows.forEach((row) => {
    const li = createEl('li', 'list-group-item sw-enrollment-item px-0');
    const top = createEl('div', 'd-flex flex-wrap justify-content-between align-items-start mb-1');
    const title = row.trainings?.title || 'Web Service';
    top.appendChild(createEl('strong', null, title));

    const badgeWrap = createEl('div', 'd-flex align-items-center');
    const payInfo = paymentStatusBadge(row.payment_status);
    badgeWrap.appendChild(createEl('span', payInfo.className, payInfo.label));
    badgeWrap.appendChild(createEl('span', statusBadgeClass(row.status), row.status));
    top.appendChild(badgeWrap);
    li.appendChild(top);

    const feeText = typeof row.trainings?.fee_ugx === 'number'
      ? `UGX ${row.trainings.fee_ugx.toLocaleString('en-UG')}`
      : null;
    const subParts = [
      row.trainings?.level,
      row.trainings?.mode,
      feeText,
    ].filter(Boolean);
    if (subParts.length > 0) {
      li.appendChild(createEl('div', 'small text-muted', subParts.join(' · ')));
    }
    if (row.payment_reference) {
      li.appendChild(createEl('div', 'small text-muted mt-1', `Ref: ${row.payment_reference}`));
    }

    if (row.status === 'pending') {
      const actions = createEl('div', 'd-flex flex-wrap align-items-center mt-2');
      const canPay =
        row.payment_status !== 'paid' &&
        row.payment_status !== 'pending_verification' &&
        (row.training_id || row.trainings?.id);
      if (canPay) {
        const payLink = createEl('a', 'btn btn-primary btn-xs mr-3', 'Pay Online');
        payLink.href = `services.html?pay=${encodeURIComponent(row.training_id || row.trainings.id)}`;
        actions.appendChild(payLink);
      }
      if (onCancel) {
        const cancelBtn = createEl('button', 'btn btn-link btn-sm text-danger p-0', 'Cancel Request');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', () => onCancel(row, cancelBtn));
        actions.appendChild(cancelBtn);
      }
      if (actions.childNodes.length > 0) li.appendChild(actions);
    }

    list.appendChild(li);
  });

  const browseWrap = createEl('div', 'mt-3 pt-2 border-top');
  const browseLink = createEl('a', 'btn btn-outline-royal btn-sm', 'Book Another Service');
  browseLink.href = 'services.html';
  browseWrap.appendChild(browseLink);

  box.replaceChildren(list, browseWrap);
}

async function loadMyEnrollments(userId) {
  const box = document.getElementById('myEnrollmentsBox');
  if (!box) return;

  if (!userId) {
    const localRows = getSavedLocalEnrollments();
    renderEnrollmentRows(localRows, (row) => {
      const remaining = getSavedLocalEnrollments().filter((r) => r.training_id !== row.training_id);
      try {
        localStorage.setItem(LOCAL_ENROLLMENTS_KEY, JSON.stringify(remaining));
      } catch (_) {}
      loadMyEnrollments(null);
    });
    return;
  }

  const { data, error } = await supabase
    .from('training_enrollments')
    .select('id, training_id, status, payment_status, payment_method, payment_reference, amount_paid_ugx, created_at, trainings(id, title, level, mode, fee_ugx, start_date)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    box.replaceChildren(createEl('div', 'alert alert-danger mb-0', `Unable to load enrollments: ${error.message}`));
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  renderEnrollmentRows(rows, async (row, cancelBtn) => {
    cancelBtn.disabled = true;
    const { error: delErr } = await supabase
      .from('training_enrollments')
      .delete()
      .eq('id', row.id);
    if (!delErr) {
      await loadMyEnrollments(userId);
    } else {
      cancelBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const sessionRes = await getSessionAndProfile();
  let user = sessionRes?.user || null;
  let profile = sessionRes?.profile || null;
  const pendingClient = getSavedPendingClient();

  if (!user && !pendingClient) {
    window.location.replace('login.html?next=profile.html');
    return;
  }

  if (!user && pendingClient) {
    user = {
      id: pendingClient.id || null,
      email: pendingClient.email || '',
      created_at: pendingClient.created_at || new Date().toISOString(),
      user_metadata: {
        full_name: pendingClient.full_name || '',
        phone: pendingClient.phone || '',
        organisation: pendingClient.organisation || '',
      },
    };
    profile = {
      id: pendingClient.id || null,
      full_name: pendingClient.full_name || 'Client',
      email: pendingClient.email || '',
      phone: pendingClient.phone || '',
      organisation: pendingClient.organisation || '',
      role: pendingClient.role || 'client',
      created_at: pendingClient.created_at || new Date().toISOString(),
    };
  }

  populateMembersShell({ user, profile, activePage: 'profile' });

  const loadingBox = document.getElementById('profileAuthLoading');
  const contentBox = document.getElementById('profileContent');
  if (loadingBox) loadingBox.classList.add('d-none');
  if (contentBox) contentBox.classList.remove('d-none');

  const sinceEl = document.getElementById('memberSinceValue');
  if (sinceEl) sinceEl.textContent = formatDate(profile?.created_at || user.created_at);

  const nameInput = document.getElementById('profileFullName');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const orgInput = document.getElementById('profileOrganisation');

  const resolvedPhone = profile?.phone || user.user_metadata?.phone || '';
  const resolvedOrg = profile?.organisation || user.user_metadata?.organisation || '';

  const updateSummaryMeta = (phoneVal, orgVal) => {
    const phoneSummary = document.getElementById('summaryMemberPhone');
    const orgSummary = document.getElementById('summaryMemberOrg');
    if (phoneSummary) phoneSummary.textContent = phoneVal || 'Not provided';
    if (orgSummary) orgSummary.textContent = orgVal || 'Not provided';
  };

  if (nameInput) nameInput.value = profile?.full_name || user.user_metadata?.full_name || '';
  if (emailInput) emailInput.value = profile?.email || user.email || '';
  if (phoneInput) phoneInput.value = resolvedPhone;
  if (orgInput) orgInput.value = resolvedOrg;
  updateSummaryMeta(resolvedPhone, resolvedOrg);

  const form = document.getElementById('profileForm');
  const feedbackBox = document.getElementById('profileSaveFeedback');
  const saveBtn = document.getElementById('saveProfileBtn');

  if (form) {
    ['profileFullName', 'profilePhone', 'profileOrganisation'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('blur', validateProfileForm);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (feedbackBox) feedbackBox.classList.add('d-none');

      if (!validateProfileForm()) {
        if (feedbackBox) {
          feedbackBox.className = 'alert alert-danger mt-3 mb-0';
          feedbackBox.textContent = 'Please fix the highlighted fields before saving.';
          feedbackBox.classList.remove('d-none');
        }
        return;
      }

      const fullName = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const organisation = orgInput.value.trim();

      if (!sessionRes?.user) {
        const updatedPending = {
          ...(pendingClient || {}),
          full_name: fullName,
          phone,
          organisation,
        };
        try {
          localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(updatedPending));
        } catch (_) {}
        populateMembersShell({ user, profile: updatedPending, activePage: 'profile' });
        updateSummaryMeta(phone, organisation);
        if (feedbackBox) {
          feedbackBox.className = 'alert alert-success mt-3 mb-0';
          feedbackBox.textContent = 'Your profile details have been updated.';
          feedbackBox.classList.remove('d-none');
        }
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      // Never include 'role' in self-update (enforced by RLS policy profiles_update_own)
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          organisation: organisation || null,
        })
        .eq('id', user.id)
        .select('id, full_name, email, phone, organisation, role, created_at')
        .maybeSingle();

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile Changes';
      }

      if (error) {
        if (feedbackBox) {
          feedbackBox.className = 'alert alert-danger mt-3 mb-0';
          feedbackBox.textContent = `Could not update profile: ${error.message}`;
          feedbackBox.classList.remove('d-none');
        }
        return;
      }

      const resolvedUpdated = updatedProfile || {
        ...(profile || {}),
        id: user.id,
        full_name: fullName,
        email: profile?.email || user.email || '',
        phone: phone || '',
        organisation: organisation || '',
        role: profile?.role || 'client',
      };

      try {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            phone: phone || null,
            organisation: organisation || null,
          },
        });
      } catch (_) {}

      try {
        localStorage.setItem('sw_active_user_state', JSON.stringify(resolvedUpdated));
        localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(resolvedUpdated));
      } catch (_) {}

      populateMembersShell({ user, profile: resolvedUpdated, activePage: 'profile' });
      updateSummaryMeta(resolvedUpdated.phone || '', resolvedUpdated.organisation || '');
      if (feedbackBox) {
        feedbackBox.className = 'alert alert-success mt-3 mb-0';
        feedbackBox.textContent = 'Your profile has been updated.';
        feedbackBox.classList.remove('d-none');
      }
    });
  }

  try {
    await loadMyEnrollments(sessionRes?.user ? user.id : null);
  } catch (_) {}
});
