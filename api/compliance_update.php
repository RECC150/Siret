<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db = new PDO('mysql:host=localhost;dbname=u351010311_siret;charset=utf8mb4', 'u351010311_siretASEBCS', 'L>yD8P*2');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['updates']) || !is_array($input['updates'])) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit;
    }

    $db->beginTransaction();

    // Primero verificar si existe el registro
    $checkStmt = $db->prepare("
        SELECT id FROM compliances
        WHERE ente_id = :ente_id AND year = :year AND month = :month
    ");

    // Statement para actualizar
    $updateStmt = $db->prepare("
        UPDATE compliances
        SET status = :status
        WHERE id = :id
    ");

    // Statement para insertar
    $insertStmt = $db->prepare("
        INSERT INTO compliances (ente_id, year, month, status)
        VALUES (:ente_id, :year, :month, :status)
    ");

    foreach ($input['updates'] as $update) {
        if (!isset($update['ente_id'], $update['year'], $update['month'], $update['status'])) {
            continue;
        }

        // Verificar si existe
        $checkStmt->execute([
            ':ente_id' => $update['ente_id'],
            ':year' => $update['year'],
            ':month' => $update['month']
        ]);

        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Actualizar registro existente
            $updateStmt->execute([
                ':id' => $existing['id'],
                ':status' => $update['status']
            ]);
        } else {
            // Insertar nuevo registro
            $insertStmt->execute([
                ':ente_id' => $update['ente_id'],
                ':year' => $update['year'],
                ':month' => $update['month'],
                ':status' => $update['status']
            ]);
        }
    }

    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Cumplimientos actualizados correctamente'
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Error de base de datos: ' . $e->getMessage()
    ]);
}
