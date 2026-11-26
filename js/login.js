/**
 * Login page controller (login.html) for SOROTI WebWorks.
 * Enforces client-side validation and signs in via Supabase Auth.
 */

import { supabase } from './supabaseClient.js';
import {
  getSessionAndProfile,
  resolveRoleDestination,
  safeNextUrl,
  setFieldValidation,
  signOutAndRedirect,
  validateEmail,
  validatePassword,
} from './auth.js';

function showFeedback(box, type, message) {
  if (!box) return;
  box.className = `alert alert-${type} mt-3 mb-0`;
  box.textContent = message;
  box.classList.remove('d-none');
}

function validateLoginForm() {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const emailError = document.getElementById('loginEmailError');
  const passwordError = document.getElementById('loginPasswordError');

  const emailMsg = validateEmail(emailInput?.value || '');
  const passMsg = validatePassword(passwordInput?.value || '');

  const okEmail = setFieldValidation(emailInput, emailError, emailMsg);
  const okPass = setFieldValidation(passwordInput, passwordError, passMsg);
  return okEmail && okPass;
}

function setSubmitting(isSubmitting) {
  const btn = document.getElementById('loginSubmitBtn');
  if (!btn) return;
  btn.disabled = isSubmitting;
  btn.textContent = isSubmitting ? 'Signing in...' : 'Sign In';
}

document.addEventListener('DOMContentLoaded', async () => {

  const params = new URLSearchParams(window.location.search);
  const statusBanner = document.getElementById('loginStatusBanner');
  const nextTarget = safeNextUrl('');

  if (params.get('loggedout') === '1' && statusBanner) {
    statusBanner.className = 'alert alert-success mb-3';
    statusBanner.textContent = 'You have been logged out securely.';
    statusBanner.classList.remove('d-none');
  } else if (params.get('registered') === '1' && statusBanner) {
    statusBanner.className = 'alert alert-info mb-3';
    statusBanner.textContent =
      'Account created. If confirmation email is enabled, verify your inbox before signing in.';
    statusBanner.classList.remove('d-none');
  } else if (nextTarget && (nextTarget.startsWith('services.html') || nextTarget.startsWith('trainings.html')) && statusBanner) {
    statusBanner.className = 'alert alert-info mb-3';
    statusBanner.textContent =
      'Please sign in (or create a client account) to book your selected web design service or package.';
    statusBanner.classList.remove('d-none');
  }

  const registerLink = document.getElementById('loginRegisterLink');
  if (registerLink && nextTarget) {
    registerLink.href = `register.html?next=${encodeURIComponent(nextTarget)}`;
  }

  // Check if already logged in: direct admin -> dashboard.html, client -> index.html (actual website)
  const { user, profile } = await getSessionAndProfile();
  if (user) {
    const targetForRole = resolveRoleDestination(profile, nextTarget);
    if (params.get('stay') !== '1') {
      window.location.replace(targetForRole);
      return;
    }
    const activeCard = document.getElementById('alreadyLoggedInCard');
    const loginCard = document.getElementById('loginCard');
    const nameEl = document.getElementById('activeUserName');
    const emailEl = document.getElementById('activeUserEmail');
    const roleEl = document.getElementById('activeUserRole');
    const adminBtn = document.getElementById('activeAdminDashBtn');
    const logoutBtn = document.getElementById('activeLogoutBtn');

    if (nameEl) nameEl.textContent = profile?.full_name || user.email;
    if (emailEl) emailEl.textContent = profile?.email || user.email || '';
    if (roleEl) roleEl.textContent = profile?.role === 'admin' ? 'Admin' : 'Client';
    if (adminBtn && profile?.role === 'admin') adminBtn.classList.remove('d-none');
    if (activeCard) activeCard.classList.remove('d-none');
    if (loginCard) loginCard.classList.add('d-none');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';
        await signOutAndRedirect('login.html?loggedout=1');
      });
    }
    return;
  }

  const form = document.getElementById('loginForm');
  const feedbackBox = document.getElementById('loginFeedback');
  const resendWrap = document.getElementById('resendWrap');
  const resendBtn = document.getElementById('resendConfirmBtn');
  const loginEmailInput = document.getElementById('loginEmail');

  if (loginEmailInput && params.get('email')) {
    loginEmailInput.value = params.get('email').trim();
  }

  if (!form) return;

  ['loginEmail', 'loginPassword'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', validateLoginForm);
  });

  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = (document.getElementById('loginEmail')?.value || '').trim();
      if (validateEmail(email)) return;
      resendBtn.disabled = true;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      resendBtn.disabled = false;
      if (error) {
        showFeedback(feedbackBox, 'danger', `Could not resend email: ${error.message}`);
      } else {
        showFeedback(feedbackBox, 'success', `Confirmation email re-sent to ${email}. Please check your inbox.`);
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (feedbackBox) feedbackBox.classList.add('d-none');
    if (resendWrap) resendWrap.classList.add('d-none');

    if (!validateLoginForm()) {
      showFeedback(feedbackBox, 'danger', 'Please fix the highlighted fields before signing in.');
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setSubmitting(false);
      if (/not confirmed/i.test(error.message)) {
        showFeedback(
          feedbackBox,
          'warning',
          'Your email address has not been confirmed yet. Please click the confirmation link in your email.'
        );
        if (resendWrap) resendWrap.classList.remove('d-none');
      } else {
        showFeedback(feedbackBox, 'danger', `Login failed: ${error.message}`);
      }
      return;
    }

    // Fetch profile role to direct Admin -> dashboard.html and Client -> index.html (actual website)
    let prof = null;
    if (data?.user) {
      const { data: fetchedProf } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, organisation, role, created_at')
        .eq('id', data.user.id)
        .maybeSingle();
      prof = fetchedProf || {
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email,
        phone: data.user.user_metadata?.phone || '',
        organisation: data.user.user_metadata?.organisation || '',
        role: data.user.user_metadata?.role === 'admin' ? 'admin' : 'client',
        created_at: data.user.created_at || new Date().toISOString(),
      };
      try {
        localStorage.setItem('sw_active_user_state', JSON.stringify(prof));
        localStorage.setItem('sw_last_registered_client', JSON.stringify(prof));
      } catch (_) {}
    }

    const destination = resolveRoleDestination(prof, nextTarget);
    window.location.replace(destination);
  });
});
