<?php
/**
 * Front Controller - Banco W CRM
 * Rutas: login, logout y vistas por rol.
 */

require_once __DIR__ . '/config.php';

$action = isset($_GET['action']) ? trim($_GET['action']) : 'login';

// ----- Login (público) -----
if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // #region agent log
        $dbgLog = __DIR__ . '/debug-5afbe2.log';
        @file_put_contents($dbgLog, json_encode(['sessionId'=>'5afbe2','hypothesisId'=>'H1','location'=>'index.php:login','message'=>'POST login inicio','data'=>['usuario'=>trim((string)($_POST['usuario']??''))],'timestamp'=>round(microtime(true)*1000)], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
        // #endregion
        require_once __DIR__ . '/controllers/LoginController.php';
        $controller = new LoginController();
        $result = $controller->login();
        // #region agent log
        @file_put_contents($dbgLog, json_encode(['sessionId'=>'5afbe2','hypothesisId'=>'H1','location'=>'index.php:login','message'=>'POST login resultado','data'=>['success'=>$result['success']??false,'redirect'=>$result['redirect']??null,'message'=>$result['message']??null],'timestamp'=>round(microtime(true)*1000)], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
        // #endregion
        if ($result['success']) {
            header('Location: ' . $result['redirect']);
            exit;
        }
        $error = $result['message'];
    }
    require_once __DIR__ . '/views/login.php';
    exit;
}

// ----- Logout -----
if ($action === 'logout') {
    require_once __DIR__ . '/controllers/LoginController.php';
    LoginController::logout();
    header('Location: index.php?action=login');
    exit;
}

// ----- Ruta para HybridUpdater (devuelve JSON; evita error "Unexpected token '<'" cuando no existía la acción) -----
if ($action === 'check_updates') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'has_updates' => false,
        'updates' => [],
        'timestamp' => time(),
    ]);
    exit;
}

// ----- Rutas AJAX para administrador (requieren sesión) -----
$rutasAjax = [
    'crear_usuario', 'actualizar_usuario', 'cambiar_estado_usuario', 'eliminar_usuario',
    'crear_asignacion', 'actualizar_asignacion', 'eliminar_asignacion', 'liberar_asignacion',
    'obtener_usuario',
    'cargar_historial_csv',
];

