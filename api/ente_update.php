<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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
    echo json_encode(['success' => false, 'error' => 'db_connection_failed', 'message' => $e->getMessage()]);
    exit;
}

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$title = isset($_POST['title']) ? trim($_POST['title']) : '';
$classificationName = isset($_POST['classification']) ? trim($_POST['classification']) : '';
$description = isset($_POST['description']) ? trim($_POST['description']) : '';
$link = isset($_POST['link']) ? trim($_POST['link']) : '';

if ($id <= 0 || $title === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_input', 'message' => 'ID y nombre son requeridos']);
    exit;
}

try {
    $pdo->beginTransaction();

    $classification_id = null;
    if ($classificationName !== '') {
        // find classification by name, else create
        $stmt = $pdo->prepare("SELECT id FROM classifications WHERE name = ? LIMIT 1");
        $stmt->execute([$classificationName]);
        $row = $stmt->fetch();
        if ($row) {
            $classification_id = (int)$row['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO classifications (name) VALUES (?)");
            $stmt->execute([$classificationName]);
            $classification_id = (int)$pdo->lastInsertId();
        }
    }

    // Handle icon upload if present
    $imgPath = null;
    if (!empty($_FILES) && isset($_FILES['icon']) && $_FILES['icon']['error'] === UPLOAD_ERR_OK) {
        $u = $_FILES['icon'];
        $ext = pathinfo($u['name'], PATHINFO_EXTENSION);
        $safe = bin2hex(random_bytes(8)) . '.' . $ext;
        $uploadDir = __DIR__ . '/../public/uploads/entes';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $dest = $uploadDir . '/' . $safe;
        if (move_uploaded_file($u['tmp_name'], $dest)) {
            $imgPath = '/siret/public/uploads/entes/' . $safe;
        }
    }

    if ($imgPath) {
        $stmt = $pdo->prepare("UPDATE entes SET title = ?, classification_id = ?, img = ?, description = ?, link = ? WHERE id = ?");
        $stmt->execute([$title, $classification_id, $imgPath, $description, $link, $id]);
    } else {
        $stmt = $pdo->prepare("UPDATE entes SET title = ?, classification_id = ?, description = ?, link = ? WHERE id = ?");
        $stmt->execute([$title, $classification_id, $description, $link, $id]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'id' => $id,
        'title' => $title,
        'classification' => $classificationName,
        'description' => $description,
        'link' => $link,
        'img' => $imgPath,
        'message' => 'Ente actualizado exitosamente'
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'update_failed', 'message' => $e->getMessage()]);
}
