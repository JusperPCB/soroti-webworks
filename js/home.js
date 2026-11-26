/**
 * Home page controller for SOROTI WebWorks (index.html).
 * Drives the interactive Kahawa Connect EUDR field-to-cloud telemetry animation,
 * Busitema-style hero carousel transitions (gold arrows & dots), and scroll-reveal choreography.
 * Uses only safe DOM APIs (textContent / classList / setAttribute) — never innerHTML.
 */

(function () {
  var STAGES = [
    {
      badge: 'STAGE 1 · OFFLINE GPS CAPTURE',
      metric: '0.84 ha · Plot #SRT-204',
      caption:
        'Capturing 6 farm boundary GPS points into offline SQLite (Drift) storage with zero mobile data required.',
      heroBgImage: 'assets/hero-slide-smart-systems.jpg',
      heroEyebrow: 'Soroti City East · Eastern Uganda',
      heroTitle: 'Custom Websites, E-Commerce Stores & Connected Portals for Soroti',
      heroLeadParts: [
        { text: 'SOROTI WebWorks designs fast, mobile-first websites, school and SACCO portals, and Mobile Money e-commerce platforms for SMEs across Soroti and the Teso sub-region, alongside offline-first research systems from ' },
        { text: 'Kahawa Connect', strong: true },
        { text: '.' },
      ],
      heroCaption: 'Slide 1 of 4 · Websites, E-Commerce & Portals for Soroti Businesses',
      primaryCta: { label: 'Explore Web Services', href: 'services.html', icon: 'fas fa-layer-group mr-2' },
      secondaryCta: { label: 'View Projects Completed', href: 'projects.html', icon: 'fas fa-folder-open mr-2' },
    },
    {
      badge: 'STAGE 2 · ON-DEVICE LEAF ML SCAN',
      metric: '98.4% Confidence · 140 ms',
      caption:
        'Running local TensorFlow Lite leaf diagnosis for Coffee Leaf Rust & Berry Disease directly on Android.',
      heroBgImage: 'assets/hero-slide-coffee-cherries.jpg',
      heroEyebrow: 'Kahawa Connect · On-Device AI Diagnostics',
      heroTitle: 'Offline Coffee Leaf Disease Scanning & Agronomy Guidance for Ugandan Farmers',
      heroLeadParts: [
        { text: 'Empowering smallholder coffee farmers and cooperative extension agents to detect Coffee Leaf Rust and Berry Disease in 140 ms using ' },
        { text: 'TensorFlow Lite', strong: true },
        { text: ' on Android without uploading photos or using mobile bundles.' },
      ],
      heroCaption: 'Slide 2 of 4 · Coffee Leaf Rust & Berry Disease AI Diagnostics',
      primaryCta: { label: 'Explore Leaf ML Architecture', href: 'projects.html#kahawa-connect', icon: 'fas fa-microchip mr-2' },
      secondaryCta: { label: 'View Service Packages', href: 'services.html#packages', icon: 'fas fa-tags mr-2' },
    },
    {
      badge: 'STAGE 3 · SENTINEL-2 EUDR CHECK',
      metric: '0% Deforestation · Post-2020',
      caption:
        'Verifying mapped coffee polygon against Dec 2020 satellite forest baseline via Google Earth Engine.',
      heroBgImage: 'assets/hero-slide-eudr-plantation.jpg',
      heroEyebrow: 'EU Regulation 2023/1115 · Geospatial Traceability',
      heroTitle: 'Deforestation-Free GPS Plot Verification with Sentinel-2 & PostGIS',
      heroLeadParts: [
        { text: 'Cross-checking mapped coffee farm boundaries against post-2020 ' },
        { text: 'Sentinel-2 & PostGIS', strong: true },
        { text: ' forest baselines so Ugandan cooperatives can generate verifiable European Union Due Diligence Statements (DDS).' },
      ],
      heroCaption: 'Slide 3 of 4 · Sentinel-2 Satellite Plot Map & EUDR Verification',
      primaryCta: { label: 'View EUDR Traceability Study', href: 'projects.html#kahawa-connect', icon: 'fas fa-globe-africa mr-2' },
      secondaryCta: { label: 'Contact Our Engineering Desk', href: 'contact.html', icon: 'fas fa-envelope mr-2' },
    },
    {
      badge: 'STAGE 4 · SUPABASE & EU DDS SYNC',
      metric: 'GeoJSON + DDS Verified',
      caption:
        'Syncing queued farmer records and EUDR Due Diligence evidence to cooperative cloud when network returns.',
      heroBgImage: 'assets/hero-slide-web-dashboard.jpg',
      heroEyebrow: 'Plot 14, Gweri Road · Full-Stack Web Design Agency',
      heroTitle: 'Starter Websites, E-Commerce Stores & Mobile Money Integrations for Teso SMEs',
      heroLeadParts: [
        { text: 'From Starter brochures and Google Business SEO to ' },
        { text: 'MTN MoMo, Airtel Money & Supabase Portals', strong: true },
        { text: '—structured in clear UGX packages for clinics, hotels, schools, SACCOs, and agricultural cooperatives.' },
      ],
      heroCaption: 'Slide 4 of 4 · Soroti Web Design Packages & Local SEO',
      primaryCta: { label: 'Explore Packages & Pricing', href: 'services.html#packages', icon: 'fas fa-tags mr-2' },
      secondaryCta: { label: 'Book a Studio Consultation', href: 'contact.html', icon: 'fas fa-calendar-check mr-2' },
    },
  ];

  var CYCLE_MS = 3600;

  document.addEventListener('DOMContentLoaded', function () {
    var statusEl = document.getElementById('homeResearchSyncNote');
    if (statusEl) {
      statusEl.textContent = 'Live EUDR field-to-cloud architecture · Synced with SOROTI WebWorks portfolio';
    }

    var visualizer = document.getElementById('kahawaLiveVisualizer');
    var badgeTextEl = document.getElementById('swTelemetryBadgeText');
    var metricEl = document.getElementById('swTelemetryMetric');
    var captionEl = document.getElementById('swTelemetryCaption');
    var progressBarEl = document.getElementById('swTelemetryProgressBar');
    var stepButtons = document.querySelectorAll('[data-telemetry-step]');
    var pauseBtn = document.getElementById('swTelemetryToggleBtn');
    var heroSectionEl = document.getElementById('swHeroSection');
    var bgImage = document.getElementById('swHeroBgImage');

    var heroSlideWrap = document.getElementById('swHeroSlideContent');
    var heroEyebrowEl = document.getElementById('swHeroSlideEyebrow');
    var heroTitleEl = document.getElementById('swHeroSlideTitle');
    var heroLeadEl = document.getElementById('swHeroSlideLead');
    var heroCaptionTextEl = document.getElementById('swHeroCaptionText');
    var primaryCtaEl = document.getElementById('swHeroPrimaryCta');
    var primaryCtaIconEl = document.getElementById('swHeroPrimaryCtaIcon');
    var primaryCtaTextEl = document.getElementById('swHeroPrimaryCtaText');
    var secondaryCtaEl = document.getElementById('swHeroSecondaryCta');
    var secondaryCtaIconEl = document.getElementById('swHeroSecondaryCtaIcon');
    var secondaryCtaTextEl = document.getElementById('swHeroSecondaryCtaText');
    var heroPrevBtn = document.getElementById('swHeroPrevBtn');
    var heroNextBtn = document.getElementById('swHeroNextBtn');
    var heroDots = document.querySelectorAll('[data-hero-dot]');

    var currentStage = 0;
    var isPaused = false;
    var timerId = null;
    var switchTimerId = null;

    function restartProgressAnimation() {
      if (!progressBarEl) return;
      progressBarEl.style.animation = 'none';
      void progressBarEl.offsetWidth;
      progressBarEl.style.animation = '';
    }

    function renderHeroLead(parts) {
      if (!heroLeadEl || !Array.isArray(parts)) return;
      var nodes = parts.map(function (part) {
        if (part.strong) {
          var strongEl = document.createElement('strong');
          strongEl.textContent = part.text;
          return strongEl;
        }
        return document.createTextNode(part.text);
      });
      heroLeadEl.replaceChildren.apply(heroLeadEl, nodes);
    }

    function renderHeroContent(stage) {
      if (heroEyebrowEl) heroEyebrowEl.textContent = stage.heroEyebrow;
      if (heroTitleEl) heroTitleEl.textContent = stage.heroTitle;
      renderHeroLead(stage.heroLeadParts);
      if (heroCaptionTextEl) heroCaptionTextEl.textContent = stage.heroCaption;
      if (primaryCtaEl && primaryCtaTextEl && stage.primaryCta) {
        primaryCtaEl.setAttribute('href', stage.primaryCta.href);
        primaryCtaTextEl.textContent = stage.primaryCta.label;
        if (primaryCtaIconEl) primaryCtaIconEl.className = stage.primaryCta.icon;
      }
      if (secondaryCtaEl && secondaryCtaTextEl && stage.secondaryCta) {
        secondaryCtaEl.setAttribute('href', stage.secondaryCta.href);
        secondaryCtaTextEl.textContent = stage.secondaryCta.label;
        if (secondaryCtaIconEl) secondaryCtaIconEl.className = stage.secondaryCta.icon;
      }
    }

    function applyStage(index, updateHeroCopy, immediate) {
      currentStage = ((index % STAGES.length) + STAGES.length) % STAGES.length;
      var stage = STAGES[currentStage];

      if (visualizer) {
        visualizer.setAttribute('data-stage', String(currentStage));
      }
      if (badgeTextEl) {
        badgeTextEl.textContent = stage.badge;
      }
      if (metricEl) {
        metricEl.textContent = stage.metric;
      }
      if (captionEl) {
        captionEl.textContent = stage.caption;
      }

      if (heroSectionEl) {
        var useSlideImage = Boolean(stage.heroBgImage);
        heroSectionEl.classList.toggle('has-slide-image', useSlideImage);
        if (useSlideImage && bgImage && bgImage.getAttribute('src') !== stage.heroBgImage) {
          bgImage.setAttribute('src', stage.heroBgImage);
        }
      }

      stepButtons.forEach(function (btn, idx) {
        var active = idx === currentStage;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      heroDots.forEach(function (dot, idx) {
        var active = idx === currentStage;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      if (updateHeroCopy && heroTitleEl && heroEyebrowEl && heroLeadEl) {
        if (switchTimerId !== null) {
          window.clearTimeout(switchTimerId);
          switchTimerId = null;
        }
        if (immediate) {
          renderHeroContent(stage);
          if (heroSlideWrap) heroSlideWrap.classList.remove('is-switching');
        } else {
          if (heroSlideWrap) heroSlideWrap.classList.add('is-switching');
          switchTimerId = window.setTimeout(function () {
            renderHeroContent(stage);
            if (heroSlideWrap) heroSlideWrap.classList.remove('is-switching');
            switchTimerId = null;
          }, 140);
        }
      }

      restartProgressAnimation();
    }

    function startCycle() {
      stopCycle();
      if (isPaused) return;
      timerId = window.setInterval(function () {
        applyStage(currentStage + 1, true, false);
      }, CYCLE_MS);
    }

    function stopCycle() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    stepButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetIdx = parseInt(btn.getAttribute('data-telemetry-step') || '0', 10);
        applyStage(targetIdx, true, false);
        if (!isPaused) {
          startCycle();
        }
      });
    });

    heroDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var targetIdx = parseInt(dot.getAttribute('data-hero-dot') || '0', 10);
        applyStage(targetIdx, true, false);
        if (!isPaused) {
          startCycle();
        }
      });
    });

    if (heroPrevBtn) {
      heroPrevBtn.addEventListener('click', function () {
        applyStage(currentStage - 1, true, false);
        if (!isPaused) startCycle();
      });
    }

    if (heroNextBtn) {
      heroNextBtn.addEventListener('click', function () {
        applyStage(currentStage + 1, true, false);
        if (!isPaused) startCycle();
      });
    }

    if (pauseBtn && visualizer) {
      pauseBtn.addEventListener('click', function () {
        isPaused = !isPaused;
        visualizer.classList.toggle('is-paused', isPaused);
        pauseBtn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
        pauseBtn.setAttribute(
          'aria-label',
          isPaused ? 'Resume live telemetry animation' : 'Pause live telemetry animation'
        );
        var icon = pauseBtn.querySelector('i');
        if (icon) {
          icon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
        }
        if (isPaused) {
          stopCycle();
        } else {
          startCycle();
        }
      });
    }

    applyStage(0, true, true);
    startCycle();

    // Scroll-reveal animation for sections below the fold
    var revealTargets = document.querySelectorAll(
      '.sw-section .sw-card, .sw-service-row, .sw-busitema-fact-card, .sw-impact-card, .sw-bento-card'
    );
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
        { threshold: 0.1 }
      );

      revealTargets.forEach(function (el) {
        el.classList.add('sw-reveal');
        observer.observe(el);
      });
    }
  });
})();
