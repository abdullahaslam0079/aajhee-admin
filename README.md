# Aajhee admin web

Staff dashboard for the Aajhee API (`https://api.aajhee.com`). This is a separate Next.js app from:

- `aajhee-web` — consumer + merchant site
- `aajhee_admin` — Flutter admin (this app is the React equivalent)
- `Aajhee-backend` — Django API

## What it covers

- **Login** — staff JWT (`is_staff`) at `POST /api/admin/auth/token` (access + refresh)
- **Dashboard** — platform stats, commerce ops shortcuts, top businesses, quick actions
- **Businesses** — create/edit/delete, logo upload, nested branches, deal sources
- **Branches** — address search via OpenStreetMap Nominatim (Germany), fulfillment/contacts
- **Offers** — create/edit/delete, review queue (approve/reject/bulk), schedules, QR poster
- **Listings** — product catalog, stock, bulk discount, gallery
- **Orders** — status workflow, payment-proof review, CSV export, auto-refresh
- **Users** — search, filter, activate/deactivate, edit names
- **Categories** — flat list + hierarchical tree
- **Analytics** — overview (incl. orders/GMV/low stock), timeseries chart, recent activity
- English / German, light / dark / system theme

## Run locally

```bash
cd aajhee-admin
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You need a Django **staff** account (not a merchant). Create one with:

```bash
cd Aajhee-backend
python manage.py createsuperuser
```

To hit a local API:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

CORS already allows `localhost`. For a hosted admin domain, add it to `CORS_ALLOWED_ORIGINS` on the backend.

## Auth note

Admin login returns access + refresh JWTs. The admin app renews the access token
quietly before it expires; sign in again only if the refresh token is gone or revoked.
