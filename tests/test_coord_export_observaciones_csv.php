<?php
/**
 * Test estructural: verifica que el reporte CSV del coordinador
 * exporte observaciones sin saltos de línea ni espacios repetidos.
 * Ejecutar: php tests/test_coord_export_observaciones_csv.php
 */

$baseDir = dirname(__DIR__);
$controllerPath = $baseDir . '/controllers/CoordGestionController.php';
$contenido = file_get_contents($controllerPath);

$errores = [];
$ok = [];

if ($contenido === false || $contenido === '') {
    echo "ERROR: No se pudo leer CoordGestionController.php\n";
    exit(1);
}

if (strpos($contenido, 'private function sanitizarObservacionesCsv($valor)') !== false) {
    $ok[] = 'Existe helper específico para limpiar observaciones';
} else {
    $errores[] = 'No existe helper sanitizarObservacionesCsv';
}

if (strpos($contenido, "preg_replace('/\\s+/', ' ', \$s)") !== false) {
    $ok[] = 'El helper colapsa espacios repetidos';
} else {
    $errores[] = 'El helper no colapsa espacios repetidos';
}

if (strpos($contenido, "\$this->sanitizarObservacionesCsv(\$r['observaciones'] ?? '')") !== false) {
    $ok[] = 'La exportación CSV usa el helper en la columna observaciones';
} else {
    $errores[] = 'La columna observaciones no usa sanitizarObservacionesCsv en el reporte';
}

echo "=== Test observaciones CSV coordinador ===\n\n";
foreach ($ok as $msg) {
    echo "[OK] {$msg}\n";
}
foreach ($errores as $msg) {
    echo "[FALLO] {$msg}\n";
}

echo "\nTotal: " . count($ok) . " OK, " . count($errores) . " fallos.\n";
exit(empty($errores) ? 0 : 1);
