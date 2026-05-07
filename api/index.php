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

    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        $configPath = __DIR__ . '/config.sample.php';
    }
    if (!file_exists($configPath)) {
        throw new RuntimeException('Missing API config file. Create api/config.php from api/config.sample.php.');
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

function tableColumns(string $tableName): array
{
    static $cache = [];
    if (isset($cache[$tableName])) {
        return $cache[$tableName];
    }
    $stmt = db()->query("DESCRIBE {$tableName}");
    $cache[$tableName] = array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    return $cache[$tableName];
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
    $stmt = $pdo->prepare("SELECT ge_no FROM ge_entries WHERE firm_id = :firm_id");
    $stmt->execute(['firm_id' => $firmId]);
    $maxNo = numericSuffixMax(array_column($stmt->fetchAll(), 'ge_no'));
    $geNo = value($geEntry, 'ge_no');
    if ($geNo === '') {
        $geNo = (string)($maxNo + 1);
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
    $hasRequiredReelsColumn = in_array('required_reels', $parentColumns, true);

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

    if ($hasRequiredReelsColumn) {
        $parentParams['required_reels'] = value($parentData, 'required_reel') !== '' ? value($parentData, 'required_reel') : null;
    }

    if ($existingParentId) {
        $updateSetParts = [
            'record_group_id = :record_group_id',
            'ge_no = :ge_no',
            'mrr_no = :mrr_no',
            'mrr_form_id = :mrr_form_id',
            'entry_date = :entry_date',
            'receipt_date = :receipt_date',
            'supplier_name = :supplier_name',
            'supplier_doc_no = :supplier_doc_no',
            'truck_no = :truck_no',
            'invoice_total_weight = :invoice_total_weight',
            'actual_mrr_total_weight = :actual_mrr_total_weight',
            'rows_added = :rows_added',
            'mrr_type = :mrr_type',
            'invoice_basic_value = :invoice_basic_value',
            'mrr_basic_value = :mrr_basic_value',
            'e_way_bill_no = :e_way_bill_no',
            'e_way_date = :e_way_date',
            'lr_no = :lr_no',
            'insurance = :insurance',
            'round_off = :round_off',
            'plant_head_approval = :plant_head_approval',
            'accounts_approval = :accounts_approval',
            'md_approval = :md_approval',
            'pending_stage = :pending_stage',
            'tally_posted = :tally_posted',
            'extra_json = :extra_json',
            'updated_at = CURRENT_TIMESTAMP',
        ];
        if ($hasRequiredReelsColumn) {
            array_splice($updateSetParts, 11, 0, ['required_reels = :required_reels']);
        }
        $updateParent = $pdo->prepare("
            UPDATE {$parentTable}
            SET " . implode(",\n                ", $updateSetParts) . "
            WHERE id = :id AND firm_id = :firm_id
        ");
        $updateParent->execute($parentParams + ['id' => $existingParentId]);
        $parentId = (int)$existingParentId;
    } else {
        $insertColumns = [
            'firm_id', 'record_group_id', 'ge_no', 'mrr_no', 'mrr_form_id', 'entry_date', 'receipt_date', 'supplier_name',
            'supplier_doc_no', 'truck_no', 'invoice_total_weight', 'actual_mrr_total_weight', 'rows_added',
            'mrr_type', 'invoice_basic_value', 'mrr_basic_value', 'e_way_bill_no', 'e_way_date', 'lr_no', 'insurance', 'round_off',
            'plant_head_approval', 'accounts_approval', 'md_approval', 'pending_stage', 'tally_posted', 'extra_json'
        ];
        $insertValues = [
            ':firm_id', ':record_group_id', ':ge_no', ':mrr_no', ':mrr_form_id', ':entry_date', ':receipt_date', ':supplier_name',
            ':supplier_doc_no', ':truck_no', ':invoice_total_weight', ':actual_mrr_total_weight', ':rows_added',
            ':mrr_type', ':invoice_basic_value', ':mrr_basic_value', ':e_way_bill_no', ':e_way_date', ':lr_no', ':insurance', ':round_off',
            ':plant_head_approval', ':accounts_approval', ':md_approval', ':pending_stage', ':tally_posted', ':extra_json'
        ];
        if ($hasRequiredReelsColumn) {
            array_splice($insertColumns, 12, 0, ['required_reels']);
            array_splice($insertValues, 12, 0, [':required_reels']);
        }
        $insertParent = $pdo->prepare("
            INSERT INTO {$parentTable} (" . implode(', ', $insertColumns) . ")
            VALUES (" . implode(', ', $insertValues) . ")
        ");
        $insertParent->execute($parentParams);
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

    if ($action === 'authenticate_user') {
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

    if ($action === 'get_latest_ids') {
        $sheetName = trim((string)($_GET['mrrSheet'] ?? $_GET['sheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geSheetName = trim((string)($_GET['geSheet'] ?? 'GE ENTRY')) ?: 'GE ENTRY';
        $prefix = trim((string)($_GET['prefix'] ?? ''));

        $mrrRows = fetchSheetDataRows($firmId, $sheetName);
        $geRows = fetchSheetDataRows($firmId, $geSheetName);
        $mrrValues = [];
        foreach ($mrrRows as $row) {
            $mrrValues[] = $row['mrr_number'] ?? $row['mrr_no'] ?? '';
        }
        $geValues = [];
        foreach ($geRows as $row) {
            $geValues[] = $row['ge_no'] ?? '';
        }

        jsonOut([
            'ok' => true,
            'mrr' => numericSuffixMax($mrrValues, $prefix),
            'ge' => numericSuffixMax($geValues, $prefix),
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

    if ($action === 'get_pending_ge') {
        $mrrSheetName = trim((string)($_GET['mrrSheet'] ?? 'MRR FORM')) ?: 'MRR FORM';
        $geRows = fetchSheetDataRows($firmId, 'GE ENTRY');
        $parentTable = mrrParentTableForSheet($mrrSheetName);
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

        foreach ($mrrRows as $row) {
            $stage = value($row, 'pending_stage');
            if ($stage === '') {
                $stage = determinePendingStage($row);
            }
            if (!in_array($stage, ['pending_plant_head_approval', 'pending_accounts_approval', 'pending_md_approval', 'pending_tally_posting'], true)) {
                continue;
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
                'total_value' => value($row, 'invoice_basic_value'),
            ];
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
