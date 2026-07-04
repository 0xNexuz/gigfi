# GigFi

GigFi is an offline-first smart invoicing and milestone escrow prototype for Africa's informal workforce.

## What is included

- Responsive premium fintech landing page
- Live client dashboard for creating a gig
- Feature-phone style artisan simulator for SMS/USSD acceptance
- Escrow ledger with mocked ALAT wallet, virtual account, and funds transfer flow
- Carbon, teal, and amber visual system

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Build

```bash
npm run build
```

## Demo flow

1. Create a gig from the client dashboard.
2. Reply `1` in the artisan simulator.
3. Mark the accepted job as complete.
4. Release funds from the escrow ledger.
