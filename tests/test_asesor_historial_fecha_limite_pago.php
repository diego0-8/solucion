<?php
/**
 * Test: historial de gestiones en asesor_gestionar - fecha límite de pago en acuerdo total
 * Verifica que en el bloque "Datos del acuerdo" para acuerdo de pago total, la etiqueta
 * "Fecha de pago" (fecha_limite_pago) aparezca debajo de "Total a pagar".
 * Ejecutar desde la raíz: php tests/test_asesor_historial_fecha_limite_pago.php
 */

$baseDir = dirname(__DIR__);
$errores = [];
$ok = [];

// --- 1. Archivo JS que renderiza el historial ---
$jsFile = $baseDir . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'asesor-gestionar.js';
if (!is_file($jsFile)) {
    echo "ERROR: No se encuentra asesor-gestionar.js\n";
    exit(1);
}
$js = file_get_contents($jsFile);
$ok[] = 'Archivo asesor-gestionar.js encontrado';

// --- 2. Buscar el bloque que renderiza acuerdo tipo 'total' (Datos del acuerdo) ---
// Debe contener: Total a pagar (valor_final_pago_total) y después Fecha de pago (fecha_limite_pago)
$bloqueTotal = "if (a.tipo_acuerdo === 'total')";
$posTotalBlock = strpos($js, $bloqueTotal);
if ($posTotalBlock === false) {
    $errores[] = "No se encontró el bloque que renderiza acuerdo tipo 'total'";
} else {
    $ok[] = "Bloque tipo_acuerdo === 'total' encontrado";
}

// Extraer el fragmento desde el inicio del if (a.tipo_acuerdo === 'total') hasta el cierre del else if (cuotas)
// para no incluir cuotas/comite
$finBloque = strpos($js, "} else if (a.tipo_acuerdo === 'cuotas')", $posTotalBlock);
if ($finBloque === false) {
    $finBloque = strpos($js, '} else if (a.tipo_acuerdo === \'cuotas\')', $posTotalBlock);
}
if ($finBloque === false) {
    $finBloque = $posTotalBlock + 2000; // fallback: 2k chars
}
$fragmentoTotal = substr($js, $posTotalBlock, $finBloque - $posTotalBlock);

// --- 3. "Total a pagar" debe estar en el fragmento ---
$textoTotalAPagar = 'Total a pagar';
$posTotalAPagar = strpos($fragmentoTotal, $textoTotalAPagar);
if ($posTotalAPagar === false) {
    $errores[] = "En el bloque de acuerdo total no se encontró la etiqueta 'Total a pagar'";
} else {
    $ok[] = "Etiqueta 'Total a pagar' presente en bloque acuerdo total";
}

// --- 4. "Fecha de pago" (fecha_limite_pago) debe estar en el fragmento ---
$textoFechaPago = 'Fecha de pago';
$posFechaPago = strpos($fragmentoTotal, $textoFechaPago);
if ($posFechaPago === false) {
    $errores[] = "En el bloque de acuerdo total no se encontró la etiqueta 'Fecha de pago'";
} else {
    $ok[] = "Etiqueta 'Fecha de pago' presente en bloque acuerdo total";
}

// --- 5. Fecha de pago debe aparecer DESPUÉS de Total a pagar (debajo en el historial) ---
if ($posTotalAPagar !== false && $posFechaPago !== false && $posFechaPago <= $posTotalAPagar) {
    $errores[] = "En el historial, 'Fecha de pago' debe mostrarse debajo de 'Total a pagar'. En el JS, 'Fecha de pago' debe aparecer después de 'Total a pagar' en el bloque de acuerdo total.";
} elseif ($posTotalAPagar !== false && $posFechaPago !== false) {
    $ok[] = "'Fecha de pago' aparece después de 'Total a pagar' en el bloque de acuerdo total (orden correcto en historial)";
}

// --- 6. Verificar que la fecha mostrada es fecha_limite_pago ---
if (strpos($fragmentoTotal, 'fecha_limite_pago') === false) {
    $errores[] = "El bloque de acuerdo total debe usar a.fecha_limite_pago para la fecha de pago";
} else {
    $ok[] = "Se usa a.fecha_limite_pago para la Fecha de pago en acuerdo total";
}

// --- 7. Vista asesor_gestionar.php existe y carga el script ---
$vista = $baseDir . DIRECTORY_SEPARATOR . 'views' . DIRECTORY_SEPARATOR . 'asesor_gestionar.php';
if (!is_file($vista)) {
    $errores[] = "No se encuentra la vista views/asesor_gestionar.php";
} else {
    $htmlVista = file_get_contents($vista);
    if (strpos($htmlVista, 'asesor-gestionar.js') === false) {
        $errores[] = "La vista asesor_gestionar.php debe incluir el script asesor-gestionar.js";
    } else {
        $ok[] = "Vista asesor_gestionar.php incluye asesor-gestionar.js";
    }
}

// --- Resultado ---
echo "\n=== Test: Fecha límite de pago debajo de Total a pagar (historial asesor) ===\n\n";
foreach ($ok as $msg) {
    echo "  [OK] " . $msg . "\n";
}
if (!empty($errores)) {
    foreach ($errores as $msg) {
        echo "  [FALLO] " . $msg . "\n";
    }
    echo "\nTotal: " . count($ok) . " OK, " . count($errores) . " fallos.\n";
    exit(1);
}
echo "\nTotal: " . count($ok) . " comprobaciones OK.\n";
exit(0);
