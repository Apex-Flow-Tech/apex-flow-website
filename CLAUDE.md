# Apex Flow Technologies — Workspace Context & Operational Guidelines

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
* **Primary Strategy Call Lead Capture:** Custom HTML/JS forms built natively into the static frontend.
* **Proxy / Middleware Endpoint:** `https://api.sheetmonkey.io/form/kKARMBfdx2GUonE3w1pAmu`
* **Lead Destination Target:** Direct POST routing to Google Sheets (`Book a Strategy Call Apex Flow LCF`), followed by syncs to HubSpot/Salesforce.

---

## Developer Guardrails for Claude Code

When writing code, building frontend components, or modifying configuration files for this project, always adhere to the following strict rules:

1. **Keep It Lightweight:** 
   * Do not introduce heavy frameworks (like React, Next.js, or complex backend node servers) unless explicitly requested. 
   * Default to clean HTML, CSS, vanilla JavaScript, or lightweight static generation.

2. **Strict Form Mapping:** 
   * Never alter or strip field `name=""` attributes on form inputs. 
   * Exact case-sensitive key parameters required for SheetMonkey/Sheet mapping:
     * `Full name`
     * `Work email`
     * `Company`
     * `Team size`
     * `Industry`
     * `What are you looking for?`
     * `Tell us about your current pipeline`
     * `Created` (`x-sheetmonkey-current-date-time`)

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
