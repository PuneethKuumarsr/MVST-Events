import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const frontend = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');

assert.match(frontend, /id: 'bhimaratha',[\s\S]*1lAiv6mWGXtVlxZ-4p1krjhc3bmau_Pgl1PKq0GylnJw/, 'CSV fallback first Google Sheet must map to Bhimaratha');
assert.match(frontend, /id: 'shashtipoorthi',[\s\S]*1PyxCC2HN7hCls-xR8Ao62xVZbM6w0OEa8Ri_OUu7XQo/, 'CSV fallback second Google Sheet must map to Shashtipoorthi');
assert.match(frontend, /shashtipoorthi:[\s\S]*contribution: 30000/, 'Shashtipoorthi contribution must be 30000 in frontend');
assert.match(frontend, /bhimaratha:[\s\S]*contribution: 20000/, 'Bhimaratha contribution must be 20000 in frontend');
assert.match(frontend, /const eventType = source\.id;/, 'CSV fallback event type must be assigned from source sheet');
assert.match(frontend, /row\.eventType === activeEvent/, 'Tabs must filter participants by event type');
assert.match(frontend, /Source: \{participant\.sourceLabel\}/, 'Participant cards must show source sheet badge');
assert.doesNotMatch(frontend, /GOOGLE_SERVICE_ACCOUNT_EMAIL|GOOGLE_PRIVATE_KEY/, 'Frontend must not reference Google credentials');

assert.match(backend, /\.\.\.EVENTS\.bhimaratha,[\s\S]*spreadsheetId: process\.env\.BHIMARATHA_SHEET_ID/, 'Backend first Google Sheets API source must be Bhimaratha');
assert.match(backend, /\.\.\.EVENTS\.shashtipoorthi,[\s\S]*spreadsheetId: process\.env\.SHASHTIPOORTHI_SHEET_ID/, 'Backend second Google Sheets API source must be Shashtipoorthi');
assert.match(backend, /source\.contribution/, 'Backend must calculate contribution from source event');
assert.match(backend, /eventType: source\.id/, 'Backend must assign event type from source sheet');

console.log('Event mapping regression checks passed.');
