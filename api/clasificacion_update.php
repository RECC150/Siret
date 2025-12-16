<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 3600');
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = 'localhost';
$db   = 'u351010311_siret';
$user = 'u351010311_siretASEBCS';
$pass = 'L>yD8P*2';
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
$id = (int)($input['id'] ?? 0);
$title = trim($input['title'] ?? '');
if ($id <= 0 || $title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_input']);
    exit;
}

try {
    $sql = "UPDATE classifications SET name = :name WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['name' => $title, 'id' => $id]);
    echo json_encode(['success' => true, 'id' => $id, 'title' => $title, 'name' => $title, 'message' => 'Clasificación actualizada exitosamente']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'update_failed', 'message' => $e->getMessage()]);
}
