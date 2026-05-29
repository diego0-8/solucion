<?php
/**
 * Modelo Cliente - Banco W CRM
 * Acceso a la tabla cliente (clientes individuales)
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class Cliente {

    /** @var PDO */
    private $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Obtiene todos los clientes
     * @return array<int, array>
     */
    public function obtenerTodos() {
        $stmt = $this->db->query("SELECT 
            id_cliente as id,
            base_id,
            cedula,
            nombre,
            email,
            ciudad,
            sector,
            tel1,
            tel2,
            tel3,
            tel4,
            tel5,
            tel6,
            tel7,
            tel8,
            tel9,
            tel10,
            fecha_creacion,
            estado,
            fecha_actualizacion
        FROM cliente ORDER BY fecha_creacion DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene un cliente por ID
     * @param int|string $id
     * @return array|null
     */
    public function obtenerPorId($id) {
        $stmt = $this->db->prepare("SELECT 
            id_cliente as id,
            base_id,
            cedula,
            nombre,
            email,
            ciudad,
            sector,
            tel1,
            tel2,
            tel3,
            tel4,
            tel5,
            tel6,
            tel7,
            tel8,
            tel9,
            tel10,
            fecha_creacion,
            estado,
            fecha_actualizacion
        FROM cliente WHERE id_cliente = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Obtiene un cliente por cédula
     * @param string $cedula
     * @return array|null
     */
    public function obtenerPorCedula($cedula) {
        $stmt = $this->db->prepare("SELECT 
            id_cliente as id,
            base_id,
            cedula,
            nombre,
            email,
            ciudad,
            sector,
            tel1,
            tel2,
            tel3,
            tel4,
            tel5,
            tel6,
            tel7,
            tel8,
            tel9,
            tel10,
            fecha_creacion,
            estado,
            fecha_actualizacion
        FROM cliente WHERE cedula = ? LIMIT 1");
        $stmt->execute([$cedula]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Crea un nuevo cliente
     * @param array $datos
     * @return bool|int ID del registro creado o false si falla
     */
    public function crear(array $datos) {
        // Campos NOT NULL en la BD: nombre, email, ciudad - deben tener valor (aunque sea cadena vacía)
        $datos['nombre'] = isset($datos['nombre']) ? trim($datos['nombre']) : '';
        $datos['email'] = isset($datos['email']) ? trim($datos['email']) : '';
        $datos['ciudad'] = isset($datos['ciudad']) ? trim($datos['ciudad']) : '';
        
        $columnasPermitidas = [
            'base_id', 'cedula', 'nombre', 'email', 'ciudad', 'sector',
            'tel1', 'tel2', 'tel3', 'tel4', 'tel5',
            'tel6', 'tel7', 'tel8', 'tel9', 'tel10', 'estado'
        ];
        
        $columnasInsert = [];
        $valores = [];
        $placeholders = [];
        
        // Siempre incluir campos NOT NULL
        $camposRequeridos = ['base_id', 'cedula', 'nombre', 'email', 'ciudad'];
        foreach ($camposRequeridos as $campo) {
            if (isset($datos[$campo])) {
                $columnasInsert[] = "`$campo`";
                $valores[] = $datos[$campo];
                $placeholders[] = "?";
            }
        }
        
        // Agregar campos opcionales que vengan en $datos
        foreach ($datos as $columna => $valor) {
            if (in_array($columna, $columnasPermitidas) && !in_array($columna, $camposRequeridos)) {
                $columnasInsert[] = "`$columna`";
                $valores[] = $valor;
                $placeholders[] = "?";
            }
        }
        
        if (empty($columnasInsert)) {
            return false;
        }
        
        $sql = "INSERT INTO cliente (" . implode(", ", $columnasInsert) . ") VALUES (" . implode(", ", $placeholders) . ")";
        $stmt = $this->db->prepare($sql);
        
        if ($stmt->execute($valores)) {
            return $this->db->lastInsertId();
        }
        
        return false;
    }

    /**
     * Actualiza un cliente
     * @param int|string $id
     * @param array $datos
     * @return bool
     */
    public function actualizar($id, array $datos) {
        $columnasPermitidas = [
            'base_id', 'cedula', 'nombre', 'email', 'ciudad', 'sector',
            'tel1', 'tel2', 'tel3', 'tel4', 'tel5',
            'tel6', 'tel7', 'tel8', 'tel9', 'tel10', 'estado'
        ];
        
        $sets = [];
        $valores = [];
        
        foreach ($datos as $columna => $valor) {
            if (in_array($columna, $columnasPermitidas)) {
                $sets[] = "`$columna` = ?";
                $valores[] = $valor;
            }
        }
        
        if (empty($sets)) {
            return false;
        }
        
        $valores[] = $id;
        $sql = "UPDATE cliente SET " . implode(", ", $sets) . " WHERE id_cliente = ?";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute($valores);
    }

    /**
     * Elimina un cliente
     * @param int|string $id
     * @return bool
     */
    public function eliminar($id) {
        $stmt = $this->db->prepare("DELETE FROM cliente WHERE id_cliente = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Obtiene un cliente por cédula y base_id (único por base)
     * @param string $cedula
     * @param int $baseId
     * @return array|null
     */
    public function obtenerPorCedulaYBase($cedula, $baseId) {
        $stmt = $this->db->prepare("SELECT id_cliente as id, base_id, cedula, nombre, email, ciudad, sector, tel1, tel2, tel3, tel4, tel5, tel6, tel7, tel8, tel9, tel10, fecha_creacion, estado FROM cliente WHERE cedula = ? AND base_id = ? LIMIT 1");
        $stmt->execute([$cedula, $baseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Obtiene clientes por base_id con límite y búsqueda opcional (evita cargar millones en modales).
     * @param int $baseId
     * @param int|null $limit Máximo de filas (default 2000 desde COORD_MODAL_CLIENTES_LIMIT)
     * @param int $offset Offset para paginación
     * @param string $busqueda Búsqueda opcional por cedula, nombre o tel1
     * @return array{list: array, total: int}
     */
    public function obtenerPorBasePaginado($baseId, $limit = null, $offset = 0, $busqueda = '') {
        $limit = $limit !== null ? max(1, (int) $limit) : (defined('COORD_MODAL_CLIENTES_LIMIT') ? (int) COORD_MODAL_CLIENTES_LIMIT : 2000);
        $offset = max(0, (int) $offset);
        $term = trim((string) $busqueda);

        $where = 'WHERE base_id = ?';
        $params = [$baseId];
        if ($term !== '') {
            $where .= ' AND (cedula LIKE ? OR nombre LIKE ? OR tel1 LIKE ?)';
            $p = '%' . $term . '%';
            $params[] = $p;
            $params[] = $p;
            $params[] = $p;
        }

        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM cliente $where");
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT id_cliente as id, base_id, cedula, nombre, email, ciudad, sector, tel1, tel2, tel3, tel4, tel5, tel6, tel7, tel8, tel9, tel10, fecha_creacion, estado
                FROM cliente $where ORDER BY nombre LIMIT " . (int) $limit . " OFFSET " . (int) $offset;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return ['list' => $list, 'total' => $total];
    }

    /**
     * Obtiene clientes por base_id (sin límite; usar obtenerPorBasePaginado para bases grandes)
     * @param int $baseId
     * @return array<int, array>
     */
    public function obtenerPorBase($baseId) {
        $stmt = $this->db->prepare("SELECT 
            id_cliente as id,
            base_id,
            cedula,
            nombre,
            email,
            ciudad,
            sector,
            tel1,
            tel2,
            tel3,
            tel4,
            tel5,
            tel6,
            tel7,
            tel8,
            tel9,
            tel10,
            fecha_creacion,
            estado
        FROM cliente WHERE base_id = ? ORDER BY nombre");
        $stmt->execute([$baseId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
