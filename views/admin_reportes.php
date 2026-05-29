<?php
/**
 * Vista admin_reportes: carga CSV de historial de gestión a la tabla historial_gestion.
 * El administrador elige la base de clientes; se validan cédulas en esa base y asesores por nombre.
 */
$bases_disponibles = $bases ?? [];
?>
<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Reportes - Cargar historial de gestión - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
    <link rel="stylesheet" href="assets/css/admin-reportes.css">
</head>
<body data-user-id="<?php echo $_SESSION['usuario_id'] ?? ''; ?>">

    <?php include __DIR__ . '/Navbar.php'; ?>

    <div class="main-container">
        <?php include __DIR__ . '/Header.php'; ?>

        <section class="current-call-section admin-reportes-section">
            <div class="call-details">
                <h3><i class="fas fa-chart-bar"></i> Reportes</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Carga de historial de gestión desde CSV</p>
                <small>Seleccione la base de clientes y suba un archivo CSV delimitado por comas. Las cédulas y el asesor se validan antes de insertar.</small>
            </div>

            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-file-csv"></i>
                    <div>
                        <span class="client-name">Cargar historial de gestión (CSV)</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Administración</span>
                    </div>
                </div>

                <div class="admin-reportes-content">
                    <form id="form-carga-historial-csv" class="form-carga-reportes" enctype="multipart/form-data">
                        <div class="form-section">
                            <div class="input-group">
                                <label for="base_id">Base de clientes *</label>
                                <select id="base_id" name="base_id" required>
                                    <option value="">Seleccionar base...</option>
                                    <?php foreach ($bases_disponibles as $b): ?>
                                        <option value="<?php echo (int) $b['id']; ?>"><?php echo htmlspecialchars($b['nombre']); ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <small>La cédula de cada fila del CSV debe existir en esta base.</small>
                            </div>
                            <div class="input-group">
                                <label for="archivo_csv">Archivo CSV *</label>
                                <input type="file" id="archivo_csv" name="archivo_csv" accept=".csv,text/csv" required>
                                <small>Delimitado por comas. Soporta el formato completo del reporte de contingencia: fecha de gestion, asesor, operacion, cedula del cliente, cliente, telefono de contacto, base, canal de contacto, nivel1, nivel2, fecha de pago, cuota, cuota actual, descuento aplicado, valor de pago, duracion y observaciones largas. La fecha de gestion del CSV se conserva por fila.</small>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary" id="btn-subir-csv">
                                    <i class="fas fa-upload"></i> Subir y cargar
                                </button>
                            </div>
                        </div>
                    </form>

                    <div id="resultado-carga" class="resultado-carga" style="display: none;">
                        <h4><i class="fas fa-check-circle"></i> Resultado de la carga</h4>
                        <p id="res-total" class="res-total"></p>
                        <p id="res-ids" class="res-ids"></p>
                        <div id="res-errores" class="res-errores" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script>
    (function() {
        var form = document.getElementById('form-carga-historial-csv');
        var resultado = document.getElementById('resultado-carga');
        var resTotal = document.getElementById('res-total');
        var resIds = document.getElementById('res-ids');
        var resErrores = document.getElementById('res-errores');
        var btnSubir = document.getElementById('btn-subir-csv');

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var baseId = document.getElementById('base_id').value;
            var fileInput = document.getElementById('archivo_csv');
            if (!baseId || !fileInput.files.length) {
                alert('Seleccione una base y un archivo CSV.');
                return;
            }
            var fd = new FormData();
            fd.append('base_id', baseId);
            fd.append('archivo_csv', fileInput.files[0]);
            btnSubir.disabled = true;
            btnSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

            fetch('index.php?action=cargar_historial_csv', {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                resultado.style.display = 'block';
                if (data.success) {
                    var total = data.total_insertados || 0;
                    resTotal.textContent = 'Total de gestiones insertadas: ' + total;
                    resTotal.className = 'res-total success';
                    if (data.ids && data.ids.length) {
                        resIds.textContent = 'IDs asignados: ' + data.ids.slice(0, 50).join(', ') + (data.ids.length > 50 ? '...' : '');
                        resIds.style.display = 'block';
                    } else {
                        resIds.style.display = 'none';
                    }
                    if (data.errores && data.errores.length) {
                        resErrores.style.display = 'block';
                        resErrores.innerHTML = '<strong>Advertencias/errores por fila:</strong><ul>' + data.errores.map(function(x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ul>';
                    } else {
                        resErrores.style.display = 'none';
                        resErrores.innerHTML = '';
                    }
                } else {
                    resTotal.textContent = 'Error: ' + (data.message || 'Error desconocido');
                    resTotal.className = 'res-total error';
                    resIds.style.display = 'none';
                    resErrores.style.display = 'none';
                }
            })
            .catch(function(err) {
                resultado.style.display = 'block';
                resTotal.textContent = 'Error de red: ' + err.message;
                resTotal.className = 'res-total error';
                resIds.style.display = 'none';
                resErrores.style.display = 'none';
            })
            .finally(function() {
                btnSubir.disabled = false;
                btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir y cargar';
            });
        });

        function escapeHtml(s) {
            var div = document.createElement('div');
            div.textContent = s;
            return div.innerHTML;
        }
    })();
    </script>
</body>
</html>
