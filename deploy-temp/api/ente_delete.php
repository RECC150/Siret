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
    echo json_encode(['success' => false, 'error' => 'db_connection_failed', 'message' => $e->getMessage()]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int)($input['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_id', 'message' => 'ID inválido']);
    exit;
}

try {
    // Desactivar restricciones de clave foránea
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");

    // 1. Eliminar de entes_activos
    $sql1 = "DELETE FROM entes_activos WHERE ente_id = ?";
    $stmt1 = $pdo->prepare($sql1);
    $stmt1->execute([$id]);

    // 2. Eliminar de compliances
    $sql2 = "DELETE FROM compliances WHERE ente_id = ?";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->execute([$id]);

    // 3. Eliminar de entes
    $sql3 = "DELETE FROM entes WHERE id = ?";
    $stmt3 = $pdo->prepare($sql3);
    $stmt3->execute([$id]);

    $rowsDeleted = $stmt3->rowCount();

    // Reactivar restricciones de clave foránea
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");

    if ($rowsDeleted > 0) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Ente eliminado exitosamente'
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'not_found',
            'message' => 'Ente no encontrado'
        ]);
    }

} catch (Exception $e) {
    // Asegurar que se reactiven las restricciones incluso con error
    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    } catch (Exception $ignored) {}

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'delete_failed',
        'message' => 'Error: ' . $e->getMessage(),
        'code' => $e->getCode(),
        'trace' => $e->getTraceAsString()
    ]);
}
