<?php
/**
 * Modelo para la tabla historial_gestion
 */
require_once __DIR__ . '/../config.php';

class HistorialGestion {

    /**
     * Normaliza valores decimales que pueden venir como texto (ej: "$ 1.234,56").
     * Retorna null si está vacío/no numérico.
     * @param mixed $v
     */
    private static function normalizarDecimal($v) {
        if ($v === null) return null;
        $s = trim((string) $v);
        if ($s === '') return null;
        // Quitar símbolos y espacios, conservar dígitos, punto y coma
        $s = preg_replace('/[^\d,.\-]/', '', $s);
        if ($s === '' || $s === '-' || $s === '.' || $s === ',') return null;

        // Si tiene coma y punto, asumir separador de miles y decimal según última ocurrencia
        $lastComma = strrpos($s, ',');
        $lastDot = strrpos($s, '.');
        if ($lastComma !== false && $lastDot !== false) {
            if ($lastComma > $lastDot) {
                // 1.234,56 -> 1234.56
                $s = str_replace('.', '', $s);
                $s = str_replace(',', '.', $s);
            } else {
                // 1,234.56 -> 1234.56
                $s = str_replace(',', '', $s);
            }
        } elseif ($lastComma !== false) {
            // 1234,56 -> 1234.56
            $s = str_replace(',', '.', $s);
        }

        return is_numeric($s) ? (float) $s : null;
    }

    /**
     * Normaliza fecha a Y-m-d. Acepta formatos comunes (Y-m-d, d/m/Y, etc.)
     * @param mixed $v
     */
    private static function normalizarFecha($v) {
        $s = trim((string) ($v ?? ''));
        if ($s === '') return null;
        $ts = strtotime($s);
        if ($ts === false) return null;
        return date('Y-m-d', $ts);
    }

    /**
     * Normaliza fecha/hora a Y-m-d H:i:s. Acepta formatos comunes.
     * @param mixed $v
     */
    private static function normalizarFechaHora($v) {
        $s = trim((string) ($v ?? ''));
        if ($s === '') return null;
        $ts = strtotime($s);
        if ($ts === false) return null;
        return date('Y-m-d H:i:s', $ts);
    }
    
