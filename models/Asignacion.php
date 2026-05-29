<?php
/**
 * Modelo Asignacion - Banco W CRM
 * Acceso a la tabla asignaciones (asesor-coordinador)
 */

if (!function_exists('getDBConnection')) {
    require_once __DIR__ . '/../config.php';
}

class Asignacion {

    /** @var PDO */
    private $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Obtiene todas las asignaciones con nombres de usuarios
     * @return array<int, array>
     */
    public function obtenerTodos() {
        $sql = "SELECT 
                    a.id_asignacion as id,
                    a.asesor_cedula,
                    a.coordinador_cedula,
                    a.fecha_asignacion,
                    a.estado,
                    a.fecha_creacion,
                    asesor.nombre as asesor_nombre,
                    coordinador.nombre as coordinador_nombre
                FROM asignaciones a
                LEFT JOIN usuarios asesor ON a.asesor_cedula = asesor.cedula
                LEFT JOIN usuarios coordinador ON a.coordinador_cedula = coordinador.cedula
                ORDER BY a.fecha_asignacion DESC";
        
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Añadir campos compatibles con la vista
        foreach ($rows as $i => $row) {
            $rows[$i]['asesor_cedula'] = $row['asesor_cedula'];
            $rows[$i]['coordinador_cedula'] = $row['coordinador_cedula'];
            $rows[$i]['creador_nombre'] = 'Sistema'; // Por ahora, se puede mejorar con tabla de logs
        }
        
        return $rows;
    }

    /**
     * Obtiene una asignación por ID con nombres de usuarios
     * @param int|string $id
     * @return array|null
     */
    public function obtenerPorId($id) {
        $sql = "SELECT 
                    a.id_asignacion as id,
                    a.asesor_cedula,
                    a.coordinador_cedula,
                    a.fecha_asignacion,
                    a.estado,
                    a.fecha_creacion,
                    asesor.nombre as asesor_nombre,
                    coordinador.nombre as coordinador_nombre
                FROM asignaciones a
                LEFT JOIN usuarios asesor ON a.asesor_cedula = asesor.cedula
                LEFT JOIN usuarios coordinador ON a.coordinador_cedula = coordinador.cedula
                WHERE a.id_asignacion = ? LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $row['creador_nombre'] = 'Sistema';
        }
        
        return $row ?: null;
    }

    /**
     * Crea una nueva asignación
     * @param array $datos Debe incluir: asesor_cedula, coordinador_cedula, fecha_asignacion (opcional), estado (opcional)
     * @return bool|int ID del registro creado o false si falla
     */
    public function crear(array $datos) {
        $columnasPermitidas = ['asesor_cedula', 'coordinador_cedula', 'fecha_asignacion', 'estado'];
        $columnasInsert = [];
        $valores = [];
        $placeholders = [];
        
        foreach ($datos as $columna => $valor) {
            if (in_array($columna, $columnasPermitidas)) {
                $columnasInsert[] = "`$columna`";
                $valores[] = $valor;
                $placeholders[] = "?";
            }
        }
        
        if (empty($columnasInsert)) {
            return false;
        }
        
        // Si no viene fecha_asignacion, usar la actual
        if (!isset($datos['fecha_asignacion'])) {
            $columnasInsert[] = "`fecha_asignacion`";
            $valores[] = date('Y-m-d H:i:s');
            $placeholders[] = "?";
        }
        
        // Si no viene estado, usar 'activa'
        if (!isset($datos['estado'])) {
            $columnasInsert[] = "`estado`";
            $valores[] = 'activa';
            $placeholders[] = "?";
        }
        
        $sql = "INSERT INTO asignaciones (" . implode(", ", $columnasInsert) . ") VALUES (" . implode(", ", $placeholders) . ")";
        $stmt = $this->db->prepare($sql);
        
        if ($stmt->execute($valores)) {
            return $this->db->lastInsertId();
        }
        
        return false;
    }

    /**
     * Actualiza una asignación
     * @param int|string $id
     * @param array $datos
     * @return bool
     */
    public function actualizar($id, array $datos) {
        $columnasPermitidas = ['asesor_cedula', 'coordinador_cedula', 'fecha_asignacion', 'estado'];
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
        $sql = "UPDATE asignaciones SET " . implode(", ", $sets) . " WHERE id_asignacion = ?";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute($valores);
    }

    /**
     * Elimina una asignación
     * @param int|string $id
     * @return bool
     */
    public function eliminar($id) {
        $stmt = $this->db->prepare("DELETE FROM asignaciones WHERE id_asignacion = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Obtiene asignaciones por asesor
     * @param string $asesorCedula
     * @return array<int, array>
     */
    public function obtenerPorAsesor($asesorCedula) {
        $sql = "SELECT 
                    a.id_asignacion as id,
                    a.asesor_cedula,
                    a.coordinador_cedula,
                    a.fecha_asignacion,
                    a.estado,
                    coordinador.nombre as coordinador_nombre
                FROM asignaciones a
                LEFT JOIN usuarios coordinador ON a.coordinador_cedula = coordinador.cedula
                WHERE a.asesor_cedula = ? AND a.estado = 'activa'
                ORDER BY a.fecha_asignacion DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asesorCedula]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene asignaciones por coordinador
     * @param string $coordinadorCedula
     * @return array<int, array>
     */
    public function obtenerPorCoordinador($coordinadorCedula) {
        $sql = "SELECT 
                    a.id_asignacion as id,
                    a.asesor_cedula,
                    a.coordinador_cedula,
                    a.fecha_asignacion,
                    a.estado,
                    asesor.nombre as asesor_nombre
                FROM asignaciones a
                LEFT JOIN usuarios asesor ON a.asesor_cedula = asesor.cedula
                WHERE a.coordinador_cedula = ? AND a.estado = 'activa'
                ORDER BY a.fecha_asignacion DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$coordinadorCedula]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
