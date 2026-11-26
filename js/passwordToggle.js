/**
 * Password visibility toggle handler (zero external/CDN dependencies).
 * Works immediately regardless of CDN speed, network availability, or protocol.
 */
(function () {
  function initPasswordToggles() {
    var buttons = document.querySelectorAll('[data-toggle-password]');
    buttons.forEach(function (btn) {
      if (btn.dataset.toggleBound === 'true') return;
      btn.dataset.toggleBound = 'true';

      var targetId = btn.getAttribute('data-toggle-password');
      var input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      var showLabel = btn.getAttribute('data-show-label') || 'Show password';
      var hideLabel = btn.getAttribute('data-hide-label') || 'Hide password';

      btn.setAttribute('title', showLabel);

      btn.addEventListener('click', function () {
        var isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';

        btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        btn.setAttribute('aria-label', isHidden ? hideLabel : showLabel);
        btn.setAttribute('title', isHidden ? hideLabel : showLabel);
        btn.classList.toggle('is-visible', isHidden);

        var icon = btn.querySelector('i');
        if (icon) {
          icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggles);
  } else {
    initPasswordToggles();
  }
})();
