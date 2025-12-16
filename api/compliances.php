<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

// DELETE: eliminar cumplimientos de un mes específico o de un año completo
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $year = $_GET['year'] ?? null;
    $month = $_GET['month'] ?? null;

    if (!$year) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'year es requerido']);
        exit;
    }

    try {
        if ($month) {
            // Eliminar solo un mes específico
            $stmt = $pdo->prepare("DELETE FROM compliances WHERE year = ? AND month = ?");
            $stmt->execute([$year, $month]);
            echo json_encode([
                'success' => true,
                'message' => 'Mes eliminado correctamente',
                'deleted' => $stmt->rowCount()
            ]);
        } else {
            // Eliminar todo el año: cumplimientos y entes activos
            $pdo->beginTransaction();

            // Eliminar cumplimientos del año
            $stmt = $pdo->prepare("DELETE FROM compliances WHERE year = ?");
            $stmt->execute([$year]);
            $deletedCompliances = $stmt->rowCount();

            // Eliminar entes activos del año
            $stmt = $pdo->prepare("DELETE FROM entes_activos WHERE year = ?");
            $stmt->execute([$year]);
            $deletedEntes = $stmt->rowCount();

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Año eliminado correctamente',
                'deleted_compliances' => $deletedCompliances,
                'deleted_entes_activos' => $deletedEntes
            ]);
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// GET: obtener todos los cumplimientos
// Seleccionamos cada compliance junto con datos del ente y su clasificación
$sql = "SELECT c.ente_id, c.year, c.month, c.status, c.note, c.created_at,
               e.title AS ente_title, e.img AS ente_img, cl.name AS classification
        FROM compliances c
        LEFT JOIN entes e ON e.id = c.ente_id
        LEFT JOIN classifications cl ON cl.id = e.classification_id
        ORDER BY e.title ASC, c.year DESC, FIELD(c.month, 'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre')";

$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll();

echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
