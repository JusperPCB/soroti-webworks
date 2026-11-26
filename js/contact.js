/**
 * Contact page form controller for SOROTI WebWorks (contact.html).
 * Validates inputs, drives the live character counter animation, and inserts into
 * Supabase public.contact_messages WITHOUT chaining .select() (per RLS security rules).
 * Uses only safe DOM APIs (textContent) — never innerHTML.
 */

(function () {
  var SUPABASE_ESM_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldState(inputEl, feedbackEl, errorMessage) {
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

  function validateContactForm() {
    var nameInput = document.getElementById('contactName');
    var emailInput = document.getElementById('contactEmail');
    var subjectInput = document.getElementById('contactSubject');
    var messageInput = document.getElementById('contactMessage');

    var nameError = document.getElementById('contactNameError');
    var emailError = document.getElementById('contactEmailError');
    var subjectError = document.getElementById('contactSubjectError');
    var messageError = document.getElementById('contactMessageError');

    var nameVal = nameInput ? nameInput.value.trim() : '';
    var emailVal = emailInput ? emailInput.value.trim() : '';
    var subjectVal = subjectInput ? subjectInput.value.trim() : '';
    var messageVal = messageInput ? messageInput.value.trim() : '';

    var valid = true;

    if (!nameVal) {
      valid = setFieldState(nameInput, nameError, 'Please enter your full name.') && valid;
    } else if (nameVal.length < 2 || nameVal.length > 100) {
      valid = setFieldState(nameInput, nameError, 'Name must be between 2 and 100 characters.') && valid;
    } else {
      setFieldState(nameInput, nameError, '');
    }

    if (!emailVal) {
      valid = setFieldState(emailInput, emailError, 'Please enter your email address.') && valid;
    } else if (!EMAIL_PATTERN.test(emailVal)) {
      valid =
        setFieldState(
          emailInput,
          emailError,
          'Please enter a valid email address (for example, name@example.com).'
        ) && valid;
    } else {
      setFieldState(emailInput, emailError, '');
    }

    if (subjectVal.length > 150) {
      valid = setFieldState(subjectInput, subjectError, 'Subject cannot exceed 150 characters.') && valid;
    } else {
      setFieldState(subjectInput, subjectError, '');
    }

    if (!messageVal) {
      valid = setFieldState(messageInput, messageError, 'Please enter your inquiry or message.') && valid;
    } else if (messageVal.length < 5 || messageVal.length > 2000) {
      valid =
        setFieldState(messageInput, messageError, 'Message must be between 5 and 2000 characters.') &&
        valid;
    } else {
      setFieldState(messageInput, messageError, '');
    }

    return valid;
  }

  function showFormFeedback(type, message) {
    var feedbackBox = document.getElementById('contactFeedback');
    if (!feedbackBox) return;
    feedbackBox.className = 'alert alert-' + type + ' mt-3 sw-card-pop';
    feedbackBox.textContent = message;
    feedbackBox.classList.remove('d-none');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contactForm');
    var messageInput = document.getElementById('contactMessage');
    var charCounter = document.getElementById('contactCharCounter');
    var submitBtn = document.getElementById('contactSubmitBtn');

    if (messageInput && charCounter) {
      var updateCounter = function () {
        var len = messageInput.value.length;
        charCounter.textContent = len + ' / 2000';
        charCounter.classList.toggle('text-royal', len >= 5 && len <= 2000);
        charCounter.classList.toggle('text-danger', len > 2000);
      };
      messageInput.addEventListener('input', updateCounter);
      updateCounter();
    }

    if (!form) return;

    ['contactName', 'contactEmail', 'contactSubject', 'contactMessage'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('blur', function () {
          validateContactForm();
        });
      }
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var feedbackBox = document.getElementById('contactFeedback');
      if (feedbackBox) feedbackBox.classList.add('d-none');

      if (!validateContactForm()) {
        showFormFeedback('danger', 'Please fix the highlighted fields before submitting your message.');
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var payload = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        subject: document.getElementById('contactSubject').value.trim() || null,
        message: document.getElementById('contactMessage').value.trim(),
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Message...';
      }

      try {
        var mod = await import(SUPABASE_ESM_URL);
        var sb = mod.createClient(
          'https://pnxbxgekmfipasbdzbye.supabase.co',
          'sb_publishable_lHBaUfwxxMqW2UK-eVuKXw_p_cWQJzg'
        );
        // Security Rule: Do NOT chain .select() after inserting into contact_messages
        var res = await sb.from('contact_messages').insert(payload);
        if (res.error) {
          showFormFeedback('danger', 'Could not send message: ' + res.error.message);
        } else {
          form.reset();
          form.querySelectorAll('.is-valid, .is-invalid').forEach(function (el) {
            el.classList.remove('is-valid', 'is-invalid');
          });
          if (charCounter) charCounter.textContent = '0 / 2000';
          showFormFeedback(
            'success',
            'Thank you! Your message has been sent to SOROTI WebWorks at Plot 14, Gweri Road.'
          );
        }
      } catch (_) {
        showFormFeedback(
          'info',
          'Validation passed. Your inquiry is ready for SOROTI WebWorks.'
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        }
      }
    });
  });
})();
