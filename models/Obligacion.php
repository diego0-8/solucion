<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/CsvCargaHelper.php';

class Obligacion {
    private $db;

    /** Columnas persistidas en obligaciones (sin id_obligacion). */
    private static $columnas = [
        'operacion', 'base_id', 'cliente_id', 'cuenta_cliente',
        'ident_credito', 'tipo_cliente', 'dueno_cartera', 'cartera', 'compra', 'tipo_producto',
        'valor_desembolso', 'saldo_capital', 'saldo_capital_actual', 'intereses_corrientes', 'intereses_mora',
        'seguros', 'otros_conceptos', 'total_obligacion', 'valor_cuota', 'reestructurado', 'tasa',
        'cuotas_pactadas', 'cuotas_pagadas', 'cuotas_restantes',
        'fecha_desembolso', 'fecha_inicio_mora', 'fecha_vencimiento_final', 'fecha_castigo',
        'fecha_ultimo_pago', 'fecha_dias_mora', 'ciudad_origen_credito',
        'oficina', 'ano_castigo', 'concepto_mes_actual', 'estado_proceso_juridico', 'total', 'total_a_pagar',
    ];

    public function __construct() {
        $this->db = getDBConnection();
    }

    private static function prepararDatos($datos) {
        $out = [];
        foreach (self::$columnas as $col) {
            if (!array_key_exists($col, $datos)) {
                continue;
            }
            $v = $datos[$col];
            if (strpos($col, 'fecha_') === 0) {
                $out[$col] = ($v === null || $v === '') ? null : $v;
            } elseif (in_array($col, [
                'valor_desembolso', 'saldo_capital', 'saldo_capital_actual', 'intereses_corrientes', 'intereses_mora',
                'seguros', 'otros_conceptos', 'total_obligacion', 'valor_cuota', 'total', 'total_a_pagar',
            ], true)) {
                $out[$col] = CsvCargaHelper::parsearDecimalColombia($v);
            } elseif ($col === 'estado_proceso_juridico') {
                $norm = CsvCargaHelper::normalizarJudicializacion($v);
                $out[$col] = $norm ?? ($v !== null && $v !== '' ? $v : 'NO JUDICIALIZADO');
            } elseif ($col === 'ano_castigo') {
                $out[$col] = CsvCargaHelper::extraerAnioCastigo($v);
            } else {
                $out[$col] = $v === null ? '' : trim((string) $v);
            }
        }

        // Sincronizar campos legacy si faltan
        if (!isset($out['total']) && isset($out['saldo_capital'])) {
            $out['total'] = $out['saldo_capital'];
        }
        if (!isset($out['total_a_pagar']) && isset($out['total_obligacion'])) {
            $out['total_a_pagar'] = $out['total_obligacion'];
        }
        if (empty($out['oficina']) && !empty($out['compra'])) {
            $out['oficina'] = $out['compra'];
        }
        if (empty($out['concepto_mes_actual']) && !empty($out['tipo_producto'])) {
            $out['concepto_mes_actual'] = $out['tipo_producto'];
        }
        if (empty($out['ano_castigo']) && !empty($out['fecha_castigo'])) {
            $out['ano_castigo'] = CsvCargaHelper::extraerAnioCastigo($out['fecha_castigo']);
        }

        return $out;
    }

    public function crear($datos) {
        $d = self::prepararDatos($datos);
        $cols = array_keys($d);
        $placeholders = array_fill(0, count($cols), '?');
        $sql = 'INSERT INTO obligaciones (`' . implode('`, `', $cols) . '`) VALUES (' . implode(', ', $placeholders) . ')';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(array_values($d));
    }

    public function actualizarPorOperacionYBase($operacion, $baseId, $datos) {
        $d = self::prepararDatos($datos);
        unset($d['operacion'], $d['base_id']);
        if ($d === []) {
            return false;
        }
        $sets = [];
        foreach (array_keys($d) as $col) {
            $sets[] = "`$col` = ?";
        }
        $sql = 'UPDATE obligaciones SET ' . implode(', ', $sets) . ' WHERE operacion = ? AND base_id = ?';
        $params = array_values($d);
        $params[] = $operacion;
        $params[] = $baseId;
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function obtenerPorOperacionYBase($operacion, $baseId) {
        $stmt = $this->db->prepare('SELECT * FROM obligaciones WHERE operacion = ? AND base_id = ? LIMIT 1');
        $stmt->execute([$operacion, $baseId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function obtenerPorId($id) {
        $stmt = $this->db->prepare('SELECT * FROM obligaciones WHERE id_obligacion = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function listarPorCliente($clienteId) {
        return $this->obtenerPorCliente($clienteId);
    }

    public function obtenerPorCliente($clienteId) {
        $stmt = $this->db->prepare('SELECT * FROM obligaciones WHERE cliente_id = ? ORDER BY id_obligacion DESC');
        $stmt->execute([$clienteId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function tablaExiste() {
        try {
            $this->db->query('SELECT 1 FROM obligaciones LIMIT 1');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function listarPorBase($baseId) {
        $stmt = $this->db->prepare('SELECT o.*, c.nombre AS nombre_cliente, c.cedula FROM obligaciones o INNER JOIN cliente c ON c.id_cliente = o.cliente_id WHERE o.base_id = ? ORDER BY o.id_obligacion DESC');
        $stmt->execute([$baseId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
