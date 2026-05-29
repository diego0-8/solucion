<?php
/**
 * Modelo para el detalle de cuotas de acuerdos a largo plazo.
 */
require_once __DIR__ . '/../config.php';

class AcuerdoCuota {

    /**
     * Inserta varias cuotas asociadas a un acuerdo.
     * @param int $idAcuerdo
     * @param int $idGestion
     * @param array<int, array<string, mixed>> $cuotas
     * @return array{success: bool, inserted?: int, message?: string}
     */
    public function crearMultiples($idAcuerdo, $idGestion, array $cuotas) {
        try {
            $db = getDBConnection();
            $idAcuerdo = (int) $idAcuerdo;
            $idGestion = (int) $idGestion;

            if ($idAcuerdo <= 0 || $idGestion <= 0) {
                return ['success' => false, 'message' => 'id_acuerdo o id_gestion inválido'];
            }

            if (empty($cuotas)) {
                return ['success' => false, 'message' => 'No hay cuotas para guardar'];
            }

            $stmt = $db->prepare("
                INSERT INTO acuerdo_cuotas (
                    id_acuerdo, id_gestion, numero_cuota, valor_cuota, fecha_pago
                ) VALUES (
                    :id_acuerdo, :id_gestion, :numero_cuota, :valor_cuota, :fecha_pago
                )
            ");

            $insertadas = 0;
            foreach ($cuotas as $cuota) {
                $numeroCuota = (int) ($cuota['numero_cuota'] ?? 0);
                $valorCuota = $this->normalizarDecimal($cuota['valor_cuota'] ?? null);
                $fechaPago = $this->normalizarFecha($cuota['fecha_pago'] ?? null);

                if ($numeroCuota <= 0 || $valorCuota === null || $valorCuota <= 0 || $fechaPago === null) {
                    return ['success' => false, 'message' => 'Detalle de cuota inválido'];
                }

                $stmt->execute([
                    ':id_acuerdo' => $idAcuerdo,
                    ':id_gestion' => $idGestion,
                    ':numero_cuota' => $numeroCuota,
                    ':valor_cuota' => $valorCuota,
                    ':fecha_pago' => $fechaPago,
                ]);
                $insertadas++;
            }

            return ['success' => true, 'inserted' => $insertadas];
        } catch (Exception $e) {
            error_log("AcuerdoCuota::crearMultiples - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Obtiene el detalle de cuotas agrupado por id_gestion.
     * @param int[] $idsGestion
     * @return array<int, array<int, array<string, mixed>>>
     */
    public function obtenerPorIdsGestion(array $idsGestion) {
        if (empty($idsGestion)) {
            return [];
        }

        try {
            $db = getDBConnection();
            $idsGestion = array_values(array_filter(array_map('intval', $idsGestion), function ($id) {
                return $id > 0;
            }));
            if (empty($idsGestion)) {
                return [];
            }

            $placeholders = implode(',', array_fill(0, count($idsGestion), '?'));
            $stmt = $db->prepare("
                SELECT id_acuerdo_cuota, id_acuerdo, id_gestion, numero_cuota, valor_cuota, fecha_pago, fecha_creacion
                FROM acuerdo_cuotas
                WHERE id_gestion IN ($placeholders)
                ORDER BY id_gestion DESC, numero_cuota ASC
            ");
            $stmt->execute($idsGestion);

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map = [];
            foreach ($rows as $row) {
                $idGestion = (int) $row['id_gestion'];
                if (!isset($map[$idGestion])) {
                    $map[$idGestion] = [];
                }
                $map[$idGestion][] = $row;
            }
            return $map;
        } catch (Exception $e) {
            error_log("AcuerdoCuota::obtenerPorIdsGestion - " . $e->getMessage());
            return [];
        }
    }

    private function normalizarDecimal($valor) {
        if ($valor === null || $valor === '') {
            return null;
        }

        if (is_numeric($valor)) {
            return (float) $valor;
        }

        $texto = trim((string) $valor);
        if ($texto === '') {
            return null;
        }

        $texto = preg_replace('/[^\d,.\-]/', '', $texto);
        $ultimoPunto = strrpos($texto, '.');
        $ultimaComa = strrpos($texto, ',');
        if ($ultimoPunto !== false && $ultimaComa !== false) {
            if ($ultimaComa > $ultimoPunto) {
                $texto = str_replace('.', '', $texto);
                $texto = str_replace(',', '.', $texto);
            } else {
                $texto = str_replace(',', '', $texto);
            }
        } elseif ($ultimaComa !== false) {
            $texto = str_replace(',', '.', $texto);
        }

        return is_numeric($texto) ? (float) $texto : null;
    }

    private function normalizarFecha($valor) {
        $texto = trim((string) ($valor ?? ''));
        if ($texto === '') {
            return null;
        }

        $date = DateTime::createFromFormat('Y-m-d', $texto);
        if ($date instanceof DateTime) {
            return $date->format('Y-m-d');
        }

        $ts = strtotime($texto);
        return $ts === false ? null : date('Y-m-d', $ts);
    }
}
