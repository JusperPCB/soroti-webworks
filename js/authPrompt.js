/**
 * First-visit Welcome Auth Prompt modal for SOROTI WebWorks public pages.
 * Prompts unauthenticated visitors to Sign In or Create a Free Account (or Continue as Guest).
 * Uses strictly safe DOM creation (createEl / textContent — never innerHTML).
 */

import { supabase } from './supabaseClient.js';
import {
  createEl,
  getSessionAndProfile,
  registerClientAccount,
  setFieldValidation,
  validateEmail,
  validateNewPassword,
  validatePassword,
} from './auth.js';

const DISMISS_STORAGE_KEY = 'sw_guest_prompt_dismissed';
const EXCLUDED_PAGES = new Set(['login', 'register', 'profile', 'dashboard']);
const PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;

function createPasswordFieldGroup({ id, errorId, placeholder, autocomplete, minlength }) {
  const group = createEl('div', 'input-group');
  const input = createEl('input', 'form-control');
  input.type = 'password';
  input.id = id;
  input.required = true;
  if (minlength) input.minLength = minlength;
  input.autocomplete = autocomplete;
  input.placeholder = placeholder;
  input.setAttribute('aria-describedby', errorId);

  const append = createEl('div', 'input-group-append');
  const toggleBtn = createEl('button', 'btn btn-outline-secondary sw-password-toggle');
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-label', 'Show password');
  toggleBtn.setAttribute('aria-pressed', 'false');
  toggleBtn.title = 'Show password';
  const icon = createEl('i', 'fas fa-eye');
  icon.setAttribute('aria-hidden', 'true');
  toggleBtn.appendChild(icon);

  toggleBtn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
    toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggleBtn.title = show ? 'Hide password' : 'Show password';
  });

  append.appendChild(toggleBtn);
  const feedback = createEl('div', 'invalid-feedback');
  feedback.id = errorId;

  group.appendChild(input);
  group.appendChild(append);
  group.appendChild(feedback);

  return { group, input, feedback };
}

function createLabeledInput({ id, errorId, labelText, required, type = 'text', placeholder = '', autocomplete = 'off', inputmode = '' }) {
  const wrap = createEl('div', 'form-group mb-3');
  const label = createEl('label', 'sw-form-label', `${labelText} `);
  label.setAttribute('for', id);
  if (required) {
    label.appendChild(createEl('span', 'sw-required-mark', '*'));
  }

  const input = createEl('input', 'form-control');
  input.type = type;
  input.id = id;
  if (required) input.required = true;
  input.placeholder = placeholder;
  input.autocomplete = autocomplete;
  if (inputmode) input.inputMode = inputmode;
  if (type === 'email') {
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'none');
  }
  input.setAttribute('aria-describedby', errorId);

  const feedback = createEl('div', 'invalid-feedback');
  feedback.id = errorId;

  wrap.appendChild(label);
  wrap.appendChild(input);
  wrap.appendChild(feedback);
  return { wrap, input, feedback };
}

function setAlert(box, type, message) {
  if (!box) return;
  box.className = `alert alert-${type} mt-3 mb-0 py-2 px-3`;
  box.textContent = message;
  box.classList.remove('d-none');
}

export function closeWelcomeAuthModal({ rememberGuest = false } = {}) {
  const overlay = document.getElementById('swAuthModalOverlay');
  if (overlay) {
    overlay.classList.remove('is-open');
    window.setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 180);
  }
  document.body.classList.remove('sw-auth-modal-open');
  if (rememberGuest) {
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch (_) {}
  }
}

