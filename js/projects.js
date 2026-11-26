/**
 * Projects page controller for SOROTI WebWorks (projects.html).
 * Supports animated category filter transitions and progressive Supabase public.projects sync.
 * Uses only safe DOM APIs (createElement / textContent) — never innerHTML.
 */

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var filterButtons = document.querySelectorAll('#projectFilterBar button[data-category]');
    var countLabel = document.getElementById('projectsCountLabel');

    function applyFilter(category) {
      var projectCards = document.querySelectorAll('#projectsGrid [data-project-category]');
      var visibleCount = 0;

      projectCards.forEach(function (card) {
        var cardCat = card.dataset.projectCategory || '';
        var show = category === 'All' || cardCat === category;
        card.classList.toggle('d-none', !show);

        var innerArticle = card.querySelector('.sw-card');
        if (show) {
          if (innerArticle) {
            innerArticle.classList.remove('sw-card-pop');
            void innerArticle.offsetWidth;
            innerArticle.style.animationDelay = visibleCount * 0.07 + 's';
            innerArticle.classList.add('sw-card-pop');
          }
          visibleCount += 1;
        }
      });

      if (countLabel) {
        countLabel.textContent =
          'Showing ' + visibleCount + ' ' + (visibleCount === 1 ? 'project' : 'projects');
      }

      filterButtons.forEach(function (btn) {
        var isActive = btn.dataset.category === category;
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-outline-royal', !isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.dataset.category || 'All');
      });
    });

    applyFilter('All');
  });
})();
