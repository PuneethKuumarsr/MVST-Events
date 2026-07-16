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
GOOGLE_SHEETS_RANGE=Form Responses 1!A:AZ
AUTH_BOOTSTRAP_ADMIN_NAME=
AUTH_BOOTSTRAP_ADMIN_MOBILE=
AUTH_BOOTSTRAP_ADMIN_PIN=
MONGODB_URI=
MONGODB_DB=mvst_seva_portal
VITE_DEVELOPER_MODE=false
```

For `GOOGLE_PRIVATE_KEY`, keep the value on one line and preserve escaped newlines like `\n`.

Authentication is required before any dashboard content is shown. On first startup, the backend can create the initial PST Admin user from:

- `AUTH_BOOTSTRAP_ADMIN_NAME`
- `AUTH_BOOTSTRAP_ADMIN_MOBILE`
- `AUTH_BOOTSTRAP_ADMIN_PIN`

The PIN must be 4 or 6 digits. Only a scrypt hash is stored under `server/data/users.json`, which is ignored by Git. After the first PST Admin login, use **User Access** in the app to add volunteers, crew, reset PINs, or disable users.

## MongoDB Atlas Preparation

MongoDB is optional in this preparation phase. Google Sheets remains the source for registrations, donors, receipts, seats, WhatsApp workflows, and current event operations.

MongoDB is prepared only for:

- `users`
- `sessions`
- `qr_tokens`
- `distribution_logs`

No participant, donor, booking, receipt, payment, or sponsorship data is migrated to MongoDB.

### Folder Structure

- `server/db/mongo.js` - MongoDB connection helper.
- `server/models/User.js` - PST Admin, volunteer, and crew login users.
- `server/models/Session.js` - HttpOnly-cookie session backing store.
- `server/models/QrToken.js` - hashed QR-token metadata, one token per couple.
- `server/models/DistributionLog.js` - QR operation audit logs.

### Models

`users`

- `_id`
- `name`
- `mobile`
- `role` (`PST_ADMIN`, `VOLUNTEER`, `CREW`)
- `pinHash`
- `active`
- `lastLogin`
- `createdAt`
- `updatedAt`

`sessions`

- `tokenHash`
- `userId`
- `loginAt`
- `expiresAt`
- `lastActivity`

`qr_tokens`

- `tokenHash`
- `tokenVersion`
- `participantId`
- `eventType`
- `rowNumber`
- `active`
- `createdAt`
- `updatedAt`

`distribution_logs`

- `participantId`
- `eventType`
- `rowNumber`
- `operation`
- `status`
- `operatorUserId`
- `operatorName`
- `occurredAt`

### Atlas Setup Guide

1. Go to MongoDB Atlas and create a free account using the owner's email address.
2. Create a free M0 cluster.
3. Create a database user with a strong password. Do not reuse your Google password.
4. In Network Access, allow Render outbound access. For the first deployment you may use Atlas's `0.0.0.0/0` option, then restrict later if you move to fixed outbound IPs.
5. Copy the Node.js connection string.
6. Replace the password and database name in the connection string.
7. In Render, add:
   - `MONGODB_URI`
   - `MONGODB_DB=mvst_seva_portal`
   - `AUTH_BOOTSTRAP_ADMIN_NAME`
   - `AUTH_BOOTSTRAP_ADMIN_MOBILE`
   - `AUTH_BOOTSTRAP_ADMIN_PIN`
8. Deploy.
9. Login once as PST Admin.
10. Add volunteers and crew from **User Access**.

Do not commit the Atlas URI, database password, bootstrap mobile, bootstrap PIN, or generated user data.

### Local Development

Without `MONGODB_URI`, authentication falls back to the ignored local file:

```text
server/data/users.json
```

With `MONGODB_URI`, users and sessions are stored in MongoDB instead.

To verify the MongoDB foundation after adding Atlas credentials:

```bash
npm run verify:mongo
```

This verifies connection to `mvst_seva_portal`, creates/checks only:

- `users`
- `sessions`
- `qr_tokens`
- `distribution_logs`

It uses temporary synthetic records and deletes them after the check. It does not migrate Google Sheets data and does not create participant collections.

### Rollback Plan

If MongoDB is unavailable:

1. Remove or unset `MONGODB_URI`.
2. Restart the service.
3. The app falls back to the ignored local auth store.
4. Google Sheets data and all existing MVST workflows remain unchanged.

## Google Cloud Setup

1. Open Google Cloud Console and create a new project for MVST Events.
2. Go to APIs & Services, then enable **Google Sheets API**.
3. Go to IAM & Admin, then Service Accounts.
4. Create a service account, for example `mvst-events-sheets-reader`.
5. Create a JSON key for the service account.
6. Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
7. Copy `private_key` into `GOOGLE_PRIVATE_KEY`.
8. Open both Google Sheets and share each sheet with the service account email as Editor.
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


