<?php
/**
 * Controlador de Asignaciones - Administrador
 * Gestiona asignaciones de asesores a coordinadores
 */

require_once __DIR__ . '/../models/Asignacion.php';
require_once __DIR__ . '/../models/Usuario.php';

class AdminAsignacionController {

    /**
     * Crea una nueva asignación
     * @return array{success: bool, message: string, data?: array}
     */
    public function crear() {
        try {
            $datos = $_POST;
            
            // Aceptar asesor_cedula/coordinador_cedula (formulario) o asesor_id/coordinador_id (compatibilidad)
            $asesorCedula = trim($datos['asesor_cedula'] ?? $datos['asesor_id'] ?? '');
            $coordinadorCedula = trim($datos['coordinador_cedula'] ?? $datos['coordinador_id'] ?? '');
            
            if (empty($asesorCedula) || empty($coordinadorCedula)) {
                return ['success' => false, 'message' => 'Faltan asesor o coordinador'];
            }
            
            $asignacionModel = new Asignacion();
            
            // Verificar que el asesor y coordinador existan y estén activos
            $usuarioModel = new Usuario();
            $asesor = $usuarioModel->obtenerPorCedula($asesorCedula);
            $coordinador = $usuarioModel->obtenerPorCedula($coordinadorCedula);
            
            if (!$asesor || strtolower($asesor['rol'] ?? '') !== 'asesor') {
                return ['success' => false, 'message' => 'Asesor no válido'];
            }
            
            if (!$coordinador || strtolower($coordinador['rol'] ?? '') !== 'coordinador') {
                return ['success' => false, 'message' => 'Coordinador no válido'];
            }
            
            if (strtolower($asesor['estado'] ?? '') !== 'activo' || strtolower($coordinador['estado'] ?? '') !== 'activo') {
                return ['success' => false, 'message' => 'El asesor o coordinador no está activo'];
            }
            
            // Verificar si ya existe una asignación activa para este asesor
            $asignacionesExistentes = $asignacionModel->obtenerPorAsesor($asesorCedula);
            if (!empty($asignacionesExistentes)) {
                return ['success' => false, 'message' => 'El asesor ya tiene una asignación activa'];
            }
            
            $datosInsert = [
                'asesor_cedula' => $asesorCedula,
                'coordinador_cedula' => $coordinadorCedula,
                'estado' => 'activa',
            ];
            
            $id = $asignacionModel->crear($datosInsert);
            
            if ($id) {
                return ['success' => true, 'message' => 'Asignación creada exitosamente', 'data' => ['id' => $id]];
            }
            
            return ['success' => false, 'message' => 'Error al crear la asignación'];
            
        } catch (Exception $e) {
            error_log("AdminAsignacionController::crear - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud'];
        }
    }

    /**
     * Actualiza una asignación
     * @return array{success: bool, message: string}
     */
    public function actualizar() {
        try {
            $datos = $_POST;
            $id = $datos['id'] ?? null;
            
            if (!$id) {
                return ['success' => false, 'message' => 'ID no proporcionado'];
            }
            
            $asignacionModel = new Asignacion();
            $asignacion = $asignacionModel->obtenerPorId($id);
            
            if (!$asignacion) {
                return ['success' => false, 'message' => 'Asignación no encontrada'];
            }
            
            $datosUpdate = [];
            if (isset($datos['coordinador_id'])) {
                $datosUpdate['coordinador_cedula'] = $datos['coordinador_id'];
            }
            if (isset($datos['estado'])) {
                $datosUpdate['estado'] = $datos['estado'];
            }
            
            if (empty($datosUpdate)) {
                return ['success' => false, 'message' => 'No hay datos para actualizar'];
            }
            
            if ($asignacionModel->actualizar($id, $datosUpdate)) {
                return ['success' => true, 'message' => 'Asignación actualizada exitosamente'];
            }
            
            return ['success' => false, 'message' => 'Error al actualizar la asignación'];
            
        } catch (Exception $e) {
            error_log("AdminAsignacionController::actualizar - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud'];
        }
    }

    /**
     * Elimina una asignación
     * @return array{success: bool, message: string}
     */
    public function eliminar() {
        try {
            $id = $_POST['id'] ?? $_GET['id'] ?? null;
            
            if (!$id) {
                return ['success' => false, 'message' => 'ID no proporcionado'];
            }
            
            $asignacionModel = new Asignacion();
            
            if ($asignacionModel->eliminar($id)) {
                return ['success' => true, 'message' => 'Asignación eliminada exitosamente'];
            }
            
            return ['success' => false, 'message' => 'Error al eliminar la asignación'];
            
        } catch (Exception $e) {
            error_log("AdminAsignacionController::eliminar - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud'];
        }
    }
}