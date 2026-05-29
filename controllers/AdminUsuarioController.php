<?php
/**
 * Controlador de Usuarios - Administrador
 * Gestiona creación, edición, eliminación y cambio de estado de usuarios
 */

require_once __DIR__ . '/../models/Usuario.php';

class AdminUsuarioController {

    /**
     * Crea un nuevo usuario
     * @return array{success: bool, message: string, data?: array}
     */
    public function crear() {
        try {
            $datos = $_POST;
            
            // Validaciones
            if (empty($datos['cedula']) || empty($datos['nombre_completo']) || empty($datos['usuario']) || empty($datos['contrasena'])) {
                return ['success' => false, 'message' => 'Faltan campos requeridos'];
            }
            
            $usuarioModel = new Usuario();
            
            // Verificar si ya existe usuario con esa cédula
            if ($usuarioModel->obtenerPorCedula($datos['cedula'])) {
                return ['success' => false, 'message' => 'Ya existe un usuario con esa cédula'];
            }
            
            // Verificar si ya existe usuario con ese nombre de usuario
            if ($usuarioModel->obtenerPorUsuario($datos['usuario'])) {
                return ['success' => false, 'message' => 'Ya existe un usuario con ese nombre de usuario'];
            }
            
            // Normalizar estado: convertir 'activo'/'inactivo' a 'Activo'/'Inactivo' (como está en la BD)
            $estado = $datos['estado'] ?? 'activo';
            if (strtolower($estado) === 'activo') {
                $estado = 'Activo';
            } elseif (strtolower($estado) === 'inactivo') {
                $estado = 'Inactivo';
            }
            
            // Preparar datos para insertar (coincidiendo exactamente con la estructura de la BD)
            $datosInsert = [
                'cedula' => trim($datos['cedula']),
                'nombre' => trim($datos['nombre_completo']),
                'usuario' => trim($datos['usuario']),
                'contrasena_hash' => password_hash($datos['contrasena'], PASSWORD_DEFAULT),
                'rol' => $datos['rol'] ?? 'asesor',
                'estado' => $estado, // 'Activo' o 'Inactivo' con mayúscula
                'extension' => ($datos['rol'] === 'asesor' && !empty($datos['extension'])) ? trim($datos['extension']) : '', // Cadena vacía si no es asesor (NOT NULL)
                'sip_password' => ($datos['rol'] === 'asesor' && !empty($datos['sip_password'])) ? trim($datos['sip_password']) : '', // Cadena vacía si no es asesor (NOT NULL)
            ];
            
            // Insertar usando PDO directamente
            $db = getDBConnection();
            $columnas = array_keys($datosInsert);
            $placeholders = array_fill(0, count($columnas), '?');
            $sql = "INSERT INTO usuarios (" . implode(", ", array_map(function($c) { return "`$c`"; }, $columnas)) . ") VALUES (" . implode(", ", $placeholders) . ")";
            $stmt = $db->prepare($sql);
            
            if ($stmt->execute(array_values($datosInsert))) {
                return ['success' => true, 'message' => 'Usuario creado exitosamente', 'data' => ['cedula' => $datosInsert['cedula']]];
            }
            
            // Si falla, obtener el error de MySQL
            $errorInfo = $stmt->errorInfo();
            $mensajeError = 'Error al crear el usuario';
            if (!empty($errorInfo[2])) {
                $mensajeError .= ': ' . $errorInfo[2];
                error_log("AdminUsuarioController::crear - SQL Error: " . $errorInfo[2]);
            }
            
            return ['success' => false, 'message' => $mensajeError];
            
        } catch (PDOException $e) {
            error_log("AdminUsuarioController::crear - PDO Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()];
        } catch (Exception $e) {
            error_log("AdminUsuarioController::crear - Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud: ' . $e->getMessage()];
        }
    }

    /**
     * Actualiza un usuario
     * @return array{success: bool, message: string}
     */
    public function actualizar() {
        try {
            $datos = $_POST;
            $cedula = $datos['cedula'] ?? null;
            
            if (!$cedula) {
                return ['success' => false, 'message' => 'Cédula no proporcionada'];
            }
            
            $usuarioModel = new Usuario();
            $usuario = $usuarioModel->obtenerPorCedula($cedula);
            
            if (!$usuario) {
                return ['success' => false, 'message' => 'Usuario no encontrado'];
            }
            
            // Preparar datos para actualizar
            $datosUpdate = [];
            if (!empty($datos['nombre_completo'])) {
                $datosUpdate['nombre'] = trim($datos['nombre_completo']);
            }
            if (!empty($datos['usuario'])) {
                // Verificar que el nuevo usuario no esté en uso por otro
                $otroUsuario = $usuarioModel->obtenerPorUsuario($datos['usuario']);
                if ($otroUsuario && $otroUsuario['cedula'] !== $cedula) {
                    return ['success' => false, 'message' => 'El nombre de usuario ya está en uso'];
                }
                $datosUpdate['usuario'] = trim($datos['usuario']);
            }
            if (!empty($datos['contrasena'])) {
                $datosUpdate['contrasena_hash'] = password_hash($datos['contrasena'], PASSWORD_DEFAULT);
            }
            // Determinar el rol a usar (el nuevo si se está cambiando, o el actual)
            $rolActual = strtolower($usuario['rol'] ?? 'asesor');
            $rolNuevo = isset($datos['rol']) ? strtolower($datos['rol']) : $rolActual;
            
            if (isset($datos['rol'])) {
                $datosUpdate['rol'] = $datos['rol'];
            }
            if (isset($datos['estado'])) {
                // Normalizar estado a formato de BD
                $estado = $datos['estado'];
                if (strtolower($estado) === 'activo') {
                    $estado = 'Activo';
                } elseif (strtolower($estado) === 'inactivo') {
                    $estado = 'Inactivo';
                }
                $datosUpdate['estado'] = $estado;
            }
            if (isset($datos['extension'])) {
                // Usar el rol nuevo si se está cambiando, o el actual si no
                $datosUpdate['extension'] = ($rolNuevo === 'asesor') ? trim($datos['extension']) : '';
            }
            if (isset($datos['sip_password'])) {
                // Usar el rol nuevo si se está cambiando, o el actual si no
                $datosUpdate['sip_password'] = ($rolNuevo === 'asesor') ? trim($datos['sip_password']) : '';
            }
            
            if (empty($datosUpdate)) {
                return ['success' => false, 'message' => 'No hay datos para actualizar'];
            }
            
            $db = getDBConnection();
            $sets = [];
            $valores = [];
            foreach ($datosUpdate as $col => $val) {
                $sets[] = "`$col` = ?";
                $valores[] = $val;
            }
            $valores[] = $cedula;
            
            $sql = "UPDATE usuarios SET " . implode(", ", $sets) . " WHERE cedula = ?";
            $stmt = $db->prepare($sql);
            
            if ($stmt->execute($valores)) {
                return ['success' => true, 'message' => 'Usuario actualizado exitosamente'];
            }
            
            return ['success' => false, 'message' => 'Error al actualizar el usuario'];
            
        } catch (Exception $e) {
            error_log("AdminUsuarioController::actualizar - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud'];
        }
    }

    /**
     * Cambia el estado de un usuario
     * @return array{success: bool, message: string}
     */
    public function cambiarEstado() {
        try {
            $cedula = $_POST['cedula'] ?? $_GET['cedula'] ?? null;
            $nuevoEstado = $_POST['estado'] ?? $_GET['estado'] ?? null;
            
            if (!$cedula || !$nuevoEstado) {
                return ['success' => false, 'message' => 'Datos incompletos'];
            }
            
            // No permitir deshabilitar el propio usuario
            $cedulaSesion = $_SESSION['usuario_cedula'] ?? $_SESSION['usuario_id'] ?? null;
            if ($cedulaSesion && $cedula == $cedulaSesion && strtolower($nuevoEstado) === 'inactivo') {
                return ['success' => false, 'message' => 'No puede deshabilitar su propio usuario'];
            }
            
            // Normalizar estado a formato de BD: 'Activo' o 'Inactivo'
            $estadoNormalizado = null;
            if (strtolower($nuevoEstado) === 'activo') {
                $estadoNormalizado = 'Activo';
            } elseif (strtolower($nuevoEstado) === 'inactivo') {
                $estadoNormalizado = 'Inactivo';
            } else {
                return ['success' => false, 'message' => 'Estado inválido. Debe ser "activo" o "inactivo"'];
            }
            
            $db = getDBConnection();
            $stmt = $db->prepare("UPDATE usuarios SET estado = ? WHERE cedula = ?");
            
            if ($stmt->execute([$estadoNormalizado, $cedula])) {
                return ['success' => true, 'message' => "Usuario $estadoNormalizado correctamente"];
            }
            
            $errorInfo = $stmt->errorInfo();
            $mensajeError = 'Error al cambiar el estado';
            if (!empty($errorInfo[2])) {
                $mensajeError .= ': ' . $errorInfo[2];
            }
            
            return ['success' => false, 'message' => $mensajeError];
            
        } catch (\Exception $e) {
            error_log("AdminUsuarioController::cambiarEstado - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud: ' . $e->getMessage()];
        }
    }

    /**
     * Elimina un usuario
     * @return array{success: bool, message: string}
     */
    public function eliminar() {
        try {
            $cedula = $_POST['cedula'] ?? $_GET['cedula'] ?? null;
            
            if (!$cedula) {
                return ['success' => false, 'message' => 'Cédula no proporcionada'];
            }
            
            // No permitir auto-eliminación
            if ($cedula === ($_SESSION['usuario_cedula'] ?? null)) {
                return ['success' => false, 'message' => 'No puedes eliminar tu propio usuario'];
            }
            
            $db = getDBConnection();
            $stmt = $db->prepare("DELETE FROM usuarios WHERE cedula = ?");
            
            if ($stmt->execute([$cedula])) {
                return ['success' => true, 'message' => 'Usuario eliminado exitosamente'];
            }
            
            return ['success' => false, 'message' => 'Error al eliminar el usuario'];
            
        } catch (Exception $e) {
            error_log("AdminUsuarioController::eliminar - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al procesar la solicitud'];
        }
    }

    /**
     * Obtiene los datos de un usuario por cédula (para edición en dashboard)
     * @return array{success: bool, message: string, usuario?: array}
     */
    public function obtener() {
        try {
            $cedula = $_GET['cedula'] ?? $_POST['cedula'] ?? null;
            
            if (!$cedula) {
                return ['success' => false, 'message' => 'Cédula no proporcionada'];
            }
            
            $usuarioModel = new Usuario();
            $usuario = $usuarioModel->obtenerPorCedula($cedula);
            
            if (!$usuario) {
                return ['success' => false, 'message' => 'Usuario no encontrado'];
            }
            
            // Normalizar algunos campos para el frontend
            // Mantener 'nombre_completo' ya generado por el modelo
            $usuario['estado'] = strtolower($usuario['estado'] ?? 'activo'); // 'Activo'/'Inactivo' -> 'activo'/'inactivo'
            $usuario['rol'] = strtolower($usuario['rol'] ?? 'asesor');
            
            return [
                'success' => true,
                'message' => 'Usuario obtenido correctamente',
                'usuario' => $usuario,
            ];
        } catch (Exception $e) {
            error_log("AdminUsuarioController::obtener - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al obtener el usuario'];
        }
    }
}