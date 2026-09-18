(() => {
  const form = document.getElementById('waitlist');
  if (!form) return;
  const email = form.elements.email;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('waitlist-status');
  let pending = false;

  document.querySelectorAll('a[href="#waitlist"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      form.scrollIntoView({ block: 'center' });
      email.focus({ preventScroll: true });
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true;
    button.disabled = true;
    button.textContent = 'Joining…';
    status.classList.remove('is-error');
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api-production-b742.up.railway.app/web/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), consent: true, website: form.elements.website.value }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error(response.status === 429 ? 'Too many attempts. Please try again in an hour.' : response.status === 400 ? 'Please enter a valid email address.' : 'We couldn’t save your email. Please try again.');
      }
      form.reset();
      status.textContent = 'You’re on the list! We’ll email you when Dial Santa launches.';
      status.focus({ preventScroll: true });
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error instanceof TypeError || error.name === 'AbortError' ? 'We couldn’t connect. Please check your connection and try again.' : error.message;
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.textContent = 'Join the waitlist';
    }
  });
})();