    /**
     * Crea un nuevo registro de gestión
     * @param array $datos Datos de la gestión
     * @return array{success: bool, id_gestion?: int, message?: string}
     */
    public function crear(array $datos) {
        try {
            $db = getDBConnection();
            
            // Validar campos requeridos (según estructura real de historial_gestion: id_tarea NOT NULL)
            $camposRequeridos = ['asesor_cedula', 'id_tarea', 'cliente_id', 'obligacion_id', 'canal_contacto',
                                'nivel1_tipo', 'nivel2_tipo', 'nivel3_tipo', 'nivel4_tipo',
                                'observaciones', 'numero_contacto', 'duracion_segundos'];
            foreach ($camposRequeridos as $campo) {
                if (!array_key_exists($campo, $datos)) {
                    return ['success' => false, 'message' => "Campo requerido faltante: $campo"];
                }
            }
            $idTarea = (int) ($datos['id_tarea'] ?? 0);
            if ($idTarea <= 0) {
                return ['success' => false, 'message' => 'id_tarea es obligatorio en historial_gestion'];
            }
            $obligacionId = isset($datos['obligacion_id']) ? (int)$datos['obligacion_id'] : 0;
            if ($obligacionId <= 0) {
                return ['success' => false, 'message' => 'obligacion_id es obligatorio y debe ser mayor que 0 (FK a obligaciones).'];
            }
            $numeroContacto = isset($datos['numero_contacto']) ? substr((string)$datos['numero_contacto'], 0, 10) : '';
            
            $llamada_telefonica = isset($datos['llamada_telefonica']) && $datos['llamada_telefonica'] ? 'si' : 'no';
            $email = isset($datos['email']) && $datos['email'] ? 'si' : 'no';
            $sms = isset($datos['sms']) && $datos['sms'] ? 'si' : 'no';
            $correo_fisico = isset($datos['correo_fisico']) && $datos['correo_fisico'] ? 'si' : 'no';
            $whatsapp = isset($datos['whatsapp']) && $datos['whatsapp'] ? 'si' : 'no';
            
            $fechaCreacionNorm = self::normalizarFechaHora($datos['fecha_creacion'] ?? null);
            $usarFechaCsv = $fechaCreacionNorm !== null;

            $fechaPagoNorm = self::normalizarFecha($datos['fecha_pago'] ?? null);
            $valorPagoNorm = self::normalizarDecimal($datos['valor_pago'] ?? null);
            $cuotaNorm = self::normalizarDecimal($datos['cuota'] ?? null);
            $cuotaActualNorm = self::normalizarDecimal($datos['cuota_actual'] ?? null);

            $volverProgNorm = self::normalizarFechaHora($datos['volver_llamar_programado'] ?? null);

            $camposInsert = "asesor_cedula, id_tarea, cliente_id, obligacion_id, canal_contacto,
                    nivel1_tipo, nivel2_tipo, nivel3_tipo, nivel4_tipo,
                    observaciones, llamada_telefonica, email, sms, correo_fisico, whatsapp,
                    fecha_pago, volver_llamar_programado, valor_pago, cuota, cuota_actual, numero_contacto, duracion_segundos";
            $placeholders = ":asesor_cedula, :id_tarea, :cliente_id, :obligacion_id, :canal_contacto,
                    :nivel1_tipo, :nivel2_tipo, :nivel3_tipo, :nivel4_tipo,
                    :observaciones, :llamada_telefonica, :email, :sms, :correo_fisico, :whatsapp,
                    :fecha_pago, :volver_llamar_programado, :valor_pago, :cuota, :cuota_actual, :numero_contacto, :duracion_segundos";
            if ($usarFechaCsv) {
                $camposInsert .= ", fecha_creacion, fecha_actualizacion";
                $placeholders .= ", :fecha_creacion, :fecha_actualizacion";
            }
            $stmt = $db->prepare("INSERT INTO historial_gestion ($camposInsert) VALUES ($placeholders)");
            
            $params = [
                ':asesor_cedula' => (string) $datos['asesor_cedula'],
                ':id_tarea' => (int) $idTarea,
                ':cliente_id' => (int) $datos['cliente_id'],
                ':obligacion_id' => (int) $obligacionId,
                ':canal_contacto' => (string) ($datos['canal_contacto'] ?? ''),
                ':nivel1_tipo' => (string) ($datos['nivel1_tipo'] ?? ''),
                ':nivel2_tipo' => (string) ($datos['nivel2_tipo'] ?? ''),
                ':nivel3_tipo' => (string) ($datos['nivel3_tipo'] ?? ''),
                ':nivel4_tipo' => (string) ($datos['nivel4_tipo'] ?? ''),
                ':observaciones' => (string) ($datos['observaciones'] ?? ''),
                ':llamada_telefonica' => $llamada_telefonica,
                ':email' => $email,
                ':sms' => $sms,
                ':correo_fisico' => $correo_fisico,
                ':whatsapp' => $whatsapp,
                ':fecha_pago' => $fechaPagoNorm,
                ':volver_llamar_programado' => $volverProgNorm,
                ':valor_pago' => $valorPagoNorm,
                ':cuota' => $cuotaNorm,
                ':cuota_actual' => $cuotaActualNorm,
                ':numero_contacto' => (string) $numeroContacto,
                ':duracion_segundos' => (int) ($datos['duracion_segundos'] ?? 0)
            ];
            if ($usarFechaCsv) {
                $params[':fecha_creacion'] = $fechaCreacionNorm;
                $params[':fecha_actualizacion'] = $fechaCreacionNorm;
            }
            $stmt->execute($params);
            
            $idGestion = $db->lastInsertId();
            
            return ['success' => true, 'id_gestion' => $idGestion];
        } catch (\PDOException $e) {
            $msg = $e->getMessage();
            error_log("HistorialGestion::crear PDO - " . $msg);
            return ['success' => false, 'message' => 'Error de base de datos (historial_gestion): ' . $msg];
        } catch (\Exception $e) {
            error_log("HistorialGestion::crear - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Obtiene el historial de gestiones de un cliente (limitado para rendimiento con muchos registros).
     * @param int $clienteId ID del cliente
     * @param string|null $asesorCedula Cédula del asesor (opcional, para filtrar)
     * @param int|null $limit Máximo de filas (default HISTORIAL_GESTION_LIMIT_POR_CLIENTE o 200)
     * @return array{success: bool, gestiones?: array, message?: string}
     */
    public function obtenerPorCliente(int $clienteId, ?string $asesorCedula = null, ?int $limit = null) {
        try {
            $db = getDBConnection();
            $limit = $limit !== null ? max(1, (int) $limit) : (defined('HISTORIAL_GESTION_LIMIT_POR_CLIENTE') ? (int) HISTORIAL_GESTION_LIMIT_POR_CLIENTE : 200);

            $sql = "
                SELECT 
                    hg.*,
                    u.nombre as asesor_nombre,
                    c.cedula as cliente_cedula,
                    c.nombre as cliente_nombre,
                    c.base_id as cliente_base_id,
                    bc.nombre as nombre_base,
                    o.operacion as obligacion_operacion,
                    o.total as obligacion_total
                FROM historial_gestion hg
                LEFT JOIN usuarios u ON hg.asesor_cedula = u.cedula
                LEFT JOIN cliente c ON hg.cliente_id = c.id_cliente
                LEFT JOIN base_clientes bc ON bc.id_base = c.base_id
                LEFT JOIN obligaciones o ON hg.obligacion_id = o.id_obligacion
                WHERE hg.cliente_id = :cliente_id
            ";
            $params = [':cliente_id' => $clienteId];

            if ($asesorCedula) {
                $sql .= " AND hg.asesor_cedula = :asesor_cedula";
                $params[':asesor_cedula'] = $asesorCedula;
            }

            $sql .= " ORDER BY hg.fecha_creacion DESC LIMIT " . (int) $limit;

            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            $gestiones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return ['success' => true, 'gestiones' => $gestiones];
        } catch (\Exception $e) {
            error_log("HistorialGestion::obtenerPorCliente - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => []];
        }
    }
    
    /**
     * Obtiene el historial de gestiones de todos los clientes con la misma cédula (limitado).
     * @param string $cedula Cédula del cliente
     * @param string|null $asesorCedula Opcional
     * @param int|null $limit Máximo de filas (default HISTORIAL_GESTION_LIMIT_POR_CLIENTE o 200)
     * @return array{success: bool, gestiones?: array, message?: string}
     */
    public function obtenerPorCedula(string $cedula, ?string $asesorCedula = null, ?int $limit = null) {
        try {
            $db = getDBConnection();
            $limit = $limit !== null ? max(1, (int) $limit) : (defined('HISTORIAL_GESTION_LIMIT_POR_CLIENTE') ? (int) HISTORIAL_GESTION_LIMIT_POR_CLIENTE : 200);

            $stmt = $db->prepare("SELECT id_cliente FROM cliente WHERE cedula = ?");
            $stmt->execute([trim($cedula)]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (empty($ids)) {
                return ['success' => true, 'gestiones' => []];
            }
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $sql = "
                SELECT 
                    hg.*,
                    u.nombre as asesor_nombre,
                    c.cedula as cliente_cedula,
                    c.nombre as cliente_nombre,
                    c.base_id as cliente_base_id,
                    bc.nombre as nombre_base,
                    o.operacion as obligacion_operacion,
                    o.total as obligacion_total
                FROM historial_gestion hg
                LEFT JOIN usuarios u ON hg.asesor_cedula = u.cedula
                LEFT JOIN cliente c ON hg.cliente_id = c.id_cliente
                LEFT JOIN base_clientes bc ON bc.id_base = c.base_id
                LEFT JOIN obligaciones o ON hg.obligacion_id = o.id_obligacion
                WHERE hg.cliente_id IN ($placeholders)
            ";
            $params = $ids;
            if ($asesorCedula) {
                $sql .= " AND hg.asesor_cedula = ?";
                $params[] = $asesorCedula;
            }
            $sql .= " ORDER BY hg.fecha_creacion DESC LIMIT " . (int) $limit;
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $gestiones = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ['success' => true, 'gestiones' => $gestiones];
        } catch (\Exception $e) {
            error_log("HistorialGestion::obtenerPorCedula - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => []];
        }
    }
    
    /**
     * Obtiene el historial de gestiones de un asesor
     * @param string $asesorCedula Cédula del asesor
     * @param int|null $limit Límite de resultados
     * @return array{success: bool, gestiones?: array, message?: string}
     */
    public function obtenerPorAsesor(string $asesorCedula, ?int $limit = null) {
        try {
            $db = getDBConnection();
            
            $sql = "
                SELECT 
                    hg.*,
                    u.nombre as asesor_nombre,
                    c.cedula as cliente_cedula,
                    c.nombre as cliente_nombre,
                    c.base_id as cliente_base_id,
                    bc.nombre as nombre_base,
                    o.operacion as obligacion_operacion
                FROM historial_gestion hg
                LEFT JOIN usuarios u ON hg.asesor_cedula = u.cedula
                LEFT JOIN cliente c ON hg.cliente_id = c.id_cliente
                LEFT JOIN base_clientes bc ON bc.id_base = c.base_id
                LEFT JOIN obligaciones o ON hg.obligacion_id = o.id_obligacion
                WHERE hg.asesor_cedula = :asesor_cedula
                ORDER BY hg.fecha_creacion DESC
            ";
            
            if ($limit) {
                $sql .= " LIMIT :limit";
            }
            
            $stmt = $db->prepare($sql);
            $stmt->bindValue(':asesor_cedula', $asesorCedula);
            if ($limit) {
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            }
            $stmt->execute();
            
            $gestiones = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return ['success' => true, 'gestiones' => $gestiones];
        } catch (\Exception $e) {
            error_log("HistorialGestion::obtenerPorAsesor - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => []];
        }
    }

    /**
     * Lista gestiones del asesor con filtros, búsqueda y paginación (para pestaña Gestiones del dashboard)
     * @param string $asesorCedula
     * @param array $filtros ['canal_contacto' => ?, 'nivel1_tipo' => ?, 'nivel2_tipo' => ?]
     * @param string $busqueda Búsqueda por cédula, obligación/operación, teléfono, nombre
     * @param int $pagina 1-based
     * @param int $porPagina 6
     * @return array{success: bool, gestiones: array, total: int, pagina: int, por_pagina: int, message?: string}
     */
    public function listarPorAsesorConFiltros(string $asesorCedula, array $filtros = [], string $busqueda = '', int $pagina = 1, int $porPagina = 6) {
        try {
            $db = getDBConnection();
            $porPagina = max(1, min(100, (int) $porPagina));
            $offset = max(0, ((int) $pagina - 1) * $porPagina);

            $sql = "
                SELECT 
                    hg.*,
                    u.nombre as asesor_nombre,
                    c.cedula as cliente_cedula,
                    c.nombre as cliente_nombre,
                    c.base_id as cliente_base_id,
                    bc.nombre as nombre_base,
                    o.operacion as obligacion_operacion,
                    o.total as obligacion_total
                FROM historial_gestion hg
                LEFT JOIN usuarios u ON hg.asesor_cedula = u.cedula
                INNER JOIN cliente c ON hg.cliente_id = c.id_cliente
                INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
                INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                    AND aba.asesor_cedula = :asesor_cedula AND aba.estado = 'activa'
                LEFT JOIN obligaciones o ON hg.obligacion_id = o.id_obligacion
                WHERE hg.asesor_cedula = :asesor_cedula
            ";
            $params = [':asesor_cedula' => $asesorCedula];

            if (!empty($filtros['canal_contacto'])) {
                $sql .= " AND hg.canal_contacto = :canal_contacto";
                $params[':canal_contacto'] = $filtros['canal_contacto'];
            }
            if (!empty($filtros['nivel1_tipo'])) {
                $sql .= " AND hg.nivel1_tipo = :nivel1_tipo";
                $params[':nivel1_tipo'] = $filtros['nivel1_tipo'];
            }
            if (!empty($filtros['nivel2_tipo'])) {
                $sql .= " AND hg.nivel2_tipo = :nivel2_tipo";
                $params[':nivel2_tipo'] = $filtros['nivel2_tipo'];
            }

            $term = trim($busqueda);
            if ($term !== '') {
                $sql .= " AND (
                    c.cedula LIKE :busqueda OR
                    c.nombre LIKE :busqueda OR
                    o.operacion LIKE :busqueda OR
                    hg.numero_contacto LIKE :busqueda
                )";
                $params[':busqueda'] = '%' . $term . '%';
            }

            $sqlCount = "SELECT COUNT(*)
                FROM historial_gestion hg
                INNER JOIN cliente c ON hg.cliente_id = c.id_cliente
                INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
                INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                    AND aba.asesor_cedula = :asesor_cedula AND aba.estado = 'activa'
                LEFT JOIN obligaciones o ON hg.obligacion_id = o.id_obligacion
                WHERE hg.asesor_cedula = :asesor_cedula";
            $paramsCount = [':asesor_cedula' => $asesorCedula];
            if (!empty($filtros['canal_contacto'])) {
                $sqlCount .= " AND hg.canal_contacto = :canal_contacto";
                $paramsCount[':canal_contacto'] = $filtros['canal_contacto'];
            }
            if (!empty($filtros['nivel1_tipo'])) {
                $sqlCount .= " AND hg.nivel1_tipo = :nivel1_tipo";
                $paramsCount[':nivel1_tipo'] = $filtros['nivel1_tipo'];
            }
            if (!empty($filtros['nivel2_tipo'])) {
                $sqlCount .= " AND hg.nivel2_tipo = :nivel2_tipo";
                $paramsCount[':nivel2_tipo'] = $filtros['nivel2_tipo'];
            }
            if ($term !== '') {
                $sqlCount .= " AND ( c.cedula LIKE :busqueda OR c.nombre LIKE :busqueda OR o.operacion LIKE :busqueda OR hg.numero_contacto LIKE :busqueda )";
                $paramsCount[':busqueda'] = '%' . $term . '%';
            }

            $stmtCount = $db->prepare($sqlCount);
            $stmtCount->execute($paramsCount);
            $total = (int) $stmtCount->fetchColumn();

            $sql .= " ORDER BY hg.fecha_creacion DESC LIMIT :limit OFFSET :offset";
            $params[':limit'] = $porPagina;
            $params[':offset'] = $offset;

            $stmt = $db->prepare($sql);
            foreach ($params as $k => $v) {
                if ($k === ':limit') {
                    $stmt->bindValue($k, $v, PDO::PARAM_INT);
                } elseif ($k === ':offset') {
                    $stmt->bindValue($k, $v, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($k, $v);
                }
            }
            $stmt->execute();
            $gestiones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'gestiones' => $gestiones,
                'total' => $total,
                'pagina' => $pagina,
                'por_pagina' => $porPagina
            ];
        } catch (\Exception $e) {
            error_log("HistorialGestion::listarPorAsesorConFiltros - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => [], 'total' => 0, 'pagina' => 1, 'por_pagina' => $porPagina ?? 6];
        }
    }
}
