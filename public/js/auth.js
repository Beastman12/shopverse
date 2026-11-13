'use strict';

/* ==========================================================================
   Sign in and create account
   ========================================================================== */

(() => {
  const page = document.body.dataset.page;
  const errorBox = document.getElementById('auth-error');

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.toggle('is-visible', Boolean(message));
  }

  function targetFor(user) {
    const requested = SV.sanitizeNext(SV.qs('next'), '');
    if (requested) return requested;
    if (user && user.role === 'admin') return '/admin';
    return '/';
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  if (page === 'login') {
    const form = document.getElementById('login-form');
    const submit = document.getElementById('login-submit');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');

      const data = new FormData(form);
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '');

      if (!email || !password) {
        showError('Enter your email and password to continue.');
        return;
      }

      setBusy(submit, true, 'Signing in…');
      try {
        const result = await SV.api.post('/api/auth/login', { email, password });
        SV.toast(result.message, 'success', 'Signed in');
        window.location.href = targetFor(result.user);
      } catch (error) {
        showError(error.message);
        SV.toast(error.message, 'error', 'Could not sign in');
        setBusy(submit, false);
      }
    });

    document.querySelectorAll('[data-demo-email]').forEach((button) => {
      button.addEventListener('click', () => {
        const email = document.getElementById('login-email');
        const password = document.getElementById('login-password');
        if (email) email.value = button.dataset.demoEmail || '';
        if (password) password.value = button.dataset.demoPassword || '';
        form?.requestSubmit();
      });
    });
  }

  if (page === 'register') {
    const form = document.getElementById('register-form');
    const submit = document.getElementById('register-submit');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');

      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '');
      const confirm = String(data.get('confirm') || '');

      if (name.length < 2) {
        showError('Please enter your full name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }
      if (password.length < 8) {
        showError('Your password needs at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        showError('Those passwords do not match. Please try again.');
        return;
      }

      setBusy(submit, true, 'Creating your account…');
      try {
        const result = await SV.api.post('/api/auth/register', { name, email, password });
        SV.toast(result.message, 'success', 'Account created');
        window.location.href = targetFor(result.user);
      } catch (error) {
        showError(error.message);
        SV.toast(error.message, 'error', 'Could not create account');
        setBusy(submit, false);
      }
    });
  }

  SV.state.ready.then(() => {
    if (!SV.state.user) return;
    const note = document.createElement('p');
    note.className = 'form-hint';
    note.style.marginTop = '12px';
    note.innerHTML = `You are already signed in as <strong>${SV.escapeHtml(SV.state.user.name)}</strong>.`;
    errorBox?.insertAdjacentElement('afterend', note);
  });
})();
