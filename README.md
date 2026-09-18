# Aajhee admin web

Staff dashboard for the Aajhee API (`https://api.aajhee.com`). This is a separate Next.js app from:

- `aajhee-web` — consumer + merchant site
- `aajhee_admin` — Flutter admin (this app is the React equivalent)
- `Aajhee-backend` — Django API

## What it covers

- **Login** — staff JWT (`is_staff`) at `POST /api/admin/auth/token`
- **Dashboard** — platform stats, top businesses, quick actions
- **Businesses** — create/edit/delete, logo upload, nested branches
- **Branches** — address search via OpenStreetMap Nominatim (Germany)
- **Offers** — create/edit/delete, URL import, gallery, schedules, QR poster
- **Users** — search, filter, activate/deactivate, edit names
- **Categories** — create/edit/delete
- **Analytics** — overview, timeseries chart, recent activity
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

Admin login returns an access token only (about 60 minutes). After it expires, sign in again.
