<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function ensureSessionStarted(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        // Use secure defaults suitable for shared hosting; session cookie is only sent to this origin.
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        @session_start();
    }
}

function sessionAuth(): array
{
    ensureSessionStarted();
    return is_array($_SESSION['auth'] ?? null) ? $_SESSION['auth'] : [];
}

function requireAuthenticated(): array
{
    $auth = sessionAuth();
    $loginId = trim((string)($auth['login_id'] ?? ''));
    if ($loginId === '') {
        jsonOut(['ok' => false, 'error' => 'Authentication required. Please login again.'], 401);
    }
    return $auth;
}

function requireAdminForUsers(string $firmId): void
{
    $auth = sessionAuth();
    $loginId = trim((string)($auth['login_id'] ?? ''));
    $role = strtolower(trim((string)($auth['role'] ?? '')));
    $authFirm = trim((string)($auth['firm_id'] ?? ''));

    if ($loginId === '') {
        jsonOut(['ok' => false, 'error' => 'Authentication required. Please login again.'], 401);
    }
    if ($role !== 'admin') {
        jsonOut(['ok' => false, 'error' => 'Only Admin can view or update users.'], 403);
    }
    if ($authFirm !== '' && $authFirm !== $firmId) {
        jsonOut(['ok' => false, 'error' => 'Access denied for this firm.'], 403);
    }
}

const MRR_HEADERS = [
    'MRR Form ID', 'GE Entry', 'Date', 'MRR No', 'Dt. of Receipt', 'Sup Doc No', 'Truck Number',
    'Invoice Total Weight (kg)', 'Actual MRR Total Weight (kg)', 'Required Reels', 'Rows Added',
    'SUPPLIER', 'MRR TYPE', 'INVOICE BASIC VALUE', 'MRR BASIC VALUE', 'E-Way Bill No', 'E-Way Bill Date',
    'L.R. No', 'Plant Head Approval', 'Plant Head Approval Timestamp', 'Plant Head Approval User Email',
    'Plant Head Remark', 'Plant Head Reject Timestamp', 'Plant Head Reject usermail', 'Accounts Approval',
    'Accounts Approval Timestamp', 'Accounts Approval User Email', 'Accounts Remark', 'Accounts Reject Timestamp',
    'Acounts Reject usermail', 'Debit Note', 'Debit Note Date', 'Debit Note Amount', 'MD Approval',
    'MD Approval Timestamp', 'MD Approval User Email', 'MD Approval Remark', 'Md Reject Usermail',
    'Md Reject Timestamp', 'Pending Tally Posting Timestamp', 'Pending Tally Posting User Email', 'S.No',
    'Description', 'HSN', 'Sort', 'Party Order', 'PO NO.', 'PO DATE', 'PO DETAILS', 'PO RATE',
    'GSM', 'Size', 'Unit', 'Reels', 'Weight', 'Rate', 'Amount', 'QUANTITY', 'PO QUANTITY', 'Insurance', 'Round Off'
];

const HELPER_HEADERS = [
    'Helper Id', 'Mrr form Id', 'S NO.', 'MRR Number', 'PO DETAILS', 'PO NO.', 'Party Order No.', 'PO DATE',
    'SUPPLIER', 'Our Reel Number', 'Supplier Reel No.', 'Reel Details', 'ERP Code', 'Size', 'GSM', 'BF',
    'Weight', 'Rate', 'VALUE', 'PO RATE', 'Date', 'Dt of Receipts', 'Sup Doc No.', 'Plant Head Approval',
    'Plant Head Approval Timestamp', 'Plant Head Approval User Email', 'Plant Head Remark', 'Plant Head Reject Timestamp',
    'Plant Head Reject usermail', 'Accounts Approval', 'Accounts Approval Timestamp', 'Accounts Approval User Email',
    'Accounts Remark', 'Accounts Reject Timestamp', 'Acounts Reject usermail', 'Debit Note', 'Debit Note Date',
    'Debit Note Amount', 'MD Approval', 'MD Approval Timestamp', 'MD Approval User Email', 'MD Approval Remark',
    'Md Reject Usermail', 'Md Reject Timestamp', 'Pending Tally Posting Timestamp', 'Pending Tally Posting User Email',
    'GE Entry'
];

const GE_HEADERS = [
    'Timestamp', 'Date', 'GE Entry', 'Supplier Name', 'Invoice No', 'Total Invocie Value',
    'Truck No', 'Pic 1', 'Pic 2', 'Pic 3', 'Pic 4', 'Pic 5', 'Pic 6', 'Pic 7', 'Pic 8', 'MRR', 'MRR COMPLETE'
];

function jsonOut(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function createTraceId(): string
{
    try {
        return date('Ymd-His') . '-' . bin2hex(random_bytes(4));
    } catch (Throwable $e) {
        return date('Ymd-His') . '-' . substr(md5((string)mt_rand()), 0, 8);
    }
}

function getConfig(): array
{
    static $config = null;

    if (is_array($config)) {
        return $config;
    }

    // Load optional dotenv-style files so shared hosting (or local dev) can
    // configure DB credentials without Apache/nginx env var wiring.
    // Precedence: real environment variables win over dotenv values.
    $loadDotEnvFile = static function (string $path): void {
        if (!is_file($path) || !is_readable($path)) {
            return;
        }
        $lines = @file($path, FILE_IGNORE_NEW_LINES);
        if (!is_array($lines)) {
            return;
        }
        foreach ($lines as $line) {
            $line = trim((string)$line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            // Basic KEY=VALUE parsing with support for quoted values.
            $eqPos = strpos($line, '=');
            if ($eqPos === false) {
                continue;
            }
            $key = trim(substr($line, 0, $eqPos));
            if ($key === '' || !preg_match('/^[A-Z0-9_]+$/', $key)) {
                continue;
            }
            // Do not override already-defined env vars.
            if (getenv($key) !== false) {
                continue;
            }
            $rawValue = ltrim(substr($line, $eqPos + 1));
            $value = $rawValue;
            if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
                $quote = $value[0];
                $value = substr($value, 1);
                $end = strrpos($value, $quote);
                if ($end !== false) {
                    $value = substr($value, 0, $end);
                }
                if ($quote === '"') {
                    $value = str_replace(['\\n', '\\r', '\\t', '\\"', '\\\\'], ["\n", "\r", "\t", '"', '\\'], $value);
                }
            } else {
                // Strip inline comments like: KEY=value # comment
                $hashPos = strpos($value, ' #');
                if ($hashPos !== false) {
                    $value = substr($value, 0, $hashPos);
                }
                $value = rtrim($value);
            }

            $_ENV[$key] = $value;
            @putenv($key . '=' . $value);
        }
    };

    // Common locations: api/.env, project root .env, and optional prod override.
    $loadDotEnvFile(__DIR__ . '/.env');
    $loadDotEnvFile(dirname(__DIR__) . '/.env');
    $loadDotEnvFile(dirname(__DIR__) . '/.env.production');

    $env = static function (string $key): string {
        $value = getenv($key);
        if ($value !== false && trim((string)$value) !== '') return trim((string)$value);
        if (isset($_ENV[$key]) && trim((string)$_ENV[$key]) !== '') return trim((string)$_ENV[$key]);
        return '';
    };

    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        $configPath = __DIR__ . '/config.sample.php';
    }
    $loaded = null;
    if (file_exists($configPath)) {
        try {
            $loaded = require $configPath;
        } catch (Throwable $e) {
            throw new RuntimeException('Invalid API config file: ' . $e->getMessage(), 0, $e);
        }
    }

    if (!is_array($loaded)) {
        $loaded = [
            'app' => [],
            'cors' => [],
            'db' => [],
        ];
    }

    // Allow configuring the API via environment variables (useful on new deployments).
    // These override values from config.php/config.sample.php when present.
    // Support both the app's DB_* names and common platform MYSQL_* names.
    $dbEnvHost = $env('DB_HOST') !== '' ? $env('DB_HOST') : $env('MYSQL_HOST');
    $dbEnvPort = $env('DB_PORT') !== '' ? $env('DB_PORT') : $env('MYSQL_PORT');
    $dbEnvName = $env('DB_NAME') !== '' ? $env('DB_NAME') : $env('MYSQL_DATABASE');
    $dbEnvUser = $env('DB_USER') !== '' ? $env('DB_USER') : $env('MYSQL_USER');
    $dbEnvPass = $env('DB_PASS') !== '' ? $env('DB_PASS') : $env('MYSQL_PASSWORD');
    $dbEnvCharset = $env('DB_CHARSET');
    $corsEnvOrigin = $env('CORS_ALLOW_ORIGIN');
    $appEnvTimezone = $env('APP_TIMEZONE');

    $usedEnv = false;
    if ($corsEnvOrigin !== '') {
        $loaded['cors']['allow_origin'] = $corsEnvOrigin;
    }
    if ($appEnvTimezone !== '') {
        $loaded['app']['timezone'] = $appEnvTimezone;
    }
    if ($dbEnvHost !== '') $loaded['db']['host'] = $dbEnvHost;
    if ($dbEnvPort !== '' && ctype_digit($dbEnvPort)) $loaded['db']['port'] = (int)$dbEnvPort;
    if ($dbEnvName !== '') $loaded['db']['database'] = $dbEnvName;
    if ($dbEnvUser !== '') $loaded['db']['username'] = $dbEnvUser;
    if ($dbEnvPass !== '') $loaded['db']['password'] = $dbEnvPass;
    if ($dbEnvCharset !== '') $loaded['db']['charset'] = $dbEnvCharset;
    $usedEnv = $dbEnvHost !== '' || $dbEnvPort !== '' || $dbEnvName !== '' || $dbEnvUser !== '' || $dbEnvPass !== '' || $dbEnvCharset !== '';

    $loaded['_meta'] = [
        'config_source' => file_exists(__DIR__ . '/config.php') ? 'config.php' : (file_exists(__DIR__ . '/config.sample.php') ? 'config.sample.php' : 'none'),
        'config_path' => $configPath,
        'used_env' => $usedEnv,
    ];

    $hasDbDetails = trim((string)($loaded['db']['database'] ?? '')) !== '' && trim((string)($loaded['db']['username'] ?? '')) !== '' && trim((string)($loaded['db']['host'] ?? '')) !== '';
    if (!$hasDbDetails) {
        throw new RuntimeException('Missing API config. Create api/config.php OR set DB_HOST, DB_NAME, DB_USER, DB_PASS (and optionally DB_PORT).');
    }

    $timezone = trim((string)($loaded['app']['timezone'] ?? 'Asia/Kolkata'));
    if ($timezone === '') {
        $timezone = 'Asia/Kolkata';
    }
    date_default_timezone_set($timezone);

    $allowOrigin = trim((string)($loaded['cors']['allow_origin'] ?? '*'));
    header('Access-Control-Allow-Origin: ' . ($allowOrigin !== '' ? $allowOrigin : '*'));

    $host = trim((string)($loaded['db']['host'] ?? ''));
    if ($host === '') {
        throw new RuntimeException('Database host is missing in api/config.php.');
    }
    if (preg_match('#^https?://#i', $host)) {
        throw new RuntimeException('Database host must be a MySQL hostname like localhost, not a website URL.');
    }

    $database = trim((string)($loaded['db']['database'] ?? ''));
    $username = trim((string)($loaded['db']['username'] ?? ''));
    if ($database === '' || $username === '') {
        throw new RuntimeException('Database name and username are required in api/config.php.');
    }

    $config = $loaded;
    return $config;
}

function loggerPath(): string
{
    return __DIR__ . '/save-debug.log';
}

function loggerContextSummary(array $payload): array
{
    $invoice = is_array($payload['invoice'] ?? null) ? $payload['invoice'] : [];
    $packing = is_array($payload['packing'] ?? null) ? $payload['packing'] : [];
    $geEntry = is_array($payload['geEntry'] ?? null) ? $payload['geEntry'] : [];
    $users = is_array($payload['users'] ?? null) ? $payload['users'] : [];
    $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];
    $options = is_array($payload['options'] ?? null) ? $payload['options'] : [];

    return [
        'firm_id' => trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? $_GET['firm_id'] ?? $_GET['spreadsheetId'] ?? '')),
        'sheet_name' => trim((string)($payload['sheetName'] ?? $options['mrrSheetName'] ?? $_GET['sheet'] ?? $_GET['mrrSheet'] ?? '')),
        'helper_sheet_name' => trim((string)($options['helperSheetName'] ?? $_GET['helperSheet'] ?? '')),
        'mrr_number' => value($invoice, 'mrr_no', 'mrr_number', 'mrrNo') ?: value($packing, 'mrr_no', 'mrr_number'),
        'ge_no' => value($geEntry, 'ge_no') ?: value($invoice, 'ge_no') ?: value($packing, 'ge_no'),
        'invoice_no' => value($geEntry, 'invoice_no') ?: value($invoice, 'invoice_no'),
        'supplier' => value($geEntry, 'supplier') ?: value($invoice, 'supplier') ?: value($packing, 'supplier'),
        'users_count' => count($users),
        'rows_count' => count($rows),
    ];
}

