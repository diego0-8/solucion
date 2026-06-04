<?php
/**
 * Helper de carga de CSV de clientes/obligaciones.
 *
 * Centraliza la lectura del archivo, la detección del separador, el mapeo de
 * encabezados (plantilla simplificada y exportación "Soluciona") y la
 * normalización de montos/fechas/judicialización.
 *
 * Las claves estándar que produce el mapeo son las que consumen los modelos
 * Cliente y Obligacion: operacion, cuenta, oficina, cedula, nombre, ciudad,
 * email, email_2..email_5, años_castigo, concepto_mes_actual,
 * estado_proceso_juridico, total, total_a_pagar, tel1..tel10.
 */
class CsvCargaHelper {

    /**
     * A partir de cuántas columnas se asume formato "Soluciona" (mapeo solo por
     * nombre, sin caer en los fallbacks posicionales de la plantilla simple).
     */
    const UMBRAL_COLUMNAS_SOLUCIONA = 25;

    /**
     * Lee un CSV soportando campos entre comillas con saltos de línea internos.
     *
     * @return array{headers: array<int,string>, rows: array<int,array<int,string>>}
     */
    public static function leerFilasCsv($ruta, $sep = ',', $encoding = 'utf-8') {
        $content = @file_get_contents($ruta);
        if (!is_string($content) || $content === '') {
            return ['headers' => [], 'rows' => []];
        }
        if (strtolower((string) $encoding) !== 'utf-8') {
            $content = @mb_convert_encoding($content, 'UTF-8', $encoding) ?: $content;
        } elseif (!mb_check_encoding($content, 'UTF-8')) {
            // El usuario indicó UTF-8 pero el archivo viene en ANSI/Windows-1252
            // (común en exportaciones de Excel). Convertir para no perder acentos.
            $content = @mb_convert_encoding($content, 'UTF-8', 'Windows-1252') ?: $content;
        }
        // Quitar BOM UTF-8 al inicio del archivo.
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $content);
        rewind($handle);

        $headers = fgetcsv($handle, 0, $sep, '"', '\\');
        if ($headers === false) {
            fclose($handle);
            return ['headers' => [], 'rows' => []];
        }
        $headers = array_map(static function ($h) {
            return trim((string) $h);
        }, $headers);

        $rows = [];
        while (($row = fgetcsv($handle, 0, $sep, '"', '\\')) !== false) {
            // fgetcsv devuelve [null] en líneas totalmente vacías.
            if ($row === [null]) {
                continue;
            }
            $rows[] = $row;
        }
        fclose($handle);

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * Detecta el separador más probable a partir de la primera línea.
     */
    public static function detectarSeparador($muestra) {
        $muestra = (string) $muestra;
        $primeraLinea = strtok($muestra, "\r\n");
        if ($primeraLinea === false) {
            $primeraLinea = $muestra;
        }
        $puntoYComa = substr_count($primeraLinea, ';');
        $coma = substr_count($primeraLinea, ',');
        $tab = substr_count($primeraLinea, "\t");
        $pipe = substr_count($primeraLinea, '|');

        $maximo = max($puntoYComa, $coma, $tab, $pipe);
        if ($maximo === 0) {
            return ',';
        }
        if ($maximo === $tab) {
            return "\t";
        }
        if ($maximo === $puntoYComa) {
            return ';';
        }
        if ($maximo === $pipe) {
            return '|';
        }
        return ',';
    }

