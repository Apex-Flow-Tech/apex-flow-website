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

  // Hero video: a figure with data-hero-video="assets/videos/<name>" gets a
  // silent looping clip (<name>.webm, then <name>.mp4) laid over its photo.
  // The photo is the poster. Visitors who ask for reduced motion or data
  // saving keep the photo and never download the clip.
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const keepPhoto =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(prefers-reduced-data: reduce)').matches ||
    (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  if (!keepPhoto) {
    // Clips for photos lower down the page (loading="lazy") only load when
    // the photo comes near the screen.
    const attachClip = (frame) => {
      const img = frame.querySelector('img');
      const base = frame.dataset.heroVideo;
      if (!img || !base) return;
      const video = document.createElement('video');
      video.className = 'hero-video';
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.disablePictureInPicture = true;
      video.preload = 'auto';
      video.poster = img.currentSrc || img.src;
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
        const source = document.createElement('source');
        source.src = base + '.' + ext;
        source.type = type;
        video.appendChild(source);
      });
      // Only reveal the clip once it is really playing, so a blocked
      // autoplay or a missing file leaves the photo in place.
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
      frame.classList.add('has-video');
      frame.appendChild(video);
      const attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(() => {});
    };
    const lazyIO = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries, obs) => {
          entries.forEach((e) => { if (e.isIntersecting) { obs.unobserve(e.target); attachClip(e.target); } });
        }, { rootMargin: '300px 0px' })
      : null;
    document.querySelectorAll('.photo-frame[data-hero-video]').forEach((frame) => {
      const img = frame.querySelector('img');
      if (lazyIO && img && img.loading === 'lazy') lazyIO.observe(frame);
      else attachClip(frame);
    });
  }

  // Keep short phrases (five words or fewer) on one line. If one would wrap,
  // it is set to stay on a single line, shrinking the text slightly when
  // needed. If it still cannot fit, it is left to wrap normally.
  const keepShortLines = () => {
    document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li, main strong, main .hero-meta-item span, main .lp-stat span').forEach((el) => {
      if (el.closest('.crm-win') || !el.offsetParent) return;
      if ([...el.children].some((c) => /^(P|DIV|UL|OL|LI|H[1-6])$/.test(c.tagName))) return;
      el.classList.remove('keep-line'); el.style.fontSize = '';
      const words = el.textContent.trim().split(/\s+/).filter(Boolean).length;
      if (words < 2 || words > 5) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 1).map((r) => Math.round(r.top / 4)));
      if (tops.size < 2) return;
      // Measure against the card or column holding the text, and make sure
      // keeping the line together never makes that card wider.
      const holder = el.closest('.card, .fix-card, .process-card, .pricing-card, .stat-card, [class*="col"], .container') || el.parentElement;
      const before = holder.getBoundingClientRect();
      const pageWidth = document.documentElement.scrollWidth;
      el.classList.add('keep-line');
      const base = parseFloat(getComputedStyle(el).fontSize);
      for (let scale = 1; scale >= 0.84; scale -= 0.04) {
        el.style.fontSize = scale === 1 ? '' : (base * scale) + 'px';
        const now = holder.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (Math.abs(now.width - before.width) < 1 && r.right <= now.right + 1 && r.left >= now.left - 1 &&
            document.documentElement.scrollWidth <= pageWidth) return;
      }
      el.classList.remove('keep-line'); el.style.fontSize = '';
    });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(keepShortLines); else keepShortLines();
  let keepTimer;
  window.addEventListener('resize', () => { clearTimeout(keepTimer); keepTimer = setTimeout(keepShortLines, 150); });

  // CRM in action: a photo frame with data-crm-demo="<scene>" gets a small
  // CRM app window over it. Hovering plays the scene (records typing in,
  // messages arriving, tasks ticking off, charts growing). On touch screens,
  // which have no hover, it plays once the photo scrolls into view.
  // Example data only; nothing is sent anywhere.
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CRM_SCENES = {
    'home': { kind: 'record', app: 'Leads', title: 'New lead', from: 'New', to: 'Qualified', fields: [
      ['Name', 'Adaeze Okafor'], ['Company', 'Brightline Logistics'], ['Phone', '+234 803 555 0142'],
      ['Source', 'Website form'], ['Owner', 'Tunde A.'] ] },
    'real-estate': { kind: 'record', app: 'Buyers', title: 'Buyer enquiry', from: 'Enquiry', to: 'Site visit booked', fields: [
      ['Name', 'Chinedu Eze'], ['Interest', '3-bed terrace, Lekki'], ['Source', 'Instagram ad'],
      ['Site visit', 'Thu, 10:00'], ['Agent', 'Kemi O.'] ] },
    'finance': { kind: 'record', app: 'Clients', title: 'Client onboarding', from: 'KYC', to: 'Ready to invest', fields: [
      ['Name', 'Funmi Adeyemi'], ['Product', 'Fixed income'], ['Amount', '₦25,000,000'],
      ['Documents', 'KYC complete'], ['Advisor', 'Segun B.'] ] },
    'inbox': { kind: 'list', app: 'Inbox', title: 'All channels, one queue', items: [
      ['wa', 'WhatsApp', 'Is the 2-bed still available?', 'Assigned to Ada'],
      ['ig', 'Instagram', 'Price for the Lekki units?', 'Assigned to Kemi'],
      ['call', 'Call', 'Missed call, 0803 555 0142', 'Call-back task set'],
      ['web', 'Website', 'Book a strategy call form', 'Assigned to Tunde'],
      ['tt', 'TikTok', 'How do I pay in instalments?', 'Assigned to Ada'] ] },
    'followup': { kind: 'tasks', app: 'Follow-ups', title: "Today's follow-ups", items: [
      ['Call back Chinedu Eze', 'Kemi', 'done'], ['Send payment plan to Funmi', 'Segun', 'done'],
      ['Site visit reminder, 3 buyers', 'Auto', 'done'], ['Follow up Brightline proposal', 'Tunde', 'overdue'] ] },
    'outreach': { kind: 'sequence', app: 'Outreach', title: 'Follow-up sequence', items: [
      ['Day 0', 'Welcome email', 'Sent'], ['Day 2', 'WhatsApp check-in', 'Delivered'],
      ['Day 4', 'Helpful guide', 'Opened'], ['Day 9', 'Book a call invite', 'Replied'] ], result: 'Sequence stopped: customer replied' },
    'dashboard': { kind: 'dashboard', app: 'Reports', title: 'This month', kpis: [['Enquiries', 248], ['Won', 37], ['Follow-up rate', 96, '%']],
      bars: [['Instagram', 82], ['Website', 64], ['Referral', 45], ['TikTok', 30]] }
  };
  const ICONS = { wa: 'W', ig: 'I', call: 'C', web: 'F', tt: 'T' };
  const buildScene = (s) => {
    let body = '';
    if (s.kind === 'record') {
      body = '<div class="crm-rows">' + s.fields.map(([l]) => '<div class="crm-row"><span class="crm-label">' + esc(l) + '</span><span class="crm-value"></span></div>').join('') + '</div>' +
        '<div class="crm-lane"><span class="crm-col">' + esc(s.from) + '</span><span class="crm-col crm-col-to">' + esc(s.to) + '</span><span class="crm-chip">' + esc(s.fields[0][1]) + '</span></div>';
    } else if (s.kind === 'list') {
      body = '<div class="crm-list">' + s.items.map(([k, ch, msg, act]) => '<div class="crm-item crm-step"><span class="crm-ch crm-ch-' + k + '">' + ICONS[k] + '</span><span class="crm-msg"><b>' + esc(ch) + '</b>' + esc(msg) + '</span><span class="crm-tag">' + esc(act) + '</span></div>').join('') + '</div>';
    } else if (s.kind === 'tasks') {
      body = '<div class="crm-list">' + s.items.map(([t, who, st]) => '<div class="crm-task crm-step" data-state="' + st + '"><span class="crm-check"></span><span class="crm-msg">' + esc(t) + '<i>' + esc(who) + '</i></span><span class="crm-tag">' + (st === 'done' ? 'Done' : 'Reminder sent') + '</span></div>').join('') + '</div>';
    } else if (s.kind === 'sequence') {
      body = '<div class="crm-seq">' + s.items.map(([d, t, st]) => '<div class="crm-seq-step crm-step"><span class="crm-seq-dot"></span><span class="crm-msg"><b>' + esc(d) + '</b>' + esc(t) + '</span><span class="crm-tag">' + esc(st) + '</span></div>').join('') + '</div><div class="crm-result">' + esc(s.result) + '</div>';
    } else if (s.kind === 'dashboard') {
      body = '<div class="crm-kpis">' + s.kpis.map(([l, n, u]) => '<div class="crm-kpi"><span class="crm-kpi-n" data-n="' + n + '" data-u="' + (u || '') + '">0</span><span class="crm-label">' + esc(l) + '</span></div>').join('') + '</div>' +
        '<div class="crm-bars"><span class="crm-label">Enquiries by source</span>' + s.bars.map(([l, v]) => '<div class="crm-bar"><span>' + esc(l) + '</span><i style="--w:' + v + '%"></i></div>').join('') + '</div>';
    }
    return '<div class="crm-win-bar"><span></span><span></span><span></span><b>' + esc(s.app) + '</b></div>' +
      '<div class="crm-win-head"><span class="crm-dot"></span><span class="crm-title">' + esc(s.title) + '</span>' +
      (s.kind === 'record' ? '<span class="crm-stage">' + esc(s.from) + '</span>' : '<span class="crm-live">Live</span>') + '</div>' + body +
      '<div class="crm-foot"><span class="crm-saved">' + (s.kind === 'record' ? 'Saved' : 'Up to date') + '</span></div>';
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.photo-frame[data-crm-demo]').forEach((frame) => {
    const scene = CRM_SCENES[frame.dataset.crmDemo];
    if (!scene) return;
    frame.classList.add('has-crm-demo');
    const win = document.createElement('div');
    win.className = 'crm-win crm-kind-' + scene.kind;
    win.setAttribute('aria-hidden', 'true');
    win.innerHTML = buildScene(scene);
    frame.appendChild(win);

    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const reset = () => {
      timers.forEach(clearTimeout); timers = [];
      win.classList.remove('is-done', 'is-moved');
      win.querySelectorAll('.on, .is-typing, .is-filled').forEach((el) => el.classList.remove('on', 'is-typing', 'is-filled'));
      win.querySelectorAll('.crm-value').forEach((v) => { v.textContent = ''; });
      win.querySelectorAll('.crm-kpi-n').forEach((n) => { n.textContent = '0'; });
      const stage = win.querySelector('.crm-stage'); if (stage) stage.textContent = scene.from;
    };
    const finish = () => {
      win.querySelectorAll('.crm-step').forEach((el) => el.classList.add('on'));
      win.querySelectorAll('.crm-value').forEach((v, i) => { v.textContent = scene.fields[i][1]; v.parentNode.classList.add('is-filled'); });
      win.querySelectorAll('.crm-kpi-n').forEach((n) => { n.textContent = Number(n.dataset.n).toLocaleString() + n.dataset.u; });
      const stage = win.querySelector('.crm-stage'); if (stage) stage.textContent = scene.to;
      win.classList.add('is-moved', 'is-done');
    };
    const play = () => {
      reset();
      frame.classList.add('crm-open');
      if (reduceMotion) { finish(); return; }
      let t = 450;
      if (scene.kind === 'record') {
        win.querySelectorAll('.crm-value').forEach((v, i) => {
          const text = scene.fields[i][1];
          at(t, () => v.parentNode.classList.add('is-typing'));
          for (let c = 1; c <= text.length; c++) at(t + c * 40, () => { v.textContent = text.slice(0, c); });
          t += text.length * 40 + 160;
          at(t, () => { v.parentNode.classList.remove('is-typing'); v.parentNode.classList.add('is-filled'); });
        });
        at(t + 300, () => { win.classList.add('is-moved'); win.querySelector('.crm-stage').textContent = scene.to; });
        at(t + 1100, () => win.classList.add('is-done'));
      } else if (scene.kind === 'dashboard') {
        win.querySelectorAll('.crm-kpi-n').forEach((n) => {
          const target = Number(n.dataset.n);
          for (let f = 1; f <= 30; f++) at(t + f * 40, () => { n.textContent = Math.round(target * f / 30).toLocaleString() + n.dataset.u; });
        });
        win.querySelectorAll('.crm-step, .crm-bar').forEach((el, i) => at(t + 300 + i * 220, () => el.classList.add('on')));
        at(t + 1800, () => win.classList.add('is-done'));
      } else {
        win.querySelectorAll('.crm-step').forEach((el, i) => at(t + i * 700, () => el.classList.add('on')));
        at(t + win.querySelectorAll('.crm-step').length * 700 + 300, () => win.classList.add('is-done'));
      }
    };
    const close = () => { timers.forEach(clearTimeout); timers = []; frame.classList.remove('crm-open'); };
    if (canHover) {
      frame.addEventListener('mouseenter', play);
      frame.addEventListener('mouseleave', close);
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) play(); else close(); });
      }, { threshold: 0.6 });
      io.observe(frame);
    } else {
      play();
    }
  });

  // ---------------------------------------------------------------------
  // Lead destinations
  // ---------------------------------------------------------------------

  // Salesforce org that receives every Web-to-Lead submission
  // (Apex Flow Technologies, Enterprise Edition).
  const SALESFORCE_ORG_ID = '00Dd3000009jvOL';

  // HubSpot account (hello@apexflowspace.com, hosted in HubSpot's EU data
  // centre, so submissions must use the api-eu1 host). Each website form has
  // its own HubSpot form with matching fields.
  const HUBSPOT_SUBMIT_HOST = 'https://api-eu1.hsforms.com';
  const HUBSPOT_PORTAL_ID = '149687015';
  const HUBSPOT_FORM_STRATEGY_CALLS = 'bac3661d-f083-41b6-8f96-e52249e04f82';
  const HUBSPOT_FORM_CLARITY_SESSIONS = '3a9b4e27-aa6a-4609-9c38-3103d50e7a7c';
  const HUBSPOT_FORM_NEWSLETTER = '284ca014-0dfe-4a6d-9930-d15ebf8c78b2';
  const HUBSPOT_FORM_TOOLKIT = 'ec0ec2d0-d252-4bac-a26a-dbb115f8aef0';
  const HUBSPOT_FORM_CAREERS = '842b23fd-9386-4d40-80ca-0d0872265959';

  // Reads and trims the first/last name boxes of a form. Salesforce and
  // HubSpot both take them as separate fields.
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
      HUBSPOT_SUBMIT_HOST + '/submissions/v3/integration/submit/' + HUBSPOT_PORTAL_ID + '/' + formGuid,
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

  // Sends JSON to a Google Apps Script web app. Only the careers form uses
  // this, to save the resume file to Google Drive > Careers. The script's
  // doPost() reads e.postData.contents as raw JSON. Content-Type text/plain
  // keeps this a CORS "simple request", because Apps Script cannot answer a
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

        // HubSpot also sends the follow-up email with the toolkit link
        // (set up on the "Website Toolkit Downloads" form in HubSpot).
        await submitToHubSpot(HUBSPOT_FORM_TOOLKIT, {
          email: email,
          firstname: name.firstName,
          lastname: name.lastName
        }).catch(() => {});
      } finally {
        // A HubSpot problem never blocks the download itself.
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
  // Careers (careers.html). The resume file goes to Google Drive > Careers
  // through a small Apps Script (the form's action URL), which returns the
  // file's Drive link. The application itself goes to Salesforce
  // Web-to-Lead (Web Source "Careers"), where an automation turns it into a
  // Job Application and a ClickUp task, and the applicant goes to HubSpot.
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

      const email = (document.querySelector('#careers-email')?.value || '').trim();
      const phone = (document.querySelector('#careers-phone')?.value || '').trim();
      const role = document.querySelector('#careers-role')?.value || '';

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
      try {
        // A static site has no file-upload endpoint, so the resume is
        // base64-encoded here and the Apps Script turns it back into a real
        // file in Drive > Careers. If that fails, the application is still
        // sent and the applicant is asked to email the resume instead.
        let resumeUrl = '';
        if (resumeFile) {
          try {
            const saved = await postToAppsScript(careersForm.action, {
              firstName: name.firstName,
              lastName: name.lastName,
              role: role,
              resumeBase64: await fileToBase64(resumeFile),
              resumeFileName: resumeFile.name,
              resumeMimeType: resumeFile.type
            });
            if (saved && saved.result === 'success') resumeUrl = saved.fileUrl || '';
          } catch (err) {
            resumeUrl = '';
          }
        }

        submitToSalesforceWebToLead(Object.assign({
          retURL: 'https://apexflowspace.com/careers.html',
          first_name: name.firstName,
          last_name: name.lastName,
          email: email,
          phone: phone,
          company: 'Careers applicant',
          description: document.querySelector('#careers-why')?.value || '',
          Web_Source__c: 'Careers',
          Careers_Role__c: role,
          Careers_Portfolio_URL__c: (document.querySelector('#careers-portfolio')?.value || '').trim(),
          Careers_Resume_URL__c: resumeUrl,
          Careers_Earliest_Start__c: (document.querySelector('#careers-availability')?.value || '').trim()
        }, salesforceCaptchaSettings_(captcha.token)));

        await submitToHubSpot(HUBSPOT_FORM_CAREERS, {
          email: email,
          firstname: name.firstName,
          lastname: name.lastName,
          phone: phone
        }).catch(() => {});

        careersForm.style.display = 'none';
        if (successBox) {
          successBox.style.display = 'block';
          if (resumeFile && !resumeUrl) {
            const note = document.createElement('p');
            note.style.cssText = 'margin-top:12px; font-size:14px;';
            note.textContent = "Your application is in, but your resume didn't upload. Please email it to hello@apexflowspace.com with your name in the subject line.";
            successBox.appendChild(note);
          }
        }
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
          // Separate answers for the ClickUp task (Current Setup labels,
          // Biggest Bottleneck dropdown). Values must match ClickUp's options.
          Current_Setup__c: setup.join(';'),
          Biggest_Bottleneck__c: bottleneck,
          Web_Source__c: 'Clarity Session Landing Page'
        }, salesforceCaptchaSettings_(captcha.token)));

        // HubSpot is best-effort: a failure shouldn't stop the visitor from
        // booking, and the Salesforce lead has already been sent.
        await submitToHubSpot(HUBSPOT_FORM_CLARITY_SESSIONS, {
          email: email,
          firstname: name.firstName,
          lastname: name.lastName,
          company: company,
          // Checkbox properties take their values joined with ";".
          current_setup: setup.join(';'),
          biggest_bottleneck: bottleneck
        }).catch(() => {});
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
        // Salesforce sends the lead on to ClickUp (Lead Generation).
        submitToHubSpot(HUBSPOT_FORM_STRATEGY_CALLS, {
          email: payload.workEmail,
          firstname: payload.firstName,
          lastname: payload.lastName,
          company: payload.company,
          team_size: payload.teamSize,
          industry: payload.industry,
          what_are_you_looking_for: payload.lookingFor,
          tell_us_about_your_current_pipeline: payload.pipeline
        }).catch(() => {});

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
