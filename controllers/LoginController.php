<?php
/**
 * Controlador de Login - Banco W CRM
 * Valida usuario (columna usuario) y contraseña contra contraseña_hash.
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../models/Usuario.php';

class LoginController {

    /** @var Usuario */
    private $usuarioModel;

    public function __construct() {
        $this->usuarioModel = new Usuario();
    }

    /**
     * Procesa el login: valida credenciales y crea la sesión.
     * Usuario = columna usuario, contraseña se verifica con password_verify contra contraseña_hash.
     *
     * @return array{success: bool, message?: string, redirect?: string}
     */
    public function login() {
        $usuario = isset($_POST['usuario']) ? trim((string) $_POST['usuario']) : '';
        $contrasena = isset($_POST['contrasena']) ? (string) $_POST['contrasena'] : '';

        if ($usuario === '' || $contrasena === '') {
            return ['success' => false, 'message' => 'Usuario y contraseña son obligatorios.'];
        }

        $row = $this->usuarioModel->obtenerPorUsuario($usuario);
        if (!$row) {
            return ['success' => false, 'message' => 'Usuario o contraseña incorrectos.'];
        }

        if (!password_verify($contrasena, $row['contrasena_hash'])) {
            return ['success' => false, 'message' => 'Usuario o contraseña incorrectos.'];
        }

        $estado = isset($row['estado']) ? trim((string) $row['estado']) : '';
        if (strtolower($estado) !== 'activo') {
            return ['success' => false, 'message' => 'Usuario inactivo. Contacte al administrador.'];
        }

        $this->crearSesion($row);

        $redirect = $this->getRedirectPorRol($row['rol']);
        return ['success' => true, 'redirect' => $redirect];
    }

    /**
     * Crea las variables de sesión usadas en las vistas.
     * El rol se guarda en minúsculas para que Navbar/Header y redirecciones funcionen igual
     * aunque en la BD esté guardado como "Administrador" o "administrador".
     */
    private function crearSesion(array $row) {
        $rol = strtolower(trim((string) ($row['rol'] ?? 'asesor')));
        $_SESSION['usuario_id']         = $row['cedula'];
        $_SESSION['usuario_cedula']     = $row['cedula'];
        $_SESSION['usuario_nombre']     = $row['nombre'];
        $_SESSION['usuario_rol']        = $rol;
        $_SESSION['usuario_extension']  = $row['extension'] ?? '';
        $_SESSION['usuario_sip_password'] = $row['sip_password'] ?? '';
    }

    /**
     * Devuelve la URL de redirección según el rol (tabla usuarios: rol y estado).
     * administrador → admin_dashboard.php (action=dashboard)
     * coordinador   → Coord_dashboard.php
     * asesor        → asesor_dashboard.php
     */
    private function getRedirectPorRol($rol) {
        $rol = strtolower(trim((string) $rol));
        switch ($rol) {
            case 'administrador':
                return 'index.php?action=dashboard';
            case 'coordinador':
                return 'index.php?action=coordinador_dashboard';
            case 'asesor':
                return 'index.php?action=asesor_dashboard';
            default:
                return 'index.php?action=dashboard';
        }
    }

    /**
     * Cierra la sesión.
     */
    public static function logout() {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
    }
}
