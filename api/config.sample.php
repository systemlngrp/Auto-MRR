<?php

return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        // Set these in api/config.php on the server (do NOT commit api/config.php).
        'database' => 'your_database_name',
        'username' => 'your_database_user',
        'password' => 'your_database_password',
        'charset' => 'utf8mb4',
    ],
    'cors' => [
        'allow_origin' => '*',
    ],
    'app' => [
        'timezone' => 'Asia/Kolkata',
    ],
    'sync' => [
        // Protect sync endpoints with a shared secret. Set via env on server if possible.
        // Example: SYNC_SECRET=...
        'secret' => getenv('SYNC_SECRET') ?: 'CHANGE_ME',
    ],
    'google' => [
        // Service account JSON path for Google Sheets API access.
        // Recommended: set env on server: GOOGLE_SERVICE_ACCOUNT_JSON=/full/path/to/key.json
        // Fallback below assumes the key is placed beside api scripts or under api/private/.
        'service_account_json' => getenv('GOOGLE_SERVICE_ACCOUNT_JSON') ?: (__DIR__ . '/private/dpm-item-sync.json'),
    ],
];

// Optional: you can also configure DB via environment variables instead of api/config.php:
// DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_CHARSET
// Also supported (common on platforms): MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
// (Supported by api/index.php)
