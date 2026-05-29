<?php
/**
 * Modelo Actividad - Banco W CRM
 * Acceso a la tabla actividads
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class Actividad {

    /** @var PDO */
    private $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Obtiene todos los registros
     * @return array<int, array>
     */
    public function obtenerTodos() {
        $stmt = $this->db->query("SELECT `id`, `usuario_id`, `tipo`, `descripcion`, `fecha`, `ip` FROM `actividads` ORDER BY `id` DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene un registro por ID
     * @param int|string $id
     * @return array|null
     */
    public function obtenerPorId($id) {
        $stmt = $this->db->prepare("SELECT `id`, `usuario_id`, `tipo`, `descripcion`, `fecha`, `ip` FROM `actividads` WHERE `id` = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Crea un nuevo registro
     * @param array $datos
     * @return bool|int ID del registro creado o false si falla
     */
    public function crear(array $datos) {
        // Columnas válidas de la tabla `actividads`
        $columnasPermitidas = ['usuario_id', 'tipo', 'descripcion', 'fecha', 'ip'];
        $columnasInsert = [];
        $valores = [];
        $placeholders = [];

        foreach ($datos as $columna => $valor) {
            if (in_array($columna, $columnasPermitidas, true)) {
                $columnasInsert[] = "`$columna`";
                $valores[] = $valor;
                $placeholders[] = "?";
            }
        }

        if (empty($columnasInsert)) {
            return false;
        }

        $sql = "INSERT INTO `actividads` (" . implode(", ", $columnasInsert) . ") VALUES (" . implode(", ", $placeholders) . ")";
        $stmt = $this->db->prepare($sql);

        if ($stmt->execute($valores)) {
            return $this->db->lastInsertId();
        }

        return false;
    }

    /**
     * Actualiza un registro
     * @param int|string $id
     * @param array $datos
     * @return bool
     */
    public function actualizar($id, array $datos) {
        // Columnas válidas que se pueden actualizar (no incluye `id`)
        $columnasPermitidas = ['usuario_id', 'tipo', 'descripcion', 'fecha', 'ip'];
        $sets = [];
        $valores = [];

        foreach ($datos as $columna => $valor) {
            if (in_array($columna, $columnasPermitidas, true)) {
                $sets[] = "`$columna` = ?";
                $valores[] = $valor;
            }
        }

        if (empty($sets)) {
            return false;
        }

        $valores[] = $id;
        $sql = "UPDATE `actividads` SET " . implode(", ", $sets) . " WHERE `id` = ?";
        $stmt = $this->db->prepare($sql);

        return $stmt->execute($valores);
    }

    /**
     * Elimina un registro
     * @param int|string $id
     * @return bool
     */
    public function eliminar($id) {
        $stmt = $this->db->prepare("DELETE FROM `actividads` WHERE `id` = ?");
        return $stmt->execute([$id]);
    }
}