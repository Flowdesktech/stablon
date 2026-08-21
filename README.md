# Stablon

Stablon is a Next.js application for business payments and invoicing. It combines
provider-backed money accounts and transfer workflows with client management,
professional PDF invoices, email delivery, recurring schedules, public payment
checkout, and payment reconciliation.

Payment availability depends on Bridge account eligibility, verification,
jurisdiction, currency, and current provider support.

## Product demo

[![Watch the Stablon product demo](https://img.youtube.com/vi/9MRQ-SHIgVA/maxresdefault.jpg)](https://youtu.be/9MRQ-SHIgVA)

[Watch the Stablon invoicing and business payments demo on YouTube](https://youtu.be/9MRQ-SHIgVA).

## Capabilities

- Supported USD, EUR, and GBP money accounts and local payment rails
- Bank and stablecoin deposit, withdrawal, conversion, and transaction workflows
- Firebase email/password and Google authentication, password recovery, server sessions, optional TOTP 2FA, and app lock
- Client records and business invoice profiles
- Itemized invoices with taxes, discounts, terms, due dates, and 15 exact HTML/CSS templates
- Matching browser previews and Chromium-generated, one-page A4 PDFs with overflow protection
- Resend email delivery with PDF attachments and secure public invoice links
- Weekly, biweekly, monthly, quarterly, and yearly recurring invoice schedules
- Bridge-powered invoice checkout and verified webhook reconciliation
- Public, rate-limited PDF invoice generator that does not store invoice data
- Super-admin user, wallet, transaction, and impersonation tools

## Architecture

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Firebase Authentication and Cloud Firestore
- Firebase Admin SDK for all server-side data access
- Bridge REST API for customers, verification, accounts, transfers, cards, and settlement
- Handlebars HTML templates with serverless Chromium for matching browser previews and PDFs
- Resend for contact and invoice email
- Vercel Cron for recurring invoice generation

Bridge credentials, Firebase Admin credentials, encryption keys, and webhook
verification stay server-side. Firestore client access is denied by the included
rules; application data is accessed through authorized server routes.

## Prerequisites

- Node.js 20.9 or newer
- npm
- Firebase project with Email/Password and Google Authentication plus Firestore enabled
- Bridge API credentials
- Optional: Resend account for email delivery
- Optional: NOWPayments credentials if virtual-account setup fees are enabled

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

PowerShell:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Generate a stable `APP_SECRET` before creating users with 2FA:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Do not rotate this value without a migration. It encrypts TOTP secrets stored in
Firestore, so changing it invalidates existing encrypted values.

## Environment variables

Start from `.env.example`, which documents defaults and feature-specific values.

### Required application configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web application ID |
| `FIREBASE_PROJECT_ID` | Firebase Admin service-account project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service-account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key with newlines escaped as `\n` |
| `APP_SECRET` | Stable encryption key material for protected account secrets |
| `BRIDGE_API_KEY` | Bridge server API key |

The optional Firebase web values `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` and
`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` can be copied from the same Firebase
web-app configuration.

### URLs and Bridge behavior

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URL for metadata, sitemap, and public links |
| `NEXT_PUBLIC_APP_URL` | Payment setup | Public callback base URL |
| `BRIDGE_API_URL` | No | Bridge API base; defaults to `https://api.bridge.xyz/v0` |
| `BRIDGE_ONRAMP_ADDRESS` | No | Default on-chain destination for virtual-account on-ramps |
| `BRIDGE_DEVELOPER_FEE_PERCENT` | No | Incoming virtual-account deposit fee |
| `NEXT_PUBLIC_BRIDGE_DEVELOPER_FEE_PERCENT` | No | UI mirror; keep equal to the server value |

### Invoice checkout and reconciliation

| Variable | Required | Purpose |
| --- | --- | --- |
| `BRIDGE_WEBHOOK_PUBLIC_KEY` | Checkout | Endpoint-specific RSA public key used to verify Bridge webhooks |
| `INVOICE_DEVELOPER_FEE_PERCENT` | No | Optional invoice settlement fee percentage from 0 to 10 |
| `INVOICE_BASE_URL` | Recurring email | Canonical base URL used in generated invoice links |

### Email delivery

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Email | Resend API key shared by contact and invoice delivery |
| `INVOICE_FROM_EMAIL` | Invoice email | Verified invoice sender identity |
| `CONTACT_FROM_EMAIL` | Contact form | Verified contact-form sender identity |
| `CONTACT_TO_EMAIL` | Contact form | Support inbox |

### Recurring invoices and anonymous PDFs

| Variable | Required | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | Recurring billing | Bearer secret for `/api/cron/recurring-invoices` |
| `INVOICE_GENERATOR_RATE_LIMIT` | No | Anonymous PDF requests per IP each hour |
| `INVOICE_RATE_LIMIT_SALT` | Recommended | Independent random salt for anonymous IP hashes |

### Optional virtual-account setup billing

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOWPAYMENTS_API_KEY` | Setup billing | NOWPayments API key |
| `NOWPAYMENTS_IPN_SECRET` | Setup billing | NOWPayments callback signature secret |
| `NOWPAYMENTS_API_URL` | No | Override for sandbox testing |
| `VIRTUAL_ACCOUNT_FEE_USD` | No | Server-side one-time setup fee |
| `NEXT_PUBLIC_VIRTUAL_ACCOUNT_FEE_USD` | No | UI mirror; keep equal to the server value |

## Firebase setup

1. Enable Email/Password and Google in Firebase Authentication.
2. Create a Cloud Firestore database.
3. Create a web application and copy its public configuration.
4. Create a service-account key for the Firebase Admin values.
5. Add local and deployed domains to Authentication → Authorized domains. Google popup sign-in
   fails with `auth/unauthorized-domain` when the current hostname is missing.
6. Deploy the included rules and indexes:

```bash
npx -y firebase-tools@latest deploy --only auth,firestore:rules,firestore:indexes
```

The rules intentionally deny direct client reads and writes. Do not loosen them
unless the application is redesigned to enforce equivalent per-document access.

## Invoice lifecycle

1. Configure an invoice business profile and default template.
2. Add a client.
3. Create a draft with line items, tax, discount, terms, currency, and due date.
4. Preview or download the PDF. Each invoice stores its selected design.
5. Send the invoice through Resend or share its unguessable public link.
6. For an eligible, verified sender, create a public checkout for the outstanding amount.
7. Reconcile Bridge transfer webhooks; completed transfers mark the linked invoice paid.
8. Void, duplicate, or update invoices as the business workflow requires.

Recurring schedules generate separate invoices with unique numbers. They do not
reuse a previous invoice document.

## Bridge webhook

Create a Bridge webhook endpoint for:

```text
https://your-domain.com/api/webhooks/bridge
```

Subscribe it to transfer events. Copy the endpoint's PEM `public_key` into
`BRIDGE_WEBHOOK_PUBLIC_KEY`, preserving newlines as `\n` in hosted environment
variables. Test delivery before enabling production traffic.

The handler verifies Bridge's RSA signature against the raw request body, rejects
stale events, and processes updates idempotently. Do not place this route behind a
proxy that rewrites the request body.

## Resend invoice delivery

1. Verify the sending domain in Resend.
2. Set `RESEND_API_KEY`.
3. Set `INVOICE_FROM_EMAIL`, for example
   `Stablon Invoices <invoices@example.com>`.
4. Set `INVOICE_BASE_URL` to the production application URL.
5. Send a test invoice and confirm both the PDF attachment and public link.

The business profile billing address is used for replies where configured.

## Recurring invoice cron

`vercel.json` runs the scheduler daily at `05:00 UTC`:

```text
GET /api/cron/recurring-invoices
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` in every production environment that can invoke the route.
Monitor function logs for generation or delivery failures. A generated invoice
can still exist when optional email delivery fails.

## Verification

Run the same checks before deployment:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover invoice calculations, schemas, recurring generation, public-token
security, Bridge webhook verification, and PDF rendering across all 15 templates.

## Vercel deployment

1. Import the repository into Vercel.
2. Add the required and feature-specific environment variables.
3. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, and `INVOICE_BASE_URL` to the production URL.
4. Keep `APP_SECRET` stable across deploys.
5. Deploy Firestore rules and indexes.
6. Add the production domain to Firebase Authorized domains.
7. Configure the Bridge webhook and Resend sender.
8. Confirm the recurring cron has access to `CRON_SECRET`.
9. Run a production invoice checkout and webhook test with provider test credentials before enabling users.

Next.js uses the standard `npm run build` command. The application is stateful
through Firebase; Vercel does not need a separate database.

## Operational security

- Every protected route verifies the Firebase session cookie server-side.
- Regulated payment mutations require an eligible, verified Bridge customer.
- Bridge write requests include idempotency keys.
- Public invoice tokens are unguessable and stored protected.
- Payment webhooks are signature-verified before reconciliation.
- TOTP secrets are encrypted with key material derived from `APP_SECRET`.
- Secrets and service-account values must never use the `NEXT_PUBLIC_` prefix.

## License

MIT
