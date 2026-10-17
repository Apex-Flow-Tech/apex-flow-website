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
      const errorEl = document.querySelector('#toolkit-error');

      const captchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
      if (!captchaToken) {
        if (errorEl) {
          errorEl.textContent = 'Please check the "I\'m not a robot" box before submitting.';
          errorEl.style.display = 'block';
        }
        return;
      }
      if (errorEl) errorEl.style.display = 'none';

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

        const { firstName, lastName } = splitFullName_(payload.fullName);
        submitToSalesforceWebToLead(Object.assign({
          oid: '00Dbm00000yZbns',
          retURL: 'https://apexflowspace.com/toolkit.html',
          first_name: firstName,
          last_name: lastName,
          email: payload.email,
          company: companyFromEmail_(payload.email),
          lead_source: 'Web',
          Web_Source__c: 'Resource Download'
        }, salesforceCaptchaSettings_(captchaToken)));

        await fetch(toolkitForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // Even if logging/emailing fails, don't block delivery of the toolkit itself.
      } finally {
        toolkitForm.style.display = 'none';
        if (downloadBox) {
          downloadBox.style.display = 'block';
          // Auto-start the download instead of making them click a second
          // time -- this fires from the same click-derived handler as the
          // submit, so browsers treat it as a real user-initiated download.
          const downloadLink = document.querySelector('#toolkit-download-link');
          if (downloadLink) downloadLink.click();
        }
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      }
    });
  }

  const newsletterForm = document.querySelector('#newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.querySelector('#newsletter-status');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');

      const captchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
      if (!captchaToken) {
        if (status) {
          status.style.color = '#e2555a';
          status.textContent = 'Please check the "I\'m not a robot" box before subscribing.';
          status.style.display = 'block';
        }
        return;
      }

      const fullName = document.querySelector('#newsletter-name')?.value || '';
      const email = document.querySelector('#newsletter-email')?.value || '';
      const { firstName, lastName } = splitFullName_(fullName);

      submitToSalesforceWebToLead(Object.assign({
        oid: '00Dbm00000yZbns',
        retURL: window.location.href,
        first_name: firstName,
        last_name: lastName,
        email: email,
        company: companyFromEmail_(email),
        lead_source: 'Web',
        Web_Source__c: 'Newsletter'
      }, salesforceCaptchaSettings_(captchaToken)));

      // Web-to-Lead gives us no response to await, so treat the hidden
      // submission as immediately successful from the visitor's side.
      if (submitBtn) submitBtn.disabled = true;
      newsletterForm.reset();
      if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      if (status) {
        status.style.color = 'var(--blue)';
        status.textContent = "You're subscribed. Thanks for signing up.";
        status.style.display = 'block';
      }
      if (submitBtn) submitBtn.disabled = false;
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

  // Splits a single "Full Name" input into Web-to-Lead's separate
  // first_name/last_name fields. Salesforce requires last_name; if only
  // one word was entered, it all goes there and first_name stays blank.
  function splitFullName_(fullName) {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: '', lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  // Lead.Company is required by Salesforce. Forms that don't collect a
  // company (toolkit download, newsletter) fall back to the email's
  // domain rather than submitting a blank value the Lead would reject.
  function companyFromEmail_(email) {
    const domain = (email || '').split('@')[1];
    return domain || 'Unknown';
  }

  // Fires a submission at Salesforce Web-to-Lead, silently, via a hidden
  // iframe target. Web-to-Lead's servlet doesn't send CORS headers, so a
  // fetch() here would always reject even on success — a hidden form POST
  // targeting a same-page iframe is the standard pattern: the browser
  // navigates the (invisible) iframe instead of the real page, and we
  // never need to read a response. This runs alongside each form's
  // existing Google Sheet log, not instead of it, and any failure here is
  // swallowed so it can never block or break that primary submission path.
  // `fields` is the full set of Web-to-Lead field name/value pairs for
  // this submission (oid/retURL/captcha_settings included by the caller).
  function submitToSalesforceWebToLead(fields) {
    try {
      let iframe = document.querySelector('#sf-w2l-target');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'sf-w2l-target';
        iframe.name = 'sf-w2l-target';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      const sfForm = document.createElement('form');
      sfForm.action = 'https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8';
      sfForm.method = 'POST';
      sfForm.target = 'sf-w2l-target';
      sfForm.style.display = 'none';

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value || '';
        sfForm.appendChild(input);
      });

      document.body.appendChild(sfForm);
      sfForm.submit();
      sfForm.remove();
    } catch (err) {
      // Best-effort only — never surface this to the visitor.
    }
  }

  function salesforceCaptchaSettings_(captchaToken) {
    return {
      captcha_settings: JSON.stringify({
        keyname: 'Apex_Flow_Web_to_Lead',
        fallback: 'true',
        orgId: '00Dbm00000yZbns',
        ts: String(Date.now())
      }),
      'g-recaptcha-response': captchaToken
    };
  }

  // Clarity Session landing page form: same Apps Script log + Salesforce
  // Web-to-Lead pair as the contact form, tagged with its own web source.
  const clarityForm = document.querySelector('#clarity-form');
  if (clarityForm) {
    clarityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#clarity-status');
      const submitBtn = clarityForm.querySelector('button[type="submit"]');
      const showStatus = (color, text) => {
        if (!status) return;
        status.style.color = color;
        status.textContent = text;
        status.style.display = 'block';
      };

      const setup = Array.from(clarityForm.querySelectorAll('input[name="setup"]:checked')).map((el) => el.value);
      if (setup.length === 0) {
        showStatus('#e2555a', 'Please tick at least one option under Current Setup.');
        return;
      }
      const captchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
      if (!captchaToken) {
        showStatus('#e2555a', 'Please check the "I\'m not a robot" box before submitting.');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      try {
        const fullName = document.querySelector('#clarity-name')?.value || '';
        const email = document.querySelector('#clarity-email')?.value || '';
        const bottleneck = document.querySelector('#clarity-bottleneck')?.value || '';
        const summary = 'Clarity Session request. Current setup: ' + setup.join(', ') + '. Biggest bottleneck: ' + bottleneck;
        const payload = {
          fullName: fullName,
          workEmail: email,
          company: document.querySelector('#clarity-company')?.value || '',
          teamSize: '',
          industry: '',
          lookingFor: 'Free Clarity Session',
          pipeline: summary
        };
        {
          const { firstName, lastName } = splitFullName_(fullName);
          submitToSalesforceWebToLead(Object.assign({
            oid: '00Dbm00000yZbns',
            retURL: 'https://apexflowspace.com/clarity-session.html',
            first_name: firstName,
            last_name: lastName,
            email: email,
            company: payload.company || companyFromEmail_(email),
            Service_Interest__c: 'Free Clarity Session',
            description: summary,
            lead_source: 'Web',
            Web_Source__c: 'Clarity Session Landing Page'
          }, salesforceCaptchaSettings_(captchaToken)));
        }
        const res = await fetch(clarityForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.result !== 'success') throw new Error(json.error || 'Request failed');
        clarityForm.reset();
        showStatus('var(--blue)', "Thanks, that's in. Pick a time in Calendly to lock in your session.");
        window.location.href = 'https://calendly.com/flowapex40/30min';
      } catch (err) {
        showStatus('#e2555a', 'Something went wrong sending that. Please email hello@apexflowspace.com directly and we will get back to you.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      }
    });
  }

  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#form-status');
      const submitBtn = form.querySelector('button[type="submit"]');

      const captchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
      if (!captchaToken) {
        if (status) {
          status.style.color = '#e2555a';
          status.textContent = 'Please check the "I\'m not a robot" box before submitting.';
          status.style.display = 'block';
        }
        return;
      }

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
        {
          const { firstName, lastName } = splitFullName_(payload.fullName);
          submitToSalesforceWebToLead(Object.assign({
            oid: '00Dbm00000yZbns',
            retURL: 'https://apexflowspace.com/contact.html',
            first_name: firstName,
            last_name: lastName,
            email: payload.workEmail,
            company: payload.company,
            Team_Size__c: payload.teamSize,
            Persona__c: document.querySelector('#industry')?.value || '',
            Service_Interest__c: payload.lookingFor,
            description: payload.pipeline,
            lead_source: 'Web',
            Web_Source__c: 'Contact Form'
          }, salesforceCaptchaSettings_(captchaToken)));
        }
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
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      }
    });
  }
});
