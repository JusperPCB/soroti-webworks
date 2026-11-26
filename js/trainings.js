/**
 * Trainings page controller for SOROTI WebWorks (trainings.html).
 * Loaded as a standard script so courses and enrollment work immediately on both
 * file:// and http:// servers, while syncing applicant profiles and enrollments
 * directly into Supabase (public.profiles and public.training_enrollments).
 * Uses only safe DOM APIs (createElement / textContent) — never innerHTML.
 */

(function () {
  var SUPABASE_ESM_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
  var LOCAL_ENROLLMENTS_KEY = 'sw_training_enrollments';
  var LAST_CLIENT_KEY = 'sw_last_registered_client';

  var FALLBACK_TRAININGS = [
    {
      id: '31412b37-6db9-45a0-88e4-aa6732a564ca',
      title: 'HTML and CSS Foundations',
      description:
        'Build and style responsive pages from scratch: semantic structure, Flexbox/Grid layout, typography and 360px mobile design.',
      level: 'Beginner',
      duration: '4 weeks',
      mode: 'In person',
      fee_ugx: 150000,
      seats: 20,
      start_date: '2026-12-17',
      is_open: true,
    },
    {
      id: 'ba26a518-beb2-426d-88ef-973d37b6db1f',
      title: 'JavaScript for the Web',
      description:
        'Make pages interactive: ES modules, client-side validation, safe DOM manipulation, async REST fetching and browser storage.',
      level: 'Intermediate',
      duration: '6 weeks',
      mode: 'Hybrid',
      fee_ugx: 250000,
      seats: 15,
      start_date: '2027-01-01',
      is_open: true,
    },
    {
      id: '9427c360-8b66-4d93-980b-10a323a5f511',
      title: 'Build a Business Website with Supabase',
      description:
        'Plan, build and launch a dynamic web application with Supabase Auth, PostgreSQL schema design and Row Level Security (RLS).',
      level: 'Advanced',
      duration: '8 weeks',
      mode: 'Online',
      fee_ugx: 350000,
      seats: 12,
      start_date: '2027-01-16',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000004',
      title: 'Git, GitHub & Collaborative Software Engineering',
      description:
        'Master Git commits, branching workflows, pull-request reviews, issue tracking and clean collaborative team workflows.',
      level: 'Beginner',
      duration: '3 weeks',
      mode: 'In person',
      fee_ugx: 120000,
      seats: 20,
      start_date: '2027-02-02',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000005',
      title: 'Python Programming & Data Structures',
      description:
        'Learn Python 3 fundamentals, object-oriented programming, algorithms, file automation and structured unit testing.',
      level: 'Beginner',
      duration: '6 weeks',
      mode: 'Hybrid',
      fee_ugx: 220000,
      seats: 18,
      start_date: '2027-02-16',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000006',
      title: 'SQL, PostgreSQL & Relational Database Design',
      description:
        'Design normalized relational tables, complex JOIN queries, indexes, triggers and PostGIS geospatial columns for production apps.',
      level: 'Beginner',
      duration: '5 weeks',
      mode: 'In person',
      fee_ugx: 200000,
      seats: 16,
      start_date: '2027-03-01',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000007',
      title: 'Backend API Development with Node.js & Express',
      description:
        'Architect RESTful JSON endpoints, token authentication, request validation middleware and external webhook integrations.',
      level: 'Intermediate',
      duration: '6 weeks',
      mode: 'Hybrid',
      fee_ugx: 280000,
      seats: 15,
      start_date: '2027-03-15',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000008',
      title: 'TypeScript & Modern Web App Architecture',
      description:
        'Adopt strict static typing, generic interfaces, state management patterns and scalable modular frontend architecture.',
      level: 'Intermediate',
      duration: '6 weeks',
      mode: 'Online',
      fee_ugx: 300000,
      seats: 15,
      start_date: '2027-04-05',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000009',
      title: 'Flutter Cross-Platform Mobile App Development',
      description:
        'Build responsive Android and iOS apps with Dart and Flutter, GPS location capture, camera scanning and APK release packaging.',
      level: 'Intermediate',
      duration: '8 weeks',
      mode: 'In person',
      fee_ugx: 360000,
      seats: 14,
      start_date: '2027-04-19',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000010',
      title: 'Software Testing, Security & Automated QA',
      description:
        'Implement automated end-to-end browser verification, XSS/CSRF prevention, accessibility audits and performance profiling.',
      level: 'Advanced',
      duration: '5 weeks',
      mode: 'Online',
      fee_ugx: 290000,
      seats: 12,
      start_date: '2027-05-03',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000011',
      title: 'Offline-First Storage & Mobile ML (SQLite + TFLite)',
      description:
        'Engineer zero-connectivity Android storage queues with Drift SQLite and on-device TensorFlow Lite inference inspired by Kahawa Connect.',
      level: 'Advanced',
      duration: '8 weeks',
      mode: 'Hybrid',
      fee_ugx: 400000,
      seats: 12,
      start_date: '2027-05-17',
      is_open: true,
    },
    {
      id: 'd4b1e810-1a2b-4c3d-9e4f-100000000012',
      title: 'Cloud Deployment, Docker & CI/CD Pipelines',
      description:
        'Containerize full-stack web services with Docker, automate GitHub Actions builds, configure HTTPS TLS and monitor uptime.',
      level: 'Advanced',
      duration: '6 weeks',
      mode: 'Online',
      fee_ugx: 340000,
      seats: 12,
      start_date: '2027-06-01',
      is_open: true,
    },
  ];

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

  function formatDate(isoDate) {
    if (!isoDate) return '';
    var d = new Date(isoDate.indexOf('T') === -1 ? isoDate + 'T00:00:00' : isoDate);
    if (Number.isNaN(d.getTime())) return String(isoDate);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatFeeUgx(fee) {
    if (fee === 0) return 'Free';
    if (typeof fee === 'number' && !Number.isNaN(fee)) {
      return 'UGX ' + fee.toLocaleString('en-UG');
    }
    return 'Fee on request';
  }

  function levelBadgeClass(level) {
    if (level === 'Beginner') return 'badge badge-primary mr-2';
    if (level === 'Intermediate') return 'badge badge-info mr-2';
    return 'badge badge-dark mr-2';
  }

  function enrollmentBadgeInfo(status) {
    if (status === 'confirmed') {
      return { className: 'badge badge-success mr-2', label: 'Enrolled · Confirmed' };
    }
    if (status === 'cancelled') {
      return { className: 'badge badge-danger mr-2', label: 'Application Cancelled' };
    }
    return { className: 'badge badge-warning mr-2', label: 'Application Pending' };
  }

  function paymentBadgeInfo(paymentStatus) {
    if (paymentStatus === 'paid') {
      return { className: 'badge badge-success mr-2', label: 'Paid · Verified' };
    }
    if (paymentStatus === 'pending_verification') {
      return { className: 'badge badge-info mr-2', label: 'Paid (Sandbox / Verifying)' };
    }
    if (paymentStatus === 'pay_on_arrival') {
      return { className: 'badge badge-light border mr-2', label: 'Pay on Arrival' };
    }
    if (paymentStatus === 'failed') {
      return { className: 'badge badge-danger mr-2', label: 'Payment Failed' };
    }
    return { className: 'badge badge-secondary mr-2', label: 'Fee Unpaid' };
  }

  function formatPaymentChannelLabel(channel) {
    if (!channel) return 'Not selected';
    if (channel.indexOf('mtn') !== -1) return 'MTN Mobile Money (UGX)';
    if (channel.indexOf('airtel') !== -1) return 'Airtel Money (UGX)';
    if (channel === 'mobilemoneyuganda') return 'Uganda Mobile Money';
    if (channel === 'card') return 'Visa / Mastercard';
    if (channel === 'pay_on_arrival') return 'Pay on Arrival (Soroti Lab)';
    if (channel === 'flutterwave') return 'Online Payment';
    return String(channel);
  }

  function generateTxRef(training) {
    var shortId = String(training && training.id ? training.id : 'COURSE')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase();
    return 'SWW-' + shortId + '-' + Date.now();
  }

  function getSavedLocalEnrollments() {
    try {
      var raw = localStorage.getItem(LOCAL_ENROLLMENTS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalEnrollments(list) {
    try {
      localStorage.setItem(LOCAL_ENROLLMENTS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function getSavedClientInfo() {
    try {
      var raw = localStorage.getItem(LAST_CLIENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveClientInfo(info) {
    try {
      localStorage.setItem(LAST_CLIENT_KEY, JSON.stringify(info));
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var levelButtons = document.querySelectorAll('#trainingLevelFilter button[data-level]');
    var roadmapButtons = document.querySelectorAll('#trainingsRoadmapStrip [data-roadmap-level]');
    var trainingsListEl = document.getElementById('trainingsList');
    var countLabelEl = document.getElementById('trainingsCountLabel');
    var feedbackEl = document.getElementById('trainingsStageFeedback');

    var applyFormCard = document.getElementById('trainingApplyFormCard');
    var applyForm = document.getElementById('trainingApplyForm');
    var applyTrainingIdInput = document.getElementById('applyTrainingId');
    var applyTargetTitleEl = document.getElementById('applyTargetCourseTitle');
    var applyTargetMetaEl = document.getElementById('applyTargetCourseMeta');
    var applyCourseFeeDisplayEl = document.getElementById('applyCourseFeeDisplay');
    var applyFlwModeBadgeEl = document.getElementById('applyFlwModeBadge');
    var payOptionFlwEl = document.getElementById('payOptionFlutterwave');
    var payOptionArrivalEl = document.getElementById('payOptionArrival');
    var applySignInLink = document.getElementById('applySignInLink');
    var applyCancelFormBtn = document.getElementById('applyCancelFormBtn');
    var applySubmitBtn = document.getElementById('applySubmitBtn');
    var applyFormFeedback = document.getElementById('applyFormFeedback');

    var summaryCard = document.getElementById('trainingApplicationSummaryCard');
    var summaryPayNowBtn = document.getElementById('summaryPayNowBtn');
    var summaryPrintBtn = document.getElementById('summaryPrintBtn');
    var summaryDismissBtn = document.getElementById('summaryDismissBtn');

    var flwModalEl = document.getElementById('flwSandboxModal');
    var flwChannelTabs = document.querySelectorAll('#flwChannelTabs [data-flw-channel]');
    var flwMomoFields = document.getElementById('flwMomoFields');
    var flwCardFields = document.getElementById('flwCardFields');
    var flwMomoPhoneInput = document.getElementById('flwMomoPhone');
    var flwConfirmSandboxBtn = document.getElementById('flwConfirmSandboxBtn');
    var flwVerifyPromptBtn = document.getElementById('flwVerifyPromptBtn');
    var flwSandboxFallbackBtn = document.getElementById('flwSandboxFallbackBtn');
    var flwModalModeBadge = document.getElementById('flwModalModeBadge');
    var flwSwitchToArrivalBtn = document.getElementById('flwSwitchToArrivalBtn');
    var flwModalFeedback = document.getElementById('flwModalFeedback');
    var momoPollTimer = null;

    var params = new URLSearchParams(window.location.search);
    var highlightedTrainingId = (params.get('apply') || params.get('pay') || '').trim();
    var payOnLoadTrainingId = (params.get('pay') || '').trim();
    var activeLevel = 'All';
    var allTrainings = FALLBACK_TRAININGS.slice();
    var supabaseClient = null;
    var flwConfig = {
      publicKey: 'FLWPUBK_TEST-907bffed0c566ce48c0fe390c45aedd5-X',
      currency: 'UGX',
    };
    var selectedSandboxChannel = 'mobilemoneyuganda_mtn';
    var activeSummaryContext = null;
    var activeCheckoutContext = null;
    var currentUser = null;
    var currentProfile = null;
    var enrollmentsByTrainingId = new Map();

    // Hydrate any locally saved enrollments immediately
    getSavedLocalEnrollments().forEach(function (row) {
      if (row && row.training_id) {
        enrollmentsByTrainingId.set(row.training_id, row);
      }
    });

    function syncEnrollmentsToLocal() {
      var arr = [];
      enrollmentsByTrainingId.forEach(function (val) {
        arr.push(val);
      });
      saveLocalEnrollments(arr);
    }

    function showFeedback(type, message, options) {
      if (!feedbackEl) return;
      var opts = options || {};
      feedbackEl.className = 'alert alert-' + type + ' mb-4';
      var msgSpan = createEl('span', null, message);
      var children = [msgSpan];

      if (opts.withProfileLink) {
        var space = document.createTextNode(' ');
        var profileLink = createEl('a', 'font-weight-bold ml-1', 'View in My Profile →');
        profileLink.href = 'profile.html';
        children.push(space, profileLink);
      }

      feedbackEl.replaceChildren.apply(feedbackEl, children);
      feedbackEl.classList.remove('d-none');
      feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function isDemoFlutterwaveKey(key) {
      return !key || String(key).indexOf('SANDBOXDEMOKEY') !== -1;
    }

    function updatePayModeUi() {
      var isDemo = isDemoFlutterwaveKey(flwConfig.publicKey);
      var isLiveKey = !isDemo && String(flwConfig.publicKey).indexOf('FLWPUBK_LIVE') === 0;
      if (applyFlwModeBadgeEl) {
        applyFlwModeBadgeEl.className = isLiveKey
          ? 'badge badge-success ml-1'
          : !isDemo
          ? 'badge badge-primary ml-1'
          : 'badge badge-info ml-1';
        applyFlwModeBadgeEl.textContent = isLiveKey
          ? 'Live Checkout'
          : !isDemo
          ? 'Test Gateway Active'
          : 'Sandbox Test Mode';
      }
      if (applySubmitBtn) {
        var useArrival = payOptionArrivalEl && payOptionArrivalEl.checked;
        applySubmitBtn.textContent = useArrival
          ? 'Reserve Seat & Pay on Arrival'
          : 'Continue to Payment';
      }
    }

    if (payOptionFlwEl) payOptionFlwEl.addEventListener('change', updatePayModeUi);
    if (payOptionArrivalEl) payOptionArrivalEl.addEventListener('change', updatePayModeUi);

    function showApplicationSummary(training, applicant, enrollment) {
      if (!summaryCard) return;
      activeSummaryContext = { training: training, applicant: applicant, enrollment: enrollment };
      var setText = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      var modeLabel = training.mode === 'In person' ? 'In person · Soroti' : (training.mode || 'In person');
      var metaParts = [
        training.level,
        modeLabel,
        training.duration,
        formatFeeUgx(training.fee_ugx),
      ].filter(Boolean);

      var payStatus = (enrollment && enrollment.payment_status) || 'unpaid';
      var payMethod = (enrollment && enrollment.payment_method) || '';
      var payRef = (enrollment && (enrollment.flw_transaction_id || enrollment.payment_reference)) || 'Pending';

      setText('summaryEnrollmentCourse', training.title);
      setText('summaryEnrollmentMeta', metaParts.join(' · '));
      setText('summaryEnrollmentName', applicant.full_name || 'Client');
      setText('summaryEnrollmentEmail', applicant.email || '-');
      setText('summaryEnrollmentPhone', applicant.phone || 'Not provided');
      setText('summaryEnrollmentOrg', applicant.organisation || 'Not provided');
      setText('summaryEnrollmentPaymentMethod', formatPaymentChannelLabel(payMethod));
      setText('summaryEnrollmentPaymentRef', payRef);

      var statusBadge = document.getElementById('summaryEnrollmentStatus');
      if (statusBadge) {
        var info = enrollmentBadgeInfo((enrollment && enrollment.status) || 'pending');
        statusBadge.className = info.className.replace(' mr-2', '');
        statusBadge.textContent = info.label;
      }

      var payBadge = document.getElementById('summaryEnrollmentPaymentBadge');
      if (payBadge) {
        var pInfo = paymentBadgeInfo(payStatus);
        payBadge.className = pInfo.className;
        payBadge.textContent = pInfo.label;
      }

      if (summaryPayNowBtn) {
        var canPayOnline =
          Number(training.fee_ugx || 0) > 0 &&
          payStatus !== 'paid' &&
          payStatus !== 'pending_verification' &&
          (!enrollment || enrollment.status !== 'cancelled');
        summaryPayNowBtn.classList.toggle('d-none', !canPayOnline);
      }

      if (applyFormCard) applyFormCard.classList.add('d-none');
      summaryCard.classList.remove('d-none');
    }

    function openApplyForm(training) {
      if (!applyFormCard) return;
      if (summaryCard) summaryCard.classList.add('d-none');
      if (applyFormFeedback) applyFormFeedback.classList.add('d-none');

      if (applyTrainingIdInput) applyTrainingIdInput.value = training.id;
      if (applyTargetTitleEl) applyTargetTitleEl.textContent = training.title;
      if (applyCourseFeeDisplayEl) applyCourseFeeDisplayEl.textContent = formatFeeUgx(training.fee_ugx);

      var modeLabel = training.mode === 'In person' ? 'In person · Soroti' : (training.mode || 'In person');
      var metaParts = [
        training.level,
        modeLabel,
        training.duration,
        formatFeeUgx(training.fee_ugx),
        training.start_date ? 'Starts ' + formatDate(training.start_date) : null,
      ].filter(Boolean);
      if (applyTargetMetaEl) applyTargetMetaEl.textContent = metaParts.join(' · ');

      if (applySignInLink) {
        var returnPath = 'trainings.html?apply=' + encodeURIComponent(training.id);
        applySignInLink.href = 'login.html?next=' + encodeURIComponent(returnPath);
        applySignInLink.classList.toggle('d-none', Boolean(currentUser));
      }

      var savedClient = getSavedClientInfo() || {};
      var nameInput = document.getElementById('applyFullName');
      var emailInput = document.getElementById('applyEmail');
      var phoneInput = document.getElementById('applyPhone');
      var orgInput = document.getElementById('applyOrganisation');
      var passInput = document.getElementById('applyPassword');
      var passGroup = passInput ? passInput.closest('.form-group') : null;
      if (passGroup) {
        passGroup.classList.toggle('d-none', Boolean(currentUser));
      }

      if (nameInput && !nameInput.value) {
        nameInput.value =
          (currentProfile && currentProfile.full_name) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) ||
          savedClient.full_name ||
          '';
      }
      if (emailInput && !emailInput.value) {
        emailInput.value =
          (currentProfile && currentProfile.email) ||
          (currentUser && currentUser.email) ||
          savedClient.email ||
          '';
      }
      if (phoneInput && !phoneInput.value) {
        phoneInput.value =
          (currentProfile && currentProfile.phone) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.phone) ||
          savedClient.phone ||
          '';
      }
      if (orgInput && !orgInput.value) {
        orgInput.value =
          (currentProfile && currentProfile.organisation) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.organisation) ||
          savedClient.organisation ||
          '';
      }

      updatePayModeUi();
      applyFormCard.classList.remove('d-none');
      applyFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (nameInput) nameInput.focus();
    }

    function validateApplyForm() {
      var nameInput = document.getElementById('applyFullName');
      var emailInput = document.getElementById('applyEmail');
      var phoneInput = document.getElementById('applyPhone');
      var orgInput = document.getElementById('applyOrganisation');
      var passInput = document.getElementById('applyPassword');

      var nameErr = document.getElementById('applyFullNameError');
      var emailErr = document.getElementById('applyEmailError');
      var phoneErr = document.getElementById('applyPhoneError');
      var orgErr = document.getElementById('applyOrganisationError');
      var passErr = document.getElementById('applyPasswordError');

      var nameVal = (nameInput && nameInput.value ? nameInput.value : '').trim();
      var emailVal = (emailInput && emailInput.value ? emailInput.value : '').trim();
      var phoneVal = (phoneInput && phoneInput.value ? phoneInput.value : '').trim();
      var orgVal = (orgInput && orgInput.value ? orgInput.value : '').trim();
      var passVal = passInput && passInput.value ? passInput.value : '';

      var nameMsg = '';
      if (!nameVal) nameMsg = 'Please enter your full name.';
      else if (nameVal.length < 2 || nameVal.length > 100) {
        nameMsg = 'Full name must be between 2 and 100 characters.';
      }

      var emailMsg = '';
      if (!emailVal) emailMsg = 'Please enter your email address.';
      else if (!EMAIL_PATTERN.test(emailVal)) {
        emailMsg = 'Please enter a valid email address (for example, name@example.com).';
      }

      var phoneMsg = '';
      if (phoneVal && !PHONE_PATTERN.test(phoneVal)) {
        phoneMsg = 'Enter a valid phone number (7–20 digits) or leave blank.';
      }

      var orgMsg = '';
      if (orgVal.length > 120) {
        orgMsg = 'Organisation name cannot exceed 120 characters.';
      }

      var passMsg = '';
      if (passVal && (passVal.length < 8 || !/[A-Za-z]/.test(passVal) || !/\d/.test(passVal))) {
        passMsg = 'Password must be at least 8 characters and include a letter and a number.';
      }

      var ok1 = setFieldValidation(nameInput, nameErr, nameMsg);
      var ok2 = setFieldValidation(emailInput, emailErr, emailMsg);
      var ok3 = setFieldValidation(phoneInput, phoneErr, phoneMsg);
      var ok4 = setFieldValidation(orgInput, orgErr, orgMsg);
      var ok5 = setFieldValidation(passInput, passErr, passMsg);
      return ok1 && ok2 && ok3 && ok4 && ok5;
    }

    async function ensureSupabaseClient() {
      if (supabaseClient) return supabaseClient;
      try {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
          var cfgMod = await import('./config.js');
          if (cfgMod && cfgMod.FLUTTERWAVE_PUBLIC_KEY) {
            flwConfig.publicKey = cfgMod.FLUTTERWAVE_PUBLIC_KEY;
          }
          if (cfgMod && cfgMod.FLUTTERWAVE_CURRENCY) {
            flwConfig.currency = cfgMod.FLUTTERWAVE_CURRENCY;
          }
          var modHttp = await import('./supabaseClient.js');
          supabaseClient = modHttp.supabase;
          updatePayModeUi();
          return supabaseClient;
        }
      } catch (_) {}
      try {
        var modCdn = await import(SUPABASE_ESM_URL);
        var cfg = window.SOROTI_CONFIG || {
          SUPABASE_URL: 'https://pnxbxgekmfipasbdzbye.supabase.co',
          SUPABASE_ANON_KEY: 'sb_publishable_lHBaUfwxxMqW2UK-eVuKXw_p_cWQJzg',
        };
        if (cfg.FLUTTERWAVE_PUBLIC_KEY) {
          flwConfig.publicKey = cfg.FLUTTERWAVE_PUBLIC_KEY;
        }
        supabaseClient = modCdn.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        updatePayModeUi();
        return supabaseClient;
      } catch (_) {
        updatePayModeUi();
        return null;
      }
    }

    async function completeFlutterwavePayment(ctx, flwResult) {
      var training = ctx.training;
      var applicant = ctx.applicant;
      var enrollment = ctx.enrollment;
      var txRef = ctx.txRef;
      var transactionId = String((flwResult && flwResult.transaction_id) || ('SANDBOX-' + Date.now()));
      var channel = String((flwResult && flwResult.payment_channel) || 'flutterwave');

      enrollment.payment_reference = txRef;
      enrollment.flw_transaction_id = transactionId;
      enrollment.payment_method = channel;
      enrollment.payment_status = 'pending_verification';

      if (supabaseClient && currentUser) {
        try {
          var fnRes = await supabaseClient.functions.invoke('verify-flutterwave-payment', {
            body: {
              enrollment_id: enrollment.id && String(enrollment.id).indexOf('local-') !== 0 ? enrollment.id : null,
              training_id: training.id,
              tx_ref: txRef,
              transaction_id: transactionId,
              payment_channel: channel,
              payer_name: applicant.full_name,
              payer_email: applicant.email,
              payer_phone: applicant.phone || '',
            },
          });
          if (fnRes && !fnRes.error && fnRes.data) {
            if (fnRes.data.verified === true) {
              enrollment.status = fnRes.data.status || 'confirmed';
              enrollment.payment_status = 'paid';
              enrollment.amount_paid_ugx = Number(fnRes.data.amount_ugx || training.fee_ugx || 0);
              enrollment.paid_at = fnRes.data.verified_at || new Date().toISOString();
            } else if (fnRes.data.payment_status) {
              enrollment.payment_status = fnRes.data.payment_status;
            }
          }
        } catch (_) {}
      }

      enrollmentsByTrainingId.set(training.id, enrollment);
      syncEnrollmentsToLocal();
      renderTrainings();
      showApplicationSummary(training, applicant, enrollment);

      var isVerified = enrollment.payment_status === 'paid';
      showFeedback(
        isVerified ? 'success' : 'info',
        isVerified
          ? 'Payment verified (' + formatFeeUgx(training.fee_ugx) + ') and seat confirmed for "' + training.title + '"! Ref: ' + txRef
          : 'Sandbox payment recorded for "' + training.title + '" (Ref: ' + txRef + '). Live payment gateway keys can be configured for instant settlement.',
        { withProfileLink: true }
      );
      return isVerified;
    }

    function stopMomoPolling() {
      if (momoPollTimer) {
        clearInterval(momoPollTimer);
        momoPollTimer = null;
      }
    }

    function setModalVisibility(show) {
      if (!show) stopMomoPolling();
      if (!flwModalEl) return;
      if (window.jQuery && typeof window.jQuery(flwModalEl).modal === 'function') {
        window.jQuery(flwModalEl).modal(show ? 'show' : 'hide');
        return;
      }
      flwModalEl.classList.toggle('show', show);
      flwModalEl.style.display = show ? 'block' : 'none';
      flwModalEl.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    function updateModalActionLabel() {
      if (!flwConfirmSandboxBtn) return;
      var isCard = selectedSandboxChannel === 'card';
      flwConfirmSandboxBtn.textContent = isCard ? 'Complete Card Payment' : 'Send Payment Prompt';
    }

    function openSandboxCheckoutModal(ctx) {
      stopMomoPolling();
      activeCheckoutContext = ctx;
      if (!flwModalEl) {
        completeFlutterwavePayment(ctx, { transaction_id: 'SANDBOX-FLW-' + Date.now(), payment_channel: selectedSandboxChannel });
        return;
      }

      var courseEl = document.getElementById('flwModalCourseName');
      var refEl = document.getElementById('flwModalTxRef');
      var amtEl = document.getElementById('flwModalAmount');
      if (courseEl) courseEl.textContent = ctx.training.title;
      if (refEl) refEl.textContent = 'Ref: ' + ctx.txRef;
      if (amtEl) amtEl.textContent = formatFeeUgx(ctx.training.fee_ugx);
      if (flwMomoPhoneInput) {
        flwMomoPhoneInput.value = (ctx.applicant && ctx.applicant.phone) || '';
      }
      if (flwModalFeedback) flwModalFeedback.classList.add('d-none');
      if (flwVerifyPromptBtn) flwVerifyPromptBtn.classList.add('d-none');
      if (flwSandboxFallbackBtn) flwSandboxFallbackBtn.classList.add('d-none');
      if (flwConfirmSandboxBtn) {
        flwConfirmSandboxBtn.classList.remove('d-none');
        flwConfirmSandboxBtn.disabled = false;
        updateModalActionLabel();
      }
      if (flwModalModeBadge) {
        flwModalModeBadge.className = 'badge badge-warning text-dark font-weight-bold mb-1';
        flwModalModeBadge.textContent = 'UGANDA MOBILE MONEY & CARD';
      }
      setModalVisibility(true);
    }

    function launchFlutterwaveCheckout(ctx) {
      openSandboxCheckoutModal(ctx);
    }

    flwChannelTabs.forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        selectedSandboxChannel = tabBtn.getAttribute('data-flw-channel') || 'mobilemoneyuganda_mtn';
        flwChannelTabs.forEach(function (btn) {
          var active = btn === tabBtn;
          btn.classList.toggle('btn-primary', active);
          btn.classList.toggle('btn-outline-royal', !active);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        var isCard = selectedSandboxChannel === 'card';
        if (flwMomoFields) flwMomoFields.classList.toggle('d-none', isCard);
        if (flwCardFields) flwCardFields.classList.toggle('d-none', !isCard);
        updateModalActionLabel();
      });
    });

    async function verifyPendingMomoPrompt(ctx, silentPending) {
      if (!ctx || !ctx.pendingTxId || !supabaseClient || !currentUser) return false;
      var fnRes = await supabaseClient.functions.invoke('verify-flutterwave-payment', {
        body: {
          enrollment_id: ctx.enrollment.id && String(ctx.enrollment.id).indexOf('local-') !== 0 ? ctx.enrollment.id : null,
          training_id: ctx.training.id,
          tx_ref: ctx.txRef,
          transaction_id: ctx.pendingTxId,
          payment_channel: ctx.pendingChannel || selectedSandboxChannel,
          payer_name: ctx.applicant.full_name,
          payer_email: ctx.applicant.email,
          payer_phone: ctx.applicant.phone || '',
        },
      });
      if (fnRes && !fnRes.error && fnRes.data && fnRes.data.verified === true) {
        stopMomoPolling();
        ctx.enrollment.status = fnRes.data.status || 'confirmed';
        ctx.enrollment.payment_status = 'paid';
        ctx.enrollment.payment_method = fnRes.data.payment_channel || ctx.pendingChannel || selectedSandboxChannel;
        ctx.enrollment.payment_reference = ctx.txRef;
        ctx.enrollment.flw_transaction_id = fnRes.data.flw_transaction_id || ctx.pendingTxId;
        ctx.enrollment.amount_paid_ugx = Number(fnRes.data.amount_ugx || ctx.training.fee_ugx || 0);
        ctx.enrollment.paid_at = fnRes.data.verified_at || new Date().toISOString();
        enrollmentsByTrainingId.set(ctx.training.id, ctx.enrollment);
        syncEnrollmentsToLocal();
        setModalVisibility(false);
        renderTrainings();
        showApplicationSummary(ctx.training, ctx.applicant, ctx.enrollment);
        showFeedback(
          'success',
          'Payment verified (' + formatFeeUgx(ctx.training.fee_ugx) + ') and seat confirmed for "' + ctx.training.title + '"! Ref: ' + ctx.txRef,
          { withProfileLink: true }
        );
        return true;
      }
      if (!silentPending && flwModalFeedback) {
        var st = (fnRes && fnRes.data && fnRes.data.flw_status) || 'pending';
        flwModalFeedback.className = 'alert alert-info mt-2 mb-0';
        flwModalFeedback.textContent =
          'Payment status is still "' + st + '". Complete the USSD PIN prompt on your phone, then click Verify again.';
        flwModalFeedback.classList.remove('d-none');
      }
      return false;
    }

    if (flwVerifyPromptBtn) {
      flwVerifyPromptBtn.addEventListener('click', async function () {
        if (!activeCheckoutContext) return;
        flwVerifyPromptBtn.disabled = true;
        flwVerifyPromptBtn.textContent = 'Checking...';
        await verifyPendingMomoPrompt(activeCheckoutContext, false);
        flwVerifyPromptBtn.disabled = false;
        flwVerifyPromptBtn.textContent = "I've Entered PIN — Verify";
      });
    }

    if (flwSandboxFallbackBtn) {
      flwSandboxFallbackBtn.addEventListener('click', async function () {
        if (!activeCheckoutContext) return;
        var ctx = activeCheckoutContext;
        flwSandboxFallbackBtn.disabled = true;
        flwSandboxFallbackBtn.textContent = 'Recording Sandbox...';
        await completeFlutterwavePayment(ctx, {
          transaction_id: 'SANDBOX-FLW-' + Date.now(),
          payment_channel: selectedSandboxChannel,
        });
        flwSandboxFallbackBtn.disabled = false;
        flwSandboxFallbackBtn.textContent = 'Run Sandbox Test';
        setModalVisibility(false);
      });
    }

    if (flwConfirmSandboxBtn) {
      flwConfirmSandboxBtn.addEventListener('click', async function () {
        if (!activeCheckoutContext) return;
        var ctx = activeCheckoutContext;

        if (selectedSandboxChannel === 'card') {
          if (!isDemoFlutterwaveKey(flwConfig.publicKey) && typeof window.FlutterwaveCheckout === 'function') {
            setModalVisibility(false);
            window.FlutterwaveCheckout({
              public_key: flwConfig.publicKey,
              tx_ref: ctx.txRef,
              amount: Number(ctx.training.fee_ugx || 0),
              currency: flwConfig.currency || 'UGX',
              payment_options: 'card, mobilemoneyuganda',
              customer: {
                email: ctx.applicant.email,
                phone_number: ctx.applicant.phone || '',
                name: ctx.applicant.full_name,
              },
              customizations: {
                title: 'SOROTI WebWorks',
                description: ctx.training.title + ' · Cohort Fee',
              },
              callback: function (data) {
                completeFlutterwavePayment(ctx, {
                  transaction_id: data && data.transaction_id ? String(data.transaction_id) : '',
                  payment_channel: 'card',
                });
              },
              onclose: function () {
                renderTrainings();
              },
            });
            return;
          }

          flwConfirmSandboxBtn.disabled = true;
          flwConfirmSandboxBtn.textContent = 'Processing...';
          await completeFlutterwavePayment(ctx, {
            transaction_id: 'SANDBOX-CARD-' + Date.now(),
            payment_channel: 'card',
          });
          flwConfirmSandboxBtn.disabled = false;
          updateModalActionLabel();
          setModalVisibility(false);
          return;
        }

        // Mobile Money (MTN / Airtel): call initiate-momo-payment for a live USSD PIN push
        var phoneEntered = flwMomoPhoneInput ? flwMomoPhoneInput.value.trim() : '';
        if (!phoneEntered || !PHONE_PATTERN.test(phoneEntered)) {
          if (flwModalFeedback) {
            flwModalFeedback.className = 'alert alert-danger mt-2 mb-0';
            flwModalFeedback.textContent = 'Please enter a valid Ugandan MTN or Airtel number (e.g., 0789939643).';
            flwModalFeedback.classList.remove('d-none');
          }
          if (flwMomoPhoneInput) flwMomoPhoneInput.focus();
          return;
        }
        ctx.applicant.phone = phoneEntered;

        flwConfirmSandboxBtn.disabled = true;
        flwConfirmSandboxBtn.textContent = 'Sending Prompt...';
        if (flwModalFeedback) flwModalFeedback.classList.add('d-none');

        var networkChoice = selectedSandboxChannel === 'mobilemoneyuganda_airtel' ? 'AIRTEL' : 'MTN';
        var initData = null;
        var initErr = null;
        if (supabaseClient && currentUser) {
          try {
            var initRes = await supabaseClient.functions.invoke('initiate-momo-payment', {
              body: {
                training_id: ctx.training.id,
                enrollment_id: ctx.enrollment.id && String(ctx.enrollment.id).indexOf('local-') !== 0 ? ctx.enrollment.id : null,
                tx_ref: ctx.txRef,
                phone_number: phoneEntered,
                network: networkChoice,
                payment_channel: selectedSandboxChannel,
                payer_name: ctx.applicant.full_name,
                payer_email: ctx.applicant.email,
                redirect_url: window.location.href,
              },
            });
            initData = initRes ? initRes.data : null;
            initErr = initRes ? initRes.error : null;
          } catch (e) {
            initErr = e;
          }
        } else {
          initData = { missing_server_secret: true };
        }

        flwConfirmSandboxBtn.disabled = false;
        updateModalActionLabel();

        if (initData && initData.prompt_sent === true) {
          ctx.pendingTxId = initData.transaction_id;
          ctx.pendingChannel = initData.payment_channel || selectedSandboxChannel;
          var isLiveCharge = initData.mode === 'live';
          if (flwModalModeBadge) {
            flwModalModeBadge.className = 'badge badge-success font-weight-bold mb-1';
            flwModalModeBadge.textContent = isLiveCharge
              ? 'LIVE PROMPT SENT · CHECK YOUR PHONE'
              : 'TEST MODE · AUTHORIZATION READY';
          }
          if (flwModalFeedback) {
            flwModalFeedback.className = 'alert alert-success mt-2 mb-0';
            var msgP = createEl(
              'div',
              null,
              initData.message ||
                'Payment initiated for ' + phoneEntered + '. Complete approval, then click Verify.'
            );
            var safeAuthUrl = '';
            if (initData.redirect_url) {
              try {
                var parsedUrl = new URL(String(initData.redirect_url));
                if (parsedUrl.protocol === 'https:') safeAuthUrl = parsedUrl.href;
              } catch (_) {}
            }
            if (safeAuthUrl) {
              var authWrap = createEl('div', 'mt-2');
              var authLink = createEl('a', 'btn btn-sm btn-primary', 'Complete Payment Authorization');
              authLink.href = safeAuthUrl;
              authLink.target = '_blank';
              authLink.rel = 'noopener noreferrer';
              authWrap.appendChild(authLink);
              flwModalFeedback.replaceChildren(msgP, authWrap);
            } else {
              flwModalFeedback.replaceChildren(msgP);
            }
            flwModalFeedback.classList.remove('d-none');
          }
          if (flwConfirmSandboxBtn) flwConfirmSandboxBtn.classList.add('d-none');
          if (flwVerifyPromptBtn) flwVerifyPromptBtn.classList.remove('d-none');
          if (flwSandboxFallbackBtn) flwSandboxFallbackBtn.classList.add('d-none');

          stopMomoPolling();
          var pollAttempts = 0;
          momoPollTimer = setInterval(async function () {
            pollAttempts += 1;
            var okPaid = await verifyPendingMomoPrompt(ctx, true);
            if (okPaid || pollAttempts >= 15) {
              stopMomoPolling();
            }
          }, 4000);
          return;
        }

        if (initData && initData.missing_server_secret) {
          if (flwModalModeBadge) {
            flwModalModeBadge.className = 'badge badge-warning text-dark font-weight-bold mb-1';
            flwModalModeBadge.textContent = 'LIVE KEY REQUIRED · SANDBOX AVAILABLE';
          }
          if (flwModalFeedback) {
            flwModalFeedback.className = 'alert alert-warning mt-2 mb-0';
            flwModalFeedback.textContent =
              'No live Mobile Money API key (FLW_SECRET_KEY) is configured on Supabase yet, so a real USSD prompt could not be sent to ' +
              phoneEntered +
              '. Add your live key in Supabase Edge Function Secrets to enable real phone prompts, or click Run Sandbox Test below.';
            flwModalFeedback.classList.remove('d-none');
          }
          if (flwSandboxFallbackBtn) flwSandboxFallbackBtn.classList.remove('d-none');
          return;
        }

        if (flwModalFeedback) {
          flwModalFeedback.className = 'alert alert-danger mt-2 mb-0';
          flwModalFeedback.textContent =
            (initData && initData.error) ||
            (initErr && initErr.message) ||
            'Could not initiate Mobile Money payment prompt. Please check your phone number and try again.';
          flwModalFeedback.classList.remove('d-none');
        }
      });
    }

    if (flwSwitchToArrivalBtn) {
      flwSwitchToArrivalBtn.addEventListener('click', async function () {
        if (!activeCheckoutContext) return;
        var ctx = activeCheckoutContext;
        ctx.enrollment.payment_status = 'pay_on_arrival';
        ctx.enrollment.payment_method = 'pay_on_arrival';
        if (supabaseClient && currentUser && ctx.enrollment.id && String(ctx.enrollment.id).indexOf('local-') !== 0) {
          await supabaseClient
            .from('training_enrollments')
            .update({ payment_status: 'pay_on_arrival', payment_method: 'pay_on_arrival', payment_reference: ctx.txRef })
            .eq('id', ctx.enrollment.id)
            .eq('user_id', currentUser.id);
        }
        enrollmentsByTrainingId.set(ctx.training.id, ctx.enrollment);
        syncEnrollmentsToLocal();
        setModalVisibility(false);
        renderTrainings();
        showApplicationSummary(ctx.training, ctx.applicant, ctx.enrollment);
        showFeedback(
          'info',
          'Seat reserved for "' + ctx.training.title + '". Pay on arrival at Plot 14, Gweri Road or click Pay Course Fee Now anytime.',
          { withProfileLink: true }
        );
      });
    }

    async function submitEnrollmentForUser(training, buttonEl, applicantOverride, providedPassword, paymentChoice) {
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = 'Processing...';
      }

      var chosenMode = paymentChoice === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave';
      var txRef = generateTxRef(training);

      await ensureSupabaseClient();

      var applicant = applicantOverride || {
        full_name:
          (currentProfile && currentProfile.full_name) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) ||
          (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Client'),
        email: (currentProfile && currentProfile.email) || (currentUser && currentUser.email) || '',
        phone:
          (currentProfile && currentProfile.phone) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.phone) ||
          '',
        organisation:
          (currentProfile && currentProfile.organisation) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.organisation) ||
          '',
        role: (currentProfile && currentProfile.role) || 'client',
      };

      // If visitor submitted the form without an active session, create/confirm account via register-client Edge Function
      if (supabaseClient && !currentUser && applicant.email) {
        var effectivePassword =
          providedPassword && providedPassword.length >= 8 && /[A-Za-z]/.test(providedPassword) && /\d/.test(providedPassword)
            ? providedPassword
            : 'SwClient#' + (applicant.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'User') + '2026';

        try {
          var regFnRes = await supabaseClient.functions.invoke('register-client', {
            body: {
              full_name: applicant.full_name,
              email: applicant.email,
              password: effectivePassword,
              phone: applicant.phone || '',
              organisation: applicant.organisation || '',
            },
          });

          if (regFnRes && !regFnRes.error && regFnRes.data && regFnRes.data.ok && regFnRes.data.user) {
            applicant.id = regFnRes.data.user.id;
            applicant.created_at = regFnRes.data.user.created_at || new Date().toISOString();
          }

          var signInRes = await supabaseClient.auth.signInWithPassword({
            email: applicant.email.toLowerCase(),
            password: effectivePassword,
          });
          if (signInRes.data && signInRes.data.user) {
            currentUser = signInRes.data.user;
            applicant.id = currentUser.id;
          }
        } catch (_) {}
      }

      // If signed in, ensure public.profiles is updated with latest full_name, phone, organisation
      if (supabaseClient && currentUser) {
        applicant.id = currentUser.id;
        try {
          await supabaseClient
            .from('profiles')
            .update({
              full_name: applicant.full_name,
              phone: applicant.phone || null,
              organisation: applicant.organisation || null,
            })
            .eq('id', currentUser.id);
        } catch (_) {}
      }

      saveClientInfo({
        id: applicant.id || ('client-' + Date.now()),
        full_name: applicant.full_name,
        email: applicant.email,
        phone: applicant.phone || '',
        organisation: applicant.organisation || '',
        role: applicant.role || 'client',
        created_at: applicant.created_at || new Date().toISOString(),
      });

      var existing = enrollmentsByTrainingId.get(training.id);
      if (existing && existing.status === 'cancelled' && supabaseClient && currentUser) {
        await supabaseClient
          .from('training_enrollments')
          .delete()
          .eq('id', existing.id)
          .eq('user_id', currentUser.id);
        enrollmentsByTrainingId.delete(training.id);
      }

      var initialPayStatus = chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'unpaid';
      var recordedRow = null;

      if (supabaseClient && currentUser) {
        var res = await supabaseClient
          .from('training_enrollments')
          .insert({
            user_id: currentUser.id,
            training_id: training.id,
            payment_status: initialPayStatus,
            payment_method: chosenMode,
            payment_reference: txRef,
          })
          .select('id, training_id, status, payment_status, payment_method, payment_reference, flw_transaction_id, amount_paid_ugx, paid_at, created_at')
          .single();

        if (res.error && res.error.code !== '23505' && res.error.code !== '23503') {
          if (buttonEl) {
            buttonEl.disabled = false;
            updatePayModeUi();
          }
          showFeedback('danger', 'Could not submit training application: ' + res.error.message);
          return;
        }

        if (res.error && res.error.code === '23505') {
          var dupRes = await supabaseClient
            .from('training_enrollments')
            .select('id, training_id, status, payment_status, payment_method, payment_reference, flw_transaction_id, amount_paid_ugx, paid_at, created_at')
            .eq('user_id', currentUser.id)
            .eq('training_id', training.id)
            .maybeSingle();
          recordedRow = dupRes && dupRes.data ? dupRes.data : null;
        } else if (!res.error && res.data) {
          recordedRow = res.data;
        }

        if (!recordedRow) {
          recordedRow = {
            id: 'local-' + Date.now(),
            user_id: currentUser.id,
            training_id: training.id,
            status: 'pending',
            payment_status: initialPayStatus,
            payment_method: chosenMode,
            payment_reference: txRef,
            amount_paid_ugx: 0,
            created_at: new Date().toISOString(),
          };
        }

        // Insert initial payment intent row when signed in and course wasn't from local fallback
        if (recordedRow.id && String(recordedRow.id).indexOf('local-') !== 0) {
          try {
            await supabaseClient.from('training_payments').insert({
              enrollment_id: recordedRow.id,
              user_id: currentUser.id,
              training_id: training.id,
              tx_ref: txRef,
              provider: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave',
              payment_channel: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave',
              amount_ugx: Number(training.fee_ugx || 0),
              currency: flwConfig.currency || 'UGX',
              status: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'initiated',
              mode: chosenMode === 'pay_on_arrival' ? 'offline' : (isDemoFlutterwaveKey(flwConfig.publicKey) ? 'sandbox' : 'live'),
              payer_name: applicant.full_name,
              payer_email: applicant.email,
              payer_phone: applicant.phone || null,
            });
          } catch (_) {}
        }

        recordedRow.applicant = applicant;
        recordedRow.trainings = training;
        enrollmentsByTrainingId.set(training.id, recordedRow);
        syncEnrollmentsToLocal();
      } else {
        recordedRow = {
          id: 'local-' + Date.now(),
          user_id: applicant.id || null,
          training_id: training.id,
          status: 'pending',
          payment_status: initialPayStatus,
          payment_method: chosenMode,
          payment_reference: txRef,
          amount_paid_ugx: 0,
          created_at: new Date().toISOString(),
          applicant: applicant,
          trainings: training,
        };
        enrollmentsByTrainingId.set(training.id, recordedRow);
        syncEnrollmentsToLocal();
      }

      if (highlightedTrainingId === training.id) {
        highlightedTrainingId = '';
      }

      renderTrainings();

      if (chosenMode === 'flutterwave' && Number(training.fee_ugx || 0) > 0) {
        if (applyFormCard) applyFormCard.classList.add('d-none');
        launchFlutterwaveCheckout({
          training: training,
          applicant: applicant,
          enrollment: recordedRow,
          txRef: txRef,
        });
        return;
      }

      showApplicationSummary(training, applicant, recordedRow);
      showFeedback(
        'success',
        'Seat reserved for "' +
          training.title +
          '" (Ref: ' +
          txRef +
          '). Pay on arrival at Plot 14, Gweri Road or click Pay Course Fee Now anytime.',
        { withProfileLink: true }
      );
    }

    function buildApplicantSnapshot() {
      var savedClient = getSavedClientInfo() || {};
      return {
        id: (currentUser && currentUser.id) || savedClient.id || null,
        full_name:
          (currentProfile && currentProfile.full_name) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) ||
          savedClient.full_name ||
          (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Client'),
        email:
          (currentProfile && currentProfile.email) ||
          (currentUser && currentUser.email) ||
          savedClient.email ||
          '',
        phone:
          (currentProfile && currentProfile.phone) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.phone) ||
          savedClient.phone ||
          '',
        organisation:
          (currentProfile && currentProfile.organisation) ||
          (currentUser && currentUser.user_metadata && currentUser.user_metadata.organisation) ||
          savedClient.organisation ||
          '',
        role: (currentProfile && currentProfile.role) || 'client',
      };
    }

    function openPayCheckoutForEnrollment(training, enrollment) {
      var applicant = (enrollment && enrollment.applicant) || buildApplicantSnapshot();
      var txRef = generateTxRef(training);
      launchFlutterwaveCheckout({
        training: training,
        applicant: applicant,
        enrollment: enrollment,
        txRef: txRef,
      });
    }

    function handleApplyClick(training) {
      openApplyForm(training);
    }

    async function handleCancel(training, enrollment, buttonEl) {
      if (!enrollment) return;

      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = 'Cancelling...';
      }

      if (supabaseClient && currentUser && enrollment.id && String(enrollment.id).indexOf('local-') !== 0) {
        var res = await supabaseClient
          .from('training_enrollments')
          .delete()
          .eq('id', enrollment.id)
          .eq('user_id', currentUser.id);

        if (res.error) {
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.textContent = 'Cancel Application';
          }
          showFeedback('danger', 'Could not cancel application: ' + res.error.message);
          return;
        }
      }

      enrollmentsByTrainingId.delete(training.id);
      syncEnrollmentsToLocal();
      if (summaryCard) summaryCard.classList.add('d-none');
      renderTrainings();
      showFeedback(
        'info',
        'Your application for "' + training.title + '" has been cancelled. You can apply again anytime.'
      );
    }

    if (applyCancelFormBtn) {
      applyCancelFormBtn.addEventListener('click', function () {
        if (applyFormCard) applyFormCard.classList.add('d-none');
      });
    }

    if (summaryDismissBtn) {
      summaryDismissBtn.addEventListener('click', function () {
        if (summaryCard) summaryCard.classList.add('d-none');
      });
    }

    if (summaryPayNowBtn) {
      summaryPayNowBtn.addEventListener('click', function () {
        if (!activeSummaryContext) return;
        openPayCheckoutForEnrollment(activeSummaryContext.training, activeSummaryContext.enrollment);
      });
    }

    if (summaryPrintBtn) {
      summaryPrintBtn.addEventListener('click', function () {
        window.print();
      });
    }

    if (applyForm) {
      ['applyFullName', 'applyEmail', 'applyPhone', 'applyOrganisation', 'applyPassword'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('blur', validateApplyForm);
      });

      applyForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!validateApplyForm()) {
          var firstInvalid = applyForm.querySelector('.is-invalid');
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        var targetId = applyTrainingIdInput ? applyTrainingIdInput.value : '';
        var training =
          allTrainings.find(function (t) {
            return t.id === targetId;
          }) || allTrainings[0];
        if (!training) return;

        var passInput = document.getElementById('applyPassword');
        var rawPassword = passInput && passInput.value ? passInput.value : '';

        var applicant = {
          full_name: document.getElementById('applyFullName').value.trim(),
          email: document.getElementById('applyEmail').value.trim(),
          phone: document.getElementById('applyPhone').value.trim(),
          organisation: document.getElementById('applyOrganisation').value.trim(),
          role: 'client',
        };

        var chosenRadio = applyForm.querySelector('input[name="applyPaymentOption"]:checked');
        var paymentChoice = chosenRadio ? chosenRadio.value : 'flutterwave';

        await submitEnrollmentForUser(training, applySubmitBtn, applicant, rawPassword, paymentChoice);
        if (applySubmitBtn) {
          applySubmitBtn.disabled = false;
          updatePayModeUi();
        }
      });
    }

    function buildTrainingCard(training) {
      var enrollment = enrollmentsByTrainingId.get(training.id) || null;
      var isHighlighted = highlightedTrainingId && highlightedTrainingId === training.id;

      var article = createEl(
        'article',
        'card sw-card mb-3' + (isHighlighted ? ' sw-training-highlight' : '')
      );
      article.dataset.trainingLevel = training.level || 'Beginner';
      article.dataset.trainingId = training.id;

      var cardBody = createEl('div', 'card-body');
      var row = createEl('div', 'row align-items-center');

      var leftCol = createEl('div', 'col-lg-8 mb-3 mb-lg-0');
      var metaRow = createEl('div', 'd-flex flex-wrap align-items-center mb-2');

      metaRow.appendChild(createEl('span', levelBadgeClass(training.level), training.level || 'Beginner'));

      var modeLabel = training.mode === 'In person' ? 'In person · Soroti' : (training.mode || 'In person');
      metaRow.appendChild(createEl('span', 'badge badge-light border mr-2', modeLabel));

      if (enrollment) {
        var badgeInfo = enrollmentBadgeInfo(enrollment.status);
        metaRow.appendChild(createEl('span', badgeInfo.className, badgeInfo.label));
        var payBadge = paymentBadgeInfo(enrollment.payment_status);
        metaRow.appendChild(createEl('span', payBadge.className, payBadge.label));
      } else if (training.is_open === false) {
        metaRow.appendChild(createEl('span', 'badge badge-secondary mr-2', 'Closed'));
      }

      var detailsParts = [];
      if (training.duration) detailsParts.push(training.duration);
      if (typeof training.seats === 'number') detailsParts.push(training.seats + ' seats');
      if (training.start_date) detailsParts.push('Starts ' + formatDate(training.start_date));

      if (detailsParts.length > 0) {
        metaRow.appendChild(createEl('span', 'small text-muted', detailsParts.join(' · ')));
      }

      leftCol.appendChild(metaRow);
      leftCol.appendChild(createEl('h2', 'h4 mb-2', training.title));
      leftCol.appendChild(createEl('p', 'mb-0', training.description));

      var rightCol = createEl('div', 'col-lg-4 text-lg-right');
      rightCol.appendChild(createEl('div', 'h4 text-royal mb-2', formatFeeUgx(training.fee_ugx)));

      if (training.is_open === false) {
        var closedBtn = createEl('button', 'btn btn-secondary btn-sm', 'Applications Closed');
        closedBtn.type = 'button';
        closedBtn.disabled = true;
        rightCol.appendChild(closedBtn);
      } else if (!enrollment) {
        var applyBtn = createEl('button', 'btn btn-primary btn-sm', 'Apply for Training');
        applyBtn.type = 'button';
        applyBtn.dataset.action = 'apply-training';
        applyBtn.dataset.trainingId = training.id;
        applyBtn.addEventListener('click', function () {
          handleApplyClick(training, applyBtn);
        });
        rightCol.appendChild(applyBtn);
      } else if (enrollment.status === 'pending') {
        var actionGroup = createEl('div', 'd-flex flex-wrap justify-content-lg-end align-items-center');
        var payStatus = enrollment.payment_status || 'unpaid';
        if (
          Number(training.fee_ugx || 0) > 0 &&
          payStatus !== 'paid' &&
          payStatus !== 'pending_verification'
        ) {
          var payNowBtn = createEl('button', 'btn btn-primary btn-sm mr-2 mb-1', 'Pay Online');
          payNowBtn.type = 'button';
          payNowBtn.dataset.action = 'pay-training';
          payNowBtn.dataset.trainingId = training.id;
          payNowBtn.addEventListener('click', function () {
            openPayCheckoutForEnrollment(training, enrollment);
          });
          actionGroup.appendChild(payNowBtn);
        }

        var profileLink = createEl('a', 'btn btn-outline-royal btn-sm mr-2 mb-1', 'View in Profile');
        profileLink.href = 'profile.html';

        var cancelBtn = createEl('button', 'btn btn-outline-danger btn-sm mb-1', 'Cancel Application');
        cancelBtn.type = 'button';
        cancelBtn.dataset.action = 'cancel-training';
        cancelBtn.dataset.trainingId = training.id;
        cancelBtn.addEventListener('click', function () {
          handleCancel(training, enrollment, cancelBtn);
        });

        actionGroup.appendChild(profileLink);
        actionGroup.appendChild(cancelBtn);
        rightCol.appendChild(actionGroup);
      } else if (enrollment.status === 'confirmed') {
        var confirmedLink = createEl('a', 'btn btn-success btn-sm', 'Confirmed · My Profile');
        confirmedLink.href = 'profile.html';
        rightCol.appendChild(confirmedLink);
      } else if (enrollment.status === 'cancelled') {
        var reapplyBtn = createEl('button', 'btn btn-outline-royal btn-sm', 'Re-apply for Training');
        reapplyBtn.type = 'button';
        reapplyBtn.dataset.action = 'apply-training';
        reapplyBtn.dataset.trainingId = training.id;
        reapplyBtn.addEventListener('click', function () {
          handleApplyClick(training, reapplyBtn);
        });
        rightCol.appendChild(reapplyBtn);
      }

      row.appendChild(leftCol);
      row.appendChild(rightCol);
      cardBody.appendChild(row);
      article.appendChild(cardBody);
      return article;
    }

    function updateFilterButtons() {
      levelButtons.forEach(function (btn) {
        var isActive = (btn.dataset.level || 'All') === activeLevel;
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-outline-royal', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function renderTrainings() {
      if (!trainingsListEl) return;
      updateFilterButtons();

      var filtered = allTrainings.filter(function (item) {
        return activeLevel === 'All' || item.level === activeLevel;
      });

      if (countLabelEl) {
        countLabelEl.textContent =
          'Showing ' + filtered.length + ' ' + (filtered.length === 1 ? 'course' : 'courses');
      }

      if (filtered.length === 0) {
        var noMatchCard = createEl('div', 'card sw-card mb-4');
        var body = createEl('div', 'card-body py-4 text-center');
        body.appendChild(
          createEl('p', 'text-muted mb-2', 'No ' + activeLevel + ' trainings are currently listed.')
        );
        var resetBtn = createEl('button', 'btn btn-outline-royal btn-sm', 'Show All Levels');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          activeLevel = 'All';
          renderTrainings();
        });
        body.appendChild(resetBtn);
        noMatchCard.appendChild(body);
        trainingsListEl.replaceChildren(noMatchCard);
        return;
      }

      var cards = filtered.map(function (training, idx) {
        var card = buildTrainingCard(training);
        card.classList.add('sw-card-pop');
        card.style.animationDelay = idx * 0.06 + 's';
        return card;
      });
      trainingsListEl.replaceChildren.apply(trainingsListEl, cards);
    }

    levelButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeLevel = btn.dataset.level || 'All';
        renderTrainings();
      });
    });

    roadmapButtons.forEach(function (node) {
      node.addEventListener('click', function () {
        var targetLevel = node.getAttribute('data-roadmap-level') || 'All';
        activeLevel = activeLevel === targetLevel ? 'All' : targetLevel;
        renderTrainings();
      });
    });

    // Render immediately from fallback courses + local enrollments so there is NEVER a loading hang
    renderTrainings();

    // Connect to Supabase on BOTH file:// and http:///https://
    ensureSupabaseClient()
      .then(async function (sb) {
        if (!sb) return;

        var sessionRes = await sb.auth.getSession();
        if (sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
          currentUser = sessionRes.data.session.user;
          var profRes = await sb
            .from('profiles')
            .select('id, full_name, email, phone, organisation, role, created_at')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (profRes && profRes.data) {
            currentProfile = profRes.data;
          }
        }

        var trainRes = await sb
          .from('trainings')
          .select('id, title, description, level, duration, mode, fee_ugx, seats, start_date, is_open, created_at')
          .order('start_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (trainRes && !trainRes.error && Array.isArray(trainRes.data) && trainRes.data.length > 0) {
          var seenIds = new Set();
          var merged = [];
          trainRes.data.forEach(function (t) {
            seenIds.add(t.id);
            merged.push(t);
          });
          FALLBACK_TRAININGS.forEach(function (t) {
            if (!seenIds.has(t.id)) {
              merged.push(t);
            }
          });
          allTrainings = merged;
        }

        if (currentUser) {
          var enrollRes = await sb
            .from('training_enrollments')
            .select('id, training_id, status, payment_status, payment_method, payment_reference, flw_transaction_id, amount_paid_ugx, paid_at, created_at')
            .eq('user_id', currentUser.id);

          if (enrollRes && !enrollRes.error && Array.isArray(enrollRes.data)) {
            enrollmentsByTrainingId.clear();
            enrollRes.data.forEach(function (row) {
              enrollmentsByTrainingId.set(row.training_id, row);
            });
            syncEnrollmentsToLocal();
          }
        }

        renderTrainings();

        if (highlightedTrainingId) {
          var targetTraining = allTrainings.find(function (t) {
            return t.id === highlightedTrainingId;
          });
          if (targetTraining) {
            var existing = enrollmentsByTrainingId.get(targetTraining.id);
            if (payOnLoadTrainingId && existing && existing.status === 'pending' && existing.payment_status !== 'paid') {
              openPayCheckoutForEnrollment(targetTraining, existing);
            } else if (existing) {
              showFeedback(
                'info',
                'You have already applied for "' + targetTraining.title + '" (Status: ' + existing.status + ').',
                { withProfileLink: true }
              );
            } else {
              openApplyForm(targetTraining);
            }
          }
        }
      })
      .catch(function () {});
  });
})();
