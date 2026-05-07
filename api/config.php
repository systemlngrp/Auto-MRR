<?php

return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        // Prefer environment variables on the server:
        // DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS (or MYSQL_* equivalents).
        // These placeholder defaults prevent committing real credentials.
        'database' => getenv('DB_NAME') ?: (getenv('MYSQL_DATABASE') ?: 'your_database_name'),
        'username' => getenv('DB_USER') ?: (getenv('MYSQL_USER') ?: 'your_database_user'),
        'password' => getenv('DB_PASS') ?: (getenv('MYSQL_PASSWORD') ?: 'your_database_password'),
        'charset' => 'utf8mb4',
    ],
    'cors' => [
        'allow_origin' => '*',
    ],
    'app' => [
        'timezone' => 'Asia/Kolkata',
    ],
];
