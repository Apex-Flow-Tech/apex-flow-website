/**
 * Apex Flow: save careers-form resumes to Google Drive.
 *
 * This is the only Apps Script the website uses. It does one job: it takes
 * the resume file from the careers form, saves it in a Drive folder called
 * "Careers", and returns the file's Drive link. The website then sends the
 * application (with that link) to Salesforce and HubSpot. No data is kept
 * in a Google Sheet.
 *
 * Where this lives: the Apps Script project that careers.html posts to
 * (the form's action URL). Replace all the code in that project with this
 * file, then redeploy so the URL stays the same:
 *   Deploy > Manage deployments > edit (pencil) > Version: New version >
 *   Deploy. Approve the Google Drive permission when asked.
 * The deployment must run as you ("Execute as: Me") with access
 * "Anyone", so the website can reach it.
 *
 * The files stay private to your Google account. The link only opens for
 * people you share the Careers folder with.
 */

const CAREERS_FOLDER_NAME = 'Careers';
const MAX_BYTES = 5 * 1024 * 1024; // matches the 5MB limit on the website
const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.resumeBase64) return reply_({ result: 'error', error: 'No file' });

    const ext = ALLOWED_TYPES[data.resumeMimeType] || extensionOf_(data.resumeFileName);
    if (!ext) return reply_({ result: 'error', error: 'Only PDF or Word files are accepted' });

    const bytes = Utilities.base64Decode(data.resumeBase64);
    if (bytes.length > MAX_BYTES) return reply_({ result: 'error', error: 'File is over 5MB' });

    // Name files so they sort and read well in Drive, for example
    // "2026-11-09 Ada Obi - Content Creation Intern.pdf".
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const person = clean_([data.firstName, data.lastName].join(' ')) || 'Applicant';
    const role = clean_(data.role);
    const fileName = stamp + ' ' + person + (role ? ' - ' + role : '') + ext;

    const blob = Utilities.newBlob(bytes, data.resumeMimeType || 'application/octet-stream', fileName);
    const file = careersFolder_().createFile(blob);
    return reply_({ result: 'success', fileUrl: file.getUrl() });
  } catch (err) {
    console.error('Resume upload failed: ' + err);
    return reply_({ result: 'error', error: 'Upload failed' });
  }
}

function careersFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('CAREERS_FOLDER_ID');
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (err) { /* folder was removed; find or make it again */ }
  }
  const found = DriveApp.getFoldersByName(CAREERS_FOLDER_NAME);
  const folder = found.hasNext() ? found.next() : DriveApp.createFolder(CAREERS_FOLDER_NAME);
  props.setProperty('CAREERS_FOLDER_ID', folder.getId());
  return folder;
}

function extensionOf_(name) {
  const match = String(name || '').toLowerCase().match(/\.(pdf|docx?)$/);
  return match ? '.' + match[1] : '';
}

function clean_(text) {
  return String(text || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (select it, click Run) to check Drive
// access. It creates a tiny test file in Drive > Careers that you can delete.
function testSaveResume() {
  const res = doPost({ postData: { contents: JSON.stringify({
    firstName: 'Test', lastName: 'Applicant', role: 'Setup check',
    resumeBase64: Utilities.base64Encode('%PDF-1.4 test'), resumeFileName: 'test.pdf', resumeMimeType: 'application/pdf'
  }) } });
  console.log(res.getContent());
}
