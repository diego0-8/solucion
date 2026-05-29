<?php
/**
 * Controlador del Dashboard del Coordinador
 * Obtiene estadísticas y asesores asignados al coordinador logueado
 */

require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../models/Asignacion.php';
require_once __DIR__ . '/../models/Cliente.php';
require_once __DIR__ . '/../models/Tarea.php';
require_once __DIR__ . '/../models/BaseCliente.php';

class CoordDashboardController {

    /**
     * Obtiene datos para el dashboard del coordinador
     * @return array{estadisticas: array, asesores: array}
     */
    public function obtenerDatosDashboard() {
        $coordinadorCedula = $_SESSION['usuario_id'] ?? $_SESSION['usuario_cedula'] ?? null;
        if (!$coordinadorCedula) {
            return [
                'estadisticas' => $this->estadisticasVacias(),
                'asesores' => [],
                'estadisticas_bases' => [],
            ];
        }

        try {
            $asignacionModel = new Asignacion();
            $usuarioModel = new Usuario();
            $clienteModel = new Cliente();

            // Asignaciones activas de este coordinador
            $asignaciones = $asignacionModel->obtenerPorCoordinador($coordinadorCedula);
            if (!is_array($asignaciones)) {
                $asignaciones = [];
            }

            // Cédulas de asesores asignados a este coordinador
            $cedulasAsesores = array_unique(array_column($asignaciones, 'asesor_cedula'));

            // Cargar datos de cada asesor con estadísticas reales
            $tareaModel = new Tarea();
            $db = getDBConnection();
            $asesores = [];
            
            foreach ($cedulasAsesores as $cedula) {
                $u = $usuarioModel->obtenerPorCedula($cedula);
                if ($u && strtolower($u['rol'] ?? '') === 'asesor') {
                    $u['nombre_completo'] = $u['nombre_completo'] ?? $u['nombre'] ?? '';
                    
                    // Obtener todas las tareas del asesor (necesitamos todas para calcular correctamente)
                    // obtenerPorAsesor solo devuelve pendiente/en progreso, necesitamos todas
                    try {
                        $sqlTareas = "SELECT 
                            t.id_tarea,
                            t.coordinador_cedula,
                            t.asesor_cedula,
                            t.base_id,
                            t.estado,
                            t.clientes_asignados,
                            t.obligaciones_asignadas,
                            t.fecha_creacion,
                            t.fecha_completa,
                            bc.nombre as base_nombre
                        FROM tareas t
                        LEFT JOIN base_clientes bc ON t.base_id = bc.id_base
                        WHERE t.asesor_cedula = ?
                        ORDER BY t.fecha_creacion DESC";
                        $stmtTareas = $db->prepare($sqlTareas);
                        $stmtTareas->execute([$cedula]);
                        $tareasAsesorRaw = $stmtTareas->fetchAll(PDO::FETCH_ASSOC);
                        
                        // Decodificar JSON de clientes y obligaciones
                        $tareasAsesor = [];
                        foreach ($tareasAsesorRaw as $tareaRaw) {
                            if ($tareaRaw['clientes_asignados']) {
                                $tareaRaw['clientes_asignados'] = json_decode($tareaRaw['clientes_asignados'], true) ?: [];
                            } else {
                                $tareaRaw['clientes_asignados'] = [];
                            }
                            $tareasAsesor[] = $tareaRaw;
                        }
                    } catch (Exception $e) {
                        error_log("CoordDashboardController: Error obteniendo tareas - " . $e->getMessage());
                        $tareasAsesor = [];
                    }
                    
                    // Obtener tareas activas (pendiente o en progreso)
                    $tareasActivas = array_filter($tareasAsesor, function($t) {
                        return in_array($t['estado'], ['pendiente', 'en progreso']);
                    });
                    $u['numero_tareas_activas'] = count($tareasActivas);
                    
                    // Calcular clientes asignados desde tareas activas
                    $clientesAsignadosIds = [];
                    foreach ($tareasActivas as $tarea) {
                        $clientesTarea = is_array($tarea['clientes_asignados']) ? $tarea['clientes_asignados'] : [];
                        $clientesAsignadosIds = array_merge($clientesAsignadosIds, $clientesTarea);
                    }
                    $u['clientes_asignados'] = count(array_unique($clientesAsignadosIds));
                    
                    // Calcular clientes gestionados TOTALES (estén o no en tarea) desde historial_gestion
                    try {
                        $stmt = $db->prepare("
                            SELECT COUNT(DISTINCT cliente_id) as total 
                            FROM historial_gestion 
                            WHERE asesor_cedula = ?
                        ");
                        $stmt->execute([$cedula]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $u['clientes_gestionados'] = (int)($result['total'] ?? 0);
                    } catch (Exception $e) {
                        error_log("CoordDashboardController: Error clientes gestionados - " . $e->getMessage());
                        $u['clientes_gestionados'] = 0;
                    }
                    
                    // Calcular progreso de tareas activas
                    $progresoTareas = [];
                    if (!empty($tareasActivas)) {
                        // Obtener clientes con gestiones del asesor
                        try {
                            $stmt = $db->prepare("
                                SELECT DISTINCT cliente_id 
                                FROM historial_gestion 
                                WHERE asesor_cedula = ?
                            ");
                            $stmt->execute([$cedula]);
                            $clientesConGestiones = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
                            $clientesConGestionesSet = array_flip($clientesConGestiones);
                            
                            foreach ($tareasActivas as $tarea) {
                                $clientesTarea = is_array($tarea['clientes_asignados']) ? $tarea['clientes_asignados'] : [];
                                $totalClientesTarea = count($clientesTarea);
                                
                                if ($totalClientesTarea > 0) {
                                    $clientesGestionadosTarea = 0;
                                    foreach ($clientesTarea as $clienteId) {
                                        if (isset($clientesConGestionesSet[(int)$clienteId])) {
                                            $clientesGestionadosTarea++;
                                        }
                                    }
                                    $porcentajeProgreso = round(($clientesGestionadosTarea / $totalClientesTarea) * 100);
                                    
                                    $progresoTareas[] = [
                                        'tarea_id' => $tarea['id_tarea'],
                                        'base_nombre' => $tarea['base_nombre'] ?? 'Sin nombre',
                                        'total_clientes' => $totalClientesTarea,
                                        'clientes_gestionados' => $clientesGestionadosTarea,
                                        'porcentaje' => $porcentajeProgreso,
                                        'estado' => $tarea['estado']
                                    ];
                                }
                            }
                        } catch (Exception $e) {
                            error_log("CoordDashboardController: Error calculando progreso - " . $e->getMessage());
                        }
                    }
                    $u['progreso_tareas'] = $progresoTareas;
                    
                    // Obtener última actividad desde historial_gestion
                    try {
                        $stmt = $db->prepare("
                            SELECT MAX(fecha_creacion) as ultima_actividad 
                            FROM historial_gestion 
                            WHERE asesor_cedula = ?
                        ");
                        $stmt->execute([$cedula]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $u['ultima_actividad'] = $result['ultima_actividad'] ?? null;
                    } catch (Exception $e) {
                        error_log("CoordDashboardController: Error última actividad - " . $e->getMessage());
                        $u['ultima_actividad'] = null;
                    }
                    
                    $asesores[] = $u;
                }
            }

            // Clientes totales (todos, para estadísticas globales; luego se puede filtrar por base del coordinador)
            $clientes = [];
            try {
                $clientes = $clienteModel->obtenerTodos();
                if (!is_array($clientes)) {
                    $clientes = [];
                }
            } catch (Exception $e) {
                error_log("CoordDashboardController: Error clientes - " . $e->getMessage());
            }

            $estadisticas = $this->calcularEstadisticas($asesores, $clientes);
            $estadisticasBases = $this->obtenerEstadisticasBases($coordinadorCedula);

            return [
                'estadisticas' => $estadisticas,
                'asesores' => $asesores,
                'estadisticas_bases' => $estadisticasBases,
            ];
        } catch (Exception $e) {
            error_log("CoordDashboardController: " . $e->getMessage());
            return [
                'estadisticas' => $this->estadisticasVacias(),
                'asesores' => [],
                'estadisticas_bases' => [],
            ];
        }
    }

    /**
     * Estadísticas con valores por defecto
     * @return array
     */
    private function estadisticasVacias() {
        return [
            'asesores_asignados' => 0,
            'bases_clientes' => 0,
            'tareas_realizadas' => 0,
            'total_clientes' => 0,
            'clientes_gestionados' => 0,
            'clientes_pendientes' => 0,
            'tareas_pendientes' => 0,
            'total_contratos' => 0,
            'total_cartera' => 0,
            'clientes_nuevos' => 0,
            'asesores_activos' => 0,
        ];
    }

    /**
     * Calcula estadísticas del coordinador
     * @param array $asesores
     * @param array $clientes (no se usa, se calcula desde tareas)
     * @return array
     */
    private function calcularEstadisticas(array $asesores, array $clientes) {
        $coordinadorCedula = $_SESSION['usuario_id'] ?? $_SESSION['usuario_cedula'] ?? null;
        $asesoresActivos = count(array_filter($asesores, function ($a) {
            return strtolower($a['estado'] ?? '') === 'activo';
        }));

        // Calcular tareas realizadas y pendientes del coordinador
        $tareasRealizadas = 0;
        $tareasPendientes = 0;
        $clientesGestionados = 0;
        $totalCartera = 0;
        $totalContratos = 0;
        $clientesAsignadosTodos = [];
        $baseIds = [];
        $clientesNuevos = 0;
        
        if ($coordinadorCedula) {
            try {
                $tareaModel = new Tarea();
                $tareas = $tareaModel->obtenerPorCoordinador($coordinadorCedula);
                
                foreach ($tareas as $tarea) {
                    if ($tarea['estado'] === 'completa') {
                        $tareasRealizadas++;
                    } elseif (in_array($tarea['estado'], ['pendiente', 'en progreso'])) {
                        $tareasPendientes++;
                    }
                    
                    // Recopilar clientes asignados y bases de las tareas
                    $clientesTarea = is_array($tarea['clientes_asignados']) ? $tarea['clientes_asignados'] : [];
                    $clientesAsignadosTodos = array_merge($clientesAsignadosTodos, $clientesTarea);
                    
                    // Recopilar base_id de las tareas
                    if (!empty($tarea['base_id'])) {
                        $baseIds[] = $tarea['base_id'];
                    }
                }
                
                // Eliminar duplicados
                $clientesAsignadosTodos = array_unique($clientesAsignadosTodos);
                $baseIds = array_unique($baseIds);
                
                // Calcular clientes gestionados SOLO de los asignados a las tareas del coordinador
                if (!empty($clientesAsignadosTodos)) {
                    try {
                        $db = getDBConnection();
                        $cedulasAsesores = array_column($asesores, 'cedula');
                        if (!empty($cedulasAsesores)) {
                            $placeholdersClientes = implode(',', array_fill(0, count($clientesAsignadosTodos), '?'));
                            $placeholdersAsesores = implode(',', array_fill(0, count($cedulasAsesores), '?'));
                            
                            $stmt = $db->prepare("
                                SELECT COUNT(DISTINCT cliente_id) as total
                                FROM historial_gestion
                                WHERE asesor_cedula IN ($placeholdersAsesores)
                                AND cliente_id IN ($placeholdersClientes)
                            ");
                            $stmt->execute(array_merge($cedulasAsesores, $clientesAsignadosTodos));
                            $result = $stmt->fetch(PDO::FETCH_ASSOC);
                            $clientesGestionados = (int)($result['total'] ?? 0);
                        }
                    } catch (Exception $e) {
                        error_log("CoordDashboardController: Error calculando clientes gestionados - " . $e->getMessage());
                        // Fallback: suma de todos los asesores (puede incluir clientes fuera de tareas)
                        foreach ($asesores as $asesor) {
                            $clientesGestionados += (int)($asesor['clientes_gestionados'] ?? 0);
                        }
                    }
                }
                
                // Calcular total de cartera, contratos y clientes nuevos desde la base de datos
                try {
                    $db = getDBConnection();
                    
                    if (!empty($clientesAsignadosTodos)) {
                        $placeholders = implode(',', array_fill(0, count($clientesAsignadosTodos), '?'));
                        
                        // Total de contratos (obligaciones) y cartera
                        $stmt = $db->prepare("
                            SELECT COUNT(DISTINCT id_obligacion) as total_contratos,
                                   SUM(total_a_pagar) as total_cartera
                            FROM obligaciones
                            WHERE cliente_id IN ($placeholders)
                        ");
                        $stmt->execute($clientesAsignadosTodos);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $totalContratos = (int)($result['total_contratos'] ?? 0);
                        $totalCartera = (float)($result['total_cartera'] ?? 0);
                        
                        // Calcular clientes nuevos (últimos 30 días) solo de los asignados
                        $stmt = $db->prepare("
                            SELECT COUNT(DISTINCT id_cliente) as total_nuevos
                            FROM cliente
                            WHERE id_cliente IN ($placeholders)
                            AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        ");
                        $stmt->execute($clientesAsignadosTodos);
                        $resultNuevos = $stmt->fetch(PDO::FETCH_ASSOC);
                        $clientesNuevos = (int)($resultNuevos['total_nuevos'] ?? 0);
                    }
                } catch (Exception $e) {
                    error_log("CoordDashboardController: Error calculando cartera - " . $e->getMessage());
                }
            } catch (Exception $e) {
                error_log("CoordDashboardController: Error calculando estadísticas - " . $e->getMessage());
            }
        }
        
        // Total de clientes asignados a las tareas del coordinador
        $totalClientes = count($clientesAsignadosTodos);
        
        // Bases distintas de las tareas del coordinador
        $basesClientes = count($baseIds);

        return [
            'asesores_asignados' => count($asesores),
            'bases_clientes' => $basesClientes,
            'tareas_realizadas' => $tareasRealizadas,
            'total_clientes' => $totalClientes,
            'clientes_gestionados' => $clientesGestionados,
            'clientes_pendientes' => max(0, $totalClientes - $clientesGestionados),
            'tareas_pendientes' => $tareasPendientes,
            'total_contratos' => $totalContratos,
            'total_cartera' => $totalCartera,
            'clientes_nuevos' => $clientesNuevos,
            'asesores_activos' => $asesoresActivos,
        ];
    }

    /**
     * Obtiene estadísticas de las bases de datos activas del coordinador
     * @param string $coordinadorCedula
     * @return array
     */
    private function obtenerEstadisticasBases($coordinadorCedula) {
        try {
            $db = getDBConnection();
            $baseModel = new BaseCliente();
            $tareaModel = new Tarea();
            
            // Obtener todas las bases activas que tienen tareas del coordinador
            $tareas = $tareaModel->obtenerPorCoordinador($coordinadorCedula);
            $baseIds = array_unique(array_filter(array_column($tareas, 'base_id')));
            
            if (empty($baseIds)) {
                return [];
            }
            
            $placeholders = implode(',', array_fill(0, count($baseIds), '?'));
            $stmt = $db->prepare("
                SELECT id_base, nombre, estado, total_clientes, TOTAL_OBLIGACIONES
                FROM base_clientes
                WHERE id_base IN ($placeholders)
                AND estado = 'activo'
                ORDER BY nombre ASC
            ");
            $stmt->execute($baseIds);
            $bases = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $estadisticasBases = [];
            
            foreach ($bases as $base) {
                $baseId = $base['id_base'];
                
                // Obtener asesores con acceso a esta base
                $stmt = $db->prepare("
                    SELECT DISTINCT asesor_cedula
                    FROM asignacion_base_asesores
                    WHERE base_id = ?
                    AND estado = 'activa'
                ");
                $stmt->execute([$baseId]);
                $asesoresBase = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                if (empty($asesoresBase)) {
                    continue; // Saltar bases sin asesores asignados
                }
                
                // Contar clientes gestionados de esta base
                $placeholdersAsesores = implode(',', array_fill(0, count($asesoresBase), '?'));
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT hg.cliente_id) as clientes_gestionados
                    FROM historial_gestion hg
                    INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                    WHERE c.base_id = ?
                    AND hg.asesor_cedula IN ($placeholdersAsesores)
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $resultGestionados = $stmt->fetch(PDO::FETCH_ASSOC);
                $clientesGestionados = (int)($resultGestionados['clientes_gestionados'] ?? 0);
                
                // Calcular total y total a pagar de obligaciones de esta base
                $stmt = $db->prepare("
                    SELECT 
                        COUNT(DISTINCT o.id_obligacion) as total_obligaciones,
                        COALESCE(SUM(o.total), 0) as total,
                        COALESCE(SUM(o.total_a_pagar), 0) as total_a_pagar
                    FROM obligaciones o
                    INNER JOIN cliente c ON c.id_cliente = o.cliente_id
                    WHERE c.base_id = ?
                ");
                $stmt->execute([$baseId]);
                $resultObligaciones = $stmt->fetch(PDO::FETCH_ASSOC);
                $totalObligaciones = (int)($resultObligaciones['total_obligaciones'] ?? 0);
                $total = (float)($resultObligaciones['total'] ?? 0);
                $totalAPagar = (float)($resultObligaciones['total_a_pagar'] ?? 0);
                
                // Calcular recaudado: suma de valor_pago o cuota de gestiones con ACUERDO DE PAGO
                $stmt = $db->prepare("
                    SELECT 
                        COALESCE(SUM(COALESCE(hg.valor_pago, hg.cuota, 0)), 0) as recaudado
                    FROM historial_gestion hg
                    INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                    WHERE c.base_id = ?
                    AND hg.asesor_cedula IN ($placeholdersAsesores)
                    AND hg.nivel1_tipo = 'ACUERDO DE PAGO'
                    AND (hg.valor_pago IS NOT NULL OR hg.cuota IS NOT NULL)
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $resultRecaudado = $stmt->fetch(PDO::FETCH_ASSOC);
                $recaudado = (float)($resultRecaudado['recaudado'] ?? 0);
                
                // Calcular porcentaje de eficacia basado en tipificaciones
                // Valores positivos: ACUERDO DE PAGO, YA PAGO, RECORDATORIO, VOLUNTAD DE PAGO, LOCALIZADO SIN ACUERDO, FALLECIDO
                $valoresPositivos = [
                    'YA PAGO',
                    'ACUERDO DE PAGO',
                    'RECORDATORIO',
                    'VOLUNTAD DE PAGO',
                    'LOCALIZADO SIN ACUERDO',
                    'FALLECIDO'
                ];
                
                // Contar clientes contactados (con cualquier tipificación que no sea NO CONTACTO)
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT hg.cliente_id) as total_contactados
                    FROM historial_gestion hg
                    INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                    WHERE c.base_id = ?
                    AND hg.asesor_cedula IN ($placeholdersAsesores)
                    AND hg.nivel1_tipo IS NOT NULL
                    AND hg.nivel1_tipo != ''
                    AND hg.nivel1_tipo != 'NO CONTACTO'
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $resultContactados = $stmt->fetch(PDO::FETCH_ASSOC);
                $totalContactados = (int)($resultContactados['total_contactados'] ?? 0);
                
                // Contar clientes con tipificaciones positivas
                $placeholdersValores = implode(',', array_fill(0, count($valoresPositivos), '?'));
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT hg.cliente_id) as clientes_positivos
                    FROM historial_gestion hg
                    INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                    WHERE c.base_id = ?
                    AND hg.asesor_cedula IN ($placeholdersAsesores)
                    AND hg.nivel1_tipo IN ($placeholdersValores)
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase, $valoresPositivos));
                $resultPositivos = $stmt->fetch(PDO::FETCH_ASSOC);
                $clientesPositivos = (int)($resultPositivos['clientes_positivos'] ?? 0);
                
                // Calcular porcentaje de eficacia
                $porcentajeEficacia = $totalContactados > 0 
                    ? round(($clientesPositivos / $totalContactados) * 100, 2) 
                    : 0;
                
                // Calcular desglose por clasificación (nivel 1)
                // En la BD, nivel1_tipo contiene texto como 'YA PAGO', 'ACUERDO DE PAGO', 'RECORDATORIO', etc.
                $desgloseClasificacion = [
                    'ya_pago' => 0,
                    'acuerdo_pago' => 0,
                    'recordatorio' => 0,
                    'voluntad_pago' => 0,
                    'localizado_sin_acuerdo' => 0,
                    'fallecido' => 0,
                    'no_contacto' => 0,
                ];
                
                // Valores de nivel1_tipo que corresponden a cada clasificación (textos reales en BD)
                $clasificaciones = [
                    'ya_pago' => ['YA PAGO'],
                    'acuerdo_pago' => ['ACUERDO DE PAGO'],
                    'recordatorio' => ['RECORDATORIO'],
                    'voluntad_pago' => ['VOLUNTAD DE PAGO'],
                    'localizado_sin_acuerdo' => ['LOCALIZADO SIN ACUERDO'],
                    'fallecido' => ['FALLECIDO'],
                    'no_contacto' => ['NO CONTACTO'],
                ];
                
                foreach ($clasificaciones as $clave => $valores) {
                    $placeholdersClasif = implode(',', array_fill(0, count($valores), '?'));
                    $stmt = $db->prepare("
                        SELECT COUNT(DISTINCT hg.cliente_id) as total
                        FROM historial_gestion hg
                        INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                        WHERE c.base_id = ?
                        AND hg.asesor_cedula IN ($placeholdersAsesores)
                        AND hg.nivel1_tipo IN ($placeholdersClasif)
                    ");
                    $stmt->execute(array_merge([$baseId], $asesoresBase, $valores));
                    $resultClasif = $stmt->fetch(PDO::FETCH_ASSOC);
                    $desgloseClasificacion[$clave] = (int)($resultClasif['total'] ?? 0);
                }
                
                // detalle_tareas: clientes en tareas activas de esta base; pendientes (aún no gestionados) y gestionados
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT dt.id_cliente) as en_tarea
                    FROM detalle_tareas dt
                    INNER JOIN tareas t ON t.id_tarea = dt.id_tarea
                    WHERE t.base_id = ?
                    AND t.asesor_cedula IN ($placeholdersAsesores)
                    AND t.estado IN ('pendiente', 'en progreso')
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $enTarea = (int)($stmt->fetch(PDO::FETCH_COLUMN) ?? 0);
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT dt.id_cliente) as pendientes
                    FROM detalle_tareas dt
                    INNER JOIN tareas t ON t.id_tarea = dt.id_tarea
                    WHERE t.base_id = ?
                    AND t.asesor_cedula IN ($placeholdersAsesores)
                    AND t.estado IN ('pendiente', 'en progreso')
                    AND dt.gestionado = 'no'
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $pendientesTarea = (int)($stmt->fetch(PDO::FETCH_COLUMN) ?? 0);
                $gestionadosTarea = $enTarea - $pendientesTarea;
                if ($gestionadosTarea < 0) {
                    $gestionadosTarea = 0;
                }
                
                // acuerdos: desglose por tipo (total, cuotas, comite) para gestiones de esta base
                $stmt = $db->prepare("
                    SELECT a.tipo_acuerdo, COUNT(*) as cantidad
                    FROM acuerdos a
                    INNER JOIN historial_gestion hg ON hg.id_gestion = a.id_gestion
                    INNER JOIN cliente c ON c.id_cliente = hg.cliente_id
                    WHERE c.base_id = ?
                    AND hg.asesor_cedula IN ($placeholdersAsesores)
                    GROUP BY a.tipo_acuerdo
                ");
                $stmt->execute(array_merge([$baseId], $asesoresBase));
                $filasAcuerdos = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $desgloseAcuerdos = ['total' => 0, 'cuotas' => 0, 'comite' => 0];
                foreach ($filasAcuerdos as $fila) {
                    $tipo = $fila['tipo_acuerdo'] ?? '';
                    if (isset($desgloseAcuerdos[$tipo])) {
                        $desgloseAcuerdos[$tipo] = (int)$fila['cantidad'];
                    }
                }
                
                $estadisticasBases[] = [
                    'id_base' => $baseId,
                    'nombre' => $base['nombre'],
                    'clientes_total' => (int)($base['total_clientes'] ?? 0),
                    'clientes_gestionados' => $clientesGestionados,
                    'en_tarea' => $enTarea,
                    'pendientes_tarea' => $pendientesTarea,
                    'gestionados_tarea' => $gestionadosTarea,
                    'total_obligaciones' => $totalObligaciones,
                    'total' => $total,
                    'total_a_pagar' => $totalAPagar,
                    'recaudado' => $recaudado,
                    'porcentaje_eficacia' => $porcentajeEficacia,
                    'desglose_clasificacion' => $desgloseClasificacion,
                    'desglose_acuerdos' => $desgloseAcuerdos,
                ];
            }
            
            return $estadisticasBases;
        } catch (Exception $e) {
            error_log("CoordDashboardController::obtenerEstadisticasBases - " . $e->getMessage());
            return [];
        }
    }
}
