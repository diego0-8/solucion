<?php
/**
 * Test estructural para el flujo de acuerdo largo plazo con cuotas manuales.
 * Uso: php tests/test_acuerdo_largo_plazo_cuotas_estructura.php
 */

$baseDir = dirname(__DIR__);
$errores = [];
$ok = [];

$vistaPath = $baseDir . '/views/asesor_gestionar.php';
$jsPath = $baseDir . '/assets/js/asesor-gestionar.js';
$controllerPath = $baseDir . '/controllers/AsesorGestionController.php';
$sqlPath = $baseDir . '/sql/bancoactual.sql';

$vista = file_get_contents($vistaPath);
$js = file_get_contents($jsPath);
$controller = file_get_contents($controllerPath);
$sql = file_get_contents($sqlPath);

if (strpos($vista, 'id="acuerdo-cuotas-detalle"') !== false) {
    $ok[] = 'La vista incluye el contenedor dinámico para las cuotas';
} else {
    $errores[] = 'La vista no incluye el contenedor `acuerdo-cuotas-detalle`';
}

$selectorCuotasOk = strpos($vista, 'id="simulador-num-cuotas"') !== false
    && (
        strpos($vista, '<option value="10">10</option>') !== false
        || (strpos($vista, '$i <= 10') !== false && strpos($vista, '$i = 1') !== false && strpos($vista, 'simulador-num-cuotas') !== false)
    );
if ($selectorCuotasOk) {
    $ok[] = 'La vista limita visualmente el número de cuotas hasta 10';
} else {
    $errores[] = 'La vista no expone correctamente el selector de 1 a 10 cuotas';
}

if (strpos($js, 'function renderizarCuotasAcuerdoManual()') !== false) {
    $ok[] = 'El JS renderiza filas manuales por cuota';
} else {
    $errores[] = 'No se encontró la función para renderizar cuotas manuales';
}

if (strpos($js, 'cuotas_acuerdo: cuotasAcuerdo') !== false) {
    $ok[] = 'El payload envía `cuotas_acuerdo` al backend';
} else {
    $errores[] = 'El payload no está enviando `cuotas_acuerdo`';
}

if (strpos($js, "gestion.acuerdo_cuotas") !== false) {
    $ok[] = 'El historial renderiza el detalle de cuotas';
} else {
    $errores[] = 'El historial no renderiza `gestion.acuerdo_cuotas`';
}

if (strpos($controller, 'normalizarCuotasAcuerdo') !== false && strpos($controller, 'guardarAcuerdoRelacionado') !== false) {
    $ok[] = 'El controlador valida y guarda el detalle de cuotas';
} else {
    $errores[] = 'El controlador no incluye la validación/guardado del detalle de cuotas';
}

if (strpos($controller, "acuerdo_cuotas") !== false) {
    $ok[] = 'El controlador adjunta cuotas al historial';
} else {
    $errores[] = 'El controlador no adjunta `acuerdo_cuotas` al historial';
}

if (strpos($sql, 'CREATE TABLE `acuerdo_cuotas`') !== false && strpos($sql, 'fk_acuerdo_cuotas_acuerdo') !== false) {
    $ok[] = 'El SQL define la tabla `acuerdo_cuotas` con sus llaves foráneas';
} else {
    $errores[] = 'El SQL no define correctamente la tabla `acuerdo_cuotas`';
}

echo "=== Test estructural acuerdo largo plazo con cuotas ===\n\n";
foreach ($ok as $msg) {
    echo "[OK] {$msg}\n";
}
foreach ($errores as $msg) {
    echo "[FALLO] {$msg}\n";
}

echo "\nTotal: " . count($ok) . " OK, " . count($errores) . " fallos.\n";
exit(empty($errores) ? 0 : 1);
