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

function syncLogPath(): string {
    return __DIR__ . '/dpm_items_sheets_sync.log';
}

function logLine(string $traceId, string $event, array $data = []): void {
    $entry = [
        'ts' => gmdate('c'),
        'trace_id' => $traceId,
        'event' => $event,
        'data' => $data,
    ];
    $line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents(syncLogPath(), $line, FILE_APPEND);
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

function diagnose(array $args, array $cfg, string $traceId): void {
    $serviceAccountJsonPath =
        envFirst('GOOGLE_SERVICE_ACCOUNT_JSON')
        ?? (string)cfgGet($cfg, 'google.service_account_json', '');

    $report = [
        'ok' => true,
        'trace_id' => $traceId,
        'php' => [
            'version' => PHP_VERSION,
            'sapi' => PHP_SAPI,
            'allow_url_fopen' => (bool)ini_get('allow_url_fopen'),
        ],
        'ext' => [
            'curl' => function_exists('curl_init'),
            'openssl' => function_exists('openssl_sign'),
            'json' => function_exists('json_encode'),
            'pdo' => class_exists('PDO'),
            'pdo_mysql' => in_array('mysql', PDO::getAvailableDrivers(), true),
        ],
        'config' => [
            'has_sync_secret' => (envFirst('SYNC_SECRET') ?? (string)cfgGet($cfg, 'sync.secret', '')) !== '',
            'service_account_json' => $serviceAccountJsonPath,
            'service_account_json_exists' => $serviceAccountJsonPath !== '' ? is_file($serviceAccountJsonPath) : false,
            'service_account_json_readable' => $serviceAccountJsonPath !== '' ? is_readable($serviceAccountJsonPath) : false,
        ],
        'request' => [
            'firm_id' => $args['firm_id'] ?? null,
            'spreadsheet_id' => $args['spreadsheet_id'] ?? null,
            'sheet_name' => $args['sheet_name'] ?? null,
            'range' => $args['range'] ?? null,
        ],
    ];

    logLine($traceId, 'diagnose', $report);
    jsonOut($report);
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
    // Prefer cURL when available (many shared hostings disable allow_url_fopen).
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSeconds);
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($res === false) {
            throw new RuntimeException("HTTP POST failed: {$url} (status {$status}) {$err}");
        }
        $json = json_decode((string)$res, true);
        if (!is_array($json)) {
            throw new RuntimeException("Invalid JSON response from {$url} (status {$status})");
        }
        return [$status, $json];
    }

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
        throw new RuntimeException("HTTP POST failed: {$url} (status {$status}). If this is Hostinger, enable cURL or allow_url_fopen.");
    }
    $json = json_decode($res, true);
    if (!is_array($json)) {
        throw new RuntimeException("Invalid JSON response from {$url} (status {$status})");
    }
    return [$status, $json];
}

