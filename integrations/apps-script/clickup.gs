/**
 * Apex Flow: create a ClickUp task for every website strategy call and
 * clarity session request.
 *
 * Where this lives: paste this whole file into the Google Apps Script
 * project behind the "Book a Strategy Call" sheet (the web app that the
 * contact and clarity forms post to), as a new file named clickup.gs.
 *
 * One-time setup:
 *   1. ClickUp: avatar (bottom left) > Settings > Apps > API Token > Generate.
 *   2. Apps Script: Project Settings (gear icon) > Script Properties >
 *      Add script property. Property: CLICKUP_TOKEN, Value: the token.
 *   3. In your existing doPost(e), right after the line that parses the
 *      request body into an object (for example `const data = JSON.parse(...)`),
 *      add:   createClickUpLead(data);
 *   4. Deploy > Manage deployments > edit (pencil) > Version: New version >
 *      Deploy. The web app URL stays the same.
 *
 * The website sends these keys (see js/main.js):
 *   source       "Contact Form" or "Clarity Session Landing Page"
 *   firstName, lastName, fullName, workEmail, company
 *   teamSize, industry, lookingFor, pipeline        (strategy call)
 *   currentSetup (array), bottleneck                 (clarity session)
 *
 * Any problem here is logged and swallowed, so the Sheet log and the
 * website's reply are never affected.
 */

const CLICKUP_LIST_ID = '1200440000036776'; // AFT WORKFLOW > Growth & Marketing > Lead Generation
const CLICKUP_STATUS = 'new lead';

// Custom field IDs on the Lead Generation list.
const CU_FIELDS = {
  email: '2f64d664-ca11-422d-8068-1d449a4b8a57',          // Email contact
  company: '542aa1aa-4d11-4a6b-a797-8b4b058f48e4',        // Company Name
  webSource: '286d22a8-5ab9-4755-b989-335e950ff9ce',      // Web Source
  teamSize: '3a05f8d6-21be-471c-93a0-9a1973c39e55',       // Team Size
  industry: 'db6babb2-727a-4563-8eb8-665860b6c7b7',       // Industry
  serviceInterest: '68548aa1-5cd7-4b74-af76-d54992b4e3ea', // Service Interest
  pipeline: 'd52cee30-682d-4121-be3f-95b437c31e82',       // Current Pipeline
  currentSetup: '44a481bc-ee0c-4a81-b38d-cd8453bd07b2',   // Current Setup (labels)
  bottleneck: 'e0d32d59-f3e8-40a4-8b6c-7358cff9ca41',     // Biggest Bottleneck
  persona: '75893b95-5460-432a-a9a4-a05a486ee175'         // Persona (internal)
};

// Dropdown and label option IDs, keyed by the exact text the website sends.
const CU_OPTIONS = {
  webSource: {
    'Contact Form': 'bb64baad-cc6f-4d08-86c8-b6474c63fa45',
    'Clarity Session Landing Page': '9ea3720b-113f-4fa9-b6f0-976d2d6fc4f5'
  },
  teamSize: {
    '1–5': 'c12ade48-d6b6-4220-954d-dddf9e657489',
    '6–15': 'abe8917f-012e-4a55-9122-f594256b1365',
    '16–50': 'd5ecdf85-9486-4be5-b41c-a62f206d098a',
    '50+': 'fc799f77-e26b-4d0c-9ab1-4b6d1a1c4ad4'
  },
  industry: {
    'Real Estate': '11d58455-d89e-445b-afa1-b3b9a65e90aa',
    'Financial Services': '2e1bd5da-c8e7-46f2-acd3-3dd161a26214',
    'Other': '06e0070f-a719-43c3-8f01-7f903d4016a6'
  },
  serviceInterest: {
    'Launch Sprint (new CRM build)': 'dd0ab7a8-b043-4038-a110-2f05f7a72035',
    'Monthly Retainer (ongoing support)': 'db15ad02-19a7-46c9-bcb4-031b4695cd31',
    'Not sure yet': 'e3603005-c53f-4f77-abcb-5db4fd9d46e4',
    'Free Clarity Session': '02eaf6af-9eb8-4196-8c11-251224cb0de6'
  },
  currentSetup: {
    'Salesforce': '240b8444-52b9-425a-a323-110eb07634ca',
    'HubSpot': '234c63f1-b3e8-42c6-a736-c17e1b02364a',
    'Airtable / Notion': '95ac322e-bafb-4c58-9f8a-31d4ac4c8688',
    'Spreadsheets / WhatsApp': 'd6e56aae-3f0e-4349-b48f-bb9e00b54f34'
  },
  bottleneck: {
    'Leads slipping through the cracks': 'b08fe229-fa50-4ab0-b921-7a1b2cc81ea1',
    'Slow or missed follow-ups': '662a826c-535f-454b-a43f-6f908aa8640f',
    'Data scattered across tools': '3ca25413-b5fa-466f-83c5-58d9e61fbd92',
    'Too much manual data entry': '22800f4e-4417-486b-b261-ba22e8cda50e',
    'No clear pipeline reporting': '5fe1ca19-3a3a-4583-9d99-b130bbeee7ca',
    "Tools that don't talk to each other": 'c45bbb5d-4409-4445-a08d-3e180fbb1cee',
    'Something else': '9e0c211d-4d52-457e-91b9-c424b11b4d93'
  },
  persona: {
    'Dynamic Dapo': '3fd82cba-859a-4f4c-b468-94f7353fba91',
    'Careful Chioma': '1e3347bf-780a-40e5-afa7-c68083d75d1b',
    'Other/Unclassified': '5bac9016-748e-4d1d-8653-df4b051d4be9'
  }
};

