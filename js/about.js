/**
 * About page controller for SOROTI WebWorks (about.html).
 */

document.addEventListener('DOMContentLoaded', () => {
  // Ensures accessible focus management when jumping to sections
  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
});
