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
];

// Optional: you can also configure DB via environment variables instead of api/config.php:
// DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_CHARSET
// Also supported (common on platforms): MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD
// (Supported by api/index.php)
