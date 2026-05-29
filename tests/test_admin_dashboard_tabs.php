<?php
/**
 * Test: vista admin_dashboard.php - pestañas (tabs)
 * Comprueba que el HTML y el JS necesarios para las pestañas existan y sean correctos.
 * Ejecutar desde la raíz del proyecto: php tests/test_admin_dashboard_tabs.php
 */

// Simular que estamos en el directorio raíz del proyecto
chdir(dirname(__DIR__));

$errores = [];
$ok = [];

// --- 1. Cargar vista con datos mínimos ---
$_SESSION['usuario_id'] = '1';
$_SESSION['usuario_rol'] = 'administrador';
$_SESSION['usuario_nombre'] = 'Admin Test';
$_SESSION['usuario_cedula'] = '123';

$estadisticas = [
    'total_usuarios' => 0,
    'usuarios_activos' => 0,
    'total_coordinadores' => 0,
    'coordinadores_disponibles' => 0,
    'total_asesores' => 0,
    'asesores_asignados' => 0,
    'total_clientes' => 0,
    'clientes_nuevos' => 0,
    'total_contratos' => 0,
    'total_cartera' => 0,
    'clientes_gestionados' => 0,
    'clientes_pendientes' => 0,
    'actividad_reciente' => [],
];
$usuarios = [];
$asignaciones = [];
$coordinadores = [];

ob_start();
try {
    require_once __DIR__ . '/../config.php';
    require __DIR__ . '/../views/admin_dashboard.php';
} catch (Throwable $e) {
    ob_end_clean();
    echo "ERROR FATAL al cargar la vista: " . $e->getMessage() . "\n";
    exit(1);
}
$html = ob_get_clean();

if ($html === false || $html === '') {
    echo "ERROR: La vista no generó salida.\n";
    exit(1);
}

$ok[] = 'Vista cargada y generó HTML';

// --- 2. Comprobar estructura de pestañas (botones) ---
$tabsEsperados = ['estadisticas', 'usuarios', 'asignaciones', 'clientes', 'actividad'];
foreach ($tabsEsperados as $tab) {
    if (strpos($html, 'data-tab="' . $tab . '"') !== false) {
        $ok[] = "Botón de pestaña con data-tab=\"$tab\" encontrado";
    } else {
        $errores[] = "Falta botón con data-tab=\"$tab\"";
    }
}

if (preg_match_all('/class="[^"]*tab-btn[^"]*"/', $html) >= 5) {
    $ok[] = 'Clase .tab-btn presente en los botones de pestaña';
} else {
    $errores[] = 'Faltan elementos con clase tab-btn';
}

if (strpos($html, 'class="main-tabs"') !== false) {
    $ok[] = 'Contenedor .main-tabs encontrado';
} else {
    $errores[] = 'Falta contenedor .main-tabs';
}

// --- 3. Comprobar paneles de contenido (tab-content) ---
foreach ($tabsEsperados as $tab) {
    $id = 'id="tab-' . $tab . '"';
    if (strpos($html, $id) !== false) {
        $ok[] = "Panel #tab-$tab encontrado";
    } else {
        $errores[] = "Falta panel con id=\"tab-$tab\"";
    }
}

// --- 4. Comprobar que el selector JS coincida con el HTML ---
// En este proyecto la lógica de pestañas vive en assets/js/admin-dashboard.js (no inline).
if (strpos($html, 'assets/js/admin-dashboard.js') !== false || strpos($html, 'admin-dashboard.js') !== false) {
    $ok[] = 'admin-dashboard.js está incluido en la vista';
} else {
    $errores[] = 'Falta incluir assets/js/admin-dashboard.js (JS de pestañas y utilidades)';
}

// --- 5. Función cambiarTab ---
// Validar la implementación real desde el archivo JS
$contenidoAdminJs = @file_get_contents(__DIR__ . '/../assets/js/admin-dashboard.js');
if ($contenidoAdminJs === false) {
    $errores[] = 'No se pudo leer assets/js/admin-dashboard.js para validar el JS de pestañas';
} else {
    if (strpos($contenidoAdminJs, 'function cambiarTab') !== false) {
        $ok[] = 'JS: función cambiarTab definida en admin-dashboard.js';
    } else {
        $errores[] = 'JS: falta función cambiarTab en assets/js/admin-dashboard.js';
    }
    if (strpos($contenidoAdminJs, '.content-sections .tab-content') !== false) {
        $ok[] = 'JS: usa selector .content-sections .tab-content (coincide con estructura)';
    } else {
        $errores[] = 'JS: selector .content-sections .tab-content no encontrado en assets/js/admin-dashboard.js';
    }
    if (strpos($contenidoAdminJs, "getElementById('tab-' + tabName)") !== false || strpos($contenidoAdminJs, 'getElementById(\'tab-\' + tabName)') !== false) {
        $ok[] = 'JS: cambiarTab actualiza panel por id tab- + tabName';
    } else {
        $errores[] = 'JS: cambiarTab no actualiza el panel por id (tab- + tabName)';
    }
}