// Same rule as the Salesforce Persona formula. Internal only.
function personaFor_(industry) {
  if (!industry) return '';
  if (industry === 'Real Estate') return 'Dynamic Dapo';
  if (industry === 'Financial Services') return 'Careful Chioma';
  return 'Other/Unclassified';
}

function buildClickUpTask_(data) {
  const source = data.source || '';
  const isClarity = source === 'Clarity Session Landing Page';
  const name = (data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ')).trim();
  const fields = [];
  const addText = (key, value) => { if (value) fields.push({ id: CU_FIELDS[key], value: String(value) }); };
  const addOption = (key, value) => {
    const optionId = CU_OPTIONS[key][value];
    if (optionId) fields.push({ id: CU_FIELDS[key], value: optionId });
  };

  addText('email', data.workEmail);
  addText('company', data.company);
  addOption('webSource', source);
  addOption('teamSize', data.teamSize);
  addOption('industry', data.industry);
  addOption('serviceInterest', data.lookingFor);
  addText('pipeline', isClarity ? '' : data.pipeline);
  const setupIds = (Array.isArray(data.currentSetup) ? data.currentSetup : [])
    .map((v) => CU_OPTIONS.currentSetup[v]).filter(Boolean);
  if (setupIds.length) fields.push({ id: CU_FIELDS.currentSetup, value: setupIds });
  addOption('bottleneck', data.bottleneck);
  addOption('persona', personaFor_(data.industry));

  const lines = [
    'New ' + (isClarity ? 'clarity session' : 'strategy call') + ' request from apexflowspace.com.',
    '',
    'Name: ' + name,
    'Email: ' + (data.workEmail || ''),
    'Company: ' + (data.company || '')
  ];
  if (isClarity) {
    lines.push('Current setup: ' + (Array.isArray(data.currentSetup) ? data.currentSetup.join(', ') : ''));
    lines.push('Biggest bottleneck: ' + (data.bottleneck || ''));
  } else {
    lines.push('Team size: ' + (data.teamSize || ''));
    lines.push('Industry: ' + (data.industry || ''));
    lines.push('Looking for: ' + (data.lookingFor || ''));
    lines.push('Current pipeline: ' + (data.pipeline || ''));
  }

  return {
    name: (isClarity ? 'Clarity Session: ' : 'Strategy Call: ') + name + (data.company ? ' (' + data.company + ')' : ''),
    description: lines.join('\n'),
    status: CLICKUP_STATUS,
    custom_fields: fields
  };
}

function createClickUpLead(data) {
  try {
    const source = data && data.source;
    if (source !== 'Contact Form' && source !== 'Clarity Session Landing Page') return;
    const token = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
    if (!token) { console.warn('CLICKUP_TOKEN script property is not set'); return; }
    const res = UrlFetchApp.fetch('https://api.clickup.com/api/v2/list/' + CLICKUP_LIST_ID + '/task', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: token },
      payload: JSON.stringify(buildClickUpTask_(data)),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) {
      console.error('ClickUp task failed: ' + res.getResponseCode() + ' ' + res.getContentText());
    }
  } catch (err) {
    console.error('ClickUp task error: ' + err);
  }
}

// Run this once from the Apps Script editor (select it, click Run) to
// check the setup. It creates one clearly marked test task you can delete.
function testCreateClickUpLead() {
  createClickUpLead({
    source: 'Contact Form', firstName: 'Test', lastName: 'Lead', fullName: 'Test Lead',
    workEmail: 'test@example.com', company: 'Test Company', teamSize: '1–5',
    industry: 'Real Estate', lookingFor: 'Not sure yet', pipeline: 'Setup test from Apps Script. Delete me.'
  });
}
