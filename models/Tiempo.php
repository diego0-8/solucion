<?php
/**
 * Modelo para la tabla tiempos
 */
require_once __DIR__ . '/../config.php';

class Tiempo {
    
    /**
     * Crea un nuevo registro de tiempo
     * @param array $datos Datos del tiempo
     * @return array{success: bool, id_tiempo?: int, message?: string}
     */
    public function crear(array $datos) {
        try {
            $db = getDBConnection();
            
            // Validar campos requeridos
            if (!isset($datos['asesor_cedula']) || !isset($datos['tipo_registro'])) {
                return ['success' => false, 'message' => 'Campos requeridos: asesor_cedula, tipo_registro'];
            }
            
            $stmt = $db->prepare("
                INSERT INTO tiempos (
                    asesor_cedula, fecha, tipo_registro, hora_inicio, hora_fin, estado
                ) VALUES (
                    :asesor_cedula, :fecha, :tipo_registro, :hora_inicio, :hora_fin, :estado
                )
            ");
            
            $fecha = $datos['fecha'] ?? date('Y-m-d');
            $horaInicio = $datos['hora_inicio'] ?? date('Y-m-d H:i:s');
            $horaFin = $datos['hora_fin'] ?? null;
            $estado = $datos['estado'] ?? ($horaFin ? 'finalizada' : 'activa');
            
            $stmt->execute([
                ':asesor_cedula' => $datos['asesor_cedula'],
                ':fecha' => $fecha,
                ':tipo_registro' => $datos['tipo_registro'],
                ':hora_inicio' => $horaInicio,
                ':hora_fin' => $horaFin,
                ':estado' => $estado
            ]);
            
            $idTiempo = $db->lastInsertId();
            
            return ['success' => true, 'id_tiempo' => $idTiempo];
        } catch (Exception $e) {
            error_log("Tiempo::crear - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Actualiza el registro de tiempo (finaliza una sesión activa)
     * @param int $idTiempo ID del tiempo
     * @param string|null $horaFin Hora de finalización (null = ahora)
     * @return array{success: bool, message?: string}
     */
    public function finalizar(int $idTiempo, ?string $horaFin = null) {
        try {
            $db = getDBConnection();
            
            $horaFin = $horaFin ?? date('Y-m-d H:i:s');
            
            $stmt = $db->prepare("
                UPDATE tiempos 
                SET hora_fin = :hora_fin, estado = 'finalizada'
                WHERE id_tiempo = :id_tiempo
            ");
            
            $stmt->execute([
                ':hora_fin' => $horaFin,
                ':id_tiempo' => $idTiempo
            ]);
            
            return ['success' => true];
        } catch (Exception $e) {
            error_log("Tiempo::finalizar - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Obtiene el tiempo activo de un asesor
     * @param string $asesorCedula Cédula del asesor
     * @param string $tipoRegistro Tipo de registro
     * @return array{success: bool, tiempo?: array|null, message?: string}
     */
    public function obtenerActivo(string $asesorCedula, string $tipoRegistro) {
        try {
            $db = getDBConnection();
            
            $stmt = $db->prepare("
                SELECT * FROM tiempos
                WHERE asesor_cedula = :asesor_cedula
                AND tipo_registro = :tipo_registro
                AND estado = 'activa'
                ORDER BY hora_inicio DESC
                LIMIT 1
            ");
            
            $stmt->execute([
                ':asesor_cedula' => $asesorCedula,
                ':tipo_registro' => $tipoRegistro
            ]);
            
            $tiempo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return ['success' => true, 'tiempo' => $tiempo ?: null];
        } catch (Exception $e) {
            error_log("Tiempo::obtenerActivo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'tiempo' => null];
        }
    }
    
    /**
     * Obtiene todos los tiempos de un asesor en un rango de fechas
     * @param string $asesorCedula Cédula del asesor
     * @param string|null $fechaInicio Fecha de inicio (Y-m-d)
     * @param string|null $fechaFin Fecha de fin (Y-m-d)
     * @return array{success: bool, tiempos?: array, message?: string}
     */
    public function obtenerPorAsesor(string $asesorCedula, ?string $fechaInicio = null, ?string $fechaFin = null) {
        try {
            $db = getDBConnection();
            
            $sql = "
                SELECT * FROM tiempos
                WHERE asesor_cedula = :asesor_cedula
            ";
            
            $params = [':asesor_cedula' => $asesorCedula];
            
            if ($fechaInicio) {
                $sql .= " AND fecha >= :fecha_inicio";
                $params[':fecha_inicio'] = $fechaInicio;
            }
            
            if ($fechaFin) {
                $sql .= " AND fecha <= :fecha_fin";
                $params[':fecha_fin'] = $fechaFin;
            }
            
            $sql .= " ORDER BY fecha DESC, hora_inicio DESC";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $tiempos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return ['success' => true, 'tiempos' => $tiempos];
        } catch (Exception $e) {
            error_log("Tiempo::obtenerPorAsesor - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'tiempos' => []];
        }
    }
}
