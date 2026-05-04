# Hostinger API

This folder provides the `PHP + MySQL` backend used by the React app on Hostinger.

## Files

- `schema.sql`: database tables for users, suppliers, PO rows, GE Entry, MRR parent/child rows, and approval logs
- `config.sample.php`: copy to `config.php` and fill with your real database credentials
- `index.php`: single API endpoint compatible with the current frontend action flow

## Setup

1. Import `schema.sql` in Hostinger phpMyAdmin.
2. Copy `config.sample.php` to `config.php`.
3. Set your real DB password in `config.php`.
4. For normal Hostinger web hosting, set MySQL host to `localhost` in `config.php`.
5. Upload the `api` folder to your site, for example:
   - `public_html/api/index.php`
6. Set the frontend env:

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
- The API now stores business data in dedicated tables:
- `suppliers`
- `reel_po_rows`
- `other_po_rows`
- `ge_entries`
- `reel_mrr_parents`
- `reel_mrr_children`
- `other_mrr_parents`
- `other_mrr_children`
- `app_records` remains in the schema only for backward compatibility and old data inspection.
- Save requests now write debug entries to `api/save-debug.log` beside `index.php`.
- Each save response includes a `trace_id` so you can match frontend saves with backend log lines.
- If the frontend shows `Backend returned an empty or invalid JSON response`, open `https://your-site/api/index.php?action=get_pending_ge&firm_id=lnki` directly in the browser. You should get JSON. If you get HTML or a blank page, `config.php` or PHP itself is failing before the API can respond.
