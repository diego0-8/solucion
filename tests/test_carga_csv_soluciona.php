<?php
/**
 * Test funcional del mapeo de la exportación Soluciona (datos 1.csv).
 *
 * Verifica que CsvCargaHelper detecte el separador, mapee las columnas clave a
 * las tablas cliente/obligaciones y normalice montos, año de castigo y
 * judicialización. No toca la base de datos.
 *
 * Ejecutar: php tests/test_carga_csv_soluciona.php
 */

$baseDir = dirname(__DIR__);
require_once $baseDir . '/helpers/CsvCargaHelper.php';

$csvPath = $baseDir . '/datos 1.csv';

$ok = [];
$errores = [];

function comprobar(&$ok, &$errores, $cond, $msg) {
    if ($cond) {
        $ok[] = $msg;
    } else {
        $errores[] = $msg;
    }
}

if (!file_exists($csvPath)) {
    echo "ERROR: no existe " . $csvPath . "\n";
    exit(1);
}

// 1) Detección de separador (Soluciona usa ';').
$muestra = (string) file_get_contents($csvPath, false, null, 0, 8192);
$sep = CsvCargaHelper::detectarSeparador($muestra);
comprobar($ok, $errores, $sep === ';', "Separador detectado es ';' (obtenido: '" . ($sep === "\t" ? '\\t' : $sep) . "')");

// 2) Lectura de filas (encabezados multilínea entre comillas).
$parsed = CsvCargaHelper::leerFilasCsv($csvPath, $sep, 'utf-8');
$headers = $parsed['headers'];
$rows = $parsed['rows'];
comprobar($ok, $errores, count($headers) > 100, 'Encabezados leídos > 100 columnas (obtenido: ' . count($headers) . ')');
comprobar($ok, $errores, count($rows) >= 1, 'Al menos una fila de datos (obtenido: ' . count($rows) . ')');

// 3) Mapeo de columnas clave.
$map = CsvCargaHelper::mapearEncabezados($headers);
foreach (['operacion', 'cuenta', 'cedula', 'nombre', 'ciudad', 'total', 'total_a_pagar', 'estado_proceso_juridico', 'años_castigo', 'ident_credito', 'tipo_cliente', 'dueno_cartera', 'cartera', 'compra', 'tipo_producto', 'valor_desembolso', 'saldo_capital', 'intereses_corrientes', 'fecha_desembolso', 'fecha_castigo', 'ciudad_origen_credito'] as $clave) {
    comprobar($ok, $errores, isset($map[$clave]), "Columna mapeada: $clave");
}
$telMapeados = 0;
for ($i = 1; $i <= 7; $i++) {
    if (isset($map['tel' . $i])) {
        $telMapeados++;
    }
}
comprobar($ok, $errores, $telMapeados === 7, "Se mapean 7 celulares a tel1..tel7 (obtenido: $telMapeados)");

