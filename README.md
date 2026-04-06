# Wayex Web Clone

A clone of the Wayex-style web dashboard: a full-stack stablecoin banking experience built on [Bridge.xyz](https://bridge.xyz) API infrastructure. Deposit fiat, hold stablecoins, spend with Visa, swap currencies, and earn yield — all from one app.

This project is not affiliated with Wayex; it recreates a similar product surface for development and demonstration.

## Features

- **Global Accounts** — USD and EUR virtual bank accounts with local payment rails (ACH, Wire, SEPA, PIX, SPEI, Faster Payments)
- **Deposit / On-Ramp** — Fund your account via bank transfer or crypto deposits across 10+ blockchains
- **Withdraw / Off-Ramp** — Cash out to any bank account worldwide
- **Visa Card** — Spend stablecoins at 200M+ merchants, with Apple Pay and Google Pay
- **Swap** — Instant conversion between fiat and crypto currencies
- **Earn** — Up to 5% APY on USDB stablecoin balances
- **KYC / Identity** — Built-in verification flow powered by Bridge

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Custom shadcn/ui-style components |
| Database | SQLite via Prisma 7 + LibSQL adapter |
| Auth | NextAuth.js v4 (credentials) |
| API | Bridge.xyz REST API |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Bridge.xyz](https://dashboard.bridge.xyz) API key

### Setup

```bash
# Clone and install
cd wayex-platform
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Bridge API key

# Set up database
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database path (default: `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Random secret for session encryption |
| `NEXTAUTH_URL` | App URL (default: `http://localhost:3000`) |
| `BRIDGE_API_KEY` | Your Bridge.xyz API key |
| `BRIDGE_API_URL` | Bridge API base URL (default: `https://api.bridge.xyz/v0`) |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login and registration pages
│   ├── (dashboard)/      # All dashboard pages
│   │   ├── dashboard/    # Main overview
│   │   ├── accounts/     # Global USD/EUR accounts
│   │   ├── deposit/      # On-ramp (fiat + crypto)
│   │   ├── withdraw/     # Off-ramp to bank
│   │   ├── card/         # Visa card management
│   │   ├── swap/         # Currency conversion
│   │   ├── earn/         # Yield and rewards
│   │   └── settings/     # Profile and KYC
│   └── api/              # Backend API routes
├── components/
│   ├── ui/               # Reusable UI primitives
│   └── layout/           # Sidebar, navigation
├── lib/
│   ├── bridge.ts         # Bridge.xyz API client
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # NextAuth configuration
│   └── utils.ts          # Helpers and formatters
└── types/
    └── bridge.ts         # Bridge API TypeScript types
```

## Bridge.xyz API Integration

The platform wraps the following Bridge API products:

| Product | Endpoints Used |
|---------|---------------|
| Customers | Create, get, update customers with KYC |
| Wallets | Create custodial wallets, check balances |
| Transfers | On-ramp, off-ramp, and crypto-to-crypto flows |
| Virtual Accounts | USD/EUR bank accounts with local rails |
| Cards | Provision Visa cards, freeze/unfreeze |
| Exchange Rates | Real-time rate quotes |
| Rewards | USDB yield tracking |

All Bridge API calls are made server-side through Next.js API routes, keeping your API key secure.

## License

MIT