export function openWelcomeAuthModal({ initialTab = 'login', onAuthSuccess } = {}) {
  if (document.getElementById('swAuthModalOverlay')) return;

  const overlay = createEl('div', 'sw-auth-modal-overlay');
  overlay.id = 'swAuthModalOverlay';

  const dialog = createEl('div', 'sw-auth-modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'swAuthModalTitle');

  // Header
  const header = createEl('div', 'sw-auth-modal-header');
  const brandWrap = createEl('div', 'd-flex align-items-center');
  const mark = createEl('span', 'sw-brand-mark mr-2', 'SW');
  mark.setAttribute('aria-hidden', 'true');
  const titleWrap = createEl('div');
  const eyebrow = createEl('span', 'sw-auth-modal-eyebrow', 'SOROTI WebWorks Portal');
  const title = createEl('h2', 'sw-auth-modal-title mb-0', 'Sign In or Create an Account');
  title.id = 'swAuthModalTitle';
  titleWrap.appendChild(eyebrow);
  titleWrap.appendChild(title);
  brandWrap.appendChild(mark);
  brandWrap.appendChild(titleWrap);

  const closeBtn = createEl('button', 'sw-auth-modal-close', '×');
  closeBtn.type = 'button';
  closeBtn.id = 'swAuthModalCloseBtn';
  closeBtn.setAttribute('aria-label', 'Close and continue as guest');

  header.appendChild(brandWrap);
  header.appendChild(closeBtn);

  // Body
  const body = createEl('div', 'sw-auth-modal-body');
  const intro = createEl(
    'p',
    'sw-auth-modal-intro',
    'Sign in to book website packages & track projects, or create a free client account in seconds if you are new here.'
  );

  // Tabs
  const tabs = createEl('div', 'sw-auth-tabs mb-3');
  tabs.setAttribute('role', 'tablist');
  const tabLogin = createEl('button', 'sw-auth-tab active', 'Sign In');
  tabLogin.type = 'button';
  tabLogin.id = 'swAuthTabLogin';
  tabLogin.setAttribute('role', 'tab');
  tabLogin.setAttribute('aria-selected', 'true');

  const tabRegister = createEl('button', 'sw-auth-tab', 'Create Account');
  tabRegister.type = 'button';
  tabRegister.id = 'swAuthTabRegister';
  tabRegister.setAttribute('role', 'tab');
  tabRegister.setAttribute('aria-selected', 'false');

  tabs.appendChild(tabLogin);
  tabs.appendChild(tabRegister);

  // === LOGIN PANEL ===
  const loginForm = createEl('form', 'sw-auth-modal-form');
  loginForm.id = 'swModalLoginForm';
  loginForm.noValidate = true;

  const loginEmailField = createLabeledInput({
    id: 'swModalLoginEmail',
    errorId: 'swModalLoginEmailErr',
    labelText: 'Email Address',
    required: true,
    type: 'email',
    placeholder: 'you@business.ug',
    autocomplete: 'username',
    inputmode: 'email',
  });

  const loginPassWrap = createEl('div', 'form-group mb-3');
  const loginPassLabel = createEl('label', 'sw-form-label', 'Password ');
  loginPassLabel.setAttribute('for', 'swModalLoginPass');
  loginPassLabel.appendChild(createEl('span', 'sw-required-mark', '*'));
  const loginPassGroup = createPasswordFieldGroup({
    id: 'swModalLoginPass',
    errorId: 'swModalLoginPassErr',
    placeholder: 'Minimum 8 characters',
    autocomplete: 'current-password',
    minlength: 8,
  });
  loginPassWrap.appendChild(loginPassLabel);
  loginPassWrap.appendChild(loginPassGroup.group);

  const loginSubmitBtn = createEl('button', 'btn btn-primary btn-block sw-auth-submit-btn');
  loginSubmitBtn.type = 'submit';
  loginSubmitBtn.id = 'swModalLoginSubmit';
  const loginIcon = createEl('i', 'fas fa-sign-in-alt mr-2');
  loginIcon.setAttribute('aria-hidden', 'true');
  const loginBtnLabel = createEl('span', '', 'Sign In to My Account');
  loginSubmitBtn.appendChild(loginIcon);
  loginSubmitBtn.appendChild(loginBtnLabel);

  const loginFeedback = createEl('div', 'alert d-none mt-3 mb-0');
  loginFeedback.setAttribute('role', 'alert');

  const switchToRegWrap = createEl('p', 'text-center small text-muted mt-3 mb-0', 'New to SOROTI WebWorks? ');
  const switchToRegBtn = createEl('button', 'btn btn-link btn-sm p-0 font-weight-bold align-baseline', 'Create a free account');
  switchToRegBtn.type = 'button';
  switchToRegWrap.appendChild(switchToRegBtn);

  loginForm.appendChild(loginEmailField.wrap);
  loginForm.appendChild(loginPassWrap);
  loginForm.appendChild(loginSubmitBtn);
  loginForm.appendChild(loginFeedback);
  loginForm.appendChild(switchToRegWrap);

  // === REGISTER PANEL ===
  const regForm = createEl('form', 'sw-auth-modal-form d-none');
  regForm.id = 'swModalRegisterForm';
  regForm.noValidate = true;

  const regNameField = createLabeledInput({
    id: 'swModalRegName',
    errorId: 'swModalRegNameErr',
    labelText: 'Full Name',
    required: true,
    type: 'text',
    placeholder: 'e.g. Sarah Acheng',
    autocomplete: 'name',
  });

  const regEmailField = createLabeledInput({
    id: 'swModalRegEmail',
    errorId: 'swModalRegEmailErr',
    labelText: 'Email Address',
    required: true,
    type: 'email',
    placeholder: 'you@business.ug',
    autocomplete: 'email',
    inputmode: 'email',
  });

  const regRow = createEl('div', 'form-row');
  const regPhoneCol = createEl('div', 'col-sm-6');
  const regPhoneField = createLabeledInput({
    id: 'swModalRegPhone',
    errorId: 'swModalRegPhoneErr',
    labelText: 'Phone / WhatsApp',
    required: false,
    type: 'tel',
    placeholder: '+256 7XX XXX XXX',
    autocomplete: 'tel',
    inputmode: 'tel',
  });
  regPhoneCol.appendChild(regPhoneField.wrap);

  const regOrgCol = createEl('div', 'col-sm-6');
  const regOrgField = createLabeledInput({
    id: 'swModalRegOrg',
    errorId: 'swModalRegOrgErr',
    labelText: 'Business / School',
    required: false,
    type: 'text',
    placeholder: 'Optional',
    autocomplete: 'organization',
  });
  regOrgCol.appendChild(regOrgField.wrap);
  regRow.appendChild(regPhoneCol);
  regRow.appendChild(regOrgCol);

  const regPassWrap = createEl('div', 'form-group mb-3');
  const regPassLabel = createEl('label', 'sw-form-label', 'Password (8+ chars, letters & numbers) ');
  regPassLabel.setAttribute('for', 'swModalRegPass');
  regPassLabel.appendChild(createEl('span', 'sw-required-mark', '*'));
  const regPassGroup = createPasswordFieldGroup({
    id: 'swModalRegPass',
    errorId: 'swModalRegPassErr',
    placeholder: 'Create a strong password',
    autocomplete: 'new-password',
    minlength: 8,
  });
  regPassWrap.appendChild(regPassLabel);
  regPassWrap.appendChild(regPassGroup.group);

  const regConfirmWrap = createEl('div', 'form-group mb-3');
  const regConfirmLabel = createEl('label', 'sw-form-label', 'Confirm Password ');
  regConfirmLabel.setAttribute('for', 'swModalRegConfirm');
  regConfirmLabel.appendChild(createEl('span', 'sw-required-mark', '*'));
  const regConfirmGroup = createPasswordFieldGroup({
    id: 'swModalRegConfirm',
    errorId: 'swModalRegConfirmErr',
    placeholder: 'Repeat password',
    autocomplete: 'new-password',
    minlength: 8,
  });
  regConfirmWrap.appendChild(regConfirmLabel);
  regConfirmWrap.appendChild(regConfirmGroup.group);

  const regSubmitBtn = createEl('button', 'btn btn-primary btn-block sw-auth-submit-btn');
  regSubmitBtn.type = 'submit';
  regSubmitBtn.id = 'swModalRegSubmit';
  const regIcon = createEl('i', 'fas fa-user-plus mr-2');
  regIcon.setAttribute('aria-hidden', 'true');
  const regBtnLabel = createEl('span', '', 'Create Free Client Account');
  regSubmitBtn.appendChild(regIcon);
  regSubmitBtn.appendChild(regBtnLabel);

  const regFeedback = createEl('div', 'alert d-none mt-3 mb-0');
  regFeedback.setAttribute('role', 'alert');

  const switchToLoginWrap = createEl('p', 'text-center small text-muted mt-3 mb-0', 'Already have an account? ');
  const switchToLoginBtn = createEl('button', 'btn btn-link btn-sm p-0 font-weight-bold align-baseline', 'Sign in here');
  switchToLoginBtn.type = 'button';
  switchToLoginWrap.appendChild(switchToLoginBtn);

  regForm.appendChild(regNameField.wrap);
  regForm.appendChild(regEmailField.wrap);
  regForm.appendChild(regRow);
  regForm.appendChild(regPassWrap);
  regForm.appendChild(regConfirmWrap);
  regForm.appendChild(regSubmitBtn);
  regForm.appendChild(regFeedback);
  regForm.appendChild(switchToLoginWrap);

  body.appendChild(intro);
  body.appendChild(tabs);
  body.appendChild(loginForm);
  body.appendChild(regForm);

  // Footer
  const footer = createEl('div', 'sw-auth-modal-footer');
  const guestBtn = createEl('button', 'btn btn-outline-royal btn-sm', 'Continue as Guest');
  guestBtn.type = 'button';
  guestBtn.id = 'swAuthGuestBtn';

  const fullLinks = createEl('div', 'sw-auth-modal-links');
  const fullLoginLink = createEl('a', 'small', 'Full Login Page');
  fullLoginLink.href = 'login.html';
  const sep = createEl('span', 'mx-2 text-muted', '·');
  const fullRegLink = createEl('a', 'small', 'Full Register Page');
  fullRegLink.href = 'register.html';
  fullLinks.appendChild(fullLoginLink);
  fullLinks.appendChild(sep);
  fullLinks.appendChild(fullRegLink);

  footer.appendChild(guestBtn);
  footer.appendChild(fullLinks);

  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  document.body.classList.add('sw-auth-modal-open');

  function activateTab(tabName) {
    const isLogin = tabName !== 'register';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', isLogin ? 'true' : 'false');
    tabRegister.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
    loginForm.classList.toggle('d-none', !isLogin);
    regForm.classList.toggle('d-none', isLogin);
    const focusEl = isLogin ? loginEmailField.input : regNameField.input;
    window.setTimeout(() => focusEl.focus(), 40);
  }

  activateTab(initialTab);
  window.requestAnimationFrame(() => overlay.classList.add('is-open'));

  tabLogin.addEventListener('click', () => activateTab('login'));
  tabRegister.addEventListener('click', () => activateTab('register'));
  switchToRegBtn.addEventListener('click', () => activateTab('register'));
  switchToLoginBtn.addEventListener('click', () => activateTab('login'));

  const dismissAsGuest = () => closeWelcomeAuthModal({ rememberGuest: true });
  closeBtn.addEventListener('click', dismissAsGuest);
  guestBtn.addEventListener('click', dismissAsGuest);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismissAsGuest();
  });

  const escHandler = (event) => {
    if (event.key === 'Escape' && document.getElementById('swAuthModalOverlay')) {
      document.removeEventListener('keydown', escHandler);
      dismissAsGuest();
    }
  };
  document.addEventListener('keydown', escHandler);

  // Login submit
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginFeedback.classList.add('d-none');

    const emailVal = loginEmailField.input.value.trim();
    const passVal = loginPassGroup.input.value;
    const okEmail = setFieldValidation(loginEmailField.input, loginEmailField.feedback, validateEmail(emailVal));
    const okPass = setFieldValidation(loginPassGroup.input, loginPassGroup.feedback, validatePassword(passVal));
    if (!okEmail || !okPass) {
      setAlert(loginFeedback, 'danger', 'Please fix the highlighted fields to sign in.');
      return;
    }

    loginSubmitBtn.disabled = true;
    loginBtnLabel.textContent = 'Signing in...';

    const { error } = await supabase.auth.signInWithPassword({ email: emailVal, password: passVal });
    if (error) {
      loginSubmitBtn.disabled = false;
      loginBtnLabel.textContent = 'Sign In to My Account';
      setAlert(loginFeedback, 'danger', `Login failed: ${error.message}`);
      return;
    }

    const sessionState = await getSessionAndProfile();
    document.removeEventListener('keydown', escHandler);

    if (sessionState.profile?.role === 'admin') {
      setAlert(loginFeedback, 'success', 'Signed in as Administrator. Opening Admin Dashboard...');
      window.setTimeout(() => window.location.replace('dashboard.html'), 350);
      return;
    }

    closeWelcomeAuthModal({ rememberGuest: false });
    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess(sessionState);
    }
  });

  // Register submit
  regForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    regFeedback.classList.add('d-none');

    const fullName = regNameField.input.value.trim();
    const email = regEmailField.input.value.trim();
    const phone = regPhoneField.input.value.trim();
    const organisation = regOrgField.input.value.trim();
    const password = regPassGroup.input.value;
    const confirm = regConfirmGroup.input.value;

    const nameMsg = !fullName
      ? 'Please enter your full name.'
      : fullName.length < 2 || fullName.length > 100
      ? 'Full name must be 2–100 characters.'
      : '';
    const emailMsg = validateEmail(email);
    const phoneMsg = phone && !PHONE_PATTERN.test(phone) ? 'Enter a valid phone number or leave blank.' : '';
    const passMsg = validateNewPassword(password);
    const confirmMsg = !confirm ? 'Please confirm your password.' : confirm !== password ? 'Passwords do not match.' : '';

    const okAll = [
      setFieldValidation(regNameField.input, regNameField.feedback, nameMsg),
      setFieldValidation(regEmailField.input, regEmailField.feedback, emailMsg),
      setFieldValidation(regPhoneField.input, regPhoneField.feedback, phoneMsg),
      setFieldValidation(regPassGroup.input, regPassGroup.feedback, passMsg),
      setFieldValidation(regConfirmGroup.input, regConfirmGroup.feedback, confirmMsg),
    ].every(Boolean);

    if (!okAll) {
      setAlert(regFeedback, 'danger', 'Please fix the highlighted fields to create your account.');
      return;
    }

    regSubmitBtn.disabled = true;
    regBtnLabel.textContent = 'Creating Account...';

    const result = await registerClientAccount({ fullName, email, password, phone, organisation });
    if (result.alreadyRegistered) {
      regSubmitBtn.disabled = false;
      regBtnLabel.textContent = 'Create Free Client Account';
      setAlert(regFeedback, 'warning', `An account for ${email} already exists. Please sign in instead.`);
      loginEmailField.input.value = email;
      return;
    }

    if (result.error) {
      regSubmitBtn.disabled = false;
      regBtnLabel.textContent = 'Create Free Client Account';
      setAlert(regFeedback, 'danger', `Registration failed: ${result.error.message}`);
      return;
    }

    if (result.session && result.user) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null, organisation: organisation || null })
        .eq('id', result.user.id);
      const sessionState = await getSessionAndProfile();
      document.removeEventListener('keydown', escHandler);
      closeWelcomeAuthModal({ rememberGuest: false });
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess(sessionState);
      }
      return;
    }

    regSubmitBtn.disabled = false;
    regBtnLabel.textContent = 'Create Free Client Account';
    setAlert(
      regFeedback,
      'info',
      `Account created for ${email}. Please confirm your email inbox link, then sign in.`
    );
  });
}

export function initWelcomeAuthPrompt({ currentPage, user, onAuthSuccess } = {}) {
  if (user || EXCLUDED_PAGES.has(currentPage)) return;
  try {
    if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1') return;
    if (new URLSearchParams(window.location.search).get('no_prompt') === '1') return;
  } catch (_) {}

  window.setTimeout(() => {
    openWelcomeAuthModal({ initialTab: 'login', onAuthSuccess });
  }, 450);
}
