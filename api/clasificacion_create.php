<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$host = '127.0.0.1';
$db   = 'siret';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_connection_failed', 'message' => $e->getMessage()]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$title = trim($input['title'] ?? '');
if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_title']);
    exit;
}

try {
    $sql = "INSERT INTO classifications (name) VALUES (:name)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['name' => $title]);
    $id = $pdo->lastInsertId();
    echo json_encode(['success' => true, 'id' => (int)$id, 'title' => $title, 'name' => $title, 'message' => 'Clasificación creada exitosamente']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'insert_failed', 'message' => $e->getMessage()]);
}