    /**
     * Convierte un texto numérico en formato Colombia a float.
     * "141.214.141" => 141214141.0 ; "231.310,50" => 231310.50
     */
    public static function parsearDecimalColombia($s) {
        $s = trim((string) $s);
        if ($s === '' || $s === '-') {
            return 0.0;
        }
        $s = preg_replace('/[^\d,.\-]/', '', $s);
        if ($s === '' || $s === '-' || $s === '.' || $s === ',') {
            return 0.0;
        }

        if (preg_match('/^-?\d{1,3}(\.\d{3})+(,\d+)?$/', $s)) {
            // Miles con punto, decimal con coma.
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } elseif (preg_match('/^-?\d{1,3}(,\d{3})+(\.\d+)?$/', $s)) {
            // Miles con coma, decimal con punto.
            $s = str_replace(',', '', $s);
        } elseif (strpos($s, ',') !== false && strpos($s, '.') === false) {
            // Solo coma: decimal.
            $s = str_replace(',', '.', $s);
        }

        return is_numeric($s) ? (float) $s : 0.0;
    }

    /**
     * Extrae el año de una fecha (dd/mm/yyyy, yyyy-mm-dd) o de un año suelto.
     * Devuelve cadena vacía si no encuentra un año plausible.
     */
    public static function extraerAnioCastigo($fecha) {
        $fecha = trim((string) $fecha);
        if ($fecha === '' || $fecha === '-') {
            return '';
        }
        if (preg_match_all('/\d{4}/', $fecha, $m)) {
            foreach ($m[0] as $cand) {
                $y = (int) $cand;
                if ($y >= 1950 && $y <= 2100) {
                    return (string) $y;
                }
            }
        }
        return '';
    }

    /**
     * Normaliza el estado de judicialización al ENUM de la BD.
     * "Si" => JUDICIALIZADO ; "No" => NO JUDICIALIZADO ; null si no se reconoce.
     */
    public static function normalizarJudicializacion($valor) {
        $v = strtolower(trim((string) $valor));
        if ($v === '' || $v === '-') {
            return null;
        }
        $v = str_replace(['í', 'á', 'é', 'ó', 'ú'], ['i', 'a', 'e', 'o', 'u'], $v);
        if (in_array($v, ['si', 's', '1', 'judicializado', 'si judicializado'], true)) {
            return 'JUDICIALIZADO';
        }
        if (in_array($v, ['no', 'n', '0', 'no judicializado'], true)) {
            return 'NO JUDICIALIZADO';
        }
        if (strpos($v, 'no judicializado') !== false) {
            return 'NO JUDICIALIZADO';
        }
        if (strpos($v, 'judicializado') !== false) {
            return 'JUDICIALIZADO';
        }
        return null;
    }

