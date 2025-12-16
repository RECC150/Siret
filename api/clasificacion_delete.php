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

$host = 'api.siret-graficas-interactivas.sifbcs.online';
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
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_id']);
    exit;
}

try {
    // Desactivar restricciones de clave foránea
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");

    // 1. Actualizar entes que usan esta clasificación a NULL
    $sql1 = "UPDATE entes SET classification_id = NULL WHERE classification_id = ?";
    $stmt1 = $pdo->prepare($sql1);
    $stmt1->execute([$id]);

    // 2. Eliminar la clasificación
    $sql2 = "DELETE FROM classifications WHERE id = ?";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->execute([$id]);

    $rowsDeleted = $stmt2->rowCount();

    // Reactivar restricciones de clave foránea
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");

    if ($rowsDeleted > 0) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'id' => $id,
            'deleted' => true,
            'message' => 'Clasificación eliminada exitosamente'
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'not_found',
            'message' => 'Clasificación no encontrada'
        ]);
    }
} catch (Exception $e) {
    // Asegurar que se reactiven las restricciones incluso con error
    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    } catch (Exception $ignored) {}

    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'delete_failed', 'message' => $e->getMessage()]);
}
