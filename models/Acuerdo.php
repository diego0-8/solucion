<?php
/**
 * Modelo para la tabla acuerdos
 * Relacionado con historial_gestion (id_gestion)
 */
require_once __DIR__ . '/../config.php';

class Acuerdo {
    /** Máximo de cuotas en columnas `pago_n` / `fecha_pago_n` (alineado con la vista del asesor). */
    public const MAX_PAGO_COLUMNAS_ANCHO = 10;

    /**
     * Algunas instalaciones usan un esquema "ancho":
     * - `acuerdos` tiene columnas `pago_1..pago_N` y `fecha_pago_1..fecha_pago_N` (hasta MAX_PAGO_COLUMNAS_ANCHO)
     * Otras usan un esquema normalizado:
     * - detalle en tabla `acuerdo_cuotas`
     */

    /**
     * Índice máximo presente en BD para columnas `pago_N` (1..MAX_PAGO_COLUMNAS_ANCHO).
     * Si solo existen hasta `pago_5`, devuelve 5; tras migración completa, 10.
     */
    public static function maxIndiceColumnasPagoAcuerdos(): int {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }
        $cached = 5;
        try {
            $db = getDBConnection();
            $stmt = $db->query("
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'acuerdos'
                  AND column_name REGEXP '^pago_[0-9]+$'
            ");
            $max = 0;
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if (preg_match('/^pago_(\d+)$/', $row['column_name'], $m)) {
                    $max = max($max, (int) $m[1]);
                }
            }
            if ($max >= 1) {
                $cached = min($max, self::MAX_PAGO_COLUMNAS_ANCHO);
            }
        } catch (Exception $e) {
            error_log('Acuerdo::maxIndiceColumnasPagoAcuerdos - ' . $e->getMessage());
        }

