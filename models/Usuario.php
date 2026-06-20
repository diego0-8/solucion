<?php
/**
 * Modelo Usuario - Banco W CRM
 * Acceso a la tabla usuarios.
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class Usuario {

    /** @var PDO */
    private $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Obtiene todos los usuarios.
     * Añade la clave 'nombre_completo' (igual a 'nombre') para compatibilidad con las vistas.
     * @return array<int, array>
     */
    public function obtenerTodos() {
        $stmt = $this->db->query("SELECT cedula, nombre, usuario, extension, sip_password, estado, rol, fecha_creacion, fecha_actualizacion FROM usuarios ORDER BY nombre");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $i => $row) {
            $rows[$i]['nombre_completo'] = $row['nombre'];
            $rows[$i]['extension_telefono'] = $row['extension'] ?? '';
            $rows[$i]['clave_extension'] = $row['sip_password'] ?? '';
        }
        return $rows;
    }

    /**
     * Obtiene un usuario por cédula.
     * @param string $cedula
     * @return array|null
     */
    public function obtenerPorCedula($cedula) {
        $stmt = $this->db->prepare("SELECT cedula, nombre, usuario, extension, sip_password, estado, rol, fecha_creacion, fecha_actualizacion FROM usuarios WHERE cedula = ?");
        $stmt->execute([$cedula]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['nombre_completo'] = $row['nombre'];
            $row['extension_telefono'] = $row['extension'] ?? '';
            $row['clave_extension'] = $row['sip_password'] ?? '';
        }
        return $row ?: null;
    }

    /**
     * Obtiene un usuario por nombre de usuario (columna usuario).
     * Incluye contraseña_hash solo para uso en login (verificación de contraseña).
     * @param string $usuario Nombre de usuario (login)
     * @return array|null
     */
    public function obtenerPorUsuario($usuario) {
        $stmt = $this->db->prepare("SELECT cedula, nombre, usuario, contrasena_hash, extension, sip_password, estado, rol, fecha_creacion, fecha_actualizacion FROM usuarios WHERE usuario = ? LIMIT 1");
        $stmt->execute([trim($usuario)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['nombre_completo'] = $row['nombre'];
            $row['extension_telefono'] = $row['extension'] ?? '';
            $row['clave_extension'] = $row['sip_password'] ?? '';
        }
        return $row ?: null;
    }

    /**
     * Obtiene un usuario por cédula incluyendo contraseña_hash (para verificación de contraseña).
     * @param string $cedula
     * @return array|null
     */
    public function obtenerPorCedulaConContrasena($cedula) {
        $stmt = $this->db->prepare("SELECT cedula, nombre, usuario, contrasena_hash, extension, sip_password, estado, rol, fecha_creacion, fecha_actualizacion FROM usuarios WHERE cedula = ? LIMIT 1");
        $stmt->execute([$cedula]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $row['nombre_completo'] = $row['nombre'];
            $row['extension_telefono'] = $row['extension'] ?? '';
            $row['clave_extension'] = $row['sip_password'] ?? '';
        }
        return $row ?: null;
    }
}