// --- 6. Delegación de eventos (clic en pestañas) ---
if ($contenidoAdminJs !== false) {
    if (strpos($contenidoAdminJs, 'DOMContentLoaded') !== false || strpos($contenidoAdminJs, 'document.readyState') !== false) {
        $ok[] = 'JS: inicialización al cargar DOM (DOMContentLoaded o readyState)';
    } else {
        $errores[] = 'JS: falta inicialización al cargar DOM (DOMContentLoaded/readyState) en admin-dashboard.js';
    }
    if (strpos($contenidoAdminJs, 'addEventListener(') !== false && (strpos($contenidoAdminJs, "'click'") !== false || strpos($contenidoAdminJs, '"click"') !== false)) {
        $ok[] = 'JS: listener de click registrado para las pestañas';
    } else {
        $errores[] = 'JS: falta addEventListener(click) para pestañas en admin-dashboard.js';
    }
    if (strpos($contenidoAdminJs, 'closest(\'.tab-btn\')') !== false || strpos($contenidoAdminJs, 'closest(".tab-btn")') !== false) {
        $ok[] = 'JS: delegación con .closest(.tab-btn) presente';
    } else {
        $errores[] = 'JS: falta uso de .closest(.tab-btn) para delegación en admin-dashboard.js';
    }
}

// --- 7. Orden de scripts (el inline debe ir después de admin-dashboard.js y admin.js) ---
$posAdminJs = strpos($html, 'admin-dashboard.js');
$posAdminCommon = strpos($html, 'assets/js/admin.js');
$posInlineVista = strpos($html, 'FUNCIONES ESPECÍFICAS DE admin_dashboard.php');
if ($posAdminJs !== false) {
    $ok[] = 'Script admin-dashboard.js referenciado en HTML';
} else {
    $errores[] = 'Falta referencia a admin-dashboard.js en la vista';
}
if ($posAdminJs !== false && $posAdminCommon !== false && $posAdminJs < $posAdminCommon) {
    $ok[] = 'Orden OK: admin-dashboard.js antes de admin.js';
} else {
    $errores[] = 'Orden de scripts: admin-dashboard.js debería cargarse antes de admin.js';
}
if ($posInlineVista !== false && $posAdminCommon !== false && $posInlineVista > $posAdminCommon) {
    $ok[] = 'Orden OK: script inline específico de la vista va después de los .js';
} else {
    $errores[] = 'Orden de scripts: el inline específico de la vista debería ir después de admin-dashboard.js y admin.js';
}

// --- 8. CSS que podría ocultar las pestañas ---
$cssAdmin = @file_get_contents(__DIR__ . '/../assets/css/admin-dashboard.css');
if ($cssAdmin !== false) {
    if (preg_match('/\.content-sections\s+\.tab-content\s*\{[^}]*display:\s*none/', $cssAdmin)) {
        $ok[] = 'CSS: .content-sections .tab-content { display: none } (paneles ocultos por defecto)';
    }
    if (preg_match('/\.tab-content\.active\s*\{[^}]*display:\s*block/', $cssAdmin)) {
        $ok[] = 'CSS: .tab-content.active { display: block } (panel activo visible)';
    }
}

// --- 9. Posible conflicto: otro script que elimine o sobrescriba cambiarTab ---
// En esta versión, admin-dashboard.js ES la fuente de verdad de cambiarTab; no es un conflicto.
if ($contenidoAdminJs !== false && stripos($contenidoAdminJs, 'cambiarTab') !== false) {
    $ok[] = 'JS: admin-dashboard.js contiene cambiarTab (esperado)';
}

// --- Resumen ---
echo "\n========== TEST: Pestañas admin_dashboard.php ==========\n\n";
echo "--- OK (" . count($ok) . ") ---\n";
foreach ($ok as $m) {
    echo "  [OK] " . $m . "\n";
}
echo "\n--- ERRORES (" . count($errores) . ") ---\n";
if (count($errores) === 0) {
    echo "  (ninguno)\n";
} else {
    foreach ($errores as $e) {
        echo "  [FAIL] " . $e . "\n";
    }
}

echo "\n========== DIAGNÓSTICO: ¿Por qué no puedo acceder a las otras pestañas? ==========\n\n";

if (count($errores) > 0) {
    echo "Posibles causas según los fallos detectados:\n";
    foreach ($errores as $e) {
        echo "  - " . $e . "\n";
    }
} else {
    echo "El HTML y el script en servidor están correctos. Si en el navegador las pestañas no responden:\n";
    echo "  1. Abre la consola (F12 > Console) y revisa si hay errores de JavaScript al cargar la página.\n";
    echo "  2. Comprueba que admin-dashboard.js y admin.js carguen bien (pestaña Network): si dan 404, la ruta está mal.\n";
    echo "  3. Si usas index.php desde una subcarpeta (ej. http://localhost/BancoW/), los script src=\"assets/js/...\" deben ser relativos al documento; si la URL es index.php?action=dashboard, assets debe estar en la misma raíz.\n";
    echo "  4. Cualquier error en admin-dashboard.js o admin.js (antes del inline) puede impedir que se ejecute cambiarTab y el DOMContentLoaded.\n";
}

echo "\n========== Fin del test ==========\n";
exit(count($errores) > 0 ? 1 : 0);
