<?php
/**
 * Controlador para la vista admin_reportes: carga CSV de historial de gestión.
 * Valida cédula en cliente+base, asesor por nombre y operación en obligaciones.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../models/BaseCliente.php';
require_once __DIR__ . '/../models/Cliente.php';
require_once __DIR__ . '/../models/Obligacion.php';
require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../models/Tarea.php';
require_once __DIR__ . '/../models/HistorialGestion.php';
require_once __DIR__ . '/../models/Acuerdo.php';

class AdminReportesController {

    /** Columnas esperadas en el CSV (clave normalizada => nombre posible en CSV) */
    private static $COLUMNAS_CSV = [
        'fecha_gestion'   => ['fecha de gestion', 'fecha_gestion', 'fecha gestion', 'fecha'],
        'asesor'          => ['asesor'],
        'operacion'       => ['operacion', 'numero obligacion', 'numero_obligacion'],
        'cedula_cliente'  => ['cedula del cliente', 'cedula_cliente', 'cedula', 'documento'],
        'cliente'         => ['cliente', 'nombre cliente'],
        'telefono_contacto' => ['telefono de contacto', 'telefono_contacto', 'telefono', 'numero de contacto', 'numero_contacto'],
        'base'            => ['base', 'nombre base'],
        'canal_contacto'  => ['canal de contacto', 'canal_contacto', 'canal'],
        'nivel1'          => ['nivel1', 'nivel 1'],
        'nivel2'          => ['nivel2', 'nivel 2'],
        'fecha_pago'      => ['fecha de pago', 'fecha_pago'],
        'cuota'           => ['cuota'],
        'cuota_actual'    => ['cuota actual', 'cuota_actual'],
        'descuento_aplicado' => ['descuento aplicado', 'descuento_aplicado'],
        'valor_pago'      => ['valor de pago', 'valor_pago', 'valor pago'],
        'duracion'        => ['duracion'],
        'observaciones'   => ['observaciones'],
    ];

    /**
     * Lista todas las bases de clientes (admin tiene acceso a todas).
     * @return array{success: bool, bases?: array, message?: string}
     */
    public function obtenerBases() {
        try {
            $baseModel = new BaseCliente();
            if (!$baseModel->tablaExiste()) {
                return ['success' => false, 'message' => 'La tabla de bases no está disponible.'];
            }
            $bases = $baseModel->obtenerTodas();
            $activas = array_filter($bases, function ($b) {
                return strtolower($b['estado'] ?? '') === 'activo';
            });
            return ['success' => true, 'bases' => array_values($activas)];
        } catch (Exception $e) {
            error_log('AdminReportesController::obtenerBases - ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Procesa la carga de un CSV de historial de gestión.
     * Valida: cédula en cliente con la base seleccionada; asesor por nombre; operación en obligaciones.
     * Crea tareas "Historial importado (reportes)" por (base_id, asesor) si no existen.
     * @return array{success: bool, total_insertados?: int, ids?: int[], errores?: array, message?: string}
     */
    public function procesarCargaCsv() {
        $baseId = isset($_POST['base_id']) ? (int) $_POST['base_id'] : 0;
        if ($baseId <= 0) {
            return ['success' => false, 'message' => 'Debe seleccionar una base de clientes.'];
        }
        if (empty($_FILES['archivo_csv']) || $_FILES['archivo_csv']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No se recibió el archivo CSV o hubo un error en la subida.'];
        }
        $tmpPath = $_FILES['archivo_csv']['tmp_name'];
        if (!is_readable($tmpPath)) {
            return ['success' => false, 'message' => 'No se pudo leer el archivo subido.'];
        }

        $baseModel = new BaseCliente();
        $base = $baseModel->obtenerPorId($baseId);
        if (!$base) {
            return ['success' => false, 'message' => 'La base seleccionada no existe.'];
        }

        $clienteModel = new Cliente();
        $obligacionModel = new Obligacion();
        $usuarioModel = new Usuario();
        $tareaModel = new Tarea();
        $historialModel = new HistorialGestion();
        $acuerdoModel = new Acuerdo();

        $asesoresPorNombre = []; // nombre normalizado => cedula
        foreach ($usuarioModel->obtenerTodos() as $u) {
            if (strtolower($u['rol'] ?? '') !== 'asesor') continue;
            $n = $this->normalizarTexto($u['nombre'] ?? '');
            $asesoresPorNombre[$n] = $u['cedula'];
        }

        $coordinadorCedula = $this->obtenerCoordinadorParaTarea($base);
        $tareasImportPorAsesor = []; // asesor_cedula => id_tarea

        $filas = $this->parsearCsv($tmpPath);
        if (empty($filas)) {
            return ['success' => false, 'message' => 'El archivo CSV está vacío o no tiene filas de datos.'];
        }

        $idsInsertados = [];
        $errores = [];
        $insertados = 0;

        foreach ($filas as $numFila => $row) {
            $numFilaHumano = $numFila + 1;
            $v = function ($key) use ($row) {
                $val = $row[$key] ?? '';
                return is_string($val) ? trim($val) : (string) $val;
            };

            $cedulaCliente = $v('cedula_cliente');
            $nombreAsesor = $v('asesor');
            $operacion = $v('operacion');
            $canalContacto = $v('canal_contacto');
            $nivel1 = $v('nivel1');
            $nivel2 = $v('nivel2');
            $telefonoContacto = $v('telefono_contacto');
            $observaciones = $v('observaciones');
            $duracion = $this->parsearDuracionSegundos($v('duracion'));
            $fechaPago = $this->parsearFecha($v('fecha_pago'));
            $cuota = $this->parsearDecimal($v('cuota'));
            $cuotaActual = $this->parsearDecimal($v('cuota_actual'));
            $descuentoAplicado = $this->parsearDecimal($v('descuento_aplicado'));
            $valorPago = $this->parsearDecimal($v('valor_pago'));
            $fechaGestion = $this->parsearFechaHora($v('fecha_gestion'));

            if ($cedulaCliente === '' || $nombreAsesor === '') {
                $errores[] = "Fila $numFilaHumano: faltan cédula del cliente o asesor.";
                continue;
            }

            $cliente = $clienteModel->obtenerPorCedulaYBase($cedulaCliente, $baseId);
            if (!$cliente) {
                $errores[] = "Fila $numFilaHumano: la cédula $cedulaCliente no existe en la base seleccionada.";
                continue;
            }

            $asesorCedula = $asesoresPorNombre[$this->normalizarTexto($nombreAsesor)] ?? null;
            if (!$asesorCedula) {
                $errores[] = "Fila $numFilaHumano: el asesor \"$nombreAsesor\" no existe en el sistema.";
                continue;
            }

            // Obligación: si operacion está vacía o es "ninguna", usar la primera obligación del cliente
            // (igual que en asesor_gestionar cuando el asesor no escoge ninguna obligación a gestionar)
            $obligacion = null;
            if ($operacion !== '' && $this->normalizarTexto($operacion) !== 'ninguna') {
                $obligacion = $obligacionModel->obtenerPorOperacionYBase($operacion, $baseId);
                if (!$obligacion) {
                    $errores[] = "Fila $numFilaHumano: la operación $operacion no existe en esta base.";
                    continue;
                }
                if ((int) ($obligacion['cliente_id'] ?? 0) !== (int) $cliente['id']) {
                    $errores[] = "Fila $numFilaHumano: la operación $operacion no corresponde al cliente con cédula $cedulaCliente.";
                    continue;
                }
            } else {
                $obligacionesCliente = $obligacionModel->obtenerPorCliente($cliente['id']);
                if (empty($obligacionesCliente) || !isset($obligacionesCliente[0]['id_obligacion'])) {
                    $errores[] = "Fila $numFilaHumano: el cliente con cédula $cedulaCliente no tiene obligaciones en esta base; no se puede guardar gestión sin obligación.";
                    continue;
                }
                $obligacion = $obligacionesCliente[0];
            }

            if (!isset($tareasImportPorAsesor[$asesorCedula])) {
                $idTarea = $this->obtenerOCrearTareaImportacion($tareaModel, $baseId, $asesorCedula, $coordinadorCedula);
                if (!$idTarea) {
                    $errores[] = "Fila $numFilaHumano: no se pudo crear la tarea de importación para el asesor.";
                    continue;
                }
                $tareasImportPorAsesor[$asesorCedula] = $idTarea;
            }
            $idTarea = $tareasImportPorAsesor[$asesorCedula];

            $numeroContacto = $telefonoContacto !== '' ? $telefonoContacto : (!empty($cliente['tel1']) ? $cliente['tel1'] : '');

            $idObligacion = $this->extraerIdObligacion($obligacion);
            if ($idObligacion <= 0) {
                $errores[] = "Fila $numFilaHumano: no se pudo obtener id de obligación para el cliente.";
                continue;
            }

            $canalLower = strtolower($canalContacto);
            $llamada = (strpos($canalLower, 'llamada') !== false || strpos($canalLower, 'telefono') !== false) ? 'si' : 'no';
            $email = (strpos($canalLower, 'email') !== false || strpos($canalLower, 'correo') !== false) ? 'si' : 'no';
            $sms = (strpos($canalLower, 'sms') !== false) ? 'si' : 'no';
            $whatsapp = (strpos($canalLower, 'whatsapp') !== false) ? 'si' : 'no';
            $correoFisico = (strpos($canalLower, 'fisico') !== false || strpos($canalLower, 'carta') !== false) ? 'si' : 'no';

            $datos = [
                'asesor_cedula'     => $asesorCedula,
                'id_tarea'          => $idTarea,
                'cliente_id'        => $cliente['id'],
                'obligacion_id'     => $idObligacion,
                'canal_contacto'    => $canalContacto !== '' ? $canalContacto : 'otro',
                'nivel1_tipo'       => $nivel1 !== '' ? $nivel1 : 'N/A',
                'nivel2_tipo'       => $nivel2 !== '' ? $nivel2 : 'N/A',
                'nivel3_tipo'       => '',
                'nivel4_tipo'       => '',
                'observaciones'    => $observaciones,
                'llamada_telefonica' => $llamada,
                'email'            => $email,
                'sms'              => $sms,
                'correo_fisico'    => $correoFisico,
                'whatsapp'         => $whatsapp,
                'fecha_pago'        => $fechaPago,
                'cuota'             => $cuota,
                'cuota_actual'      => $cuotaActual,
                'valor_pago'        => $valorPago,
                'numero_contacto'   => $numeroContacto,
                'duracion_segundos' => $duracion >= 0 ? $duracion : 0,
            ];
            if ($fechaGestion) {
                $datos['fecha_creacion'] = $fechaGestion;
            }

            $res = $historialModel->crear($datos);
            if ($res['success'] && !empty($res['id_gestion'])) {
                $idGestion = (int) $res['id_gestion'];
                $idsInsertados[] = $idGestion;
                $insertados++;
                $this->crearAcuerdoDesdeCsv(
                    $acuerdoModel,
                    $idGestion,
                    $nivel1,
                    $nivel2,
                    $valorPago,
                    $cuota,
                    $cuotaActual,
                    $descuentoAplicado,
                    $fechaPago
                );
            } else {
                $errores[] = "Fila $numFilaHumano: " . ($res['message'] ?? 'Error al insertar.');
            }
        }

        return [
            'success'          => true,
            'total_insertados'  => $insertados,
            'ids'               => $idsInsertados,
            'errores'           => $errores,
            'total_filas'       => count($filas),
        ];
    }

    private function normalizarTexto($s) {
        $s = trim((string) $s);
        $s = preg_replace('/\s+/', ' ', $s);
        return mb_strtolower($s, 'UTF-8');
    }

    private function parsearCsv($ruta) {
        $filas = [];
        $headers = null;
        $map = []; // índice columna => clave normalizada

        $handle = fopen($ruta, 'rb');
        if (!$handle) return [];

        $primera = fgetcsv($handle, 0, ',', '"', '\\');
        if ($primera === false) {
            fclose($handle);
            return [];
        }
        $headers = array_map('trim', $primera);
        if (isset($headers[0])) {
            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);
        }
        foreach (self::$COLUMNAS_CSV as $clave => $nombres) {
            foreach ($headers as $idx => $nombreArchivo) {
                $n = $this->normalizarTexto($nombreArchivo);
                foreach ($nombres as $alias) {
                    if ($n === $this->normalizarTexto($alias)) {
                        $map[$clave] = $idx;
                        break 2;
                    }
                }
            }
        }
        if (empty($map)) {
            fclose($handle);
            return [];
        }

        while (($row = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            $fila = [];
            foreach ($map as $clave => $idx) {
                $fila[$clave] = isset($row[$idx]) ? $row[$idx] : '';
            }
            if (array_filter($fila)) {
                $filas[] = $fila;
            }
        }
        fclose($handle);
        return $filas;
    }

    private function parsearFecha($s) {
        $fecha = $this->crearDateTimeFlexible($s, false);
        return $fecha ? $fecha->format('Y-m-d') : null;
    }

    private function parsearFechaHora($s) {
        $fecha = $this->crearDateTimeFlexible($s, true);
        return $fecha ? $fecha->format('Y-m-d H:i:s') : null;
    }

    /**
     * Interpreta fechas priorizando formatos con día primero para evitar ambigüedad.
     * Acepta también formatos ISO si el CSV ya viene en Y-m-d.
     */
    private function crearDateTimeFlexible($s, $conHora = false) {
        $s = trim((string) $s);
        if ($s === '') {
            return null;
        }

        $formatos = $conHora
            ? [
                'd/m/Y H:i:s', 'd/m/Y H:i',
                'd-m-Y H:i:s', 'd-m-Y H:i',
                'd.m.Y H:i:s', 'd.m.Y H:i',
                'Y-m-d H:i:s', 'Y-m-d H:i',
                'Y/m/d H:i:s', 'Y/m/d H:i',
            ]
            : [
                'd/m/Y', 'd-m-Y', 'd.m.Y',
                'Y-m-d', 'Y/m/d',
            ];

        foreach ($formatos as $formato) {
            $dt = \DateTime::createFromFormat($formato, $s);
            $errores = \DateTime::getLastErrors();
            if ($dt instanceof \DateTime && ($errores['warning_count'] ?? 0) === 0 && ($errores['error_count'] ?? 0) === 0) {
                return $dt;
            }
        }

        $ts = strtotime($s);
        if ($ts === false) {
            return null;
        }

        $dt = new \DateTime();
        $dt->setTimestamp($ts);
        return $dt;
    }

    private function parsearDecimal($s) {
        $s = trim((string) $s);
        if ($s === '') return null;
        $s = preg_replace('/[^\d,.\-]/', '', $s);
        if ($s === '' || $s === '-' || $s === '.' || $s === ',') {
            return null;
        }

        if (preg_match('/^-?\d{1,3}(\.\d{3})+(,\d+)?$/', $s)) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } elseif (preg_match('/^-?\d{1,3}(,\d{3})+(\.\d+)?$/', $s)) {
            $s = str_replace(',', '', $s);
        } elseif (strpos($s, ',') !== false && strpos($s, '.') === false) {
            $s = str_replace(',', '.', $s);
        }

        return is_numeric($s) ? (float) $s : null;
    }

    private function parsearDuracionSegundos($s) {
        $s = trim((string) $s);
        if ($s === '') {
            return 0;
        }
        if (ctype_digit($s)) {
            return (int) $s;
        }
        if (preg_match('/^(\d+):(\d{2}):(\d{2})$/', $s, $m)) {
            return ((int) $m[1] * 3600) + ((int) $m[2] * 60) + (int) $m[3];
        }
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $s, $m)) {
            return ((int) $m[1] * 60) + (int) $m[2];
        }
        return (int) preg_replace('/\D/', '', $s);
    }

    private function crearAcuerdoDesdeCsv(
        Acuerdo $acuerdoModel,
        int $idGestion,
        string $nivel1,
        string $nivel2,
        ?float $valorPago,
        ?float $cuota,
        ?float $cuotaActual,
        ?float $descuentoAplicado,
        ?string $fechaPago
    ) {
        $nivel1Norm = $this->normalizarTexto($nivel1);
        if ($nivel1Norm !== 'acuerdo de pago') {
            return;
        }

        $nivel2Norm = $this->normalizarTexto($nivel2);
        $tipoAcuerdo = null;
        $datosAcuerdo = [];

        if (strpos($nivel2Norm, 'total') !== false || $descuentoAplicado !== null) {
            $tipoAcuerdo = 'total';
            $datosAcuerdo = [
                'valor_original' => ($valorPago !== null && $descuentoAplicado !== null) ? ($valorPago + $descuentoAplicado) : null,
                'descuento_aplicado' => $descuentoAplicado,
                'valor_final_pago_total' => $valorPago,
                'fecha_limite_pago' => $fechaPago,
            ];
        } elseif ($cuota !== null || $cuotaActual !== null) {
            $tipoAcuerdo = 'cuotas';
            $datosAcuerdo = [
                'valor_original' => $cuotaActual,
                'numero_cuotas' => 1,
                'valor_cuota_mensual' => $cuota,
                'periodicidad' => 'mensual',
            ];
        } elseif (strpos($nivel2Norm, 'comite') !== false || strpos($nivel2Norm, 'propuesta') !== false || strpos($nivel2Norm, 'estudio') !== false) {
            $tipoAcuerdo = 'comite';
            $datosAcuerdo = [
                'valor_original' => $valorPago ?? $cuotaActual,
                'estado_aprobacion' => 'pendiente',
            ];
        }

        if ($tipoAcuerdo === null) {
            return;
        }

        $res = $acuerdoModel->crear($idGestion, $tipoAcuerdo, $datosAcuerdo);
        if (!$res['success']) {
            error_log('AdminReportesController::crearAcuerdoDesdeCsv - ' . ($res['message'] ?? 'No se pudo crear acuerdo desde CSV'));
        }
    }

    private function obtenerCoordinadorParaTarea($base) {
        $db = getDBConnection();
        $baseId = (int) ($base['id'] ?? 0);
        $creadoPor = null;
        if ($baseId > 0) {
            $st = $db->prepare("SELECT creado_por FROM base_clientes WHERE id_base = ? LIMIT 1");
            $st->execute([$baseId]);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            $creadoPor = $r['creado_por'] ?? null;
        }
        if ($creadoPor) {
            $stmt = $db->prepare("SELECT cedula, rol FROM usuarios WHERE cedula = ? AND estado = 'Activo'");
            $stmt->execute([$creadoPor]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($u && strtolower($u['rol'] ?? '') === 'coordinador') {
                return $u['cedula'];
            }
        }
        $stmt = $db->query("SELECT cedula FROM usuarios WHERE rol = 'coordinador' AND estado = 'Activo' LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row['cedula'];
        $stmt = $db->query("SELECT cedula FROM usuarios WHERE rol = 'administrador' LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['cedula'] : ($_SESSION['usuario_cedula'] ?? $_SESSION['usuario_id'] ?? '');
    }

    private function obtenerOCrearTareaImportacion(Tarea $tareaModel, $baseId, $asesorCedula, $coordinadorCedula) {
        $db = getDBConnection();
        $nombreBuscar = 'Historial importado (reportes)';
        $stmt = $db->prepare("
            SELECT id_tarea FROM tareas 
            WHERE base_id = ? AND asesor_cedula = ? AND nombre_tarea = ? 
            ORDER BY id_tarea DESC LIMIT 1
        ");
        $stmt->execute([$baseId, $asesorCedula, $nombreBuscar]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (int) $row['id_tarea'];
        }
        $id = $tareaModel->crear([
            'nombre_tarea'        => $nombreBuscar,
            'coordinador_cedula'  => $coordinadorCedula,
            'asesor_cedula'       => $asesorCedula,
            'base_id'             => $baseId,
            'clientes_asignados'  => '[]',
            'obligaciones_asignadas' => '[]',
        ]);
        if ($id) {
            $db->prepare("UPDATE tareas SET estado = 'completa' WHERE id_tarea = ?")->execute([$id]);
            return (int) $id;
        }
        return null;
    }

    /**
     * Obtiene el id_obligacion de una fila (evita undefined key con distinto casing del driver PDO).
     * @param array $row Fila de obligaciones (obtenerPorCliente u obtenerPorOperacionYBase)
     * @return int 0 si no se encuentra
     */
    private function extraerIdObligacion(array $row) {
        if (isset($row['id_obligacion']) && $row['id_obligacion'] !== '' && $row['id_obligacion'] !== null) {
            return (int) $row['id_obligacion'];
        }
        if (isset($row['id']) && $row['id'] !== '' && $row['id'] !== null) {
            return (int) $row['id'];
        }
        $rowLower = array_change_key_case($row, CASE_LOWER);
        if (isset($rowLower['id_obligacion']) && $rowLower['id_obligacion'] !== '' && $rowLower['id_obligacion'] !== null) {
            return (int) $rowLower['id_obligacion'];
        }
        return 0;
    }
}
