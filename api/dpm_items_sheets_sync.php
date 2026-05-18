<?php
declare(strict_types=1);

/**
 * Sync DPM items from Google Sheets into `dpm_items_master`.
 *
 * Supports:
 * - Web (GET):  /api/dpm_items_sheets_sync.php?firm_id=lnki&secret=...&spreadsheet_id=...&sheet_name=Items
 * - CLI: php dpm_items_sheets_sync.php --firm_id=lnki --secret=... --spreadsheet_id=... --sheet_name=Items
 *
 * Auth:
 * - `secret` must match SYNC_SECRET env var (or config 'sync.secret').
 *
 * Google:
 * - Service account JSON path from GOOGLE_SERVICE_ACCOUNT_JSON env var (or config 'google.service_account_json').
 */

function jsonOut(array $payload, int $status = 200): void {
    if (PHP_SAPI !== 'cli') {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (PHP_SAPI !== 'cli') echo "\n";
    exit;
}

function readConfig(): array {
    $cfgFile = __DIR__ . '/config.php';
    if (is_file($cfgFile)) {
        $cfg = require $cfgFile;
        return is_array($cfg) ? $cfg : [];
    }
    return [];
}

function cfgGet(array $cfg, string $path, $default = null) {
    $parts = explode('.', $path);
    $cur = $cfg;
    foreach ($parts as $p) {
        if (!is_array($cur) || !array_key_exists($p, $cur)) return $default;
        $cur = $cur[$p];
    }
    return $cur;
}

function envFirst(string ...$keys): ?string {
    foreach ($keys as $k) {
        $v = getenv($k);
        if ($v !== false && $v !== '') return (string)$v;
    }
    return null;
}

function parseArgs(): array {
    $out = [];
    if (PHP_SAPI === 'cli') {
        global $argv;
        foreach ($argv as $i => $arg) {
            if ($i === 0) continue;
            if (preg_match('/^--([^=]+)=(.*)$/', $arg, $m)) {
                $out[$m[1]] = $m[2];
            }
        }
    } else {
        foreach ($_GET as $k => $v) {
            if (is_string($v)) $out[$k] = $v;
        }
    }
    return $out;
}

function pdoFromConfig(array $cfg): PDO {
    $dbHost = envFirst('DB_HOST', 'MYSQL_HOST') ?? (string)cfgGet($cfg, 'db.host', 'localhost');
    $dbPort = envFirst('DB_PORT', 'MYSQL_PORT') ?? (string)cfgGet($cfg, 'db.port', 3306);
    $dbName = envFirst('DB_NAME', 'MYSQL_DATABASE') ?? (string)cfgGet($cfg, 'db.database', '');
    $dbUser = envFirst('DB_USER', 'MYSQL_USER') ?? (string)cfgGet($cfg, 'db.username', '');
    $dbPass = envFirst('DB_PASS', 'MYSQL_PASSWORD') ?? (string)cfgGet($cfg, 'db.password', '');
    $dbCharset = envFirst('DB_CHARSET') ?? (string)cfgGet($cfg, 'db.charset', 'utf8mb4');

    if ($dbName === '' || $dbUser === '') {
        throw new RuntimeException('Database config missing (DB_NAME/DB_USER or api/config.php).');
    }

    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset={$dbCharset}";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function httpPostForm(string $url, array $fields, int $timeoutSeconds = 25): array {
    $body = http_build_query($fields, '', '&');
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n" .
                "Content-Length: " . strlen($body) . "\r\n",
            'content' => $body,
            'timeout' => $timeoutSeconds,
        ],
    ];
    $ctx = stream_context_create($opts);
    $res = @file_get_contents($url, false, $ctx);
    $statusLine = is_array($http_response_header ?? null) ? ($http_response_header[0] ?? '') : '';
    $status = 0;
    if (preg_match('/\s(\d{3})\s/', $statusLine, $m)) $status = (int)$m[1];
    if ($res === false) {
        throw new RuntimeException("HTTP POST failed: {$url} (status {$status})");
    }
    $json = json_decode($res, true);
    if (!is_array($json)) {
        throw new RuntimeException("Invalid JSON response from {$url} (status {$status})");
    }
    return [$status, $json];
}

