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
4. Upload the `hostinger-api` folder to your site, for example:
   - `public_html/api/index.php`
5. Set the frontend env:

```env
VITE_HOSTINGER_API_URL=https://your-domain.com/api/index.php
```

## Default test user

- Login ID: `system`
- Email: `system@lngrp`
- Password: `abcd`

## Notes

- The React app now targets the Hostinger API directly.
- The frontend sends the firm ID (`lnki`, `unit_1`, `unit_2`) as the tenant key.
- `app_records` stores the row data that used to live in spreadsheet tabs.
