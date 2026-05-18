<?php

return [
    'db' => [
        // On most shared hosting this is `localhost`, but some providers give a host like `mysql.hostinger.com`.
        'host' => getenv('DB_HOST') ?: (getenv('MYSQL_HOST') ?: 'srv1644.hstgr.io'),
        'port' => (int)(getenv('DB_PORT') ?: (getenv('MYSQL_PORT') ?: 3306)),
        // Prefer environment variables on the server:
        // DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS (or MYSQL_* equivalents).
        // Defaults below are set for the current Hostinger DB/user. Prefer env vars on the server.
        'database' => getenv('DB_NAME') ?: (getenv('MYSQL_DATABASE') ?: 'u380633007_RMS'),
        'username' => getenv('DB_USER') ?: (getenv('MYSQL_USER') ?: 'u380633007_rms'),
        'password' => getenv('DB_PASS') ?: (getenv('MYSQL_PASSWORD') ?: '!Office2@'),
        'charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
    ],
    'cors' => [
        'allow_origin' => getenv('CORS_ALLOW_ORIGIN') ?: '*',
    ],
    'app' => [
        'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Kolkata',
    ],
    'sync' => [
        'secret' => getenv('SYNC_SECRET') ?: '1234567890',
    ],
    'google' => [
        'service_account_json' => getenv('GOOGLE_SERVICE_ACCOUNT_JSON') ?: (__DIR__ . '/dpm-item-sync-95d4106a07bf.json'),
    ],
];
