/**
 * Site-wide Light / Dark theme switcher & file:// Supabase runtime bridge for SOROTI WebWorks.
 * Loaded synchronously in <head> to prevent theme flash between page loads.
 * Uses only safe DOM APIs (createElement / textContent) — never innerHTML.
 */
(function () {
  var STORAGE_KEY = 'sw_theme';
  var SUPABASE_ESM_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
  var LAST_CLIENT_KEY = 'sw_last_registered_client';
  var LOCAL_ENROLLMENTS_KEY = 'sw_training_enrollments';

  function createEl(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setFieldValidation(inputEl, feedbackEl, errorMessage) {
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

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // Ignore storage errors in restricted browsing modes
    }
  }

  function applyDocumentTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      if (document.body.hasAttribute('data-member-page')) {
        document.body.setAttribute('data-background-color', theme === 'dark' ? 'dark' : 'bg1');
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          if (theme === 'dark') {
            sidebar.setAttribute('data-background-color', 'dark');
          } else {
            sidebar.removeAttribute('data-background-color');
          }
        }
      }
    }
  }

  function updateToggleButtons(theme) {
    var isDark = theme === 'dark';
    var buttons = document.querySelectorAll('[data-action="toggle-theme"]');

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      var nextLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);

      var iconEl = btn.querySelector('i');
      if (iconEl) {
        iconEl.className = isDark ? 'fas fa-sun mr-1' : 'fas fa-moon mr-1';
      }

      var textEl = btn.querySelector('[data-theme-label]') || btn.querySelector('p') || btn.querySelector('span');
      if (textEl) {
        textEl.textContent = btn.closest('.sidebar')
          ? (isDark ? 'Light Mode' : 'Dark Mode')
          : (isDark ? 'Light' : 'Dark');
      }
    });
  }

  function injectPublicNavbarToggle() {
    var navList = document.querySelector('#swMainNav .navbar-nav');
    if (!navList || navList.querySelector('[data-action="toggle-theme"]')) return;

    var li = document.createElement('li');
    li.className = 'nav-item ml-lg-2 mt-2 mt-lg-0';
    li.dataset.themeNav = 'true';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-royal btn-sm sw-theme-toggle';
    btn.setAttribute('data-action', 'toggle-theme');

    var icon = document.createElement('i');
    icon.className = 'fas fa-moon mr-1';
    icon.setAttribute('aria-hidden', 'true');

    var label = document.createElement('span');
    label.setAttribute('data-theme-label', 'true');
    label.textContent = 'Dark';

    btn.appendChild(icon);
    btn.appendChild(label);
    li.appendChild(btn);

    var firstAuthSlot = navList.querySelector('[data-auth-slot]');
    if (firstAuthSlot) {
      navList.insertBefore(li, firstAuthSlot);
    } else {
      navList.appendChild(li);
    }
  }

  function setTheme(theme) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    saveTheme(normalized);
    applyDocumentTheme(normalized);
    updateToggleButtons(normalized);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // Apply immediately in <head> before paint
  var initialTheme = getSavedTheme();
  applyDocumentTheme(initialTheme);

  // When opened via file://, browser CORS blocks <script type="module" src="js/...">.
  // This bridge connects register.html, login.html, profile.html, dashboard.html, and contact.html
  // directly to Supabase via the jsDelivr ESM CDN so user profiles are always saved in public.profiles.
  function initFileProtocolSupabaseBridge() {
    if (window.location.protocol !== 'file:') return;

    import(SUPABASE_ESM_URL)
      .then(async function (mod) {
        var sb = mod.createClient(
          'https://pnxbxgekmfipasbdzbye.supabase.co',
          'sb_publishable_lHBaUfwxxMqW2UK-eVuKXw_p_cWQJzg',
          { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
        );

        var sessionRes = await sb.auth.getSession();
        var user =
          sessionRes && sessionRes.data && sessionRes.data.session
            ? sessionRes.data.session.user
            : null;
        var profile = null;
        if (user) {
          var profRes = await sb
            .from('profiles')
            .select('id, full_name, email, phone, organisation, role, created_at')
            .eq('id', user.id)
            .maybeSingle();
          profile = (profRes && profRes.data) || {
            id: user.id,
            full_name: (user.user_metadata && user.user_metadata.full_name) || (user.email ? user.email.split('@')[0] : 'Client'),
            email: user.email || '',
            phone: (user.user_metadata && user.user_metadata.phone) || '',
            organisation: (user.user_metadata && user.user_metadata.organisation) || '',
            role: user.user_metadata && user.user_metadata.role === 'admin' ? 'admin' : 'client',
            created_at: user.created_at || new Date().toISOString(),
          };
          try {
            localStorage.setItem('sw_active_user_state', JSON.stringify(profile));
          } catch (_) {}
        }

        function clearFileAuthStorage() {
          [window.localStorage, window.sessionStorage].forEach(function (store) {
            if (!store) return;
            try {
              store.removeItem('sw_active_user_state');
              store.removeItem(LAST_CLIENT_KEY);
              var toRemove = [];
              for (var i = 0; i < store.length; i += 1) {
                var key = store.key(i);
                if (key && (/^sb-.*-auth-token/i.test(key) || key === 'supabase.auth.token')) {
                  toRemove.push(key);
                }
              }
              toRemove.forEach(function (k) {
                store.removeItem(k);
              });
            } catch (_) {}
          });
        }

        async function signOutFileBridge(target) {
          clearFileAuthStorage();
          try {
            await sb.auth.signOut();
          } catch (_) {
            try {
              await sb.auth.signOut({ scope: 'local' });
            } catch (_) {}
          }
          clearFileAuthStorage();
          window.location.replace(target || 'login.html?loggedout=1');
        }

        function bindMemberLogoutTriggers() {
          document.querySelectorAll('[data-action="logout"]').forEach(function (btn) {
            if (btn.dataset.logoutBound === 'true') return;
            btn.dataset.logoutBound = 'true';
            btn.addEventListener('click', async function (event) {
              event.preventDefault();
              btn.setAttribute('disabled', 'true');
              btn.setAttribute('aria-disabled', 'true');
              if (btn.tagName === 'BUTTON' && !btn.classList.contains('dropdown-item')) {
                btn.textContent = 'Logging out...';
              }
              await signOutFileBridge('login.html?loggedout=1');
            });
          });
        }

        function resolveDestForRole(profObj) {
          return profObj && profObj.role === 'admin' ? 'dashboard.html' : 'index.html';
        }

        // Sync public navbar on file:// if user is logged in
        var navList = document.querySelector('#swMainNav .navbar-nav');
        if (navList && user) {
          navList.querySelectorAll('[data-auth-slot]').forEach(function (item) {
            item.remove();
          });
          var profLi = createEl('li', 'nav-item ml-lg-2 mt-2 mt-lg-0');
          profLi.dataset.authSlot = 'dynamic';
          var profLink = createEl('a', 'btn btn-outline-royal btn-sm mr-2', 'My Profile');
          profLink.href = 'profile.html';
          profLi.appendChild(profLink);
          navList.appendChild(profLi);

          if (profile && profile.role === 'admin') {
            var dashLi = createEl('li', 'nav-item mt-2 mt-lg-0');
            dashLi.dataset.authSlot = 'dynamic';
            var dashLink = createEl('a', 'btn btn-outline-royal btn-sm mr-2', 'Dashboard');
            dashLink.href = 'dashboard.html';
            dashLi.appendChild(dashLink);
            navList.appendChild(dashLi);
          }

          var outLi = createEl('li', 'nav-item mt-2 mt-lg-0');
          outLi.dataset.authSlot = 'dynamic';
          var outBtn = createEl('button', 'btn btn-primary btn-sm', 'Logout');
          outBtn.type = 'button';
          outBtn.setAttribute('data-action', 'logout-nav');
          outBtn.addEventListener('click', async function () {
            outBtn.disabled = true;
            outBtn.textContent = 'Logging out...';
            await signOutFileBridge('login.html?loggedout=1');
          });
          outLi.appendChild(outBtn);
          navList.appendChild(outLi);
        }

        var currentPage = (document.body && document.body.getAttribute('data-page')) || '';
        var memberPage = (document.body && document.body.getAttribute('data-member-page')) || '';
        var urlParams = new URLSearchParams(window.location.search);

        if (currentPage === 'login') {
          var statusBanner = document.getElementById('loginStatusBanner');
          if (urlParams.get('loggedout') === '1' && statusBanner) {
            statusBanner.className = 'alert alert-success mb-3';
            statusBanner.textContent = 'You have been logged out securely.';
            statusBanner.classList.remove('d-none');
          } else if (urlParams.get('registered') === '1' && statusBanner) {
            statusBanner.className = 'alert alert-info mb-3';
            statusBanner.textContent =
              'Account created. If confirmation email is enabled, verify your inbox before signing in.';
            statusBanner.classList.remove('d-none');
          }
        }

        // Redirect already-logged-in user on login.html or register.html: admin -> dashboard.html, client -> index.html
        if ((currentPage === 'login' || currentPage === 'register') && user) {
          if (currentPage === 'login' && urlParams.get('stay') === '1') {
            var activeCard = document.getElementById('alreadyLoggedInCard');
            var loginCardEl = document.getElementById('loginCard');
            var activeNameEl = document.getElementById('activeUserName');
            var activeEmailEl = document.getElementById('activeUserEmail');
            var activeRoleEl = document.getElementById('activeUserRole');
            var activeAdminBtn = document.getElementById('activeAdminDashBtn');
            var activeLogoutBtn = document.getElementById('activeLogoutBtn');
            if (activeNameEl) activeNameEl.textContent = (profile && profile.full_name) || user.email || '';
            if (activeEmailEl) activeEmailEl.textContent = (profile && profile.email) || user.email || '';
            if (activeRoleEl) activeRoleEl.textContent = profile && profile.role === 'admin' ? 'Admin' : 'Client';
            if (activeAdminBtn && profile && profile.role === 'admin') activeAdminBtn.classList.remove('d-none');
            if (activeCard) activeCard.classList.remove('d-none');
            if (loginCardEl) loginCardEl.classList.add('d-none');
            if (activeLogoutBtn && !activeLogoutBtn.dataset.logoutBound) {
              activeLogoutBtn.dataset.logoutBound = 'true';
              activeLogoutBtn.addEventListener('click', async function () {
                activeLogoutBtn.disabled = true;
                activeLogoutBtn.textContent = 'Logging out...';
                await signOutFileBridge('login.html?loggedout=1');
              });
            }
            return;
          }
          window.location.replace(resolveDestForRole(profile));
          return;
        }

        // Hydrate & enforce role guard on dashboard.html under file://: client -> index.html, unauthenticated -> login.html
        if (memberPage === 'dashboard') {
          if (!user) {
            window.location.replace('login.html?next=dashboard.html');
            return;
          }
          if (!profile || profile.role !== 'admin') {
            window.location.replace('index.html');
            return;
          }

          var dashName = (profile && profile.full_name) || user.email || 'Admin';
          var dashEmail = (profile && profile.email) || user.email || '';
          var dashInitials =
            dashName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map(function (p) {
                return p.charAt(0).toUpperCase();
              })
              .join('') || 'SW';

          document.querySelectorAll('[data-member-name]').forEach(function (el) {
            el.textContent = dashName;
          });
          document.querySelectorAll('[data-member-email]').forEach(function (el) {
            el.textContent = dashEmail;
          });
          document.querySelectorAll('[data-member-role]').forEach(function (el) {
            el.textContent = 'Administrator';
          });
          document.querySelectorAll('[data-member-initials]').forEach(function (el) {
            el.textContent = dashInitials;
          });
          document.querySelectorAll('[data-admin-nav]').forEach(function (el) {
            el.classList.remove('d-none');
          });
          document.querySelectorAll('.sidebar .nav-item[data-member-nav]').forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-member-nav') === 'dashboard');
          });
          bindMemberLogoutTriggers();

          var dashLoading = document.getElementById('dashLoading');
          var dashContent = document.getElementById('dashContent');
          var clientNotice = document.getElementById('clientRoleNotice');
          var adminSection = document.getElementById('adminSection');
          if (dashLoading) dashLoading.classList.add('d-none');
          if (dashContent) dashContent.classList.remove('d-none');
          if (clientNotice) clientNotice.classList.add('d-none');
          if (adminSection) adminSection.classList.remove('d-none');

          var dashFeedback = document.getElementById('dashActionFeedback');
          var showDashFeedback = function (type, msg) {
            if (!dashFeedback) return;
            dashFeedback.className = 'alert alert-' + type + ' mb-3';
            dashFeedback.textContent = msg;
            dashFeedback.classList.remove('d-none');
          };

          var fileDashState = {
            users: [],
            enrollments: [],
            messages: [],
            trainings: [],
            projectsCount: 0,
            barMode: 'monthly',
            searchQuery: '',
          };

          var renderFileUsersRows = function () {
            var usersBody = document.getElementById('usersTableBody');
            var actionHead = document.getElementById('usersActionColHead');
            if (actionHead) actionHead.classList.remove('d-none');
            if (!usersBody) return;
            var q = (fileDashState.searchQuery || '').trim().toLowerCase();
            var list = q
              ? fileDashState.users.filter(function (u) {
                  return [u.full_name, u.email, u.organisation, u.role]
                    .filter(Boolean)
                    .some(function (v) {
                      return String(v).toLowerCase().indexOf(q) !== -1;
                    });
                })
              : fileDashState.users;

            var userRows = list.map(function (u) {
              var tr = document.createElement('tr');
              var nameTd = document.createElement('td');
              var wrap = createEl('div', 'd-flex align-items-center');
              var init =
                (u.full_name || u.email || 'SW')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map(function (p) {
                    return p.charAt(0).toUpperCase();
                  })
                  .join('') || 'SW';
              wrap.appendChild(createEl('span', 'sw-ta-user-avatar', init));
              wrap.appendChild(createEl('span', 'font-weight-bold', u.full_name));
              nameTd.appendChild(wrap);
              tr.appendChild(nameTd);
              tr.appendChild(createEl('td', null, u.email));
              tr.appendChild(createEl('td', null, u.phone || '-'));
              tr.appendChild(createEl('td', null, u.organisation || '-'));
              var roleTd = document.createElement('td');
              roleTd.appendChild(
                createEl('span', u.role === 'admin' ? 'badge badge-primary' : 'badge badge-light border', u.role)
              );
              tr.appendChild(roleTd);
              tr.appendChild(createEl('td', null, formatDate(u.created_at)));

              var actTd = document.createElement('td');
              if (u.id === user.id) {
                actTd.appendChild(createEl('small', 'text-muted', 'Current user'));
              } else {
                var targetRole = u.role === 'admin' ? 'client' : 'admin';
                var roleBtn = createEl(
                  'button',
                  u.role === 'admin' ? 'btn btn-outline-secondary btn-xs' : 'btn btn-outline-royal btn-xs',
                  u.role === 'admin' ? 'Set Client' : 'Make Admin'
                );
                roleBtn.type = 'button';
                roleBtn.addEventListener('click', async function () {
                  roleBtn.disabled = true;
                  var rUpd = await sb.from('profiles').update({ role: targetRole }).eq('id', u.id);
                  if (rUpd && rUpd.error) {
                    showDashFeedback('danger', 'Role update blocked: ' + rUpd.error.message);
                    roleBtn.disabled = false;
                    return;
                  }
                  showDashFeedback('success', 'Updated ' + u.full_name + ' role to ' + targetRole + '.');
                  await loadFileDashboardData();
                });
                actTd.appendChild(roleBtn);
              }
              tr.appendChild(actTd);
              return tr;
            });
            usersBody.replaceChildren.apply(usersBody, userRows);
          };

          var loadFileDashboardData = async function () {
            try {
              var projRes = await sb.from('projects').select('id', { count: 'exact', head: true });
              var trRes = await sb.from('trainings').select('id, title, level, fee_ugx').eq('is_open', true);
              fileDashState.projectsCount = (projRes && projRes.count) || 0;
              fileDashState.trainings = Array.isArray(trRes && trRes.data) ? trRes.data : [];
              var statProjEl = document.getElementById('statProjectsCount');
              if (statProjEl) statProjEl.textContent = String(fileDashState.projectsCount);

              var usersRes = await sb
                .from('profiles')
                .select('id, full_name, email, phone, organisation, role, created_at')
                .order('created_at', { ascending: false });
              var statUsers = document.getElementById('statUsersCount');

              if (usersRes && usersRes.error) {
                showDashFeedback('danger', 'Unable to load profiles: ' + usersRes.error.message);
              } else {
                fileDashState.users = Array.isArray(usersRes && usersRes.data) ? usersRes.data : [];
                if (statUsers) statUsers.textContent = String(fileDashState.users.length);
                renderFileUsersRows();
              }

              var enrRes = await sb
                .from('training_enrollments')
                .select(
                  'id, training_id, status, payment_status, payment_method, payment_reference, amount_paid_ugx, created_at, profiles(full_name, email), trainings(title, level, fee_ugx)'
                )
                .order('created_at', { ascending: false });
              var enrBody = document.getElementById('adminEnrollmentsBody');
              var statEnr = document.getElementById('statEnrollmentsCount');
              fileDashState.enrollments = [];
              if (enrBody) {
                if (enrRes && enrRes.error) {
                  var eTr = document.createElement('tr');
                  var eTd = createEl('td', 'text-danger', 'Error: ' + enrRes.error.message);
                  eTd.colSpan = 4;
                  eTr.appendChild(eTd);
                  enrBody.replaceChildren(eTr);
                } else {
                  var enrList = Array.isArray(enrRes && enrRes.data) ? enrRes.data : [];
                  fileDashState.enrollments = enrList;
                  if (statEnr) statEnr.textContent = String(enrList.length);
                  if (enrList.length === 0) {
                    var emptyEnrTr = document.createElement('tr');
                    var emptyEnrTd = createEl('td', 'text-muted', 'No service orders yet.');
                    emptyEnrTd.colSpan = 4;
                    emptyEnrTr.appendChild(emptyEnrTd);
                    enrBody.replaceChildren(emptyEnrTr);
                  } else {
                    var enrNodes = enrList.map(function (row) {
                      var tr = document.createElement('tr');
                      var appName = (row.profiles && (row.profiles.full_name || row.profiles.email)) || 'Client';
                      tr.appendChild(createEl('td', null, appName));
                      tr.appendChild(createEl('td', null, (row.trainings && row.trainings.title) || 'Web Service'));
                      var payTd = document.createElement('td');
                      var pStatus = row.payment_status || 'unpaid';
                      var pCls =
                        pStatus === 'paid'
                          ? 'badge badge-success'
                          : pStatus === 'pending_verification'
                          ? 'badge badge-info'
                          : pStatus === 'pay_on_arrival'
                          ? 'badge badge-light border'
                          : 'badge badge-secondary';
                      payTd.appendChild(createEl('span', pCls, pStatus));
                      tr.appendChild(payTd);

                      var stTd = document.createElement('td');
                      var sel = document.createElement('select');
                      sel.className = 'form-control form-control-sm';
                      ['pending', 'confirmed', 'cancelled'].forEach(function (v) {
                        var opt = createEl('option', null, v);
                        opt.value = v;
                        if (row.status === v) opt.selected = true;
                        sel.appendChild(opt);
                      });
                      sel.addEventListener('change', async function () {
                        sel.disabled = true;
                        var sUpd = await sb.from('training_enrollments').update({ status: sel.value }).eq('id', row.id);
                        sel.disabled = false;
                        if (sUpd && sUpd.error) showDashFeedback('danger', 'Status update failed: ' + sUpd.error.message);
                        else showDashFeedback('success', 'Order status updated to ' + sel.value + '.');
                      });
                      stTd.appendChild(sel);
                      tr.appendChild(stTd);
                      return tr;
                    });
                    enrBody.replaceChildren.apply(enrBody, enrNodes);
                  }
                }
              }

              var msgRes = await sb
                .from('contact_messages')
                .select('id, name, email, subject, message, is_read, created_at')
                .order('created_at', { ascending: false });
              var msgBody = document.getElementById('adminMessagesBody');
              var statMsgs = document.getElementById('statMessagesCount');
              fileDashState.messages = [];
              if (msgBody) {
                if (msgRes && msgRes.error) {
                  var mTr = document.createElement('tr');
                  var mTd = createEl('td', 'text-danger', 'Error: ' + msgRes.error.message);
                  mTd.colSpan = 3;
                  mTr.appendChild(mTd);
                  msgBody.replaceChildren(mTr);
                } else {
                  var msgList = Array.isArray(msgRes && msgRes.data) ? msgRes.data : [];
                  fileDashState.messages = msgList;
                  if (statMsgs) {
                    statMsgs.textContent = String(
                      msgList.filter(function (m) {
                        return !m.is_read;
                      }).length
                    );
                  }
                  if (msgList.length === 0) {
                    var emptyMsgTr = document.createElement('tr');
                    var emptyMsgTd = createEl('td', 'text-muted', 'No contact messages received yet.');
                    emptyMsgTd.colSpan = 3;
                    emptyMsgTr.appendChild(emptyMsgTd);
                    msgBody.replaceChildren(emptyMsgTr);
                  } else {
                    var msgNodes = msgList.map(function (m) {
                      var tr = document.createElement('tr');
                      var sTd = document.createElement('td');
                      sTd.appendChild(createEl('div', 'font-weight-bold', m.name));
                      sTd.appendChild(createEl('small', 'text-muted', m.email));
                      tr.appendChild(sTd);
                      var txtTd = document.createElement('td');
                      if (m.subject) txtTd.appendChild(createEl('div', 'font-weight-bold small', m.subject));
                      txtTd.appendChild(createEl('div', 'small', m.message));
                      tr.appendChild(txtTd);
                      var aTd = document.createElement('td');
                      var rBtn = createEl(
                        'button',
                        m.is_read ? 'btn btn-outline-secondary btn-xs mr-1 mb-1' : 'btn btn-outline-royal btn-xs mr-1 mb-1',
                        m.is_read ? 'Read' : 'Mark Read'
                      );
                      rBtn.type = 'button';
                      rBtn.addEventListener('click', async function () {
                        rBtn.disabled = true;
                        await sb.from('contact_messages').update({ is_read: !m.is_read }).eq('id', m.id);
                        await loadFileDashboardData();
                      });
                      var dBtn = createEl('button', 'btn btn-outline-danger btn-xs mb-1', 'Delete');
                      dBtn.type = 'button';
                      dBtn.addEventListener('click', async function () {
                        dBtn.disabled = true;
                        await sb.from('contact_messages').delete().eq('id', m.id);
                        await loadFileDashboardData();
                      });
                      aTd.appendChild(rBtn);
                      aTd.appendChild(dBtn);
                      tr.appendChild(aTd);
                      return tr;
                    });
                    msgBody.replaceChildren.apply(msgBody, msgNodes);
                  }
                }
              }

              if (window.SWDashboardUI) {
                window.SWDashboardUI.renderAll(fileDashState, fileDashState.barMode);
              }
            } catch (dashErr) {
              showDashFeedback('danger', 'Unable to load dashboard data: ' + (dashErr && dashErr.message ? dashErr.message : 'Network error'));
            }
          };

          var fSearchInput = document.getElementById('dashUserSearch');
          if (fSearchInput && !fSearchInput.dataset.fileBound) {
            fSearchInput.dataset.fileBound = 'true';
            fSearchInput.addEventListener('input', function () {
              fileDashState.searchQuery = fSearchInput.value || '';
              renderFileUsersRows();
            });
          }

          document.querySelectorAll('[data-dash-bar-mode]').forEach(function (btn) {
            if (btn.dataset.fileBound) return;
            btn.dataset.fileBound = 'true';
            btn.addEventListener('click', function () {
              fileDashState.barMode = btn.getAttribute('data-dash-bar-mode') || 'monthly';
              document.querySelectorAll('[data-dash-bar-mode]').forEach(function (b) {
                b.classList.toggle('is-active', b === btn);
              });
              if (window.SWDashboardUI) {
                window.SWDashboardUI.renderBarOnly(fileDashState, fileDashState.barMode);
              }
            });
          });

          var fRefreshBtn = document.getElementById('dashRefreshBtn');
          if (fRefreshBtn && !fRefreshBtn.dataset.fileBound) {
            fRefreshBtn.dataset.fileBound = 'true';
            fRefreshBtn.addEventListener('click', async function () {
              fRefreshBtn.disabled = true;
              try {
                await loadFileDashboardData();
              } finally {
                fRefreshBtn.disabled = false;
              }
            });
          }

          await loadFileDashboardData();
          return;
        }

        // Handle loginForm submit on file://
        var loginForm = document.getElementById('loginForm');
        if (loginForm && !loginForm.dataset.fileBound) {
          loginForm.dataset.fileBound = 'true';
          loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var emailEl = document.getElementById('loginEmail');
            var passEl = document.getElementById('loginPassword');
            var fb = document.getElementById('loginFeedback');
            var em = (emailEl ? emailEl.value : '').trim();
            var pw = passEl ? passEl.value : '';
            var okE = setFieldValidation(
              emailEl,
              document.getElementById('loginEmailError'),
              !em ? 'Please enter your email address.' : !EMAIL_PATTERN.test(em) ? 'Please enter a valid email address.' : ''
            );
            var okP = setFieldValidation(
              passEl,
              document.getElementById('loginPasswordError'),
              !pw ? 'Please enter your password.' : pw.length < 8 ? 'Password must be at least 8 characters long.' : ''
            );
            if (!okE || !okP) return;

            var btn = document.getElementById('loginSubmitBtn');
            if (btn) {
              btn.disabled = true;
              btn.textContent = 'Signing in...';
            }
            var signRes = await sb.auth.signInWithPassword({ email: em, password: pw });
            if (signRes.error) {
              if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
              }
              if (fb) {
                fb.className = 'alert alert-danger mt-3 mb-0';
                fb.textContent = 'Login failed: ' + signRes.error.message;
                fb.classList.remove('d-none');
              }
              return;
            }
            var signedUser = signRes.data && signRes.data.user;
            var signedProf = null;
            if (signedUser) {
              var pr = await sb
                .from('profiles')
                .select('id, full_name, email, phone, organisation, role, created_at')
                .eq('id', signedUser.id)
                .maybeSingle();
              signedProf = (pr && pr.data) || {
                id: signedUser.id,
                full_name: (signedUser.user_metadata && signedUser.user_metadata.full_name) || em.split('@')[0],
                email: signedUser.email || em,
                role: signedUser.user_metadata && signedUser.user_metadata.role === 'admin' ? 'admin' : 'client',
              };
              try {
                localStorage.setItem('sw_active_user_state', JSON.stringify(signedProf));
                localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(signedProf));
              } catch (_) {}
            }
            window.location.replace(resolveDestForRole(signedProf));
          });
        }

        var registerForm = document.getElementById('registerForm');
        if (registerForm && !registerForm.dataset.fileBound) {
          registerForm.dataset.fileBound = 'true';
          registerForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            var nameInput = document.getElementById('regFullName');
            var emailInput = document.getElementById('regEmail');
            var phoneInput = document.getElementById('regPhone');
            var orgInput = document.getElementById('regOrganisation');
            var passInput = document.getElementById('regPassword');
            var confirmInput = document.getElementById('regConfirmPassword');
            var feedbackBox = document.getElementById('registerFeedback');

            var fullName = (nameInput ? nameInput.value : '').trim();
            var email = (emailInput ? emailInput.value : '').trim();
            var phone = (phoneInput ? phoneInput.value : '').trim();
            var organisation = (orgInput ? orgInput.value : '').trim();
            var password = passInput ? passInput.value : '';
            var confirmVal = confirmInput ? confirmInput.value : '';

            var ok = [
              setFieldValidation(
                nameInput,
                document.getElementById('regFullNameError'),
                !fullName
                  ? 'Please enter your full name.'
                  : fullName.length < 2 || fullName.length > 100
                  ? 'Full name must be between 2 and 100 characters.'
                  : ''
              ),
              setFieldValidation(
                emailInput,
                document.getElementById('regEmailError'),
                !email
                  ? 'Please enter your email address.'
                  : !EMAIL_PATTERN.test(email)
                  ? 'Please enter a valid email address (for example, name@example.com).'
                  : ''
              ),
              setFieldValidation(
                phoneInput,
                document.getElementById('regPhoneError'),
                phone && !PHONE_PATTERN.test(phone)
                  ? 'Enter a valid phone number (7–20 digits) or leave blank.'
                  : ''
              ),
              setFieldValidation(
                orgInput,
                document.getElementById('regOrganisationError'),
                organisation.length > 120 ? 'Organisation name cannot exceed 120 characters.' : ''
              ),
              setFieldValidation(
                passInput,
                document.getElementById('regPasswordError'),
                !password
                  ? 'Please enter your password.'
                  : password.length < 8
                  ? 'Password must be at least 8 characters long.'
                  : !(/[A-Za-z]/.test(password) && /\d/.test(password))
                  ? 'Password must include at least one letter and one number.'
                  : ''
              ),
              setFieldValidation(
                confirmInput,
                document.getElementById('regConfirmPasswordError'),
                !confirmVal
                  ? 'Please confirm your password.'
                  : confirmVal !== password
                  ? 'Passwords do not match.'
                  : ''
              ),
            ].every(Boolean);

            if (!ok) return;

            var submitBtn = document.getElementById('registerSubmitBtn');
            var submitLabel = document.getElementById('registerSubmitLabel');
            if (submitBtn) submitBtn.disabled = true;
            if (submitLabel) submitLabel.textContent = 'Creating Account...';

            var fnUrl = 'https://pnxbxgekmfipasbdzbye.supabase.co/functions/v1/register-client';
            var anonKey = 'sb_publishable_lHBaUfwxxMqW2UK-eVuKXw_p_cWQJzg';
            var regOk = false;
            var regAlready = false;
            var regErrMsg = '';
            var createdUser = null;

            try {
              var regResp = await fetch(fnUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: anonKey,
                  Authorization: 'Bearer ' + anonKey,
                },
                body: JSON.stringify({
                  full_name: fullName,
                  email: email,
                  password: password,
                  phone: phone || '',
                  organisation: organisation || '',
                }),
              });
              var regJson = await regResp.json().catch(function () {
                return null;
              });
              if (regResp.status === 409 || (regJson && regJson.code === 'email_exists')) {
                regAlready = true;
              } else if (!regResp.ok || !regJson || !regJson.ok) {
                regErrMsg = (regJson && regJson.error) || 'Unable to create account.';
              } else {
                regOk = true;
                createdUser = regJson.user || null;
              }
            } catch (_) {
              var signUpRes = await sb.auth.signUp({
                email: email,
                password: password,
                options: {
                  data: {
                    full_name: fullName,
                    phone: phone || null,
                    organisation: organisation || null,
                  },
                },
              });
              if (signUpRes.error) {
                if (/already registered/i.test(signUpRes.error.message)) regAlready = true;
                else regErrMsg = signUpRes.error.message;
              } else {
                createdUser = signUpRes.data ? signUpRes.data.user : null;
                if (createdUser && Array.isArray(createdUser.identities) && createdUser.identities.length === 0) {
                  regAlready = true;
                } else {
                  regOk = true;
                }
              }
            }

            if (submitBtn) submitBtn.disabled = false;
            if (submitLabel) submitLabel.textContent = 'Create Account';

            if (regAlready) {
              if (feedbackBox) {
                feedbackBox.className = 'alert alert-warning mt-3 mb-0';
                feedbackBox.textContent =
                  'An account with ' + email + ' is already registered. Please sign in on the Client Login page.';
                feedbackBox.classList.remove('d-none');
              }
              return;
            }

            if (!regOk || regErrMsg) {
              if (feedbackBox) {
                feedbackBox.className = 'alert alert-danger mt-3 mb-0';
                feedbackBox.textContent = 'Registration failed: ' + regErrMsg;
                feedbackBox.classList.remove('d-none');
              }
              return;
            }

            var signInRes = await sb.auth.signInWithPassword({ email: email.toLowerCase(), password: password });
            if (signInRes.data && signInRes.data.session && signInRes.data.user) {
              var signedProf = createdUser || {
                id: signInRes.data.user.id,
                full_name: fullName,
                email: email,
                phone: phone || '',
                organisation: organisation || '',
                role: 'client',
              };
              try {
                localStorage.setItem('sw_active_user_state', JSON.stringify(signedProf));
                localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(signedProf));
              } catch (_) {}
              window.location.replace(resolveDestForRole(signedProf));
              return;
            }

            try {
              localStorage.setItem(
                LAST_CLIENT_KEY,
                JSON.stringify({
                  id: createdUser ? createdUser.id : null,
                  full_name: fullName,
                  email: email,
                  phone: phone || '',
                  organisation: organisation || '',
                  role: 'client',
                  created_at: new Date().toISOString(),
                })
              );
            } catch (_) {}

            var setText = function (idEl, val) {
              var el = document.getElementById(idEl);
              if (el) el.textContent = val;
            };
            setText(
              'summaryNoticeText',
              'Your account for ' +
                email +
                ' has been created and your profile is saved in the database. Please verify your email inbox link before signing in on Client Login.'
            );
            setText('summaryFullName', fullName);
            setText('summaryEmail', email);
            setText('summaryPhone', phone || 'Not provided');
            setText('summaryOrganisation', organisation || 'Not provided');
            setText('summaryRole', 'client');
            setText('summaryStatus', 'Pending email confirmation');

            var loginLink = document.getElementById('summaryLoginLink');
            if (loginLink) loginLink.href = 'login.html?email=' + encodeURIComponent(email);

            var registerCard = document.getElementById('registerCard');
            var summaryCard = document.getElementById('registeredSummaryCard');
            if (registerCard) registerCard.classList.add('d-none');
            if (summaryCard) summaryCard.classList.remove('d-none');
          });
        }

        // Hydrate profile.html when opened via file://
        if (document.body && document.body.getAttribute('data-member-page') === 'profile') {
          var pendingRaw = null;
          try {
            pendingRaw = JSON.parse(localStorage.getItem(LAST_CLIENT_KEY) || 'null');
          } catch (_) {}

          var activeProf = profile || pendingRaw;
          if (!user && !activeProf) {
            window.location.replace('login.html?next=profile.html');
            return;
          }

          var displayName = (activeProf && activeProf.full_name) || (user && user.email) || 'Client';
          var displayEmail = (activeProf && activeProf.email) || (user && user.email) || '';
          var role = (activeProf && activeProf.role) || 'client';
          var roleLabel = role === 'admin' ? 'Administrator' : 'Registered Client';
          var initials =
            displayName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map(function (p) {
                return p.charAt(0).toUpperCase();
              })
              .join('') || 'SW';

          document.querySelectorAll('[data-member-name]').forEach(function (el) {
            el.textContent = displayName;
          });
          document.querySelectorAll('[data-member-email]').forEach(function (el) {
            el.textContent = displayEmail;
          });
          document.querySelectorAll('[data-member-role]').forEach(function (el) {
            el.textContent = roleLabel;
          });
          document.querySelectorAll('[data-member-initials]').forEach(function (el) {
            el.textContent = initials;
          });
          document.querySelectorAll('[data-admin-nav]').forEach(function (el) {
            el.classList.toggle('d-none', role !== 'admin');
          });
          bindMemberLogoutTriggers();

          var loadingBox = document.getElementById('profileAuthLoading');
          var contentBox = document.getElementById('profileContent');
          if (loadingBox) loadingBox.classList.add('d-none');
          if (contentBox) contentBox.classList.remove('d-none');

          var sinceEl = document.getElementById('memberSinceValue');
          if (sinceEl) sinceEl.textContent = formatDate(activeProf && activeProf.created_at);

          var pName = document.getElementById('profileFullName');
          var pEmail = document.getElementById('profileEmail');
          var pPhone = document.getElementById('profilePhone');
          var pOrg = document.getElementById('profileOrganisation');
          if (pName) pName.value = displayName;
          if (pEmail) pEmail.value = displayEmail;
          if (pPhone) pPhone.value = (activeProf && activeProf.phone) || '';
          if (pOrg) pOrg.value = (activeProf && activeProf.organisation) || '';

          var sPhone = document.getElementById('summaryMemberPhone');
          var sOrg = document.getElementById('summaryMemberOrg');
          if (sPhone) sPhone.textContent = (activeProf && activeProf.phone) || 'Not provided';
          if (sOrg) sOrg.textContent = (activeProf && activeProf.organisation) || 'Not provided';

          var profileForm = document.getElementById('profileForm');
          var profileFeedback = document.getElementById('profileSaveFeedback');
          var saveProfileBtn = document.getElementById('saveProfileBtn');
          if (profileForm && !profileForm.dataset.fileBound) {
            profileForm.dataset.fileBound = 'true';
            profileForm.addEventListener('submit', async function (event) {
              event.preventDefault();
              if (profileFeedback) profileFeedback.classList.add('d-none');

              var fnVal = (pName ? pName.value : '').trim();
              var phVal = (pPhone ? pPhone.value : '').trim();
              var orgVal = (pOrg ? pOrg.value : '').trim();

              var okProfile = [
                setFieldValidation(
                  pName,
                  document.getElementById('profileFullNameError'),
                  !fnVal
                    ? 'Full name is required.'
                    : fnVal.length < 2 || fnVal.length > 100
                    ? 'Full name must be 2 to 100 characters.'
                    : ''
                ),
                setFieldValidation(
                  pPhone,
                  document.getElementById('profilePhoneError'),
                  phVal && !PHONE_PATTERN.test(phVal)
                    ? 'Enter a valid phone number (7–20 digits) or leave blank.'
                    : ''
                ),
                setFieldValidation(
                  pOrg,
                  document.getElementById('profileOrganisationError'),
                  orgVal.length > 120 ? 'Organisation name cannot exceed 120 characters.' : ''
                ),
              ].every(Boolean);

              if (!okProfile) {
                if (profileFeedback) {
                  profileFeedback.className = 'alert alert-danger mt-3 mb-0';
                  profileFeedback.textContent = 'Please fix the highlighted fields before saving.';
                  profileFeedback.classList.remove('d-none');
                }
                return;
              }

              if (saveProfileBtn) {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Saving...';
              }

              var savedProf = {
                id: (user && user.id) || (activeProf && activeProf.id) || null,
                full_name: fnVal,
                email: displayEmail,
                phone: phVal,
                organisation: orgVal,
                role: role,
                created_at: (activeProf && activeProf.created_at) || new Date().toISOString(),
              };

              if (user) {
                var updRes = await sb
                  .from('profiles')
                  .update({
                    full_name: fnVal,
                    phone: phVal || null,
                    organisation: orgVal || null,
                  })
                  .eq('id', user.id)
                  .select('id, full_name, email, phone, organisation, role, created_at')
                  .maybeSingle();

                if (updRes.error) {
                  if (saveProfileBtn) {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = 'Save Profile Changes';
                  }
                  if (profileFeedback) {
                    profileFeedback.className = 'alert alert-danger mt-3 mb-0';
                    profileFeedback.textContent = 'Could not update profile: ' + updRes.error.message;
                    profileFeedback.classList.remove('d-none');
                  }
                  return;
                }
                if (updRes.data) savedProf = updRes.data;

                try {
                  await sb.auth.updateUser({
                    data: {
                      full_name: fnVal,
                      phone: phVal || null,
                      organisation: orgVal || null,
                    },
                  });
                } catch (_) {}
              }

              if (saveProfileBtn) {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Save Profile Changes';
              }

              activeProf = savedProf;
              try {
                localStorage.setItem('sw_active_user_state', JSON.stringify(savedProf));
                localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(savedProf));
              } catch (_) {}

              document.querySelectorAll('[data-member-name]').forEach(function (el) {
                el.textContent = savedProf.full_name || displayName;
              });
              if (sPhone) sPhone.textContent = savedProf.phone || 'Not provided';
              if (sOrg) sOrg.textContent = savedProf.organisation || 'Not provided';
              if (profileFeedback) {
                profileFeedback.className = 'alert alert-success mt-3 mb-0';
                profileFeedback.textContent = 'Your profile has been updated.';
                profileFeedback.classList.remove('d-none');
              }
            });
          }

          var enrollBox = document.getElementById('myEnrollmentsBox');
          var enrollCount = document.getElementById('myEnrollmentsCount');
          var enrollRows = [];
          if (user) {
            var enrRes = await sb
              .from('training_enrollments')
              .select('id, training_id, status, payment_status, payment_reference, trainings(id, title)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
            if (enrRes && !enrRes.error && Array.isArray(enrRes.data)) {
              enrollRows = enrRes.data;
            }
          } else {
            try {
              enrollRows = JSON.parse(localStorage.getItem(LOCAL_ENROLLMENTS_KEY) || '[]');
            } catch (_) {}
          }
          if (enrollCount) enrollCount.textContent = String(enrollRows.length);
          if (enrollBox) {
            if (enrollRows.length > 0) {
              var ul = createEl('ul', 'list-group list-group-flush');
              enrollRows.forEach(function (row) {
                var li = createEl('li', 'list-group-item sw-enrollment-item px-0');
                var top = createEl('div', 'd-flex justify-content-between align-items-start mb-1');
                top.appendChild(createEl('strong', null, (row.trainings && row.trainings.title) || 'Web Service'));
                top.appendChild(createEl('span', 'badge badge-warning', row.status || 'pending'));
                li.appendChild(top);
                ul.appendChild(li);
              });
              enrollBox.replaceChildren(ul);
            } else {
              var emptyEnrollP = createEl('p', 'text-muted mb-3', 'You have not booked any web design services yet.');
              var browseLink = createEl('a', 'btn btn-outline-royal btn-sm', 'Browse Web Services');
              browseLink.href = 'services.html';
              enrollBox.replaceChildren(emptyEnrollP, browseLink);
            }
          }
        }
      })
      .catch(function () {});
  }

  function initThemeUI() {
    applyDocumentTheme(getSavedTheme());
    injectPublicNavbarToggle();

    document.querySelectorAll('[data-action="toggle-theme"]').forEach(function (el) {
      if (el.dataset.themeBound === 'true') return;
      el.dataset.themeBound = 'true';
      el.addEventListener('click', function (event) {
        event.preventDefault();
        toggleTheme();
      });
    });

    updateToggleButtons(getSavedTheme());
    initFileProtocolSupabaseBridge();
    initPageScrollReveal();
    initDynamicWidgets();
    initChatWidget();
  }

  var WIDGET_STAGE_DATA = {
    about: [
      {
        badge: 'STAGE 1 · SOROTI STUDIO DISCOVERY',
        metric: 'Plot 14, Gweri Road',
        caption:
          'Partnering with Soroti schools, cooperatives, and SMEs at Plot 14, Gweri Road to scope practical digital systems.',
      },
      {
        badge: 'STAGE 2 · 360PX+ MOBILE-FIRST UI',
        metric: 'Bootstrap 4 · Fast 3G/4G',
        caption:
          'Designing accessible, lightweight Bootstrap 4 layouts verified from 360px phones up to desktop monitors.',
      },
      {
        badge: 'STAGE 3 · SUPABASE POSTGRESQL & RLS',
        metric: 'Zero-innerHTML · RLS ON',
        caption:
          'Enforcing row-level security policies across all 5 database tables and strict safe DOM creation.',
      },
      {
        badge: 'STAGE 4 · KAHAWA CONNECT FIELD R&D',
        metric: 'Offline SQLite + Leaf ML',
        caption:
          'Bringing offline GPS polygon mapping and on-device TFLite leaf disease scanning into production software.',
      },
    ],
    projects: [
      {
        badge: 'STAGE 1 · ANDROID OFFLINE CAPTURE',
        metric: 'Flutter · Drift SQLite',
        caption:
          'Field agent walks coffee plot boundary offline; 6 GPS polygon vertices queued locally in Drift SQLite.',
      },
      {
        badge: 'STAGE 2 · ON-DEVICE TFLITE LEAF ML',
        metric: '98.4% Healthy · 140 ms',
        caption:
          'Evaluating coffee leaves for Leaf Rust and Berry Disease locally on Android with 0 KB mobile data required.',
      },
      {
        badge: 'STAGE 3 · SENTINEL-2 EUDR CHECK',
        metric: 'Post-2020 Baseline OK',
        caption:
          'Cross-checking mapped farm coordinates against Sentinel-2 satellite imagery via Google Earth Engine.',
      },
      {
        badge: 'STAGE 4 · SUPABASE POSTGIS & EU DDS',
        metric: 'EUDR Export Ready',
        caption:
          'Synchronizing verified GeoJSON farm polygons and compliance evidence to Supabase PostgreSQL/PostGIS.',
      },
    ],
    services: [
      {
        badge: 'PILLAR 1 · RECOMMENDED SERVICE PACKAGES',
        metric: 'From UGX 450,000 · 5–7 Days',
        caption:
          'Clear, bundled Starter, Business Growth, and Custom / E-Commerce packages tailored for businesses across Soroti & Teso.',
      },
      {
        badge: 'PILLAR 2 · CORE BROCHURE WEBSITES & FIGMA UI',
        metric: '3–6 Pages · WhatsApp Ready',
        caption:
          'Fast mobile-first sites, event landing pages, legacy redesigns, and interactive Figma wireframes built for clinics, hotels, and shops.',
      },
      {
        badge: 'PILLAR 3 · STORES, MOBILE MONEY & PORTALS',
        metric: 'MTN MoMo · Airtel · Supabase',
        caption:
          'Online product catalogs, Ugandan Mobile Money gateways, school admission/results portals, hotel booking engines, and SACCO dashboards.',
      },
      {
        badge: 'PILLAR 4 · LOCAL SEO, HOSTING & MONTHLY CARE',
        metric: 'Google Maps · .ug Domains',
        caption:
          'Verified Google Business Profiles, .ug/.com domains with corporate email, cloud backups, and 3G/4G speed optimization across Eastern Uganda.',
      },
    ],
    contact: [
      {
        badge: 'STAGE 1 · SOROTI CITY EAST STUDIO',
        metric: '1.7146° N, 33.6111° E',
        caption:
          'Walk-in client consultations & web design studio at Plot 14, Gweri Road, Central Ward, Soroti City East.',
      },
      {
        badge: 'STAGE 2 · DIRECT PHONE & WHATSAPP DESK',
        metric: '0789939643 / 0794030168',
        caption:
          'Fast engineering support and project scoping calls Monday – Saturday, 8:30 AM – 5:30 PM EAT.',
      },
      {
        badge: 'STAGE 3 · EMAIL & PROPOSAL QUEUE',
        metric: 'tjusper02@gmail.com',
        caption:
          'Send project specifications, service package inquiries, or Kahawa Connect research questions anytime.',
      },
      {
        badge: 'STAGE 4 · SUPABASE RLS MESSAGE INBOX',
        metric: 'public.contact_messages',
        caption:
          'Form submissions are validated in the browser and saved directly to our RLS-protected Supabase inbox.',
      },
    ],
    login: [
      {
        badge: 'STAGE 1 · BROWSER INPUT VALIDATION',
        metric: '8+ Char Policy',
        caption:
          'Validating email format and minimum 8-character password before initiating encrypted Supabase Auth handshake.',
      },
      {
        badge: 'STAGE 2 · SUPABASE JWT HANDSHAKE',
        metric: 'Publishable Key Only',
        caption:
          'Exchanging credentials with Supabase Auth over TLS without ever exposing a service_role key.',
      },
      {
        badge: 'STAGE 3 · POSTGRESQL RLS VERIFICATION',
        metric: 'id = auth.uid()',
        caption:
          'Database Row Level Security verifies your session UID and loads your profile from public.profiles.',
      },
      {
        badge: 'STAGE 4 · ROLE-AWARE REDIRECT',
        metric: 'Profile / Admin Dash',
        caption:
          'Routing clients to My Profile and administrators to the Members & Admin Dashboard.',
      },
    ],
    register: [
      {
        badge: 'STAGE 1 · CLIENT FORM VALIDATION',
        metric: 'Zero-innerHTML',
        caption:
          'Checking required Full Name, Email format, and matching 8+ character password before account creation.',
      },
      {
        badge: 'STAGE 2 · SUPABASE AUTH.USERS SIGNUP',
        metric: 'Metadata Attached',
        caption:
          'Creating your encrypted user record in Supabase Auth with full_name, phone, and organisation metadata.',
      },
      {
        badge: 'STAGE 3 · HANDLE_NEW_USER() SQL TRIGGER',
        metric: 'SECURITY DEFINER',
        caption:
          'PostgreSQL trigger automatically inserts your row into public.profiles with default role = client.',
      },
      {
        badge: 'STAGE 4 · PROFILE & BOOKINGS READY',
        metric: 'Instant Reflection',
        caption:
          'Reflecting your newly created client account summary immediately and unlocking online service bookings.',
      },
    ],
  };

  function initDynamicWidgets() {
    var widgets = document.querySelectorAll('[data-dynamic-widget]');
    widgets.forEach(function (widgetEl) {
      if (widgetEl.dataset.widgetBound === 'true') return;
      widgetEl.dataset.widgetBound = 'true';

      var key = widgetEl.getAttribute('data-dynamic-widget') || '';
      var stages = WIDGET_STAGE_DATA[key];
      if (!stages || !stages.length) return;

      var badgeEl = widgetEl.querySelector('[data-widget-badge]');
      var metricEl = widgetEl.querySelector('[data-widget-metric]');
      var captionEl = widgetEl.querySelector('[data-widget-caption]');
      var progressEl = widgetEl.querySelector('[data-widget-progress]');
      var stepBtns = widgetEl.querySelectorAll('[data-widget-step]');
      var widgetId = widgetEl.id;
      var pauseBtn = widgetId
        ? document.querySelector('[data-widget-pauseFor="' + widgetId + '"]')
        : widgetEl.querySelector('[data-widget-pause]');

      var currentIdx = 0;
      var isPaused = false;
      var timerId = null;

      function restartProgress() {
        if (!progressEl) return;
        progressEl.style.animation = 'none';
        void progressEl.offsetWidth;
        progressEl.style.animation = '';
      }

      function applyWidgetStage(idx) {
        currentIdx = ((idx % stages.length) + stages.length) % stages.length;
        var st = stages[currentIdx];
        widgetEl.setAttribute('data-stage', String(currentIdx));
        if (badgeEl) badgeEl.textContent = st.badge;
        if (metricEl) metricEl.textContent = st.metric;
        if (captionEl) captionEl.textContent = st.caption;

        stepBtns.forEach(function (btn, bIdx) {
          var active = bIdx === currentIdx;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        restartProgress();
      }

      function startTimer() {
        stopTimer();
        if (isPaused) return;
        timerId = window.setInterval(function () {
          applyWidgetStage(currentIdx + 1);
        }, 3600);
      }

      function stopTimer() {
        if (timerId !== null) {
          window.clearInterval(timerId);
          timerId = null;
        }
      }

      stepBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var targetIdx = parseInt(btn.getAttribute('data-widget-step') || '0', 10);
          applyWidgetStage(targetIdx);
          if (!isPaused) startTimer();
        });
      });

      if (pauseBtn) {
        pauseBtn.addEventListener('click', function () {
          isPaused = !isPaused;
          widgetEl.classList.toggle('is-paused', isPaused);
          pauseBtn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
          var icon = pauseBtn.querySelector('i');
          if (icon) {
            icon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
          }
          if (isPaused) stopTimer();
          else startTimer();
        });
      }

      applyWidgetStage(0);
      startTimer();
    });
  }

  function initPageScrollReveal() {
    document.querySelectorAll('.sw-page-bg-video').forEach(function (vid) {
      var p = vid.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    });

    var page = document.body ? document.body.getAttribute('data-page') : '';
    if (!page || page === 'home') return;

    var targets = document.querySelectorAll('.sw-section .sw-card, .sw-stack-panel, .sw-roadmap-strip');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08 }
      );
      targets.forEach(function (el) {
        el.classList.add('sw-reveal');
        observer.observe(el);
      });
    }
  }

  function initChatWidget() {
    if (!document.body || document.getElementById('swChatWidgetRoot')) return;

    var CHAT_STORAGE_KEY = 'sw_chat_history_v1';
    var WA_BASE = 'https://wa.me/256789939643?text=';

    var DEFAULT_BOT_MSG = {
      sender: 'bot',
      text: 'Hello! Welcome to SOROTI WebWorks (Plot 14, Gweri Road). Ask me about our Website Packages, E-Commerce & Mobile Money gateways, School/SACCO portals, or Local SEO.',
      actions: [
        { label: 'Explore 16 Services', href: 'services.html' },
        { label: 'View Packages', href: 'services.html#packages' },
      ],
    };

    function loadHistory() {
      try {
        var raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
        var parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-20);
      } catch (_) {}
      return [DEFAULT_BOT_MSG];
    }

    function saveHistory(items) {
      try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(items.slice(-20)));
      } catch (_) {}
    }

    function buildBotReply(queryText) {
      var q = String(queryText || '').toLowerCase();

      if (/\b(starter|450|brochure|basic|small shop|startup)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Our Starter Package is UGX 450,000 (delivered in 5–7 days). It includes 1–4 mobile-responsive pages, WhatsApp chat integration, basic SEO, and .com or .ug domain setup.',
          actions: [
            { label: 'Book Starter Package', href: 'services.html?apply=a1000000-0000-4000-8000-000000000001' },
            { label: 'Compare All Packages', href: 'services.html#packages' },
          ],
        };
      }

      if (/\b(growth|950|hotel|clinic|ngo|figma|corporate email)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Our most popular Business Growth Package is UGX 950,000 (1–2 weeks). Includes up to 8 pages, custom Figma mockup approval, verified Google Business Profile SEO, blog/news section, and corporate emails.',
          actions: [
            { label: 'Book Growth Package', href: 'services.html?apply=a1000000-0000-4000-8000-000000000002' },
          ],
        };
      }

      if (/\b(ecom|e-com|store|shop|momo|mobile money|airtel|mtn|pay|pesapal|gateway|1,?800)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Our Custom / E-Commerce Package is UGX 1,800,000 (2–4 weeks), featuring full product catalogs, MTN MoMo, Airtel Money & Visa/Card gateways, or standalone Mobile Money integration starting at UGX 400,000.',
          actions: [
            { label: 'Book Custom / E-Commerce', href: 'services.html?apply=a1000000-0000-4000-8000-000000000003' },
            { label: 'Filter E-Commerce', href: 'services.html?category=E-Commerce%20%26%20Apps' },
          ],
        };
      }

      if (/\b(school|portal|sacco|coop|dashboard|inventory|reservation|booking)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'We build custom Supabase/Firebase web apps: School & Institution Portals (UGX 1,800,000), Hotel/Clinic Booking Systems (UGX 1,400,000), and SACCO/Cooperative Inventory Dashboards (UGX 1,600,000).',
          actions: [
            { label: 'View Portals & Apps', href: 'services.html?category=E-Commerce%20%26%20Apps' },
            { label: 'View Completed Builds', href: 'projects.html' },
          ],
        };
      }

      if (/\b(seo|google|map|domain|host|care|maint|speed|3g|4g|price|pricing|cost|how much|package)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Our 3 core packages are Starter (UGX 450,000), Business Growth (UGX 950,000), and Custom / E-Commerce (UGX 1,800,000). Add-ons include Google Business SEO (UGX 180k), Domains & Email (UGX 220k), and Monthly Care Plans (UGX 120k/mo).',
          actions: [
            { label: 'See Full Price List', href: 'services.html' },
            { label: 'SEO & Care Services', href: 'services.html?category=Visibility%20%26%20Care' },
          ],
        };
      }

      if (/\b(time|long|days|weeks|deliver|timeline|fast)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Typical turnaround from Plot 14, Gweri Road: Landing Pages in 3–5 days, Starter Websites in 5–7 days, Business Growth Sites in 1–2 weeks, and Custom Portals or Stores in 2–4 weeks.',
          actions: [{ label: 'Book a Service', href: 'services.html' }],
        };
      }

      if (/\b(kahawa|coffee|eudr|research|leaf|ml|android)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Kahawa Connect is our offline-first Android & ML research platform for Ugandan coffee farmers (Drift SQLite GPS polygons, on-device TFLite leaf scan, and Sentinel-2 EUDR verification).',
          actions: [{ label: 'Explore Kahawa Connect', href: 'projects.html#kahawa-connect' }],
        };
      }

      if (/\b(where|location|address|phone|call|whatsapp|email|office|visit|contact)\b/.test(q)) {
        return {
          sender: 'bot',
          text: 'Visit us at Plot 14, Gweri Road, Central Ward, Soroti City East (Mon–Sat, 8:30 AM–5:30 PM EAT). Call 0789939643 / 0794030168 or email tjusper02@gmail.com.',
          actions: [
            { label: 'WhatsApp 0789939643', href: WA_BASE + encodeURIComponent('Hello SOROTI WebWorks, I would like a website quote.'), external: true },
            { label: 'Contact Form', href: 'contact.html' },
          ],
        };
      }

      return {
        sender: 'bot',
        text: 'Thanks for reaching out to SOROTI WebWorks! You can browse all 16 web services and book online, or chat directly with Lead Engineer Twinamasiko Jusper on WhatsApp for a custom quote.',
        actions: [
          { label: 'Chat on WhatsApp', href: WA_BASE + encodeURIComponent('Hello SOROTI WebWorks: ' + queryText), external: true },
          { label: 'Browse All Services', href: 'services.html' },
          { label: 'Send Contact Inquiry', href: 'contact.html' },
        ],
      };
    }

    function createSvgChatIcon(isOpen) {
      var SVG_NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 36 36');
      svg.setAttribute('class', 'sw-chat-fab-svg');
      svg.setAttribute('aria-hidden', 'true');

      if (isOpen) {
        var line1 = document.createElementNS(SVG_NS, 'path');
        line1.setAttribute('d', 'M11 11 L25 25 M25 11 L11 25');
        line1.setAttribute('stroke', '#ffffff');
        line1.setAttribute('stroke-width', '3');
        line1.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line1);
        return svg;
      }

      // Crisp smiling white speech bubble matching the reference launcher
      var bubble = document.createElementNS(SVG_NS, 'path');
      bubble.setAttribute(
        'd',
        'M18 6C11.37 6 6 10.92 6 17c0 2.57.97 4.93 2.58 6.79-.34 2.13-1.41 4.24-1.52 4.46-.18.35.12.75.5.68 2.48-.47 4.78-1.45 6.01-2.08 1.38.41 2.88.65 4.43.65 6.63 0 12-4.92 12-11S24.63 6 18 6z'
      );
      bubble.setAttribute('fill', '#ffffff');
      svg.appendChild(bubble);

      var smile = document.createElementNS(SVG_NS, 'path');
      smile.setAttribute('d', 'M15.6 19.2c1.25 1.85 3.65 2.45 5.6 1.8 1.65-.55 2.6-1.85 2.75-2.1-.15.05-4.3 1.05-8.35.3z');
      smile.setAttribute('fill', '#1b89d9');
      svg.appendChild(smile);
      return svg;
    }

    var history = loadHistory();
    var isOpen = false;

    var root = createEl('div', 'sw-chat-root');
    root.id = 'swChatWidgetRoot';

    // Panel
    var panel = createEl('section', 'sw-chat-panel d-none');
    panel.id = 'swChatPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'SOROTI WebWorks Live Studio Chat');

    var header = createEl('div', 'sw-chat-header');
    var hdrLeft = createEl('div', 'd-flex align-items-center');
    hdrLeft.appendChild(createEl('span', 'sw-chat-avatar', 'SW'));
    var hdrInfo = createEl('div', null);
    hdrInfo.appendChild(createEl('h2', 'sw-chat-title', 'SOROTI WebWorks Desk'));
    var subRow = createEl('div', 'sw-chat-subtitle');
    subRow.appendChild(createEl('span', 'sw-chat-subtitle-dot'));
    subRow.appendChild(document.createTextNode('Online · Plot 14, Gweri Rd, Soroti'));
    hdrInfo.appendChild(subRow);
    hdrLeft.appendChild(hdrInfo);

    var hdrBtns = createEl('div', 'd-flex align-items-center');
    var clearBtn = createEl('button', 'sw-chat-hdr-btn');
    clearBtn.type = 'button';
    clearBtn.title = 'Reset chat';
    clearBtn.setAttribute('aria-label', 'Reset conversation');
    clearBtn.appendChild(createEl('i', 'fas fa-redo-alt'));
    var closeBtn = createEl('button', 'sw-chat-hdr-btn');
    closeBtn.type = 'button';
    closeBtn.title = 'Minimize chat';
    closeBtn.setAttribute('aria-label', 'Close chat window');
    closeBtn.appendChild(createEl('i', 'fas fa-times'));
    hdrBtns.appendChild(clearBtn);
    hdrBtns.appendChild(closeBtn);
    header.appendChild(hdrLeft);
    header.appendChild(hdrBtns);

    var msgBox = createEl('div', 'sw-chat-messages');
    msgBox.id = 'swChatMessages';
    msgBox.setAttribute('aria-live', 'polite');

    var chipsWrap = createEl('div', 'sw-chat-chips');
    [
      { label: 'Starter 450k', q: 'Tell me about Starter Package UGX 450,000' },
      { label: 'Growth 950k', q: 'What is in Business Growth Package?' },
      { label: 'E-Commerce / MoMo', q: 'E-Commerce and Mobile Money payments' },
      { label: 'School / SACCO Portal', q: 'School portals and custom dashboards' },
      { label: 'WhatsApp / Office', q: 'Where is your Soroti office and WhatsApp?' },
    ].forEach(function (chip) {
      var chipBtn = createEl('button', 'sw-chat-chip', chip.label);
      chipBtn.type = 'button';
      chipBtn.addEventListener('click', function () {
        sendMessage(chip.q);
      });
      chipsWrap.appendChild(chipBtn);
    });

    var form = createEl('form', 'sw-chat-form');
    var input = createEl('input', 'sw-chat-input');
    input.type = 'text';
    input.id = 'swChatInput';
    input.placeholder = 'Ask about websites, prices, MoMo...';
    input.setAttribute('aria-label', 'Type your message');
    input.autocomplete = 'off';

    var sendBtn = createEl('button', 'sw-chat-send-btn');
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.appendChild(createEl('i', 'fas fa-paper-plane'));
    form.appendChild(input);
    form.appendChild(sendBtn);

    var footerBar = createEl('div', 'sw-chat-footer-bar');
    footerBar.appendChild(createEl('span', null, 'Fast responses · EAT Studio Hours'));
    var waLink = createEl('a', 'sw-chat-wa-link', 'WhatsApp Direct →');
    waLink.href = WA_BASE + encodeURIComponent('Hello SOROTI WebWorks, I visited your website and need a quote.');
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    footerBar.appendChild(waLink);

    panel.appendChild(header);
    panel.appendChild(msgBox);
    panel.appendChild(chipsWrap);
    panel.appendChild(form);
    panel.appendChild(footerBar);

    // Launcher row (pill + blue round speech bubble FAB)
    var launcherRow = createEl('div', 'sw-chat-launcher-row');
    var pill = createEl('button', 'sw-chat-pill', 'Chat with SOROTI WebWorks');
    pill.type = 'button';
    var fab = createEl('button', 'sw-chat-fab');
    fab.type = 'button';
    fab.id = 'swChatToggleBtn';
    fab.setAttribute('aria-label', 'Open SOROTI WebWorks chat assistant');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'swChatPanel');
    fab.appendChild(createSvgChatIcon(false));
    fab.appendChild(createEl('span', 'sw-chat-online-dot'));

    launcherRow.appendChild(pill);
    launcherRow.appendChild(fab);
    root.appendChild(panel);
    root.appendChild(launcherRow);
    document.body.appendChild(root);

    function renderMessages() {
      var nodes = history.map(function (item) {
        var bubble = createEl(
          'div',
          'sw-chat-msg ' + (item.sender === 'user' ? 'sw-chat-msg-user' : 'sw-chat-msg-bot')
        );
        bubble.appendChild(createEl('div', null, item.text));
        if (item.sender === 'bot' && Array.isArray(item.actions) && item.actions.length > 0) {
          var actionsRow = createEl('div', 'sw-chat-actions');
          item.actions.forEach(function (act) {
            var a = createEl('a', 'sw-chat-action-link', act.label);
            a.href = act.href;
            if (act.external) {
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
            }
            actionsRow.appendChild(a);
          });
          bubble.appendChild(actionsRow);
        }
        return bubble;
      });
      msgBox.replaceChildren.apply(msgBox, nodes);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    function setOpenState(nextOpen) {
      isOpen = Boolean(nextOpen);
      panel.classList.toggle('d-none', !isOpen);
      pill.classList.toggle('d-none', isOpen);
      fab.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      fab.setAttribute('aria-label', isOpen ? 'Close SOROTI WebWorks chat' : 'Open SOROTI WebWorks chat assistant');
      var existingSvg = fab.querySelector('svg');
      if (existingSvg) fab.replaceChild(createSvgChatIcon(isOpen), existingSvg);
      if (isOpen) {
        renderMessages();
        setTimeout(function () {
          input.focus();
        }, 60);
      }
    }

    function sendMessage(rawText) {
      var txt = String(rawText || '').trim();
      if (!txt) return;
      history.push({ sender: 'user', text: txt });
      saveHistory(history);
      renderMessages();

      var reply = buildBotReply(txt);
      setTimeout(function () {
        history.push(reply);
        saveHistory(history);
        renderMessages();
      }, 240);
    }

    fab.addEventListener('click', function () {
      setOpenState(!isOpen);
    });
    pill.addEventListener('click', function () {
      setOpenState(true);
    });
    closeBtn.addEventListener('click', function () {
      setOpenState(false);
    });
    clearBtn.addEventListener('click', function () {
      history = [DEFAULT_BOT_MSG];
      saveHistory(history);
      renderMessages();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var val = input.value;
      input.value = '';
      sendMessage(val);
    });

    renderMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeUI);
  } else {
    initThemeUI();
  }

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) {
      var next = event.newValue === 'dark' ? 'dark' : 'light';
      applyDocumentTheme(next);
      updateToggleButtons(next);
    }
  });

  window.SOROTI_THEME = {
    getTheme: function () {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    },
    setTheme: setTheme,
    toggleTheme: toggleTheme,
  };
})();
