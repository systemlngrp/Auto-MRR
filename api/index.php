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
    'Md Reject Usermail', 'Md Reject Timestamp', 'Pending Tally Posting Timestamp', 'Pending Tally Posting User Email'
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

    $candidatePaths = [
        __DIR__ . '/config.php',
        dirname(__DIR__) . '/../api-config.php',
        __DIR__ . '/config.sample.php',
    ];

    $configPath = '';
    foreach ($candidatePaths as $candidatePath) {
        if (file_exists($candidatePath)) {
            $configPath = $candidatePath;
            break;
        }
    }

    if (!file_exists($configPath)) {
        throw new RuntimeException('Missing API config file. Create api/config.php or place api-config.php above public_html.');
    }

    try {
        $loaded = require $configPath;
    } catch (Throwable $e) {
        throw new RuntimeException('Invalid API config file: ' . $e->getMessage(), 0, $e);
    }

    if (!is_array($loaded)) {
        throw new RuntimeException('Invalid API config file: expected a PHP array.');
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

    $pdo = new PDO($dsn, $db['username'] ?? '', $db['password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

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

function deleteSheetRows(string $firmId, string $sheetName, string $mrrNumber, array $rowTypes): void
{
    $pdo = db();
    $placeholders = implode(',', array_fill(0, count($rowTypes), '?'));
    $sql = "DELETE FROM app_records WHERE firm_id = ? AND sheet_name = ? AND mrr_number = ? AND row_type IN ($placeholders)";
    $params = array_merge([$firmId, $sheetName, $mrrNumber], $rowTypes);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

function fetchRecordRows(string $firmId, string $sheetName, ?string $mrrNumber = null): array
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

function rowsPayload(string $sheetName, array $rows): array
{
    if (strcasecmp($sheetName, 'GE ENTRY') === 0) {
        $header = GE_HEADERS;
        $body = array_map(fn($row) => toGeRowArray(decodeData($row)), $rows);
        return [$header, ...$body];
    }

    if (strcasecmp($sheetName, 'PO DETAILS') === 0 || strcasecmp($sheetName, 'OTHER PO') === 0) {
        $header = ['S.NO.', 'PO NO.', 'DATE', 'SUPPLIER', 'PO DETAILS', 'ERP CODE', 'SIZE', 'GSM', 'BF', 'REEL DETAILS', 'UNIT', 'PO RATE', 'QUANTITY', 'STATUS', 'QUANTITY RECEIVED', 'PENDING', 'CLOSED', 'RAPC'];
        $body = array_map(fn($row) => toPoRowArray(decodeData($row)), $rows);
        return [$header, ...$body];
    }

    $isHelper = stripos($sheetName, 'HELPER') !== false || stripos($sheetName, 'OTHER ITEMS') !== false;
    if ($isHelper) {
        $header = HELPER_HEADERS;
        $body = array_map(fn($row) => toHelperRowArray(decodeData($row)), $rows);
        return [$header, ...$body];
    }

    $header = MRR_HEADERS;
    $body = array_map(fn($row) => toMrrRowArray(decodeData($row)), $rows);
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

function fetchParentByMrr(string $firmId, string $sheetName, string $mrrNumber): ?array
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM app_records WHERE firm_id = :firm_id AND sheet_name = :sheet_name AND mrr_number = :mrr_number AND row_type = 'parent' ORDER BY id DESC LIMIT 1");
    $stmt->execute([
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
        'mrr_number' => $mrrNumber,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function writeApprovalLog(string $firmId, string $mrrNumber, string $stage, string $decision, string $userEmail, string $remark, array $extra = []): void
{
    $pdo = db();
    $stmt = $pdo->prepare("
        INSERT INTO approval_logs (firm_id, mrr_number, stage_name, decision_value, user_email, remark_text, extra_json)
        VALUES (:firm_id, :mrr_number, :stage_name, :decision_value, :user_email, :remark_text, :extra_json)
    ");
    $stmt->execute([
        'firm_id' => $firmId,
        'mrr_number' => $mrrNumber,
        'stage_name' => $stage,
        'decision_value' => $decision,
        'user_email' => $userEmail,
        'remark_text' => $remark,
        'extra_json' => json_encode($extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function updateApprovalDataForMrr(string $firmId, string $mrrNumber, string $stage, string $decision, array $params): array
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM app_records WHERE firm_id = :firm_id AND mrr_number = :mrr_number");
    $stmt->execute([
        'firm_id' => $firmId,
        'mrr_number' => $mrrNumber,
    ]);
    $rows = $stmt->fetchAll();
    if (!$rows) {
        throw new RuntimeException('MRR not found for approval.');
    }

    $timestamp = nowText();
    $userEmail = trim((string)($params['user_email'] ?? ''));
    $decisionText = strtolower($decision) === 'reject' ? 'Rejected' : 'Approved';
    $nextStage = 'completed';
    $remark = '';

    foreach ($rows as $row) {
        $data = decodeData($row);
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
        $sql = "
            UPDATE app_records
            SET pending_stage = :pending_stage,
                approval_status_plant = :approval_status_plant,
                approval_status_accounts = :approval_status_accounts,
                approval_status_md = :approval_status_md,
                tally_posted = :tally_posted,
                data_json = :data_json,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ";
        $update = $pdo->prepare($sql);
        $update->execute([
            'pending_stage' => $pendingStage,
            'approval_status_plant' => value($data, 'plant_head_approval'),
            'approval_status_accounts' => value($data, 'accounts_approval'),
            'approval_status_md' => value($data, 'md_approval'),
            'tally_posted' => $pendingStage === 'completed' ? 1 : 0,
            'data_json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'id' => $row['id'],
        ]);
    }

    writeApprovalLog($firmId, $mrrNumber, $stage, $decision, $userEmail, $remark, $params);

    $parent = fetchParentByMrr($firmId, value(decodeData($rows[0]), 'sheet_name') ?: ($rows[0]['sheet_name'] ?? 'MRR FORM'), $mrrNumber);
    $payload = $parent ? decodeData($parent) : [];

    return [
        'ok' => true,
        'mrr_number' => $mrrNumber,
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
    $stmt = $pdo->prepare("SELECT ge_no FROM app_records WHERE firm_id = :firm_id AND sheet_name = 'GE ENTRY'");
    $stmt->execute(['firm_id' => $firmId]);
    $maxNo = numericSuffixMax(array_column($stmt->fetchAll(), 'ge_no'));
    $geNo = value($geEntry, 'ge_no');
    if ($geNo === '') {
        $geNo = (string)($maxNo + 1);
    }

    $data = array_merge($geEntry, [
        'ge_no' => $geNo,
        'timestamp' => nowText(),
        'mrr_complete' => value($geEntry, 'mrr_complete') ?: 'NO',
    ]);

    upsertRecord([
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
        'row_type' => 'ge',
        'row_sort' => 0,
        'record_group_id' => $geNo,
        'mrr_number' => value($data, 'mrr_no', 'mrr_number'),
        'ge_no' => $geNo,
        'invoice_no' => value($data, 'invoice_no'),
        'supplier' => value($data, 'supplier'),
        'truck_no' => value($data, 'truck_no'),
        'pending_stage' => 'pending_mrr',
        'date_value' => value($data, 'date'),
        'approval_status_plant' => '',
        'approval_status_accounts' => '',
        'approval_status_md' => '',
        'tally_posted' => 0,
        'data_json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);

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

    $existingParent = fetchParentByMrr($firmId, $sheetName, $mrrNumber);
    if ($existingParent) {
        $existingData = decodeData($existingParent);
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

    $parentPendingStage = determinePendingStage($parentData);
    deleteSheetRows($firmId, $sheetName, $mrrNumber, ['parent', 'mrr_item']);
    deleteSheetRows($firmId, $helperSheetName, $mrrNumber, ['helper_item']);

    upsertRecord([
        'firm_id' => $firmId,
        'sheet_name' => $sheetName,
        'row_type' => 'parent',
        'row_sort' => 0,
        'record_group_id' => $mrrNumber,
        'mrr_number' => $mrrNumber,
        'ge_no' => $geNo,
        'invoice_no' => value($parentData, 'sup_doc_no'),
        'supplier' => value($parentData, 'supplier'),
        'truck_no' => value($parentData, 'truck_number'),
        'pending_stage' => $parentPendingStage,
        'date_value' => value($parentData, 'date'),
        'approval_status_plant' => value($parentData, 'plant_head_approval'),
        'approval_status_accounts' => value($parentData, 'accounts_approval'),
        'approval_status_md' => value($parentData, 'md_approval'),
        'tally_posted' => $parentPendingStage === 'completed' ? 1 : 0,
        'data_json' => json_encode($parentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
        upsertRecord([
            'firm_id' => $firmId,
            'sheet_name' => $sheetName,
            'row_type' => 'mrr_item',
            'row_sort' => $index + 1,
            'record_group_id' => $mrrNumber,
            'mrr_number' => $mrrNumber,
            'ge_no' => $geNo,
            'invoice_no' => value($parentData, 'sup_doc_no'),
            'supplier' => value($parentData, 'supplier'),
            'truck_no' => value($parentData, 'truck_number'),
            'pending_stage' => $parentPendingStage,
            'date_value' => value($parentData, 'date'),
            'approval_status_plant' => value($parentData, 'plant_head_approval'),
            'approval_status_accounts' => value($parentData, 'accounts_approval'),
            'approval_status_md' => value($parentData, 'md_approval'),
            'tally_posted' => $parentPendingStage === 'completed' ? 1 : 0,
            'data_json' => json_encode($itemData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
        upsertRecord([
            'firm_id' => $firmId,
            'sheet_name' => $helperSheetName,
            'row_type' => 'helper_item',
            'row_sort' => $index + 1,
            'record_group_id' => $mrrNumber,
            'mrr_number' => $mrrNumber,
            'ge_no' => $geNo,
            'invoice_no' => value($parentData, 'sup_doc_no'),
            'supplier' => value($parentData, 'supplier'),
            'truck_no' => value($parentData, 'truck_number'),
            'pending_stage' => $parentPendingStage,
            'date_value' => value($parentData, 'date'),
            'approval_status_plant' => value($parentData, 'plant_head_approval'),
            'approval_status_accounts' => value($parentData, 'accounts_approval'),
            'approval_status_md' => value($parentData, 'md_approval'),
            'tally_posted' => $parentPendingStage === 'completed' ? 1 : 0,
            'data_json' => json_encode($helperData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    $pdo = db();
    $updateGe = $pdo->prepare("
        UPDATE app_records
        SET mrr_number = :mrr_number,
            pending_stage = 'completed_mrr',
            data_json = JSON_SET(data_json, '$.mrr_no', :mrr_number, '$.mrr_complete', 'YES'),
            updated_at = CURRENT_TIMESTAMP
        WHERE firm_id = :firm_id AND sheet_name = 'GE ENTRY' AND ge_no = :ge_no
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

    if ($action === 'authenticate_user') {
        $loginId = trim((string)($_GET['login_id'] ?? $_POST['login_id'] ?? ''));
        $password = trim((string)($_GET['password'] ?? $_POST['password'] ?? ''));
        $stmt = db()->prepare("
            SELECT *
            FROM app_users
            WHERE active = 1
              AND (login_id = :login_id OR user_email = :login_id)
            ORDER BY id ASC
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
        jsonOut([
            'ok' => true,
            'user' => [
                'login_id' => $user['login_id'],
                'user_email' => $user['user_email'],
                'display_name' => $user['display_name'],
                'role' => $user['role'],
                'firm_id' => $user['firm_id'],
                'master_login' => true,
            ],
        ]);
    }

    if ($action === 'get_rows') {
        $sheetName = trim((string)($_GET['sheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $mrrNumber = trim((string)($_GET['mrr_number'] ?? ''));
        $rows = fetchRecordRows($firmId, $sheetName, $mrrNumber !== '' ? $mrrNumber : null);
        jsonOut([
            'ok' => true,
            'count' => $mrrNumber !== '' ? count($rows) : max(0, count($rows)),
            'values' => rowsPayload($sheetName, $rows),
        ]);
    }

    if ($action === 'get_latest_ids') {
        $sheetName = trim((string)($_GET['mrrSheet'] ?? $_GET['sheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geSheetName = trim((string)($_GET['geSheet'] ?? 'GE ENTRY')) ?: 'GE ENTRY';
        $prefix = trim((string)($_GET['prefix'] ?? ''));

        $mrrRows = fetchRecordRows($firmId, $sheetName);
        $geRows = fetchRecordRows($firmId, $geSheetName);
        $mrrValues = [];
        foreach ($mrrRows as $row) {
            $mrrValues[] = $row['mrr_number'] ?? '';
        }
        $geValues = [];
        foreach ($geRows as $row) {
            $geValues[] = $row['ge_no'] ?? '';
        }

        jsonOut([
            'ok' => true,
            'mrr' => numericSuffixMax($mrrValues, $prefix),
            'ge' => numericSuffixMax($geValues),
        ]);
    }

    if ($action === 'get_suppliers') {
        $sheetName = trim((string)($_GET['sheet'] ?? 'PO DETAILS')) ?: 'PO DETAILS';
        $rows = fetchRecordRows($firmId, $sheetName);
        $suppliers = [];
        foreach ($rows as $row) {
            $data = decodeData($row);
            $supplier = value($data, 'supplier');
            if ($supplier !== '') {
                $suppliers[$supplier] = true;
            }
        }
        $result = array_keys($suppliers);
        sort($result, SORT_NATURAL | SORT_FLAG_CASE);
        jsonOut(['ok' => true, 'values' => $result]);
    }

    if ($action === 'get_users') {
        $stmt = db()->prepare("SELECT login_id, display_name, user_email, role, active FROM app_users WHERE firm_id = :firm_id ORDER BY login_id ASC");
        $stmt->execute(['firm_id' => $firmId]);
        jsonOut([
            'ok' => true,
            'users' => $stmt->fetchAll(),
        ]);
    }

    if ($action === 'get_pending_ge') {
        $mrrSheetName = trim((string)($_GET['mrrSheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geRows = fetchRecordRows($firmId, 'GE ENTRY');
        $mrrRows = fetchRecordRows($firmId, $mrrSheetName);
        $result = [];

        foreach ($geRows as $row) {
            $data = decodeData($row);
            $mrrNo = value($data, 'mrr_no', 'mrr_number');
            $rowPendingStage = trim((string)($row['pending_stage'] ?? ''));
            if ($rowPendingStage !== 'pending_mrr' && $mrrNo !== '') {
                continue;
            }
            $result[] = [
                'pending_stage' => 'pending_mrr',
                'pending_label' => 'Pending MRR',
                'sort_order' => 1,
                'ge_no' => value($data, 'ge_no'),
                'date' => value($data, 'date'),
                'supplier' => value($data, 'supplier'),
                'invoice_no' => value($data, 'invoice_no'),
                'truck_no' => value($data, 'truck_no'),
                'total_value' => value($data, 'total_value'),
                'mrr_no' => '',
                'mrr_number' => '',
            ];
        }

        foreach ($mrrRows as $row) {
            if (($row['row_type'] ?? '') !== 'parent') {
                continue;
            }
            $data = decodeData($row);
            $stage = value($data, 'pending_stage');
            if ($stage === '') {
                $stage = determinePendingStage($data);
            }
            if (!in_array($stage, ['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval', 'pending_tally_posting'], true)) {
                continue;
            }
            $result[] = [
                'pending_stage' => $stage,
                'pending_label' => ucwords(str_replace('_', ' ', $stage)),
                'sort_order' => 2,
                'ge_no' => value($data, 'ge_no'),
                'date' => value($data, 'date'),
                'mrr_number' => value($data, 'mrr_number', 'mrr_no'),
                'supplier' => value($data, 'supplier'),
                'mrr_entry_type' => value($data, 'mrr_entry_type'),
                'invoice_no' => value($data, 'sup_doc_no'),
                'truck_no' => value($data, 'truck_number'),
                'plant_head_remark' => value($data, 'plant_head_remark'),
                'accounts_remark' => value($data, 'accounts_remark'),
                'md_approval_remark' => value($data, 'md_approval_remark'),
                'invoice_basic_value' => value($data, 'invoice_basic_value'),
                'total_value' => value($data, 'invoice_basic_value'),
            ];
        }

        usort($result, fn($a, $b) => strcmp((string)($a['date'] ?? ''), (string)($b['date'] ?? '')));
        jsonOut(['ok' => true, 'values' => $result]);
    }

    if ($action === 'verify_ge') {
        $invoiceNo = trim((string)($_GET['invoice_no'] ?? ''));
        $supplier = trim((string)($_GET['supplier'] ?? ''));
        $stmt = db()->prepare("SELECT * FROM app_records WHERE firm_id = :firm_id AND sheet_name = 'GE ENTRY' AND invoice_no = :invoice_no ORDER BY id DESC LIMIT 1");
        $stmt->execute([
            'firm_id' => $firmId,
            'invoice_no' => $invoiceNo,
        ]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonOut(['ok' => true]);
        }
        $data = decodeData($row);
        if ($supplier !== '' && stripos(value($data, 'supplier'), $supplier) === false) {
            jsonOut(['ok' => true]);
        }
        jsonOut([
            'ok' => true,
            'ge_no' => $row['ge_no'] ?? value($data, 'ge_no'),
            'mrr_no' => $row['mrr_number'] ?? value($data, 'mrr_no', 'mrr_number'),
        ]);
    }

    if ($action === 'diagnose_save') {
        $mrrSheetName = trim((string)($_GET['mrrSheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $helperSheetName = trim((string)($_GET['helperSheet'] ?? 'HELPER SHEET')) ?: 'HELPER SHEET';
        $mrrNumber = trim((string)($_GET['mrr_number'] ?? ''));
        $mrrRows = $mrrNumber !== '' ? fetchRecordRows($firmId, $mrrSheetName, $mrrNumber) : [];
        $helperRows = $mrrNumber !== '' ? fetchRecordRows($firmId, $helperSheetName, $mrrNumber) : [];
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
        $delete = $pdo->prepare("DELETE FROM app_records WHERE firm_id = :firm_id AND sheet_name = :sheet_name AND row_type = 'po_row'");
        $delete->execute([
            'firm_id' => $firmId,
            'sheet_name' => $sheetName,
        ]);
        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }
            upsertRecord([
                'firm_id' => $firmId,
                'sheet_name' => $sheetName,
                'row_type' => 'po_row',
                'row_sort' => $index + 1,
                'record_group_id' => trim((string)($row['po_no'] ?? '')),
                'mrr_number' => null,
                'ge_no' => null,
                'invoice_no' => null,
                'supplier' => trim((string)($row['supplier'] ?? '')),
                'truck_no' => null,
                'pending_stage' => null,
                'date_value' => trim((string)($row['date'] ?? '')),
                'approval_status_plant' => null,
                'approval_status_accounts' => null,
                'approval_status_md' => null,
                'tally_posted' => 0,
                'data_json' => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
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
    jsonOut([
        'ok' => false,
        'error' => $e->getMessage(),
    ], 500);
}
