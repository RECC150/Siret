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
$id = (int)($input['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_id']);
    exit;
}

try {
    // Verificar si la clasificación está en uso
    $checkSql = "SELECT COUNT(*) as count FROM entes WHERE classification_id = :id";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute(['id' => $id]);
    $result = $checkStmt->fetch();

    if ($result['count'] > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'in_use',
            'message' => 'No se puede eliminar esta clasificación porque está siendo utilizada por ' . $result['count'] . ' ente(s)'
        ]);
        exit;
    }

    $sql = "DELETE FROM classifications WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    echo json_encode(['success' => true, 'id' => $id, 'deleted' => true, 'message' => 'Clasificación eliminada exitosamente']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'delete_failed', 'message' => $e->getMessage()]);
}
