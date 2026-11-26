/**
 * User registration controller (register.html) for SOROTI WebWorks.
 * Validates required fields, email format, password >= 8, matching confirmation,
 * registers users into Supabase Auth, and reflects the newly registered account details.
 */

import { supabase } from './supabaseClient.js';
import {
  getSessionAndProfile,
  registerClientAccount,
  resolveRoleDestination,
  safeNextUrl,
  setFieldValidation,
  validateEmail,
  validateNewPassword,
} from './auth.js';

const PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;

function showFeedback(box, type, message) {
  if (!box) return;
  box.className = `alert alert-${type} mt-3 mb-0`;
  box.textContent = message;
  box.classList.remove('d-none');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validateRegisterForm() {
  const nameInput = document.getElementById('regFullName');
  const emailInput = document.getElementById('regEmail');
  const phoneInput = document.getElementById('regPhone');
  const orgInput = document.getElementById('regOrganisation');
  const passInput = document.getElementById('regPassword');
  const confirmInput = document.getElementById('regConfirmPassword');

  const nameErrEl = document.getElementById('regFullNameError');
  const emailErrEl = document.getElementById('regEmailError');
  const phoneErrEl = document.getElementById('regPhoneError');
  const orgErrEl = document.getElementById('regOrganisationError');
  const passErrEl = document.getElementById('regPasswordError');
  const confirmErrEl = document.getElementById('regConfirmPasswordError');

  const nameVal = (nameInput?.value || '').trim();
  const emailVal = (emailInput?.value || '').trim();
  const phoneVal = (phoneInput?.value || '').trim();
  const orgVal = (orgInput?.value || '').trim();
  const passVal = passInput?.value || '';
  const confirmVal = confirmInput?.value || '';

  let nameMsg = '';
  if (!nameVal) nameMsg = 'Please enter your full name.';
  else if (nameVal.length < 2 || nameVal.length > 100) nameMsg = 'Full name must be between 2 and 100 characters.';

  const emailMsg = validateEmail(emailVal);

  let phoneMsg = '';
  if (phoneVal && !PHONE_PATTERN.test(phoneVal)) {
    phoneMsg = 'Enter a valid phone number (7–20 digits) or leave blank.';
  }

  let orgMsg = '';
  if (orgVal.length > 120) {
    orgMsg = 'Organisation name cannot exceed 120 characters.';
  }

  const passMsg = validateNewPassword(passVal);

  let confirmMsg = '';
  if (!confirmVal) {
    confirmMsg = 'Please confirm your password.';
  } else if (confirmVal !== passVal) {
    confirmMsg = 'Passwords do not match.';
  }

  const ok = [
    setFieldValidation(nameInput, nameErrEl, nameMsg),
    setFieldValidation(emailInput, emailErrEl, emailMsg),
    setFieldValidation(phoneInput, phoneErrEl, phoneMsg),
    setFieldValidation(orgInput, orgErrEl, orgMsg),
    setFieldValidation(passInput, passErrEl, passMsg),
    setFieldValidation(confirmInput, confirmErrEl, confirmMsg),
  ];

  return ok.every(Boolean);
}

function setSubmitting(isSubmitting) {
  const btn = document.getElementById('registerSubmitBtn');
  const label = document.getElementById('registerSubmitLabel');
  if (btn) btn.disabled = isSubmitting;
  if (label) label.textContent = isSubmitting ? 'Creating Account...' : 'Create Account';
}

function showRegisteredSummary({ id, fullName, email, phone, organisation, nextTarget }) {
  try {
    localStorage.setItem(
      'sw_last_registered_client',
      JSON.stringify({
        id: id || null,
        full_name: fullName,
        email,
        phone: phone || '',
        organisation: organisation || '',
        role: 'client',
        created_at: new Date().toISOString(),
      })
    );
  } catch (_) {}

  const registerCard = document.getElementById('registerCard');
  const summaryCard = document.getElementById('registeredSummaryCard');
  if (!summaryCard) return;

  const setText = (idEl, val) => {
    const el = document.getElementById(idEl);
    if (el) el.textContent = val;
  };

  setText(
    'summaryNoticeText',
    `Your account for ${email} has been created and your profile is saved in the database. Please verify your email inbox link before signing in on Client Login.`
  );
  setText('summaryFullName', fullName);
  setText('summaryEmail', email);
  setText('summaryPhone', phone || 'Not provided');
  setText('summaryOrganisation', organisation || 'Not provided');
  setText('summaryRole', 'client');
  setText('summaryStatus', 'Pending email confirmation');

  const loginLink = document.getElementById('summaryLoginLink');
  if (loginLink) {
    const nextSuffix = nextTarget ? `&next=${encodeURIComponent(nextTarget)}` : '';
    loginLink.href = `login.html?email=${encodeURIComponent(email)}${nextSuffix}`;
  }

  const resendBtn = document.getElementById('summaryResendBtn');
  const resendFeedback = document.getElementById('summaryResendFeedback');
  if (resendBtn) {
    resendBtn.onclick = async () => {
      resendBtn.disabled = true;
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      resendBtn.disabled = false;
      if (resendFeedback) {
        resendFeedback.className = error ? 'alert alert-danger mt-2 mb-0' : 'alert alert-success mt-2 mb-0';
        resendFeedback.textContent = error
          ? `Could not resend email: ${error.message}`
          : `Confirmation email re-sent to ${email}.`;
        resendFeedback.classList.remove('d-none');
      }
    };
  }

  if (registerCard) registerCard.classList.add('d-none');
  summaryCard.classList.remove('d-none');
  summaryCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', async () => {
  const nextTarget = safeNextUrl('');
  const { user, profile } = await getSessionAndProfile();
  if (user) {
    window.location.replace(resolveRoleDestination(profile, nextTarget));
    return;
  }

  const form = document.getElementById('registerForm');
  const feedbackBox = document.getElementById('registerFeedback');
  const resetBtn = document.getElementById('summaryResetBtn');

  if (resetBtn && form) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      form.querySelectorAll('.is-valid, .is-invalid').forEach((el) => {
        el.classList.remove('is-valid', 'is-invalid');
      });
      const summaryCard = document.getElementById('registeredSummaryCard');
      const registerCard = document.getElementById('registerCard');
      if (summaryCard) summaryCard.classList.add('d-none');
      if (registerCard) registerCard.classList.remove('d-none');
    });
  }

  if (!form) return;

  ['regFullName', 'regEmail', 'regPhone', 'regOrganisation', 'regPassword', 'regConfirmPassword'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('blur', validateRegisterForm);
  });

  // Animated 4-bar password strength meter
  const passInputEl = document.getElementById('regPassword');
  const strengthTextEl = document.getElementById('regPasswordStrengthText');
  const pwBars = document.querySelectorAll('#regPasswordMeter .sw-pw-bar');
  if (passInputEl && pwBars.length === 4) {
    passInputEl.addEventListener('input', () => {
      const val = passInputEl.value || '';
      let score = 0;
      if (val.length >= 8) score += 1;
      if (val.length >= 10) score += 1;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
      if (/\d/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 1;
      if (val.length > 0 && val.length < 8) score = 1;

      const stateClass =
        score === 1
          ? 'is-active-weak'
          : score === 2
          ? 'is-active-fair'
          : score === 3
          ? 'is-active-good'
          : 'is-active-strong';

      pwBars.forEach((bar, idx) => {
        bar.className = 'sw-pw-bar' + (idx < score ? ` ${stateClass}` : '');
      });

      if (strengthTextEl) {
        const hasLetterAndNumber = /[A-Za-z]/.test(val) && /\d/.test(val);
        if (!val) {
          strengthTextEl.textContent = 'Password strength: At least 8 characters with letters & numbers';
        } else if (val.length < 8) {
          strengthTextEl.textContent = `Password strength: Too short (${val.length}/8 characters)`;
        } else if (!hasLetterAndNumber) {
          strengthTextEl.textContent = 'Password strength: Add at least one letter and one number';
        } else if (score === 2) {
          strengthTextEl.textContent = 'Password strength: Fair (meets requirements)';
        } else if (score === 3) {
          strengthTextEl.textContent = 'Password strength: Good';
        } else {
          strengthTextEl.textContent = 'Password strength: Strong · Ready for Supabase Auth';
        }
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (feedbackBox) feedbackBox.classList.add('d-none');

    if (!validateRegisterForm()) {
      showFeedback(feedbackBox, 'danger', 'Please fix the highlighted fields before creating your account.');
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const organisation = document.getElementById('regOrganisation').value.trim();
    const password = document.getElementById('regPassword').value;

    setSubmitting(true);
    const result = await registerClientAccount({
      fullName,
      email,
      password,
      phone,
      organisation,
    });
    setSubmitting(false);

    if (result.alreadyRegistered) {
      showFeedback(
        feedbackBox,
        'warning',
        `An account with ${email} is already registered. Please sign in on the Client Login page.`
      );
      return;
    }

    if (result.error) {
      showFeedback(feedbackBox, 'danger', `Registration failed: ${result.error.message}`);
      return;
    }

    const activeUser = result.user;
    if (result.session && activeUser) {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          organisation: organisation || null,
        })
        .eq('id', activeUser.id);
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, organisation, role, created_at')
        .eq('id', activeUser.id)
        .maybeSingle();
      window.location.replace(resolveRoleDestination(prof, nextTarget));
      return;
    }

    const meta = activeUser?.user_metadata || result.profileUser || {};
    showRegisteredSummary({
      id: activeUser?.id || null,
      fullName: meta.full_name || fullName,
      email: activeUser?.email || email,
      phone: meta.phone || phone,
      organisation: meta.organisation || organisation,
      nextTarget,
    });
    if (result.emailConfirmed) {
      const statusEl = document.getElementById('summaryStatus');
      const noticeEl = document.getElementById('summaryNoticeText');
      const resendBtnEl = document.getElementById('summaryResendBtn');
      if (statusEl) statusEl.textContent = 'Confirmed & saved in database';
      if (noticeEl) {
        noticeEl.textContent = `Your account for ${email} has been created and saved in the database. You can sign in right away on Client Login.`;
      }
      if (resendBtnEl) resendBtnEl.classList.add('d-none');
    }
  });
});