function httpGetJson(string $url, array $headers = [], int $timeoutSeconds = 25): array {
    $hdr = '';
    foreach ($headers as $k => $v) $hdr .= "{$k}: {$v}\r\n";
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => $hdr,
            'timeout' => $timeoutSeconds,
        ],
    ];
    $ctx = stream_context_create($opts);
    $res = @file_get_contents($url, false, $ctx);
    $statusLine = is_array($http_response_header ?? null) ? ($http_response_header[0] ?? '') : '';
    $status = 0;
    if (preg_match('/\s(\d{3})\s/', $statusLine, $m)) $status = (int)$m[1];
    if ($res === false) {
        throw new RuntimeException("HTTP GET failed: {$url} (status {$status})");
    }
    $json = json_decode($res, true);
    if (!is_array($json)) {
        throw new RuntimeException("Invalid JSON response from {$url} (status {$status})");
    }
    return [$status, $json];
}

function googleAccessTokenFromServiceAccount(string $serviceAccountJsonPath, array $scopes): string {
    if (!is_file($serviceAccountJsonPath)) {
        throw new RuntimeException("Service account JSON not found: {$serviceAccountJsonPath}");
    }

    $raw = file_get_contents($serviceAccountJsonPath);
    $sa = json_decode($raw ?: '', true);
    if (!is_array($sa)) throw new RuntimeException('Service account JSON is invalid.');
    $clientEmail = (string)($sa['client_email'] ?? '');
    $privateKey = (string)($sa['private_key'] ?? '');
    if ($clientEmail === '' || $privateKey === '') {
        throw new RuntimeException('Service account JSON missing client_email/private_key.');
    }

    $now = time();
    $claims = [
        'iss' => $clientEmail,
        'scope' => implode(' ', $scopes),
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];

    $jwtHeader = base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
    $jwtPayload = base64UrlEncode(json_encode($claims, JSON_UNESCAPED_SLASHES));
    $signingInput = $jwtHeader . '.' . $jwtPayload;

    $signature = '';
    $ok = openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    if (!$ok) throw new RuntimeException('Failed to sign JWT (openssl_sign failed).');

    $jwt = $signingInput . '.' . base64UrlEncode($signature);

    [, $resp] = httpPostForm('https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]);

    $token = (string)($resp['access_token'] ?? '');
    if ($token === '') {
        $err = json_encode($resp, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        throw new RuntimeException("Failed to obtain access token: {$err}");
    }
    return $token;
}

function sheetValues(array $params, string $accessToken): array {
    $spreadsheetId = $params['spreadsheet_id'] ?? '';
    $sheetName = $params['sheet_name'] ?? 'Items';
    $range = $params['range'] ?? ($sheetName . '!A1:ZZ');
    if ($spreadsheetId === '') throw new RuntimeException('spreadsheet_id is required.');

    $encodedRange = rawurlencode($range);
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$encodedRange}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE";
    [, $json] = httpGetJson($url, [
        'Authorization' => "Bearer {$accessToken}",
    ]);
    $values = $json['values'] ?? [];
    return is_array($values) ? $values : [];
}

function normStr($v): ?string {
    if ($v === null) return null;
    if (is_string($v)) {
        $t = trim($v);
        return $t === '' ? null : $t;
    }
    if (is_int($v) || is_float($v)) return (string)$v;
    return null;
}

function headerIndexMap(array $headerRow): array {
    $map = [];
    foreach ($headerRow as $i => $h) {
        $key = strtolower(trim((string)$h));
        if ($key === '') continue;
        // normalize multiple spaces and punctuation
        $key = preg_replace('/\s+/', ' ', $key);
        $map[$key] = $i;
    }
    return $map;
}

function rowToAssoc(array $row, array $headerRow): array {
    $assoc = [];
    foreach ($headerRow as $i => $h) {
        $k = trim((string)$h);
        if ($k === '') continue;
        $assoc[$k] = $row[$i] ?? null;
    }
    return $assoc;
}

function safeJsonEncode(array $data): string {
    return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

try {
    $cfg = readConfig();
    $args = parseArgs();

    $secret = $args['secret'] ?? '';
    $expectedSecret = envFirst('SYNC_SECRET') ?? (string)cfgGet($cfg, 'sync.secret', '');
    if ($expectedSecret === '' || $secret === '' || !hash_equals($expectedSecret, $secret)) {
        jsonOut(['ok' => false, 'error' => 'Unauthorized'], 401);
    }

    $firmId = $args['firm_id'] ?? '';
    if ($firmId === '') jsonOut(['ok' => false, 'error' => 'firm_id is required'], 400);

    $spreadsheetId = $args['spreadsheet_id'] ?? '';
    $sheetName = $args['sheet_name'] ?? 'Items';
    if ($spreadsheetId === '') jsonOut(['ok' => false, 'error' => 'spreadsheet_id is required'], 400);

    $serviceAccountJsonPath =
        envFirst('GOOGLE_SERVICE_ACCOUNT_JSON')
        ?? (string)cfgGet($cfg, 'google.service_account_json', '');
    if ($serviceAccountJsonPath === '') {
        jsonOut(['ok' => false, 'error' => 'GOOGLE_SERVICE_ACCOUNT_JSON (or config google.service_account_json) is required'], 500);
    }

    $token = googleAccessTokenFromServiceAccount($serviceAccountJsonPath, [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
    ]);
    $values = sheetValues([
        'spreadsheet_id' => $spreadsheetId,
        'sheet_name' => $sheetName,
        'range' => $args['range'] ?? null,
    ], $token);

    if (count($values) < 2) {
        jsonOut(['ok' => true, 'synced' => 0, 'skipped' => 0, 'note' => 'No data rows found.']);
    }

    $headerRow = $values[0];
    $headerMap = headerIndexMap($headerRow);

    // Required headers in the sheet
    $erpHeader = isset($headerMap['erp code']) ? 'ERP CODE' : (isset($headerMap['erp']) ? 'ERP' : null);
    if ($erpHeader === null) {
        jsonOut(['ok' => false, 'error' => 'Sheet header must include "ERP CODE" (or "ERP").'], 400);
    }

    $pdo = pdoFromConfig($cfg);
    $pdo->exec("SET time_zone = '+05:30'");

    $upsert = $pdo->prepare("
        INSERT INTO dpm_items_master (firm_id, erp, item_name, customer_name, data_json)
        VALUES (:firm_id, :erp, :item_name, :customer_name, :data_json)
        ON DUPLICATE KEY UPDATE
            item_name = VALUES(item_name),
            customer_name = VALUES(customer_name),
            data_json = VALUES(data_json),
            updated_at = CURRENT_TIMESTAMP
    ");

    $synced = 0;
    $skipped = 0;

    // Try to pull these standard fields from headers (fallbacks are fine).
    $itemNameKey = null;
    foreach (['item name', 'item_name', 'item'] as $k) {
        if (isset($headerMap[$k])) { $itemNameKey = $k; break; }
    }
    $companyKey = null;
    foreach (['company name', 'customer name', 'customer_name', 'party name'] as $k) {
        if (isset($headerMap[$k])) { $companyKey = $k; break; }
    }

    $pdo->beginTransaction();
    try {
        foreach (array_slice($values, 1) as $row) {
            if (!is_array($row)) continue;
            $assoc = rowToAssoc($row, $headerRow);

            $erpVal = null;
            if ($erpHeader === 'ERP CODE') $erpVal = normStr($assoc['ERP CODE'] ?? null);
            else $erpVal = normStr($assoc['ERP'] ?? null);

            if ($erpVal === null) { $skipped++; continue; }

            $itemName = null;
            if ($itemNameKey !== null) {
                $raw = $headerRow[(int)$headerMap[$itemNameKey]] ?? null;
                if (is_string($raw) && isset($assoc[$raw])) $itemName = normStr($assoc[$raw]);
            } else {
                $itemName = normStr($assoc['Item Name'] ?? null);
            }

            $customerName = null;
            if ($companyKey !== null) {
                $raw = $headerRow[(int)$headerMap[$companyKey]] ?? null;
                if (is_string($raw) && isset($assoc[$raw])) $customerName = normStr($assoc[$raw]);
            } else {
                $customerName = normStr($assoc['Company Name'] ?? null);
            }

            // Store full row in JSON, but keep it compact and stable.
            $dataJson = safeJsonEncode($assoc);

            $upsert->execute([
                'firm_id' => $firmId,
                'erp' => $erpVal,
                'item_name' => $itemName,
                'customer_name' => $customerName,
                'data_json' => $dataJson,
            ]);
            $synced++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonOut([
        'ok' => true,
        'firm_id' => $firmId,
        'spreadsheet_id' => $spreadsheetId,
        'sheet_name' => $sheetName,
        'synced' => $synced,
        'skipped' => $skipped,
    ]);
} catch (Throwable $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}

