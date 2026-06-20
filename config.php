<?php
/**
 * Configuración del Sistema IPS CRM
 * Archivo de configuración principal
 */

// Cargar configuración de optimización si existe
if (file_exists(__DIR__ . '/config_optimizacion.php')) {
    require_once __DIR__ . '/config_optimizacion.php';
}

// Configuración de sesión única para este proyecto
session_name('soluciona_SID');
session_start();

// Configuración de zona horaria
date_default_timezone_set('America/Bogota');

// Configuración local opcional (credenciales/URL en servidor; no commitear)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

/**
 * URL pública de la app (sin barra final).
 * Prioridad: APP_URL en entorno → config.local.php → detección automática del request.
 */
if (!function_exists('detectAppUrl')) {
    function detectAppUrl() {
        $env = getenv('APP_URL');
        if (is_string($env) && trim($env) !== '') {
            return rtrim(trim($env), '/');
        }
        if (php_sapi_name() === 'cli') {
            return 'http://localhost/Soluciona';
        }
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
            || (isset($_SERVER['HTTP_CF_VISITOR']) && stripos((string) $_SERVER['HTTP_CF_VISITOR'], 'https') !== false);
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $script = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        $base = rtrim(str_replace('\\', '/', dirname($script)), '/');
        if ($base === '/' || $base === '.') {
            $base = '';
        }
        return $scheme . '://' . $host . $base;
    }
}

// Configuración de la aplicación
define('APP_NAME', 'soluciona');
define('APP_VERSION', '1.0.0');
if (!defined('APP_URL')) {
    define('APP_URL', detectAppUrl());
}

// Configuración de base de datos
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'compensar');
define('DB_CHARSET', 'utf8mb4');

// Configuración de seguridad
define('PASSWORD_MIN_LENGTH', 6);
define('MAX_LOGIN_ATTEMPTS', 5);

// Configuración de archivos
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_FILE_TYPES', ['xlsx', 'xls', 'csv']);

// Configuración de roles
define('ROLES', [
    'administrador' => 'Administrador',
    'coordinador' => 'Coordinador',
    'asesor' => 'Asesor'
]);

// Configuración de estados
define('ESTADOS', [
    'activo' => 'Activo',
    'inactivo' => 'Inactivo'
]);

// Límites para rendimiento (vistas asesor). Aumentar si hay pocos datos y no hay lentitud.
if (!defined('ASESOR_DASHBOARD_LIMIT_CLIENTES')) {
    define('ASESOR_DASHBOARD_LIMIT_CLIENTES', 500);
}
if (!defined('ASESOR_DASHBOARD_LIMIT_TAREAS')) {
    define('ASESOR_DASHBOARD_LIMIT_TAREAS', 100);
}
// Límite de historial de gestiones por cliente (vista asesor_gestionar) para no cargar millones de filas.
if (!defined('HISTORIAL_GESTION_LIMIT_POR_CLIENTE')) {
    define('HISTORIAL_GESTION_LIMIT_POR_CLIENTE', 200);
}
// Límite de clientes en modal "Ver Clientes" (Coord_gestion) por base.
if (!defined('COORD_MODAL_CLIENTES_LIMIT')) {
    define('COORD_MODAL_CLIENTES_LIMIT', 2000);
}
// Clave opcional para ejecutar scripts/optimizar_asesor.php desde el navegador: ?run=1&key=VALOR
// if (!defined('OPTIMIZAR_ASESOR_KEY')) { define('OPTIMIZAR_ASESOR_KEY', 'cambie-esto'); }

/**
 * Función para obtener la conexión a la base de datos
 * @return PDO
 */
function getDBConnection() {
    static $connection = null;
    
    if ($connection === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $connection = new PDO($dsn, DB_USER, DB_PASS);
            $connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            if (defined('PDO::MYSQL_ATTR_USE_BUFFERED_QUERY')) {
                $connection->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
            }
            // Asegurar que la conexión use UTF-8
            $connection->exec("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
            $connection->exec("SET CHARACTER SET utf8mb4");
        } catch (\PDOException $e) {
            error_log("Error de conexión a la base de datos: " . $e->getMessage());
            die("Error de conexión a la base de datos. Por favor, contacta al administrador.");
        }
    }
    
    return $connection;
}
?>
