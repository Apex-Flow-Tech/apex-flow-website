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
The site is static HTML/CSS/JS served from `apexflowspace.com` (see `CNAME`). There is no backend server. All form logic lives in `js/main.js`, with the destination IDs as constants at the top of the file.

Every lead-capture form sends each submission to up to three places in parallel:

1. **Salesforce Web-to-Lead (CRM of record):**
   * Org: Apex Flow Technologies, Enterprise Edition, org ID `00Dd3000009jvOL` (constant `SALESFORCE_ORG_ID`).
   * Endpoint: `https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8`, sent as a hidden form POST into a hidden iframe (`#sf-w2l-target`) because Web-to-Lead returns no CORS headers. Fire-and-forget; it must never block the visitor.
   * Standard fields: `first_name`, `last_name`, `email`, `company`, `industry`, `description`, `lead_source` = `Web`, `retURL`.
   * Custom Lead fields: `Team_Size__c` (text), `Service_Interest__c` (picklist), `Web_Source__c` (picklist: Contact Form, Clarity Session Landing Page, Resource Download, Newsletter). The permission set "Apex Flow Lead Fields" grants access to them.
   * `Persona__c` is a formula field calculated in Salesforce from Industry (Real Estate = Dynamic Dapo, Financial Services = Careful Chioma, any other industry = Other/Unclassified). The website never sends it.
2. **HubSpot (marketing engine):** account `149687015` (hello@apexflowspace.com, free plan, EU data centre). Submissions use the public Forms Submission API on the EU host: `https://api-eu1.hsforms.com/submissions/v3/integration/submit/{portal}/{formGuid}` (`HUBSPOT_SUBMIT_HOST`). The global `api.hsforms.com` host does not work for this account.
   * Each website form has its own HubSpot form (created through the HubSpot Forms API), with fields that match the website one-to-one:

     | HubSpot form | Constant | Form ID | HubSpot properties |
     |---|---|---|---|
     | Website Strategy Calls | `HUBSPOT_FORM_STRATEGY_CALLS` | `bac3661d-f083-41b6-8f96-e52249e04f82` | `firstname`, `lastname`, `email`, `company`, `team_size`, `industry`, `what_are_you_looking_for`, `tell_us_about_your_current_pipeline` |
     | Website Clarity Sessions | `HUBSPOT_FORM_CLARITY_SESSIONS` | `3a9b4e27-aa6a-4609-9c38-3103d50e7a7c` | `firstname`, `lastname`, `email`, `company`, `current_setup` (checkboxes, values joined with `;`), `biggest_bottleneck` |
     | Website Newsletter | `HUBSPOT_FORM_NEWSLETTER` | `284ca014-0dfe-4a6d-9930-d15ebf8c78b2` | `firstname`, `lastname`, `email` |
     | Website Toolkit Downloads | `HUBSPOT_FORM_TOOLKIT` | `ec0ec2d0-d252-4bac-a26a-dbb115f8aef0` | `firstname`, `lastname`, `email` |

   * Dropdown and checkbox values sent by the website must match the HubSpot property options exactly, or HubSpot drops them. Change both together.
   * The newsletter only shows "You're subscribed" after HubSpot accepts the sign-up. Other forms never wait on HubSpot before confirming. Every outside request has a time limit (`fetchWithTimeout`).
3. **Google Apps Script (Google Sheet log):** each form's `action` URL. Sent with `fetch()` as a raw JSON body with `Content-Type: text/plain;charset=utf-8` so it stays a CORS "simple request" (Apps Script cannot answer a preflight). Do not change it to `application/json`. The script replies `{"result":"success"}`.

| Form | Page | Salesforce `Web_Source__c` | HubSpot form | Apps Script |
|---|---|---|---|---|
| Strategy call (`#contact-form`) | `contact.html` | Contact Form | Website Strategy Calls | Yes |
| Clarity session (`#clarity-form`), then Calendly | `clarity-session.html` | Clarity Session Landing Page | Website Clarity Sessions | Yes (same script as contact) |
| Toolkit download (`#toolkit-form`) | `toolkit.html` | Resource Download | Website Toolkit Downloads | Yes (also sends the delivery email) |
| Newsletter (`#newsletter-form`) | footer of most pages | Newsletter | Website Newsletter | No |
| Careers (`#careers-form`) | `careers.html` | Not sent | Not sent | Yes (resume saved to Drive) |

**Names:** every form has separate First name and Last name boxes, both required. Apps Script payloads carry `firstName`, `lastName`, and the joined `fullName` (kept for the existing Sheet columns).

**Spam protection:** every form has its own Google reCAPTCHA v2 checkbox (site key `6LcRoLwtAAAAAHCXtfp3DCciyOM0YSAqbrWJXOzi`). Pages can hold two widgets, so the code reads the widget inside each form (`captchaFor_`), never the page's first one. `SALESFORCE_CAPTCHA_ENABLED` stays `false` and "Require reCAPTCHA Verification" stays off in Salesforce Web-to-Lead settings: the org silently drops leads that carry `captcha_settings` it doesn't expect.

---

## Developer Guardrails for Claude Code

When writing code, building frontend components, or modifying configuration files for this project, always adhere to the following strict rules:

1. **Keep It Lightweight:** 
   * Do not introduce heavy frameworks (like React, Next.js, or complex backend node servers) unless explicitly requested. 
   * Default to clean HTML, CSS, vanilla JavaScript, or lightweight static generation.

2. **Strict Form Mapping:**
   * Never alter or strip field `name=""` attributes on form inputs. The strategy call form uses these exact, case-sensitive names:
     * `First name`
     * `Last name`
     * `Work email`
     * `Company`
     * `Team size`
     * `Industry`
     * `What are you looking for?`
     * `Tell us about your current pipeline`
   * Never rename the Apps Script JSON keys, the HubSpot property names, or the Salesforce Web-to-Lead field names listed above. The Sheet columns, HubSpot contacts and Salesforce lead fields depend on them.
   * Industry dropdown values are the real industry names (`Real Estate`, `Financial Services`, `Other`). Buyer personas (Dynamic Dapo, Careful Chioma, Other/Unclassified) are internal only: never put them in website code, copy, or page source. Salesforce works them out from Industry.

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
