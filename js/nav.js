/**
 * Shared public navigation & footer helper for SOROTI WebWorks.
 * Uses only safe DOM APIs (textContent / classList / createElement) — never innerHTML.
 * Auth-aware:
 *  - Visitors: Client Login + Register
 *  - Logged-in clients: Profile + Logout
 *  - Admins (role === 'admin'): Profile + Dashboard + Logout
 */

import { supabase } from './supabaseClient.js';
import { clearClientAuthStorage, createEl, getSessionAndProfile, signOutAndRedirect } from './auth.js';
import { closeWelcomeAuthModal, initWelcomeAuthPrompt } from './authPrompt.js?v=20261126c';

function makeAuthListItem(node) {
  const li = createEl('li', 'nav-item ml-lg-2 mt-2 mt-lg-0');
  li.dataset.authSlot = 'dynamic';
  li.appendChild(node);
  return li;
}

function renderAuthNavItems(user, profile, currentPage) {
  const navList = document.querySelector('#swMainNav .navbar-nav');
  if (!navList) return;

  // Remove existing auth slot items
  navList.querySelectorAll('[data-auth-slot]').forEach((item) => item.remove());

  if (!user) {
    const loginLink = createEl(
      'a',
      currentPage === 'login' ? 'btn btn-primary btn-sm mr-2' : 'btn btn-outline-royal btn-sm mr-2',
      'Client Login'
    );
    loginLink.href = 'login.html';
    if (currentPage === 'login') loginLink.setAttribute('aria-current', 'page');

    const registerLink = createEl(
      'a',
      currentPage === 'register' ? 'btn btn-primary btn-sm active' : 'btn btn-primary btn-sm',
      'Register'
    );
    registerLink.href = 'register.html';
    if (currentPage === 'register') registerLink.setAttribute('aria-current', 'page');

    navList.appendChild(makeAuthListItem(loginLink));
    const regLi = createEl('li', 'nav-item mt-2 mt-lg-0');
    regLi.dataset.authSlot = 'dynamic';
    regLi.appendChild(registerLink);
    navList.appendChild(regLi);
    return;
  }

  const profileLink = createEl(
    'a',
    currentPage === 'profile' ? 'btn btn-primary btn-sm mr-2' : 'btn btn-outline-royal btn-sm mr-2',
    'My Profile'
  );
  profileLink.href = 'profile.html';
  if (currentPage === 'profile') profileLink.setAttribute('aria-current', 'page');
  navList.appendChild(makeAuthListItem(profileLink));

  if (profile && profile.role === 'admin') {
    const dashLink = createEl(
      'a',
      currentPage === 'dashboard' ? 'btn btn-primary btn-sm mr-2' : 'btn btn-outline-royal btn-sm mr-2',
      'Dashboard'
    );
    dashLink.href = 'dashboard.html';
    if (currentPage === 'dashboard') dashLink.setAttribute('aria-current', 'page');
    const dashLi = createEl('li', 'nav-item mt-2 mt-lg-0');
    dashLi.dataset.authSlot = 'dynamic';
    dashLi.appendChild(dashLink);
    navList.appendChild(dashLi);
  }

  const logoutBtn = createEl('button', 'btn btn-primary btn-sm', 'Logout');
  logoutBtn.type = 'button';
  logoutBtn.setAttribute('data-action', 'logout-nav');
  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Logging out...';
    await signOutAndRedirect('login.html?loggedout=1');
  });
  const logoutLi = createEl('li', 'nav-item mt-2 mt-lg-0');
  logoutLi.dataset.authSlot = 'dynamic';
  logoutLi.appendChild(logoutBtn);
  navList.appendChild(logoutLi);
}

async function initNavigation() {
  const currentPage = document.body.dataset.page || '';

  // Highlight active navbar item
  const navItems = document.querySelectorAll('#swMainNav .nav-item[data-nav]');
  navItems.forEach((item) => {
    const link = item.querySelector('.nav-link');
    const isMatch = item.dataset.nav === currentPage;
    item.classList.toggle('active', isMatch);
    if (link) {
      if (isMatch) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  });

  // Set current year in footer
  const yearEl = document.getElementById('footerYear');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Allow Escape key to collapse open mobile menu
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const navCollapse = document.getElementById('swMainNav');
    if (navCollapse && navCollapse.classList.contains('show') && window.jQuery) {
      window.jQuery(navCollapse).collapse('hide');
    }
  });

  // Sync navbar auth controls with real Supabase session
  const { user, profile } = await getSessionAndProfile();
  renderAuthNavItems(user, profile, currentPage);

  // Prompt first-time / unauthenticated visitors on public pages to Sign In or Create Account
  initWelcomeAuthPrompt({
    currentPage,
    user,
    onAuthSuccess: (updated) => {
      renderAuthNavItems(updated?.user || null, updated?.profile || null, currentPage);
    },
  });

  supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') {
      clearClientAuthStorage();
    } else if (event === 'SIGNED_IN') {
      closeWelcomeAuthModal({ rememberGuest: false });
    }
    const updated = await getSessionAndProfile();
    renderAuthNavItems(updated.user, updated.profile, currentPage);
  });
}

document.addEventListener('DOMContentLoaded', initNavigation);
