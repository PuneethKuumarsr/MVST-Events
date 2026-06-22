# MVST Events

Phase 1 MVP dashboard for Mane Manege Vasavi Seva Trust (R) event registrations, payment tracking, treasurer verification, KIT issue, and WhatsApp follow-up.

Event date: Sunday, 02-Aug-2026.

## Data Flow

The React app reads registrations from the local Express backend:

- `GET /api/registrations` returns cached Google Sheets API data, loading it on first request.
- `POST /api/registrations/refresh` forces a fresh Google Sheets API read.

The backend uses Google Sheets API v4 with a service account. No Google credentials or API keys are included in frontend code.

Event mapping is intentionally fixed:

- Bhimaratha sheet = `Samoohika Bhimaratha Shanthi` = `Rs. 20,000`
- Shashtipoorthi sheet = `Samoohika Shashtipoorthi Shanthi` = `Rs. 30,000`

If the backend cannot read Google Sheets, the frontend falls back to the existing public CSV sheet access. API configuration warnings are hidden from end users by default. Developer-only details can be shown by setting VITE_DEVELOPER_MODE=true.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill `.env`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
BHIMARATHA_SHEET_ID=
SHASHTIPOORTHI_SHEET_ID=
GOOGLE_SHEETS_RANGE=Form Responses 1!A:Z
VITE_DEVELOPER_MODE=false
```

For `GOOGLE_PRIVATE_KEY`, keep the value on one line and preserve escaped newlines like `\n`.

## Google Cloud Setup

1. Open Google Cloud Console and create a new project for MVST Events.
2. Go to APIs & Services, then enable **Google Sheets API**.
3. Go to IAM & Admin, then Service Accounts.
4. Create a service account, for example `mvst-events-sheets-reader`.
5. Create a JSON key for the service account.
6. Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
7. Copy `private_key` into `GOOGLE_PRIVATE_KEY`.
8. Open both Google Sheets and share each sheet with the service account email as Viewer.
9. Copy each spreadsheet ID from the sheet URL into:
   - `BHIMARATHA_SHEET_ID`
   - `SHASHTIPOORTHI_SHEET_ID`

## Running Locally

Start the backend API in one terminal:

```bash
npm run server
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:5173
```

The frontend proxies `/api` requests to `http://127.0.0.1:4000` during local development.

## Verification

```bash
npm test
npm run build
```


