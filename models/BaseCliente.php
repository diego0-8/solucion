<?php
/**
 * Modelo BaseCliente - Bases de clientes (carga CSV)
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class BaseCliente {

    /** @var PDO */
    private $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    public function tablaExiste() {
        $stmt = $this->db->query("SHOW TABLES LIKE 'base_clientes'");
        return $stmt->rowCount() > 0;
    }

    public function obtenerTodas() {
        if (!$this->tablaExiste()) {
            return [];
        }
        $stmt = $this->db->query("SELECT id_base as id, nombre, estado, fecha_creacion, total_clientes, TOTAL_OBLIGACIONES FROM base_clientes ORDER BY nombre");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function obtenerPorId($id) {
        if (!$this->tablaExiste()) {
            return null;
        }
        $stmt = $this->db->prepare("SELECT id_base as id, nombre, estado, fecha_creacion, total_clientes, TOTAL_OBLIGACIONES FROM base_clientes WHERE id_base = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * @param string $nombre
     * @param string $estado activo|inactivo
     * @param string|null $creadoPor cedula del usuario (si la tabla tiene creado_por FK)
     */
    public function crear($nombre, $estado = 'activo', $creadoPor = null) {
        if (!$this->tablaExiste()) {
            return false;
        }
        $creadoPor = $creadoPor ?: ($_SESSION['usuario_cedula'] ?? $_SESSION['usuario_id'] ?? null);
        try {
            if ($creadoPor) {
                $stmt = $this->db->prepare("INSERT INTO base_clientes (nombre, estado, creado_por, total_clientes, TOTAL_OBLIGACIONES) VALUES (?, ?, ?, 0, 0)");
                $stmt->execute([trim($nombre), $estado, $creadoPor]);
            } else {
                $stmt = $this->db->prepare("INSERT INTO base_clientes (nombre, estado, total_clientes, TOTAL_OBLIGACIONES) VALUES (?, ?, 0, 0)");
                $stmt->execute([trim($nombre), $estado]);
            }
            return (int) $this->db->lastInsertId();
        } catch (PDOException $e) {
            if ($e->getCode() == '23000' && $creadoPor === null) {
                return false;
            }
            throw $e;
        }
    }

    public function actualizar($id, $datos) {
        if (!$this->tablaExiste()) {
            return false;
        }
        $sets = [];
        $valores = [];
        $permitidos = ['nombre', 'estado'];
        foreach ($datos as $k => $v) {
            if (in_array($k, $permitidos)) {
                $sets[] = "`$k` = ?";
                $valores[] = $v;
            }
        }
        if (empty($sets)) {
            return false;
        }
        $valores[] = $id;
        $stmt = $this->db->prepare("UPDATE base_clientes SET " . implode(", ", $sets) . " WHERE id_base = ?");
        $stmt->execute($valores);
        return $stmt->rowCount() > 0;
    }

    /**
     * Actualiza los contadores total_clientes y TOTAL_OBLIGACIONES de una base
     * @param int $baseId
     * @return bool
     */
    public function actualizarContadores($baseId) {
        if (!$this->tablaExiste()) {
            return false;
        }
        try {
            // Contar clientes únicos por base_id
            $stmt = $this->db->prepare("SELECT COUNT(DISTINCT id_cliente) AS total FROM cliente WHERE base_id = ?");
            $stmt->execute([$baseId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $totalClientes = (int) ($row['total'] ?? 0);

            // Contar obligaciones por base_id
            $stmt = $this->db->prepare("SELECT COUNT(*) AS total FROM obligaciones WHERE base_id = ?");
            $stmt->execute([$baseId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $totalObligaciones = (int) ($row['total'] ?? 0);

            // Actualizar la base
            $stmt = $this->db->prepare("UPDATE base_clientes SET total_clientes = ?, TOTAL_OBLIGACIONES = ? WHERE id_base = ?");
            return $stmt->execute([$totalClientes, $totalObligaciones, $baseId]);
        } catch (PDOException $e) {
            error_log("BaseCliente::actualizarContadores - Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Recalcula los contadores de todas las bases (útil para sincronizar datos existentes)
     * @return int Número de bases actualizadas
     */
    public function recalcularTodosLosContadores() {
        if (!$this->tablaExiste()) {
            return 0;
        }
        $bases = $this->obtenerTodas();
        $actualizadas = 0;
        foreach ($bases as $base) {
            if ($this->actualizarContadores($base['id'])) {
                $actualizadas++;
            }
        }
        return $actualizadas;
    }
}
