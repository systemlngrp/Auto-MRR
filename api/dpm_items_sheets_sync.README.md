# DPM Items Sheets Sync

This sync pulls the latest rows from a Google Sheet tab and **upserts** them into the `dpm_items_master` table.

## What it writes

- Table: `dpm_items_master`
- Key: `(firm_id, erp)` (already unique in `schema.sql`)
- Updates: `item_name`, `customer_name`, `data_json`, `updated_at`
- Does **not** change: `stock`

## Requirements

1. Share your Google Sheet with your service account email:
   `dpm-item-sync@dpm-item-sync.iam.gserviceaccount.com`
2. Upload your service-account JSON to the server and set its path:
   - Environment variable: `GOOGLE_SERVICE_ACCOUNT_JSON=/full/path/to/dpm-item-sync.json`
   - Or add in `api/config.php`:

```php
'google' => [
  'service_account_json' => __DIR__ . '/private/dpm-item-sync.json',
],
'sync' => [
  'secret' => 'CHANGE_ME_LONG_RANDOM',
],
```

3. Set a secret (either env `SYNC_SECRET` or `api/config.php` `sync.secret`).

## Run (web)

Call (recommended from Hostinger Cron via URL fetch):

`/api/dpm_items_sheets_sync.php?firm_id=lnki&secret=YOUR_SECRET&spreadsheet_id=SPREADSHEET_ID&sheet_name=Items`

### Logging / Debug

The sync writes JSONL logs to: `api/dpm_items_sheets_sync.log`

To include the log filename in the JSON response, add `debug=1`:

`/api/dpm_items_sheets_sync.php?firm_id=lnki&secret=YOUR_SECRET&spreadsheet_id=SPREADSHEET_ID&sheet_name=Items&debug=1`

Every response includes a `trace_id`. Search that `trace_id` inside `dpm_items_sheets_sync.log` to see exactly where it failed (token, sheet fetch, DB, headers, etc.).

## Run (CLI)

`php dpm_items_sheets_sync.php --firm_id=lnki --secret=YOUR_SECRET --spreadsheet_id=SPREADSHEET_ID --sheet_name=Items`
