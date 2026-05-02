# Hostinger API

This folder provides the `PHP + MySQL` backend used by the React app on Hostinger.

## Files

- `schema.sql`: database tables for users, records, and approval logs
- `config.sample.php`: copy to `config.php` and fill with your real database credentials
- `index.php`: single API endpoint compatible with the current frontend action flow

## Setup

1. Import `schema.sql` in Hostinger phpMyAdmin.
2. Copy `config.sample.php` to `config.php`.
3. Set your real DB password in `config.php`.
4. For normal Hostinger web hosting, set MySQL host to `localhost` in `config.php`.
5. If your deploy replaces `public_html` from the Vite `dist` folder, keep the real database credentials in `api-config.php` one level above `public_html`. The API will load that file automatically.
6. Upload the `api` folder to your site, for example:
   - `public_html/api/index.php`
7. Set the frontend env:

```env
VITE_HOSTINGER_API_URL=https://aqua-flamingo-710728.hostingersite.com//api/index.php
```

## Default test user

- Login ID: `system`
- Email: `system@lngrp`
- Password: `abcd`

## Notes

- The React app now targets the Hostinger API directly.
- The frontend sends the firm ID (`lnki`, `unit_1`, `unit_2`) as the tenant key.
- `app_records` stores the operational records used by the app.
- Save requests now write debug entries to `api/save-debug.log` beside `index.php`.
- Each save response includes a `trace_id` so you can match frontend saves with backend log lines.
- If the frontend shows `Backend returned an empty or invalid JSON response`, open `https://your-site/api/index.php?action=get_pending_ge&firm_id=lnki` directly in the browser. You should get JSON. If you get HTML or a blank page, `config.php` or PHP itself is failing before the API can respond.
- `npm run build` now copies the `api` folder into `dist/api` automatically, excluding `config.php`, so frontend-only deploys do not remove `api/index.php`.
