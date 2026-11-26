/**
 * Shared authentication, validation, and page-guard helpers for SOROTI WebWorks.
 * Uses only safe DOM APIs (textContent / createElement) — never innerHTML.
 * Note: Page guards improve UX; Supabase PostgreSQL RLS is the real security boundary.
 */

import { supabase } from './supabaseClient.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

const ALLOWED_REDIRECT_PAGES = new Set([
  'index.html',
  'about.html',
  'projects.html',
  'services.html',
  'trainings.html',
  'contact.html',
  'profile.html',
  'dashboard.html',
]);

export function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function setFieldValidation(inputEl, feedbackEl, errorMessage) {
  if (!inputEl || !feedbackEl) return true;
  if (errorMessage) {
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    inputEl.setAttribute('aria-invalid', 'true');
    feedbackEl.textContent = errorMessage;
    return false;
  }
  inputEl.classList.remove('is-invalid');
  inputEl.classList.add('is-valid');
  inputEl.setAttribute('aria-invalid', 'false');
  feedbackEl.textContent = '';
  return true;
}

export function validateEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) return 'Please enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Please enter a valid email address (for example, name@example.com).';
  }
  return '';
}

export function validatePassword(password) {
  const val = password || '';
  if (!val) return 'Please enter your password.';
  if (val.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  return '';
}

export function validateNewPassword(password) {
  const baseErr = validatePassword(password);
  if (baseErr) return baseErr;
  const val = password || '';
  if (!/[A-Za-z]/.test(val) || !/\d/.test(val)) {
    return 'Password must include at least one letter and one number.';
  }
  return '';
}

/**
 * Registers a client account via the Supabase `register-client` Edge Function
 * (backed by the Admin Auth API + Postgres `handle_new_user` trigger), avoiding
 * built-in SMTP hourly rate limits (`email rate limit exceeded`), then signs in.
 */
export async function registerClientAccount({ fullName, email, password, phone = '', organisation = '' }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanOrg = (organisation || '').trim();

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/register-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        full_name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
        organisation: cleanOrg,
      }),
    });

    const payload = await resp.json().catch(() => null);
    if (resp.status === 409 || payload?.code === 'email_exists') {
      return {
        user: null,
        session: null,
        alreadyRegistered: true,
        emailConfirmed: false,
        error: {
          message:
            payload?.error ||
            `An account with ${cleanEmail} is already registered. Please sign in on the Client Login page.`,
        },
      };
    }

    if (!resp.ok || !payload?.ok) {
      return {
        user: null,
        session: null,
        alreadyRegistered: false,
        emailConfirmed: false,
        error: { message: payload?.error || 'Unable to register right now. Please try again.' },
      };
    }

    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: payload.user?.email || cleanEmail,
      password,
    });

    return {
      user: signInData?.user || payload.user || null,
      session: signInData?.session || null,
      profileUser: payload.user || null,
      alreadyRegistered: false,
      emailConfirmed: true,
      error: null,
    };
  } catch (_) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone || null,
          organisation: cleanOrg || null,
        },
      },
    });

    if (error) {
      const already = /already registered/i.test(error.message);
      const msg = /rate limit/i.test(error.message)
        ? 'Email confirmation quota reached; please try again shortly or contact Soroti WebWorks support.'
        : error.message;
      return { user: null, session: null, alreadyRegistered: already, emailConfirmed: false, error: { message: msg } };
    }

    const dupIdentities = Boolean(data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
    return {
      user: data?.user || null,
      session: data?.session || null,
      profileUser: null,
      alreadyRegistered: dupIdentities,
      emailConfirmed: Boolean(data?.session),
      error: null,
    };
  }
}

export function safeNextUrl(fallback = 'index.html') {
  const params = new URLSearchParams(window.location.search);
  const rawNext = (params.get('next') || '').trim();
  if (!rawNext) return fallback;
  const baseFile = rawNext.split('?')[0].split('#')[0];
  if (ALLOWED_REDIRECT_PAGES.has(baseFile)) {
    return rawNext;
  }
  return fallback;
}

/**
 * Determines where a logged-in user should be directed based on their role:
 * - Admin (role === 'admin') -> 'dashboard.html' (Admin Dashboard)
 * - Client (role !== 'admin') -> 'index.html' (the actual website, or a non-admin ?next= target)
 */