if (in_array($action, $rutasAjax, true)) {
    if (empty($_SESSION['usuario_id']) || strtolower($_SESSION['usuario_rol'] ?? '') !== 'administrador') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    header('Content-Type: application/json');
    
    try {
        $resultado = null;
        
        switch ($action) {
            case 'crear_usuario':
                require_once __DIR__ . '/controllers/AdminUsuarioController.php';
                $controller = new AdminUsuarioController();
                $resultado = $controller->crear();
                break;
                
            case 'actualizar_usuario':
                require_once __DIR__ . '/controllers/AdminUsuarioController.php';
                $controller = new AdminUsuarioController();
                $resultado = $controller->actualizar();
                break;
            
            case 'obtener_usuario':
                require_once __DIR__ . '/controllers/AdminUsuarioController.php';
                $controller = new AdminUsuarioController();
                $resultado = $controller->obtener();
                break;
                
            case 'cambiar_estado_usuario':
                require_once __DIR__ . '/controllers/AdminUsuarioController.php';
                $controller = new AdminUsuarioController();
                $resultado = $controller->cambiarEstado();
                break;
                
            case 'eliminar_usuario':
                require_once __DIR__ . '/controllers/AdminUsuarioController.php';
                $controller = new AdminUsuarioController();
                $resultado = $controller->eliminar();
                break;
                
            case 'crear_asignacion':
                require_once __DIR__ . '/controllers/AdminAsignacionController.php';
                $controller = new AdminAsignacionController();
                $resultado = $controller->crear();
                break;
                
            case 'actualizar_asignacion':
                require_once __DIR__ . '/controllers/AdminAsignacionController.php';
                $controller = new AdminAsignacionController();
                $resultado = $controller->actualizar();
                break;
                
            case 'eliminar_asignacion':
            case 'liberar_asignacion':
                require_once __DIR__ . '/controllers/AdminAsignacionController.php';
                $controller = new AdminAsignacionController();
                // Liberar es cambiar estado a inactiva
                if ($action === 'liberar_asignacion') {
                    $_POST['estado'] = 'inactiva';
                    $resultado = $controller->actualizar();
                } else {
                    $resultado = $controller->eliminar();
                }
                break;
                
            case 'cargar_historial_csv':
                require_once __DIR__ . '/controllers/AdminReportesController.php';
                $controller = new AdminReportesController();
                $resultado = $controller->procesarCargaCsv();
                break;
                
            default:
                $resultado = ['success' => false, 'message' => 'Acción no reconocida'];
        }
        
        // Asegurar que el resultado sea un array válido
        if (!is_array($resultado)) {
            $resultado = ['success' => false, 'message' => 'Error: respuesta inválida del controlador'];
        }
        
        // Enviar respuesta JSON
        $json = json_encode($resultado, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            error_log("Error al codificar JSON en $action: " . json_last_error_msg());
            echo json_encode(['success' => false, 'message' => 'Error al procesar la respuesta'], JSON_UNESCAPED_UNICODE);
        } else {
            echo $json;
        }
        
    } catch (Throwable $e) {
        error_log("Error en ruta AJAX $action: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        echo json_encode([
            'success' => false, 
            'message' => 'Error al procesar la solicitud: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ----- Rutas AJAX para coordinador -----
$rutasCoordAjax = [
    'obtener_bases', 'obtener_asesores', 'obtener_estadisticas_bases',
    'obtener_asesores_con_acceso', 'obtener_asesores_sin_acceso', 'obtener_clientes_disponibles',
    'obtener_clientes_no_asignados', 'obtener_bases_deshabilitadas', 'obtener_clientes_base',
    'obtener_asesores_acceso_base', 'guardar_acceso_base', 'guardar_asignaciones_base',
    'liberar_acceso_base', 'habilitar_base', 'deshabilitar_base', 'eliminar_base',
    'cargar_csv', 'obtener_tareas_coordinador', 'asignar_clientes', 'obtener_historial',
    'completar_tarea', 'eliminar_tarea', 'completar_asignacion', 'obtener_asignaciones_pendientes',
    'crear_asignacion_clientes', 'detalle_cliente_coordinador', 'verificar_tablas', 'descargar_plantilla',
    'obtener_valores_filtros', 'aplicar_filtros_obligaciones', 'crear_asignacion_clientes_filtrados', 'crear_asignacion_clientes_csv',
    'exportar_bases', 'limpiar_historial', 'obtener_detalles_asesor_coord', 'buscar_gestiones_asesor_coord',
    'generar_reporte_gestiones', 'generar_reporte_tmo',
];
if (in_array($action, $rutasCoordAjax, true)) {
    if (empty($_SESSION['usuario_id']) || strtolower($_SESSION['usuario_rol'] ?? '') !== 'coordinador') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    $accionesDescargaArchivo = ['descargar_plantilla', 'exportar_bases', 'generar_reporte_gestiones', 'generar_reporte_tmo'];
    if (in_array($action, $accionesDescargaArchivo, true)) {
        require_once __DIR__ . '/controllers/CoordGestionController.php';
        $ctrl = new CoordGestionController();
        if ($action === 'descargar_plantilla') {
            $ctrl->descargarPlantilla();
        } elseif ($action === 'exportar_bases') {
            $ctrl->exportarBases();
        } elseif ($action === 'generar_reporte_gestiones') {
            $ctrl->generarReporteGestiones();
        } else {
            $ctrl->generarReporteTmo();
        }
        exit;
    }
    header('Content-Type: application/json');
    ob_start();
    try {
        require_once __DIR__ . '/controllers/CoordGestionController.php';
        $ctrl = new CoordGestionController();
        $resultado = null;
        switch ($action) {
            case 'obtener_bases':
                $resultado = $ctrl->obtenerBases();
                break;
            case 'obtener_asesores':
                $resultado = $ctrl->obtenerAsesores();
                break;
            case 'obtener_estadisticas_bases':
                $resultado = $ctrl->obtenerEstadisticasBases();
                break;
            case 'cargar_csv':
                @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: inicio\n", FILE_APPEND);
                $resultado = $ctrl->cargarCsv();
                @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: resultado obtenido, success=" . (isset($resultado['success']) ? ($resultado['success'] ? 'true' : 'false') : 'n/a') . "\n", FILE_APPEND);
                break;
            case 'obtener_clientes_base':
                $resultado = $ctrl->obtenerClientesBase();
                break;
            case 'verificar_tablas':
                $resultado = $ctrl->verificarTablas();
                break;
            case 'detalle_cliente_coordinador':
                $resultado = $ctrl->detalleClienteCoordinador();
                break;
            case 'obtener_asesores_sin_acceso':
                $resultado = $ctrl->obtenerAsesoresSinAcceso();
                break;
            case 'obtener_asesores_acceso_base':
                $resultado = $ctrl->obtenerAsesoresAccesoBase();
                break;
            case 'obtener_asesores_con_acceso':
                // Alias para compatibilidad con código existente
                $resultado = $ctrl->obtenerAsesoresAccesoBase();
                break;
            case 'guardar_acceso_base':
                $resultado = $ctrl->guardarAccesoBase();
                break;
            case 'obtener_clientes_disponibles':
                $resultado = $ctrl->obtenerClientesDisponibles();
                break;
            case 'crear_asignacion_clientes':
                $resultado = $ctrl->crearAsignacionClientes();
                break;
            case 'obtener_tareas_coordinador':
            case 'asignar_clientes':
                // Alias para compatibilidad
                $resultado = $ctrl->obtenerTareasCoordinador();
                break;
            case 'completar_tarea':
            case 'completar_asignacion':
                // Alias para compatibilidad
                $resultado = $ctrl->completarTarea();
                break;
            case 'obtener_valores_filtros':
                $resultado = $ctrl->obtenerValoresFiltros();
                break;
            case 'aplicar_filtros_obligaciones':
                $resultado = $ctrl->aplicarFiltrosObligaciones();
                break;
            case 'crear_asignacion_clientes_filtrados':
                $resultado = $ctrl->crearAsignacionClientesFiltrados();
                break;
            case 'crear_asignacion_clientes_csv':
                $resultado = $ctrl->crearAsignacionClientesCsv();
                break;
            case 'obtener_clientes_no_asignados':
                $resultado = $ctrl->obtenerClientesNoAsignados();
                break;
            case 'obtener_bases_deshabilitadas':
                $resultado = $ctrl->obtenerBasesDeshabilitadas();
                break;
            case 'guardar_asignaciones_base':
                $resultado = $ctrl->guardarAsignacionesBase();
                break;
            case 'liberar_acceso_base':
                $resultado = $ctrl->liberarAccesoBase();
                break;
            case 'habilitar_base':
                $resultado = $ctrl->habilitarBase();
                break;
            case 'deshabilitar_base':
                $resultado = $ctrl->deshabilitarBase();
                break;
            case 'eliminar_base':
                $resultado = $ctrl->eliminarBase();
                break;
            case 'obtener_historial':
                $resultado = $ctrl->obtenerHistorial();
                break;
            case 'eliminar_tarea':
                $resultado = $ctrl->eliminarTarea();
                break;
            case 'obtener_asignaciones_pendientes':
                $resultado = $ctrl->obtenerAsignacionesPendientes();
                break;
            case 'limpiar_historial':
                $resultado = $ctrl->limpiarHistorial();
                break;
            case 'obtener_detalles_asesor_coord':
                $resultado = $ctrl->obtenerDetallesAsesorCoord();
                break;
            case 'buscar_gestiones_asesor_coord':
                $resultado = $ctrl->buscarGestionesAsesorCoord();
                break;
            default:
                $resultado = ['success' => false, 'message' => 'Acción no implementada'];
        }
        ob_end_clean();
        if ($action === 'cargar_csv') {
            @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: a punto de echo, resultado es array=" . (is_array($resultado) ? 'si' : 'no') . "\n", FILE_APPEND);
        }
        $json = json_encode($resultado, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            error_log("Coord AJAX $action: json_encode falló - " . json_last_error_msg());
            if ($action === 'cargar_csv') {
                @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: json_encode FALLO " . json_last_error_msg() . "\n", FILE_APPEND);
            }
            $json = json_encode(['success' => false, 'message' => 'Error al generar respuesta'], JSON_UNESCAPED_UNICODE);
        }
        echo $json;
        if ($action === 'cargar_csv') {
            @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: echo realizado, len=" . strlen($json) . "\n", FILE_APPEND);
        }
    } catch (Throwable $e) {
        ob_end_clean();
        if ($action === 'cargar_csv') {
            @file_put_contents(__DIR__ . '/log_carga_diagnostico.txt', date('c') . " cargar_csv: EXCEPCION " . $e->getMessage() . "\n", FILE_APPEND);
        }
        error_log("Coord AJAX $action: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ----- Rutas AJAX para asesor -----
$rutasAsesorAjax = [
    'guardar_gestion', 'obtener_historial_gestiones', 'obtener_gestiones_asesor', 'obtener_clientes_filtrados',
    'buscar_cliente_asesor', 'obtener_estadisticas_asesor', 'obtener_resumen_tareas',
    'obtener_siguiente_cliente', 'verificar_contrasena',
    'iniciar_gestion_tiempo', 'finalizar_gestion_tiempo',
    'crear_sesion_tiempo', 'iniciar_pausa', 'finalizar_pausa', 'actualizar_tiempo',
    'finalizar_sesion_tiempo', 'guardar_actividad_extra', 'obtener_bases_acceso',
    'obtener_datos_cliente', 'obtener_contratos_cliente', 'actualizar_info_cliente',
    'recordatorios_volver_llamar',
];

if (in_array($action, $rutasAsesorAjax, true)) {
    if (empty($_SESSION['usuario_id']) || strtolower($_SESSION['usuario_rol'] ?? '') !== 'asesor') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    header('Content-Type: application/json');
    ob_start();
    try {
        require_once __DIR__ . '/controllers/AsesorGestionController.php';
        $ctrl = new AsesorGestionController();
        $resultado = null;
        
        switch ($action) {
            case 'guardar_gestion':
                $resultado = $ctrl->guardarGestion();
                break;
            case 'iniciar_gestion_tiempo':
                $resultado = $ctrl->iniciarGestionTiempo();
                break;
            case 'finalizar_gestion_tiempo':
                $resultado = $ctrl->finalizarGestionTiempo();
                break;
            case 'obtener_historial_gestiones':
                $resultado = $ctrl->obtenerHistorialGestiones();
                break;
            case 'obtener_gestiones_asesor':
                $resultado = $ctrl->listarGestionesAsesor();
                break;
            case 'crear_sesion_tiempo':
                $resultado = $ctrl->crearSesionTiempo();
                break;
            case 'iniciar_pausa':
                $resultado = $ctrl->iniciarPausa();
                break;
            case 'finalizar_pausa':
                $resultado = $ctrl->finalizarPausa();
                break;
            case 'actualizar_tiempo':
                $resultado = $ctrl->actualizarTiempo();
                break;
            case 'finalizar_sesion_tiempo':
                $resultado = $ctrl->finalizarSesionTiempo();
                break;
            case 'guardar_actividad_extra':
                $resultado = $ctrl->guardarActividadExtra();
                break;
            case 'obtener_bases_acceso':
                $resultado = $ctrl->obtenerBasesAcceso();
                break;
            case 'buscar_cliente_asesor':
                $resultado = $ctrl->buscarClienteAsesor();
                break;
            case 'obtener_resumen_tareas':
                $resultado = $ctrl->obtenerResumenTareas();
                break;
            case 'obtener_estadisticas_asesor':
                $resultado = $ctrl->obtenerEstadisticasAsesor();
                break;
            case 'obtener_datos_cliente':
                $resultado = $ctrl->obtenerDatosCliente();
                break;
            case 'obtener_contratos_cliente':
                $resultado = $ctrl->obtenerContratosCliente();
                break;
            case 'actualizar_info_cliente':
                $resultado = $ctrl->actualizarInfoCliente();
                break;
            case 'obtener_siguiente_cliente':
                $resultado = $ctrl->obtenerSiguienteCliente();
                break;
            case 'obtener_clientes_filtrados':
                $resultado = $ctrl->obtenerClientesFiltrados();
                break;
            case 'verificar_contrasena':
                $resultado = $ctrl->verificarContrasena();
                break;
            case 'recordatorios_volver_llamar':
                $resultado = $ctrl->obtenerRecordatoriosVolverLlamar();
                break;
            default:
                $resultado = ['success' => false, 'message' => 'Acción no implementada'];
        }
        
        ob_end_clean();
        
        // Asegurar que el resultado sea un array válido
        if (!is_array($resultado)) {
            $resultado = ['success' => false, 'message' => 'Error: respuesta inválida del controlador'];
        }
        
        $json = json_encode($resultado, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            error_log("Asesor AJAX $action: json_encode falló - " . json_last_error_msg());
            $json = json_encode(['success' => false, 'message' => 'Error al generar respuesta'], JSON_UNESCAPED_UNICODE);
        }
        echo $json;
    } catch (Throwable $e) {
        ob_end_clean();
        error_log("Asesor AJAX $action: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// ----- Rutas que requieren sesión -----
$requiereSesion = [
    'dashboard', 'admin_usuarios', 'admin_asignaciones', 'admin_reportes', 'admin_configuracion',
    'coordinador_dashboard', 'coordinador_gestion', 'coordinador_exporte',
    'asesor_dashboard', 'asesor_gestionar',
    'admin_crear_usuario', 'admin_asignar_personal',
];

if (in_array($action, $requiereSesion, true) && empty($_SESSION['usuario_id'])) {
    header('Location: index.php?action=login');
    exit;
}

// ----- Incluir vista según acción -----
$vistas = [
    'dashboard'               => 'admin_dashboard.php',
    'admin_usuarios'          => 'admin_dashboard.php',
    'admin_asignaciones'      => 'admin_dashboard.php',
    'admin_reportes'          => 'admin_reportes.php',
    'admin_configuracion'     => 'admin_dashboard.php',
    'admin_crear_usuario'     => 'admin_crear_usuario.php',
    'admin_asignar_personal'  => 'admin_asignar_personal.php',
    'coordinador_dashboard'   => 'Coord_dashboard.php',
    'coordinador_gestion'     => 'Coord_gestion.php',
    'coordinador_exporte'     => 'coord_export.php',
    'asesor_dashboard'        => 'asesor_dashboard.php',
    'asesor_gestionar'        => 'asesor_gestionar.php',
];

if (isset($vistas[$action])) {
    $vistaArchivo = $vistas[$action];
    // $action ya está definido (línea 9) y la vista/Navbar.php lo usan para el menú activo y cambio de vista (index.php?action=...)
    
    // Obtener datos reales para admin_dashboard desde el controlador
    if ($vistaArchivo === 'admin_dashboard.php') {
        require_once __DIR__ . '/controllers/AdminDashboardController.php';
        $controller = new AdminDashboardController();
        $datos = $controller->obtenerDatosDashboard();
        $usuarios = $datos['usuarios'];
        $asignaciones = $datos['asignaciones'];
        $estadisticas = $datos['estadisticas'];
        $coordinadores = $datos['coordinadores'];
    }
    
    // Preparar datos para admin_reportes.php (bases para selector)
    if ($vistaArchivo === 'admin_reportes.php') {
        require_once __DIR__ . '/controllers/AdminReportesController.php';
        $reportesController = new AdminReportesController();
        $resBases = $reportesController->obtenerBases();
        $bases = ($resBases['success'] && !empty($resBases['bases'])) ? $resBases['bases'] : [];
    }
    
    // Preparar datos para admin_asignar_personal.php
    if ($vistaArchivo === 'admin_asignar_personal.php') {
        require_once __DIR__ . '/models/Usuario.php';
        $usuarioModel = new Usuario();
        $todosUsuarios = $usuarioModel->obtenerTodos();
        $asesores = array_filter($todosUsuarios, function($u) {
            return strtolower($u['rol'] ?? '') === 'asesor' && strtolower($u['estado'] ?? '') === 'activo';
        });
        $coordinadores = array_filter($todosUsuarios, function($u) {
            return strtolower($u['rol'] ?? '') === 'coordinador' && strtolower($u['estado'] ?? '') === 'activo';
        });
        $asesores = array_values($asesores);
        $coordinadores = array_values($coordinadores);
    }
    
    // Datos para vistas del coordinador (dashboard y gestión)
    if ($vistaArchivo === 'Coord_dashboard.php' || $vistaArchivo === 'Coord_gestion.php') {
        require_once __DIR__ . '/controllers/CoordDashboardController.php';
        $coordController = new CoordDashboardController();
        $datosCoord = $coordController->obtenerDatosDashboard();
        $estadisticas = $datosCoord['estadisticas'];
        $asesores = $datosCoord['asesores'];
        // Agregar estadisticas_bases al array de estadisticas para acceso fácil en la vista
        if (isset($datosCoord['estadisticas_bases'])) {
            $estadisticas['estadisticas_bases'] = $datosCoord['estadisticas_bases'];
        }
    }
    
    // Datos para vista del asesor (dashboard)
    if ($vistaArchivo === 'asesor_dashboard.php') {
        require_once __DIR__ . '/controllers/AsesorGestionController.php';
        $asesorController = new AsesorGestionController();
        
        // Obtener clientes asignados desde las tareas
        $clientes = $asesorController->obtenerClientesAsignados();
        
        // Obtener estadísticas
        $datosEstadisticas = $asesorController->obtenerEstadisticasAsesor();
        $estadisticas = $datosEstadisticas['success'] ? $datosEstadisticas['estadisticas'] : [
            'clientes_gestionados_mes' => 0,
            'gestiones_hoy' => 0,
            'acuerdos_pago' => 0,
            'tareas_completadas_mes' => 0,
            'contacto_exitoso' => 0,
            'llamadas_realizadas' => 0,
            'clientes_asignados' => 0,
            'clientes_gestionados' => 0,
            'clientes_pendientes' => 0,
            'tareas_completadas' => 0
        ];
    }
    
    require_once __DIR__ . '/views/' . $vistaArchivo;
    exit;
}

// ----- Sin acción conocida: redirigir al dashboard del rol o a login -----
if (!empty($_SESSION['usuario_id'])) {
    $rol = strtolower(trim((string) ($_SESSION['usuario_rol'] ?? 'asesor')));
    if ($rol === 'administrador') {
        header('Location: index.php?action=dashboard');
    } elseif ($rol === 'coordinador') {
        header('Location: index.php?action=coordinador_dashboard');
    } else {
        header('Location: index.php?action=asesor_dashboard');
    }
} else {
    header('Location: index.php?action=login');
}
exit;
