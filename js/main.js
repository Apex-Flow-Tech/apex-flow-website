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
        // Google Apps Script web app: raw JSON body, text/plain header to
        // avoid a CORS preflight the script doesn't handle (same pattern
        // as the contact and careers forms). This one sends the delivery
        // email itself, immediately, so no separate polling script needed.
        const payload = {
          fullName: document.querySelector('#toolkit-name')?.value || '',
          email: document.querySelector('#toolkit-email')?.value || ''
        };
        await fetch(toolkitForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // Even if logging/emailing fails, don't block delivery of the toolkit itself.
      } finally {
        toolkitForm.style.display = 'none';
        if (downloadBox) downloadBox.style.display = 'block';
      }
    });
  }

  const careersForm = document.querySelector('#careers-form');
  if (careersForm) {
    const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Could not read the file'));
      reader.readAsDataURL(file);
    });

    careersForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = careersForm.querySelector('button[type="submit"]');
      const successBox = document.querySelector('#careers-success');
      const errorBox = document.querySelector('#careers-error');
      const resumeInput = document.querySelector('#careers-resume');
      const resumeFile = resumeInput?.files?.[0];

      if (errorBox) errorBox.style.display = 'none';

      if (resumeFile && resumeFile.size > MAX_RESUME_BYTES) {
        if (errorBox) {
          errorBox.textContent = 'That file is over 5MB — please attach a smaller PDF or Word doc.';
          errorBox.style.display = 'block';
        }
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        // This endpoint is a Google Apps Script web app (same pattern as the
        // contact form): raw JSON body, text/plain header to avoid a CORS
        // preflight the script doesn't handle. The resume file has to be
        // base64-encoded client-side since there's no real file-upload
        // endpoint on a static site — the script decodes it back into a
        // real file and saves it to Drive.
        let resumeBase64 = '', resumeFileName = '', resumeMimeType = '';
        if (resumeFile) {
          resumeBase64 = await fileToBase64(resumeFile);
          resumeFileName = resumeFile.name;
          resumeMimeType = resumeFile.type;
        }

        const payload = {
          fullName: document.querySelector('#careers-name')?.value || '',
          email: document.querySelector('#careers-email')?.value || '',
          phone: document.querySelector('#careers-phone')?.value || '',
          role: document.querySelector('#careers-role')?.value || '',
          linkedin: document.querySelector('#careers-portfolio')?.value || '',
          availability: document.querySelector('#careers-availability')?.value || '',
          coverLetter: document.querySelector('#careers-why')?.value || '',
          resumeBase64, resumeFileName, resumeMimeType
        };

        const res = await fetch(careersForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.result !== 'success') throw new Error(json.error || 'Request failed');

        careersForm.style.display = 'none';
        if (successBox) successBox.style.display = 'block';
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        }
        if (errorBox) {
          errorBox.textContent = 'Something went wrong sending that. Please email hello@apexflowspace.com with your resume attached instead.';
          errorBox.style.display = 'block';
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