// 4) Verificar la primera fila contra los valores esperados.
if (!empty($rows)) {
    $data = CsvCargaHelper::extraerDatosFila($rows[0], $map);

    comprobar($ok, $errores, ($data['operacion'] ?? '') === '31003330004116', "operacion = 31003330004116 (obtenido: '" . ($data['operacion'] ?? '') . "')");
    comprobar($ok, $errores, ($data['cedula'] ?? '') === '6864768', "cedula = 6864768 (obtenido: '" . ($data['cedula'] ?? '') . "')");
    comprobar($ok, $errores, ($data['cuenta'] ?? '') === '6864768-1', "cuenta = 6864768-1 (obtenido: '" . ($data['cuenta'] ?? '') . "')");
    comprobar($ok, $errores, strpos($data['nombre'] ?? '', 'Eleazar') !== false, "nombre contiene 'Eleazar' (obtenido: '" . ($data['nombre'] ?? '') . "')");
    comprobar($ok, $errores, ($data['ciudad'] ?? '') === 'Monteria', "ciudad = Monteria (obtenido: '" . ($data['ciudad'] ?? '') . "')");
    comprobar($ok, $errores, ($data['tel1'] ?? '') === '3008427739', "tel1 = 3008427739 (obtenido: '" . ($data['tel1'] ?? '') . "')");
    comprobar($ok, $errores, ($data['tel2'] ?? '') === '3116172939', "tel2 = 3116172939 (obtenido: '" . ($data['tel2'] ?? '') . "')");

    $email = CsvCargaHelper::primerEmail($data);
    comprobar($ok, $errores, $email === 'aleazar.correa@hotmail.com', "primer email = aleazar.correa@hotmail.com (obtenido: '$email')");

    // 5) Normalización de montos formato Colombia.
    $total = CsvCargaHelper::parsearDecimalColombia($data['total'] ?? '');
    comprobar($ok, $errores, abs($total - 136447026.0) < 0.001, "total Saldo Capital = 136447026 (obtenido: $total)");
    $totalPagar = CsvCargaHelper::parsearDecimalColombia($data['total_a_pagar'] ?? '');
    comprobar($ok, $errores, abs($totalPagar - 141214141.0) < 0.001, "total_a_pagar Total Obligacion = 141214141 (obtenido: $totalPagar)");

    // 6) Año de castigo (de la fecha de castigo "20/12/2021").
    $anio = CsvCargaHelper::extraerAnioCastigo($data['años_castigo'] ?? '');
    comprobar($ok, $errores, $anio === '2021', "año de castigo = 2021 (obtenido: '$anio')");

    // 7) Judicialización: "Si" => JUDICIALIZADO.
    $estado = CsvCargaHelper::normalizarJudicializacion($data['estado_proceso_juridico'] ?? '');
    comprobar($ok, $errores, $estado === 'JUDICIALIZADO', "judicializacion 'Si' => JUDICIALIZADO (obtenido: '" . var_export($estado, true) . "')");

    $oblig = CsvCargaHelper::construirDatosObligacion($data, 1, 1);
    comprobar($ok, $errores, ($oblig['ident_credito'] ?? '') === '1', "ident_credito = 1");
    comprobar($ok, $errores, ($oblig['tipo_cliente'] ?? '') === 'Monocartera', "tipo_cliente = Monocartera");
    comprobar($ok, $errores, ($oblig['compra'] ?? '') === 'Banco Popular 4', "compra = Banco Popular 4");
    comprobar($ok, $errores, ($oblig['cartera'] ?? '') === 'Banco Popular', "cartera = Banco Popular");
    comprobar($ok, $errores, abs(($oblig['valor_desembolso'] ?? 0) - 142200000.0) < 0.001, "valor_desembolso = 142200000");
    comprobar($ok, $errores, ($oblig['fecha_desembolso'] ?? '') === '2016-08-04', "fecha_desembolso = 2016-08-04");
    comprobar($ok, $errores, ($oblig['fecha_castigo'] ?? '') === '2021-12-20', "fecha_castigo = 2021-12-20");
    comprobar($ok, $errores, ($oblig['ciudad_origen_credito'] ?? '') === 'Monteria', "ciudad_origen_credito = Monteria");
}

// 8) Casos unitarios extra de parseo decimal.
comprobar($ok, $errores, abs(CsvCargaHelper::parsearDecimalColombia('141.214.141') - 141214141.0) < 0.001, "parsearDecimalColombia('141.214.141') = 141214141");
comprobar($ok, $errores, abs(CsvCargaHelper::parsearDecimalColombia('231.310,50') - 231310.50) < 0.001, "parsearDecimalColombia('231.310,50') = 231310.50");
comprobar($ok, $errores, CsvCargaHelper::parsearDecimalColombia('-') === 0.0, "parsearDecimalColombia('-') = 0");

echo "=== Test carga CSV Soluciona (datos 1.csv) ===\n\n";
foreach ($ok as $msg) {
    echo "[OK] {$msg}\n";
}
foreach ($errores as $msg) {
    echo "[FALLO] {$msg}\n";
}

echo "\nTotal: " . count($ok) . " OK, " . count($errores) . " fallos.\n";
exit(empty($errores) ? 0 : 1);