export function resolveRoleDestination(profile, nextTarget = '') {
  const isAdmin = Boolean(profile && profile.role === 'admin');
  const cleanNext = (nextTarget || '').trim();
  const baseNext = cleanNext.split('?')[0].split('#')[0];

  if (isAdmin) {
    if (cleanNext && ALLOWED_REDIRECT_PAGES.has(baseNext)) {
      return cleanNext;
    }
    return 'dashboard.html';
  }

  // Client: never direct to dashboard.html; direct to the actual website (index.html) or allowed client page
  if (cleanNext && ALLOWED_REDIRECT_PAGES.has(baseNext) && baseNext !== 'dashboard.html') {
    return cleanNext;
  }
  return 'index.html';
}

export async function getSessionAndProfile() {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !sessionData?.session?.user) {
    return { session: null, user: null, profile: null, error: sessionErr || null };
  }

  const user = sessionData.session.user;
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, organisation, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedProfile = profile || {
    id: user.id,
    full_name: user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Client'),
    email: user.email || '',
    phone: user.user_metadata?.phone || '',
    organisation: user.user_metadata?.organisation || '',
    role: user.user_metadata?.role === 'admin' ? 'admin' : 'client',
    created_at: user.created_at || new Date().toISOString(),
  };

  try {
    localStorage.setItem('sw_active_user_state', JSON.stringify(resolvedProfile));
  } catch (_) {}

  return {
    session: sessionData.session,
    user,
    profile: resolvedProfile,
    error: profileErr || null,
  };
}

export async function requireAuth({ redirectTo = 'login.html' } = {}) {
  const result = await getSessionAndProfile();
  if (!result.session || !result.user) {
    const currentFile = window.location.pathname.split('/').pop() || 'profile.html';
    const nextParam = ALLOWED_REDIRECT_PAGES.has(currentFile)
      ? `?next=${encodeURIComponent(currentFile)}`
      : '';
    window.location.replace(`${redirectTo}${nextParam}`);
    return null;
  }
  return result;
}

export function clearClientAuthStorage() {
  const clearStore = (store) => {
    if (!store) return;
    try {
      store.removeItem('sw_active_user_state');
      store.removeItem('sw_last_registered_client');
      const keysToRemove = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && (/^sb-.*-auth-token/i.test(key) || key === 'supabase.auth.token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => store.removeItem(key));
    } catch (_) {}
  };
  clearStore(window.localStorage);
  clearStore(window.sessionStorage);
}

export async function signOutAndRedirect(target = 'login.html?loggedout=1') {
  clearClientAuthStorage();
  try {
    await supabase.auth.signOut();
  } catch (_) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {}
  }
  clearClientAuthStorage();
  window.location.replace(target);
}

export function populateMembersShell({ user, profile, activePage }) {
  const displayName = (profile && profile.full_name)
    || user?.user_metadata?.full_name
    || (user?.email ? user.email.split('@')[0] : 'Member');
  const displayEmail = (profile && profile.email) || user?.email || '';
  const role = (profile && profile.role) || 'client';
  const roleLabel = role === 'admin' ? 'Administrator' : 'Registered Client';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'SW';

  document.querySelectorAll('[data-member-name]').forEach((el) => {
    el.textContent = displayName;
  });
  document.querySelectorAll('[data-member-email]').forEach((el) => {
    el.textContent = displayEmail;
  });
  document.querySelectorAll('[data-member-role]').forEach((el) => {
    el.textContent = roleLabel;
  });
  document.querySelectorAll('[data-member-initials]').forEach((el) => {
    el.textContent = initials;
  });

  // Highlight active sidebar menu link
  document.querySelectorAll('.sidebar .nav-item[data-member-nav]').forEach((item) => {
    const isMatch = item.dataset.memberNav === activePage;
    item.classList.toggle('active', isMatch);
    const a = item.querySelector('a');
    if (a) {
      if (isMatch) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  });

  // Admin link badge/visibility helper in sidebar (UX only; RLS enforces access)
  document.querySelectorAll('[data-admin-nav]').forEach((el) => {
    el.classList.toggle('d-none', role !== 'admin');
  });

  // Wire all Logout triggers (guard against duplicate listeners when profile shell refreshes)
  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    if (btn.dataset.logoutBound === 'true') return;
    btn.dataset.logoutBound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      btn.setAttribute('disabled', 'true');
      btn.setAttribute('aria-disabled', 'true');
      if (btn.tagName === 'BUTTON' && !btn.classList.contains('dropdown-item')) {
        btn.textContent = 'Logging out...';
      }
      await signOutAndRedirect('login.html?loggedout=1');
    });
  });

  const yearEl = document.getElementById('footerYear');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}