function httpGetJson(string $url, array $headers = [], int $timeoutSeconds = 25): array {
    // Prefer cURL when available (many shared hostings disable allow_url_fopen).
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeoutSeconds);
        if (!empty($headers)) {
            $hdrs = [];
            foreach ($headers as $k => $v) $hdrs[] = "{$k}: {$v}";
            curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrs);
        }
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($res === false) {
            throw new RuntimeException("HTTP GET failed: {$url} (status {$status}) {$err}");
        }
        $json = json_decode((string)$res, true);
        if (!is_array($json)) {
            throw new RuntimeException("Invalid JSON response from {$url} (status {$status})");
        }
        return [$status, $json];
    }

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
        throw new RuntimeException("HTTP GET failed: {$url} (status {$status}). If this is Hostinger, enable cURL or allow_url_fopen.");
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
    $traceId = bin2hex(random_bytes(8));
    $cfg = readConfig();
    $args = parseArgs();
    $debug = ($args['debug'] ?? '') === '1';
    $doDiagnose = ($args['diagnose'] ?? '') === '1';

    $secret = $args['secret'] ?? '';
    $expectedSecret = envFirst('SYNC_SECRET') ?? (string)cfgGet($cfg, 'sync.secret', '');
    if ($expectedSecret === '' || $secret === '' || !hash_equals($expectedSecret, $secret)) {
        logLine($traceId, 'unauthorized', ['remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null]);
        jsonOut(['ok' => false, 'error' => 'Unauthorized'], 401);
    }

    if ($doDiagnose) {
        diagnose($args, $cfg, $traceId);
    }

    $firmId = $args['firm_id'] ?? '';
    if ($firmId === '') {
        logLine($traceId, 'bad_request', ['missing' => 'firm_id']);
        jsonOut(['ok' => false, 'error' => 'firm_id is required'], 400);
    }

    $spreadsheetId = $args['spreadsheet_id'] ?? '';
    $sheetName = $args['sheet_name'] ?? 'Items';
    if ($spreadsheetId === '') {
        logLine($traceId, 'bad_request', ['missing' => 'spreadsheet_id']);
        jsonOut(['ok' => false, 'error' => 'spreadsheet_id is required'], 400);
    }

    $serviceAccountJsonPath =
        envFirst('GOOGLE_SERVICE_ACCOUNT_JSON')
        ?? (string)cfgGet($cfg, 'google.service_account_json', '');
    if ($serviceAccountJsonPath === '') {
        logLine($traceId, 'config_missing', ['missing' => 'GOOGLE_SERVICE_ACCOUNT_JSON|google.service_account_json']);
        jsonOut(['ok' => false, 'error' => 'GOOGLE_SERVICE_ACCOUNT_JSON (or config google.service_account_json) is required'], 500);
    }

    logLine($traceId, 'start', [
        'firm_id' => $firmId,
        'spreadsheet_id' => $spreadsheetId,
        'sheet_name' => $sheetName,
        'range' => $args['range'] ?? ($sheetName . '!A1:ZZ'),
        'service_account_json' => $serviceAccountJsonPath,
        'php_sapi' => PHP_SAPI,
    ]);

    $token = googleAccessTokenFromServiceAccount($serviceAccountJsonPath, [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
    ]);
    logLine($traceId, 'google_token_ok');

    $values = sheetValues([
        'spreadsheet_id' => $spreadsheetId,
        'sheet_name' => $sheetName,
        'range' => $args['range'] ?? null,
    ], $token);
    logLine($traceId, 'sheet_fetch_ok', ['rows' => is_array($values) ? count($values) : 0]);

    if (count($values) < 2) {
        logLine($traceId, 'no_rows');
        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'synced' => 0,
            'skipped' => 0,
            'note' => 'No data rows found.',
            'log_file' => $debug ? basename(syncLogPath()) : null,
        ]);
    }

    $headerRow = $values[0];
    $headerMap = headerIndexMap($headerRow);

    // Required headers in the sheet
    $erpHeader = isset($headerMap['erp code']) ? 'ERP CODE' : (isset($headerMap['erp']) ? 'ERP' : null);
    if ($erpHeader === null) {
        logLine($traceId, 'missing_header', ['need' => 'ERP CODE|ERP', 'headers' => $headerRow]);
        jsonOut(['ok' => false, 'error' => 'Sheet header must include "ERP CODE" (or "ERP").'], 400);
    }

    $pdo = pdoFromConfig($cfg);
    $pdo->exec("SET time_zone = '+05:30'");
    logLine($traceId, 'db_connected');

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

    logLine($traceId, 'done', ['synced' => $synced, 'skipped' => $skipped]);
    jsonOut([
        'ok' => true,
        'trace_id' => $traceId,
        'firm_id' => $firmId,
        'spreadsheet_id' => $spreadsheetId,
        'sheet_name' => $sheetName,
        'synced' => $synced,
        'skipped' => $skipped,
        'log_file' => $debug ? basename(syncLogPath()) : null,
    ]);
} catch (Throwable $e) {
    $traceId = $traceId ?? 'no-trace';
    logLine($traceId, 'error', ['message' => $e->getMessage()]);
    jsonOut(['ok' => false, 'trace_id' => $traceId, 'error' => $e->getMessage()], 500);
}
