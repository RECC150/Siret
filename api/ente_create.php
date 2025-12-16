<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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

// Expected fields: title, classification (name), description, link. Optional file: icon
$title = isset($_POST['title']) ? trim($_POST['title']) : '';
$classificationName = isset($_POST['classification']) ? trim($_POST['classification']) : '';
$description = isset($_POST['description']) ? trim($_POST['description']) : '';
$link = isset($_POST['link']) ? trim($_POST['link']) : '';

if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_title']);
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

    $imgPath = null;
    if (!empty($_FILES) && isset($_FILES['icon']) && $_FILES['icon']['error'] === UPLOAD_ERR_OK) {
        $u = $_FILES['icon'];
        $ext = pathinfo($u['name'], PATHINFO_EXTENSION);
        $safe = bin2hex(random_bytes(8)) . '.' . $ext;
        $uploadDir = __DIR__ . '/../public/uploads/entes';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $dest = $uploadDir . '/' . $safe;
        if (move_uploaded_file($u['tmp_name'], $dest)) {
            // build web path
            $imgPath = '/siret/public/uploads/entes/' . $safe;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO entes (title, img, classification_id, description, link) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$title, $imgPath, $classification_id, $description, $link]);
    $newId = (int)$pdo->lastInsertId();

    // commit
    $pdo->commit();

    // return the created ente with classification name
    $classificationLabel = '';
    if ($classification_id) {
        $stmt = $pdo->prepare("SELECT name FROM classifications WHERE id = ?");
        $stmt->execute([$classification_id]);
        $r = $stmt->fetch();
        if ($r) $classificationLabel = $r['name'];
    }

    $out = [
        'success' => true,
        'id' => $newId,
        'title' => $title,
        'img' => $imgPath,
        'description' => $description,
        'link' => $link,
        'classification' => $classificationLabel,
        'classification_id' => $classification_id,
        'message' => 'Ente creado exitosamente'
    ];

    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'insert_failed', 'message' => $e->getMessage()]);
}
