<?php
/**
 * Controlador de Gestión del Asesor
 * Endpoints AJAX para gestiones y historial
 */

require_once __DIR__ . '/../models/HistorialGestion.php';
require_once __DIR__ . '/../models/Acuerdo.php';
require_once __DIR__ . '/../models/AcuerdoCuota.php';
require_once __DIR__ . '/../models/Tiempo.php';
require_once __DIR__ . '/../models/Cliente.php';
require_once __DIR__ . '/../models/Obligacion.php';
require_once __DIR__ . '/../models/BaseCliente.php';
require_once __DIR__ . '/../models/Tarea.php';

class AsesorGestionController {
    
    private function asesorCedula() {
        // Preferir usuario_cedula (algunos flujos antiguos podían setear usuario_id con otro valor)
        return $_SESSION['usuario_cedula'] ?? $_SESSION['usuario_id'] ?? null;
    }

    /**
     * Este proyecto puede operar con 2 esquemas distintos:
     * - Esquema normalizado: existe tabla `acuerdo_cuotas`.
     * - Esquema ancho `pago_1..pago_N`: NO existe `acuerdo_cuotas`, pero `acuerdos` tiene columnas `pago_n` y `fecha_pago_n` (hasta Acuerdo::MAX_PAGO_COLUMNAS_ANCHO).
     */
    private function acuerdoCuotasTablaExiste(): bool {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }
        try {
            $db = getDBConnection();
            $stmt = $db->prepare("
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'acuerdo_cuotas'
                LIMIT 1
            ");
            $stmt->execute();
            $cached = $stmt->fetchColumn() !== false;
            return (bool) $cached;
        } catch (Exception $e) {
            // Si falla introspección, asumir esquema sin tabla para evitar errores por FK inexistentes.
            $cached = false;
            return false;
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

    private function normalizarFechaIso($valor) {
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

    /**
     * Fecha/hora programada para nivel3 volver_llamar (zona America/Bogota).
     * @param array<string, mixed> $datosGestion
     * @return array{success: bool, datetime?: string|null, message?: string}
     */
    private function resolverVolverLlamarProgramado(array $datosGestion) {
        // En el frontend actual, la tipificación "volver_llamar" va en nivel2_clasificacion → historial.nivel2_tipo.
        $n2 = trim((string) ($datosGestion['nivel2_clasificacion'] ?? $datosGestion['nivel2_tipo'] ?? ''));
        $n3 = trim((string) ($datosGestion['nivel3_detalle'] ?? $datosGestion['nivel3_tipo'] ?? ''));
        if ($n2 !== 'volver_llamar' && $n3 !== 'volver_llamar') {
            return ['success' => true, 'datetime' => null];
        }

        $prog = trim((string) ($datosGestion['volver_llamar_programado'] ?? ''));
        $tz = new \DateTimeZone('America/Bogota');
        if ($prog !== '') {
            try {
                $dt = new \DateTimeImmutable($prog, $tz);
            } catch (\Exception $e) {
                return ['success' => false, 'message' => 'Fecha u hora de volver a llamar inválida'];
            }
            $ahora = new \DateTimeImmutable('now', $tz);
            if ($dt < $ahora) {
                return ['success' => false, 'message' => 'La fecha y hora de volver a llamar no pueden ser anteriores al momento actual (hora Colombia).'];
            }
            return ['success' => true, 'datetime' => $dt->format('Y-m-d H:i:s')];
        }

        $f = trim((string) ($datosGestion['volver_llamar_fecha'] ?? ''));
        $h = trim((string) ($datosGestion['volver_llamar_hora'] ?? ''));
        if ($f === '' || $h === '') {
            return ['success' => false, 'message' => 'Debe indicar fecha y hora para VOLVER A LLAMAR'];
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $f)) {
            return ['success' => false, 'message' => 'Fecha de volver a llamar inválida'];
        }
        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $h)) {
            return ['success' => false, 'message' => 'Hora de volver a llamar inválida'];
        }
        try {
            $dt = new \DateTimeImmutable($f . ' ' . $h, $tz);
            $ahora = new \DateTimeImmutable('now', $tz);
            if ($dt < $ahora) {
                return ['success' => false, 'message' => 'La fecha y hora de volver a llamar no pueden ser anteriores al momento actual (hora Colombia).'];
            }
            return ['success' => true, 'datetime' => $dt->format('Y-m-d H:i:s')];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Fecha u hora de volver a llamar inválida'];
        }
    }

