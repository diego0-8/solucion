<?php
/**
 * Modelo Tarea - Banco W CRM
 * Acceso a la tabla tareas (asignación de clientes a asesores)
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class Tarea {
    
    /** @var PDO */
    private $db;
    
    public function __construct() {
        $this->db = getDBConnection();
    }
    
    /**
     * Verifica si la tabla tareas existe
     * @return bool
     */
    public function tablaExiste() {
        try {
            $stmt = $this->db->query("SHOW TABLES LIKE 'tareas'");
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Crea una nueva tarea
     * @param array $datos Debe incluir: coordinador_cedula, asesor_cedula, base_id, clientes_asignados (JSON), obligaciones_asignadas (JSON opcional), nombre_tarea (opcional)
     * @return int|false ID de la tarea creada o false si falla
     */
    public function crear(array $datos) {
        try {
            $nombreTarea = isset($datos['nombre_tarea']) && trim((string)$datos['nombre_tarea']) !== ''
                ? substr(trim((string)$datos['nombre_tarea']), 0, 100)
                : null;
            if ($nombreTarea === null) {
                $nombreTarea = 'Tarea ' . ($datos['asesor_cedula'] ?? '') . ' - ' . date('Y-m-d H:i');
            }
            $sql = "INSERT INTO tareas (
                nombre_tarea,
                coordinador_cedula, 
                asesor_cedula, 
                base_id, 
                estado, 
                clientes_asignados, 
                obligaciones_asignadas,
                fecha_creacion
            ) VALUES (?, ?, ?, ?, 'pendiente', ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $clientesAsignados = isset($datos['clientes_asignados']) ? 
                (is_array($datos['clientes_asignados']) ? json_encode($datos['clientes_asignados']) : $datos['clientes_asignados']) : 
                null;
            $obligacionesAsignadas = isset($datos['obligaciones_asignadas']) ? 
                (is_array($datos['obligaciones_asignadas']) ? json_encode($datos['obligaciones_asignadas']) : $datos['obligaciones_asignadas']) : 
                null;
            
            if ($stmt->execute([
                $nombreTarea,
                $datos['coordinador_cedula'],
                $datos['asesor_cedula'],
                $datos['base_id'],
                $clientesAsignados,
                $obligacionesAsignadas
            ])) {
                return (int)$this->db->lastInsertId();
            }
            return false;
        } catch (Exception $e) {
            error_log("Tarea::crear - " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Obtiene todas las tareas de un coordinador
     * @param string $coordinadorCedula
     * @return array
     */
    public function obtenerPorCoordinador($coordinadorCedula) {
        try {
            $sql = "SELECT 
                t.id_tarea,
                t.nombre_tarea,
                t.coordinador_cedula,
                t.asesor_cedula,
                t.base_id,
                t.estado,
                t.clientes_asignados,
                t.obligaciones_asignadas,
                t.fecha_creacion,
                t.fecha_completa,
                bc.nombre as base_nombre,
                u_asesor.nombre as asesor_nombre,
                u_coord.nombre as coordinador_nombre
            FROM tareas t
            LEFT JOIN base_clientes bc ON t.base_id = bc.id_base
            LEFT JOIN usuarios u_asesor ON t.asesor_cedula = u_asesor.cedula
            LEFT JOIN usuarios u_coord ON t.coordinador_cedula = u_coord.cedula
            WHERE t.coordinador_cedula = ?
            ORDER BY t.fecha_creacion DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$coordinadorCedula]);
            $tareas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Decodificar JSON de clientes y obligaciones
            foreach ($tareas as &$tarea) {
                if ($tarea['clientes_asignados']) {
                    $tarea['clientes_asignados'] = json_decode($tarea['clientes_asignados'], true) ?: [];
                } else {
                    $tarea['clientes_asignados'] = [];
                }
                if ($tarea['obligaciones_asignadas']) {
                    $tarea['obligaciones_asignadas'] = json_decode($tarea['obligaciones_asignadas'], true) ?: [];
                } else {
                    $tarea['obligaciones_asignadas'] = [];
                }
            }
            
            return $tareas;
        } catch (Exception $e) {
            error_log("Tarea::obtenerPorCoordinador - " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Obtiene todas las tareas de un asesor
     * @param string $asesorCedula
     * @return array
     */
    public function obtenerPorAsesor($asesorCedula) {
        try {
            $sql = "SELECT 
                t.id_tarea,
                t.nombre_tarea,
                t.coordinador_cedula,
                t.asesor_cedula,
                t.base_id,
                t.estado,
                t.clientes_asignados,
                t.obligaciones_asignadas,
                t.fecha_creacion,
                t.fecha_completa,
                bc.nombre as base_nombre,
                u_asesor.nombre as asesor_nombre,
                u_coord.nombre as coordinador_nombre
            FROM tareas t
            INNER JOIN base_clientes bc ON t.base_id = bc.id_base AND bc.estado = 'activo'
            LEFT JOIN usuarios u_asesor ON t.asesor_cedula = u_asesor.cedula
            LEFT JOIN usuarios u_coord ON t.coordinador_cedula = u_coord.cedula
            WHERE t.asesor_cedula = ?
            AND t.estado IN ('pendiente', 'en progreso')
            ORDER BY t.fecha_creacion DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asesorCedula]);
            $tareas = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Decodificar JSON de clientes y obligaciones
            foreach ($tareas as &$tarea) {
                if ($tarea['clientes_asignados']) {
                    $tarea['clientes_asignados'] = json_decode($tarea['clientes_asignados'], true) ?: [];
                } else {
                    $tarea['clientes_asignados'] = [];
                }
                if ($tarea['obligaciones_asignadas']) {
                    $tarea['obligaciones_asignadas'] = json_decode($tarea['obligaciones_asignadas'], true) ?: [];
                } else {
                    $tarea['obligaciones_asignadas'] = [];
                }
            }
            
            return $tareas;
        } catch (Exception $e) {
            error_log("Tarea::obtenerPorAsesor - " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Obtiene clientes que ya tienen tareas pendientes o en progreso para una base específica
     * @param int $baseId
     * @return array Array de IDs de clientes ya asignados
     */
    public function obtenerClientesAsignados($baseId) {
        try {
            $sql = "SELECT clientes_asignados 
            FROM tareas 
            WHERE base_id = ? 
            AND estado IN ('pendiente', 'en progreso')
            AND clientes_asignados IS NOT NULL";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$baseId]);
            $resultados = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $clientesAsignados = [];
            foreach ($resultados as $json) {
                $clientes = json_decode($json, true);
                if (is_array($clientes)) {
                    $clientesAsignados = array_merge($clientesAsignados, $clientes);
                }
            }
            
            return array_unique($clientesAsignados);
        } catch (Exception $e) {
            error_log("Tarea::obtenerClientesAsignados - " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Inserta filas en detalle_tareas (una por cada cliente asignado) con gestionado='no'.
     * Se llama después de crear una tarea para que la pestaña Clientes del asesor pueda filtrar por no gestionados.
     * @param int $idTarea
     * @param array $idClientes Array de id_cliente (int)
     * @return bool
     */
    public function insertarDetalleTareas($idTarea, array $idClientes) {
        if (empty($idClientes)) {
            return true;
        }
        try {
            $idTarea = (int) $idTarea;
            $stmt = $this->db->prepare("INSERT INTO detalle_tareas (id_tarea, id_cliente, gestionado) VALUES (?, ?, 'no')");
            foreach ($idClientes as $idCliente) {
                $stmt->execute([$idTarea, (int) $idCliente]);
            }
            return true;
        } catch (Exception $e) {
            error_log("Tarea::insertarDetalleTareas - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Marca en detalle_tareas que el cliente fue gestionado para esa tarea (gestionado='si').
     * @param int $idTarea
     * @param int $idCliente
     * @return bool
     */
    public function marcarClienteGestionado($idTarea, $idCliente) {
        try {
            $stmt = $this->db->prepare("UPDATE detalle_tareas SET gestionado = 'si' WHERE id_tarea = ? AND id_cliente = ?");
            return $stmt->execute([(int) $idTarea, (int) $idCliente]);
        } catch (Exception $e) {
            error_log("Tarea::marcarClienteGestionado - " . $e->getMessage());
            return false;
        }
    }

    /**
     * Actualiza el estado de una tarea
     * @param int $idTarea
     * @param string $estado
     * @return bool
     */
    public function actualizarEstado($idTarea, $estado) {
        try {
            $sql = "UPDATE tareas SET estado = ?";
            if ($estado === 'completa') {
                $sql .= ", fecha_completa = NOW()";
            }
            $sql .= " WHERE id_tarea = ?";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$estado, $idTarea]);
        } catch (Exception $e) {
            error_log("Tarea::actualizarEstado - " . $e->getMessage());
            return false;
        }
    }
}