function writeBackendLog(string $event, array $context = []): void
{
    $line = json_encode([
        'timestamp' => date('c'),
        'event' => $event,
        'context' => $context,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($line === false) {
        return;
    }

    @file_put_contents(loggerPath(), $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = getConfig();
    $db = $config['db'] ?? [];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'] ?? 'localhost',
        (int)($db['port'] ?? 3306),
        $db['database'] ?? '',
        $db['charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO($dsn, $db['username'] ?? '', $db['password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $e) {
        $message = $e->getMessage();
        // Make access-denied errors more actionable in the UI.
        if (stripos($message, 'SQLSTATE[HY000] [1045]') !== false || stripos($message, 'Access denied') !== false) {
            throw new RuntimeException('Database access denied (SQLSTATE 1045). Check DB_USER/DB_PASS and ensure the MySQL user has privileges on DB_NAME.', 0, $e);
        }
        throw $e;
    }

    return $pdo;
}

function readPayload(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '', true);
    if (is_array($decoded)) {
        return $decoded;
    }
    if (!empty($_POST['payload'])) {
        $formDecoded = json_decode((string)$_POST['payload'], true);
        if (is_array($formDecoded)) {
            return $formDecoded;
        }
    }
    return [];
}

function nowText(): string
{
    return date('d/m/Y H:i:s');
}

function value(array $row, string ...$keys): string
{
    foreach ($keys as $key) {
        if (!array_key_exists($key, $row)) {
            continue;
        }
        $val = $row[$key];
        if ($val === null) {
            continue;
        }
        $text = is_scalar($val) ? trim((string)$val) : '';
        if ($text !== '') {
            return $text;
        }
    }
    return '';
}

function numericSuffixMax(array $values, string $prefix = ''): int
{
    $max = 0;
    foreach ($values as $value) {
        $text = trim((string)$value);
        if ($prefix !== '' && stripos($text, $prefix) !== 0) {
            continue;
        }
        if (preg_match('/(\d+)(?!.*\d)/', $text, $m)) {
            $num = (int)$m[1];
            if ($num > $max) {
                $max = $num;
            }
        }
    }
    return $max;
}

function getNextSequenceValue(string $firmId, string $seqName, int $initialValue = 0): int
{
    $pdo = db();
    try {
        $pdo->beginTransaction();
        
        // Ensure row exists
        $stmt = $pdo->prepare("INSERT IGNORE INTO app_sequences (firm_id, seq_name, last_value) VALUES (:firm_id, :seq_name, :initial)");
        $stmt->execute(['firm_id' => $firmId, 'seq_name' => $seqName, 'initial' => $initialValue]);

        // Increment and get new value atomically
        $stmt = $pdo->prepare("UPDATE app_sequences SET last_value = last_value + 1 WHERE firm_id = :firm_id AND seq_name = :seq_name");
        $stmt->execute(['firm_id' => $firmId, 'seq_name' => $seqName]);

        $stmt = $pdo->prepare("SELECT last_value FROM app_sequences WHERE firm_id = :firm_id AND seq_name = :seq_name");
        $stmt->execute(['firm_id' => $firmId, 'seq_name' => $seqName]);
        $val = (int)$stmt->fetchColumn();
        
        $pdo->commit();
        return $val;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function fiscalYearText(DateTimeInterface $dt): string
{
    // India FY: Apr-Mar. Example: May 2026 => "26-27"
    $year = (int)$dt->format('Y');
    $month = (int)$dt->format('n');
    $startYear = $month >= 4 ? $year : ($year - 1);
    $endYear = $startYear + 1;
    return substr((string)$startYear, -2) . '-' . substr((string)$endYear, -2);
}

function nextSequenceNumber(string $firmId, string $prefix, string $table, string $column): int
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT {$column} AS code FROM {$table} WHERE firm_id = :firm_id AND {$column} LIKE :prefix ORDER BY id DESC LIMIT 200");
    $stmt->execute([
        'firm_id' => $firmId,
        'prefix' => $prefix . '%',
    ]);
    $values = array_map(static fn($row) => (string)($row['code'] ?? ''), $stmt->fetchAll());
    $max = numericSuffixMax($values, $prefix);
    return $max + 1;
}

function determinePendingStage(array $data): string
{
    $plant = strtolower(value($data, 'plant_head_approval'));
    $accounts = strtolower(value($data, 'accounts_approval'));
    $md = strtolower(value($data, 'md_approval'));
    $tallyAt = value($data, 'pending_tally_posting_timestamp');

    if ($plant === 'rejected' || $accounts === 'rejected' || $md === 'rejected') {
        return 'rejected';
    }
    if ($plant !== 'approved') {
        return 'pending_plant_head_approval';
    }
    if ($accounts !== 'approved') {
        return 'pending_accounts_approval';
    }
    if ($md !== 'approved') {
        return 'pending_md_approval';
    }
    if ($tallyAt === '') {
        return 'pending_tally_posting';
    }
    return 'completed';
}

function makeRecordGroupId(string $mrrNumber, string $geNo = ''): string
{
    $mrrNumber = trim($mrrNumber);
    $geNo = trim($geNo);
    if ($mrrNumber === '') {
        return $geNo;
    }
    if ($geNo === '') {
        return $mrrNumber;
    }
    return $geNo . '::' . $mrrNumber;
}

function upsertSupplierName(string $firmId, string $supplierName): void
{
    $supplierName = trim($supplierName);
    if ($supplierName === '') {
        return;
    }
    $stmt = db()->prepare("
        INSERT INTO suppliers (firm_id, supplier_name, active)
        VALUES (:firm_id, :supplier_name, 1)
        ON DUPLICATE KEY UPDATE
            active = 1,
            updated_at = CURRENT_TIMESTAMP
    ");
    $stmt->execute([
        'firm_id' => $firmId,
        'supplier_name' => $supplierName,
    ]);
}

function ensureReelStockSchema(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reel_issue_entries (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          firm_id VARCHAR(64) NOT NULL,
          job_no VARCHAR(120) NOT NULL,
          our_reel_no VARCHAR(120) NOT NULL,
          issue_weight DECIMAL(18,3) NOT NULL DEFAULT 0,
          issue_date VARCHAR(40) DEFAULT NULL,
          corrugation VARCHAR(120) DEFAULT NULL,
          erp_code VARCHAR(120) DEFAULT NULL,
          supplier_name VARCHAR(255) DEFAULT NULL,
          size_value VARCHAR(80) DEFAULT NULL,
          gsm_value VARCHAR(80) DEFAULT NULL,
          bf_value VARCHAR(80) DEFAULT NULL,
          rate_value DECIMAL(18,2) DEFAULT NULL,
          created_by VARCHAR(190) DEFAULT NULL,
          extra_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_reel_issue_reel (firm_id, our_reel_no),
          KEY idx_reel_issue_job (firm_id, job_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reel_return_entries (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          firm_id VARCHAR(64) NOT NULL,
          job_no VARCHAR(120) NOT NULL,
          our_reel_no VARCHAR(120) NOT NULL,
          return_weight DECIMAL(18,3) NOT NULL DEFAULT 0,
          return_date VARCHAR(40) DEFAULT NULL,
          corrugation VARCHAR(120) DEFAULT NULL,
          erp_code VARCHAR(120) DEFAULT NULL,
          supplier_name VARCHAR(255) DEFAULT NULL,
          size_value VARCHAR(80) DEFAULT NULL,
          gsm_value VARCHAR(80) DEFAULT NULL,
          bf_value VARCHAR(80) DEFAULT NULL,
          rate_value DECIMAL(18,2) DEFAULT NULL,
          created_by VARCHAR(190) DEFAULT NULL,
          extra_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_reel_return_reel (firm_id, our_reel_no),
          KEY idx_reel_return_job (firm_id, job_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function toDecimal(?string $value): float
{
    $text = trim((string)($value ?? ''));
    if ($text === '') {
        return 0.0;
    }
    $text = str_replace(',', '', $text);
    $num = (float)$text;
    return is_finite($num) ? $num : 0.0;
}

function fetchReelStockRows(string $firmId): array
{
    $pdo = db();
    ensureReelStockSchema($pdo);

    // Base: unique Our Reel No from MRR children.
    $stmt = $pdo->prepare("
        SELECT
          c.our_reel_no,
          c.erp_code,
          COALESCE(p.supplier_name, '') AS supplier_name,
          c.size_value,
          c.gsm_value,
          c.bf_value,
          c.weight_value,
          c.rate_value
        FROM reel_mrr_children c
        LEFT JOIN reel_mrr_parents p
          ON p.id = c.parent_id
         AND p.firm_id = c.firm_id
        WHERE c.firm_id = :firm_id
          AND LOWER(COALESCE(p.md_approval, '')) = 'approved'
          AND COALESCE(c.our_reel_no, '') <> ''
    ");
    $stmt->execute(['firm_id' => $firmId]);

    $base = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = trim((string)($row['our_reel_no'] ?? ''));
        if ($key === '') {
            continue;
        }
        if (!isset($base[$key])) {
            $base[$key] = [
                'our_reel_no' => $key,
                'erp' => trim((string)($row['erp_code'] ?? '')),
                'supplier' => trim((string)($row['supplier_name'] ?? '')),
                'size' => trim((string)($row['size_value'] ?? '')),
                'gsm' => trim((string)($row['gsm_value'] ?? '')),
                'bf' => trim((string)($row['bf_value'] ?? '')),
                'weight' => 0.0,
                'rate' => (float)($row['rate_value'] ?? 0),
            ];
        }
        $base[$key]['weight'] += (float)($row['weight_value'] ?? 0);
        if ($base[$key]['rate'] == 0.0 && $row['rate_value'] !== null) {
            $base[$key]['rate'] = (float)$row['rate_value'];
        }
    }

    // Issued / returned aggregates.
    $issued = [];
    $stmt = $pdo->prepare("
        SELECT our_reel_no, COALESCE(SUM(issue_weight), 0) AS issued_weight
        FROM reel_issue_entries
        WHERE firm_id = :firm_id
        GROUP BY our_reel_no
    ");
    $stmt->execute(['firm_id' => $firmId]);
    foreach ($stmt->fetchAll() as $row) {
        $key = trim((string)($row['our_reel_no'] ?? ''));
        if ($key !== '') {
            $issued[$key] = (float)($row['issued_weight'] ?? 0);
        }
    }

    $returned = [];
    $stmt = $pdo->prepare("
        SELECT our_reel_no, COALESCE(SUM(return_weight), 0) AS return_weight
        FROM reel_return_entries
        WHERE firm_id = :firm_id
        GROUP BY our_reel_no
    ");
    $stmt->execute(['firm_id' => $firmId]);
    foreach ($stmt->fetchAll() as $row) {
        $key = trim((string)($row['our_reel_no'] ?? ''));
        if ($key !== '') {
            $returned[$key] = (float)($row['return_weight'] ?? 0);
        }
    }

    $rows = [];
    foreach ($base as $key => $r) {
        $issuedW = (float)($issued[$key] ?? 0);
        $returnW = (float)($returned[$key] ?? 0);
        $available = max(0.0, (float)$r['weight'] - $issuedW + $returnW);
        $rows[] = [
            'our_reel_no' => $r['our_reel_no'],
            'erp' => $r['erp'],
            'supplier' => $r['supplier'],
            'size' => $r['size'],
            'gsm' => $r['gsm'],
            'bf' => $r['bf'],
            'weight' => (float)$r['weight'],
            'rate' => (float)$r['rate'],
            'issued_weight' => $issuedW,
            'return_weight' => $returnW,
            'available_weight' => $available,
        ];
    }

    usort($rows, static fn($a, $b) => strcasecmp((string)$a['our_reel_no'], (string)$b['our_reel_no']));
    return $rows;
}

function getAvailableWeightForReel(string $firmId, string $ourReelNo): float
{
    $pdo = db();
    ensureReelStockSchema($pdo);

    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(c.weight_value), 0) AS w
        FROM reel_mrr_children c
        LEFT JOIN reel_mrr_parents p ON p.id = c.parent_id AND p.firm_id = c.firm_id
        WHERE c.firm_id = :firm_id
          AND c.our_reel_no = :our_reel_no
          AND LOWER(COALESCE(p.md_approval, '')) = 'approved'
    ");
    $stmt->execute(['firm_id' => $firmId, 'our_reel_no' => $ourReelNo]);
    $base = (float)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(issue_weight), 0) AS w FROM reel_issue_entries WHERE firm_id = :firm_id AND our_reel_no = :our_reel_no");
    $stmt->execute(['firm_id' => $firmId, 'our_reel_no' => $ourReelNo]);
    $issued = (float)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(return_weight), 0) AS w FROM reel_return_entries WHERE firm_id = :firm_id AND our_reel_no = :our_reel_no");
    $stmt->execute(['firm_id' => $firmId, 'our_reel_no' => $ourReelNo]);
    $returned = (float)$stmt->fetchColumn();

    return max(0.0, $base - $issued + $returned);
}

function upsertRecord(array $record): void
{
    $pdo = db();
    $sql = "
        INSERT INTO app_records (
            firm_id, sheet_name, row_type, row_sort, record_group_id, mrr_number, ge_no, invoice_no,
            supplier, truck_no, pending_stage, date_value, approval_status_plant, approval_status_accounts,
            approval_status_md, tally_posted, data_json
        ) VALUES (
            :firm_id, :sheet_name, :row_type, :row_sort, :record_group_id, :mrr_number, :ge_no, :invoice_no,
            :supplier, :truck_no, :pending_stage, :date_value, :approval_status_plant, :approval_status_accounts,
            :approval_status_md, :tally_posted, :data_json
        )
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($record);
}

function deleteSheetRows(string $firmId, string $sheetName, string $mrrNumber, array $rowTypes, ?string $geNo = null): void
{
    $pdo = db();
    $placeholders = implode(',', array_fill(0, count($rowTypes), '?'));
    $sql = "DELETE FROM app_records WHERE firm_id = ? AND sheet_name = ? AND mrr_number = ? AND row_type IN ($placeholders)";
    $params = [$firmId, $sheetName, $mrrNumber];
    if ($geNo !== null && trim($geNo) !== '') {
        $sql .= " AND ge_no = ?";
        $params[] = $geNo;
    }
    $params = array_merge($params, $rowTypes);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

function fetchRecordRows(string $firmId, string $sheetName, ?string $mrrNumber = null, ?string $geNo = null): array
{
    $pdo = db();
    $sql = "SELECT * FROM app_records WHERE firm_id = :firm_id AND sheet_name = :sheet_name";
    $params = [
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
    ];
    if ($mrrNumber !== null && $mrrNumber !== '') {
        $sql .= " AND mrr_number = :mrr_number";
        $params['mrr_number'] = $mrrNumber;
    }
    if ($geNo !== null && $geNo !== '') {
        $sql .= " AND ge_no = :ge_no";
        $params['ge_no'] = $geNo;
    }
    $sql .= " ORDER BY mrr_number DESC, row_sort ASC, id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function decodeData(array $dbRow): array
{
    $decoded = json_decode((string)($dbRow['data_json'] ?? '{}'), true);
    return is_array($decoded) ? $decoded : [];
}

function decodeExtraJson(array $row, string $field = 'extra_json'): array
{
    $decoded = json_decode((string)($row[$field] ?? '{}'), true);
    return is_array($decoded) ? $decoded : [];
}

function isHelperSheetName(string $sheetName): bool
{
    return stripos($sheetName, 'HELPER') !== false || stripos($sheetName, 'OTHER ITEMS') !== false;
}

function isPoSheetName(string $sheetName): bool
{
    return strcasecmp($sheetName, 'PO DETAILS') === 0 || strcasecmp($sheetName, 'OTHER PO') === 0;
}

function isOtherModeSheetName(string $sheetName): bool
{
    return stripos($sheetName, 'OTHER') !== false;
}

function mrrParentTableForSheet(string $sheetName): string
{
    return isOtherModeSheetName($sheetName) ? 'other_mrr_parents' : 'reel_mrr_parents';
}

function mrrChildTableForSheet(string $sheetName): string
{
    return isOtherModeSheetName($sheetName) ? 'other_mrr_children' : 'reel_mrr_children';
}

function poTableForSheet(string $sheetName): string
{
    return strcasecmp($sheetName, 'OTHER PO') === 0 ? 'other_po_rows' : 'reel_po_rows';
}

function tableColumns(string $tableName, bool $forceRefresh = false): array
{
    static $cache = [];
    if (!$forceRefresh && isset($cache[$tableName])) {
        return $cache[$tableName];
    }
    $stmt = db()->query("DESCRIBE {$tableName}");
    $cache[$tableName] = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    return $cache[$tableName];
}

function constraintExists(PDO $pdo, string $tableName, string $constraintName): bool
{
    try {
        $stmt = $pdo->prepare("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND CONSTRAINT_NAME = :constraint_name
            LIMIT 1
        ");
        $stmt->execute(['table_name' => $tableName, 'constraint_name' => $constraintName]);
        return (bool)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

function ensurePurchaseRelations(PDO $pdo): void
{
    // Columns
    $prItemCols = tableColumns('purchase_request_items');
    if (!in_array('item_id', $prItemCols, true)) {
        $pdo->exec("ALTER TABLE purchase_request_items ADD COLUMN item_id BIGINT UNSIGNED DEFAULT NULL AFTER pr_id");
        tableColumns('purchase_request_items', true);
    }

    $poItemCols = tableColumns('purchase_order_items');
    if (!in_array('pr_item_id', $poItemCols, true)) {
        $pdo->exec("ALTER TABLE purchase_order_items ADD COLUMN pr_item_id BIGINT UNSIGNED DEFAULT NULL AFTER po_id");
        tableColumns('purchase_order_items', true);
        $poItemCols = tableColumns('purchase_order_items');
    }
    if (!in_array('item_id', $poItemCols, true)) {
        $pdo->exec("ALTER TABLE purchase_order_items ADD COLUMN item_id BIGINT UNSIGNED DEFAULT NULL AFTER pr_item_id");
        tableColumns('purchase_order_items', true);
    }

    // Foreign keys (best effort, only add if missing).
    // Use stable names so we can check existence.
    if (!constraintExists($pdo, 'purchase_request_items', 'fk_pr_items_pr')) {
        try {
            $pdo->exec("ALTER TABLE purchase_request_items ADD CONSTRAINT fk_pr_items_pr FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE");
        } catch (Throwable $e) {
        }
    }
    if (!constraintExists($pdo, 'purchase_request_items', 'fk_pr_items_item')) {
        try {
            $pdo->exec("ALTER TABLE purchase_request_items ADD CONSTRAINT fk_pr_items_item FOREIGN KEY (item_id) REFERENCES item_master(id)");
        } catch (Throwable $e) {
        }
    }
    if (!constraintExists($pdo, 'purchase_orders', 'fk_pos_pr')) {
        try {
            $pdo->exec("ALTER TABLE purchase_orders ADD CONSTRAINT fk_pos_pr FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE SET NULL");
        } catch (Throwable $e) {
        }
    }
    if (!constraintExists($pdo, 'purchase_order_items', 'fk_po_items_po')) {
        try {
            $pdo->exec("ALTER TABLE purchase_order_items ADD CONSTRAINT fk_po_items_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE");
        } catch (Throwable $e) {
        }
    }
    if (!constraintExists($pdo, 'purchase_order_items', 'fk_po_items_pr_item')) {
        try {
            $pdo->exec("ALTER TABLE purchase_order_items ADD CONSTRAINT fk_po_items_pr_item FOREIGN KEY (pr_item_id) REFERENCES purchase_request_items(id) ON DELETE SET NULL");
        } catch (Throwable $e) {
        }
    }
    if (!constraintExists($pdo, 'purchase_order_items', 'fk_po_items_item')) {
        try {
            $pdo->exec("ALTER TABLE purchase_order_items ADD CONSTRAINT fk_po_items_item FOREIGN KEY (item_id) REFERENCES item_master(id)");
        } catch (Throwable $e) {
        }
    }
}

function resolveItemId(PDO $pdo, string $firmId, string $itemType, string $erpCode, string $itemName): int
{
    $type = $itemType !== '' ? $itemType : 'mrr';
    $code = trim($erpCode);
    $name = trim($itemName);
    if ($code === '' && $name === '') return 0;

    if ($code !== '') {
        $stmt = $pdo->prepare("
            SELECT id FROM item_master
            WHERE firm_id = :firm_id
              AND item_type = :item_type
              AND erp_code = :erp_code
            LIMIT 1
        ");
        $stmt->execute(['firm_id' => $firmId, 'item_type' => $type, 'erp_code' => $code]);
        $id = (int)($stmt->fetchColumn() ?: 0);
        if ($id > 0) return $id;
    }

    if ($name !== '') {
        $stmt = $pdo->prepare("
            SELECT id FROM item_master
            WHERE firm_id = :firm_id
              AND item_type = :item_type
              AND item_name = :item_name
            LIMIT 1
        ");
        $stmt->execute(['firm_id' => $firmId, 'item_type' => $type, 'item_name' => $name]);
        return (int)($stmt->fetchColumn() ?: 0);
    }

    return 0;
}

function hydrateMrrParentRow(array $row): array
{
    $data = decodeExtraJson($row);
    return array_merge($data, [
        'record_group_id' => $row['record_group_id'] ?? ($data['record_group_id'] ?? ''),
        'ge_no' => $row['ge_no'] ?? ($data['ge_no'] ?? ''),
        'mrr_number' => $row['mrr_no'] ?? ($data['mrr_number'] ?? ($data['mrr_no'] ?? '')),
        'mrr_no' => $row['mrr_no'] ?? ($data['mrr_no'] ?? ($data['mrr_number'] ?? '')),
        'mrr_form_id' => $row['mrr_form_id'] ?? ($data['mrr_form_id'] ?? ''),
        'date' => $row['entry_date'] ?? ($data['date'] ?? ''),
        'dt_of_receipt' => $row['receipt_date'] ?? ($data['dt_of_receipt'] ?? ''),
        'supplier' => $row['supplier_name'] ?? ($data['supplier'] ?? ''),
        'sup_doc_no' => $row['supplier_doc_no'] ?? ($data['sup_doc_no'] ?? ''),
        'truck_number' => $row['truck_no'] ?? ($data['truck_number'] ?? ''),
        'invoice_ttl_weight_kgs' => isset($row['invoice_total_weight']) ? (string)$row['invoice_total_weight'] : ($data['invoice_ttl_weight_kgs'] ?? ''),
        'actual_mrr_ttl_weight_kgs' => isset($row['actual_mrr_total_weight']) ? (string)$row['actual_mrr_total_weight'] : ($data['actual_mrr_ttl_weight_kgs'] ?? ''),
        'required_reel' => isset($row['required_reels']) ? (string)$row['required_reels'] : ($data['required_reel'] ?? ''),
        'rows_added' => isset($row['rows_added']) ? (string)$row['rows_added'] : ($data['rows_added'] ?? ''),
        'mrr_entry_type' => $row['mrr_type'] ?? ($data['mrr_entry_type'] ?? ''),
        'invoice_basic_value' => isset($row['invoice_basic_value']) ? (string)$row['invoice_basic_value'] : ($data['invoice_basic_value'] ?? ''),
        'mrr_basic_value' => isset($row['mrr_basic_value']) ? (string)$row['mrr_basic_value'] : ($data['mrr_basic_value'] ?? ''),
        'e_way_bill_no' => $row['e_way_bill_no'] ?? ($data['e_way_bill_no'] ?? ''),
        'e_way_date' => $row['e_way_date'] ?? ($data['e_way_date'] ?? ''),
        'l_r_no' => $row['lr_no'] ?? ($data['l_r_no'] ?? ''),
        'insurance' => isset($row['insurance']) ? (string)$row['insurance'] : ($data['insurance'] ?? ''),
        'round_off' => isset($row['round_off']) ? (string)$row['round_off'] : ($data['round_off'] ?? ''),
        'plant_head_approval' => $row['plant_head_approval'] ?? ($data['plant_head_approval'] ?? ''),
        'accounts_approval' => $row['accounts_approval'] ?? ($data['accounts_approval'] ?? ''),
        'md_approval' => $row['md_approval'] ?? ($data['md_approval'] ?? ''),
        'pending_stage' => $row['pending_stage'] ?? ($data['pending_stage'] ?? ''),
        'pending_tally_posting_timestamp' => $data['pending_tally_posting_timestamp'] ?? '',
        'pending_tally_posting_useremail' => $data['pending_tally_posting_useremail'] ?? '',
    ]);
}

function hydrateMrrChildRow(array $row): array
{
    $data = decodeExtraJson($row);
    return array_merge($data, [
        'record_group_id' => $row['record_group_id'] ?? ($data['record_group_id'] ?? ''),
        'ge_no' => $row['ge_no'] ?? ($data['ge_no'] ?? ''),
        'mrr_number' => $row['mrr_no'] ?? ($data['mrr_number'] ?? ($data['mrr_no'] ?? '')),
        'mrr_no' => $row['mrr_no'] ?? ($data['mrr_no'] ?? ($data['mrr_number'] ?? '')),
        's_no' => $row['s_no'] ?? ($data['s_no'] ?? ''),
        'description' => $row['description_text'] ?? ($data['description'] ?? ''),
        'hsn' => $row['hsn_code'] ?? ($data['hsn'] ?? ''),
        'sort_no' => $row['sort_no'] ?? ($data['sort_no'] ?? ''),
        'party_order' => $row['party_order_no'] ?? ($data['party_order'] ?? ''),
        'po_no' => $row['po_no'] ?? ($data['po_no'] ?? ''),
        'po_date' => $row['po_date'] ?? ($data['po_date'] ?? ''),
        'po_details' => $row['po_details'] ?? ($data['po_details'] ?? ''),
        'po_rate' => isset($row['po_rate']) ? (string)$row['po_rate'] : ($data['po_rate'] ?? ''),
        'gsm' => $row['gsm_value'] ?? ($data['gsm'] ?? ''),
        'size' => $row['size_value'] ?? ($data['size'] ?? ''),
        'unit' => $row['unit_value'] ?? ($data['unit'] ?? ''),
        'reels' => isset($row['reels_value']) ? (string)$row['reels_value'] : ($data['reels'] ?? ''),
        'weight' => isset($row['weight_value']) ? (string)$row['weight_value'] : ($data['weight'] ?? ''),
        'rate' => isset($row['rate_value']) ? (string)$row['rate_value'] : ($data['rate'] ?? ''),
        'amount' => isset($row['amount_value']) ? (string)$row['amount_value'] : ($data['amount'] ?? ''),
        'quantity' => isset($row['quantity_value']) ? (string)$row['quantity_value'] : ($data['quantity'] ?? ''),
        'po_quantity' => isset($row['po_quantity']) ? (string)$row['po_quantity'] : ($data['po_quantity'] ?? ''),
        'supplier_reel_no' => $row['supplier_reel_no'] ?? ($data['supplier_reel_no'] ?? ''),
        'our_reel_number' => $row['our_reel_no'] ?? ($data['our_reel_number'] ?? ($data['reel_no'] ?? '')),
        'reel_no' => $row['our_reel_no'] ?? ($data['reel_no'] ?? ($data['our_reel_number'] ?? '')),
        'reel_details' => $row['reel_details'] ?? ($data['reel_details'] ?? ''),
        'erp_code' => $row['erp_code'] ?? ($data['erp_code'] ?? ''),
        'bf' => $row['bf_value'] ?? ($data['bf'] ?? ''),
        'plant_head_approval' => $data['plant_head_approval'] ?? '',
        'accounts_approval' => $data['accounts_approval'] ?? '',
        'md_approval' => $data['md_approval'] ?? '',
        'pending_stage' => $data['pending_stage'] ?? '',
        'source_type' => $row['source_type'] ?? ($data['source_type'] ?? 'mrr_item'),
    ]);
}

function hydrateGeEntryRow(array $row): array
{
    return [
        'timestamp' => $row['created_at'] ?? '',
        'date' => $row['entry_date'] ?? '',
        'ge_no' => $row['ge_no'] ?? '',
        'supplier' => $row['supplier_name'] ?? '',
        'invoice_no' => $row['invoice_no'] ?? '',
        'total_value' => isset($row['total_invoice_value']) ? (string)$row['total_invoice_value'] : '',
        'truck_no' => $row['truck_no'] ?? '',
        'pic1' => $row['pic1'] ?? '',
        'pic2' => $row['pic2'] ?? '',
        'pic3' => $row['pic3'] ?? '',
        'pic4' => $row['pic4'] ?? '',
        'pic5' => $row['pic5'] ?? '',
        'pic6' => $row['pic6'] ?? '',
        'pic7' => $row['pic7'] ?? '',
        'pic8' => $row['pic8'] ?? '',
        'mrr_no' => $row['mrr_no'] ?? '',
        'mrr_number' => $row['mrr_no'] ?? '',
        'mrr_complete' => (int)($row['mrr_complete'] ?? 0) === 1 ? 'YES' : 'NO',
    ];
}

function hydratePoRow(array $row): array
{
    return [
        'sno' => $row['id'] ?? '',
        'po_no' => $row['po_no'] ?? '',
        'date' => $row['po_date'] ?? '',
        'supplier' => $row['supplier_name'] ?? '',
        'po_details' => $row['po_details'] ?? '',
        'erp_code' => $row['erp_code'] ?? '',
        'size' => $row['size_value'] ?? '',
        'gsm' => $row['gsm_value'] ?? '',
        'bf' => $row['bf_value'] ?? '',
        'reel_details' => $row['reel_details'] ?? '',
        'unit' => $row['unit_value'] ?? '',
        'po_rate' => isset($row['po_rate']) ? (string)$row['po_rate'] : '',
        'quantity' => isset($row['quantity_value']) ? (string)$row['quantity_value'] : '',
        'status' => $row['status_text'] ?? '',
        'quantity_received' => isset($row['quantity_received']) ? (string)$row['quantity_received'] : '',
        'pending' => isset($row['pending_quantity']) ? (string)$row['pending_quantity'] : '',
        'closed' => isset($row['closed_quantity']) ? (string)$row['closed_quantity'] : '',
        'rapc' => isset($row['rapc_value']) ? (string)$row['rapc_value'] : '',
    ];
}

function toMrrRowArray(array $data): array
{
    return [
        value($data, 'mrr_form_id'),
        value($data, 'ge_no', 'ge_entry'),
        value($data, 'date'),
        value($data, 'mrr_number', 'mrr_no'),
        value($data, 'dt_of_receipt', 'receipt_date'),
        value($data, 'sup_doc_no', 'invoice_no'),
        value($data, 'truck_number', 'truck_no'),
        value($data, 'invoice_ttl_weight_kgs', 'actual_weight'),
        value($data, 'actual_mrr_ttl_weight_kgs', 'actual_mrr_weight'),
        value($data, 'required_reel', 'required_reels'),
        value($data, 'rows_added'),
        value($data, 'supplier', 'supplier_name'),
        value($data, 'mrr_entry_type'),
        value($data, 'invoice_basic_value'),
        value($data, 'mrr_basic_value'),
        value($data, 'e_way_bill_no', 'eway_no'),
        value($data, 'e_way_date', 'eway_date'),
        value($data, 'l_r_no', 'lr_no'),
        value($data, 'plant_head_approval'),
        value($data, 'plant_head_approval_timestamp'),
        value($data, 'plant_head_approval_useremail'),
        value($data, 'plant_head_remark'),
        value($data, 'plant_head_reject_timestamp'),
        value($data, 'plant_head_reject_usermail'),
        value($data, 'accounts_approval'),
        value($data, 'accounts_approval_timestamp'),
        value($data, 'accounts_approval_useremail'),
        value($data, 'accounts_remark'),
        value($data, 'accounts_reject_timestamp'),
        value($data, 'accounts_reject_usermail'),
        value($data, 'debit_note'),
        value($data, 'debit_note_date'),
        value($data, 'debit_note_amount'),
        value($data, 'md_approval'),
        value($data, 'md_approval_timestamp'),
        value($data, 'md_approval_useremail'),
        value($data, 'md_approval_remark'),
        value($data, 'md_reject_usermail'),
        value($data, 'md_reject_timestamp'),
        value($data, 'pending_tally_posting_timestamp'),
        value($data, 'pending_tally_posting_useremail'),
        value($data, 's_no', 'sort_no'),
        value($data, 'description', 'reel_details', 'item_name'),
        value($data, 'hsn'),
        value($data, 'sort', 'sort_no'),
        value($data, 'party_order', 'po_no'),
        value($data, 'po_no'),
        value($data, 'po_date'),
        value($data, 'po_details'),
        value($data, 'po_rate'),
        value($data, 'gsm'),
        value($data, 'size'),
        value($data, 'unit', 'size_unit'),
        value($data, 'reels', 'reel_no'),
        value($data, 'weight', 'net_wt'),
        value($data, 'rate'),
        value($data, 'amount', 'value'),
        value($data, 'quantity'),
        value($data, 'po_quantity'),
        value($data, 'insurance'),
        value($data, 'round_off'),
    ];
}

function toHelperRowArray(array $data): array
{
    return [
        value($data, 'helper_id'),
        value($data, 'mrr_form_id'),
        value($data, 's_no', 'sort_no'),
        value($data, 'mrr_number', 'mrr_no'),
        value($data, 'po_details'),
        value($data, 'po_no'),
        value($data, 'party_order'),
        value($data, 'po_date'),
        value($data, 'supplier'),
        value($data, 'our_reel_number', 'reel_no'),
        value($data, 'supplier_reel_no'),
        value($data, 'reel_details', 'item_name', 'description'),
        value($data, 'erp_code'),
        value($data, 'size'),
        value($data, 'gsm'),
        value($data, 'bf'),
        value($data, 'weight', 'net_wt'),
        value($data, 'rate'),
        value($data, 'value', 'amount'),
        value($data, 'po_rate'),
        value($data, 'date'),
        value($data, 'dt_of_receipts', 'receipt_date'),
        value($data, 'sup_doc_no', 'invoice_no'),
        value($data, 'plant_head_approval'),
        value($data, 'plant_head_approval_timestamp'),
        value($data, 'plant_head_approval_useremail'),
        value($data, 'plant_head_remark'),
        value($data, 'plant_head_reject_timestamp'),
        value($data, 'plant_head_reject_usermail'),
        value($data, 'accounts_approval'),
        value($data, 'accounts_approval_timestamp'),
        value($data, 'accounts_approval_useremail'),
        value($data, 'accounts_remark'),
        value($data, 'accounts_reject_timestamp'),
        value($data, 'accounts_reject_usermail'),
        value($data, 'debit_note'),
        value($data, 'debit_note_date'),
        value($data, 'debit_note_amount'),
        value($data, 'md_approval'),
        value($data, 'md_approval_timestamp'),
        value($data, 'md_approval_useremail'),
        value($data, 'md_approval_remark'),
        value($data, 'md_reject_usermail'),
        value($data, 'md_reject_timestamp'),
        value($data, 'pending_tally_posting_timestamp'),
        value($data, 'pending_tally_posting_useremail'),
        value($data, 'ge_no', 'ge_entry', 'ge_entry_no'),
    ];
}

function toGeRowArray(array $data): array
{
    return [
        value($data, 'timestamp'),
        value($data, 'date'),
        value($data, 'ge_no'),
        value($data, 'supplier'),
        value($data, 'invoice_no'),
        value($data, 'total_value'),
        value($data, 'truck_no'),
        value($data, 'pic1'),
        value($data, 'pic2'),
        value($data, 'pic3'),
        value($data, 'pic4'),
        value($data, 'pic5'),
        value($data, 'pic6'),
        value($data, 'pic7'),
        value($data, 'pic8'),
        value($data, 'mrr_no', 'mrr_number'),
        value($data, 'mrr_complete'),
    ];
}

function toPoRowArray(array $data): array
{
    return [
        value($data, 'sno', 's_no'),
        value($data, 'po_no'),
        value($data, 'date'),
        value($data, 'supplier'),
        value($data, 'po_details'),
        value($data, 'erp_code'),
        value($data, 'size'),
        value($data, 'gsm'),
        value($data, 'bf'),
        value($data, 'reel_details'),
        value($data, 'unit'),
        value($data, 'rate', 'po_rate'),
        value($data, 'quantity'),
        value($data, 'status'),
        value($data, 'quantity_received'),
        value($data, 'pending'),
        value($data, 'closed'),
        value($data, 'rapc'),
    ];
}

function fetchSheetDataRows(string $firmId, string $sheetName, ?string $mrrNumber = null, ?string $geNo = null): array
{
    $pdo = db();

    if (strcasecmp($sheetName, 'GE ENTRY') === 0) {
        $sql = "SELECT * FROM ge_entries WHERE firm_id = :firm_id";
        $params = ['firm_id' => $firmId];
        if ($mrrNumber !== null && $mrrNumber !== '') {
            $sql .= " AND mrr_no = :mrr_no";
            $params['mrr_no'] = $mrrNumber;
        }
        if ($geNo !== null && $geNo !== '') {
            $sql .= " AND ge_no = :ge_no";
            $params['ge_no'] = $geNo;
        }
        $sql .= " ORDER BY id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('hydrateGeEntryRow', $stmt->fetchAll());
    }

    if (isPoSheetName($sheetName)) {
        $table = poTableForSheet($sheetName);
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE firm_id = :firm_id ORDER BY id ASC");
        $stmt->execute(['firm_id' => $firmId]);
        return array_map('hydratePoRow', $stmt->fetchAll());
    }

    $parentTable = mrrParentTableForSheet($sheetName);
    $childTable = mrrChildTableForSheet($sheetName);
    $params = ['firm_id' => $firmId];

    $hasSourceType = in_array('source_type', tableColumns($childTable), true);

    if (isHelperSheetName($sheetName)) {
        $sql = "SELECT * FROM {$childTable} WHERE firm_id = :firm_id";
        if ($hasSourceType) {
            $sql .= " AND source_type = 'helper_item'";
        }
        if ($mrrNumber !== null && $mrrNumber !== '') {
            $sql .= " AND mrr_no = :mrr_no";
            $params['mrr_no'] = $mrrNumber;
        }
        if ($geNo !== null && $geNo !== '') {
            $sql .= " AND ge_no = :ge_no";
            $params['ge_no'] = $geNo;
        }
        $sql .= " ORDER BY mrr_no DESC, row_sort ASC, id ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return array_map('hydrateMrrChildRow', $stmt->fetchAll());
    }

    $parentSql = "SELECT * FROM {$parentTable} WHERE firm_id = :firm_id";
    if ($mrrNumber !== null && $mrrNumber !== '') {
        $parentSql .= " AND mrr_no = :mrr_no";
        $params['mrr_no'] = $mrrNumber;
    }
    if ($geNo !== null && $geNo !== '') {
        $parentSql .= " AND ge_no = :ge_no";
        $params['ge_no'] = $geNo;
    }
    $parentSql .= " ORDER BY mrr_no DESC, id ASC";
    $parentStmt = $pdo->prepare($parentSql);
    $parentStmt->execute($params);
    $parents = array_map('hydrateMrrParentRow', $parentStmt->fetchAll());

    $childSql = "SELECT * FROM {$childTable} WHERE firm_id = :firm_id";
    if ($hasSourceType) {
        $childSql .= " AND source_type = 'mrr_item'";
    }
    if ($mrrNumber !== null && $mrrNumber !== '') {
        $childSql .= " AND mrr_no = :mrr_no";
    }
    if ($geNo !== null && $geNo !== '') {
        $childSql .= " AND ge_no = :ge_no";
    }
    $childSql .= " ORDER BY mrr_no DESC, row_sort ASC, id ASC";
    $childStmt = $pdo->prepare($childSql);
    $childStmt->execute($params);
    $children = array_map('hydrateMrrChildRow', $childStmt->fetchAll());

    return array_merge($parents, $children);
}

function rowsPayload(string $sheetName, array $rows): array
{
    $resolve = static function (array $row): array {
        return array_key_exists('data_json', $row) ? decodeData($row) : $row;
    };

    if (strcasecmp($sheetName, 'GE ENTRY') === 0) {
        $header = GE_HEADERS;
        $body = array_map(fn($row) => toGeRowArray($resolve($row)), $rows);
        return [$header, ...$body];
    }

    if (strcasecmp($sheetName, 'PO DETAILS') === 0 || strcasecmp($sheetName, 'OTHER PO') === 0) {
        $header = ['S.NO.', 'PO NO.', 'DATE', 'SUPPLIER', 'PO DETAILS', 'ERP CODE', 'SIZE', 'GSM', 'BF', 'REEL DETAILS', 'UNIT', 'PO RATE', 'QUANTITY', 'STATUS', 'QUANTITY RECEIVED', 'PENDING', 'CLOSED', 'RAPC'];
        $body = array_map(fn($row) => toPoRowArray($resolve($row)), $rows);
        return [$header, ...$body];
    }

    $isHelper = stripos($sheetName, 'HELPER') !== false || stripos($sheetName, 'OTHER ITEMS') !== false;
    if ($isHelper) {
        $header = HELPER_HEADERS;
        $body = array_map(fn($row) => toHelperRowArray($resolve($row)), $rows);
        return [$header, ...$body];
    }

    $header = MRR_HEADERS;
    $body = array_map(fn($row) => toMrrRowArray($resolve($row)), $rows);
    return [$header, ...$body];
}

function getFirmId(): string
{
    $candidate = trim((string)($_GET['firm_id'] ?? $_POST['firm_id'] ?? $_GET['spreadsheetId'] ?? $_POST['spreadsheetId'] ?? ''));
    return $candidate !== '' ? $candidate : 'lnki';
}

function getAction(): string
{
    $payload = readPayload();
    $fromPayload = trim((string)($payload['action'] ?? ''));
    if ($fromPayload !== '') {
        return strtolower($fromPayload);
    }
    return strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? '')));
}

function fetchParentByMrr(string $firmId, string $sheetName, string $mrrNumber, ?string $geNo = null): ?array
{
    $pdo = db();
    $table = mrrParentTableForSheet($sheetName);
    $sql = "SELECT * FROM {$table} WHERE firm_id = :firm_id AND mrr_no = :mrr_no";
    $params = [
        'firm_id' => $firmId,
        'mrr_no' => $mrrNumber,
    ];
    if ($geNo !== null && trim($geNo) !== '') {
        $sql .= " AND ge_no = :ge_no";
        $params['ge_no'] = $geNo;
    }
    $sql .= " ORDER BY id DESC LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ? hydrateMrrParentRow($row) : null;
}

function writeApprovalLog(string $firmId, string $mrrNumber, string $stage, string $decision, string $userEmail, string $remark, array $extra = []): void
{
    $pdo = db();
    $geNo = trim((string)($extra['ge_no'] ?? ''));
    $recordGroupId = makeRecordGroupId($mrrNumber, $geNo);

    $columns = tableColumns('approval_logs');
    $fields = ['firm_id', 'mrr_number', 'stage_name', 'decision_value', 'user_email', 'remark_text', 'extra_json'];
    if (in_array('ge_no', $columns, true)) {
        $fields[] = 'ge_no';
    }
    if (in_array('record_group_id', $columns, true)) {
        $fields[] = 'record_group_id';
    }

    $fieldList = implode(', ', $fields);
    $placeholders = implode(', ', array_map(static fn($f) => ':' . $f, $fields));
    $stmt = $pdo->prepare("INSERT INTO approval_logs ({$fieldList}) VALUES ({$placeholders})");

    $params = [
        'firm_id' => $firmId,
        'mrr_number' => $mrrNumber,
        'stage_name' => $stage,
        'decision_value' => $decision,
        'user_email' => $userEmail,
        'remark_text' => $remark,
        'extra_json' => json_encode($extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ];
    if (in_array('ge_no', $fields, true)) {
        $params['ge_no'] = $geNo !== '' ? $geNo : null;
    }
    if (in_array('record_group_id', $fields, true)) {
        $params['record_group_id'] = $recordGroupId !== '' ? $recordGroupId : null;
    }

    $stmt->execute($params);
}

function updateApprovalDataForMrr(string $firmId, string $mrrNumber, string $stage, string $decision, array $params): array
{
    $pdo = db();
    $geNo = trim((string)($params['ge_no'] ?? ''));
    $parentRow = null;
    $parentTable = '';
    foreach (['reel_mrr_parents', 'other_mrr_parents'] as $table) {
        $sql = "SELECT * FROM {$table} WHERE firm_id = :firm_id AND mrr_no = :mrr_no";
        $queryParams = [
            'firm_id' => $firmId,
            'mrr_no' => $mrrNumber,
        ];
        if ($geNo !== '') {
            $sql .= " AND ge_no = :ge_no";
            $queryParams['ge_no'] = $geNo;
        }
        $sql .= " ORDER BY id DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $candidate = $stmt->fetch();
        if ($candidate) {
            $parentRow = $candidate;
            $parentTable = $table;
            break;
        }
    }
    if (!$parentRow) {
        throw new RuntimeException('MRR not found for approval.');
    }

    $childTable = $parentTable === 'other_mrr_parents' ? 'other_mrr_children' : 'reel_mrr_children';
    $childSql = "SELECT * FROM {$childTable} WHERE firm_id = :firm_id AND mrr_no = :mrr_no";
    $childParams = [
        'firm_id' => $firmId,
        'mrr_no' => $mrrNumber,
    ];
    if ($geNo !== '') {
        $childSql .= " AND ge_no = :ge_no";
        $childParams['ge_no'] = $geNo;
    }
    $childSql .= " ORDER BY row_sort ASC, id ASC";
    $childStmt = $pdo->prepare($childSql);
    $childStmt->execute($childParams);
    $childRows = $childStmt->fetchAll();

    $timestamp = nowText();
    $userEmail = trim((string)($params['user_email'] ?? ''));
    $decisionText = strtolower($decision) === 'reject' ? 'Rejected' : 'Approved';
    $nextStage = 'completed';
    $remark = '';
    $rows = array_merge([
        ['kind' => 'parent', 'raw' => $parentRow, 'data' => hydrateMrrParentRow($parentRow)]
    ], array_map(static fn($row) => ['kind' => 'child', 'raw' => $row, 'data' => hydrateMrrChildRow($row)], $childRows));

    foreach ($rows as $entry) {
        $data = $entry['data'];
        if ($stage === 'pending_plant_head_approval') {
            $remark = trim((string)($params['plant_head_remark'] ?? ''));
            $data['plant_head_remark'] = $remark;
            $data['plant_head_approval'] = $decisionText;
            if ($decisionText === 'Approved') {
                $data['plant_head_approval_timestamp'] = $timestamp;
                $data['plant_head_approval_useremail'] = $userEmail;
                $nextStage = 'pending_accounts_approval';
            } else {
                $data['plant_head_reject_timestamp'] = $timestamp;
                $data['plant_head_reject_usermail'] = $userEmail;
                $nextStage = 'rejected';
            }
        } elseif ($stage === 'pending_accounts_approval') {
            $remark = trim((string)($params['accounts_remark'] ?? ''));
            $data['accounts_remark'] = $remark;
            $data['accounts_approval'] = $decisionText;
            $data['debit_note'] = trim((string)($params['debit_note'] ?? ($data['debit_note'] ?? '')));
            $data['debit_note_date'] = trim((string)($params['debit_note_date'] ?? ($data['debit_note_date'] ?? '')));
            $data['debit_note_amount'] = trim((string)($params['debit_note_amount'] ?? ($data['debit_note_amount'] ?? '')));
            if ($decisionText === 'Approved') {
                $data['accounts_approval_timestamp'] = $timestamp;
                $data['accounts_approval_useremail'] = $userEmail;
                $nextStage = 'pending_md_approval';
            } else {
                $data['accounts_reject_timestamp'] = $timestamp;
                $data['accounts_reject_usermail'] = $userEmail;
                $nextStage = 'rejected';
            }
        } elseif ($stage === 'pending_md_approval') {
            $remark = trim((string)($params['md_approval_remark'] ?? ''));
            $data['md_approval_remark'] = $remark;
            $data['md_approval'] = $decisionText;
            if ($decisionText === 'Approved') {
                $data['md_approval_timestamp'] = $timestamp;
                $data['md_approval_useremail'] = $userEmail;
                $nextStage = 'pending_tally_posting';
            } else {
                $data['md_reject_timestamp'] = $timestamp;
                $data['md_reject_usermail'] = $userEmail;
                $nextStage = 'rejected';
            }
        } elseif ($stage === 'pending_tally_posting') {
            $data['pending_tally_posting_timestamp'] = $timestamp;
            $data['pending_tally_posting_useremail'] = $userEmail;
            $nextStage = 'completed';
        }

        $pendingStage = $stage === 'pending_tally_posting' ? 'completed' : $nextStage;
        if ($entry['kind'] === 'parent') {
            $update = $pdo->prepare("
                UPDATE {$parentTable}
                SET pending_stage = :pending_stage,
                    plant_head_approval = :plant_head_approval,
                    accounts_approval = :accounts_approval,
                    md_approval = :md_approval,
                    tally_posted = :tally_posted,
                    extra_json = :extra_json,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $update->execute([
                'pending_stage' => $pendingStage,
                'plant_head_approval' => value($data, 'plant_head_approval'),
                'accounts_approval' => value($data, 'accounts_approval'),
                'md_approval' => value($data, 'md_approval'),
                'tally_posted' => $pendingStage === 'completed' ? 1 : 0,
                'extra_json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => $entry['raw']['id'],
            ]);
        } else {
            $update = $pdo->prepare("
                UPDATE {$childTable}
                SET extra_json = :extra_json,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $update->execute([
                'extra_json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => $entry['raw']['id'],
            ]);
        }
    }

    writeApprovalLog($firmId, $mrrNumber, $stage, $decision, $userEmail, $remark, $params);

    $payload = fetchParentByMrr(
        $firmId,
        $parentTable === 'other_mrr_parents' ? 'OTHER MRR' : 'MRR FORM',
        $mrrNumber,
        $geNo !== '' ? $geNo : (($parentRow['ge_no'] ?? '') ?: null)
    ) ?: [];

    return [
        'ok' => true,
        'mrr_number' => $mrrNumber,
        'ge_no' => $geNo,
        'pending_stage' => $nextStage,
        'plant_head_remark' => value($payload, 'plant_head_remark'),
        'accounts_remark' => value($payload, 'accounts_remark'),
        'md_approval_remark' => value($payload, 'md_approval_remark'),
        'debit_note' => value($payload, 'debit_note'),
        'debit_note_date' => value($payload, 'debit_note_date'),
        'debit_note_amount' => value($payload, 'debit_note_amount'),
    ];
}

function saveGeEntryAction(array $payload): array
{
    $traceId = createTraceId();
    $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
    $geEntry = is_array($payload['geEntry'] ?? null) ? $payload['geEntry'] : [];
    $sheetName = 'GE ENTRY';
    writeBackendLog('save_ge_entry_start', array_merge(
        ['trace_id' => $traceId, 'action' => 'save_ge_entry'],
        loggerContextSummary($payload)
    ));

    $pdo = db();
    $geNo = value($geEntry, 'ge_no');
    
    if ($geNo === '') {
        // Fallback to atomic sequence if not provided by frontend
        // We need a prefix. We can try to derive it from date or use a default.
        $dateVal = value($geEntry, 'date');
        $dt = $dateVal !== '' ? new DateTimeImmutable($dateVal) : new DateTimeImmutable('now');
        $fy = fiscalYearText($dt);
        // We don't have getFirmCode here, so we use firmId
        $prefix = strtoupper($firmId) . '/' . $fy . '/';
        
        // Find current max to initialize sequence if needed
        $stmt = $pdo->prepare("SELECT ge_no FROM ge_entries WHERE firm_id = :firm_id AND ge_no LIKE :prefix_like ORDER BY id DESC LIMIT 50");
        $stmt->execute(['firm_id' => $firmId, 'prefix_like' => $prefix . '%']);
        $vals = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $currentMax = numericSuffixMax($vals, $prefix);
        
        $seqVal = getNextSequenceValue($firmId, 'GE:' . $prefix, $currentMax);
        $geNo = $prefix . str_pad((string)$seqVal, 4, '0', STR_PAD_LEFT);
    }

    $data = array_merge($geEntry, [
        'ge_no' => $geNo,
        'mrr_no' => value($geEntry, 'mrr_no', 'mrr_number') ?: $geNo,
        'timestamp' => nowText(),
        'mrr_complete' => value($geEntry, 'mrr_complete') ?: 'NO',
    ]);
    upsertSupplierName($firmId, value($data, 'supplier'));

    $existing = $pdo->prepare("SELECT id FROM ge_entries WHERE firm_id = :firm_id AND ge_no = :ge_no LIMIT 1");
    $existing->execute([
        'firm_id' => $firmId,
        'ge_no' => $geNo,
    ]);
    $existingId = $existing->fetchColumn();

    $params = [
        'firm_id' => $firmId,
        'ge_no' => $geNo,
        'mrr_no' => value($data, 'mrr_no', 'mrr_number') ?: $geNo,
        'entry_date' => value($data, 'date') ?: null,
        'supplier_name' => value($data, 'supplier') ?: null,
        'invoice_no' => value($data, 'invoice_no') ?: null,
        'total_invoice_value' => value($data, 'total_value') !== '' ? value($data, 'total_value') : null,
        'truck_no' => value($data, 'truck_no') ?: null,
        'pic1' => value($data, 'pic1') ?: null,
        'pic2' => value($data, 'pic2') ?: null,
        'pic3' => value($data, 'pic3') ?: null,
        'pic4' => value($data, 'pic4') ?: null,
        'pic5' => value($data, 'pic5') ?: null,
        'pic6' => value($data, 'pic6') ?: null,
        'pic7' => value($data, 'pic7') ?: null,
        'pic8' => value($data, 'pic8') ?: null,
        'mrr_complete' => strtoupper(value($data, 'mrr_complete')) === 'YES' ? 1 : 0,
    ];

    if ($existingId) {
        $update = $pdo->prepare("
            UPDATE ge_entries
            SET ge_no = :ge_no,
                mrr_no = :mrr_no,
                entry_date = :entry_date,
                supplier_name = :supplier_name,
                invoice_no = :invoice_no,
                total_invoice_value = :total_invoice_value,
                truck_no = :truck_no,
                pic1 = :pic1,
                pic2 = :pic2,
                pic3 = :pic3,
                pic4 = :pic4,
                pic5 = :pic5,
                pic6 = :pic6,
                pic7 = :pic7,
                pic8 = :pic8,
                mrr_complete = :mrr_complete,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND firm_id = :firm_id
        ");
        $update->execute($params + ['id' => $existingId]);
    } else {
        $insert = $pdo->prepare("
            INSERT INTO ge_entries (
                firm_id, ge_no, mrr_no, entry_date, supplier_name, invoice_no, total_invoice_value, truck_no,
                pic1, pic2, pic3, pic4, pic5, pic6, pic7, pic8, mrr_complete
            ) VALUES (
                :firm_id, :ge_no, :mrr_no, :entry_date, :supplier_name, :invoice_no, :total_invoice_value, :truck_no,
                :pic1, :pic2, :pic3, :pic4, :pic5, :pic6, :pic7, :pic8, :mrr_complete
            )
        ");
        $insert->execute($params);
    }

    writeBackendLog('save_ge_entry_success', [
        'trace_id' => $traceId,
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
        'ge_no' => $geNo,
        'mrr_no' => value($data, 'mrr_no', 'mrr_number'),
        'invoice_no' => value($data, 'invoice_no'),
    ]);

    return ['ok' => true, 'trace_id' => $traceId, 'ge_no' => $geNo, 'mrr_no' => value($data, 'mrr_no', 'mrr_number')];
}

function saveInvoiceOrPackingAction(array $payload, string $action): array
{
    $traceId = createTraceId();
    $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
    $invoice = is_array($payload['invoice'] ?? null) ? $payload['invoice'] : [];
    $packing = is_array($payload['packing'] ?? null) ? $payload['packing'] : [];
    $options = is_array($payload['options'] ?? null) ? $payload['options'] : [];
    $derived = is_array($payload['derived'] ?? null) ? $payload['derived'] : [];
    $sheetName = trim((string)($options['mrrSheetName'] ?? 'MRR FORM')) ?: 'MRR FORM';
    $helperSheetName = trim((string)($options['helperSheetName'] ?? 'HELPER SHEET')) ?: 'HELPER SHEET';
    writeBackendLog($action . '_start', array_merge(
        ['trace_id' => $traceId, 'action' => $action],
        loggerContextSummary($payload)
    ));
    $mrrNumber = value($invoice, 'mrr_no', 'mrr_number', 'mrrNo');
    if ($mrrNumber === '') {
        $mrrNumber = value($packing, 'mrr_no', 'mrr_number');
    }
    if ($mrrNumber === '') {
        throw new RuntimeException('MRR number is required.');
    }

    $geNo = value($invoice, 'ge_no');
    if ($geNo === '') {
        $geNo = value($packing, 'ge_no');
    }

    $mrrFormRecord = is_array($derived['mrrFormRecord'] ?? null) ? $derived['mrrFormRecord'] : [];
    $helperRows = is_array($derived['helperRows'] ?? null) ? $derived['helperRows'] : [];
    $invoiceGoods = is_array($invoice['goods'] ?? null) ? $invoice['goods'] : [];
    $recordGroupId = makeRecordGroupId($mrrNumber, $geNo);
    $parentTable = mrrParentTableForSheet($sheetName);
    $childTable = mrrChildTableForSheet($sheetName);
    $childColumns = tableColumns($childTable);
    $hasSourceType = in_array('source_type', $childColumns, true);

    $parentData = array_merge($mrrFormRecord, [
        'mrr_form_id' => value($mrrFormRecord, 'mrr_form_id') ?: ('MRR-' . $mrrNumber),
        'ge_no' => $geNo,
        'date' => value($mrrFormRecord, 'date') ?: value($invoice, 'date', 'receipt_date'),
        'mrr_number' => $mrrNumber,
        'dt_of_receipt' => value($mrrFormRecord, 'dt_of_receipt') ?: value($invoice, 'receipt_date', 'date'),
        'sup_doc_no' => value($mrrFormRecord, 'sup_doc_no') ?: value($invoice, 'invoice_no'),
        'truck_number' => value($mrrFormRecord, 'truck_number') ?: value($invoice, 'vehicle_no') ?: value($packing, 'truck_no'),
        'supplier' => value($mrrFormRecord, 'supplier') ?: value($invoice['bill_to'] ?? [], 'name_address') ?: value($packing['buyer'] ?? [], 'name_address'),
        'rows_added' => (string)count($helperRows),
        'plant_head_approval' => value($mrrFormRecord, 'plant_head_approval'),
        'accounts_approval' => value($mrrFormRecord, 'accounts_approval'),
        'md_approval' => value($mrrFormRecord, 'md_approval'),
    ]);

    $existingParent = fetchParentByMrr($firmId, $sheetName, $mrrNumber, $geNo !== '' ? $geNo : null);
    if ($existingParent) {
        $existingData = $existingParent;
        foreach ([
            'plant_head_approval', 'plant_head_approval_timestamp', 'plant_head_approval_useremail', 'plant_head_remark',
            'plant_head_reject_timestamp', 'plant_head_reject_usermail', 'accounts_approval', 'accounts_approval_timestamp',
            'accounts_approval_useremail', 'accounts_remark', 'accounts_reject_timestamp', 'accounts_reject_usermail',
            'debit_note', 'debit_note_date', 'debit_note_amount', 'md_approval', 'md_approval_timestamp',
            'md_approval_useremail', 'md_approval_remark', 'md_reject_usermail', 'md_reject_timestamp',
            'pending_tally_posting_timestamp', 'pending_tally_posting_useremail'
        ] as $field) {
            if (value($parentData, $field) === '' && value($existingData, $field) !== '') {
                $parentData[$field] = $existingData[$field];
            }
        }
    }
    upsertSupplierName($firmId, value($parentData, 'supplier'));

    $parentPendingStage = determinePendingStage($parentData);
    $pdo = db();
    $existingParentIdStmt = $pdo->prepare("SELECT id FROM {$parentTable} WHERE firm_id = :firm_id AND ge_no = :ge_no AND mrr_no = :mrr_no LIMIT 1");
    $existingParentIdStmt->execute([
        'firm_id' => $firmId,
        'ge_no' => $geNo,
        'mrr_no' => $mrrNumber,
    ]);
    $existingParentId = $existingParentIdStmt->fetchColumn();

    $parentColumns = tableColumns($parentTable);

    $parentParams = [
        'firm_id' => $firmId,
        'record_group_id' => $recordGroupId,
        'ge_no' => $geNo,
        'mrr_no' => $mrrNumber,
        'mrr_form_id' => value($parentData, 'mrr_form_id') ?: null,
        'entry_date' => value($parentData, 'date') ?: null,
        'receipt_date' => value($parentData, 'dt_of_receipt') ?: null,
        'supplier_name' => value($parentData, 'supplier') ?: null,
        'supplier_doc_no' => value($parentData, 'sup_doc_no') ?: null,
        'truck_no' => value($parentData, 'truck_number') ?: null,
        'invoice_total_weight' => value($parentData, 'invoice_ttl_weight_kgs') !== '' ? value($parentData, 'invoice_ttl_weight_kgs') : null,
        'actual_mrr_total_weight' => value($parentData, 'actual_mrr_ttl_weight_kgs') !== '' ? value($parentData, 'actual_mrr_ttl_weight_kgs') : null,
        'rows_added' => count($helperRows),
        'mrr_type' => value($parentData, 'mrr_entry_type') ?: null,
        'invoice_basic_value' => value($parentData, 'invoice_basic_value') !== '' ? value($parentData, 'invoice_basic_value') : null,
        'mrr_basic_value' => value($parentData, 'mrr_basic_value') !== '' ? value($parentData, 'mrr_basic_value') : null,
        'e_way_bill_no' => value($parentData, 'e_way_bill_no') ?: null,
        'e_way_date' => value($parentData, 'e_way_date') ?: null,
        'lr_no' => value($parentData, 'l_r_no') ?: null,
        'insurance' => value($parentData, 'insurance') !== '' ? value($parentData, 'insurance') : null,
        'round_off' => value($parentData, 'round_off') !== '' ? value($parentData, 'round_off') : null,
        'plant_head_approval' => value($parentData, 'plant_head_approval') ?: null,
        'accounts_approval' => value($parentData, 'accounts_approval') ?: null,
        'md_approval' => value($parentData, 'md_approval') ?: null,
        'pending_stage' => $parentPendingStage,
        'tally_posted' => $parentPendingStage === 'completed' ? 1 : 0,
        'extra_json' => json_encode($parentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ];

    if (in_array('required_reels', $parentColumns, true)) {
        $parentParams['required_reels'] = value($parentData, 'required_reel') !== '' ? value($parentData, 'required_reel') : null;
    }

    $parentInsertParams = array_intersect_key($parentParams, array_flip($parentColumns));

    if ($existingParentId) {
        $updateSetParts = [];
        foreach (array_keys($parentInsertParams) as $column) {
            if ($column === 'firm_id') {
                continue;
            }
            $updateSetParts[] = "{$column} = :{$column}";
        }
        if (in_array('updated_at', $parentColumns, true)) {
            $updateSetParts[] = 'updated_at = CURRENT_TIMESTAMP';
        }
        $updateParent = $pdo->prepare("
            UPDATE {$parentTable}
            SET " . implode(",\n                ", $updateSetParts) . "
            WHERE id = :id AND firm_id = :firm_id
        ");
        $updateParent->execute($parentInsertParams + ['id' => $existingParentId]);
        $parentId = (int)$existingParentId;
    } else {
        $insertColumns = array_keys($parentInsertParams);
        $insertValues = array_map(static fn($column) => ':' . $column, $insertColumns);
        $insertParent = $pdo->prepare("
            INSERT INTO {$parentTable} (" . implode(', ', $insertColumns) . ")
            VALUES (" . implode(', ', $insertValues) . ")
        ");
        $insertParent->execute($parentInsertParams);
        $parentId = (int)$pdo->lastInsertId();
    }

    $deleteChildren = $pdo->prepare("DELETE FROM {$childTable} WHERE firm_id = :firm_id AND ge_no = :ge_no AND mrr_no = :mrr_no");
    $deleteChildren->execute([
        'firm_id' => $firmId,
        'ge_no' => $geNo,
        'mrr_no' => $mrrNumber,
    ]);

    foreach ($invoiceGoods as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $itemData = array_merge($parentData, $item, [
            'mrr_number' => $mrrNumber,
            'ge_no' => $geNo,
            's_no' => value($item, 's_no', 'sort_no') ?: (string)($index + 1),
            'description' => value($item, 'description'),
            'sort' => value($item, 'sort_no'),
            'party_order' => value($item, 'party_order'),
            'po_no' => value($item, 'po_no'),
            'po_details' => value($item, 'po_details'),
            'po_date' => value($item, 'po_date'),
            'po_rate' => value($item, 'po_rate'),
            'reels' => value($item, 'reels'),
            'weight' => value($item, 'weight'),
            'rate' => value($item, 'rate'),
            'amount' => value($item, 'amount'),
            'quantity' => value($item, 'quantity'),
            'po_quantity' => value($item, 'po_quantity'),
        ]);
        $insertChildSql = $hasSourceType
            ? "
            INSERT INTO {$childTable} (
                firm_id, record_group_id, ge_no, mrr_no, parent_id, source_type, row_sort, s_no, description_text,
                hsn_code, sort_no, party_order_no, po_no, po_date, po_details, po_rate, gsm_value, size_value,
                unit_value, reels_value, weight_value, rate_value, amount_value, quantity_value, po_quantity,
                supplier_reel_no, our_reel_no, reel_details, erp_code, bf_value, extra_json
            ) VALUES (
                :firm_id, :record_group_id, :ge_no, :mrr_no, :parent_id, 'mrr_item', :row_sort, :s_no, :description_text,
                :hsn_code, :sort_no, :party_order_no, :po_no, :po_date, :po_details, :po_rate, :gsm_value, :size_value,
                :unit_value, :reels_value, :weight_value, :rate_value, :amount_value, :quantity_value, :po_quantity,
                :supplier_reel_no, :our_reel_no, :reel_details, :erp_code, :bf_value, :extra_json
            )"
            : "
            INSERT INTO {$childTable} (
                firm_id, record_group_id, ge_no, mrr_no, parent_id, row_sort, s_no, description_text,
                hsn_code, sort_no, party_order_no, po_no, po_date, po_details, po_rate, gsm_value, size_value,
                unit_value, reels_value, weight_value, rate_value, amount_value, quantity_value, po_quantity,
                supplier_reel_no, our_reel_no, reel_details, erp_code, bf_value, extra_json
            ) VALUES (
                :firm_id, :record_group_id, :ge_no, :mrr_no, :parent_id, :row_sort, :s_no, :description_text,
                :hsn_code, :sort_no, :party_order_no, :po_no, :po_date, :po_details, :po_rate, :gsm_value, :size_value,
                :unit_value, :reels_value, :weight_value, :rate_value, :amount_value, :quantity_value, :po_quantity,
                :supplier_reel_no, :our_reel_no, :reel_details, :erp_code, :bf_value, :extra_json
            )";
        $insertChild = $pdo->prepare($insertChildSql);
        $insertChild->execute([
            'firm_id' => $firmId,
            'record_group_id' => $recordGroupId,
            'ge_no' => $geNo,
            'mrr_no' => $mrrNumber,
            'parent_id' => $parentId,
            'row_sort' => $index + 1,
            's_no' => value($itemData, 's_no') ?: null,
            'description_text' => value($itemData, 'description') ?: null,
            'hsn_code' => value($itemData, 'hsn') ?: null,
            'sort_no' => value($itemData, 'sort_no') ?: null,
            'party_order_no' => value($itemData, 'party_order') ?: null,
            'po_no' => value($itemData, 'po_no') ?: null,
            'po_date' => value($itemData, 'po_date') ?: null,
            'po_details' => value($itemData, 'po_details') ?: null,
            'po_rate' => value($itemData, 'po_rate') !== '' ? value($itemData, 'po_rate') : null,
            'gsm_value' => value($itemData, 'gsm') ?: null,
            'size_value' => value($itemData, 'size') ?: null,
            'unit_value' => value($itemData, 'unit', 'size_unit') ?: null,
            'reels_value' => value($itemData, 'reels') !== '' ? value($itemData, 'reels') : null,
            'weight_value' => value($itemData, 'weight') !== '' ? value($itemData, 'weight') : null,
            'rate_value' => value($itemData, 'rate') !== '' ? value($itemData, 'rate') : null,
            'amount_value' => value($itemData, 'amount') !== '' ? value($itemData, 'amount') : null,
            'quantity_value' => value($itemData, 'quantity') !== '' ? value($itemData, 'quantity') : null,
            'po_quantity' => value($itemData, 'po_quantity') !== '' ? value($itemData, 'po_quantity') : null,
            'supplier_reel_no' => value($itemData, 'supplier_reel_no') ?: null,
            'our_reel_no' => value($itemData, 'our_reel_number', 'reel_no') ?: null,
            'reel_details' => value($itemData, 'reel_details', 'item_name') ?: null,
            'erp_code' => value($itemData, 'erp_code') ?: null,
            'bf_value' => value($itemData, 'bf') ?: null,
            'extra_json' => json_encode($itemData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    foreach ($helperRows as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $helperData = array_merge($parentData, $item, [
            'mrr_number' => value($item, 'mrr_number') ?: $mrrNumber,
            'mrr_form_id' => value($item, 'mrr_form_id') ?: value($parentData, 'mrr_form_id'),
            'date' => value($item, 'date') ?: value($parentData, 'date'),
            'sup_doc_no' => value($item, 'sup_doc_no') ?: value($parentData, 'sup_doc_no'),
        ]);
        $insertHelperSql = $hasSourceType
            ? "
            INSERT INTO {$childTable} (
                firm_id, record_group_id, ge_no, mrr_no, parent_id, source_type, row_sort, s_no, description_text,
                hsn_code, sort_no, party_order_no, po_no, po_date, po_details, po_rate, gsm_value, size_value,
                unit_value, reels_value, weight_value, rate_value, amount_value, quantity_value, po_quantity,
                supplier_reel_no, our_reel_no, reel_details, erp_code, bf_value, extra_json
            ) VALUES (
                :firm_id, :record_group_id, :ge_no, :mrr_no, :parent_id, 'helper_item', :row_sort, :s_no, :description_text,
                :hsn_code, :sort_no, :party_order_no, :po_no, :po_date, :po_details, :po_rate, :gsm_value, :size_value,
                :unit_value, :reels_value, :weight_value, :rate_value, :amount_value, :quantity_value, :po_quantity,
                :supplier_reel_no, :our_reel_no, :reel_details, :erp_code, :bf_value, :extra_json
            )"
            : "
            INSERT INTO {$childTable} (
                firm_id, record_group_id, ge_no, mrr_no, parent_id, row_sort, s_no, description_text,
                hsn_code, sort_no, party_order_no, po_no, po_date, po_details, po_rate, gsm_value, size_value,
                unit_value, reels_value, weight_value, rate_value, amount_value, quantity_value, po_quantity,
                supplier_reel_no, our_reel_no, reel_details, erp_code, bf_value, extra_json
            ) VALUES (
                :firm_id, :record_group_id, :ge_no, :mrr_no, :parent_id, :row_sort, :s_no, :description_text,
                :hsn_code, :sort_no, :party_order_no, :po_no, :po_date, :po_details, :po_rate, :gsm_value, :size_value,
                :unit_value, :reels_value, :weight_value, :rate_value, :amount_value, :quantity_value, :po_quantity,
                :supplier_reel_no, :our_reel_no, :reel_details, :erp_code, :bf_value, :extra_json
            )";
        $insertHelper = $pdo->prepare($insertHelperSql);
        $insertHelper->execute([
            'firm_id' => $firmId,
            'record_group_id' => $recordGroupId,
            'ge_no' => $geNo,
            'mrr_no' => $mrrNumber,
            'parent_id' => $parentId,
            'row_sort' => $index + 1,
            's_no' => value($helperData, 's_no') ?: null,
            'description_text' => value($helperData, 'description', 'reel_details', 'item_name') ?: null,
            'hsn_code' => value($helperData, 'hsn') ?: null,
            'sort_no' => value($helperData, 'sort_no') ?: null,
            'party_order_no' => value($helperData, 'party_order') ?: null,
            'po_no' => value($helperData, 'po_no') ?: null,
            'po_date' => value($helperData, 'po_date') ?: null,
            'po_details' => value($helperData, 'po_details') ?: null,
            'po_rate' => value($helperData, 'po_rate') !== '' ? value($helperData, 'po_rate') : null,
            'gsm_value' => value($helperData, 'gsm') ?: null,
            'size_value' => value($helperData, 'size') ?: null,
            'unit_value' => value($helperData, 'unit') ?: null,
            'reels_value' => value($helperData, 'reels') !== '' ? value($helperData, 'reels') : null,
            'weight_value' => value($helperData, 'weight', 'net_wt') !== '' ? value($helperData, 'weight', 'net_wt') : null,
            'rate_value' => value($helperData, 'rate') !== '' ? value($helperData, 'rate') : null,
            'amount_value' => value($helperData, 'value', 'amount') !== '' ? value($helperData, 'value', 'amount') : null,
            'quantity_value' => value($helperData, 'quantity') !== '' ? value($helperData, 'quantity') : null,
            'po_quantity' => value($helperData, 'po_quantity') !== '' ? value($helperData, 'po_quantity') : null,
            'supplier_reel_no' => value($helperData, 'supplier_reel_no') ?: null,
            'our_reel_no' => value($helperData, 'our_reel_number', 'reel_no') ?: null,
            'reel_details' => value($helperData, 'reel_details', 'item_name') ?: null,
            'erp_code' => value($helperData, 'erp_code') ?: null,
            'bf_value' => value($helperData, 'bf') ?: null,
            'extra_json' => json_encode($helperData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    $updateGe = $pdo->prepare("
        UPDATE ge_entries
        SET mrr_no = :mrr_number,
            mrr_complete = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE firm_id = :firm_id AND ge_no = :ge_no
    ");
    $updateGe->execute([
        'mrr_number' => $mrrNumber,
        'firm_id' => $firmId,
        'ge_no' => $geNo,
    ]);

    writeBackendLog($action . '_success', [
        'trace_id' => $traceId,
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
        'helper_sheet_name' => $helperSheetName,
        'mrr_number' => $mrrNumber,
        'ge_no' => $geNo,
        'invoice_rows' => count($invoiceGoods),
        'helper_rows' => count($helperRows),
    ]);

    return [
        'ok' => true,
        'trace_id' => $traceId,
        'mrrForm' => ['updatedRows' => 1, 'insertedRows' => 0],
        'helperSheet' => ['insertedRows' => count($helperRows), 'deletedRows' => 0, 'sheet' => $helperSheetName],
        'mrr_number' => $mrrNumber,
    ];
}

try {
    $action = getAction();
    $firmId = getFirmId();

    if ($action === 'health') {
        try {
            db()->query('SELECT 1');
            $cfg = getConfig();
            $dbCfg = $cfg['db'] ?? [];
            $meta = is_array($cfg['_meta'] ?? null) ? $cfg['_meta'] : [];
            jsonOut([
                'ok' => true,
                'db' => 'ok',
                'db_config' => [
                    'host' => (string)($dbCfg['host'] ?? ''),
                    'port' => (int)($dbCfg['port'] ?? 3306),
                    'database' => (string)($dbCfg['database'] ?? ''),
                    'username' => (string)($dbCfg['username'] ?? ''),
                    'config_source' => (string)($meta['config_source'] ?? ''),
                    'used_env' => (bool)($meta['used_env'] ?? false),
                ],
            ]);
        } catch (Throwable $e) {
            $cfg = null;
            $dbCfg = [];
            $meta = [];
            try {
                $cfg = getConfig();
                $dbCfg = $cfg['db'] ?? [];
                $meta = is_array($cfg['_meta'] ?? null) ? $cfg['_meta'] : [];
            } catch (Throwable $e) {
            }
            jsonOut([
                'ok' => false,
                'db' => 'error',
                'error' => $e->getMessage(),
                'db_config' => [
                    'host' => (string)($dbCfg['host'] ?? ''),
                    'port' => (int)($dbCfg['port'] ?? 3306),
                    'database' => (string)($dbCfg['database'] ?? ''),
                    'username' => (string)($dbCfg['username'] ?? ''),
                    'config_source' => (string)($meta['config_source'] ?? ''),
                    'used_env' => (bool)($meta['used_env'] ?? false),
                ],
            ], 500);
        }
    }

    $normalizeMenuAccess = static function ($value): ?string {
        if ($value === null) return null;
        if (is_array($value)) {
            $keys = [];
            foreach ($value as $entry) {
                $key = trim((string)$entry);
                if ($key !== '') $keys[$key] = true;
            }
            return $keys ? json_encode(array_keys($keys), JSON_UNESCAPED_UNICODE) : null;
        }
        $text = trim((string)$value);
        if ($text === '') return null;
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            $keys = [];
            foreach ($decoded as $entry) {
                $key = trim((string)$entry);
                if ($key !== '') $keys[$key] = true;
            }
            return $keys ? json_encode(array_keys($keys), JSON_UNESCAPED_UNICODE) : null;
        }
        $parts = preg_split('/[,\n]+/', $text) ?: [];
        $keys = [];
        foreach ($parts as $part) {
            $key = trim((string)$part);
            if ($key !== '') $keys[$key] = true;
        }
        return $keys ? json_encode(array_keys($keys), JSON_UNESCAPED_UNICODE) : null;
    };

    $decodeMenuAccess = static function ($value): array {
        $text = trim((string)($value ?? ''));
        if ($text === '') return [];
        $decoded = json_decode($text, true);
        if (!is_array($decoded)) return [];
        $keys = [];
        foreach ($decoded as $entry) {
            $key = trim((string)$entry);
            if ($key !== '') $keys[$key] = true;
        }
        return array_keys($keys);
    };

    $hasMenuAccessColumn = false;
    try {
        $colStmt = db()->prepare("
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'app_users'
              AND COLUMN_NAME = 'menu_access'
            LIMIT 1
        ");
        $colStmt->execute();
        $hasMenuAccessColumn = (bool)$colStmt->fetchColumn();
    } catch (Throwable $e) {
        $hasMenuAccessColumn = false;
    }

    // Auto-migrate: some deployments were created before menu_access existed.
    if (!$hasMenuAccessColumn && in_array($action, ['save_users', 'get_users', 'authenticate_user'], true)) {
        try {
            db()->exec("ALTER TABLE app_users ADD COLUMN menu_access LONGTEXT DEFAULT NULL");
            $hasMenuAccessColumn = true;
        } catch (Throwable $e) {
            // Ignore if permissions are missing; UI will fall back to "all menus".
            $hasMenuAccessColumn = false;
        }
    }

    if ($action === 'authenticate_user') {
        ensureSessionStarted();
        $loginId = trim((string)($_GET['login_id'] ?? $_POST['login_id'] ?? ''));
        $password = trim((string)($_GET['password'] ?? $_POST['password'] ?? ''));
        $stmt = db()->prepare("
            SELECT *
            FROM app_users
            WHERE active = 1
              AND (login_id = :login_id OR user_email = :login_id)
            ORDER BY CASE WHEN login_id = :login_id THEN 1 ELSE 0 END DESC, id ASC
            LIMIT 1
        ");
        $stmt->execute(['login_id' => $loginId]);
        $user = $stmt->fetch();
        if (!$user) {
            jsonOut(['ok' => false, 'error' => 'Invalid user ID or password.'], 401);
        }
        $hash = trim((string)($user['password_hash'] ?? ''));
        $plain = trim((string)($user['password_plain'] ?? ''));
        $valid = $hash !== '' ? password_verify($password, $hash) : hash_equals($plain, $password);
        if (!$valid) {
            jsonOut(['ok' => false, 'error' => 'Invalid user ID or password.'], 401);
        }
        @session_regenerate_id(true);
        $_SESSION['auth'] = [
            'login_id' => (string)$user['login_id'],
            'role' => (string)$user['role'],
            'firm_id' => (string)$user['firm_id'],
        ];
        $menuAccess = $hasMenuAccessColumn ? $decodeMenuAccess($user['menu_access'] ?? null) : [];
        jsonOut([
            'ok' => true,
            // Keep these top-level fields for backward compatibility with older frontends.
            'login_id' => $user['login_id'],
            'user_email' => $user['user_email'],
            'display_name' => $user['display_name'],
            'role' => $user['role'],
            'firm_id' => $user['firm_id'],
            'menu_access' => $menuAccess,
            'user' => [
                'login_id' => $user['login_id'],
                'user_email' => $user['user_email'],
                'display_name' => $user['display_name'],
                'role' => $user['role'],
                'firm_id' => $user['firm_id'],
                'menu_access' => $menuAccess,
                'master_login' => true,
            ],
        ]);
    }

    if ($action === 'gemini_generate') {
        // Proxy Gemini requests so API keys remain server-side (not in frontend bundles).
        $auth = requireAuthenticated();
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!is_array($payload)) {
            jsonOut(['ok' => false, 'error' => 'Invalid JSON payload.'], 400);
        }
        $model = trim((string)($payload['model'] ?? ''));
        $requestBody = $payload['requestBody'] ?? null;
        if ($model === '' || !is_array($requestBody)) {
            jsonOut(['ok' => false, 'error' => 'Missing model or requestBody.'], 400);
        }

        // Ensure firm scoping when present (frontend passes firm_id to authenticate).
        $firmIdText = trim((string)($firmId ?? ''));
        $authFirm = trim((string)($auth['firm_id'] ?? ''));
        if ($firmIdText !== '' && $authFirm !== '' && $authFirm !== $firmIdText) {
            jsonOut(['ok' => false, 'error' => 'Access denied for this firm.'], 403);
        }

        $apiKey = trim((string)(getenv('GEMINI_API_KEY') ?: getenv('GOOGLE_GEMINI_API_KEY') ?: getenv('GCP_GEMINI_API_KEY') ?: ''));
        if ($apiKey === '') {
            // Allow using the same name as the frontend build var in hosting panels (server-side env).
            $apiKey = trim((string)(getenv('VITE_GEMINI_API_KEY') ?: ''));
        }
        if ($apiKey === '') {
            jsonOut(['ok' => false, 'error' => 'Missing GEMINI_API_KEY on server. Set it in your hosting environment variables.'], 500);
        }

        $url = 'https://generativelanguage.googleapis.com/v1/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($apiKey);
        $options = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => json_encode($requestBody, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'timeout' => 120,
            ],
        ];
        $context = stream_context_create($options);
        $responseText = @file_get_contents($url, false, $context);
        $statusLine = is_array($http_response_header ?? null) ? (string)($http_response_header[0] ?? '') : '';
        $status = 0;
        if (preg_match('/\s(\d{3})\s/', $statusLine, $m)) {
            $status = (int)$m[1];
        }
        if ($responseText === false) {
            jsonOut(['ok' => false, 'error' => 'Gemini request failed.'], 502);
        }
        $decoded = json_decode($responseText, true);
        if ($status >= 400) {
            jsonOut($decoded ?: ['ok' => false, 'error' => 'Gemini request failed.'], $status ?: 502);
        }
        if (!is_array($decoded)) {
            jsonOut(['ok' => false, 'error' => 'Gemini returned invalid JSON.'], 502);
        }
        jsonOut($decoded, 200);
    }

    if ($action === 'get_rows') {
        $sheetName = trim((string)($_GET['sheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $mrrNumber = trim((string)($_GET['mrr_number'] ?? ''));
        $geNo = trim((string)($_GET['ge_no'] ?? ''));
        $rows = fetchSheetDataRows($firmId, $sheetName, $mrrNumber !== '' ? $mrrNumber : null, $geNo !== '' ? $geNo : null);
        jsonOut([
            'ok' => true,
            'count' => $mrrNumber !== '' ? count($rows) : max(0, count($rows)),
            'values' => rowsPayload($sheetName, $rows),
        ]);
    }

    if ($action === 'db_ping') {
        $pdo = db();
        $row = $pdo->query('SELECT 1 AS ok')->fetch();
        $meta = $pdo->query('SELECT DATABASE() AS dbname, @@hostname AS host, @@port AS port, @@version AS version')->fetch();
        jsonOut([
            'ok' => true,
            'ping' => (int)($row['ok'] ?? 0),
            'database' => (string)($meta['dbname'] ?? ''),
            'server_host' => (string)($meta['host'] ?? ''),
            'server_port' => (string)($meta['port'] ?? ''),
            'server_version' => (string)($meta['version'] ?? ''),
        ]);
    }

    if ($action === 'ensure_reel_stock_schema') {
        $pdo = db();
        ensureReelStockSchema($pdo);
        jsonOut(['ok' => true]);
    }

    if ($action === 'get_reel_stock') {
        $rows = fetchReelStockRows($firmId);
        jsonOut(['ok' => true, 'count' => count($rows), 'rows' => $rows]);
    }

    if ($action === 'get_reel_issue_entries') {
        $pdo = db();
        ensureReelStockSchema($pdo);
        $jobNo = trim((string)($_GET['job_no'] ?? ''));
        $params = ['firm_id' => $firmId];
        $where = "firm_id = :firm_id";
        if ($jobNo !== '') {
            $where .= " AND job_no = :job_no";
            $params['job_no'] = $jobNo;
        }
        $stmt = $pdo->prepare("SELECT * FROM reel_issue_entries WHERE {$where} ORDER BY id DESC LIMIT 2000");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        jsonOut(['ok' => true, 'count' => count($rows), 'rows' => $rows]);
    }

    if ($action === 'get_reel_return_entries') {
        $pdo = db();
        ensureReelStockSchema($pdo);
        $jobNo = trim((string)($_GET['job_no'] ?? ''));
        $params = ['firm_id' => $firmId];
        $where = "firm_id = :firm_id";
        if ($jobNo !== '') {
            $where .= " AND job_no = :job_no";
            $params['job_no'] = $jobNo;
        }
        $stmt = $pdo->prepare("SELECT * FROM reel_return_entries WHERE {$where} ORDER BY id DESC LIMIT 2000");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        jsonOut(['ok' => true, 'count' => count($rows), 'rows' => $rows]);
    }

    if ($action === 'save_reel_issue_entry') {
        $pdo = db();
        ensureReelStockSchema($pdo);
        $payload = readPayload();
        $jobNo = trim((string)($payload['job_no'] ?? ''));
        $ourReelNo = trim((string)($payload['our_reel_no'] ?? ''));
        $issueWeight = (float)($payload['issue_weight'] ?? 0);
        $issueDate = trim((string)($payload['issue_date'] ?? ''));
        $corrugation = trim((string)($payload['corrugation'] ?? ''));
        $createdBy = trim((string)($payload['created_by'] ?? $payload['user_email'] ?? ''));

        if ($jobNo === '' || $ourReelNo === '' || $issueWeight <= 0) {
            jsonOut(['ok' => false, 'error' => 'Missing job_no / our_reel_no / issue_weight.'], 400);
        }

        $available = getAvailableWeightForReel($firmId, $ourReelNo);
        if ($issueWeight > $available + 0.0001) {
            jsonOut(['ok' => false, 'error' => 'Issue weight exceeds available reel weight.'], 400);
        }

        // Snapshot current reel meta (best-effort).
        $metaStmt = $pdo->prepare("
            SELECT c.erp_code, COALESCE(p.supplier_name, '') AS supplier_name, c.size_value, c.gsm_value, c.bf_value, c.rate_value
            FROM reel_mrr_children c
            LEFT JOIN reel_mrr_parents p ON p.id = c.parent_id AND p.firm_id = c.firm_id
            WHERE c.firm_id = :firm_id AND c.our_reel_no = :our_reel_no
            ORDER BY c.id DESC
            LIMIT 1
        ");
        $metaStmt->execute(['firm_id' => $firmId, 'our_reel_no' => $ourReelNo]);
        $meta = $metaStmt->fetch() ?: [];

        $stmt = $pdo->prepare("
            INSERT INTO reel_issue_entries
              (firm_id, job_no, our_reel_no, issue_weight, issue_date, corrugation, erp_code, supplier_name, size_value, gsm_value, bf_value, rate_value, created_by, extra_json)
            VALUES
              (:firm_id, :job_no, :our_reel_no, :issue_weight, :issue_date, :corrugation, :erp_code, :supplier_name, :size_value, :gsm_value, :bf_value, :rate_value, :created_by, :extra_json)
        ");
        $stmt->execute([
            'firm_id' => $firmId,
            'job_no' => $jobNo,
            'our_reel_no' => $ourReelNo,
            'issue_weight' => $issueWeight,
            'issue_date' => $issueDate !== '' ? $issueDate : date('d/m/Y'),
            'corrugation' => $corrugation !== '' ? $corrugation : null,
            'erp_code' => (string)($meta['erp_code'] ?? ''),
            'supplier_name' => (string)($meta['supplier_name'] ?? ''),
            'size_value' => (string)($meta['size_value'] ?? ''),
            'gsm_value' => (string)($meta['gsm_value'] ?? ''),
            'bf_value' => (string)($meta['bf_value'] ?? ''),
            'rate_value' => $meta['rate_value'] ?? null,
            'created_by' => $createdBy !== '' ? $createdBy : null,
            'extra_json' => null,
        ]);

        jsonOut(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    if ($action === 'save_reel_return_entry') {
        $pdo = db();
        ensureReelStockSchema($pdo);
        $payload = readPayload();
        $jobNo = trim((string)($payload['job_no'] ?? ''));
        $ourReelNo = trim((string)($payload['our_reel_no'] ?? ''));
        $returnWeight = (float)($payload['return_weight'] ?? 0);
        $returnDate = trim((string)($payload['return_date'] ?? ''));
        $corrugation = trim((string)($payload['corrugation'] ?? ''));
        $createdBy = trim((string)($payload['created_by'] ?? $payload['user_email'] ?? ''));

        if ($jobNo === '' || $ourReelNo === '' || $returnWeight <= 0) {
            jsonOut(['ok' => false, 'error' => 'Missing job_no / our_reel_no / return_weight.'], 400);
        }

        $metaStmt = $pdo->prepare("
            SELECT c.erp_code, COALESCE(p.supplier_name, '') AS supplier_name, c.size_value, c.gsm_value, c.bf_value, c.rate_value
            FROM reel_mrr_children c
            LEFT JOIN reel_mrr_parents p ON p.id = c.parent_id AND p.firm_id = c.firm_id
            WHERE c.firm_id = :firm_id AND c.our_reel_no = :our_reel_no
            ORDER BY c.id DESC
            LIMIT 1
        ");
        $metaStmt->execute(['firm_id' => $firmId, 'our_reel_no' => $ourReelNo]);
        $meta = $metaStmt->fetch() ?: [];

        $stmt = $pdo->prepare("
            INSERT INTO reel_return_entries
              (firm_id, job_no, our_reel_no, return_weight, return_date, corrugation, erp_code, supplier_name, size_value, gsm_value, bf_value, rate_value, created_by, extra_json)
            VALUES
              (:firm_id, :job_no, :our_reel_no, :return_weight, :return_date, :corrugation, :erp_code, :supplier_name, :size_value, :gsm_value, :bf_value, :rate_value, :created_by, :extra_json)
        ");
        $stmt->execute([
            'firm_id' => $firmId,
            'job_no' => $jobNo,
            'our_reel_no' => $ourReelNo,
            'return_weight' => $returnWeight,
            'return_date' => $returnDate !== '' ? $returnDate : date('d/m/Y'),
            'corrugation' => $corrugation !== '' ? $corrugation : null,
            'erp_code' => (string)($meta['erp_code'] ?? ''),
            'supplier_name' => (string)($meta['supplier_name'] ?? ''),
            'size_value' => (string)($meta['size_value'] ?? ''),
            'gsm_value' => (string)($meta['gsm_value'] ?? ''),
            'bf_value' => (string)($meta['bf_value'] ?? ''),
            'rate_value' => $meta['rate_value'] ?? null,
            'created_by' => $createdBy !== '' ? $createdBy : null,
            'extra_json' => null,
        ]);

        jsonOut(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    if ($action === 'get_latest_ids') {
        $sheetName = trim((string)($_GET['mrrSheet'] ?? $_GET['sheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geSheetName = trim((string)($_GET['geSheet'] ?? 'GE ENTRY')) ?: 'GE ENTRY';
        $prefix = trim((string)($_GET['prefix'] ?? ''));

        $pdo = db();
        
        // For GE: use atomic sequence for uniqueness if prefix is provided
        $geVal = 0;
        if ($prefix !== '') {
            // Find current max to initialize sequence if not exists
            $stmt = $pdo->prepare("SELECT ge_no FROM ge_entries WHERE firm_id = :firm_id AND ge_no LIKE :prefix_like ORDER BY id DESC LIMIT 50");
            $stmt->execute(['firm_id' => $firmId, 'prefix_like' => $prefix . '%']);
            $vals = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $currentMax = numericSuffixMax($vals, $prefix);
            
            // Get next value atomically
            $geVal = getNextSequenceValue($firmId, 'GE:' . $prefix, $currentMax);
            // Since frontend adds 1 to what we return, we return geVal - 1 
            // OR we can change frontend. 
            // The current frontend does: Number(latest?.ge || 0) + 1
            // So if we return the "next" number, we should return geVal - 1.
            $geVal = $geVal - 1;
        }

        // For MRR: implementation same as GE if prefix provided
        $mrrVal = 0;
        if ($prefix !== '') {
            $stmt = $pdo->prepare("SELECT mrr_number FROM app_records WHERE firm_id = :firm_id AND sheet_name = :sheet AND mrr_number LIKE :prefix_like ORDER BY id DESC LIMIT 50");
            $stmt->execute(['firm_id' => $firmId, 'sheet' => $sheetName, 'prefix_like' => $prefix . '%']);
            $vals = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $currentMax = numericSuffixMax($vals, $prefix);
            
            $mrrVal = getNextSequenceValue($firmId, 'MRR:' . $prefix, $currentMax);
            $mrrVal = $mrrVal - 1;
        }

        jsonOut([
            'ok' => true,
            'mrr' => $mrrVal,
            'ge' => $geVal,
        ]);
    }

    if ($action === 'get_suppliers') {
        $stmt = db()->prepare("
            SELECT supplier_name
            FROM suppliers
            WHERE firm_id = :firm_id
              AND active = 1
            ORDER BY supplier_name ASC
        ");
        $stmt->execute(['firm_id' => $firmId]);
        $result = array_values(array_filter(array_map(
            static fn(array $row): string => trim((string)($row['supplier_name'] ?? '')),
            $stmt->fetchAll()
        )));
        if (!$result) {
            $sheetName = trim((string)($_GET['sheet'] ?? 'PO DETAILS')) ?: 'PO DETAILS';
            $rows = fetchSheetDataRows($firmId, $sheetName);
            $suppliers = [];
            foreach ($rows as $row) {
                $supplier = value($row, 'supplier');
                if ($supplier !== '') {
                    $suppliers[$supplier] = true;
                }
            }
            $result = array_keys($suppliers);
        }
        sort($result, SORT_NATURAL | SORT_FLAG_CASE);
        jsonOut(['ok' => true, 'values' => $result]);
    }

    if ($action === 'get_supplier_master') {
        $stmt = db()->prepare("
            SELECT id, supplier_name, supplier_code, phone_no, gstin, active
            FROM suppliers
            WHERE firm_id = :firm_id
            ORDER BY supplier_name ASC, id ASC
        ");
        $stmt->execute(['firm_id' => $firmId]);
        $rows = array_map(static function (array $row): array {
            return [
                'id' => (string)($row['id'] ?? ''),
                'supplier_name' => trim((string)($row['supplier_name'] ?? '')),
                'supplier_code' => trim((string)($row['supplier_code'] ?? '')),
                'phone_no' => trim((string)($row['phone_no'] ?? '')),
                'gstin' => trim((string)($row['gstin'] ?? '')),
                'active' => (string)($row['active'] ?? '1'),
            ];
        }, $stmt->fetchAll());
        jsonOut(['ok' => true, 'suppliers' => $rows]);
    }

    if ($action === 'get_users') {
        $stmt = db()->prepare($hasMenuAccessColumn
            ? "SELECT login_id, display_name, user_email, role, menu_access, active FROM app_users WHERE firm_id = :firm_id ORDER BY login_id ASC"
            : "SELECT login_id, display_name, user_email, role, active FROM app_users WHERE firm_id = :firm_id ORDER BY login_id ASC"
        );
        $stmt->execute(['firm_id' => $firmId]);
        $users = $stmt->fetchAll();
        if ($hasMenuAccessColumn) {
            $users = array_map(static function (array $row) use ($decodeMenuAccess): array {
                $row['menu_access'] = $decodeMenuAccess($row['menu_access'] ?? null);
                return $row;
            }, $users);
        } else {
            $users = array_map(static function (array $row): array {
                $row['menu_access'] = [];
                return $row;
            }, $users);
        }
        jsonOut([
            'ok' => true,
            'users' => $users,
        ]);
    }

    if ($action === 'get_items') {
        $cols = tableColumns('item_master');
        $hasType = in_array('item_type', $cols, true);
        $hasSize = in_array('size_value', $cols, true);
        $hasGsm = in_array('gsm_value', $cols, true);
        $hasBf = in_array('bf_value', $cols, true);

        $select = [
            'id',
            $hasType ? 'item_type' : "'mrr' AS item_type",
            'erp_code',
            'item_name',
            $hasSize ? 'size_value' : "'' AS size_value",
            $hasGsm ? 'gsm_value' : "'' AS gsm_value",
            $hasBf ? 'bf_value' : "'' AS bf_value",
            'unit_value',
            'active',
        ];

        $stmt = db()->prepare("
            SELECT " . implode(', ', $select) . "
            FROM item_master
            WHERE firm_id = :firm_id
            ORDER BY item_type ASC, COALESCE(erp_code, ''), item_name ASC
        ");
        $stmt->execute(['firm_id' => $firmId]);
        $rows = $stmt->fetchAll();
        $items = array_map(static function (array $row): array {
            return [
                'id' => (string)($row['id'] ?? ''),
                'item_type' => trim((string)($row['item_type'] ?? 'mrr')) ?: 'mrr',
                'erp_code' => trim((string)($row['erp_code'] ?? '')),
                'item_name' => trim((string)($row['item_name'] ?? '')),
                'size' => trim((string)($row['size_value'] ?? '')),
                'gsm' => trim((string)($row['gsm_value'] ?? '')),
                'bf' => trim((string)($row['bf_value'] ?? '')),
                'unit' => trim((string)($row['unit_value'] ?? '')),
                'active' => (string)((int)($row['active'] ?? 1)),
            ];
        }, $rows);
        jsonOut([
            'ok' => true,
            'items' => $items,
        ]);
    }

    if ($action === 'get_purchase_requests') {
        $stmt = db()->prepare("
            SELECT pr_no, department_name, requested_by, requisition_date, required_date, status_text, created_by, approved_by, approved_at
            FROM purchase_requests
            WHERE firm_id = :firm_id
            ORDER BY id DESC
        ");
        $stmt->execute(['firm_id' => $firmId]);
        $rows = $stmt->fetchAll();
        $prs = array_map(static function (array $row): array {
            return [
                'pr_no' => trim((string)($row['pr_no'] ?? '')),
                'department' => trim((string)($row['department_name'] ?? '')),
                'requested_by' => trim((string)($row['requested_by'] ?? '')),
                'requisition_date' => trim((string)($row['requisition_date'] ?? '')),
                'required_date' => trim((string)($row['required_date'] ?? '')),
                'status' => trim((string)($row['status_text'] ?? 'pending')) ?: 'pending',
                'created_by' => trim((string)($row['created_by'] ?? '')),
                'approved_by' => trim((string)($row['approved_by'] ?? '')),
                'approved_at' => trim((string)($row['approved_at'] ?? '')),
            ];
        }, $rows);
        jsonOut(['ok' => true, 'purchase_requests' => $prs]);
    }

    if ($action === 'get_purchase_request_details') {
        $prNo = trim((string)($_GET['pr_no'] ?? ''));
        if ($prNo === '') {
            jsonOut(['ok' => false, 'error' => 'Missing pr_no.'], 400);
        }
        $pdo = db();
        $stmt = $pdo->prepare("SELECT * FROM purchase_requests WHERE firm_id = :firm_id AND pr_no = :pr_no LIMIT 1");
        $stmt->execute(['firm_id' => $firmId, 'pr_no' => $prNo]);
        $pr = $stmt->fetch();
        if (!$pr) {
            jsonOut(['ok' => false, 'error' => 'Purchase request not found.'], 404);
        }
        $priCols = tableColumns('purchase_request_items');
        $hasItemId = in_array('item_id', $priCols, true);
        $itemsSelect = "id, row_sort, " . ($hasItemId ? "item_id, " : "") . "erp_code, item_name, description_text, unit_value, qty_value, rate_value, amount_value, remark_text";
        $itemsStmt = $pdo->prepare("
            SELECT {$itemsSelect}
            FROM purchase_request_items
            WHERE firm_id = :firm_id AND pr_id = :pr_id
            ORDER BY row_sort ASC, id ASC
        ");
        $itemsStmt->execute(['firm_id' => $firmId, 'pr_id' => (int)$pr['id']]);
        $items = array_map(static function (array $row) use ($hasItemId): array {
            return [
                'pr_item_id' => (string)($row['id'] ?? ''),
                'item_id' => $hasItemId ? (string)($row['item_id'] ?? '') : '',
                'erp_code' => trim((string)($row['erp_code'] ?? '')),
                'item_name' => trim((string)($row['item_name'] ?? '')),
                'description' => trim((string)($row['description_text'] ?? '')),
                'unit' => trim((string)($row['unit_value'] ?? '')),
                'qty' => (string)($row['qty_value'] ?? ''),
                'rate' => (string)($row['rate_value'] ?? ''),
                'amount' => (string)($row['amount_value'] ?? ''),
                'remark' => trim((string)($row['remark_text'] ?? '')),
            ];
        }, $itemsStmt->fetchAll());

        jsonOut([
            'ok' => true,
            'purchase_request' => [
                'pr_no' => trim((string)($pr['pr_no'] ?? '')),
                'department' => trim((string)($pr['department_name'] ?? '')),
                'requested_by' => trim((string)($pr['requested_by'] ?? '')),
                'requisition_date' => trim((string)($pr['requisition_date'] ?? '')),
                'required_date' => trim((string)($pr['required_date'] ?? '')),
                'status' => trim((string)($pr['status_text'] ?? 'pending')) ?: 'pending',
                'remark' => trim((string)($pr['remark_text'] ?? '')),
                'created_by' => trim((string)($pr['created_by'] ?? '')),
                'approved_by' => trim((string)($pr['approved_by'] ?? '')),
                'approved_at' => trim((string)($pr['approved_at'] ?? '')),
            ],
            'items' => $items,
        ]);
    }

    if ($action === 'get_purchase_orders') {
        $cols = tableColumns('purchase_orders');
        $hasPoDetails = in_array('po_details', $cols, true);
        $select = 'po.po_no, po.pr_id, po.supplier_name, po.po_date, po.status_text, po.created_by, po.approved_by, po.approved_at, po.po_type';
        if ($hasPoDetails) {
            $select = 'po.po_no, po.pr_id, po.supplier_name, po.po_date, po.po_details, po.status_text, po.created_by, po.approved_by, po.approved_at, po.po_type';
        }
        $stmt = db()->prepare("
            SELECT {$select}, pr.pr_no AS pr_no
            FROM purchase_orders po
            LEFT JOIN purchase_requests pr
              ON pr.id = po.pr_id AND pr.firm_id = po.firm_id
            WHERE po.firm_id = :firm_id
            ORDER BY po.id DESC
        ");
        $stmt->execute(['firm_id' => $firmId]);
        $rows = $stmt->fetchAll();
        $pos = array_map(static function (array $row) use ($hasPoDetails): array {
            return [
                'po_no' => trim((string)($row['po_no'] ?? '')),
                'pr_id' => (string)($row['pr_id'] ?? ''),
                'pr_no' => trim((string)($row['pr_no'] ?? '')),
                'supplier' => trim((string)($row['supplier_name'] ?? '')),
                'po_date' => trim((string)($row['po_date'] ?? '')),
                'po_details' => $hasPoDetails ? trim((string)($row['po_details'] ?? '')) : '',
                'po_type' => trim((string)($row['po_type'] ?? 'mrr')) ?: 'mrr',
                'status' => trim((string)($row['status_text'] ?? 'draft')) ?: 'draft',
                'created_by' => trim((string)($row['created_by'] ?? '')),
                'approved_by' => trim((string)($row['approved_by'] ?? '')),
                'approved_at' => trim((string)($row['approved_at'] ?? '')),
            ];
        }, $rows);
        jsonOut(['ok' => true, 'purchase_orders' => $pos]);
    }

    if ($action === 'get_purchase_order_details') {
        $poNo = trim((string)($_GET['po_no'] ?? ''));
        if ($poNo === '') {
            jsonOut(['ok' => false, 'error' => 'Missing po_no.'], 400);
        }
        $pdo = db();
        $stmt = $pdo->prepare("SELECT * FROM purchase_orders WHERE firm_id = :firm_id AND po_no = :po_no LIMIT 1");
        $stmt->execute(['firm_id' => $firmId, 'po_no' => $poNo]);
        $po = $stmt->fetch();
        if (!$po) {
            jsonOut(['ok' => false, 'error' => 'Purchase order not found.'], 404);
        }
        $poiCols = tableColumns('purchase_order_items');
        $hasItemSupplier = in_array('supplier_name', $poiCols, true);
        $hasPrItemId = in_array('pr_item_id', $poiCols, true);
        $hasItemId = in_array('item_id', $poiCols, true);
        $itemsStmt = $pdo->prepare("
            SELECT id, row_sort, "
              . ($hasItemSupplier ? "supplier_name, " : "")
              . ($hasPrItemId ? "pr_item_id, " : "")
              . ($hasItemId ? "item_id, " : "")
              . "erp_code, item_name, description_text, unit_value, qty_value, rate_value, amount_value, remark_text
            FROM purchase_order_items
            WHERE firm_id = :firm_id AND po_id = :po_id
            ORDER BY row_sort ASC, id ASC
        ");
        $itemsStmt->execute(['firm_id' => $firmId, 'po_id' => (int)$po['id']]);
        $items = array_map(static function (array $row) use ($hasItemSupplier, $hasPrItemId, $hasItemId): array {
            return [
                'po_item_id' => (string)($row['id'] ?? ''),
                'pr_item_id' => $hasPrItemId ? (string)($row['pr_item_id'] ?? '') : '',
                'item_id' => $hasItemId ? (string)($row['item_id'] ?? '') : '',
                'supplier' => $hasItemSupplier ? trim((string)($row['supplier_name'] ?? '')) : '',
                'erp_code' => trim((string)($row['erp_code'] ?? '')),
                'item_name' => trim((string)($row['item_name'] ?? '')),
                'description' => trim((string)($row['description_text'] ?? '')),
                'unit' => trim((string)($row['unit_value'] ?? '')),
                'qty' => (string)($row['qty_value'] ?? ''),
                'rate' => (string)($row['rate_value'] ?? ''),
                'amount' => (string)($row['amount_value'] ?? ''),
                'remark' => trim((string)($row['remark_text'] ?? '')),
            ];
        }, $itemsStmt->fetchAll());

        jsonOut([
            'ok' => true,
            'purchase_order' => [
                'po_no' => trim((string)($po['po_no'] ?? '')),
                'pr_id' => (string)($po['pr_id'] ?? ''),
                'supplier' => trim((string)($po['supplier_name'] ?? '')),
                'po_date' => trim((string)($po['po_date'] ?? '')),
                'po_details' => trim((string)($po['po_details'] ?? '')),
                'po_type' => trim((string)($po['po_type'] ?? 'mrr')) ?: 'mrr',
                'status' => trim((string)($po['status_text'] ?? 'draft')) ?: 'draft',
                'remark' => trim((string)($po['remark_text'] ?? '')),
                'created_by' => trim((string)($po['created_by'] ?? '')),
                'approved_by' => trim((string)($po['approved_by'] ?? '')),
                'approved_at' => trim((string)($po['approved_at'] ?? '')),
            ],
            'items' => $items,
        ]);
    }

    if ($action === 'get_last_purchase_info') {
        $payload = readPayload();
        $type = strtolower(trim((string)($_GET['item_type'] ?? $payload['item_type'] ?? 'reel'))) ?: 'reel';
        if ($type !== 'reel' && $type !== 'mrr' && $type !== 'other') $type = 'reel';

        $keys = [];
        $fromPayload = $payload['keys'] ?? null;
        if (is_array($fromPayload)) {
            foreach ($fromPayload as $k) {
                $t = trim((string)$k);
                if ($t !== '') $keys[] = $t;
            }
        } else {
            $csv = (string)($_GET['keys'] ?? '');
            if (trim($csv) !== '') {
                foreach (explode(',', $csv) as $k) {
                    $t = trim((string)$k);
                    if ($t !== '') $keys[] = $t;
                }
            }
        }
        $keys = array_values(array_unique($keys));
        if (!$keys) {
            jsonOut(['ok' => true, 'items' => []]);
        }

        $pdo = db();
        $in = implode(',', array_fill(0, count($keys), '?'));
        $field = ($type === 'reel' || $type === 'mrr') ? 'poi.erp_code' : 'poi.item_name';
        $sql = "
            SELECT po.id AS po_id, po.po_no, po.po_date, poi.erp_code, poi.item_name, poi.rate_value
            FROM purchase_orders po
            JOIN purchase_order_items poi ON poi.po_id = po.id AND poi.firm_id = po.firm_id
            WHERE po.firm_id = ?
              AND po.status_text = 'approved'
              AND {$field} IN ({$in})
            ORDER BY po.id DESC, poi.id DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge([$firmId], $keys));
        $rows = $stmt->fetchAll();

        $seen = [];
        $result = [];
        foreach ($rows as $row) {
            $key = $type === 'mrr'
                ? trim((string)($row['erp_code'] ?? ''))
                : trim((string)($row['item_name'] ?? ''));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $result[] = [
                'key' => $key,
                'po_no' => trim((string)($row['po_no'] ?? '')),
                'po_date' => trim((string)($row['po_date'] ?? '')),
                'last_rate' => (string)($row['rate_value'] ?? ''),
            ];
        }

        jsonOut(['ok' => true, 'items' => $result]);
    }

    if ($action === 'get_pending_ge') {
        $mrrSheetName = trim((string)($_GET['mrrSheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geRows = fetchSheetDataRows($firmId, 'GE ENTRY');
        $parentTable = mrrParentTableForSheet($mrrSheetName);
        $childTable = mrrChildTableForSheet($mrrSheetName);
        $parentStmt = db()->prepare("SELECT * FROM {$parentTable} WHERE firm_id = :firm_id ORDER BY mrr_no DESC, id ASC");
        $parentStmt->execute(['firm_id' => $firmId]);
        $mrrRows = array_map('hydrateMrrParentRow', $parentStmt->fetchAll());
        $result = [];

        foreach ($geRows as $row) {
            $mrrNo = value($row, 'mrr_no', 'mrr_number');
            $rowPendingStage = strtoupper(value($row, 'mrr_complete')) === 'YES' ? 'completed_mrr' : 'pending_mrr';
            if ($rowPendingStage !== 'pending_mrr' && $mrrNo !== '') {
                continue;
            }
            $result[] = [
                'pending_stage' => 'pending_mrr',
                'pending_label' => 'Pending MRR',
                'sort_order' => 1,
                'ge_no' => value($row, 'ge_no'),
                'date' => value($row, 'date'),
                'supplier' => value($row, 'supplier'),
                'invoice_no' => value($row, 'invoice_no'),
                'truck_no' => value($row, 'truck_no'),
                'total_value' => value($row, 'total_value'),
                'mrr_no' => value($row, 'mrr_no', 'mrr_number'),
                'mrr_number' => value($row, 'mrr_number', 'mrr_no'),
            ];
        }

        $pendingParentPairs = [];
        foreach ($mrrRows as $row) {
            $stage = value($row, 'pending_stage');
            if ($stage === '') {
                $stage = determinePendingStage($row);
            }
            if (!in_array($stage, ['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval', 'pending_tally_posting'], true)) {
                continue;
            }
            $pairKey = strtoupper(trim((string)value($row, 'ge_no'))) . '|' . strtoupper(trim((string)value($row, 'mrr_number', 'mrr_no')));
            if ($pairKey !== '|') {
                $pendingParentPairs[$pairKey] = [
                    'ge_no' => trim((string)value($row, 'ge_no')),
                    'mrr_no' => trim((string)value($row, 'mrr_number', 'mrr_no')),
                ];
            }
            $result[] = [
                'pending_stage' => $stage,
                'pending_label' => ucwords(str_replace('_', ' ', $stage)),
                'sort_order' => 2,
                'ge_no' => value($row, 'ge_no'),
                'date' => value($row, 'date'),
                'mrr_number' => value($row, 'mrr_number', 'mrr_no'),
                'supplier' => value($row, 'supplier'),
                'mrr_entry_type' => value($row, 'mrr_entry_type'),
                'invoice_no' => value($row, 'sup_doc_no'),
                'truck_no' => value($row, 'truck_number'),
                'plant_head_remark' => value($row, 'plant_head_remark'),
                'accounts_remark' => value($row, 'accounts_remark'),
                'md_approval_remark' => value($row, 'md_approval_remark'),
                'invoice_basic_value' => value($row, 'invoice_basic_value'),
                'invoice_ttl_weight_kgs' => value($row, 'invoice_ttl_weight_kgs'),
                'actual_mrr_ttl_weight_kgs' => value($row, 'actual_mrr_ttl_weight_kgs'),
                'total_value' => value($row, 'invoice_basic_value'),
            ];
        }

        $pendingPairsList = array_values($pendingParentPairs);
        if (!empty($pendingPairsList)) {
            $pdo = db();
            $childStmt = $pdo->prepare("SELECT * FROM {$childTable} WHERE firm_id = :firm_id AND ge_no = :ge_no AND mrr_no = :mrr_no ORDER BY id ASC");
            $childrenByPair = [];
            foreach ($pendingPairsList as $pair) {
                $childStmt->execute([
                    'firm_id' => $firmId,
                    'ge_no' => $pair['ge_no'],
                    'mrr_no' => $pair['mrr_no'],
                ]);
                $rows = array_map('hydrateMrrChildRow', $childStmt->fetchAll());
                $pairKey = strtoupper(trim((string)$pair['ge_no'])) . '|' . strtoupper(trim((string)$pair['mrr_no']));
                $childrenByPair[$pairKey] = $rows;
            }

            foreach ($result as &$row) {
                $stage = trim((string)($row['pending_stage'] ?? ''));
                if ($stage === 'pending_mrr') {
                    continue;
                }
                $pairKey = strtoupper(trim((string)($row['ge_no'] ?? ''))) . '|' . strtoupper(trim((string)($row['mrr_number'] ?? $row['mrr_no'] ?? '')));
                $children = $childrenByPair[$pairKey] ?? [];
                if (empty($children)) {
                    continue;
                }

                $items = [];
                $poRates = [];
                $invoiceRates = [];
                foreach ($children as $child) {
                    $text = trim((string)($child['description'] ?? ''));
                    if ($text === '') $text = trim((string)($child['item_name'] ?? ''));
                    if ($text === '') $text = trim((string)($child['po_details'] ?? ''));
                    if ($text === '') $text = trim((string)($child['reel_details'] ?? ''));
                    if ($text !== '' && !preg_match('/\\btotal\\b/i', $text)) {
                        $items[] = $text;
                    }
                    $poRate = trim((string)($child['po_rate'] ?? ''));
                    if ($poRate === '') $poRate = trim((string)($child['helper_po_rate'] ?? ''));
                    if ($poRate !== '') {
                        $poRates[] = $poRate;
                    }
                    $invRate = trim((string)($child['rate'] ?? ''));
                    if ($invRate === '') $invRate = trim((string)($child['invoice_rate'] ?? ''));
                    if ($invRate !== '') {
                        $invoiceRates[] = $invRate;
                    }
                }

                if (!empty($items)) {
                    $row['item_name'] = implode('; ', array_slice($items, 0, 6));
                }
                if (!empty($poRates)) {
                    $row['po_rate'] = implode(', ', array_slice($poRates, 0, 6));
                }
                if (!empty($invoiceRates)) {
                    $row['rate'] = implode(', ', array_slice($invoiceRates, 0, 6));
                }
            }
            unset($row);
        }

        usort($result, fn($a, $b) => strcmp((string)($a['date'] ?? ''), (string)($b['date'] ?? '')));
        jsonOut(['ok' => true, 'values' => $result]);
    }

    if ($action === 'verify_ge') {
        $invoiceNo = trim((string)($_GET['invoice_no'] ?? ''));
        $supplier = trim((string)($_GET['supplier'] ?? ''));
        $stmt = db()->prepare("SELECT * FROM ge_entries WHERE firm_id = :firm_id AND invoice_no = :invoice_no ORDER BY id DESC LIMIT 1");
        $stmt->execute([
            'firm_id' => $firmId,
            'invoice_no' => $invoiceNo,
        ]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonOut(['ok' => true]);
        }
        $data = hydrateGeEntryRow($row);
        if ($supplier !== '' && stripos(value($data, 'supplier'), $supplier) === false) {
            jsonOut(['ok' => true]);
        }
        jsonOut([
            'ok' => true,
            'ge_no' => $row['ge_no'] ?? value($data, 'ge_no'),
            'mrr_no' => $row['mrr_no'] ?? value($data, 'mrr_no', 'mrr_number'),
        ]);
    }

    if ($action === 'diagnose_save') {
        $mrrSheetName = trim((string)($_GET['mrrSheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $helperSheetName = trim((string)($_GET['helperSheet'] ?? 'HELPER SHEET')) ?: 'HELPER SHEET';
        $mrrNumber = trim((string)($_GET['mrr_number'] ?? ''));
        $geNo = trim((string)($_GET['ge_no'] ?? ''));
        $mrrRows = $mrrNumber !== '' ? fetchSheetDataRows($firmId, $mrrSheetName, $mrrNumber, $geNo !== '' ? $geNo : null) : [];
        $helperRows = $mrrNumber !== '' ? fetchSheetDataRows($firmId, $helperSheetName, $mrrNumber, $geNo !== '' ? $geNo : null) : [];
        jsonOut([
            'ok' => true,
            'mrrSheet' => ['exists' => true, 'keyColumnFound' => true],
            'helperSheet' => ['exists' => true, 'keyColumnFound' => true],
            'countsForMrr' => [
                'mrr' => count($mrrRows),
                'helper' => count($helperRows),
            ],
            'missing' => [
                'mrrRequired' => [],
                'helperRequired' => [],
            ],
        ]);
    }

    if ($action === 'approve_pending_stage') {
        $result = updateApprovalDataForMrr(
            $firmId,
            trim((string)($_GET['mrr_number'] ?? '')),
            trim((string)($_GET['stage'] ?? '')),
            trim((string)($_GET['decision'] ?? 'approve')),
            $_GET
        );
        jsonOut($result);
    }

    $payload = readPayload();
    if ($action === 'save_po_rows') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $sheetName = trim((string)($payload['sheetName'] ?? 'PO DETAILS')) ?: 'PO DETAILS';
        $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];
        writeBackendLog('save_po_rows_start', array_merge(
            ['trace_id' => $traceId, 'action' => 'save_po_rows'],
            loggerContextSummary($payload)
        ));
        $pdo = db();
        $table = poTableForSheet($sheetName);
        $delete = $pdo->prepare("DELETE FROM {$table} WHERE firm_id = :firm_id");
        $delete->execute([
            'firm_id' => $firmId,
        ]);
        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }
            upsertSupplierName($firmId, trim((string)($row['supplier'] ?? '')));
            $insert = $pdo->prepare("
                INSERT INTO {$table} (
                    firm_id, po_no, po_date, supplier_name, po_details, erp_code, size_value, gsm_value, bf_value,
                    reel_details, unit_value, po_rate, quantity_value, status_text, quantity_received, pending_quantity,
                    closed_quantity, rapc_value
                ) VALUES (
                    :firm_id, :po_no, :po_date, :supplier_name, :po_details, :erp_code, :size_value, :gsm_value, :bf_value,
                    :reel_details, :unit_value, :po_rate, :quantity_value, :status_text, :quantity_received, :pending_quantity,
                    :closed_quantity, :rapc_value
                )
            ");
            $insert->execute([
                'firm_id' => $firmId,
                'po_no' => trim((string)($row['po_no'] ?? '')),
                'po_date' => trim((string)($row['date'] ?? '')) ?: null,
                'supplier_name' => trim((string)($row['supplier'] ?? '')) ?: null,
                'po_details' => trim((string)($row['po_details'] ?? '')) ?: null,
                'erp_code' => trim((string)($row['erp_code'] ?? '')) ?: null,
                'size_value' => trim((string)($row['size'] ?? '')) ?: null,
                'gsm_value' => trim((string)($row['gsm'] ?? '')) ?: null,
                'bf_value' => trim((string)($row['bf'] ?? '')) ?: null,
                'reel_details' => trim((string)($row['reel_details'] ?? '')) ?: null,
                'unit_value' => trim((string)($row['unit'] ?? '')) ?: null,
                'po_rate' => trim((string)($row['rate'] ?? $row['po_rate'] ?? '')) !== '' ? trim((string)($row['rate'] ?? $row['po_rate'])) : null,
                'quantity_value' => trim((string)($row['quantity'] ?? '')) !== '' ? trim((string)($row['quantity'])) : null,
                'status_text' => trim((string)($row['status'] ?? '')) ?: null,
                'quantity_received' => trim((string)($row['quantity_received'] ?? '')) !== '' ? trim((string)($row['quantity_received'])) : null,
                'pending_quantity' => trim((string)($row['pending'] ?? '')) !== '' ? trim((string)($row['pending'])) : null,
                'closed_quantity' => trim((string)($row['closed'] ?? '')) !== '' ? trim((string)($row['closed'])) : null,
                'rapc_value' => trim((string)($row['rapc'] ?? '')) !== '' ? trim((string)($row['rapc'])) : null,
            ]);
        }
        writeBackendLog('save_po_rows_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'sheet_name' => $sheetName,
            'saved_rows' => count($rows),
        ]);
        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'sheetName' => $sheetName,
            'savedRows' => count($rows),
        ]);
    }
    if ($action === 'save_users') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $users = is_array($payload['users'] ?? null) ? $payload['users'] : [];
        writeBackendLog('save_users_start', array_merge(
            ['trace_id' => $traceId, 'action' => 'save_users'],
            loggerContextSummary($payload)
        ));
        foreach ($users as $user) {
            if (!is_array($user)) continue;
            $loginId = trim((string)($user['login_id'] ?? ''));
            if ($loginId === '') continue;

            $displayName = trim((string)($user['display_name'] ?? ''));
            $userEmail = trim((string)($user['user_email'] ?? ''));
            $role = trim((string)($user['role'] ?? ''));
            $menuAccessJson = $hasMenuAccessColumn ? $normalizeMenuAccess($user['menu_access'] ?? null) : null;
            $password = trim((string)($user['password'] ?? ''));
            $active = trim((string)($user['active'] ?? '1')) === '0' ? 0 : 1;

            $check = db()->prepare("SELECT id FROM app_users WHERE firm_id = :firm_id AND login_id = :login_id LIMIT 1");
            $check->execute([
                'firm_id' => $firmId,
                'login_id' => $loginId,
            ]);
            $exists = $check->fetch();

            if ($exists) {
                if ($password !== '') {
                    if ($hasMenuAccessColumn) {
                        $update = db()->prepare("
                            UPDATE app_users
                            SET display_name = :display_name,
                                user_email = :user_email,
                                role = :role,
                                menu_access = :menu_access,
                                password_hash = :password_hash,
                                password_plain = NULL,
                                active = :active,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE firm_id = :firm_id AND login_id = :login_id
                        ");
                        $update->execute([
                            'display_name' => $displayName,
                            'user_email' => $userEmail,
                            'role' => $role,
                            'menu_access' => $menuAccessJson,
                            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                            'active' => $active,
                            'firm_id' => $firmId,
                            'login_id' => $loginId,
                        ]);
                    } else {
                        $update = db()->prepare("
                            UPDATE app_users
                            SET display_name = :display_name,
                                user_email = :user_email,
                                role = :role,
                                password_hash = :password_hash,
                                password_plain = NULL,
                                active = :active,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE firm_id = :firm_id AND login_id = :login_id
                        ");
                        $update->execute([
                            'display_name' => $displayName,
                            'user_email' => $userEmail,
                            'role' => $role,
                            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                            'active' => $active,
                            'firm_id' => $firmId,
                            'login_id' => $loginId,
                        ]);
                    }
                } else {
                    if ($hasMenuAccessColumn) {
                        $update = db()->prepare("
                            UPDATE app_users
                            SET display_name = :display_name,
                                user_email = :user_email,
                                role = :role,
                                menu_access = :menu_access,
                                active = :active,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE firm_id = :firm_id AND login_id = :login_id
                        ");
                        $update->execute([
                            'display_name' => $displayName,
                            'user_email' => $userEmail,
                            'role' => $role,
                            'menu_access' => $menuAccessJson,
                            'active' => $active,
                            'firm_id' => $firmId,
                            'login_id' => $loginId,
                        ]);
                    } else {
                        $update = db()->prepare("
                            UPDATE app_users
                            SET display_name = :display_name,
                                user_email = :user_email,
                                role = :role,
                                active = :active,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE firm_id = :firm_id AND login_id = :login_id
                        ");
                        $update->execute([
                            'display_name' => $displayName,
                            'user_email' => $userEmail,
                            'role' => $role,
                            'active' => $active,
                            'firm_id' => $firmId,
                            'login_id' => $loginId,
                        ]);
                    }
                }
            } else {
                if ($hasMenuAccessColumn) {
                    $insert = db()->prepare("
                        INSERT INTO app_users (
                            firm_id, login_id, user_email, display_name, role, menu_access, password_hash, password_plain, active
                        ) VALUES (
                            :firm_id, :login_id, :user_email, :display_name, :role, :menu_access, :password_hash, NULL, :active
                        )
                    ");
                    $insert->execute([
                        'firm_id' => $firmId,
                        'login_id' => $loginId,
                        'user_email' => $userEmail,
                        'display_name' => $displayName,
                        'role' => $role,
                        'menu_access' => $menuAccessJson,
                        'password_hash' => password_hash($password !== '' ? $password : 'abcd', PASSWORD_DEFAULT),
                        'active' => $active,
                    ]);
                } else {
                    $insert = db()->prepare("
                        INSERT INTO app_users (
                            firm_id, login_id, user_email, display_name, role, password_hash, password_plain, active
                        ) VALUES (
                            :firm_id, :login_id, :user_email, :display_name, :role, :password_hash, NULL, :active
                        )
                    ");
                    $insert->execute([
                        'firm_id' => $firmId,
                        'login_id' => $loginId,
                        'user_email' => $userEmail,
                        'display_name' => $displayName,
                        'role' => $role,
                        'password_hash' => password_hash($password !== '' ? $password : 'abcd', PASSWORD_DEFAULT),
                        'active' => $active,
                    ]);
                }
            }
        }
        writeBackendLog('save_users_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'saved_users' => count($users),
        ]);
        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'savedUsers' => count($users),
        ]);
    }

    if ($action === 'save_supplier_master') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $supplier = is_array($payload['supplier'] ?? null) ? $payload['supplier'] : [];

        $supplierName = trim((string)($supplier['supplier_name'] ?? $supplier['name'] ?? ''));
        if ($supplierName === '') {
            jsonOut(['ok' => false, 'error' => 'Supplier name required.'], 400);
        }

        $id = trim((string)($supplier['id'] ?? ''));
        $supplierCode = trim((string)($supplier['supplier_code'] ?? ''));
        $phone = trim((string)($supplier['phone_no'] ?? ''));
        $gstin = trim((string)($supplier['gstin'] ?? ''));
        $active = trim((string)($supplier['active'] ?? '1')) === '0' ? 0 : 1;

        writeBackendLog('save_supplier_master_start', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'supplier_name' => $supplierName,
        ]);

        $pdo = db();
        if ($id !== '') {
            $stmt = $pdo->prepare("
                UPDATE suppliers
                SET supplier_name = :supplier_name,
                    supplier_code = NULLIF(:supplier_code, ''),
                    phone_no = NULLIF(:phone_no, ''),
                    gstin = NULLIF(:gstin, ''),
                    active = :active,
                    updated_at = CURRENT_TIMESTAMP
                WHERE firm_id = :firm_id AND id = :id
            ");
            $stmt->execute([
                'supplier_name' => $supplierName,
                'supplier_code' => $supplierCode,
                'phone_no' => $phone,
                'gstin' => $gstin,
                'active' => $active,
                'firm_id' => $firmId,
                'id' => (int)$id,
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO suppliers (firm_id, supplier_name, supplier_code, phone_no, gstin, active)
                VALUES (:firm_id, :supplier_name, NULLIF(:supplier_code, ''), NULLIF(:phone_no, ''), NULLIF(:gstin, ''), :active)
                ON DUPLICATE KEY UPDATE
                    supplier_code = COALESCE(NULLIF(VALUES(supplier_code), ''), supplier_code),
                    phone_no = COALESCE(NULLIF(VALUES(phone_no), ''), phone_no),
                    gstin = COALESCE(NULLIF(VALUES(gstin), ''), gstin),
                    active = VALUES(active),
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([
                'firm_id' => $firmId,
                'supplier_name' => $supplierName,
                'supplier_code' => $supplierCode,
                'phone_no' => $phone,
                'gstin' => $gstin,
                'active' => $active,
            ]);
        }

        writeBackendLog('save_supplier_master_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'supplier_name' => $supplierName,
        ]);

        jsonOut(['ok' => true, 'trace_id' => $traceId]);
    }

    if ($action === 'save_items') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        writeBackendLog('save_items_start', array_merge(
            ['trace_id' => $traceId, 'action' => 'save_items'],
            loggerContextSummary($payload)
        ));

        $pdo = db();
        $cols = tableColumns('item_master');
        $hasType = in_array('item_type', $cols, true);
        $hasSize = in_array('size_value', $cols, true);
        $hasGsm = in_array('gsm_value', $cols, true);
        $hasBf = in_array('bf_value', $cols, true);

        if ($hasType || $hasSize || $hasGsm || $hasBf) {
            $stmt = $pdo->prepare("
                INSERT INTO item_master (firm_id, item_type, erp_code, item_name, size_value, gsm_value, bf_value, unit_value, active)
                VALUES (:firm_id, :item_type, :erp_code, :item_name, :size_value, :gsm_value, :bf_value, :unit_value, :active)
                ON DUPLICATE KEY UPDATE
                  item_name = VALUES(item_name),
                  size_value = VALUES(size_value),
                  gsm_value = VALUES(gsm_value),
                  bf_value = VALUES(bf_value),
                  unit_value = VALUES(unit_value),
                  active = VALUES(active)
            ");
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO item_master (firm_id, erp_code, item_name, unit_value, active)
                VALUES (:firm_id, :erp_code, :item_name, :unit_value, :active)
                ON DUPLICATE KEY UPDATE
                  item_name = VALUES(item_name),
                  unit_value = VALUES(unit_value),
                  active = VALUES(active)
            ");
        }

        $saved = 0;
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $erp = trim((string)($item['erp_code'] ?? $item['erp'] ?? ''));
            $name = trim((string)($item['item_name'] ?? $item['name'] ?? ''));

            $type = $hasType
                ? (strtolower(trim((string)($item['item_type'] ?? $item['type'] ?? 'reel'))) ?: 'reel')
                : 'reel';
            if ($type !== 'other' && $type !== 'mrr' && $type !== 'reel') $type = 'reel';

            $size = $hasSize ? trim((string)($item['size'] ?? $item['size_value'] ?? '')) : '';
            $gsm = $hasGsm ? trim((string)($item['gsm'] ?? $item['gsm_value'] ?? '')) : '';
            $bf = $hasBf ? trim((string)($item['bf'] ?? $item['bf_value'] ?? '')) : '';

            if ($hasType || $hasSize || $hasGsm || $hasBf) {
                if ($type === 'mrr') {
                    if ($erp === '' || $size === '' || $gsm === '' || $bf === '') {
                        continue;
                    }
                    if ($name === '') {
                        $parts = [];
                        if ($size !== '') $parts[] = 'Size: ' . $size . ($unit !== '' ? (' ' . $unit) : '');
                        if ($gsm !== '') $parts[] = 'GSM: ' . $gsm;
                        if ($bf !== '') $parts[] = 'BF: ' . $bf;
                        $rhs = implode(' X ', $parts);
                        $name = trim($erp . ($rhs !== '' ? (' - ' . $rhs) : ''));
                        if ($name === '') {
                            $name = $erp;
                        }
                    }
                } else {
                    if ($name === '') continue;
                    if ($erp === '') $erp = null;
                    if ($size === '') $size = null;
                    if ($gsm === '') $gsm = null;
                    if ($bf === '') $bf = null;
                }
            } else {
                if ($erp === '' || $name === '') continue;
            }
            $unit = trim((string)($item['unit'] ?? $item['unit_value'] ?? ''));
            $active = trim((string)($item['active'] ?? '1')) === '0' ? 0 : 1;

            if ($hasType || $hasSize || $hasGsm || $hasBf) {
                $stmt->execute([
                    'firm_id' => $firmId,
                    'item_type' => $type,
                    'erp_code' => $erp,
                    'item_name' => $name,
                    'size_value' => $size !== '' ? $size : null,
                    'gsm_value' => $gsm !== '' ? $gsm : null,
                    'bf_value' => $bf !== '' ? $bf : null,
                    'unit_value' => $unit !== '' ? $unit : null,
                    'active' => $active,
                ]);
            } else {
                $stmt->execute([
                    'firm_id' => $firmId,
                    'erp_code' => $erp,
                    'item_name' => $name,
                    'unit_value' => $unit !== '' ? $unit : null,
                    'active' => $active,
                ]);
            }
            $saved++;
        }

        writeBackendLog('save_items_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'saved_items' => $saved,
        ]);
        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'savedItems' => $saved,
        ]);
    }

    if ($action === 'save_purchase_request') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $pr = is_array($payload['purchase_request'] ?? null) ? $payload['purchase_request'] : [];
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        $pdo = db();
        ensurePurchaseRelations($pdo);
        $defaultItemType = strtolower(trim((string)($payload['item_type'] ?? $pr['item_type'] ?? 'mrr'))) ?: 'mrr';
        if ($defaultItemType !== 'reel' && $defaultItemType !== 'mrr' && $defaultItemType !== 'other') {
            $defaultItemType = 'mrr';
        }

        $prNo = trim((string)($pr['pr_no'] ?? ''));
        $department = trim((string)($pr['department'] ?? $pr['department_name'] ?? ''));
        $requestedBy = trim((string)($pr['requested_by'] ?? ''));
        $requisitionDate = trim((string)($pr['requisition_date'] ?? ''));
        $requiredDate = trim((string)($pr['required_date'] ?? ''));
        $remark = trim((string)($pr['remark'] ?? $pr['remark_text'] ?? ''));
        $createdBy = trim((string)($pr['created_by'] ?? $payload['user_email'] ?? ''));

        if ($prNo === '') {
            $fy = fiscalYearText(new DateTimeImmutable('now'));
            $prefix = 'PR-' . $fy . '/';
            $seq = nextSequenceNumber($firmId, $prefix, 'purchase_requests', 'pr_no');
            $prNo = $prefix . str_pad((string)$seq, 5, '0', STR_PAD_LEFT);
        }

        writeBackendLog('save_purchase_request_start', array_merge(
            ['trace_id' => $traceId, 'action' => 'save_purchase_request', 'pr_no' => $prNo],
            loggerContextSummary($payload)
        ));

        $check = $pdo->prepare("SELECT id, status_text FROM purchase_requests WHERE firm_id = :firm_id AND pr_no = :pr_no LIMIT 1");
        $check->execute(['firm_id' => $firmId, 'pr_no' => $prNo]);
        $existing = $check->fetch();

        if ($existing) {
            // Do not edit already approved PR.
            $status = trim((string)($existing['status_text'] ?? 'pending')) ?: 'pending';
            if (strcasecmp($status, 'approved') === 0) {
                jsonOut(['ok' => false, 'error' => 'Approved PR cannot be edited.'], 400);
            }
            $update = $pdo->prepare("
                UPDATE purchase_requests
                SET department_name = :department,
                    requested_by = :requested_by,
                    requisition_date = :requisition_date,
                    required_date = :required_date,
                    remark_text = :remark_text,
                    created_by = COALESCE(NULLIF(:created_by, ''), created_by),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $update->execute([
                'department' => $department !== '' ? $department : null,
                'requested_by' => $requestedBy !== '' ? $requestedBy : null,
                'requisition_date' => $requisitionDate !== '' ? $requisitionDate : null,
                'required_date' => $requiredDate !== '' ? $requiredDate : null,
                'remark_text' => $remark !== '' ? $remark : null,
                'created_by' => $createdBy,
                'id' => (int)$existing['id'],
            ]);
            $prId = (int)$existing['id'];
        } else {
            $insert = $pdo->prepare("
                INSERT INTO purchase_requests (firm_id, pr_no, department_name, requested_by, requisition_date, required_date, status_text, remark_text, created_by)
                VALUES (:firm_id, :pr_no, :department, :requested_by, :requisition_date, :required_date, 'pending', :remark_text, :created_by)
            ");
            $insert->execute([
                'firm_id' => $firmId,
                'pr_no' => $prNo,
                'department' => $department !== '' ? $department : null,
                'requested_by' => $requestedBy !== '' ? $requestedBy : null,
                'requisition_date' => $requisitionDate !== '' ? $requisitionDate : null,
                'required_date' => $requiredDate !== '' ? $requiredDate : null,
                'remark_text' => $remark !== '' ? $remark : null,
                'created_by' => $createdBy !== '' ? $createdBy : null,
            ]);
            $prId = (int)$pdo->lastInsertId();
        }

        // Replace items
        $del = $pdo->prepare("DELETE FROM purchase_request_items WHERE firm_id = :firm_id AND pr_id = :pr_id");
        $del->execute(['firm_id' => $firmId, 'pr_id' => $prId]);
        $priCols = tableColumns('purchase_request_items');
        $hasItemId = in_array('item_id', $priCols, true);
        $insertCols = "firm_id, pr_id, " . ($hasItemId ? "item_id, " : "") . "row_sort, erp_code, item_name, description_text, unit_value, qty_value, rate_value, amount_value, remark_text";
        $insertVals = ":firm_id, :pr_id, " . ($hasItemId ? ":item_id, " : "") . ":row_sort, :erp_code, :item_name, :description_text, :unit_value, :qty_value, :rate_value, :amount_value, :remark_text";
        $ins = $pdo->prepare("INSERT INTO purchase_request_items ({$insertCols}) VALUES ({$insertVals})");
        $rowSort = 0;
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $itemType = strtolower(trim((string)($item['item_type'] ?? $defaultItemType))) ?: 'mrr';
            if ($itemType !== 'reel' && $itemType !== 'mrr' && $itemType !== 'other') $itemType = $defaultItemType;
            $desc = trim((string)($item['description'] ?? $item['description_text'] ?? ''));
            $code = trim((string)($item['erp_code'] ?? ''));
            $name = trim((string)($item['item_name'] ?? ''));
            $qty = trim((string)($item['qty'] ?? $item['quantity'] ?? ''));
            if ($desc === '' && $code === '' && $name === '' && $qty === '') continue;
            $rowSort++;
            $rate = trim((string)($item['rate'] ?? ''));
            $amount = trim((string)($item['amount'] ?? ''));
            $unit = trim((string)($item['unit'] ?? ''));
            $remarkItem = trim((string)($item['remark'] ?? $item['remark_text'] ?? ''));

            $resolvedItemId = 0;
            if ($hasItemId) {
                $resolvedItemId = (int)($item['item_id'] ?? 0);
                if ($resolvedItemId <= 0) {
                    $resolvedItemId = resolveItemId($pdo, $firmId, $itemType, $code, $name);
                }
                if ($resolvedItemId <= 0) {
                    jsonOut(['ok' => false, 'error' => 'Item Master link missing. Please select item from Item Master (item_id required).'], 400);
                }
            }

            $params = [
                'firm_id' => $firmId,
                'pr_id' => $prId,
                'item_id' => $resolvedItemId > 0 ? $resolvedItemId : null,
                'row_sort' => $rowSort,
                'erp_code' => $code !== '' ? $code : null,
                'item_name' => $name !== '' ? $name : null,
                'description_text' => $desc !== '' ? $desc : null,
                'unit_value' => $unit !== '' ? $unit : null,
                'qty_value' => $qty !== '' ? $qty : null,
                'rate_value' => $rate !== '' ? $rate : null,
                'amount_value' => $amount !== '' ? $amount : null,
                'remark_text' => $remarkItem !== '' ? $remarkItem : null,
            ];
            if (!$hasItemId) {
                unset($params['item_id']);
            }
            $ins->execute($params);
        }

        writeBackendLog('save_purchase_request_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'pr_no' => $prNo,
            'saved_items' => $rowSort,
        ]);

        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'pr_no' => $prNo,
            'savedItems' => $rowSort,
        ]);
    }

    if ($action === 'approve_purchase_request') {
        $firmId = getFirmId();
        $prNo = trim((string)($_GET['pr_no'] ?? ''));
        $decision = strtolower(trim((string)($_GET['decision'] ?? 'approve'))) ?: 'approve';
        $remark = trim((string)($_GET['remark'] ?? ''));
        $userEmail = trim((string)($_GET['user_email'] ?? ''));
        if ($prNo === '') {
            jsonOut(['ok' => false, 'error' => 'Missing pr_no.'], 400);
        }
        if ($decision !== 'approve' && $decision !== 'reject') {
            $decision = 'approve';
        }
        $pdo = db();
        $stmt = $pdo->prepare("SELECT id, status_text FROM purchase_requests WHERE firm_id = :firm_id AND pr_no = :pr_no LIMIT 1");
        $stmt->execute(['firm_id' => $firmId, 'pr_no' => $prNo]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonOut(['ok' => false, 'error' => 'Purchase request not found.'], 404);
        }
        $status = trim((string)($row['status_text'] ?? 'pending')) ?: 'pending';
        if ($status !== 'pending') {
            jsonOut(['ok' => false, 'error' => 'Only pending PR can be approved/rejected.'], 400);
        }
        $newStatus = $decision === 'approve' ? 'approved' : 'rejected';
        $update = $pdo->prepare("
            UPDATE purchase_requests
            SET status_text = :status,
                approved_by = :approved_by,
                approved_at = :approved_at,
                remark_text = COALESCE(NULLIF(:remark, ''), remark_text),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $update->execute([
            'status' => $newStatus,
            'approved_by' => $userEmail !== '' ? $userEmail : null,
            'approved_at' => nowText(),
            'remark' => $remark,
            'id' => (int)$row['id'],
        ]);
        jsonOut(['ok' => true, 'status' => $newStatus, 'pr_no' => $prNo]);
    }

    if ($action === 'save_purchase_order') {
        $traceId = createTraceId();
        $firmId = trim((string)($payload['firm_id'] ?? $payload['spreadsheetId'] ?? 'lnki'));
        $po = is_array($payload['purchase_order'] ?? null) ? $payload['purchase_order'] : [];
        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
        $pdo = db();
        ensurePurchaseRelations($pdo);

        $cols = tableColumns('purchase_orders');
        $hasPoDetails = in_array('po_details', $cols, true);
        if (!$hasPoDetails) {
            try {
                $pdo->exec("ALTER TABLE purchase_orders ADD COLUMN po_details TEXT DEFAULT NULL");
                $hasPoDetails = true;
            } catch (Throwable $e) {
                $hasPoDetails = false;
            }
        }

        $poiCols = tableColumns('purchase_order_items');
        $hasItemSupplier = in_array('supplier_name', $poiCols, true);
        $hasPrItemId = in_array('pr_item_id', $poiCols, true);
        $hasItemId = in_array('item_id', $poiCols, true);
        if (!$hasItemSupplier) {
            try {
                $pdo->exec("ALTER TABLE purchase_order_items ADD COLUMN supplier_name VARCHAR(255) DEFAULT NULL AFTER row_sort");
                $hasItemSupplier = true;
            } catch (Throwable $e) {
                $hasItemSupplier = false;
            }
        }

        $poNo = trim((string)($po['po_no'] ?? ''));
        $poType = strtolower(trim((string)($po['po_type'] ?? $po['type'] ?? 'reel'))) ?: 'reel';
        if ($poType !== 'reel' && $poType !== 'mrr' && $poType !== 'other') $poType = 'reel';

        $supplier = trim((string)($po['supplier'] ?? $po['supplier_name'] ?? ''));
        $poDate = trim((string)($po['po_date'] ?? ''));
        $poDetails = trim((string)($po['po_details'] ?? $po['po_details_text'] ?? ''));
        $remark = trim((string)($po['remark'] ?? $po['remark_text'] ?? ''));
        $createdBy = trim((string)($po['created_by'] ?? $payload['user_email'] ?? ''));
        $prNo = trim((string)($po['pr_no'] ?? ''));
        $desiredStatus = strtolower(trim((string)($po['status'] ?? $po['status_text'] ?? 'draft'))) ?: 'draft';
        if ($desiredStatus !== 'pending' && $desiredStatus !== 'draft') {
            $desiredStatus = 'draft';
        }

        $prId = null;
        if ($prNo !== '') {
            $stmt = $pdo->prepare("SELECT id, status_text FROM purchase_requests WHERE firm_id = :firm_id AND pr_no = :pr_no LIMIT 1");
            $stmt->execute(['firm_id' => $firmId, 'pr_no' => $prNo]);
            $prRow = $stmt->fetch();
            if ($prRow) {
                $prId = (int)$prRow['id'];
                $prStatus = strtolower(trim((string)($prRow['status_text'] ?? 'pending'))) ?: 'pending';
                if ($prStatus !== 'approved') {
                    jsonOut(['ok' => false, 'error' => 'Only approved Purchase Request can create PO.'], 400);
                }
            }
        }

        $meaningful = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $desc = trim((string)($item['description'] ?? $item['description_text'] ?? ''));
            $code = trim((string)($item['erp_code'] ?? ''));
            $name = trim((string)($item['item_name'] ?? ''));
            $qty = trim((string)($item['qty'] ?? $item['quantity'] ?? ''));
            if ($desc === '' && $code === '' && $name === '' && $qty === '') continue;
            $meaningful[] = $item;
        }
        if (!count($meaningful)) {
            jsonOut(['ok' => false, 'error' => 'At least 1 item required.'], 400);
        }

        $normalizeSupplierKey = static function (string $value): string {
            $clean = preg_replace('/\s+/', ' ', trim($value));
            return strtoupper($clean ?? '');
        };

        // Group items by supplier (each supplier => separate PO number).
        // Supplier keys are normalized to avoid accidental splits caused by casing/extra spaces.
        $groups = [];
        foreach ($meaningful as $item) {
            $itemSupplier = trim((string)($item['supplier'] ?? $item['supplier_name'] ?? ''));
            if ($itemSupplier === '') {
                jsonOut(['ok' => false, 'error' => 'Supplier required for each PO item.'], 400);
            }
            $supplierKey = $normalizeSupplierKey($itemSupplier);
            if ($supplierKey === '') {
                jsonOut(['ok' => false, 'error' => 'Supplier required for each PO item.'], 400);
            }
            if (!isset($groups[$supplierKey])) $groups[$supplierKey] = ['supplier' => $itemSupplier, 'items' => []];
            $groups[$supplierKey]['items'][] = $item;
        }
        // If a header supplier is given, keep single group only.
        if ($supplier !== '') {
            $supplierKey = $normalizeSupplierKey($supplier);
            $groups = [$supplierKey => ['supplier' => $supplier, 'items' => $meaningful]];
        }

        $createdPoNos = [];
        $totalSavedItems = 0;

        foreach ($groups as $group) {
            $supplierKey = trim((string)($group['supplier'] ?? ''));
            $groupItems = is_array($group['items'] ?? null) ? $group['items'] : [];
            $currentPoNo = $poNo;
            // For multi-supplier split, always generate new PO numbers (ignore client-provided po_no).
            if (count($groups) > 1) {
                $currentPoNo = '';
            }
            if ($currentPoNo === '') {
                $fy = fiscalYearText(new DateTimeImmutable('now'));
                $prefix = 'PO-' . $fy . '/';
                $seq = nextSequenceNumber($firmId, $prefix, 'purchase_orders', 'po_no');
                $currentPoNo = $prefix . str_pad((string)$seq, 5, '0', STR_PAD_LEFT);
            }

            writeBackendLog('save_purchase_order_start', array_merge(
                ['trace_id' => $traceId, 'action' => 'save_purchase_order', 'po_no' => $currentPoNo],
                loggerContextSummary($payload)
            ));

            $check = $pdo->prepare("SELECT id, status_text FROM purchase_orders WHERE firm_id = :firm_id AND po_no = :po_no LIMIT 1");
            $check->execute(['firm_id' => $firmId, 'po_no' => $currentPoNo]);
            $existing = $check->fetch();

            if ($existing) {
                $status = trim((string)($existing['status_text'] ?? 'draft')) ?: 'draft';
                if (strcasecmp($status, 'approved') === 0) {
                    jsonOut(['ok' => false, 'error' => 'Approved PO cannot be edited.'], 400);
                }
                $updateSql = "
                    UPDATE purchase_orders
                    SET pr_id = :pr_id,
                        po_type = :po_type,
                        supplier_name = :supplier,
                        po_date = :po_date,
                ";
                if ($hasPoDetails) {
                    $updateSql .= "    po_details = :po_details,\n";
                }
                $updateSql .= "
                        status_text = :status_text,
                        remark_text = :remark_text,
                        created_by = COALESCE(NULLIF(:created_by, ''), created_by),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                ";
                $update = $pdo->prepare($updateSql);
                $params = [
                    'pr_id' => $prId,
                    'po_type' => $poType,
                    'supplier' => $supplierKey !== '' ? $supplierKey : null,
                    'po_date' => $poDate !== '' ? $poDate : null,
                    'po_details' => $poDetails !== '' ? $poDetails : null,
                    'status_text' => $desiredStatus,
                    'remark_text' => $remark !== '' ? $remark : null,
                    'created_by' => $createdBy,
                    'id' => (int)$existing['id'],
                ];
                if (!$hasPoDetails) {
                    unset($params['po_details']);
                }
                $update->execute($params);
                $poId = (int)$existing['id'];
            } else {
                $insertCols = "firm_id, po_no, pr_id, po_type, supplier_name, po_date, status_text, remark_text, created_by";
                $insertVals = ":firm_id, :po_no, :pr_id, :po_type, :supplier, :po_date, :status_text, :remark_text, :created_by";
                if ($hasPoDetails) {
                    $insertCols = "firm_id, po_no, pr_id, po_type, supplier_name, po_date, po_details, status_text, remark_text, created_by";
                    $insertVals = ":firm_id, :po_no, :pr_id, :po_type, :supplier, :po_date, :po_details, :status_text, :remark_text, :created_by";
                }
                $insert = $pdo->prepare("INSERT INTO purchase_orders ({$insertCols}) VALUES ({$insertVals})");
                $params = [
                    'firm_id' => $firmId,
                    'po_no' => $currentPoNo,
                    'pr_id' => $prId,
                    'po_type' => $poType,
                    'supplier' => $supplierKey !== '' ? $supplierKey : null,
                    'po_date' => $poDate !== '' ? $poDate : null,
                    'po_details' => $poDetails !== '' ? $poDetails : null,
                    'status_text' => $desiredStatus,
                    'remark_text' => $remark !== '' ? $remark : null,
                    'created_by' => $createdBy !== '' ? $createdBy : null,
                ];
                if (!$hasPoDetails) {
                    unset($params['po_details']);
                }
                $insert->execute($params);
                $poId = (int)$pdo->lastInsertId();
            }

            $del = $pdo->prepare("DELETE FROM purchase_order_items WHERE firm_id = :firm_id AND po_id = :po_id");
            $del->execute(['firm_id' => $firmId, 'po_id' => $poId]);

            $insertCols = "firm_id, po_id, "
                . ($hasPrItemId ? "pr_item_id, " : "")
                . ($hasItemId ? "item_id, " : "")
                . "row_sort, erp_code, item_name, description_text, unit_value, qty_value, rate_value, amount_value, remark_text";
            $insertVals = ":firm_id, :po_id, "
                . ($hasPrItemId ? ":pr_item_id, " : "")
                . ($hasItemId ? ":item_id, " : "")
                . ":row_sort, :erp_code, :item_name, :description_text, :unit_value, :qty_value, :rate_value, :amount_value, :remark_text";
            if ($hasItemSupplier) {
                $insertCols = "firm_id, po_id, "
                    . ($hasPrItemId ? "pr_item_id, " : "")
                    . ($hasItemId ? "item_id, " : "")
                    . "row_sort, supplier_name, erp_code, item_name, description_text, unit_value, qty_value, rate_value, amount_value, remark_text";
                $insertVals = ":firm_id, :po_id, "
                    . ($hasPrItemId ? ":pr_item_id, " : "")
                    . ($hasItemId ? ":item_id, " : "")
                    . ":row_sort, :supplier_name, :erp_code, :item_name, :description_text, :unit_value, :qty_value, :rate_value, :amount_value, :remark_text";
            }
            $ins = $pdo->prepare("INSERT INTO purchase_order_items ({$insertCols}) VALUES ({$insertVals})");

            $rowSort = 0;
            foreach ($groupItems as $item) {
                $prItemId = $hasPrItemId ? (int)($item['pr_item_id'] ?? 0) : 0;
                $desc = trim((string)($item['description'] ?? $item['description_text'] ?? ''));
                $code = trim((string)($item['erp_code'] ?? ''));
                $name = trim((string)($item['item_name'] ?? ''));
                $qty = trim((string)($item['qty'] ?? $item['quantity'] ?? ''));
                if ($desc === '' && $code === '' && $name === '' && $qty === '') continue;
                $rowSort++;
                $rate = trim((string)($item['rate'] ?? ''));
                $amount = trim((string)($item['amount'] ?? ''));
                $unit = trim((string)($item['unit'] ?? ''));
                $remarkItem = trim((string)($item['remark'] ?? $item['remark_text'] ?? ''));

                $resolvedItemId = 0;
                if ($hasItemId) {
                    $resolvedItemId = (int)($item['item_id'] ?? 0);
                    if ($resolvedItemId <= 0) {
                        $resolvedItemId = resolveItemId($pdo, $firmId, $poType, $code, $name);
                    }
                    if ($resolvedItemId <= 0) {
                        jsonOut(['ok' => false, 'error' => 'Item Master link missing. Please select item from Item Master (item_id required).'], 400);
                    }
                }

                $params = [
                    'firm_id' => $firmId,
                    'po_id' => $poId,
                    'pr_item_id' => $prItemId > 0 ? $prItemId : null,
                    'item_id' => $resolvedItemId > 0 ? $resolvedItemId : null,
                    'row_sort' => $rowSort,
                    'supplier_name' => $supplierKey !== '' ? $supplierKey : null,
                    'erp_code' => $code !== '' ? $code : null,
                    'item_name' => $name !== '' ? $name : null,
                    'description_text' => $desc !== '' ? $desc : null,
                    'unit_value' => $unit !== '' ? $unit : null,
                    'qty_value' => $qty !== '' ? $qty : null,
                    'rate_value' => $rate !== '' ? $rate : null,
                    'amount_value' => $amount !== '' ? $amount : null,
                    'remark_text' => $remarkItem !== '' ? $remarkItem : null,
                ];
                if (!$hasItemSupplier) {
                    unset($params['supplier_name']);
                }
                if (!$hasPrItemId) {
                    unset($params['pr_item_id']);
                }
                if (!$hasItemId) {
                    unset($params['item_id']);
                }
                $ins->execute($params);
            }

            $createdPoNos[] = $currentPoNo;
            $totalSavedItems += $rowSort;
        }

        writeBackendLog('save_purchase_order_success', [
            'trace_id' => $traceId,
            'firm_id' => $firmId,
            'po_nos' => $createdPoNos,
            'saved_items' => $totalSavedItems,
        ]);

        jsonOut([
            'ok' => true,
            'trace_id' => $traceId,
            'po_no' => $createdPoNos[0] ?? '',
            'po_nos' => $createdPoNos,
            'savedItems' => $totalSavedItems,
        ]);
    }

    if ($action === 'approve_purchase_order') {
        $firmId = getFirmId();
        $poNo = trim((string)($_GET['po_no'] ?? ''));
        $decision = strtolower(trim((string)($_GET['decision'] ?? 'approve'))) ?: 'approve';
        $remark = trim((string)($_GET['remark'] ?? ''));
        $userEmail = trim((string)($_GET['user_email'] ?? ''));
        if ($poNo === '') {
            jsonOut(['ok' => false, 'error' => 'Missing po_no.'], 400);
        }
        if ($decision !== 'approve' && $decision !== 'reject') {
            $decision = 'approve';
        }
        $pdo = db();
        $stmt = $pdo->prepare("SELECT id, status_text FROM purchase_orders WHERE firm_id = :firm_id AND po_no = :po_no LIMIT 1");
        $stmt->execute(['firm_id' => $firmId, 'po_no' => $poNo]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonOut(['ok' => false, 'error' => 'Purchase order not found.'], 404);
        }
        $status = trim((string)($row['status_text'] ?? 'draft')) ?: 'draft';
        if ($status !== 'pending') {
            jsonOut(['ok' => false, 'error' => 'Only pending PO can be approved/rejected.'], 400);
        }
        $newStatus = $decision === 'approve' ? 'approved' : 'rejected';
        $update = $pdo->prepare("
            UPDATE purchase_orders
            SET status_text = :status,
                approved_by = :approved_by,
                approved_at = :approved_at,
                remark_text = COALESCE(NULLIF(:remark, ''), remark_text),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $update->execute([
            'status' => $newStatus,
            'approved_by' => $userEmail !== '' ? $userEmail : null,
            'approved_at' => nowText(),
            'remark' => $remark,
            'id' => (int)$row['id'],
        ]);
        jsonOut(['ok' => true, 'status' => $newStatus, 'po_no' => $poNo]);
    }
    if ($action === 'save_ge_entry') {
        jsonOut(saveGeEntryAction($payload));
    }
    if ($action === 'save_invoice' || $action === 'save_packing') {
        jsonOut(saveInvoiceOrPackingAction($payload, $action));
    }

    jsonOut(['ok' => false, 'error' => 'Unsupported action.'], 400);
} catch (Throwable $e) {
    writeBackendLog('api_error', [
        'trace_id' => createTraceId(),
        'action' => strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? 'unknown'))),
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
    $message = $e->getMessage();
    $extra = [];
    if (stripos($message, 'SQLSTATE 1045') !== false || stripos($message, 'Access denied') !== false) {
        try {
            $cfg = getConfig();
            $dbCfg = is_array($cfg['db'] ?? null) ? $cfg['db'] : [];
            $meta = is_array($cfg['_meta'] ?? null) ? $cfg['_meta'] : [];
            $extra['db_config'] = [
                'host' => (string)($dbCfg['host'] ?? ''),
                'port' => (int)($dbCfg['port'] ?? 3306),
                'database' => (string)($dbCfg['database'] ?? ''),
                'username' => (string)($dbCfg['username'] ?? ''),
                'config_source' => (string)($meta['config_source'] ?? ''),
                'used_env' => (bool)($meta['used_env'] ?? false),
            ];
        } catch (Throwable $e) {
        }
    }
    jsonOut([
        'ok' => false,
        'error' => $message,
        ...$extra,
    ], 500);
}
