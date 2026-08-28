document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }

  const aboutVideo = document.querySelector('#about-values-video');
  if (aboutVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    aboutVideo.pause();
  }

  const toolkitForm = document.querySelector('#toolkit-form');
  if (toolkitForm) {
    toolkitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = toolkitForm.querySelector('button[type="submit"]');
      const downloadBox = document.querySelector('#toolkit-download');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Preparing your download...'; }
      try {
        await fetch(toolkitForm.action, {
          method: 'POST',
          body: new FormData(toolkitForm),
          headers: { 'Accept': 'application/json' }
        });
      } catch (err) {
        // Even if lead logging fails, don't block delivery of the toolkit itself.
      } finally {
        toolkitForm.style.display = 'none';
        if (downloadBox) downloadBox.style.display = 'block';
      }
    });
  }

  const careersForm = document.querySelector('#careers-form');
  if (careersForm) {
    careersForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = careersForm.querySelector('button[type="submit"]');
      const successBox = document.querySelector('#careers-success');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        const res = await fetch(careersForm.action, {
          method: 'POST',
          body: new FormData(careersForm),
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Request failed');
        careersForm.style.display = 'none';
        if (successBox) successBox.style.display = 'block';
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Something went wrong — email hello@apexflowspace.com instead';
        }
      }
    });
  }

  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#form-status');
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        // This endpoint is a Google Apps Script web app whose doPost() reads
        // e.postData.contents as raw JSON, not multipart form data. Sending
        // Content-Type: text/plain (instead of application/json) keeps this
        // a CORS "simple request" so the browser doesn't need a preflight
        // OPTIONS call, which Apps Script web apps don't handle.
        const payload = {
          fullName: document.querySelector('#name')?.value || '',
          workEmail: document.querySelector('#email')?.value || '',
          company: document.querySelector('#company')?.value || '',
          teamSize: document.querySelector('#team-size')?.value || '',
          industry: document.querySelector('#industry')?.value || '',
          lookingFor: document.querySelector('#interest')?.value || '',
          pipeline: document.querySelector('#message')?.value || ''
        };
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.result !== 'success') throw new Error(json.error || 'Request failed');
        form.reset();
        if (status) {
          status.style.color = 'var(--blue)';
          status.textContent = "Thanks, that's in. We reply to strategy call requests within 1 business day.";
          status.style.display = 'block';
        }
      } catch (err) {
        if (status) {
          status.style.color = '#e2555a';
          status.textContent = 'Something went wrong sending that. Please email hello@apexflowspace.com directly and we will get back to you.';
          status.style.display = 'block';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