        return $cached;
    }
    private function acuerdosUsaPagoColumnas(): bool {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        try {
            $db = getDBConnection();
            $stmt = $db->prepare("
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'acuerdos'
                  AND column_name = 'pago_1'
                LIMIT 1
            ");
            $stmt->execute();
            $cached = $stmt->fetchColumn() !== false;
        } catch (Exception $e) {
            $cached = false;
        }

        return (bool) $cached;
    }

    /**
     * Crea un registro en acuerdos
     * @param int $idGestion id_gestion de historial_gestion
     * @param string $tipoAcuerdo 'total' | 'cuotas' | 'comite'
     * @param array $datos Campos según tipo (valor_original, descuento_aplicado, valor_final_pago_total, numero_cuotas, valor_cuota_mensual, periodicidad, estado_aprobacion, fecha_limite_pago)
     * @return array{success: bool, id_acuerdo?: int, message?: string}
     */
    public function crear($idGestion, $tipoAcuerdo, array $datos = []) {
        try {
            $db = getDBConnection();

            $idGestion = (int) $idGestion;
            if ($idGestion <= 0) {
                return ['success' => false, 'message' => 'id_gestion inválido'];
            }

            $tipoAcuerdo = in_array($tipoAcuerdo, ['total', 'cuotas', 'comite']) ? $tipoAcuerdo : null;
            if (!$tipoAcuerdo) {
                return ['success' => false, 'message' => 'tipo_acuerdo inválido'];
            }

            $toFloat = function ($v) {
                if ($v === null || $v === '') return null;
                if (is_numeric($v)) return (float) $v;
                return (float) preg_replace('/[^\d.]/', '', (string) $v);
            };
            $valorOriginal = isset($datos['valor_original']) ? $toFloat($datos['valor_original']) : null;
            $descuentoAplicado = isset($datos['descuento_aplicado']) ? $toFloat($datos['descuento_aplicado']) : null;
            $valorFinalPagoTotal = isset($datos['valor_final_pago_total']) ? $toFloat($datos['valor_final_pago_total']) : null;
            $numeroCuotas = isset($datos['numero_cuotas']) ? (int) $datos['numero_cuotas'] : null;
            $valorCuotaMensual = isset($datos['valor_cuota_mensual']) ? $toFloat($datos['valor_cuota_mensual']) : null;
            $periodicidad = isset($datos['periodicidad']) && in_array($datos['periodicidad'], ['mensual', 'quincenal']) ? $datos['periodicidad'] : 'mensual';
            $estadoAprobacion = isset($datos['estado_aprobacion']) && in_array($datos['estado_aprobacion'], ['pendiente', 'aprobado', 'rechazado']) ? $datos['estado_aprobacion'] : 'pendiente';
            $fechaLimitePago = isset($datos['fecha_limite_pago']) && $datos['fecha_limite_pago'] !== '' ? $datos['fecha_limite_pago'] : null;

            if ($this->acuerdosUsaPagoColumnas()) {
                // Esquema ancho: guardar detalle directamente en acuerdos.
                $params = [
                    ':id_gestion' => $idGestion,
                    ':tipo_acuerdo' => $tipoAcuerdo,
                    ':valor_original' => $valorOriginal,
                    ':descuento_aplicado' => $descuentoAplicado,
                    ':valor_final_pago_total' => $valorFinalPagoTotal,
                    ':numero_cuotas' => $numeroCuotas,
                    ':periodicidad' => $periodicidad,
                    ':estado_aprobacion' => $estadoAprobacion,
                    ':fecha_limite_pago' => $fechaLimitePago,
                ];

                $pagoCols = [];
                $fechaCols = [];
                $pagoPlaceholders = [];
                $fechaPlaceholders = [];
                $hasta = self::maxIndiceColumnasPagoAcuerdos();
                for ($i = 1; $i <= $hasta; $i++) {
                    $pagoCols[] = "`pago_{$i}`";
                    $fechaCols[] = "`fecha_pago_{$i}`";
                    $pagoPlaceholders[] = ":pago_{$i}";
                    $fechaPlaceholders[] = ":fecha_pago_{$i}";
                    $params[":pago_{$i}"] = $datos["pago_{$i}"] ?? null;
                    $params[":fecha_pago_{$i}"] = $datos["fecha_pago_{$i}"] ?? null;
                }

                $stmt = $db->prepare("
                    INSERT INTO acuerdos (
                        id_gestion, tipo_acuerdo,
                        valor_original, descuento_aplicado, valor_final_pago_total,
                        numero_cuotas,
                        " . implode(', ', $pagoCols) . ",
                        " . implode(', ', $fechaCols) . ",
                        periodicidad,
                        estado_aprobacion, justificacion_comite, fecha_limite_pago
                    ) VALUES (
                        :id_gestion, :tipo_acuerdo,
                        :valor_original, :descuento_aplicado, :valor_final_pago_total,
                        :numero_cuotas,
                        " . implode(', ', $pagoPlaceholders) . ",
                        " . implode(', ', $fechaPlaceholders) . ",
                        :periodicidad,
                        :estado_aprobacion, NULL, :fecha_limite_pago
                    )
                ");

                // Nota: placeholders en dos tandas (pago_i + fecha_pago_i según columnas existentes).
                // Para evitar confusiones, además aseguramos el bind correcto:
                $stmt->execute($params);
            } else {
                // Esquema normalizado: detalle va a `acuerdo_cuotas`.
                $stmt = $db->prepare("
                    INSERT INTO acuerdos (
                        id_gestion, tipo_acuerdo,
                        valor_original, descuento_aplicado, valor_final_pago_total,
                        numero_cuotas, valor_cuota_mensual, periodicidad,
                        estado_aprobacion, justificacion_comite, fecha_limite_pago
                    ) VALUES (
                        :id_gestion, :tipo_acuerdo,
                        :valor_original, :descuento_aplicado, :valor_final_pago_total,
                        :numero_cuotas, :valor_cuota_mensual, :periodicidad,
                        :estado_aprobacion, NULL, :fecha_limite_pago
                    )
                ");

                $stmt->execute([
                    ':id_gestion' => $idGestion,
                    ':tipo_acuerdo' => $tipoAcuerdo,
                    ':valor_original' => $valorOriginal,
                    ':descuento_aplicado' => $descuentoAplicado,
                    ':valor_final_pago_total' => $valorFinalPagoTotal,
                    ':numero_cuotas' => $numeroCuotas,
                    ':valor_cuota_mensual' => $valorCuotaMensual,
                    ':periodicidad' => $periodicidad,
                    ':estado_aprobacion' => $estadoAprobacion,
                    ':fecha_limite_pago' => $fechaLimitePago,
                ]);
            }

            $idAcuerdo = (int) $db->lastInsertId();
            return ['success' => true, 'id_acuerdo' => $idAcuerdo];
        } catch (Exception $e) {
            error_log("Acuerdo::crear - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Obtiene el acuerdo asociado a una gestión (si existe)
     * @param int $idGestion
     * @return array|null
     */
    public function obtenerPorIdGestion($idGestion) {
        try {
            $db = getDBConnection();
            $stmt = $db->prepare("SELECT * FROM acuerdos WHERE id_gestion = ? LIMIT 1");
            $stmt->execute([(int) $idGestion]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (Exception $e) {
            error_log("Acuerdo::obtenerPorIdGestion - " . $e->getMessage());
            return null;
        }
    }

    /**
     * Obtiene acuerdos para varios id_gestion
     * @param int[] $idsGestion
     * @return array [ id_gestion => acuerdo ]
     */
    public function obtenerPorIdsGestion(array $idsGestion) {
        if (empty($idsGestion)) {
            return [];
        }
        try {
            $db = getDBConnection();
            $placeholders = implode(',', array_fill(0, count($idsGestion), '?'));
            $stmt = $db->prepare("SELECT * FROM acuerdos WHERE id_gestion IN ($placeholders)");
            $stmt->execute(array_map('intval', $idsGestion));
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map = [];
            foreach ($rows as $row) {
                $map[(int) $row['id_gestion']] = $row;
            }
            return $map;
        } catch (Exception $e) {
            error_log("Acuerdo::obtenerPorIdsGestion - " . $e->getMessage());
            return [];
        }
    }
}
