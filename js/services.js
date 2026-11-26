/**
 * Services & Packages booking controller for SOROTI WebWorks (services.html).
 * Loaded as a standard script so service tiers, individual offerings, and booking
 * work immediately on both file:// and http:// servers, while syncing client profiles,
 * service orders, and Uganda Mobile Money / card payments into Supabase
 * (public.profiles, public.training_enrollments, public.training_payments).
 * Uses only safe DOM APIs (createElement / textContent) — never innerHTML.
 */

(function () {
  var SUPABASE_ESM_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_PATTERN = /^[+\d\s()-]{7,20}$/;
  var LOCAL_ENROLLMENTS_KEY = 'sw_training_enrollments';
  var LAST_CLIENT_KEY = 'sw_last_registered_client';

  var SERVICE_ORDER = {
    'a1000000-0000-4000-8000-000000000001': 1,
    'a1000000-0000-4000-8000-000000000002': 2,
    'a1000000-0000-4000-8000-000000000003': 3,
    'a2000000-0000-4000-8000-000000000001': 4,
    'a2000000-0000-4000-8000-000000000002': 5,
    'a2000000-0000-4000-8000-000000000003': 6,
    'a2000000-0000-4000-8000-000000000004': 7,
    'a3000000-0000-4000-8000-000000000001': 8,
    'a3000000-0000-4000-8000-000000000002': 9,
    'a3000000-0000-4000-8000-000000000003': 10,
    'a3000000-0000-4000-8000-000000000004': 11,
    'a3000000-0000-4000-8000-000000000005': 12,
    'a4000000-0000-4000-8000-000000000001': 13,
    'a4000000-0000-4000-8000-000000000002': 14,
    'a4000000-0000-4000-8000-000000000003': 15,
    'a4000000-0000-4000-8000-000000000004': 16,
  };

  var FALLBACK_SERVICES = [
    {
      id: 'a1000000-0000-4000-8000-000000000001',
      title: 'Starter Package (1–4 Pages)',
      description:
        '1–4 pages, mobile-responsive design, click-to-call & WhatsApp chat integration, basic on-page SEO, and .com or .ug domain setup. Ideal for startups, clinics, hardware shops, and SMEs in Soroti.',
      level: 'Package',
      duration: '5–7 Days',
      mode: 'Hybrid',
      fee_ugx: 450000,
      is_open: true,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000002',
      title: 'Business Growth Package (Up to 8 Pages)',
      description:
        'Up to 8 custom-designed pages, bespoke Figma UI mockup, Google Business Profile & local SEO setup, news/circulars blog section, and branded corporate emails. Ideal for hotels, clinics, schools, and NGOs.',
      level: 'Package',
      duration: '1–2 Weeks',
      mode: 'Hybrid',
      fee_ugx: 950000,
      is_open: true,
    },
    {
      id: 'a1000000-0000-4000-8000-000000000003',
      title: 'Custom / E-Commerce Package',
      description:
        'Full online storefront or database-backed portal (Supabase / WordPress), MTN MoMo, Airtel Money & card gateway integration, member/inventory workflows, and priority monthly care across Teso & Eastern Uganda.',
      level: 'Package',
      duration: '2–4 Weeks',
      mode: 'Hybrid',
      fee_ugx: 1800000,
      is_open: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000001',
      title: 'Business Brochure Websites (3–6 Pages)',
      description:
        'Fast, mobile-first websites for local clinics, hardware shops, hotels, and law firms—with Home, About, Services, and Contact pages, click-to-call buttons, and direct WhatsApp ordering.',
      level: 'Core Web',
      duration: '5–7 Days',
      mode: 'Hybrid',
      fee_ugx: 450000,
      is_open: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000002',
      title: 'Landing Pages for Promotions & Events',
      description:
        'Single-page, high-converting sites built for promotional campaigns, real estate listings, conference registrations, or seasonal agro-input product launches.',
      level: 'Core Web',
      duration: '3–5 Days',
      mode: 'Online',
      fee_ugx: 250000,
      is_open: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000003',
      title: 'Website Redesigns & Revamps',
      description:
        'Modernizing outdated, slow, or non-mobile-friendly websites for established institutions, secondary schools, SACCOs, and regional NGOs across Eastern Uganda.',
      level: 'Core Web',
      duration: '1–2 Weeks',
      mode: 'Hybrid',
      fee_ugx: 550000,
      is_open: true,
    },
    {
      id: 'a2000000-0000-4000-8000-000000000004',
      title: 'UI/UX Prototyping (Figma)',
      description:
        'Interactive wireframes and high-fidelity visual mockups designed in Figma so clients can preview, test, and approve every screen layout before development begins.',
      level: 'Core Web',
      duration: '3–5 Days',
      mode: 'Online',
      fee_ugx: 220000,
      is_open: true,
    },
    {
      id: 'a3000000-0000-4000-8000-000000000001',
      title: 'Online Stores & Product Catalogs',
      description:
        'Digital storefronts for retail shops, agro-input dealers, and wholesalers—supporting searchable stock catalogs with full checkout or one-tap WhatsApp order routing.',
      level: 'E-Commerce & Apps',
      duration: '2–3 Weeks',
      mode: 'Hybrid',
      fee_ugx: 1200000,
      is_open: true,
    },
    {
      id: 'a3000000-0000-4000-8000-000000000002',
      title: 'Mobile Money & Card Gateways',
      description:
        'Secure integration of Ugandan payment APIs including MTN MoMo, Airtel Money, PesaPal, and card checkouts so schools, associations, and stores collect fees and donations online.',
      level: 'E-Commerce & Apps',
      duration: '4–6 Days',
      mode: 'Online',
      fee_ugx: 400000,
      is_open: true,
    },
    {
      id: 'a3000000-0000-4000-8000-000000000003',
      title: 'School & Institution Portals',
      description:
        'Role-based web portals for secondary schools, tertiary institutes, and vocational centers in Soroti to manage online admissions, student results, fee balances, and announcements.',
      level: 'E-Commerce & Apps',
      duration: '3–4 Weeks',
      mode: 'In person',
      fee_ugx: 1800000,
      is_open: true,
    },
    {
      id: 'a3000000-0000-4000-8000-000000000004',
      title: 'Booking & Reservation Systems',
      description:
        'Automated room booking for hotels and guesthouses, appointment scheduling for private clinics, or table and event hall reservations with instant SMS/email confirmations.',
      level: 'E-Commerce & Apps',
      duration: '2–3 Weeks',
      mode: 'Hybrid',
      fee_ugx: 1400000,
      is_open: true,
    },
    {
      id: 'a3000000-0000-4000-8000-000000000005',
      title: 'Custom Dashboards & Inventory Tools',
      description:
        'Lightweight, database-backed web apps powered by Supabase or Firebase for SACCOs, agricultural cooperatives, and distributors to track member records, stock, and field data.',
      level: 'E-Commerce & Apps',
      duration: '3–4 Weeks',
      mode: 'Hybrid',
      fee_ugx: 1600000,
      is_open: true,
    },
    {
      id: 'a4000000-0000-4000-8000-000000000001',
      title: 'Google Business Profile & Local SEO',
      description:
        'Verification on Google Maps so local customers find you when searching "hotels in Soroti" or "clinics near me," paired with fast load times, local keywords, and structured metadata.',
      level: 'Visibility & Care',
      duration: '2–4 Days',
      mode: 'In person',
      fee_ugx: 180000,
      is_open: true,
    },
    {
      id: 'a4000000-0000-4000-8000-000000000002',
      title: 'Domain Registration, Hosting & Corporate Email',
      description:
        'Managing .co.ug, .ug, or .com domain purchases, HTTPS SSL certificates, reliable cloud hosting, and branded business email accounts such as info@yourbusiness.co.ug.',
      level: 'Visibility & Care',
      duration: '1–2 Days',
      mode: 'Online',
      fee_ugx: 220000,
      is_open: true,
    },
    {
      id: 'a4000000-0000-4000-8000-000000000003',
      title: 'Monthly Care Plans',
      description:
        'Ongoing retainer covering software and security updates, automated cloud backups, 24/7 uptime monitoring, and routine edits like price lists, staff photos, or school circulars.',
      level: 'Visibility & Care',
      duration: 'Monthly',
      mode: 'Online',
      fee_ugx: 120000,
      is_open: true,
    },
    {
      id: 'a4000000-0000-4000-8000-000000000004',
      title: 'Speed & Mobile Data Optimization',
      description:
        'Compressing images, streamlining scripts, and caching assets so business websites load rapidly even on slower 3G and 4G mobile data connections across Eastern Uganda.',
      level: 'Visibility & Care',
      duration: '2–3 Days',
      mode: 'Online',
      fee_ugx: 150000,
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

  function formatFeeUgx(fee) {
    if (fee === 0) return 'Free Consultation';
    if (typeof fee === 'number' && !Number.isNaN(fee)) {
      return 'UGX ' + fee.toLocaleString('en-UG');
    }
    return 'Custom Quote';
  }

  function levelBadgeClass(level) {
    if (level === 'Package') return 'badge badge-success mr-2';
    if (level === 'Core Web') return 'badge badge-primary mr-2';
    if (level === 'E-Commerce & Apps') return 'badge badge-info mr-2';
    if (level === 'Visibility & Care') return 'badge badge-dark mr-2';
    return 'badge badge-secondary mr-2';
  }

  function bookingBadgeInfo(status) {
    if (status === 'confirmed') {
      return { className: 'badge badge-success mr-2', label: 'Order Confirmed' };
    }
    if (status === 'cancelled') {
      return { className: 'badge badge-danger mr-2', label: 'Request Cancelled' };
    }
    return { className: 'badge badge-warning mr-2', label: 'Booking Pending' };
  }

  function paymentBadgeInfo(paymentStatus) {
    if (paymentStatus === 'paid') {
      return { className: 'badge badge-success mr-2', label: 'Paid · Verified' };
    }
    if (paymentStatus === 'pending_verification') {
      return { className: 'badge badge-info mr-2', label: 'Paid (Sandbox / Verifying)' };
    }
    if (paymentStatus === 'pay_on_arrival') {
      return { className: 'badge badge-light border mr-2', label: 'Pay on Consultation' };
    }
    if (paymentStatus === 'failed') {
      return { className: 'badge badge-danger mr-2', label: 'Payment Failed' };
    }
    return { className: 'badge badge-secondary mr-2', label: 'Invoice Unpaid' };
  }

  function formatPaymentChannelLabel(channel) {
    if (!channel) return 'Not selected';
    if (channel.indexOf('mtn') !== -1) return 'MTN Mobile Money (UGX)';
    if (channel.indexOf('airtel') !== -1) return 'Airtel Money (UGX)';
    if (channel === 'mobilemoneyuganda') return 'Uganda Mobile Money';
    if (channel === 'card') return 'Visa / Mastercard';
    if (channel === 'pay_on_arrival') return 'Pay on Consultation (Soroti Office)';
    if (channel === 'flutterwave') return 'Online Payment';
    return String(channel);
  }

  function generateTxRef(service) {
    var shortId = String(service && service.id ? service.id : 'WEB')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-6)
      .toUpperCase();
    return 'SWW-' + shortId + '-' + Date.now();
  }

  function sortServicesList(items) {
    return items.slice().sort(function (a, b) {
      var rankA = SERVICE_ORDER[a.id] || 999;
      var rankB = SERVICE_ORDER[b.id] || 999;
      if (rankA !== rankB) return rankA - rankB;
      return Number(a.fee_ugx || 0) - Number(b.fee_ugx || 0);
    });
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
    var servicesListEl = document.getElementById('trainingsList');
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
    var highlightedServiceId = (params.get('apply') || params.get('pay') || params.get('book') || '').trim();
    var payOnLoadServiceId = (params.get('pay') || '').trim();
    var initialCategory = (params.get('category') || '').trim();
    var activeCategory = initialCategory || 'All';
    var allServices = sortServicesList(FALLBACK_SERVICES);
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
    var ordersByServiceId = new Map();

    // Quick-select package buttons from the Featured Packages section
    document.querySelectorAll('[data-book-service-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-book-service-id') || '';
        var match = allServices.find(function (s) {
          return s.id === id;
        });
        if (match) {
          var existing = ordersByServiceId.get(match.id);
          if (existing && existing.status !== 'cancelled') {
            showOrderSummary(match, existing.applicant || buildApplicantSnapshot(), existing);
          } else {
            openBookingForm(match);
          }
        }
      });
    });

    getSavedLocalEnrollments().forEach(function (row) {
      if (row && row.training_id) {
        ordersByServiceId.set(row.training_id, row);
      }
    });

    function syncOrdersToLocal() {
      var arr = [];
      ordersByServiceId.forEach(function (val) {
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

    function isDemoGatewayKey(key) {
      return !key || String(key).indexOf('SANDBOXDEMOKEY') !== -1;
    }

    function updatePayModeUi() {
      var isDemo = isDemoGatewayKey(flwConfig.publicKey);
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
          ? 'Submit Request & Pay at Office'
          : 'Continue to Payment';
      }
    }

    if (payOptionFlwEl) payOptionFlwEl.addEventListener('change', updatePayModeUi);
    if (payOptionArrivalEl) payOptionArrivalEl.addEventListener('change', updatePayModeUi);

    function showOrderSummary(service, applicant, order) {
      if (!summaryCard) return;
      activeSummaryContext = { service: service, applicant: applicant, order: order };
      var setText = function (id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      var modeLabel = service.mode === 'In person' ? 'In person · Soroti' : (service.mode || 'Hybrid');
      var metaParts = [
        service.level,
        modeLabel,
        service.duration,
        formatFeeUgx(service.fee_ugx),
      ].filter(Boolean);

      var payStatus = (order && order.payment_status) || 'unpaid';
      var payMethod = (order && order.payment_method) || '';
      var payRef = (order && (order.flw_transaction_id || order.payment_reference)) || 'Pending';

      setText('summaryEnrollmentCourse', service.title);
      setText('summaryEnrollmentMeta', metaParts.join(' · '));
      setText('summaryEnrollmentName', applicant.full_name || 'Client');
      setText('summaryEnrollmentEmail', applicant.email || '-');
      setText('summaryEnrollmentPhone', applicant.phone || 'Not provided');
      setText('summaryEnrollmentOrg', applicant.organisation || 'Not provided');
      setText('summaryEnrollmentPaymentMethod', formatPaymentChannelLabel(payMethod));
      setText('summaryEnrollmentPaymentRef', payRef);

      var statusBadge = document.getElementById('summaryEnrollmentStatus');
      if (statusBadge) {
        var info = bookingBadgeInfo((order && order.status) || 'pending');
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
          Number(service.fee_ugx || 0) > 0 &&
          payStatus !== 'paid' &&
          payStatus !== 'pending_verification' &&
          (!order || order.status !== 'cancelled');
        summaryPayNowBtn.classList.toggle('d-none', !canPayOnline);
      }

      if (applyFormCard) applyFormCard.classList.add('d-none');
      summaryCard.classList.remove('d-none');
    }

    function openBookingForm(service) {
      if (!applyFormCard) return;
      if (summaryCard) summaryCard.classList.add('d-none');
      if (applyFormFeedback) applyFormFeedback.classList.add('d-none');

      if (applyTrainingIdInput) applyTrainingIdInput.value = service.id;
      if (applyTargetTitleEl) applyTargetTitleEl.textContent = service.title;
      if (applyCourseFeeDisplayEl) applyCourseFeeDisplayEl.textContent = formatFeeUgx(service.fee_ugx);

      var modeLabel = service.mode === 'In person' ? 'In person · Soroti' : (service.mode || 'Hybrid');
      var metaParts = [
        service.level,
        modeLabel,
        service.duration ? 'Timeline: ' + service.duration : null,
        formatFeeUgx(service.fee_ugx),
      ].filter(Boolean);
      if (applyTargetMetaEl) applyTargetMetaEl.textContent = metaParts.join(' · ');

      if (applySignInLink) {
        var returnPath = 'services.html?apply=' + encodeURIComponent(service.id);
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

    function validateBookingForm() {
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
        orgMsg = 'Business / organisation name cannot exceed 120 characters.';
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

    async function completeOnlinePayment(ctx, payResult) {
      var service = ctx.service;
      var applicant = ctx.applicant;
      var order = ctx.order;
      var txRef = ctx.txRef;
      var transactionId = String((payResult && payResult.transaction_id) || ('SANDBOX-' + Date.now()));
      var channel = String((payResult && payResult.payment_channel) || 'flutterwave');

      order.payment_reference = txRef;
      order.flw_transaction_id = transactionId;
      order.payment_method = channel;
      order.payment_status = 'pending_verification';

      if (supabaseClient && currentUser) {
        try {
          var fnRes = await supabaseClient.functions.invoke('verify-flutterwave-payment', {
            body: {
              enrollment_id: order.id && String(order.id).indexOf('local-') !== 0 ? order.id : null,
              training_id: service.id,
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
              order.status = fnRes.data.status || 'confirmed';
              order.payment_status = 'paid';
              order.amount_paid_ugx = Number(fnRes.data.amount_ugx || service.fee_ugx || 0);
              order.paid_at = fnRes.data.verified_at || new Date().toISOString();
            } else if (fnRes.data.payment_status) {
              order.payment_status = fnRes.data.payment_status;
            }
          }
        } catch (_) {}
      }

      ordersByServiceId.set(service.id, order);
      syncOrdersToLocal();
      renderServices();
      showOrderSummary(service, applicant, order);

      var isVerified = order.payment_status === 'paid';
      showFeedback(
        isVerified ? 'success' : 'info',
        isVerified
          ? 'Payment verified (' + formatFeeUgx(service.fee_ugx) + ') and booking confirmed for "' + service.title + '"! Ref: ' + txRef
          : 'Sandbox payment recorded for "' + service.title + '" (Ref: ' + txRef + '). Live payment gateway keys can be configured for instant settlement.',
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

    function openPaymentCheckoutModal(ctx) {
      stopMomoPolling();
      activeCheckoutContext = ctx;
      if (!flwModalEl) {
        completeOnlinePayment(ctx, { transaction_id: 'SANDBOX-PAY-' + Date.now(), payment_channel: selectedSandboxChannel });
        return;
      }

      var courseEl = document.getElementById('flwModalCourseName');
      var refEl = document.getElementById('flwModalTxRef');
      var amtEl = document.getElementById('flwModalAmount');
      if (courseEl) courseEl.textContent = ctx.service.title;
      if (refEl) refEl.textContent = 'Ref: ' + ctx.txRef;
      if (amtEl) amtEl.textContent = formatFeeUgx(ctx.service.fee_ugx);
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
          enrollment_id: ctx.order.id && String(ctx.order.id).indexOf('local-') !== 0 ? ctx.order.id : null,
          training_id: ctx.service.id,
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
        ctx.order.status = fnRes.data.status || 'confirmed';
        ctx.order.payment_status = 'paid';
        ctx.order.payment_method = fnRes.data.payment_channel || ctx.pendingChannel || selectedSandboxChannel;
        ctx.order.payment_reference = ctx.txRef;
        ctx.order.flw_transaction_id = fnRes.data.flw_transaction_id || ctx.pendingTxId;
        ctx.order.amount_paid_ugx = Number(fnRes.data.amount_ugx || ctx.service.fee_ugx || 0);
        ctx.order.paid_at = fnRes.data.verified_at || new Date().toISOString();
        ordersByServiceId.set(ctx.service.id, ctx.order);
        syncOrdersToLocal();
        setModalVisibility(false);
        renderServices();
        showOrderSummary(ctx.service, ctx.applicant, ctx.order);
        showFeedback(
          'success',
          'Payment verified (' + formatFeeUgx(ctx.service.fee_ugx) + ') and booking confirmed for "' + ctx.service.title + '"! Ref: ' + ctx.txRef,
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
        await completeOnlinePayment(ctx, {
          transaction_id: 'SANDBOX-PAY-' + Date.now(),
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
          if (!isDemoGatewayKey(flwConfig.publicKey) && typeof window.FlutterwaveCheckout === 'function') {
            setModalVisibility(false);
            window.FlutterwaveCheckout({
              public_key: flwConfig.publicKey,
              tx_ref: ctx.txRef,
              amount: Number(ctx.service.fee_ugx || 0),
              currency: flwConfig.currency || 'UGX',
              payment_options: 'card, mobilemoneyuganda',
              customer: {
                email: ctx.applicant.email,
                phone_number: ctx.applicant.phone || '',
                name: ctx.applicant.full_name,
              },
              customizations: {
                title: 'SOROTI WebWorks',
                description: ctx.service.title + ' · Service Fee',
              },
              callback: function (data) {
                completeOnlinePayment(ctx, {
                  transaction_id: data && data.transaction_id ? String(data.transaction_id) : '',
                  payment_channel: 'card',
                });
              },
              onclose: function () {
                renderServices();
              },
            });
            return;
          }

          flwConfirmSandboxBtn.disabled = true;
          flwConfirmSandboxBtn.textContent = 'Processing...';
          await completeOnlinePayment(ctx, {
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
                training_id: ctx.service.id,
                enrollment_id: ctx.order.id && String(ctx.order.id).indexOf('local-') !== 0 ? ctx.order.id : null,
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
              'No live Mobile Money API key is configured on Supabase yet, so a real USSD prompt could not be sent to ' +
              phoneEntered +
              '. Add your live gateway secret in Supabase Edge Function Secrets to enable real phone prompts, or click Run Sandbox Test below.';
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
        ctx.order.payment_status = 'pay_on_arrival';
        ctx.order.payment_method = 'pay_on_arrival';
        if (supabaseClient && currentUser && ctx.order.id && String(ctx.order.id).indexOf('local-') !== 0) {
          await supabaseClient
            .from('training_enrollments')
            .update({ payment_status: 'pay_on_arrival', payment_method: 'pay_on_arrival', payment_reference: ctx.txRef })
            .eq('id', ctx.order.id)
            .eq('user_id', currentUser.id);
        }
        ordersByServiceId.set(ctx.service.id, ctx.order);
        syncOrdersToLocal();
        setModalVisibility(false);
        renderServices();
        showOrderSummary(ctx.service, ctx.applicant, ctx.order);
        showFeedback(
          'info',
          'Project request saved for "' + ctx.service.title + '". Settle at Plot 14, Gweri Road or click Pay Online anytime.',
          { withProfileLink: true }
        );
      });
    }

    async function submitBookingForUser(service, buttonEl, applicantOverride, providedPassword, paymentChoice) {
      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = 'Processing...';
      }

      var chosenMode = paymentChoice === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave';
      var txRef = generateTxRef(service);

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

      var existing = ordersByServiceId.get(service.id);
      if (existing && existing.status === 'cancelled' && supabaseClient && currentUser) {
        await supabaseClient
          .from('training_enrollments')
          .delete()
          .eq('id', existing.id)
          .eq('user_id', currentUser.id);
        ordersByServiceId.delete(service.id);
      }

      var initialPayStatus = chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'unpaid';
      var recordedRow = null;

      if (supabaseClient && currentUser) {
        var res = await supabaseClient
          .from('training_enrollments')
          .insert({
            user_id: currentUser.id,
            training_id: service.id,
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
          showFeedback('danger', 'Could not submit service booking: ' + res.error.message);
          return;
        }

        if (res.error && res.error.code === '23505') {
          var dupRes = await supabaseClient
            .from('training_enrollments')
            .select('id, training_id, status, payment_status, payment_method, payment_reference, flw_transaction_id, amount_paid_ugx, paid_at, created_at')
            .eq('user_id', currentUser.id)
            .eq('training_id', service.id)
            .maybeSingle();
          recordedRow = dupRes && dupRes.data ? dupRes.data : null;
        } else if (!res.error && res.data) {
          recordedRow = res.data;
        }

        if (!recordedRow) {
          recordedRow = {
            id: 'local-' + Date.now(),
            user_id: currentUser.id,
            training_id: service.id,
            status: 'pending',
            payment_status: initialPayStatus,
            payment_method: chosenMode,
            payment_reference: txRef,
            amount_paid_ugx: 0,
            created_at: new Date().toISOString(),
          };
        }

        if (recordedRow.id && String(recordedRow.id).indexOf('local-') !== 0) {
          try {
            await supabaseClient.from('training_payments').insert({
              enrollment_id: recordedRow.id,
              user_id: currentUser.id,
              training_id: service.id,
              tx_ref: txRef,
              provider: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave',
              payment_channel: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'flutterwave',
              amount_ugx: Number(service.fee_ugx || 0),
              currency: flwConfig.currency || 'UGX',
              status: chosenMode === 'pay_on_arrival' ? 'pay_on_arrival' : 'initiated',
              mode: chosenMode === 'pay_on_arrival' ? 'offline' : (isDemoGatewayKey(flwConfig.publicKey) ? 'sandbox' : 'live'),
              payer_name: applicant.full_name,
              payer_email: applicant.email,
              payer_phone: applicant.phone || null,
            });
          } catch (_) {}
        }

        recordedRow.applicant = applicant;
        recordedRow.trainings = service;
        ordersByServiceId.set(service.id, recordedRow);
        syncOrdersToLocal();
      } else {
        recordedRow = {
          id: 'local-' + Date.now(),
          user_id: applicant.id || null,
          training_id: service.id,
          status: 'pending',
          payment_status: initialPayStatus,
          payment_method: chosenMode,
          payment_reference: txRef,
          amount_paid_ugx: 0,
          created_at: new Date().toISOString(),
          applicant: applicant,
          trainings: service,
        };
        ordersByServiceId.set(service.id, recordedRow);
        syncOrdersToLocal();
      }

      if (highlightedServiceId === service.id) {
        highlightedServiceId = '';
      }

      renderServices();

      if (chosenMode === 'flutterwave' && Number(service.fee_ugx || 0) > 0) {
        if (applyFormCard) applyFormCard.classList.add('d-none');
        openPaymentCheckoutModal({
          service: service,
          applicant: applicant,
          order: recordedRow,
          txRef: txRef,
        });
        return;
      }

      showOrderSummary(service, applicant, recordedRow);
      showFeedback(
        'success',
        'Service request submitted for "' +
          service.title +
          '" (Ref: ' +
          txRef +
          '). Pay during your consultation at Plot 14, Gweri Road or click Pay Online anytime.',
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

    function openPayCheckoutForOrder(service, order) {
      var applicant = (order && order.applicant) || buildApplicantSnapshot();
      var txRef = generateTxRef(service);
      openPaymentCheckoutModal({
        service: service,
        applicant: applicant,
        order: order,
        txRef: txRef,
      });
    }

    async function handleCancel(service, order, buttonEl) {
      if (!order) return;

      if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = 'Cancelling...';
      }

      if (supabaseClient && currentUser && order.id && String(order.id).indexOf('local-') !== 0) {
        var res = await supabaseClient
          .from('training_enrollments')
          .delete()
          .eq('id', order.id)
          .eq('user_id', currentUser.id);

        if (res.error) {
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.textContent = 'Cancel Request';
          }
          showFeedback('danger', 'Could not cancel request: ' + res.error.message);
          return;
        }
      }

      ordersByServiceId.delete(service.id);
      syncOrdersToLocal();
      if (summaryCard) summaryCard.classList.add('d-none');
      renderServices();
      showFeedback(
        'info',
        'Your request for "' + service.title + '" has been cancelled. You can re-book anytime.'
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
        openPayCheckoutForOrder(activeSummaryContext.service, activeSummaryContext.order);
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
        if (el) el.addEventListener('blur', validateBookingForm);
      });

      applyForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!validateBookingForm()) {
          var firstInvalid = applyForm.querySelector('.is-invalid');
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        var targetId = applyTrainingIdInput ? applyTrainingIdInput.value : '';
        var service =
          allServices.find(function (s) {
            return s.id === targetId;
          }) || allServices[0];
        if (!service) return;

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

        await submitBookingForUser(service, applySubmitBtn, applicant, rawPassword, paymentChoice);
        if (applySubmitBtn) {
          applySubmitBtn.disabled = false;
          updatePayModeUi();
        }
      });
    }

    function buildServiceCard(service) {
      var order = ordersByServiceId.get(service.id) || null;
      var isHighlighted = highlightedServiceId && highlightedServiceId === service.id;

      var article = createEl(
        'article',
        'card sw-card mb-3' + (isHighlighted ? ' sw-training-highlight' : '')
      );
      article.dataset.trainingLevel = service.level || 'Core Web';
      article.dataset.trainingId = service.id;

      var cardBody = createEl('div', 'card-body');
      var row = createEl('div', 'row align-items-center');

      var leftCol = createEl('div', 'col-lg-8 mb-3 mb-lg-0');
      var metaRow = createEl('div', 'd-flex flex-wrap align-items-center mb-2');

      metaRow.appendChild(createEl('span', levelBadgeClass(service.level), service.level || 'Core Web'));

      var modeLabel = service.mode === 'In person' ? 'In person · Soroti' : (service.mode || 'Hybrid');
      metaRow.appendChild(createEl('span', 'badge badge-light border mr-2', modeLabel));

      if (order) {
        var badgeInfo = bookingBadgeInfo(order.status);
        metaRow.appendChild(createEl('span', badgeInfo.className, badgeInfo.label));
        var payBadge = paymentBadgeInfo(order.payment_status);
        metaRow.appendChild(createEl('span', payBadge.className, payBadge.label));
      }

      if (service.duration) {
        metaRow.appendChild(createEl('span', 'small text-muted', 'Delivery: ' + service.duration));
      }

      leftCol.appendChild(metaRow);
      leftCol.appendChild(createEl('h2', 'h4 mb-2', service.title));
      leftCol.appendChild(createEl('p', 'mb-0', service.description));

      var rightCol = createEl('div', 'col-lg-4 text-lg-right');
      rightCol.appendChild(createEl('div', 'h4 text-royal mb-2', formatFeeUgx(service.fee_ugx)));

      if (!order) {
        var bookLabel = service.level === 'Package' ? 'Choose Package' : 'Book This Service';
        var bookBtn = createEl('button', 'btn btn-primary btn-sm', bookLabel);
        bookBtn.type = 'button';
        bookBtn.dataset.action = 'book-service';
        bookBtn.dataset.trainingId = service.id;
        bookBtn.addEventListener('click', function () {
          openBookingForm(service);
        });
        rightCol.appendChild(bookBtn);
      } else if (order.status === 'pending') {
        var actionGroup = createEl('div', 'd-flex flex-wrap justify-content-lg-end align-items-center');
        var payStatus = order.payment_status || 'unpaid';
        if (
          Number(service.fee_ugx || 0) > 0 &&
          payStatus !== 'paid' &&
          payStatus !== 'pending_verification'
        ) {
          var payNowBtn = createEl('button', 'btn btn-primary btn-sm mr-2 mb-1', 'Pay Online');
          payNowBtn.type = 'button';
          payNowBtn.dataset.action = 'pay-service';
          payNowBtn.dataset.trainingId = service.id;
          payNowBtn.addEventListener('click', function () {
            openPayCheckoutForOrder(service, order);
          });
          actionGroup.appendChild(payNowBtn);
        }

        var profileLink = createEl('a', 'btn btn-outline-royal btn-sm mr-2 mb-1', 'View in Profile');
        profileLink.href = 'profile.html';

        var cancelBtn = createEl('button', 'btn btn-outline-danger btn-sm mb-1', 'Cancel Request');
        cancelBtn.type = 'button';
        cancelBtn.dataset.action = 'cancel-service';
        cancelBtn.dataset.trainingId = service.id;
        cancelBtn.addEventListener('click', function () {
          handleCancel(service, order, cancelBtn);
        });

        actionGroup.appendChild(profileLink);
        actionGroup.appendChild(cancelBtn);
        rightCol.appendChild(actionGroup);
      } else if (order.status === 'confirmed') {
        var confirmedLink = createEl('a', 'btn btn-success btn-sm', 'Confirmed · My Profile');
        confirmedLink.href = 'profile.html';
        rightCol.appendChild(confirmedLink);
      } else if (order.status === 'cancelled') {
        var rebookBtn = createEl('button', 'btn btn-outline-royal btn-sm', 'Re-book Service');
        rebookBtn.type = 'button';
        rebookBtn.dataset.action = 'book-service';
        rebookBtn.dataset.trainingId = service.id;
        rebookBtn.addEventListener('click', function () {
          openBookingForm(service);
        });
        rightCol.appendChild(rebookBtn);
      }

      row.appendChild(leftCol);
      row.appendChild(rightCol);
      cardBody.appendChild(row);
      article.appendChild(cardBody);
      return article;
    }

    function updateFilterButtons() {
      levelButtons.forEach(function (btn) {
        var isActive = (btn.dataset.level || 'All') === activeCategory;
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-outline-royal', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function renderServices() {
      if (!servicesListEl) return;
      updateFilterButtons();

      var filtered = allServices.filter(function (item) {
        return activeCategory === 'All' || item.level === activeCategory;
      });

      if (countLabelEl) {
        countLabelEl.textContent =
          'Showing ' + filtered.length + ' ' + (filtered.length === 1 ? 'service' : 'services');
      }

      if (filtered.length === 0) {
        var noMatchCard = createEl('div', 'card sw-card mb-4');
        var body = createEl('div', 'card-body py-4 text-center');
        body.appendChild(
          createEl('p', 'text-muted mb-2', 'No services found in "' + activeCategory + '" right now.')
        );
        var resetBtn = createEl('button', 'btn btn-outline-royal btn-sm', 'Show All Categories');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          activeCategory = 'All';
          renderServices();
        });
        body.appendChild(resetBtn);
        noMatchCard.appendChild(body);
        servicesListEl.replaceChildren(noMatchCard);
        return;
      }

      var cards = filtered.map(function (service, idx) {
        var card = buildServiceCard(service);
        card.classList.add('sw-card-pop');
        card.style.animationDelay = idx * 0.05 + 's';
        return card;
      });
      servicesListEl.replaceChildren.apply(servicesListEl, cards);
    }

    levelButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeCategory = btn.dataset.level || 'All';
        renderServices();
      });
    });

    roadmapButtons.forEach(function (node) {
      node.addEventListener('click', function () {
        var targetLevel = node.getAttribute('data-roadmap-level') || 'All';
        activeCategory = activeCategory === targetLevel ? 'All' : targetLevel;
        renderServices();
      });
    });

    // Render immediately from fallback packages & services
    renderServices();

    // Sync with live Supabase data
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

        var svcRes = await sb
          .from('trainings')
          .select('id, title, description, level, duration, mode, fee_ugx, seats, start_date, is_open, created_at')
          .eq('is_open', true)
          .order('created_at', { ascending: true });

        if (svcRes && !svcRes.error && Array.isArray(svcRes.data) && svcRes.data.length > 0) {
          var seenIds = new Set();
          var merged = [];
          svcRes.data.forEach(function (s) {
            seenIds.add(s.id);
            merged.push(s);
          });
          FALLBACK_SERVICES.forEach(function (s) {
            if (!seenIds.has(s.id)) {
              merged.push(s);
            }
          });
          allServices = sortServicesList(merged);
        }

        if (currentUser) {
          var orderRes = await sb
            .from('training_enrollments')
            .select('id, training_id, status, payment_status, payment_method, payment_reference, flw_transaction_id, amount_paid_ugx, paid_at, created_at')
            .eq('user_id', currentUser.id);

          if (orderRes && !orderRes.error && Array.isArray(orderRes.data)) {
            ordersByServiceId.clear();
            orderRes.data.forEach(function (row) {
              ordersByServiceId.set(row.training_id, row);
            });
            syncOrdersToLocal();
          }
        }

        renderServices();

        if (highlightedServiceId) {
          var targetService = allServices.find(function (s) {
            return s.id === highlightedServiceId;
          });
          if (targetService) {
            var existing = ordersByServiceId.get(targetService.id);
            if (payOnLoadServiceId && existing && existing.status === 'pending' && existing.payment_status !== 'paid') {
              openPayCheckoutForOrder(targetService, existing);
            } else if (existing) {
              showFeedback(
                'info',
                'You already have an active request for "' + targetService.title + '" (Status: ' + existing.status + ').',
                { withProfileLink: true }
              );
            } else {
              openBookingForm(targetService);
            }
          }
        }
      })
      .catch(function () {});
  });
})();