    /**
     * Normaliza un encabezado: minúsculas, sin acentos, sin signos, espacios colapsados.
     */
    private static function normalizarEncabezado($raw) {
        $h = trim((string) $raw);
        // Quitar BOM y unificar saltos de línea internos como espacio.
        $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
        $h = str_replace(["\r", "\n", "\t"], ' ', $h);
        $h = mb_strtolower($h, 'UTF-8');
        $h = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'],
            ['a', 'e', 'i', 'o', 'u', 'n', 'u'],
            $h
        );
        // Conservar solo letras, dígitos y espacios.
        $h = preg_replace('/[^a-z0-9 ]+/', ' ', $h);
        $h = preg_replace('/\s+/', ' ', $h);
        return trim($h);
    }

    /**
     * Mapea encabezados del CSV a claves estándar => índice de columna.
     * Soporta la plantilla simplificada y la exportación Soluciona.
     *
     * @param array<int,string> $headers
     * @return array<string,int>
     */
    public static function mapearEncabezados(array $headers) {
        $aliases = [
            'operacion' => ['no operacion', 'no de operacion', 'numero operacion', 'operacion', 'operación'],
            'cuenta' => ['cuenta cliente carteras', 'cuenta cliente', 'cuenta cleinte', 'cuenta'],
            'ident_credito' => ['ident credito', 'ident. credito', 'identificacion credito'],
            'tipo_cliente' => ['tipo cliente'],
            'dueno_cartera' => ['dueno cartera', 'dueño cartera'],
            'cartera' => ['cartera'],
            'compra' => ['compra'],
            'oficina' => ['oficina'],
            'tipo_producto' => ['tipo producto'],
            'valor_desembolso' => ['valor desembolso'],
            'saldo_capital' => ['saldo capital'],
            'saldo_capital_actual' => ['saldo de capital actual', 'saldo capital actual'],
            'intereses_corrientes' => ['intereses corrientes', 'intereses corriente'],
            'intereses_mora' => ['intereses de mora', 'intereses mora'],
            'seguros' => ['seguros'],
            'otros_conceptos' => ['otros conceptos'],
            'total_obligacion' => ['total obligacion', 'total obligación'],
            'valor_cuota' => ['valor cuota'],
            'reestructurado' => ['reestructurado'],
            'tasa' => ['tasa'],
            'cuotas_pactadas' => ['cuotas pactadas'],
            'cuotas_pagadas' => ['cuotas pagadas'],
            'cuotas_restantes' => ['cuotas restantes'],
            'fecha_desembolso' => ['fecha desembolso'],
            'fecha_inicio_mora' => ['fecha inicio mora'],
            'fecha_vencimiento_final' => ['fecha vencimiento final'],
            'fecha_castigo' => ['fecha castigo'],
            'fecha_ultimo_pago' => ['fecha ultimo pago'],
            'fecha_dias_mora' => ['fecha dias mora', 'fecha días mora'],
            'ciudad_origen_credito' => ['cidudad origen credito', 'ciudad origen credito'],
            'cedula' => ['identificacion', 'cedula', 'identificacion cliente'],
            'nombre' => ['nombre cliente', 'nombre'],
            'ciudad' => ['ciudad'],
            'sector' => ['sector'],
            'email' => ['email 1', 'email1', 'email', 'correo', 'correo electronico'],
            'email_2' => ['email 2', 'email2'],
            'email_3' => ['email 3', 'email3'],
            'email_4' => ['email 4', 'email4'],
            'email_5' => ['email 5', 'email5'],
            'años_castigo' => ['fecha castigo', 'fecha de castigo', 'año de castigo', 'anos castigo', 'ano castigo', 'anos de castigo', 'años castigo'],
            'concepto_mes_actual' => ['concepto mes actual', 'etapa del proceso judicial'],
            'estado_proceso_juridico' => ['judicializacion', 'estado proceso juridico', 'estado proceso jurídico'],
            'total' => ['saldo capital', 'total'],
            'total_a_pagar' => ['total obligacion', 'total a pagar', 'total obligación'],
        ];
        // Celular 1..7 => tel1..tel7 ; Telefono 1..3 => tel8..tel10.
        for ($i = 1; $i <= 7; $i++) {
            $aliases['tel' . $i] = ['celular ' . $i, 'tel' . $i];
        }
        for ($i = 1; $i <= 3; $i++) {
            $aliases['tel' . ($i + 7)] = ['telefono ' . $i, 'tel' . ($i + 7)];
        }

        // Pre-normalizar todos los encabezados una sola vez.
        $headersNorm = [];
        foreach ($headers as $i => $raw) {
            $headersNorm[$i] = self::normalizarEncabezado($raw);
        }

        $map = [];
        $usados = [];
        foreach ($aliases as $clave => $variantes) {
            $variantesNorm = array_map([self::class, 'normalizarEncabezado'], $variantes);
            foreach ($headersNorm as $i => $hNorm) {
                if (isset($usados[$i])) {
                    continue;
                }
                if (in_array($hNorm, $variantesNorm, true)) {
                    $map[$clave] = $i;
                    $usados[$i] = true;
                    break;
                }
            }
        }

        // Legacy: oficina = compra si existe (plantilla antigua).
        foreach ($headersNorm as $i => $hNorm) {
            if ($hNorm === 'compra' && !isset($map['oficina'])) {
                $map['oficina'] = $i;
                break;
            }
        }

        // Fallbacks posicionales SOLO para la plantilla simplificada (<= 25 columnas).
        if (count($headers) <= self::UMBRAL_COLUMNAS_SOLUCIONA) {
            $posiciones = [
                'operacion' => 0, 'cuenta' => 1, 'oficina' => 2, 'cedula' => 3,
                'nombre' => 4, 'años_castigo' => 5, 'concepto_mes_actual' => 6,
                'estado_proceso_juridico' => 7, 'total' => 8, 'total_a_pagar' => 9,
                'email' => 10, 'tel1' => 11, 'tel2' => 12, 'tel3' => 13, 'tel4' => 14,
            ];
            foreach ($posiciones as $clave => $idx) {
                if (!isset($map[$clave]) && isset($headers[$idx]) && !isset($usados[$idx])) {
                    $map[$clave] = $idx;
                    $usados[$idx] = true;
                }
            }
        }

        // Alias legacy: mismas columnas Soluciona bajo nombres antiguos del CRM.
        if (!isset($map['total']) && isset($map['saldo_capital'])) {
            $map['total'] = $map['saldo_capital'];
        }
        if (!isset($map['total_a_pagar']) && isset($map['total_obligacion'])) {
            $map['total_a_pagar'] = $map['total_obligacion'];
        }
        if (!isset($map['años_castigo']) && isset($map['fecha_castigo'])) {
            $map['años_castigo'] = $map['fecha_castigo'];
        }
        if (!isset($map['concepto_mes_actual']) && isset($map['tipo_producto'])) {
            $map['concepto_mes_actual'] = $map['tipo_producto'];
        }

        return $map;
    }

    /**
     * Construye una fila de datos estándar (clave => valor) a partir de una fila
     * cruda del CSV y el mapa de encabezados.
     *
     * @param array<int,string> $row
     * @param array<string,int> $map
     * @return array<string,string>
     */
    public static function extraerDatosFila(array $row, array $map) {
        $data = [];
        foreach ($map as $clave => $idx) {
            $raw = isset($row[$idx]) ? $row[$idx] : '';
            $data[$clave] = trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $raw));
        }
        return $data;
    }

    /**
     * Devuelve el primer email no vacío entre email y email_2..email_5.
     */
    public static function primerEmail(array $data) {
        foreach (['email', 'email_2', 'email_3', 'email_4', 'email_5'] as $k) {
            $v = trim((string) ($data[$k] ?? ''));
            if ($v !== '' && $v !== '-') {
                return $v;
            }
        }
        return '';
    }

    /**
     * Convierte fecha dd/mm/yyyy o yyyy-mm-dd a yyyy-mm-dd; null si vacía o inválida.
     */
    public static function parsearFechaCsv($fecha) {
        $fecha = trim((string) $fecha);
        if ($fecha === '' || $fecha === '-') {
            return null;
        }
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $m)) {
            return $m[1] . '-' . $m[2] . '-' . $m[3];
        }
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $fecha, $m)) {
            return sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
        }
        return null;
    }

    /**
     * Limpia texto CSV: vacío o "-" => cadena vacía.
     */
    public static function limpiarTextoCsv($valor) {
        $v = trim((string) $valor);
        return ($v === '' || $v === '-') ? '' : $v;
    }

    /**
     * Construye el array completo de obligación desde una fila mapeada del CSV Soluciona.
     *
     * @param array<string,string> $data fila mapeada (extraerDatosFila)
     * @param int $baseId
     * @param int $clienteId
     * @return array<string,mixed>
     */
    public static function construirDatosObligacion(array $data, $baseId, $clienteId) {
        $operacion = trim(preg_replace('/\s+/', '', $data['operacion'] ?? ''));
        $compra = self::limpiarTextoCsv($data['compra'] ?? '');
        $cartera = self::limpiarTextoCsv($data['cartera'] ?? '');
        $tipoProducto = self::limpiarTextoCsv($data['tipo_producto'] ?? '');
        $saldoCapital = self::parsearDecimalColombia($data['saldo_capital'] ?? '0');
        $saldoCapitalActual = self::parsearDecimalColombia($data['saldo_capital_actual'] ?? $data['saldo_capital'] ?? '0');
        $totalObligacion = self::parsearDecimalColombia($data['total_obligacion'] ?? $data['total_a_pagar'] ?? '0');
        $fechaCastigo = self::parsearFechaCsv($data['fecha_castigo'] ?? $data['años_castigo'] ?? '');

        $estadoJur = self::normalizarJudicializacion($data['estado_proceso_juridico'] ?? '');

        return [
            'operacion' => $operacion,
            'base_id' => (int) $baseId,
            'cliente_id' => (int) $clienteId,
            'cuenta_cliente' => self::limpiarTextoCsv($data['cuenta'] ?? $data['cuenta_cliente'] ?? ''),
            'ident_credito' => self::limpiarTextoCsv($data['ident_credito'] ?? ''),
            'tipo_cliente' => self::limpiarTextoCsv($data['tipo_cliente'] ?? ''),
            'dueno_cartera' => self::limpiarTextoCsv($data['dueno_cartera'] ?? ''),
            'cartera' => $cartera,
            'compra' => $compra,
            'tipo_producto' => $tipoProducto,
            'valor_desembolso' => self::parsearDecimalColombia($data['valor_desembolso'] ?? '0'),
            'saldo_capital' => $saldoCapital,
            'saldo_capital_actual' => $saldoCapitalActual,
            'intereses_corrientes' => self::parsearDecimalColombia($data['intereses_corrientes'] ?? '0'),
            'intereses_mora' => self::parsearDecimalColombia($data['intereses_mora'] ?? '0'),
            'seguros' => self::parsearDecimalColombia($data['seguros'] ?? '0'),
            'otros_conceptos' => self::parsearDecimalColombia($data['otros_conceptos'] ?? '0'),
            'total_obligacion' => $totalObligacion,
            'valor_cuota' => self::parsearDecimalColombia($data['valor_cuota'] ?? '0'),
            'reestructurado' => self::limpiarTextoCsv($data['reestructurado'] ?? ''),
            'tasa' => self::limpiarTextoCsv($data['tasa'] ?? ''),
            'cuotas_pactadas' => self::limpiarTextoCsv($data['cuotas_pactadas'] ?? ''),
            'cuotas_pagadas' => self::limpiarTextoCsv($data['cuotas_pagadas'] ?? ''),
            'cuotas_restantes' => self::limpiarTextoCsv($data['cuotas_restantes'] ?? ''),
            'fecha_desembolso' => self::parsearFechaCsv($data['fecha_desembolso'] ?? ''),
            'fecha_inicio_mora' => self::parsearFechaCsv($data['fecha_inicio_mora'] ?? ''),
            'fecha_vencimiento_final' => self::parsearFechaCsv($data['fecha_vencimiento_final'] ?? ''),
            'fecha_castigo' => $fechaCastigo,
            'fecha_ultimo_pago' => self::parsearFechaCsv($data['fecha_ultimo_pago'] ?? ''),
            'fecha_dias_mora' => self::parsearFechaCsv($data['fecha_dias_mora'] ?? ''),
            'ciudad_origen_credito' => self::limpiarTextoCsv($data['ciudad_origen_credito'] ?? ''),
            // Campos legacy (compatibilidad con vistas/reportes existentes)
            'oficina' => $compra !== '' ? $compra : ($cartera !== '' ? $cartera : self::limpiarTextoCsv($data['oficina'] ?? '')),
            'ano_castigo' => $fechaCastigo ? self::extraerAnioCastigo($fechaCastigo) : self::extraerAnioCastigo($data['años_castigo'] ?? ''),
            'concepto_mes_actual' => $tipoProducto !== '' ? $tipoProducto : self::limpiarTextoCsv($data['concepto_mes_actual'] ?? ''),
            'estado_proceso_juridico' => $estadoJur,
            'total' => $saldoCapital,
            'total_a_pagar' => $totalObligacion,
        ];
    }
}
