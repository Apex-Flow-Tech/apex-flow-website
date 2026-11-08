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

  // ---------------------------------------------------------------------
  // Lead destinations
  // ---------------------------------------------------------------------

  // Salesforce org that receives every Web-to-Lead submission
  // (Apex Flow Technologies, Enterprise Edition).
  const SALESFORCE_ORG_ID = '00Dd3000009jvOL';

  // HubSpot portal and the forms that website submissions are filed under.
  // Newsletter sign-ups go to the newsletter form; every other lead goes to
  // the website leads form.
  const HUBSPOT_PORTAL_ID = '148898672';
  const HUBSPOT_FORM_NEWSLETTER = '382453c5-0fa4-4c1b-97f1-992b24ff3d11';
  const HUBSPOT_FORM_LEADS = '4567e67e-0a18-4952-96e4-01e57764a4d5';

  // Reads and trims the first/last name boxes of a form. Salesforce needs
  // them as separate fields; the Apps Script sheets still get the joined
  // full name under their existing "fullName" key.
  function readName_(firstSelector, lastSelector) {
    const firstName = (document.querySelector(firstSelector)?.value || '').trim();
    const lastName = (document.querySelector(lastSelector)?.value || '').trim();
    return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ') };
  }

  // Each page can hold more than one reCAPTCHA checkbox (for example a
  // page form plus the footer newsletter). With automatic rendering,
  // widget ids follow page order, so this finds the widget inside `scope`
  // and reads only that one.
  function captchaFor_(scope) {
    const el = scope ? scope.querySelector('.g-recaptcha') : null;
    if (!el || typeof grecaptcha === 'undefined') return { token: '', reset: () => {} };
    const id = Array.from(document.querySelectorAll('.g-recaptcha')).indexOf(el);
    let token = '';
    try { token = grecaptcha.getResponse(id); } catch (err) { token = ''; }
    return {
      token,
      reset: () => { try { grecaptcha.reset(id); } catch (err) { /* ignore */ } }
    };
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
  // fetch() here would always reject even on success. A hidden form POST
  // targeting a same-page iframe is the standard pattern: the browser
  // navigates the (invisible) iframe instead of the real page, and we
  // never need to read a response. Any failure here is swallowed so it
  // can never block or break the other submission paths.
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

      const allFields = Object.assign({ oid: SALESFORCE_ORG_ID, lead_source: 'Web' }, fields);
      Object.entries(allFields).forEach(([name, value]) => {
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
      // Best-effort only: never surface this to the visitor.
    }
  }

  // fetch() with a time limit, so a slow or blocked service can never
  // leave a visitor staring at a form with no message.
  async function fetchWithTimeout(url, options, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms || 10000);
    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  // Sends a contact to HubSpot through the public Forms Submission API
  // (no API key needed, CORS enabled). Blank values are skipped. Resolves
  // when HubSpot accepts the submission, rejects otherwise.
  async function submitToHubSpot(formGuid, properties) {
    const fields = Object.entries(properties)
      .filter(([, value]) => value)
      .map(([name, value]) => ({ objectTypeId: '0-1', name, value: String(value) }));
    const res = await fetchWithTimeout(
      'https://api.hsforms.com/submissions/v3/integration/submit/' + HUBSPOT_PORTAL_ID + '/' + formGuid,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          context: { pageUri: window.location.href, pageName: document.title }
        })
      },
      8000
    );
    if (!res.ok) throw new Error('HubSpot rejected the submission (' + res.status + ')');
  }

  // Sends JSON to a Google Apps Script web app. The script's doPost()
  // reads e.postData.contents as raw JSON. Content-Type text/plain keeps
  // this a CORS "simple request", because Apps Script cannot answer a
  // preflight OPTIONS call.
  async function postToAppsScript(url, payload) {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }, 15000);
    return res.json();
  }

  // The Salesforce org has Web-to-Lead reCAPTCHA turned off, and it
  // silently drops any lead that carries captcha_settings for a key it
  // doesn't have. So nothing is sent while that's off; the on-page
  // reCAPTCHA still gates submission. If reCAPTCHA is enabled in the org
  // (key name Apex_Flow_Web_to_Lead), set this to true.
  const SALESFORCE_CAPTCHA_ENABLED = false;

  function salesforceCaptchaSettings_(captchaToken) {
    if (!SALESFORCE_CAPTCHA_ENABLED) return {};
    return {
      captcha_settings: JSON.stringify({
        keyname: 'Apex_Flow_Web_to_Lead',
        fallback: 'true',
        orgId: SALESFORCE_ORG_ID,
        ts: String(Date.now())
      }),
      'g-recaptcha-response': captchaToken
    };
  }

  const CAPTCHA_MESSAGE = 'Please check the "I\'m not a robot" box before submitting.';
  const NAME_MESSAGE = 'Please enter your first name and last name.';

  // ---------------------------------------------------------------------
  // Toolkit download (toolkit.html)
  // ---------------------------------------------------------------------
  const toolkitForm = document.querySelector('#toolkit-form');
  if (toolkitForm) {
    toolkitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = toolkitForm.querySelector('button[type="submit"]');
      const downloadBox = document.querySelector('#toolkit-download');
      const errorEl = document.querySelector('#toolkit-error');
      const showError = (text) => {
        if (!errorEl) return;
        errorEl.textContent = text;
        errorEl.style.display = 'block';
      };

      const name = readName_('#toolkit-first-name', '#toolkit-last-name');
      if (!name.firstName || !name.lastName) { showError(NAME_MESSAGE); return; }
      const captcha = captchaFor_(toolkitForm);
      if (!captcha.token) { showError(CAPTCHA_MESSAGE); return; }
      if (errorEl) errorEl.style.display = 'none';

      const email = (document.querySelector('#toolkit-email')?.value || '').trim();

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Preparing your download...'; }
      try {
        submitToSalesforceWebToLead(Object.assign({
          retURL: 'https://apexflowspace.com/toolkit.html',
          first_name: name.firstName,
          last_name: name.lastName,
          email: email,
          company: companyFromEmail_(email),
          Web_Source__c: 'Resource Download'
        }, salesforceCaptchaSettings_(captcha.token)));

        await Promise.allSettled([
          submitToHubSpot(HUBSPOT_FORM_LEADS, {
            email: email,
            firstname: name.firstName,
            lastname: name.lastName,
            message: 'Downloaded the Never Lose a Lead toolkit.'
          }),
          // This Apps Script also sends the toolkit delivery email.
          postToAppsScript(toolkitForm.action, {
            fullName: name.fullName,
            firstName: name.firstName,
            lastName: name.lastName,
            email: email
          })
        ]);
      } finally {
        // Logging or emailing problems never block the download itself.
        toolkitForm.style.display = 'none';
        if (downloadBox) {
          downloadBox.style.display = 'block';
          // Auto-start the download instead of making them click a second
          // time. This fires from the same click-derived handler as the
          // submit, so browsers treat it as a real user-initiated download.
          const downloadLink = document.querySelector('#toolkit-download-link');
          if (downloadLink) downloadLink.click();
        }
        captcha.reset();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Newsletter (footer of most pages)
  // ---------------------------------------------------------------------
  const newsletterForm = document.querySelector('#newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#newsletter-status');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      const showStatus = (color, text) => {
        if (!status) return;
        status.style.color = color;
        status.textContent = text;
        status.style.display = 'block';
      };

      const name = readName_('#newsletter-first-name', '#newsletter-last-name');
      if (!name.firstName || !name.lastName) { showStatus('#e2555a', NAME_MESSAGE); return; }
      const captcha = captchaFor_(newsletterForm.closest('.footer-newsletter-form-wrap') || newsletterForm);
      if (!captcha.token) {
        showStatus('#e2555a', 'Please check the "I\'m not a robot" box before subscribing.');
        return;
      }

      const email = (document.querySelector('#newsletter-email')?.value || '').trim();

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Subscribing...'; }

      submitToSalesforceWebToLead(Object.assign({
        retURL: window.location.href,
        first_name: name.firstName,
        last_name: name.lastName,
        email: email,
        company: companyFromEmail_(email),
        Web_Source__c: 'Newsletter'
      }, salesforceCaptchaSettings_(captcha.token)));

      // HubSpot runs the email marketing, so its answer decides what the
      // visitor sees: "subscribed" only once HubSpot has accepted them.
      try {
        await submitToHubSpot(HUBSPOT_FORM_NEWSLETTER, {
          email: email,
          firstname: name.firstName,
          lastname: name.lastName
        });
        newsletterForm.reset();
        showStatus('var(--blue)', "You're subscribed. Thanks for signing up.");
      } catch (err) {
        showStatus('#e2555a', "We couldn't sign you up just now. Please try again, or email hello@apexflowspace.com.");
      } finally {
        captcha.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Subscribe'; }
      }
    });
  }

  // ---------------------------------------------------------------------
  // Careers (careers.html). Applications go to Apps Script and Drive only,
  // not to Salesforce or HubSpot.
  // ---------------------------------------------------------------------
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
      const showError = (text) => {
        if (!errorBox) return;
        errorBox.textContent = text;
        errorBox.style.display = 'block';
      };

      if (errorBox) errorBox.style.display = 'none';

      const name = readName_('#careers-first-name', '#careers-last-name');
      if (!name.firstName || !name.lastName) { showError(NAME_MESSAGE); return; }

      if (resumeFile && resumeFile.size > MAX_RESUME_BYTES) {
        showError('That file is over 5MB. Please attach a smaller PDF or Word doc.');
        return;
      }

      const captcha = captchaFor_(careersForm);
      if (!captcha.token) { showError(CAPTCHA_MESSAGE); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        // There is no real file-upload endpoint on a static site, so the
        // resume is base64-encoded here and the Apps Script decodes it back
        // into a real file and saves it to Drive.
        let resumeBase64 = '', resumeFileName = '', resumeMimeType = '';
        if (resumeFile) {
          resumeBase64 = await fileToBase64(resumeFile);
          resumeFileName = resumeFile.name;
          resumeMimeType = resumeFile.type;
        }

        const json = await postToAppsScript(careersForm.action, {
          fullName: name.fullName,
          firstName: name.firstName,
          lastName: name.lastName,
          email: (document.querySelector('#careers-email')?.value || '').trim(),
          phone: document.querySelector('#careers-phone')?.value || '',
          role: document.querySelector('#careers-role')?.value || '',
          linkedin: document.querySelector('#careers-portfolio')?.value || '',
          availability: document.querySelector('#careers-availability')?.value || '',
          coverLetter: document.querySelector('#careers-why')?.value || '',
          resumeBase64, resumeFileName, resumeMimeType
        });
        if (json.result !== 'success') throw new Error(json.error || 'Request failed');

        careersForm.style.display = 'none';
        if (successBox) successBox.style.display = 'block';
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        }
        showError('Something went wrong sending that. Please email hello@apexflowspace.com with your resume attached instead.');
      } finally {
        captcha.reset();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Clarity Session landing page (clarity-session.html)
  // ---------------------------------------------------------------------
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

      const name = readName_('#clarity-first-name', '#clarity-last-name');
      if (!name.firstName || !name.lastName) { showStatus('#e2555a', NAME_MESSAGE); return; }
      const setup = Array.from(clarityForm.querySelectorAll('input[name="setup"]:checked')).map((el) => el.value);
      if (setup.length === 0) {
        showStatus('#e2555a', 'Please tick at least one option under Current Setup.');
        return;
      }
      const captcha = captchaFor_(clarityForm);
      if (!captcha.token) { showStatus('#e2555a', CAPTCHA_MESSAGE); return; }

      if (submitBtn) submitBtn.disabled = true;
      try {
        const email = (document.querySelector('#clarity-email')?.value || '').trim();
        const company = (document.querySelector('#clarity-company')?.value || '').trim();
        const bottleneck = document.querySelector('#clarity-bottleneck')?.value || '';
        const summary = 'Clarity Session request. Current setup: ' + setup.join(', ') + '. Biggest bottleneck: ' + bottleneck;

        submitToSalesforceWebToLead(Object.assign({
          retURL: 'https://apexflowspace.com/clarity-session.html',
          first_name: name.firstName,
          last_name: name.lastName,
          email: email,
          company: company || companyFromEmail_(email),
          Service_Interest__c: 'Free Clarity Session',
          description: summary,
          Web_Source__c: 'Clarity Session Landing Page'
        }, salesforceCaptchaSettings_(captcha.token)));

        // Both logs are best-effort: a failure shouldn't stop the visitor
        // from booking, and the Salesforce lead has already been sent.
        await Promise.allSettled([
          submitToHubSpot(HUBSPOT_FORM_LEADS, {
            email: email,
            firstname: name.firstName,
            lastname: name.lastName,
            company: company,
            message: summary
          }),
          postToAppsScript(clarityForm.action, {
            fullName: name.fullName,
            firstName: name.firstName,
            lastName: name.lastName,
            workEmail: email,
            company: company,
            teamSize: '',
            industry: '',
            lookingFor: 'Free Clarity Session',
            pipeline: summary
          })
        ]);
        clarityForm.reset();
      } finally {
        showStatus('var(--blue)', "Thanks, that's in. Taking you to the calendar to pick a time...");
        window.location.href = 'https://calendly.com/flowapex40/30min';
        if (submitBtn) submitBtn.disabled = false;
        captcha.reset();
      }
    });
  }

  // ---------------------------------------------------------------------
  // Strategy call (contact.html)
  // ---------------------------------------------------------------------
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.querySelector('#form-status');
      const submitBtn = form.querySelector('button[type="submit"]');
      const showStatus = (color, text) => {
        if (!status) return;
        status.style.color = color;
        status.textContent = text;
        status.style.display = 'block';
      };

      const name = readName_('#first-name', '#last-name');
      if (!name.firstName || !name.lastName) { showStatus('#e2555a', NAME_MESSAGE); return; }
      const captcha = captchaFor_(form);
      if (!captcha.token) { showStatus('#e2555a', CAPTCHA_MESSAGE); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
      try {
        const payload = {
          fullName: name.fullName,
          firstName: name.firstName,
          lastName: name.lastName,
          workEmail: (document.querySelector('#email')?.value || '').trim(),
          company: (document.querySelector('#company')?.value || '').trim(),
          teamSize: document.querySelector('#team-size')?.value || '',
          industry: document.querySelector('#industry')?.value || '',
          lookingFor: document.querySelector('#interest')?.value || '',
          pipeline: document.querySelector('#message')?.value || ''
        };

        // Persona is NOT sent from here: Salesforce works it out from
        // Industry, so internal persona codes never appear on the website.
        submitToSalesforceWebToLead(Object.assign({
          retURL: 'https://apexflowspace.com/contact.html',
          first_name: payload.firstName,
          last_name: payload.lastName,
          email: payload.workEmail,
          company: payload.company || companyFromEmail_(payload.workEmail),
          industry: payload.industry,
          Team_Size__c: payload.teamSize,
          Service_Interest__c: payload.lookingFor,
          description: payload.pipeline,
          Web_Source__c: 'Contact Form'
        }, salesforceCaptchaSettings_(captcha.token)));

        // HubSpot runs alongside but never holds up the visitor's message.
        submitToHubSpot(HUBSPOT_FORM_LEADS, {
            email: payload.workEmail,
            firstname: payload.firstName,
            lastname: payload.lastName,
            company: payload.company,
            industry: payload.industry,
            message: 'Strategy call request. Looking for: ' + payload.lookingFor +
              '. Team size: ' + payload.teamSize + '. Pipeline: ' + payload.pipeline
        }).catch(() => {});

        const sheet = await postToAppsScript(form.action, payload);
        if (sheet.result !== 'success') throw new Error('Sheet log failed');
        form.reset();
        showStatus('var(--blue)', "Thanks, that's in. We reply to strategy call requests within 1 business day.");
      } catch (err) {
        showStatus('#e2555a', 'Something went wrong sending that. Please email hello@apexflowspace.com directly and we will get back to you.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Request a Strategy Call'; }
        captcha.reset();
      }
    });
  }
});
