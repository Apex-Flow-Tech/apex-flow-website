# Apex Flow Technologies: Workspace Context & Operational Guidelines

## Executive Summary & Philosophy
Apex Flow Technologies is a lean, highly efficient CRM consultancy and process automation agency. 
Our core technical philosophy is **maximum output with minimum software bloat**. We deliberately avoid over-engineered architectures, unnecessary middleware, or redundant SaaS subscriptions.

---

## Authorized Tech Stack & System Architecture

### 1. Core Operating Systems
* **Salesforce (Partner / Core Hub):** Official partner hub, primary client database, and core operational CRM.
* **HubSpot (Marketing Engine):** Dedicated strictly to inbound email marketing campaigns, list management, and form notifications.
* **Google Workspace (`apexflowspace.com`):** Primary domain email host (`jeffrey@apexflowspace.com`) and daily business communications.
* **GitHub & Claude Code:** Version control, cloud execution, repository management, and autonomous development.

### 2. Form & Lead Capture Architecture
The site is static HTML/CSS/JS served from `apexflowspace.com` (see `CNAME`). There is no backend server. All form logic lives in `js/main.js`.

**Strategy call form** (`contact.html`, `#contact-form`) sends every lead to two destinations in parallel:

1. **Salesforce Web-to-Lead (CRM of record):**
   * Endpoint: `https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8`
   * Org ID (`oid`): `00DgK00000XsFOr`
   * Sent via a hidden form POST into a hidden iframe (`#sf-w2l-target`), because Web-to-Lead returns no CORS headers. This is fire-and-forget and must never block the visitor.
   * Fields sent: `first_name`, `last_name` (split from Full name), `email`, `company`, `Team_Size__c`, `Persona__c` (Industry dropdown value), `Service_Interest__c`, `description`, `lead_source` = `Web`, `Web_Source__c` = `Contact Form`, `retURL`.
2. **Google Apps Script web app (Google Sheet log):**
   * Endpoint: the form's `action` URL (`https://script.google.com/macros/s/AKfycbwwy0SGJLpnthSaBUnTnf1aZBYVOKRNMTFyLstW0EFmsmjGmI4RgRJ8lmoy07OS1k0s/exec`).
   * Sent with `fetch()` as a raw JSON body with `Content-Type: text/plain;charset=utf-8`. This keeps it a CORS "simple request", because Apps Script cannot answer a preflight OPTIONS call. Do not change it to `application/json`.
   * JSON keys: `fullName`, `workEmail`, `company`, `teamSize`, `industry`, `lookingFor`, `pipeline`.
   * The script replies with `{"result":"success"}`; anything else shows the visitor an error asking them to email `hello@apexflowspace.com`.

**Spam protection:** Google reCAPTCHA v2 checkbox (site key `6LcRoLwtAAAAAHCXtfp3DCciyOM0YSAqbrWJXOzi`) must be ticked before submit. `SALESFORCE_CAPTCHA_ENABLED` in `js/main.js` is `false` because the Salesforce org has Web-to-Lead reCAPTCHA turned off and silently drops leads that carry `captcha_settings`. Only set it to `true` after enabling reCAPTCHA in the org (key name `Apex_Flow_Web_to_Lead`).

**Other forms using the same pattern:**
* `clarity-session.html` (`#clarity-form`): same Apps Script endpoint and Web-to-Lead pair, `Web_Source__c` = `Clarity Session Landing Page`.
* `toolkit.html` (`#toolkit-form`): its own Apps Script web app, which also sends the toolkit delivery email, plus Web-to-Lead.
* `careers.html` (`#careers-form`): its own Apps Script web app; the resume is base64-encoded in the browser and saved to Drive by the script. No Salesforce lead.

---

## Developer Guardrails for Claude Code

When writing code, building frontend components, or modifying configuration files for this project, always adhere to the following strict rules:

1. **Keep It Lightweight:** 
   * Do not introduce heavy frameworks (like React, Next.js, or complex backend node servers) unless explicitly requested. 
   * Default to clean HTML, CSS, vanilla JavaScript, or lightweight static generation.

2. **Strict Form Mapping:** 
   * Never alter or strip field `name=""` attributes on form inputs. The strategy call form uses these exact, case-sensitive names:
     * `Full name`
     * `Work email`
     * `Company`
     * `Team size`
     * `Industry`
     * `What are you looking for?`
     * `Tell us about your current pipeline`
   * Never rename the Apps Script JSON keys or the Salesforce Web-to-Lead field names listed above. The Sheet columns and Salesforce lead fields depend on them.
   * Keep the Industry dropdown `value` attributes as they are (`Dynamic Dapo`, `Careful Chioma`, `Other/Unclassified`). They are persona codes for the Salesforce `Persona__c` field, not display text.

3. **No Em Dashes & Clean Deliverables:**
   * Do not use em dashes (`—`) in user-facing copy, automated email responses, or documentation text.
   * Provide direct copy-pasteable code blocks without placeholder code truncation (`// ... rest of code`).

4. **DNS & Email Safety:**
   * All form components and scripts must operate securely under HTTPS.
   * Ensure any programmatic email triggers respect SPF/DKIM authentication rules for `apexflowspace.com`.

---

## Common Workflow Commands

```bash
# Initialize git repository (if starting fresh)
git init

# Add all files and commit
git add .
git commit -m "feat: setup apex flow lean stack foundation"

# Push updates to main GitHub repository
git push origin main
```
