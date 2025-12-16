<?php
// Simple API para devolver entes + clasificacion + compliances desde la BD 'siret'
// Ajusta host/usuario/password si es necesario.

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
    echo json_encode(['error' => 'db_connection_failed', 'message' => $e->getMessage()]);
    exit;
}

// Obtener entes con su clasificacion
$sql = "SELECT e.id, e.title, e.img, e.classification_id, COALESCE(c.name,'') AS classification, e.description, e.link
        FROM entes e
        LEFT JOIN classifications c ON e.classification_id = c.id
        ORDER BY e.title ASC";
$stmt = $pdo->query($sql);
$entes = $stmt->fetchAll();

// Obtener compliances para todos los entes
$ids = array_column($entes, 'id');
$compliances = [];
if (!empty($ids)) {
    // preparar placeholders
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql2 = "SELECT ente_id, year, month, status, note FROM compliances WHERE ente_id IN ($placeholders)";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->execute($ids);
    $rows = $stmt2->fetchAll();
    foreach ($rows as $r) {
        $compliances[$r['ente_id']][] = [
            'year' => (int)$r['year'],
            'month' => $r['month'],
            'status' => $r['status'],
            'note' => $r['note'] ?? null
        ];
    }
}

// Construir salida
$out = [];
foreach ($entes as $e) {
    $out[] = [
        'id' => (int)$e['id'],
        'title' => $e['title'],
        'img' => $e['img'],
        'classification' => $e['classification'],
        'description' => $e['description'] ?? '',
        'link' => $e['link'] ?? '',
        'compliances' => isset($compliances[$e['id']]) ? $compliances[$e['id']] : []
    ];
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