    /**
     * Recordatorios "volver a llamar" para hoy: última gestión del asesor por cliente es volver_llamar y base activa.
     * @return array{success: bool, total?: int, items?: array<int, array<string, mixed>>, message?: string}
     */
    public function obtenerRecordatoriosVolverLlamar() {
        try {
            $asesor = $this->asesorCedula();
            if (!$asesor) {
                return ['success' => false, 'message' => 'No autorizado'];
            }

            $tz = new \DateTimeZone('America/Bogota');
            $hoy = (new \DateTimeImmutable('now', $tz))->format('Y-m-d');

            $db = getDBConnection();
            $sql = "
                SELECT h.id_gestion, h.cliente_id, h.volver_llamar_programado,
                       c.nombre AS cliente_nombre, c.cedula AS cliente_cedula
                FROM historial_gestion h
                INNER JOIN cliente c ON c.id_cliente = h.cliente_id
                INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
                INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                    AND aba.asesor_cedula = :cedula_aba AND aba.estado = 'activa'
                INNER JOIN (
                    SELECT cliente_id, MAX(id_gestion) AS mid
                    FROM historial_gestion
                    WHERE asesor_cedula = :cedula_sub
                    GROUP BY cliente_id
                ) ult ON ult.mid = h.id_gestion
                WHERE h.asesor_cedula = :cedula_h
                  AND h.nivel2_tipo = 'volver_llamar'
                  AND h.volver_llamar_programado IS NOT NULL
                  AND DATE(h.volver_llamar_programado) = :hoy
                ORDER BY h.volver_llamar_programado ASC
            ";
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':cedula_aba' => $asesor,
                ':cedula_sub' => $asesor,
                ':cedula_h' => $asesor,
                ':hoy' => $hoy,
            ]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $items = [];
            foreach ($rows as $r) {
                $items[] = [
                    'id_gestion' => (int) $r['id_gestion'],
                    'cliente_id' => (int) $r['cliente_id'],
                    'cliente_nombre' => (string) ($r['cliente_nombre'] ?? ''),
                    'cliente_cedula' => (string) ($r['cliente_cedula'] ?? ''),
                    'volver_llamar_programado' => $r['volver_llamar_programado'] !== null
                        ? (string) $r['volver_llamar_programado']
                        : null,
                ];
            }

            return [
                'success' => true,
                'total' => count($items),
                'items' => $items,
            ];
        } catch (\PDOException $e) {
            $msg = $e->getMessage();
            if (stripos($msg, 'volver_llamar_programado') !== false || stripos($msg, 'Unknown column') !== false) {
                return [
                    'success' => true,
                    'total' => 0,
                    'items' => [],
                    'message' => 'Ejecute la migración sql/migrations/20260508_historial_volver_llamar_programado.sql',
                ];
            }
            error_log('AsesorGestionController::obtenerRecordatoriosVolverLlamar - ' . $msg);
            return ['success' => false, 'message' => 'Error al consultar recordatorios'];
        } catch (\Exception $e) {
            error_log('AsesorGestionController::obtenerRecordatoriosVolverLlamar - ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * @param array<string, mixed> $datosGestion
     * @return array{success: bool, cuotas?: array<int, array<string, mixed>>, numero_cuotas?: int, valor_original?: float, valor_cuota_referencia?: float, fecha_primera_cuota?: string, fecha_ultima_cuota?: string, message?: string}
     */
    private function normalizarCuotasAcuerdo(array $datosGestion) {
        $numeroCuotas = isset($datosGestion['simulador_numero_cuotas']) ? (int) $datosGestion['simulador_numero_cuotas'] : 0;
        // Regla de negocio: entre 1 y 10 cuotas (selector en vista).
        if ($numeroCuotas < 1 || $numeroCuotas > 10) {
            return ['success' => false, 'message' => 'El acuerdo a largo plazo debe tener entre 1 y 10 cuotas'];
        }

        $cuotasEntrada = isset($datosGestion['cuotas_acuerdo']) && is_array($datosGestion['cuotas_acuerdo'])
            ? array_values($datosGestion['cuotas_acuerdo'])
            : [];
        if (count($cuotasEntrada) !== $numeroCuotas) {
            return ['success' => false, 'message' => 'Debe registrar exactamente la cantidad de cuotas indicada'];
        }

        $cuotas = [];
        $sumaCuotas = 0.0;
        foreach ($cuotasEntrada as $indice => $cuota) {
            if (!is_array($cuota)) {
                return ['success' => false, 'message' => 'Formato de cuota inválido'];
            }

            $numeroCuota = isset($cuota['numero_cuota']) ? (int) $cuota['numero_cuota'] : ($indice + 1);
            if ($numeroCuota !== ($indice + 1)) {
                return ['success' => false, 'message' => 'Las cuotas deben estar numeradas en orden consecutivo'];
            }

            $valorCuota = $this->normalizarDecimal($cuota['valor_cuota'] ?? null);
            if ($valorCuota === null || $valorCuota <= 0) {
                return ['success' => false, 'message' => 'Cada cuota debe tener un valor mayor que cero'];
            }

            $fechaPago = $this->normalizarFechaIso($cuota['fecha_pago'] ?? null);
            if ($fechaPago === null) {
                return ['success' => false, 'message' => 'Cada cuota debe tener una fecha de pago válida'];
            }

            $cuotas[] = [
                'numero_cuota' => $numeroCuota,
                'valor_cuota' => $valorCuota,
                'fecha_pago' => $fechaPago,
            ];
            $sumaCuotas += $valorCuota;
        }

        return [
            'success' => true,
            'cuotas' => $cuotas,
            'numero_cuotas' => $numeroCuotas,
            'valor_original' => $this->normalizarDecimal($datosGestion['simulador_monto'] ?? null) ?? $sumaCuotas,
            'valor_cuota_referencia' => (float) $cuotas[0]['valor_cuota'],
            'fecha_primera_cuota' => (string) $cuotas[0]['fecha_pago'],
            'fecha_ultima_cuota' => (string) $cuotas[count($cuotas) - 1]['fecha_pago'],
        ];
    }

    /**
     * @param array<string, mixed> $datosGestion
     * @return array{success: bool, message?: string}
     */
    private function guardarAcuerdoRelacionado($idGestion, array $datosGestion) {
        $nivel1 = isset($datosGestion['nivel1_tipo']) ? trim((string) $datosGestion['nivel1_tipo']) : '';
        $nivel2 = isset($datosGestion['nivel2_clasificacion']) ? trim((string) $datosGestion['nivel2_clasificacion']) : (isset($datosGestion['nivel2_tipo']) ? trim((string) $datosGestion['nivel2_tipo']) : '');

        // Guardar acuerdo por el nivel 2 seleccionado, aunque nivel1 llegue como código/label no estándar.
        $nivelesAcuerdo = ['acuerdo_pago_total', 'acuerdo_largo_plazo', 'acuerdo_aprobado'];
        if ($nivel2 === '' || !in_array($nivel2, $nivelesAcuerdo, true)) {
            return ['success' => true];
        }

        $acuerdoModel = new Acuerdo();
        $tipoAcuerdo = null;
        $datosAcuerdo = [];
        $detalleCuotas = [];

        if ($nivel2 === 'acuerdo_pago_total') {
            $tipoAcuerdo = 'total';
            $saldo = $this->normalizarDecimal($datosGestion['saldo_a_pagar'] ?? null);
            $descuento = $this->normalizarDecimal($datosGestion['descuento_monto'] ?? null);
            $total = $this->normalizarDecimal($datosGestion['total_a_pagar_acuerdo'] ?? null);
            $datosAcuerdo = [
                'valor_original' => $saldo,
                'descuento_aplicado' => $descuento,
                'valor_final_pago_total' => $total,
                'fecha_limite_pago' => isset($datosGestion['fecha_limite_acuerdo']) && $datosGestion['fecha_limite_acuerdo'] !== '' ? $datosGestion['fecha_limite_acuerdo'] : null,
            ];
        } elseif ($nivel2 === 'acuerdo_largo_plazo') {
            $tipoAcuerdo = 'cuotas';
            $detalleNormalizado = $this->normalizarCuotasAcuerdo($datosGestion);
            if (!$detalleNormalizado['success']) {
                return $detalleNormalizado;
            }

            $detalleCuotas = $detalleNormalizado['cuotas'];
            $datosAcuerdo = [
                'valor_original' => $detalleNormalizado['valor_original'],
                'numero_cuotas' => $detalleNormalizado['numero_cuotas'],
                // Se conserva un valor resumen para compatibilidad con pantallas/reportes existentes.
                'valor_cuota_mensual' => $detalleNormalizado['valor_cuota_referencia'],
                'periodicidad' => 'mensual',
                'fecha_limite_pago' => $detalleNormalizado['fecha_ultima_cuota'],
            ];

            // Esquema alterno: `acuerdos` guarda el detalle en columnas `pago_1..pago_N` y `fecha_pago_1..fecha_pago_N`.
            // Si el esquema normalizado está activo, estas llaves se ignorarán en `Acuerdo::crear` (sin columnas ancho).
            for ($i = 1; $i <= Acuerdo::MAX_PAGO_COLUMNAS_ANCHO; $i++) {
                $cuota = null;
                foreach ($detalleCuotas as $c) {
                    if ((int) ($c['numero_cuota'] ?? 0) === $i) {
                        $cuota = $c;
                        break;
                    }
                }
                $datosAcuerdo["pago_{$i}"] = $cuota ? $cuota['valor_cuota'] : null;
                $datosAcuerdo["fecha_pago_{$i}"] = $cuota ? $cuota['fecha_pago'] : null;
            }
        } elseif ($nivel2 === 'acuerdo_aprobado') {
            $tipoAcuerdo = 'comite';
            $estado = isset($datosGestion['acuerdo_comite_estado']) ? strtolower(trim((string) $datosGestion['acuerdo_comite_estado'])) : 'pendiente';
            if (!in_array($estado, ['pendiente', 'aprobado', 'rechazado'], true)) {
                $estado = 'pendiente';
            }
            $datosAcuerdo = [
                'valor_original' => isset($datosGestion['acuerdo_comite_monto_propuesto']) ? $datosGestion['acuerdo_comite_monto_propuesto'] : null,
                'estado_aprobacion' => $estado,
            ];
        }

        if ($tipoAcuerdo === null) {
            return ['success' => true];
        }

        $resultadoAcuerdo = $acuerdoModel->crear($idGestion, $tipoAcuerdo, $datosAcuerdo);
        if (!$resultadoAcuerdo['success']) {
            return ['success' => false, 'message' => $resultadoAcuerdo['message'] ?? 'No se pudo guardar el acuerdo'];
        }

        if ($tipoAcuerdo === 'cuotas') {
            // Si existe tabla `acuerdo_cuotas`, guardar en formato normalizado.
            // Si no existe (esquema ancho `pago_n`), el detalle ya quedó insertado en `acuerdos`.
            if ($this->acuerdoCuotasTablaExiste()) {
                $acuerdoCuotaModel = new AcuerdoCuota();
                $resultadoCuotas = $acuerdoCuotaModel->crearMultiples((int) $resultadoAcuerdo['id_acuerdo'], (int) $idGestion, $detalleCuotas);
                if (!$resultadoCuotas['success']) {
                    return ['success' => false, 'message' => $resultadoCuotas['message'] ?? 'No se pudo guardar el detalle de cuotas'];
                }
            }
        }

        return ['success' => true];
    }

    /**
     * @param array<int, array<string, mixed>> $gestiones
     */
    private function anexarAcuerdosAGestiones(array &$gestiones) {
        if (empty($gestiones)) {
            return;
        }

        $idsGestion = array_map(function ($g) {
            return (int) $g['id_gestion'];
        }, $gestiones);

        $acuerdoModel = new Acuerdo();
        $acuerdosPorGestion = $acuerdoModel->obtenerPorIdsGestion($idsGestion);
        $cuotasPorGestion = [];
        $usaTablaAcuerdoCuotas = $this->acuerdoCuotasTablaExiste();
        if ($usaTablaAcuerdoCuotas) {
            $acuerdoCuotaModel = new AcuerdoCuota();
            $cuotasPorGestion = $acuerdoCuotaModel->obtenerPorIdsGestion($idsGestion);
        }

        foreach ($gestiones as &$gestion) {
            $idG = (int) $gestion['id_gestion'];
            $gestion['acuerdo'] = isset($acuerdosPorGestion[$idG]) ? $acuerdosPorGestion[$idG] : null;
            if ($usaTablaAcuerdoCuotas) {
                $gestion['acuerdo_cuotas'] = isset($cuotasPorGestion[$idG]) ? $cuotasPorGestion[$idG] : [];
            } else {
                // Construir arreglo compatible con el frontend desde `acuerdos.pago_n`/`acuerdos.fecha_pago_n`.
                $gestion['acuerdo_cuotas'] = [];
                $acuerdo = $gestion['acuerdo'];
                if ($acuerdo && ($acuerdo['tipo_acuerdo'] ?? '') === 'cuotas') {
                    $numero = (int) ($acuerdo['numero_cuotas'] ?? 0);
                    for ($i = 1; $i <= Acuerdo::MAX_PAGO_COLUMNAS_ANCHO && $i <= $numero; $i++) {
                        $valorCuota = $acuerdo["pago_{$i}"] ?? null;
                        $fechaPago = $acuerdo["fecha_pago_{$i}"] ?? null;
                        $gestion['acuerdo_cuotas'][] = [
                            'numero_cuota' => $i,
                            'valor_cuota' => $valorCuota,
                            'fecha_pago' => $fechaPago,
                        ];
                    }
                }
            }
        }
        unset($gestion);
    }

    /**
     * Inicia un registro de tiempo de tipo 'gestion' (para medir duración en asesor_gestionar.js).
     * POST JSON: { cliente_id }
     * @return array{success: bool, sesion_id?: int, message?: string}
     */
    public function iniciarGestionTiempo() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }

            $input = file_get_contents('php://input');
            $datos = json_decode($input, true) ?: [];

            $tiempoModel = new Tiempo();
            // Si ya hay una gestión activa, devolverla
            $activa = $tiempoModel->obtenerActivo($asesorCedula, 'gestion');
            if ($activa['success'] && !empty($activa['tiempo'])) {
                return ['success' => true, 'sesion_id' => (int) $activa['tiempo']['id_tiempo'], 'message' => 'Gestión activa existente'];
            }

            $res = $tiempoModel->crear([
                'asesor_cedula' => $asesorCedula,
                'tipo_registro' => 'gestion',
                'fecha' => date('Y-m-d'),
                'hora_inicio' => date('Y-m-d H:i:s'),
                'hora_fin' => null,
                'estado' => 'activa',
            ]);

            if ($res['success']) {
                return ['success' => true, 'sesion_id' => (int) $res['id_tiempo'], 'message' => 'Gestión iniciada'];
            }
            return ['success' => false, 'message' => $res['message'] ?? 'Error al iniciar gestión'];
        } catch (Exception $e) {
            error_log("AsesorGestionController::iniciarGestionTiempo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Finaliza un registro de tiempo de tipo 'gestion'.
     * POST JSON: { sesion_id, hora_inicio?, hora_fin? }
     * @return array{success: bool, tiempo_gestion?: int, message?: string}
     */
    public function finalizarGestionTiempo() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }

            $input = file_get_contents('php://input');
            $datos = json_decode($input, true) ?: [];
            $sesionId = isset($datos['sesion_id']) ? (int) $datos['sesion_id'] : 0;
            if ($sesionId <= 0) {
                return ['success' => false, 'message' => 'sesion_id requerido'];
            }

            $tiempoModel = new Tiempo();
            $res = $tiempoModel->finalizar($sesionId, $datos['hora_fin'] ?? null);
            if (!$res['success']) {
                return ['success' => false, 'message' => $res['message'] ?? 'Error al finalizar gestión'];
            }

            // Calcular duración en segundos si vienen horas ISO
            $segundos = null;
            if (!empty($datos['hora_inicio']) && !empty($datos['hora_fin'])) {
                try {
                    $ini = new DateTime($datos['hora_inicio']);
                    $fin = new DateTime($datos['hora_fin']);
                    $segundos = max(0, (int) ($fin->getTimestamp() - $ini->getTimestamp()));
                } catch (Throwable $e) {
                    $segundos = null;
                }
            }

            $out = ['success' => true, 'message' => 'Gestión finalizada'];
            if ($segundos !== null) {
                $out['tiempo_gestion'] = $segundos;
            }
            return $out;
        } catch (Exception $e) {
            error_log("AsesorGestionController::finalizarGestionTiempo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Verifica si el asesor tiene acceso al cliente: el cliente debe pertenecer a una base
     * a la que el asesor tiene acceso (asignacion_base_asesores). La asignación en tareas
     * solo afecta la lista de la pestaña Clientes del dashboard; para ver/gestionar datos
     * basta con que el cliente esté en una base con acceso.
     * @param int $clienteId
     * @param string $asesorCedula
     * @return bool
     */
    private function asesorTieneAccesoAlCliente($clienteId, $asesorCedula) {
        $db = getDBConnection();
        $stmt = $db->prepare("
            SELECT 1
            FROM cliente c
            INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
            INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                AND aba.asesor_cedula = ? AND aba.estado = 'activa'
            WHERE c.id_cliente = ?
            LIMIT 1
        ");
        $stmt->execute([$asesorCedula, $clienteId]);
        return $stmt->fetchColumn() !== false;
    }

    /**
     * Busca una tarea activa del asesor (pendiente/en progreso) que contenga al cliente en esa base.
     * Prioriza detalle_tareas (más confiable que parsear JSON).
     */
    private function resolverTareaActivaParaCliente(string $asesorCedula, int $baseId, int $clienteId): int {
        try {
            $db = getDBConnection();
            $stmt = $db->prepare("
                SELECT t.id_tarea
                FROM tareas t
                INNER JOIN base_clientes bc ON bc.id_base = t.base_id AND bc.estado = 'activo'
                INNER JOIN detalle_tareas dt ON dt.id_tarea = t.id_tarea AND dt.id_cliente = ?
                WHERE t.asesor_cedula = ?
                  AND t.base_id = ?
                  AND t.estado IN ('pendiente','en progreso')
                ORDER BY t.id_tarea DESC
                LIMIT 1
            ");
            $stmt->execute([$clienteId, $asesorCedula, $baseId]);
            return (int) ($stmt->fetchColumn() ?: 0);
        } catch (Exception $e) {
            return 0;
        }
    }

    /**
     * Crea (o reutiliza) una tarea automática "Gestión libre" por asesor+base.
     * Esto permite guardar gestiones desde búsqueda aun si el cliente no está asignado a una tarea formal.
     */
    private function asegurarTareaGestionLibre(string $asesorCedula, int $baseId, int $clienteId): int {
        try {
            $db = getDBConnection();
            $nombreTarea = "[AUTO] Gestión libre - Base {$baseId}";

            // Reusar una tarea activa existente
            $stmt = $db->prepare("
                SELECT id_tarea
                FROM tareas
                WHERE asesor_cedula = ?
                  AND base_id = ?
                  AND estado IN ('pendiente','en progreso')
                  AND nombre_tarea = ?
                ORDER BY id_tarea DESC
                LIMIT 1
            ");
            $stmt->execute([$asesorCedula, $baseId, $nombreTarea]);
            $idTarea = (int) ($stmt->fetchColumn() ?: 0);

            $tareaModel = new Tarea();

            if ($idTarea <= 0) {
                // Determinar coordinador_cedula (FK a usuarios). No valida rol, solo que exista la cédula.
                $coordinadorCedula = null;
                try {
                    $stmtC = $db->prepare("SELECT creado_por FROM base_clientes WHERE id_base = ? LIMIT 1");
                    $stmtC->execute([$baseId]);
                    $coordinadorCedula = $stmtC->fetchColumn() ?: null;
                } catch (Exception $e) {
                    $coordinadorCedula = null;
                }
                if (!$coordinadorCedula) {
                    $stmtC = $db->query("SELECT cedula FROM usuarios WHERE LOWER(rol) = 'coordinador' LIMIT 1");
                    $coordinadorCedula = $stmtC->fetchColumn() ?: null;
                }
                if (!$coordinadorCedula) {
                    $coordinadorCedula = $asesorCedula;
                }

                $idTarea = (int) $tareaModel->crear([
                    'nombre_tarea' => $nombreTarea,
                    'coordinador_cedula' => (string) $coordinadorCedula,
                    'asesor_cedula' => $asesorCedula,
                    'base_id' => $baseId,
                    'clientes_asignados' => [(int) $clienteId],
                    'obligaciones_asignadas' => json_encode([]),
                ]);
                if ($idTarea <= 0) {
                    return 0;
                }
                $tareaModel->insertarDetalleTareas($idTarea, [(int) $clienteId]);
                return $idTarea;
            }

            // Asegurar que el cliente esté en detalle_tareas
            $stmtE = $db->prepare("SELECT 1 FROM detalle_tareas WHERE id_tarea = ? AND id_cliente = ? LIMIT 1");
            $stmtE->execute([$idTarea, $clienteId]);
            if ($stmtE->fetchColumn() === false) {
                $tareaModel->insertarDetalleTareas($idTarea, [(int) $clienteId]);
            }

            // (Opcional) mantener clientes_asignados consistente para pantallas que aún lo usen.
            $stmtCA = $db->prepare("SELECT clientes_asignados FROM tareas WHERE id_tarea = ? LIMIT 1");
            $stmtCA->execute([$idTarea]);
            $json = (string) ($stmtCA->fetchColumn() ?: '');
            $arr = $json !== '' ? (json_decode($json, true) ?: []) : [];
            $arr = is_array($arr) ? $arr : [];
            if (!in_array((int) $clienteId, $arr, true)) {
                $arr[] = (int) $clienteId;
                $arr = array_values(array_unique(array_map('intval', $arr)));
                $stmtU = $db->prepare("UPDATE tareas SET clientes_asignados = ? WHERE id_tarea = ? LIMIT 1");
                $stmtU->execute([json_encode($arr), $idTarea]);
            }

            return $idTarea;
        } catch (Exception $e) {
            error_log("AsesorGestionController::asegurarTareaGestionLibre - " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Guarda una gestión en historial_gestion
     * @return array{success: bool, message?: string, id_gestion?: int}
     */
    public function guardarGestion() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            // Obtener datos del POST (JSON)
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            if (!$datos || !isset($datos['cliente_id']) || !isset($datos['datos'])) {
                return ['success' => false, 'message' => 'Datos incompletos'];
            }
            
            $clienteId = (int)$datos['cliente_id'];
            $datosGestion = $datos['datos'];
            
            // Validar que el cliente existe
            $clienteModel = new Cliente();
            $cliente = $clienteModel->obtenerPorId($clienteId);
            
            if (!$cliente) {
                return ['success' => false, 'message' => 'Cliente no encontrado'];
            }

            // Verificar que el asesor tenga acceso al cliente (base activa y asignación)
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'No tiene acceso a este cliente'];
            }
            
            // Resolver id_tarea (obligatorio en historial_gestion).
            // Si no está en una tarea formal, se crea/reutiliza una tarea automática de "Gestión libre"
            // para permitir guardar gestiones solo con el acceso a base.
            $baseId = (int) ($cliente['base_id'] ?? 0);
            if ($baseId <= 0) {
                return ['success' => false, 'message' => 'El cliente no tiene base asignada'];
            }
            $idTarea = $this->resolverTareaActivaParaCliente((string) $asesorCedula, $baseId, $clienteId);
            if ($idTarea <= 0) {
                $idTarea = $this->asegurarTareaGestionLibre((string) $asesorCedula, $baseId, $clienteId);
            }
            if ($idTarea <= 0) {
                return ['success' => false, 'message' => 'No se pudo crear una tarea automática para guardar la gestión'];
            }
            
            // Determinar obligacion_id
            // Si contrato_id es 'ninguna' o vacío, usar una obligación por defecto o la primera del cliente
            $obligacionId = null;
            if (isset($datosGestion['contrato_id']) && $datosGestion['contrato_id'] !== 'ninguna' && $datosGestion['contrato_id'] !== '' && $datosGestion['contrato_id'] !== 'todas') {
                $obligacionId = (int)$datosGestion['contrato_id'];
                if ($obligacionId <= 0) {
                    return ['success' => false, 'message' => 'Obligación inválida'];
                }
                // Validar que la obligación exista y pertenezca al cliente (evita violaciones de FK y cruces entre bases)
                $db = getDBConnection();
                $stmt = $db->prepare("SELECT 1 FROM obligaciones WHERE id_obligacion = ? AND cliente_id = ? LIMIT 1");
                $stmt->execute([$obligacionId, $clienteId]);
                if ($stmt->fetchColumn() === false) {
                    return ['success' => false, 'message' => 'La obligación seleccionada no pertenece a este cliente'];
                }
            } else {
                // Obtener la primera obligación del cliente
                $obligacionModel = new Obligacion();
                $obligaciones = $obligacionModel->obtenerPorCliente($clienteId);
                if (!empty($obligaciones) && isset($obligaciones[0]['id_obligacion'])) {
                    $obligacionId = (int)$obligaciones[0]['id_obligacion'];
                } else {
                    // historial_gestion.obligacion_id es FK NOT NULL; si no hay obligaciones, no se puede guardar gestión
                    return ['success' => false, 'message' => 'Este cliente no tiene obligaciones registradas. No se puede guardar la gestión.'];
                }
            }
            
            $nivel1 = isset($datosGestion['nivel1_tipo']) ? trim((string) $datosGestion['nivel1_tipo']) : '';
            $nivel2 = isset($datosGestion['nivel2_clasificacion']) ? trim((string) $datosGestion['nivel2_clasificacion']) : (isset($datosGestion['nivel2_tipo']) ? trim((string) $datosGestion['nivel2_tipo']) : '');
            $detalleCuotasLargoPlazo = null;
            if (strtoupper($nivel1) === 'ACUERDO DE PAGO' && $nivel2 === 'acuerdo_largo_plazo') {
                $detalleCuotasLargoPlazo = $this->normalizarCuotasAcuerdo($datosGestion);
                if (!$detalleCuotasLargoPlazo['success']) {
                    return ['success' => false, 'message' => $detalleCuotasLargoPlazo['message'] ?? 'Datos de cuotas inválidos'];
                }
            }

            $volverProgRes = $this->resolverVolverLlamarProgramado($datosGestion);
            if (!$volverProgRes['success']) {
                return ['success' => false, 'message' => $volverProgRes['message'] ?? 'Datos inválidos'];
            }

            $historialData = [
                'asesor_cedula' => $asesorCedula,
                'id_tarea' => $idTarea,
                'cliente_id' => $clienteId,
                'obligacion_id' => $obligacionId,
                'canal_contacto' => $datosGestion['canal_contacto'] ?? '',
                'nivel1_tipo' => $datosGestion['nivel1_tipo'] ?? '',
                'nivel2_tipo' => $datosGestion['nivel2_clasificacion'] ?? $datosGestion['nivel2_tipo'] ?? '',
                'nivel3_tipo' => $datosGestion['nivel3_detalle'] ?? $datosGestion['nivel3_tipo'] ?? '',
                'nivel4_tipo' => $datosGestion['nivel4_tipo'] ?? '',
                'observaciones' => $datosGestion['observaciones'] ?? '',
                'llamada_telefonica' => isset($datosGestion['canales']['llamada']) && $datosGestion['canales']['llamada'],
                'email' => isset($datosGestion['canales']['email']) && $datosGestion['canales']['email'],
                'sms' => isset($datosGestion['canales']['sms']) && $datosGestion['canales']['sms'],
                'correo_fisico' => isset($datosGestion['canales']['correo']) && $datosGestion['canales']['correo'],
                'whatsapp' => isset($datosGestion['canales']['whatsapp']) && $datosGestion['canales']['whatsapp'],
                'fecha_pago' => $detalleCuotasLargoPlazo ? $detalleCuotasLargoPlazo['fecha_primera_cuota'] : ($datosGestion['fecha_pago'] ?? null),
                'volver_llamar_programado' => $volverProgRes['datetime'],
                'valor_pago' => $datosGestion['valor_pago'] ?? null,
                'cuota' => $detalleCuotasLargoPlazo ? $detalleCuotasLargoPlazo['valor_cuota_referencia'] : (isset($datosGestion['cuota']) && $datosGestion['cuota'] !== '' ? (float) preg_replace('/[^\d.]/', '', $datosGestion['cuota']) : null),
                'cuota_actual' => isset($datosGestion['cuota_actual']) && $datosGestion['cuota_actual'] !== '' ? (float) preg_replace('/[^\d.]/', '', $datosGestion['cuota_actual']) : null,
                'numero_contacto' => $datosGestion['numero_contacto'] ?? '',
                'duracion_segundos' => (int) ($datosGestion['duracion_segundos'] ?? 0)
            ];
            
            $db = getDBConnection();
            $historialModel = new HistorialGestion();

            $db->beginTransaction();
            $resultado = $historialModel->crear($historialData);
            if (!$resultado['success']) {
                $db->rollBack();
                return ['success' => false, 'message' => $resultado['message'] ?? 'Error al guardar gestión'];
            }

            $idGestion = (int) $resultado['id_gestion'];
            $resultadoAcuerdo = $this->guardarAcuerdoRelacionado($idGestion, $datosGestion);
            if (!$resultadoAcuerdo['success']) {
                $db->rollBack();
                return ['success' => false, 'message' => $resultadoAcuerdo['message'] ?? 'Error al guardar el acuerdo'];
            }

            $db->commit();

            $tareaModel = new Tarea();
            $tareaModel->marcarClienteGestionado($historialData['id_tarea'], $clienteId);

            return [
                'success' => true,
                'message' => 'Gestión guardada exitosamente',
                'id_gestion' => $idGestion
            ];
        } catch (Exception $e) {
            if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log("AsesorGestionController::guardarGestion - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Variante de guardar gestión para scripts/tests (sin leer php://input).
     * Recibe el mismo payload que el frontend envía: ['cliente_id' => int, 'datos' => array].
     * @param array $datos
     * @return array{success: bool, message?: string, id_gestion?: int}
     */
    public function guardarGestionConDatos(array $datos) {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }

            if (!$datos || !isset($datos['cliente_id']) || !isset($datos['datos'])) {
                return ['success' => false, 'message' => 'Datos incompletos'];
            }

            $clienteId = (int) $datos['cliente_id'];
            $datosGestion = is_array($datos['datos']) ? $datos['datos'] : [];

            // Validar que el cliente existe
            $clienteModel = new Cliente();
            $cliente = $clienteModel->obtenerPorId($clienteId);
            if (!$cliente) {
                return ['success' => false, 'message' => 'Cliente no encontrado'];
            }

            // Verificar que el asesor tenga acceso al cliente (base activa y asignación)
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'No tiene acceso a este cliente'];
            }

            // Resolver id_tarea (obligatorio en historial_gestion).
            $baseId = (int) ($cliente['base_id'] ?? 0);
            if ($baseId <= 0) {
                return ['success' => false, 'message' => 'El cliente no tiene base asignada'];
            }
            $idTarea = $this->resolverTareaActivaParaCliente((string) $asesorCedula, $baseId, $clienteId);
            if ($idTarea <= 0) {
                $idTarea = $this->asegurarTareaGestionLibre((string) $asesorCedula, $baseId, $clienteId);
            }
            if ($idTarea <= 0) {
                return ['success' => false, 'message' => 'No se pudo crear una tarea automática para guardar la gestión'];
            }

            // Determinar obligacion_id (FK NOT NULL)
            $obligacionId = null;
            if (isset($datosGestion['contrato_id']) && $datosGestion['contrato_id'] !== 'ninguna' && $datosGestion['contrato_id'] !== '' && $datosGestion['contrato_id'] !== 'todas') {
                $obligacionId = (int) $datosGestion['contrato_id'];
                if ($obligacionId <= 0) {
                    return ['success' => false, 'message' => 'Obligación inválida'];
                }
                $db = getDBConnection();
                $stmt = $db->prepare("SELECT 1 FROM obligaciones WHERE id_obligacion = ? AND cliente_id = ? LIMIT 1");
                $stmt->execute([$obligacionId, $clienteId]);
                if ($stmt->fetchColumn() === false) {
                    return ['success' => false, 'message' => 'La obligación seleccionada no pertenece a este cliente'];
                }
            } else {
                $obligacionModel = new Obligacion();
                $obligaciones = $obligacionModel->obtenerPorCliente($clienteId);
                if (!empty($obligaciones) && isset($obligaciones[0]['id_obligacion'])) {
                    $obligacionId = (int) $obligaciones[0]['id_obligacion'];
                } else {
                    return ['success' => false, 'message' => 'Este cliente no tiene obligaciones registradas. No se puede guardar la gestión.'];
                }
            }

            $nivel1 = isset($datosGestion['nivel1_tipo']) ? trim((string) $datosGestion['nivel1_tipo']) : '';
            $nivel2 = isset($datosGestion['nivel2_clasificacion']) ? trim((string) $datosGestion['nivel2_clasificacion']) : (isset($datosGestion['nivel2_tipo']) ? trim((string) $datosGestion['nivel2_tipo']) : '');
            $detalleCuotasLargoPlazo = null;
            if (strtoupper($nivel1) === 'ACUERDO DE PAGO' && $nivel2 === 'acuerdo_largo_plazo') {
                $detalleCuotasLargoPlazo = $this->normalizarCuotasAcuerdo($datosGestion);
                if (!$detalleCuotasLargoPlazo['success']) {
                    return ['success' => false, 'message' => $detalleCuotasLargoPlazo['message'] ?? 'Datos de cuotas inválidos'];
                }
            }

            $volverProgRes = $this->resolverVolverLlamarProgramado($datosGestion);
            if (!$volverProgRes['success']) {
                return ['success' => false, 'message' => $volverProgRes['message'] ?? 'Datos inválidos'];
            }

            $historialData = [
                'asesor_cedula' => $asesorCedula,
                'id_tarea' => $idTarea,
                'cliente_id' => $clienteId,
                'obligacion_id' => $obligacionId,
                'canal_contacto' => $datosGestion['canal_contacto'] ?? '',
                'nivel1_tipo' => $datosGestion['nivel1_tipo'] ?? '',
                'nivel2_tipo' => $datosGestion['nivel2_clasificacion'] ?? ($datosGestion['nivel2_tipo'] ?? ''),
                'nivel3_tipo' => $datosGestion['nivel3_detalle'] ?? ($datosGestion['nivel3_tipo'] ?? ''),
                'nivel4_tipo' => $datosGestion['nivel4_tipo'] ?? '',
                'observaciones' => $datosGestion['observaciones'] ?? '',
                'llamada_telefonica' => isset($datosGestion['canales']['llamada']) && $datosGestion['canales']['llamada'],
                'email' => isset($datosGestion['canales']['email']) && $datosGestion['canales']['email'],
                'sms' => isset($datosGestion['canales']['sms']) && $datosGestion['canales']['sms'],
                'correo_fisico' => isset($datosGestion['canales']['correo']) && $datosGestion['canales']['correo'],
                'whatsapp' => isset($datosGestion['canales']['whatsapp']) && $datosGestion['canales']['whatsapp'],
                'fecha_pago' => $detalleCuotasLargoPlazo ? $detalleCuotasLargoPlazo['fecha_primera_cuota'] : ($datosGestion['fecha_pago'] ?? null),
                'volver_llamar_programado' => $volverProgRes['datetime'],
                'valor_pago' => $datosGestion['valor_pago'] ?? null,
                'cuota' => $detalleCuotasLargoPlazo ? $detalleCuotasLargoPlazo['valor_cuota_referencia'] : (isset($datosGestion['cuota']) && $datosGestion['cuota'] !== '' ? (float) preg_replace('/[^\d.]/', '', (string) $datosGestion['cuota']) : null),
                'cuota_actual' => isset($datosGestion['cuota_actual']) && $datosGestion['cuota_actual'] !== '' ? (float) preg_replace('/[^\d.]/', '', (string) $datosGestion['cuota_actual']) : null,
                'numero_contacto' => $datosGestion['numero_contacto'] ?? '',
                'duracion_segundos' => (int) ($datosGestion['duracion_segundos'] ?? 0)
            ];

            $db = getDBConnection();
            $historialModel = new HistorialGestion();
            $db->beginTransaction();
            $resultado = $historialModel->crear($historialData);
            if (!$resultado['success']) {
                $db->rollBack();
                return ['success' => false, 'message' => $resultado['message'] ?? 'Error al guardar gestión'];
            }

            $idGestion = (int) $resultado['id_gestion'];
            $resultadoAcuerdo = $this->guardarAcuerdoRelacionado($idGestion, $datosGestion);
            if (!$resultadoAcuerdo['success']) {
                $db->rollBack();
                return ['success' => false, 'message' => $resultadoAcuerdo['message'] ?? 'Error al guardar el acuerdo'];
            }

            $db->commit();

            $tareaModel = new Tarea();
            $tareaModel->marcarClienteGestionado($historialData['id_tarea'], $clienteId);

            return [
                'success' => true,
                'message' => 'Gestión guardada exitosamente',
                'id_gestion' => $idGestion
            ];
        } catch (Exception $e) {
            if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log("AsesorGestionController::guardarGestionConDatos - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Obtiene el historial de gestiones de un cliente
     * @return array{success: bool, gestiones?: array, message?: string}
     */
    public function obtenerHistorialGestiones() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'gestiones' => []];
            }
            
            $clienteId = $_GET['cliente_id'] ?? null;
            if (!$clienteId) {
                return ['success' => false, 'message' => 'ID de cliente requerido', 'gestiones' => []];
            }
            
            $clienteId = (int)$clienteId;
            
            // Verificar que el asesor tenga acceso al cliente (base activa y asignación)
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'No tiene acceso a este cliente', 'gestiones' => []];
            }
            
            // Obtener cédula del cliente para traer historial por identidad (incluye bases deshabilitadas)
            $clienteModel = new Cliente();
            $cliente = $clienteModel->obtenerPorId($clienteId);
            $cedula = $cliente['cedula'] ?? null;
            $historialModel = new HistorialGestion();
            if ($cedula !== null && $cedula !== '') {
                $resultado = $historialModel->obtenerPorCedula($cedula, null);
            } else {
                $resultado = $historialModel->obtenerPorCliente($clienteId, null);
            }
            
            if ($resultado['success'] && !empty($resultado['gestiones'])) {
                $this->anexarAcuerdosAGestiones($resultado['gestiones']);
            }
            
            return $resultado;
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerHistorialGestiones - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => []];
        }
    }
    
    /**
     * Lista gestiones del asesor con filtros (canal, nivel1, nivel2), búsqueda y paginación (pestaña Gestiones)
     * GET: canal_contacto, nivel1_tipo, nivel2_tipo, busqueda, pagina, por_pagina
     * @return array{success: bool, gestiones?: array, total?: int, pagina?: int, por_pagina?: int, message?: string}
     */
    public function listarGestionesAsesor() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'gestiones' => [], 'total' => 0];
            }
            $filtros = [
                'canal_contacto' => trim((string) ($_GET['canal_contacto'] ?? '')),
                'nivel1_tipo' => trim((string) ($_GET['nivel1_tipo'] ?? '')),
                'nivel2_tipo' => trim((string) ($_GET['nivel2_tipo'] ?? '')),
            ];
            $busqueda = trim((string) ($_GET['busqueda'] ?? ''));
            $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
            $porPagina = (int) ($_GET['por_pagina'] ?? 6);
            if ($porPagina < 1 || $porPagina > 100) {
                $porPagina = 6;
            }
            $historialModel = new HistorialGestion();
            $resultado = $historialModel->listarPorAsesorConFiltros($asesorCedula, $filtros, $busqueda, $pagina, $porPagina);
            if (!$resultado['success']) {
                return $resultado;
            }
            if (!empty($resultado['gestiones'])) {
                $this->anexarAcuerdosAGestiones($resultado['gestiones']);
            }
            return $resultado;
        } catch (Exception $e) {
            error_log("AsesorGestionController::listarGestionesAsesor - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'gestiones' => [], 'total' => 0, 'pagina' => 1, 'por_pagina' => 6];
        }
    }
    
    /**
     * Obtiene el siguiente cliente que el asesor aún no ha gestionado (detalle_tareas.gestionado = 'no').
     * Se usa para el botón "Siguiente cliente" en asesor_gestionar. GET: cliente_id = cliente actual.
     * @return array{success: bool, cliente?: array, message?: string}
     */
    public function obtenerSiguienteCliente() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            $clienteIdActual = isset($_GET['cliente_id']) ? (int) $_GET['cliente_id'] : 0;
            if ($clienteIdActual <= 0) {
                return ['success' => true, 'cliente' => null];
            }

            $db = getDBConnection();
            // 1) Hallar la tarea activa del asesor que contiene este cliente (y su id_detalle)
            $stmt = $db->prepare("
                SELECT dt.id_tarea, dt.id_detalle
                FROM detalle_tareas dt
                INNER JOIN tareas t ON t.id_tarea = dt.id_tarea
                INNER JOIN base_clientes bc ON bc.id_base = t.base_id AND bc.estado = 'activo'
                WHERE t.asesor_cedula = ?
                  AND t.estado IN ('pendiente','en progreso')
                  AND dt.id_cliente = ?
                LIMIT 1
            ");
            $stmt->execute([$asesorCedula, $clienteIdActual]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return ['success' => true, 'cliente' => null];
            }
            $idTarea = (int) $row['id_tarea'];
            $idDetalleActual = (int) $row['id_detalle'];

            // 2) Buscar el siguiente cliente NO gestionado después del actual (por id_detalle)
            $stmt = $db->prepare("
                SELECT dt.id_cliente
                FROM detalle_tareas dt
                WHERE dt.id_tarea = ?
                  AND dt.gestionado = 'no'
                  AND dt.id_detalle > ?
                ORDER BY dt.id_detalle ASC
                LIMIT 1
            ");
            $stmt->execute([$idTarea, $idDetalleActual]);
            $siguienteId = (int) ($stmt->fetchColumn() ?: 0);

            // 3) Si no hay después, pero aún quedan pendientes en la tarea, tomar el primero pendiente (wrap)
            if ($siguienteId <= 0) {
                $stmt = $db->prepare("
                    SELECT dt.id_cliente
                    FROM detalle_tareas dt
                    WHERE dt.id_tarea = ?
                      AND dt.gestionado = 'no'
                      AND dt.id_cliente <> ?
                    ORDER BY dt.id_detalle ASC
                    LIMIT 1
                ");
                $stmt->execute([$idTarea, $clienteIdActual]);
                $siguienteId = (int) ($stmt->fetchColumn() ?: 0);
            }

            if ($siguienteId <= 0) {
                return ['success' => true, 'cliente' => null];
            }

            $clienteModel = new Cliente();
            $cliente = $clienteModel->obtenerPorId($siguienteId);
            if (!$cliente) {
                return ['success' => true, 'cliente' => null];
            }

            return [
                'success' => true,
                'cliente' => [
                    'ID_CLIENTE' => (int) $cliente['id'],
                    'id_cliente' => (int) $cliente['id'],
                    'NOMBRE CONTRATANTE' => $cliente['nombre'] ?? '',
                    'nombre' => $cliente['nombre'] ?? '',
                    'id_tarea' => $idTarea
                ]
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerSiguienteCliente - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Crea una nueva sesión de tiempo en la tabla tiempos
     * @return array{success: bool, sesion_id?: int, message?: string}
     */
    public function crearSesionTiempo() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $tiempoModel = new Tiempo();
            
            // Verificar si hay una sesión activa
            $sesionActiva = $tiempoModel->obtenerActivo($asesorCedula, 'sesion');
            
            if ($sesionActiva['success'] && $sesionActiva['tiempo']) {
                // Ya hay una sesión activa, retornar su ID
                return [
                    'success' => true,
                    'sesion_id' => $sesionActiva['tiempo']['id_tiempo'],
                    'message' => 'Sesión existente encontrada'
                ];
            }
            
            // Crear nueva sesión
            $resultado = $tiempoModel->crear([
                'asesor_cedula' => $asesorCedula,
                'tipo_registro' => 'sesion',
                'fecha' => date('Y-m-d'),
                'hora_inicio' => date('Y-m-d H:i:s'),
                'hora_fin' => null,
                'estado' => 'activa'
            ]);
            
            if ($resultado['success']) {
                return [
                    'success' => true,
                    'sesion_id' => $resultado['id_tiempo'],
                    'message' => 'Sesión creada exitosamente'
                ];
            } else {
                return ['success' => false, 'message' => $resultado['message'] ?? 'Error al crear sesión'];
            }
        } catch (Exception $e) {
            error_log("AsesorGestionController::crearSesionTiempo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Inicia una pausa (break, almuerzo, baño, etc.)
     * @return array{success: bool, pausa_id?: int, message?: string}
     */
    public function iniciarPausa() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            if (!$datos || !isset($datos['tipo_pausa'])) {
                return ['success' => false, 'message' => 'Tipo de pausa requerido'];
            }
            
            $tipoPausa = $datos['tipo_pausa'];
            
            // Mapear tipos de pausa a los valores del enum en la tabla tiempos
            // Según banco.sql: tipo_registro enum('sesion','break','almuerzo','baño','capacitacion','retroalimentacion','gestion')
            $tiposValidos = [
                'break' => 'break',
                'almuerzo' => 'almuerzo',
                'bano' => 'baño',
                'mantenimiento' => 'baño', // Mapear mantenimiento a baño (no existe en enum)
                'capacitacion' => 'capacitacion',
                'retroalimentacion' => 'retroalimentacion',
                'pausa_activa' => 'break', // Mapear pausa_activa a break
                'actividad_extra' => 'gestion' // Mapear actividad_extra a gestion
            ];
            
            $tipoRegistro = $tiposValidos[$tipoPausa] ?? 'break';
            
            $tiempoModel = new Tiempo();
            
            // Verificar si ya hay una pausa activa del mismo tipo
            $pausaActiva = $tiempoModel->obtenerActivo($asesorCedula, $tipoRegistro);
            
            if ($pausaActiva['success'] && $pausaActiva['tiempo']) {
                // Ya hay una pausa activa, retornar su ID
                return [
                    'success' => true,
                    'pausa_id' => $pausaActiva['tiempo']['id_tiempo'],
                    'message' => 'Pausa existente encontrada'
                ];
            }
            
            // Crear nueva pausa
            $resultado = $tiempoModel->crear([
                'asesor_cedula' => $asesorCedula,
                'tipo_registro' => $tipoRegistro,
                'fecha' => date('Y-m-d'),
                'hora_inicio' => date('Y-m-d H:i:s'),
                'hora_fin' => null,
                'estado' => 'activa'
            ]);
            
            if ($resultado['success']) {
                return [
                    'success' => true,
                    'pausa_id' => $resultado['id_tiempo'],
                    'message' => 'Pausa iniciada exitosamente'
                ];
            } else {
                return ['success' => false, 'message' => $resultado['message'] ?? 'Error al iniciar pausa'];
            }
        } catch (Exception $e) {
            error_log("AsesorGestionController::iniciarPausa - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Finaliza una pausa activa
     * @return array{success: bool, message?: string}
     */
    public function finalizarPausa() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            $tiempoModel = new Tiempo();
            
            // Buscar todas las pausas activas del asesor
            $pausasActivas = $tiempoModel->obtenerPorAsesor($asesorCedula);
            
            if (!$pausasActivas['success']) {
                return ['success' => false, 'message' => 'Error al obtener pausas'];
            }
            
            // Finalizar todas las pausas activas (excepto sesión)
            $finalizadas = 0;
            foreach ($pausasActivas['tiempos'] as $tiempo) {
                if ($tiempo['estado'] === 'activa' && $tiempo['tipo_registro'] !== 'sesion') {
                    $resultado = $tiempoModel->finalizar($tiempo['id_tiempo']);
                    if ($resultado['success']) {
                        $finalizadas++;
                    }
                }
            }
            
            if ($finalizadas > 0) {
                return [
                    'success' => true,
                    'message' => "Pausa finalizada exitosamente"
                ];
            } else {
                return ['success' => false, 'message' => 'No se encontró pausa activa para finalizar'];
            }
        } catch (Exception $e) {
            error_log("AsesorGestionController::finalizarPausa - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Actualiza el tiempo en la base de datos (compatibilidad con código existente)
     * @return array{success: bool, message?: string}
     */
    public function actualizarTiempo() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            // Esta función puede ser usada para actualizar estadísticas
            // Por ahora, solo retornamos éxito ya que el tiempo se calcula automáticamente
            return ['success' => true, 'message' => 'Tiempo actualizado'];
        } catch (Exception $e) {
            error_log("AsesorGestionController::actualizarTiempo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Finaliza la sesión de tiempo
     * @return array{success: bool, message?: string}
     */
    public function finalizarSesionTiempo() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            $tiempoModel = new Tiempo();
            
            // Buscar sesión activa
            $sesionActiva = $tiempoModel->obtenerActivo($asesorCedula, 'sesion');
            
            if ($sesionActiva['success'] && $sesionActiva['tiempo']) {
                // Finalizar sesión
                $resultado = $tiempoModel->finalizar($sesionActiva['tiempo']['id_tiempo']);
                
                if ($resultado['success']) {
                    return [
                        'success' => true,
                        'message' => 'Sesión finalizada exitosamente'
                    ];
                } else {
                    return ['success' => false, 'message' => $resultado['message'] ?? 'Error al finalizar sesión'];
                }
            } else {
                return ['success' => false, 'message' => 'No se encontró sesión activa'];
            }
        } catch (Exception $e) {
            error_log("AsesorGestionController::finalizarSesionTiempo - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Guarda una actividad extra
     * @return array{success: bool, message?: string}
     */
    public function guardarActividadExtra() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            if (!$datos || !isset($datos['duracion_segundos'])) {
                return ['success' => false, 'message' => 'Duración requerida'];
            }
            
            $duracionSegundos = (int)$datos['duracion_segundos'];
            
            // Registrar bloque de actividad: hora_fin = ahora, hora_inicio = ahora - duracion
            $horaFin = date('Y-m-d H:i:s');
            $horaInicio = date('Y-m-d H:i:s', strtotime("-{$duracionSegundos} seconds"));
            
            $tiempoModel = new Tiempo();
            
            $resultado = $tiempoModel->crear([
                'asesor_cedula' => $asesorCedula,
                'tipo_registro' => 'gestion',
                'fecha' => date('Y-m-d'),
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'estado' => 'finalizada'
            ]);
            
            if ($resultado['success']) {
                return [
                    'success' => true,
                    'message' => 'Actividad extra guardada exitosamente'
                ];
            } else {
                return ['success' => false, 'message' => $resultado['message'] ?? 'Error al guardar actividad extra'];
            }
        } catch (Exception $e) {
            error_log("AsesorGestionController::guardarActividadExtra - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Obtiene las bases de clientes a las que el asesor tiene acceso
     * @return array{success: bool, bases?: array, message?: string}
     */
    public function obtenerBasesAcceso() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'bases' => []];
            }
            
            $db = getDBConnection();
            
            // Obtener bases a las que el asesor tiene acceso activo
            $stmt = $db->prepare("
                SELECT DISTINCT
                    bc.id_base,
                    bc.nombre as nombre_base,
                    bc.total_clientes,
                    bc.TOTAL_OBLIGACIONES as total_obligaciones,
                    bc.estado,
                    bc.fecha_creacion,
                    aba.fecha_asignacion as fecha_acceso
                FROM asignacion_base_asesores aba
                INNER JOIN base_clientes bc ON aba.base_id = bc.id_base
                WHERE aba.asesor_cedula = ?
                AND aba.estado = 'activa'
                AND bc.estado = 'activo'
                ORDER BY bc.fecha_creacion DESC
            ");
            
            $stmt->execute([$asesorCedula]);
            $bases = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'bases' => $bases
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerBasesAcceso - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'bases' => []];
        }
    }
    
    /**
     * Busca clientes en las bases a las que el asesor tiene acceso.
     * Criterios: cédula, teléfono (tel1-tel10), nombre, número de operación (obligaciones).
     * @param array|null $datosInyectados Para tests: array con clave 'termino'. Si es null, se lee desde php://input.
     * @return array{success: bool, clientes?: array, message?: string}
     */
    public function buscarClienteAsesor($datosInyectados = null) {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'clientes' => []];
            }
            
            if (is_array($datosInyectados)) {
                $datos = $datosInyectados;
            } else {
                $input = file_get_contents('php://input');
                $datos = is_string($input) && $input !== '' ? json_decode($input, true) : [];
                if (!is_array($datos)) {
                    $datos = [];
                }
            }
            $termino = isset($datos['termino']) ? trim((string) $datos['termino']) : '';
            
            if ($termino === '') {
                return ['success' => true, 'clientes' => [], 'message' => 'Ingrese un término de búsqueda'];
            }
            
            $db = getDBConnection();
            $term = '%' . $termino . '%';
            
            // Buscar clientes en bases con acceso del asesor, por cedula, nombre, teléfonos o operación
            $sql = "
                SELECT DISTINCT
                    c.id_cliente,
                    c.base_id,
                    c.cedula,
                    c.nombre,
                    c.email,
                    c.tel1, c.tel2, c.tel3, c.tel4, c.tel5,
                    c.tel6, c.tel7, c.tel8, c.tel9, c.tel10,
                    bc.nombre AS nombre_base,
                    (SELECT GROUP_CONCAT(o.operacion SEPARATOR ', ') FROM obligaciones o WHERE o.cliente_id = c.id_cliente) AS operaciones
                FROM cliente c
                INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
                INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id 
                    AND aba.asesor_cedula = ? AND aba.estado = 'activa'
                LEFT JOIN obligaciones o ON o.cliente_id = c.id_cliente
                WHERE (
                    c.cedula LIKE ?
                    OR c.nombre LIKE ?
                    OR c.email LIKE ?
                    OR c.tel1 LIKE ? OR c.tel2 LIKE ? OR c.tel3 LIKE ? OR c.tel4 LIKE ? OR c.tel5 LIKE ?
                    OR c.tel6 LIKE ? OR c.tel7 LIKE ? OR c.tel8 LIKE ? OR c.tel9 LIKE ? OR c.tel10 LIKE ?
                    OR o.operacion LIKE ?
                )
                ORDER BY c.nombre ASC
                LIMIT 50
            ";
            
            $stmt = $db->prepare($sql);
            $params = array_merge(
                [$asesorCedula],
                array_fill(0, 14, $term)
            );
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Formato esperado por el frontend (compatibilidad con nombres usados en vistas)
            $clientes = [];
            foreach ($rows as $row) {
                $clientes[] = [
                    'id_cliente' => $row['id_cliente'],
                    'ID_CLIENTE' => $row['id_cliente'],
                    'id' => $row['id_cliente'],
                    'cedula' => $row['cedula'],
                    'IDENTIFICACION' => $row['cedula'],
                    'nombre' => $row['nombre'],
                    'NOMBRE CONTRATANTE' => $row['nombre'],
                    'NOMBRE_CLIENTE' => $row['nombre'],
                    'email' => $row['email'],
                    'EMAIL' => $row['email'],
                    'tel1' => $row['tel1'],
                    'CEL' => $row['tel1'],
                    'CELULAR' => $row['tel1'],
                    'cel' => $row['tel1'],
                    'tel2' => $row['tel2'],
                    'operaciones' => $row['operaciones'],
                    'numero_obligacion' => $row['operaciones'],
                    'NUMERO OBLIGACION' => $row['operaciones'],
                    'nombre_base' => $row['nombre_base'],
                ];
            }
            
            return [
                'success' => true,
                'clientes' => $clientes
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::buscarClienteAsesor - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'clientes' => []];
        }
    }
    
    /**
     * Obtiene el resumen de tareas del asesor con estadísticas de progreso
     * @return array{success: bool, tareas?: array, message?: string}
     */
    public function obtenerResumenTareas() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'tareas' => []];
            }
            
            $db = getDBConnection();
            $tareaModel = new Tarea();
            $tareas = $tareaModel->obtenerPorAsesor($asesorCedula);
            
            if (empty($tareas)) {
                return ['success' => true, 'tareas' => []];
            }
            
            // Contar por tarea usando detalle_tareas (gestionado='si' vs 'no'), no historial_gestion global
            // Así una tarea recién asignada muestra 0 gestionados y todos pendientes
            $stmtPendientes = $db->prepare("
                SELECT dt.id_tarea AS id_tarea,
                       SUM(CASE WHEN dt.gestionado = 'si' THEN 1 ELSE 0 END) AS gestionados,
                       SUM(CASE WHEN dt.gestionado = 'no' THEN 1 ELSE 0 END) AS pendientes
                FROM detalle_tareas dt
                INNER JOIN tareas t ON t.id_tarea = dt.id_tarea AND t.asesor_cedula = ?
                WHERE t.estado IN ('pendiente', 'en progreso')
                GROUP BY dt.id_tarea
            ");
            $stmtPendientes->execute([$asesorCedula]);
            $conteosPorTarea = [];
            while ($row = $stmtPendientes->fetch(PDO::FETCH_ASSOC)) {
                $conteosPorTarea[(int)$row['id_tarea']] = [
                    'gestionados' => (int)$row['gestionados'],
                    'pendientes' => (int)$row['pendientes']
                ];
            }
            
            // Procesar cada tarea (solo pendiente/en progreso; las completadas no se muestran)
            $resumenTareas = [];
            foreach ($tareas as $tarea) {
                if (($tarea['estado'] ?? '') === 'completa' || ($tarea['estado'] ?? '') === 'cancelada') {
                    continue;
                }
                $clientesAsignados = is_array($tarea['clientes_asignados']) ? $tarea['clientes_asignados'] : [];
                $totalClientes = count($clientesAsignados);
                
                if ($totalClientes === 0) {
                    continue; // Saltar tareas sin clientes asignados
                }
                
                $idTarea = (int)$tarea['id_tarea'];
                if (isset($conteosPorTarea[$idTarea])) {
                    $clientesGestionados = $conteosPorTarea[$idTarea]['gestionados'];
                    $clientesPendientes = $conteosPorTarea[$idTarea]['pendientes'];
                } else {
                    // Tarea sin filas en detalle_tareas (antigua): usar 0 gestionados, todos pendientes
                    $clientesGestionados = 0;
                    $clientesPendientes = $totalClientes;
                }
                $porcentajeProgreso = $totalClientes > 0 ? round(($clientesGestionados / $totalClientes) * 100) : 0;
                
                // Mostrar en el resumen solo tareas con al menos 1 cliente pendiente (gestionado='no').
                // Así no se muestran como "pendientes" tareas que ya tienen todos los clientes gestionados.
                if ($clientesPendientes <= 0) {
                    continue;
                }
                
                // Formatear fecha de asignación
                $fechaAsignacion = '';
                if ($tarea['fecha_creacion']) {
                    $fecha = new DateTime($tarea['fecha_creacion']);
                    $fechaAsignacion = $fecha->format('d/m/Y');
                }
                
                $resumenTareas[] = [
                    'tarea_id' => $tarea['id_tarea'],
                    'base_nombre' => $tarea['base_nombre'] ?? 'Base sin nombre',
                    'fecha_asignacion' => $fechaAsignacion,
                    'total_clientes_asignados' => $totalClientes,
                    'clientes_gestionados' => $clientesGestionados,
                    'clientes_pendientes' => $clientesPendientes,
                    'porcentaje_progreso' => $porcentajeProgreso,
                    'estado' => $tarea['estado']
                ];
            }
            
            return [
                'success' => true,
                'tareas' => $resumenTareas
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerResumenTareas - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'tareas' => []];
        }
    }
    
    /**
     * Obtiene los clientes asignados al asesor que aún NO han sido gestionados (detalle_tareas.gestionado = 'no').
     * Usa la tabla detalle_tareas para mostrar solo pendientes en la pestaña Clientes.
     * @return array Array de clientes con formato esperado por la vista
     */
    public function obtenerClientesAsignados() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return [];
            }
            
            $db = getDBConnection();
            $limit = defined('ASESOR_DASHBOARD_LIMIT_CLIENTES') ? (int) ASESOR_DASHBOARD_LIMIT_CLIENTES : 500;
            $sql = "SELECT 
                c.id_cliente,
                c.base_id,
                c.cedula,
                c.nombre,
                c.email,
                c.tel1,
                bc.nombre as base_nombre
            FROM detalle_tareas dt
            INNER JOIN tareas t ON t.id_tarea = dt.id_tarea AND t.asesor_cedula = :asesor_cedula
            INNER JOIN cliente c ON c.id_cliente = dt.id_cliente
            INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
            INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                AND aba.asesor_cedula = :asesor_cedula AND aba.estado = 'activa'
            WHERE dt.gestionado = 'no'
            AND t.estado IN ('pendiente', 'en progreso')
            AND c.estado = 'activo'
            ORDER BY c.nombre ASC
            LIMIT " . (int) $limit;
            
            $stmt = $db->prepare($sql);
            $stmt->execute([':asesor_cedula' => $asesorCedula]);
            $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $clientesFormateados = [];
            foreach ($clientes as $cliente) {
                $clientesFormateados[] = [
                    'id' => $cliente['id_cliente'],
                    'ID_COMERCIO' => $cliente['id_cliente'],
                    'id_cliente' => $cliente['id_cliente'],
                    'NOMBRE_COMERCIO' => $cliente['nombre'],
                    'nombre_comercio' => $cliente['nombre'],
                    'nombre' => $cliente['nombre'],
                    'NIT_CXC' => $cliente['cedula'],
                    'nit_cxc' => $cliente['cedula'],
                    'cedula' => $cliente['cedula'],
                    'CEL' => $cliente['tel1'],
                    'cel' => $cliente['tel1'],
                    'tel1' => $cliente['tel1'],
                    'email' => $cliente['email'],
                    'base_id' => $cliente['base_id'],
                    'base_nombre' => $cliente['base_nombre']
                ];
            }
            
            return $clientesFormateados;
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerClientesAsignados - " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Obtiene las estadísticas del asesor.
     * Pestaña Clientes: clientes_asignados, clientes_gestionados (de la tarea), clientes_pendientes (de la tarea).
     * Pestaña Estadísticas: métricas globales (esté o no el cliente en una tarea).
     * @return array{success: bool, estadisticas?: array, message?: string}
     */
    public function obtenerEstadisticasAsesor() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'estadisticas' => []];
            }
            
            $db = getDBConnection();
            $tareaModel = new Tarea();
            $tareas = $tareaModel->obtenerPorAsesor($asesorCedula);
            
            // --- Para pestaña CLIENTES: solo de la tarea ---
            $clientesAsignadosIds = [];
            foreach ($tareas as $tarea) {
                $clientes = is_array($tarea['clientes_asignados']) ? $tarea['clientes_asignados'] : [];
                $clientesAsignadosIds = array_merge($clientesAsignadosIds, $clientes);
            }
            $clientesAsignadosIds = array_unique(array_map('intval', $clientesAsignadosIds));
            $totalClientesAsignados = count($clientesAsignadosIds);
            
            $clientesGestionadosTarea = 0;
            if (!empty($clientesAsignadosIds)) {
                $placeholders = implode(',', array_fill(0, count($clientesAsignadosIds), '?'));
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT cliente_id) as total FROM historial_gestion
                    WHERE asesor_cedula = ? AND cliente_id IN ($placeholders)
                ");
                $stmt->execute(array_merge([$asesorCedula], $clientesAsignadosIds));
                $clientesGestionadosTarea = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            }
            $clientesPendientes = $totalClientesAsignados - $clientesGestionadosTarea;
            
            // --- Para pestaña ESTADÍSTICAS: global (esté o no en tarea) ---
            $inicioMes = date('Y-m-01 00:00:00');
            
            // Clientes gestionados en el mes (distintos clientes con al menos una gestión en el mes)
            $stmt = $db->prepare("
                SELECT COUNT(DISTINCT cliente_id) as total FROM historial_gestion
                WHERE asesor_cedula = ? AND fecha_creacion >= ?
            ");
            $stmt->execute([$asesorCedula, $inicioMes]);
            $clientesGestionadosMes = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // Gestiones de hoy
            $stmt = $db->prepare("
                SELECT COUNT(*) as total FROM historial_gestion
                WHERE asesor_cedula = ? AND DATE(fecha_creacion) = CURDATE()
            ");
            $stmt->execute([$asesorCedula]);
            $gestionesHoy = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // Acuerdos de pago (nivel1_tipo = 'ACUERDO DE PAGO')
            $stmt = $db->prepare("
                SELECT COUNT(*) as total FROM historial_gestion
                WHERE asesor_cedula = ? AND nivel1_tipo = 'ACUERDO DE PAGO'
            ");
            $stmt->execute([$asesorCedula]);
            $acuerdosPago = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // Tareas completadas (total, para compatibilidad)
            $stmt = $db->prepare("SELECT COUNT(*) as total FROM tareas WHERE asesor_cedula = ? AND estado = 'completa'");
            $stmt->execute([$asesorCedula]);
            $tareasCompletadas = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            // Tareas completadas en el mes
            $stmt = $db->prepare("
                SELECT COUNT(*) as total FROM tareas
                WHERE asesor_cedula = ? AND estado = 'completa' AND fecha_completa >= ?
            ");
            $stmt->execute([$asesorCedula, $inicioMes]);
            $tareasCompletadasMes = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // Contacto exitoso: llamada saliente, nivel 1 distinto de NO CONTACTO
            $stmt = $db->prepare("
                SELECT COUNT(*) as total FROM historial_gestion
                WHERE asesor_cedula = ? AND canal_contacto = 'llamada_saliente'
                AND nivel1_tipo IN ('YA PAGO', 'ACUERDO DE PAGO', 'RECORDATORIO', 'VOLUNTAD DE PAGO', 'LOCALIZADO SIN ACUERDO', 'FALLECIDO')
            ");
            $stmt->execute([$asesorCedula]);
            $contactoExitoso = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            // Llamadas realizadas: tipificación canal llamada_saliente
            $stmt = $db->prepare("
                SELECT COUNT(*) as total FROM historial_gestion
                WHERE asesor_cedula = ? AND canal_contacto = 'llamada_saliente'
            ");
            $stmt->execute([$asesorCedula]);
            $llamadasRealizadas = (int)($stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);
            
            return [
                'success' => true,
                'estadisticas' => [
                    'clientes_asignados' => $totalClientesAsignados,
                    'clientes_gestionados' => $clientesGestionadosTarea,
                    'clientes_pendientes' => $clientesPendientes,
                    'clientes_gestionados_mes' => $clientesGestionadosMes,
                    'gestiones_hoy' => $gestionesHoy,
                    'acuerdos_pago' => $acuerdosPago,
                    'tareas_completadas' => $tareasCompletadas,
                    'tareas_completadas_mes' => $tareasCompletadasMes,
                    'contacto_exitoso' => $contactoExitoso,
                    'llamadas_realizadas' => $llamadasRealizadas,
                    'valor_recuperado' => 0,
                    'meta_mensual' => 0,
                    'puntualidad' => 0
                ]
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerEstadisticasAsesor - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'estadisticas' => []];
        }
    }
    
    /**
     * Obtiene los datos de un cliente específico (solo si está asignado al asesor)
     * @return array{success: bool, cliente?: array, message?: string}
     */
    public function obtenerDatosCliente() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $clienteId = isset($_GET['cliente_id']) ? (int)$_GET['cliente_id'] : 0;
            if ($clienteId <= 0) {
                return ['success' => false, 'message' => 'ID de cliente inválido'];
            }
            
            // Verificar que el asesor tiene acceso a la base del cliente (no solo tareas asignadas)
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'Cliente no encontrado o sin acceso a esta base'];
            }
            
            // Obtener datos del cliente
            $clienteModel = new Cliente();
            $cliente = $clienteModel->obtenerPorId($clienteId);
            
            if (!$cliente) {
                return ['success' => false, 'message' => 'Cliente no encontrado'];
            }
            
            // Formatear datos para el frontend
            $datosCliente = [
                'id_cliente' => $cliente['id'],
                'id' => $cliente['id'],
                'nombre' => $cliente['nombre'],
                'cc' => $cliente['cedula'],
                'cedula' => $cliente['cedula'],
                'identificacion' => $cliente['cedula'],
                'email' => $cliente['email'] ?? '',
                'tel1' => $cliente['tel1'] ?? '',
                'tel2' => $cliente['tel2'] ?? '',
                'tel3' => $cliente['tel3'] ?? '',
                'tel4' => $cliente['tel4'] ?? '',
                'tel5' => $cliente['tel5'] ?? '',
                'tel6' => $cliente['tel6'] ?? '',
                'tel7' => $cliente['tel7'] ?? '',
                'tel8' => $cliente['tel8'] ?? '',
                'tel9' => $cliente['tel9'] ?? '',
                'tel10' => $cliente['tel10'] ?? '',
                'ciudad' => $cliente['ciudad'] ?? '',
                'sector' => $cliente['sector'] ?? '',
                'base_id' => $cliente['base_id'] ?? null
            ];
            
            return [
                'success' => true,
                'cliente' => $datosCliente
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerDatosCliente - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Obtiene las obligaciones (contratos) de un cliente específico
     * @return array{success: bool, contratos?: array, message?: string}
     */
    public function obtenerContratosCliente() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $clienteId = isset($_GET['cliente_id']) ? (int)$_GET['cliente_id'] : 0;
            if ($clienteId <= 0) {
                return ['success' => false, 'message' => 'ID de cliente inválido'];
            }
            
            // Verificar que el asesor tiene acceso a la base del cliente (no solo tareas asignadas)
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'Cliente no encontrado o sin acceso a esta base'];
            }
            
            // Obtener obligaciones del cliente
            $obligacionModel = new Obligacion();
            $obligaciones = $obligacionModel->obtenerPorCliente($clienteId);
            
            // Formatear obligaciones para el frontend
            $contratos = [];
            foreach ($obligaciones as $obligacion) {
                $contratos[] = [
                    'id_obligacion' => $obligacion['id_obligacion'] ?? $obligacion['id'] ?? 0,
                    'id' => $obligacion['id_obligacion'] ?? $obligacion['id'] ?? 0,
                    'operacion' => $obligacion['operacion'] ?? '',
                    'numero_operacion' => $obligacion['operacion'] ?? '',
                    'numero_factura' => $obligacion['operacion'] ?? '',
                    'cuenta_cliente' => $obligacion['cuenta_cliente'] ?? '',
                    'oficina' => $obligacion['oficina'] ?? '',
                    'compra' => $obligacion['compra'] ?? '',
                    'cartera' => $obligacion['cartera'] ?? '',
                    'tipo_producto' => $obligacion['tipo_producto'] ?? '',
                    'año_castigo' => $obligacion['ano_castigo'] ?? $obligacion['año_castigo'] ?? '',
                    'ano_castigo' => $obligacion['ano_castigo'] ?? '',
                    'concepto_mes_actual' => $obligacion['concepto_mes_actual'] ?? '',
                    'estado_proceso_juridico' => $obligacion['estado_proceso_juridico'] ?? '',
                    'valor_desembolso' => isset($obligacion['valor_desembolso']) ? (float)$obligacion['valor_desembolso'] : 0,
                    'saldo_capital' => isset($obligacion['saldo_capital']) ? (float)$obligacion['saldo_capital'] : 0,
                    'saldo_capital_actual' => isset($obligacion['saldo_capital_actual']) ? (float)$obligacion['saldo_capital_actual'] : 0,
                    'intereses_corrientes' => isset($obligacion['intereses_corrientes']) ? (float)$obligacion['intereses_corrientes'] : 0,
                    'intereses_mora' => isset($obligacion['intereses_mora']) ? (float)$obligacion['intereses_mora'] : 0,
                    'seguros' => isset($obligacion['seguros']) ? (float)$obligacion['seguros'] : 0,
                    'otros_conceptos' => isset($obligacion['otros_conceptos']) ? (float)$obligacion['otros_conceptos'] : 0,
                    'total_obligacion' => isset($obligacion['total_obligacion']) ? (float)$obligacion['total_obligacion'] : 0,
                    'valor_cuota' => isset($obligacion['valor_cuota']) ? (float)$obligacion['valor_cuota'] : 0,
                    'total' => isset($obligacion['total']) ? (float)$obligacion['total'] : 0,
                    'total_a_pagar' => isset($obligacion['total_a_pagar']) ? (float)$obligacion['total_a_pagar'] : 0,
                    'saldo' => isset($obligacion['total_a_pagar']) ? (float)$obligacion['total_a_pagar'] : 0,
                    'fecha_vencimiento' => $obligacion['fecha_vencimiento'] ?? '',
                    'estado' => $obligacion['estado'] ?? 'activa'
                ];
            }
            
            return [
                'success' => true,
                'contratos' => $contratos,
                'obligaciones' => $contratos, // Compatibilidad con frontend
                'facturas' => $contratos // Compatibilidad adicional
            ];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerContratosCliente - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'contratos' => []];
        }
    }
    
    /**
     * Actualiza información adicional del cliente: email (reemplazar) y/o teléfonos (solo en slots vacíos tel1-tel10).
     * Los teléfonos se insertan solo donde el valor sea null, vacío o "0". Si las 10 casillas están ocupadas, devuelve error.
     * @return array{success: bool, message?: string}
     */
    public function actualizarInfoCliente() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            if (!is_array($datos) || empty($datos['cliente_id'])) {
                return ['success' => false, 'message' => 'Datos inválidos'];
            }
            
            $clienteId = (int)$datos['cliente_id'];
            $payload = isset($datos['datos']) && is_array($datos['datos']) ? $datos['datos'] : [];
            
            if (!$this->asesorTieneAccesoAlCliente($clienteId, $asesorCedula)) {
                return ['success' => false, 'message' => 'Cliente no encontrado o sin acceso'];
            }
            
            $db = getDBConnection();
            
            // Obtener cliente actual
            $stmt = $db->prepare("SELECT id_cliente, email, tel1, tel2, tel3, tel4, tel5, tel6, tel7, tel8, tel9, tel10 FROM cliente WHERE id_cliente = ? LIMIT 1");
            $stmt->execute([$clienteId]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$cliente) {
                return ['success' => false, 'message' => 'Cliente no encontrado'];
            }
            
            $updates = [];
            $params = [];
            
            // Email: se puede reemplazar
            if (isset($payload['email']) && is_string($payload['email'])) {
                $email = trim($payload['email']);
                $updates[] = 'email = ?';
                $params[] = $email;
            }
            
            // Teléfonos: solo insertar en slots vacíos (null, '' o '0')
            $telColumns = ['tel1', 'tel2', 'tel3', 'tel4', 'tel5', 'tel6', 'tel7', 'tel8', 'tel9', 'tel10'];
            $numerosNuevos = [];
            if (!empty($payload['telefonos']) && is_array($payload['telefonos'])) {
                foreach ($payload['telefonos'] as $item) {
                    $num = is_array($item) ? trim((string)($item['numero'] ?? '')) : trim((string)$item);
                    if ($num !== '' && $num !== '0') {
                        $numerosNuevos[] = $num;
                    }
                }
            }
            
            if (!empty($numerosNuevos)) {
                $slotsVacios = [];
                foreach ($telColumns as $col) {
                    $val = $cliente[$col] ?? '';
                    if ($val === null || $val === '' || trim((string)$val) === '' || trim((string)$val) === '0') {
                        $slotsVacios[] = $col;
                    }
                }
                
                if (count($slotsVacios) === 0) {
                    return ['success' => false, 'message' => 'No se puede guardar números. Comuníquese con el administrador.'];
                }
                
                $aGuardar = array_slice($numerosNuevos, 0, count($slotsVacios));
                foreach ($aGuardar as $i => $numero) {
                    $col = $slotsVacios[$i];
                    $updates[] = "`{$col}` = ?";
                    $params[] = $numero;
                }
            }
            
            if (empty($updates)) {
                return ['success' => false, 'message' => 'No hay datos para actualizar'];
            }
            
            $params[] = $clienteId;
            $sql = "UPDATE cliente SET " . implode(', ', $updates) . " WHERE id_cliente = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            return ['success' => true, 'message' => 'Información actualizada correctamente'];
        } catch (Exception $e) {
            error_log("AsesorGestionController::actualizarInfoCliente - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Obtiene clientes filtrados del asesor (alias de obtenerClientesAsignados)
     * @return array{success: bool, clientes?: array, message?: string}
     */
    public function obtenerClientesFiltrados() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado', 'clientes' => []];
            }

            // Filtros (desde asesor_dashboard.php):
            // gestionado: '', 'gestionado', 'no_gestionado'
            // contactado: '', 'contactado', 'no_contactado' (solo aplica si gestionado='gestionado')
            // fecha: 'YYYY-MM-DD' (solo aplica si gestionado='gestionado')
            $gestionado = trim((string)($_GET['gestionado'] ?? ''));
            $contactado = trim((string)($_GET['contactado'] ?? ''));
            $fecha = trim((string)($_GET['fecha'] ?? ''));

            // Comportamiento esperado por UI:
            // - Por defecto y "no_gestionado": mostrar pendientes (dt.gestionado='no')
            // - "gestionado": mostrar gestionados (dt.gestionado='si')
            $estadoGestionado = ($gestionado === 'gestionado') ? 'si' : 'no';

            $db = getDBConnection();
            $sql = "
                SELECT DISTINCT
                    c.id_cliente,
                    c.base_id,
                    c.cedula,
                    c.nombre,
                    c.email,
                    c.tel1,
                    bc.nombre as base_nombre
                FROM detalle_tareas dt
                INNER JOIN tareas t ON t.id_tarea = dt.id_tarea AND t.asesor_cedula = :asesor_cedula
                INNER JOIN cliente c ON c.id_cliente = dt.id_cliente
                INNER JOIN base_clientes bc ON bc.id_base = c.base_id AND bc.estado = 'activo'
                INNER JOIN asignacion_base_asesores aba ON aba.base_id = c.base_id
                    AND aba.asesor_cedula = :asesor_cedula AND aba.estado = 'activa'
                WHERE dt.gestionado = :estado_gestionado
                  AND t.estado IN ('pendiente', 'en progreso')
                  AND c.estado = 'activo'
            ";
            $params = [
                ':asesor_cedula' => $asesorCedula,
                ':estado_gestionado' => $estadoGestionado,
            ];

            // Si el usuario pide "gestionado", reforzar que exista al menos una gestión del asesor para ese cliente.
            // Esto evita que aparezcan clientes marcados por error como gestionados.
            if ($estadoGestionado === 'si') {
                $sql .= " AND EXISTS (
                    SELECT 1 FROM historial_gestion hg
                    WHERE hg.cliente_id = c.id_cliente
                      AND hg.asesor_cedula = :asesor_cedula
                    LIMIT 1
                )";

                // contactado/no_contactado y fecha solo aplican para gestionados (UI lo deshabilita para no gestionados)
                if ($contactado === 'contactado') {
                    $sql .= " AND EXISTS (
                        SELECT 1 FROM historial_gestion hg2
                        WHERE hg2.cliente_id = c.id_cliente
                          AND hg2.asesor_cedula = :asesor_cedula
                          AND UPPER(TRIM(COALESCE(hg2.nivel1_tipo,''))) <> 'NO CONTACTO'
                        LIMIT 1
                    )";
                } elseif ($contactado === 'no_contactado') {
                    $sql .= " AND EXISTS (
                        SELECT 1 FROM historial_gestion hg3
                        WHERE hg3.cliente_id = c.id_cliente
                          AND hg3.asesor_cedula = :asesor_cedula
                          AND UPPER(TRIM(COALESCE(hg3.nivel1_tipo,''))) = 'NO CONTACTO'
                        LIMIT 1
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM historial_gestion hg4
                        WHERE hg4.cliente_id = c.id_cliente
                          AND hg4.asesor_cedula = :asesor_cedula
                          AND UPPER(TRIM(COALESCE(hg4.nivel1_tipo,''))) <> 'NO CONTACTO'
                        LIMIT 1
                    )";
                }

                if ($fecha !== '') {
                    // Validación básica del formato YYYY-MM-DD
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
                        $sql .= " AND EXISTS (
                            SELECT 1 FROM historial_gestion hg5
                            WHERE hg5.cliente_id = c.id_cliente
                              AND hg5.asesor_cedula = :asesor_cedula
                              AND DATE(hg5.fecha_creacion) = :fecha_gestion
                            LIMIT 1
                        )";
                        $params[':fecha_gestion'] = $fecha;
                    }
                }
            }

            $sql .= " ORDER BY c.nombre ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $clientesFormateados = [];
            foreach ($rows as $cliente) {
                $clientesFormateados[] = [
                    'id' => $cliente['id_cliente'],
                    'ID_COMERCIO' => $cliente['id_cliente'],
                    'id_cliente' => $cliente['id_cliente'],
                    'NOMBRE_COMERCIO' => $cliente['nombre'],
                    'nombre_comercio' => $cliente['nombre'],
                    'nombre' => $cliente['nombre'],
                    'NIT_CXC' => $cliente['cedula'],
                    'nit_cxc' => $cliente['cedula'],
                    'cedula' => $cliente['cedula'],
                    'CEL' => $cliente['tel1'],
                    'cel' => $cliente['tel1'],
                    'tel1' => $cliente['tel1'],
                    'email' => $cliente['email'],
                    'base_id' => $cliente['base_id'],
                    'base_nombre' => $cliente['base_nombre']
                ];
            }

            return ['success' => true, 'clientes' => $clientesFormateados];
        } catch (Exception $e) {
            error_log("AsesorGestionController::obtenerClientesFiltrados - " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'clientes' => []];
        }
    }

    /**
     * Verifica la contraseña del asesor actual
     * Se usa para validar acciones sensibles como finalizar pausas
     * @return array{success: bool, message?: string}
     */
    public function verificarContrasena() {
        try {
            $asesorCedula = $this->asesorCedula();
            if (!$asesorCedula) {
                return ['success' => false, 'message' => 'No autorizado'];
            }
            
            $input = file_get_contents('php://input');
            $datos = json_decode($input, true);
            
            if (!is_array($datos) || empty($datos['contrasena'])) {
                return ['success' => false, 'message' => 'Contraseña requerida'];
            }
            
            $contrasena = (string)$datos['contrasena'];
            
            // Obtener usuario actual con contraseña hash
            require_once __DIR__ . '/../models/Usuario.php';
            $usuarioModel = new Usuario();
            $usuario = $usuarioModel->obtenerPorCedulaConContrasena($asesorCedula);
            
            if (!$usuario || !isset($usuario['contrasena_hash'])) {
                return ['success' => false, 'message' => 'Usuario no encontrado'];
            }
            
            // Verificar contraseña
            if (!password_verify($contrasena, $usuario['contrasena_hash'])) {
                return ['success' => false, 'message' => 'Contraseña incorrecta'];
            }
            
            return ['success' => true, 'message' => 'Contraseña verificada correctamente'];
        } catch (Exception $e) {
            error_log("AsesorGestionController::verificarContrasena - " . $e->getMessage());
            return ['success' => false, 'message' => 'Error al verificar la contraseña'];
        }
    }

    /**
     * Registra bloqueo temporal del asesor por exceso de tiempo en pausa.
     * @return array{success: bool, message?: string}
     */
    public function bloquearAsesor() {
        $asesorCedula = $this->asesorCedula();
        if (!$asesorCedula) {
            return ['success' => false, 'message' => 'No autorizado'];
        }

        $input = file_get_contents('php://input');
        $datos = json_decode($input, true) ?: [];

        $_SESSION['asesor_bloqueado'] = true;
        $_SESSION['asesor_bloqueo_tipo'] = $datos['tipo_pausa'] ?? '';
        $_SESSION['asesor_bloqueo_desde'] = time();

        return ['success' => true, 'message' => 'Asesor bloqueado por exceso de tiempo en pausa'];
    }

    /**
     * Verifica si el asesor sigue bloqueado (desbloqueo manual vía sesión).
     * @return array{success: bool, desbloqueado: bool}
     */
    public function verificarEstadoBloqueo() {
        $asesorCedula = $this->asesorCedula();
        if (!$asesorCedula) {
            return ['success' => false, 'desbloqueado' => false];
        }

        $bloqueado = !empty($_SESSION['asesor_bloqueado']);
        return ['success' => true, 'desbloqueado' => !$bloqueado];
    }
}
