# Hostinger API

This folder replaces the current Google Apps Script backend with a `PHP + MySQL` API that keeps the same action-style contract used by the React app.

## Files

- `schema.sql`: database tables for users, records, and approval logs
- `config.sample.php`: copy to `config.php` and fill with your real database credentials
- `index.php`: single API endpoint compatible with the current frontend action flow

## Setup

1. Import `schema.sql` in Hostinger phpMyAdmin.
2. Copy `config.sample.php` to `config.php`.
3. Set your real DB password in `config.php`.
4. Upload the `hostinger-api` folder to your site, for example:
   - `public_html/api/index.php`
5. Set the frontend env:

```env
VITE_HOSTINGER_API_URL=https://your-domain.com/api/index.php
```

## Notes

- The React app reuses the existing `sheetSync.js` flow.
- In Hostinger mode, the frontend sends the firm ID (`lnki`, `unit_1`, `unit_2`) as the tenant key.
- `app_records` acts like a database-backed replacement for the old sheet rows.
