<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
    echo json_encode(['error' => 'db_connection_failed', 'message' => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
        if ($year) {
            $stmt = $pdo->prepare("SELECT ente_id, year FROM entes_activos WHERE year = ? ORDER BY ente_id ASC");
            $stmt->execute([$year]);
            $rows = $stmt->fetchAll();
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            // devolver todos
            $stmt = $pdo->query("SELECT ente_id, year FROM entes_activos ORDER BY year DESC, ente_id ASC");
            $rows = $stmt->fetchAll();
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['year'], $input['ente_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Faltan parámetros year o ente_id']);
            exit;
        }
        $year = (int)$input['year'];
        $ente_id = (int)$input['ente_id'];

        $stmt = $pdo->prepare("INSERT IGNORE INTO entes_activos (ente_id, year) VALUES (?, ?)");
        $stmt->execute([$ente_id, $year]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'DELETE') {
        // Permitir parámetros via querystring o cuerpo JSON
        $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
        $ente_id = isset($_GET['ente_id']) ? (int)$_GET['ente_id'] : null;
        if (!$year || !$ente_id) {
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $year = isset($input['year']) ? (int)$input['year'] : $year;
                $ente_id = isset($input['ente_id']) ? (int)$input['ente_id'] : $ente_id;
            }
        }
        if (!$year || !$ente_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Faltan parámetros year o ente_id']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM entes_activos WHERE year = ? AND ente_id = ?");
        $stmt->execute([$year, $ente_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

?>
