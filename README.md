# Stablon

A full-stack stablecoin banking experience built on [Bridge.xyz](https://bridge.xyz) API infrastructure. Deposit fiat, hold stablecoins, spend with a Visa card, swap currencies, and earn yield — all from one app.

> This project recreates a similar product surface for development and demonstration, and is not affiliated with any existing brand.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Security & Authentication](#security--authentication)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Bridge.xyz Integration](#bridgexyz-integration)
- [Deploying to Vercel](#deploying-to-vercel)
- [Continuous Deployment (GitHub Actions)](#continuous-deployment-github-actions)
- [License](#license)

---

## Features

### Money movement
- **Global Accounts** — USD and EUR virtual bank accounts with local payment rails (ACH, Wire, SEPA, PIX, SPEI, Faster Payments).
- **Deposit / On-Ramp** — Fund via **bank transfer** or **on-chain** crypto deposits across 10+ blockchains.
- **Withdraw / Off-Ramp** — Cash out **to a bank account** or send **on-chain** to any external wallet (Ethereum, Solana, Polygon, Arbitrum, Base, Optimism, Avalanche).
- **Swap** — Instant conversion between fiat and crypto currencies.
- **Visa Card** — Spend stablecoins at 200M+ merchants; freeze/unfreeze instantly.
- **Earn** — Up to 5% APY on USDB stablecoin balances.

### Account & onboarding
- **Firebase Authentication** — Email/password sign-up and sign-in; the Firebase user is exchanged for an httpOnly session cookie for server-side authorization.
- **Auto customer linking** — A Bridge customer is created automatically at registration (best-effort), so users can start onboarding immediately.
- **KYC / Identity** — Built-in verification flow powered by Bridge, with graceful handling of existing/duplicate KYC links.
- **Feature gating** — Money-moving pages are locked (client- and server-side) until KYC is approved, with clear prompts to verify.

### Security
- **Two-Factor Authentication (2FA)** — TOTP enrollment via any authenticator app (Google Authenticator, 1Password, Authy), enforced as a post-sign-in gate before the session cookie is issued.
- **Recovery codes** — One-time backup codes issued at enrollment for account recovery.
- **Encrypted secrets** — TOTP secrets are encrypted at rest (AES-256-GCM) in Firestore.
- **Password management** — Self-service password change via Firebase reauthentication.

### UX
- **Toast notifications** — Consistent success/error feedback across all money-moving actions.
- **Responsive dashboard** — Modern, dark-themed UI with mobile navigation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Custom shadcn/ui-style components + Radix primitives |
| Data fetching | SWR |
| Database | Cloud Firestore (via Firebase Admin SDK) |
| Auth | Firebase Authentication (email/password) + httpOnly session cookies |
| 2FA | otplib (TOTP) + qrcode |
| API | Bridge.xyz REST API |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Firebase project](https://console.firebase.google.com) with **Email/Password** authentication enabled and a **Firestore** database
- A [Bridge.xyz](https://dashboard.bridge.xyz) API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add your Firebase web config, a Firebase Admin service account,
# your Bridge API key, and an APP_SECRET (see below)

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

**Firebase setup:**

- **Web config** (`NEXT_PUBLIC_FIREBASE_*`) — Firebase console → Project settings → *Your apps* → Web app.
- **Admin credentials** (`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`) — Project settings → *Service accounts* → **Generate new private key**. Keep the private key's newlines escaped as `\n` in the env var.
- **Enable Email/Password** — Authentication → Sign-in method.
- **Deploy Firestore rules** (all access is server-side via Admin, so client access is denied): `npx -y firebase-tools@latest deploy --only firestore:rules`.

> **Tip:** generate `APP_SECRET` with `openssl rand -base64 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Keep it stable — rotating it makes existing encrypted 2FA secrets undecryptable.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain (`<project>.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |
| `FIREBASE_PROJECT_ID` | Yes | Service account project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account private key (newlines escaped as `\n`) |
| `APP_SECRET` | Yes | Key material for at-rest encryption of 2FA secrets |
| `BRIDGE_API_KEY` | Yes | Your Bridge.xyz API key |
| `BRIDGE_API_URL` | No | Bridge API base URL (default: `https://api.bridge.xyz/v0`) |

---

## Security & Authentication

- **Sessions** — After signing in with Firebase, the client exchanges its Firebase ID token for a long-lived, httpOnly **session cookie** minted by the Firebase Admin SDK (`POST /api/auth/session`). Every protected API verifies this cookie server-side.
- **2FA (TOTP)** — When enabled, the session cookie is only issued after a valid 6-digit code (or single-use **recovery code**) is verified — so a Firebase sign-in alone can't unlock the app.
- **Secret encryption** — TOTP secrets are stored encrypted (AES-256-GCM) in Firestore using a key derived from `APP_SECRET`. The pending secret only becomes active after the first code is verified.
- **Server-side KYC enforcement** — Mutating Bridge routes require an authenticated user that is both linked to a Bridge customer and KYC-approved (`requireVerifiedCustomer`), so client-side gating can't be bypassed.
- **Locked-down Firestore** — All Firestore access goes through the Admin SDK; `firestore.rules` denies direct client access entirely.
- **Idempotency** — All Bridge `POST` requests automatically include an `Idempotency-Key`.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Login and registration pages
│   ├── (dashboard)/            # Authenticated app (gated by KYC)
│   │   ├── dashboard/          # Overview + account setup banner
│   │   ├── accounts/           # Global USD/EUR accounts
│   │   ├── deposit/            # On-ramp (bank + on-chain)
│   │   ├── withdraw/           # Off-ramp (bank + on-chain)
│   │   ├── card/               # Visa card management
│   │   ├── swap/               # Currency conversion
│   │   ├── earn/               # Yield and rewards
│   │   └── settings/           # Profile, KYC, security (password + 2FA)
│   └── api/
│       ├── auth/session/       # Exchange Firebase ID token ↔ session cookie
│       ├── register/           # Persist profile + auto Bridge customer
│       ├── customers/          # Link/get Bridge customer
│       ├── kyc/                # KYC link creation
│       ├── account/
│       │   └── 2fa/            # 2FA status, setup, verify, disable
│       ├── wallets/ accounts/ transfers/ external-accounts/
│       ├── cards/              # Provision + freeze/unfreeze + transactions
│       ├── rates/ rewards/     # Exchange rates and yield
├── components/
│   ├── ui/                     # Button, Card, Dialog, Input, Badge, Toast…
│   ├── layout/                 # Sidebar, FeatureGuard (KYC gate)
│   ├── settings/               # SecuritySection (password + 2FA dialogs)
│   └── auth-provider.tsx       # Firebase auth state context (useAuth)
├── hooks/
│   └── use-bridge.ts           # SWR hooks + action helpers (with toasts)
├── lib/
│   ├── firebase/
│   │   ├── client.ts           # Firebase web SDK (lazy, browser-only)
│   │   ├── admin.ts            # Firebase Admin SDK (lazy, server-only)
│   │   ├── server-auth.ts      # Verify session cookie → current user
│   │   └── auth-actions.ts     # Sign-in/up/out, password change (client)
│   ├── bridge.ts               # Bridge.xyz API client (+ idempotency)
│   ├── users.ts                # Firestore users/{uid} document helpers
│   ├── crypto.ts               # AES-256-GCM secret encryption
│   ├── totp.ts                 # TOTP generation/verification
│   ├── recovery-codes.ts       # Backup code generation/consumption
│   ├── api-guards.ts           # Auth + KYC route guards
│   ├── feature-access.ts       # Gated-route config
│   └── utils.ts                # Helpers and formatters
├── proxy.ts                    # Route protection (session-cookie presence)
└── types/
    └── bridge.ts               # Bridge API TypeScript types
```

---

## API Reference

All routes are server-side and require an authenticated session unless noted.

### Auth & account
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/session` | Exchange a Firebase ID token for a session cookie (enforces 2FA) |
| `DELETE` | `/api/auth/session` | Clear the session cookie (sign out) |
| `POST` | `/api/register` | Persist profile after sign-up (also links a Bridge customer) |
| `GET` | `/api/account/2fa` | Get 2FA enabled status |
| `POST` | `/api/account/2fa/setup` | Begin 2FA enrollment (returns QR + secret) |
| `POST` | `/api/account/2fa/verify` | Verify code, enable 2FA, return recovery codes |
| `POST` | `/api/account/2fa/disable` | Disable 2FA (TOTP or recovery code) |

> Password changes happen client-side through Firebase (`reauthenticate` + `updatePassword`), not via an API route.

### Bridge / money (KYC-approved only for `POST`)
| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/customers` | Get / create Bridge customer |
| `POST` | `/api/kyc` | Create a KYC verification link |
| `GET/POST` | `/api/wallets` | List / create custodial wallets |
| `GET/POST` | `/api/accounts` | List / create virtual bank accounts |
| `GET/POST` | `/api/transfers` | List / create transfers (on/off-ramp, on-chain) |
| `GET/POST` | `/api/external-accounts` | List / add external bank accounts |
| `GET/POST` | `/api/cards` | List / provision Visa cards |
| `POST` | `/api/cards/[cardId]/freeze` · `/unfreeze` | Freeze / unfreeze a card |
| `GET` | `/api/cards/[cardId]/transactions` | Card transaction history |
| `GET` | `/api/rates` | Exchange rate quotes |
| `GET` | `/api/rewards` · `/api/rewards/history` | Yield summary and history |

---

## Bridge.xyz Integration

The platform wraps the following Bridge API products:

| Product | Usage |
|---------|-------|
| Customers | Create, get, update customers with KYC |
| Wallets | Create custodial wallets, check balances |
| Transfers | On-ramp, off-ramp, and crypto-to-crypto/on-chain flows |
| Virtual Accounts | USD/EUR bank accounts with local rails |
| External Accounts | Linked bank accounts for withdrawals |
| Cards | Provision Visa cards, freeze/unfreeze |
| Exchange Rates | Real-time rate quotes |
| Rewards | USDB yield tracking |

All Bridge API calls are made server-side through Next.js API routes, keeping your API key secure. Every `POST` is sent with an `Idempotency-Key`.

---

## Deploying to Vercel

The Next.js app is hosted on **Vercel**; **Firebase** provides Auth + Firestore. State lives in Firebase, so there's no database to provision on Vercel — you only supply credentials as environment variables.

### 1. Prepare Firebase

- Enable **Email/Password** sign-in (Authentication → Sign-in method).
- Create a **Firestore** database.
- Deploy the locked-down rules: `npx -y firebase-tools@latest deploy --only firestore:rules` (or let the [GitHub Action](#continuous-deployment-github-actions) do it).
- After your first deploy, add your Vercel domain under Authentication → **Settings → Authorized domains**.

### 2. Import the project into Vercel

Choose one:

- **Git integration (recommended):** In the [Vercel dashboard](https://vercel.com/new), *Add New → Project* and import your Git repo. Vercel auto-detects Next.js — no build settings needed. Every push to the production branch deploys automatically; PRs get preview deployments.
- **CLI:** `npm i -g vercel`, then run `vercel` (preview) or `vercel --prod` from the project root.

### 3. Configure Vercel environment variables

In your Vercel project → **Settings → Environment Variables**, add every variable from the [Environment Variables](#environment-variables) table:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_*` | Your Firebase web config values |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Service account credentials (keep `\n` escapes in the private key) |
| `APP_SECRET` | a stable secret (`openssl rand -base64 32`) |
| `BRIDGE_API_KEY` | your Bridge API key |
| `BRIDGE_API_URL` | `https://api.bridge.xyz/v0` (optional) |

### 4. Deploy

Redeploy (Git integration deploys on push; or run `vercel --prod`). The default `next build` is used; `firebase-admin` is marked as server-external in `next.config.ts`.

> **Important:** `APP_SECRET` must stay stable across deploys — rotating it makes existing encrypted 2FA secrets undecryptable (affected users would need to re-enroll). When pasting `FIREBASE_PRIVATE_KEY` into Vercel, keep the newlines escaped as `\n`.

---

## Continuous Deployment (GitHub Actions)

`.github/workflows/deploy-firestore.yml` deploys the Firestore **security rules and indexes** to Firebase on every push to `main` that touches `firestore.rules`, `firestore.indexes.json`, or `firebase.json` (and can be run manually via *workflow_dispatch*). The Next.js app itself is deployed by Vercel's Git integration, not this workflow.

Configure these in your repo → **Settings → Secrets and variables → Actions**:

| Name | Kind | Value |
|------|------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | Secret | The full JSON of a service account key with permission to deploy Firestore rules (Firebase console → Project settings → *Service accounts* → **Generate new private key**) |
| `FIREBASE_PROJECT_ID` | Variable | Your Firebase project ID |

The workflow writes the service account JSON to a temp file, points `GOOGLE_APPLICATION_CREDENTIALS` at it, and runs `firebase deploy --only firestore`.

> Prefer to host the app on Firebase instead of Vercel? Firebase **App Hosting** supports Next.js SSR — see the [App Hosting docs](https://firebase.google.com/docs/app-hosting). That's a separate setup from this rules-only workflow.

---

## License

MIT
