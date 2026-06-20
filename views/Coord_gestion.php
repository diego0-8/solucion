<?php require_once __DIR__ . '/../config.php'; ?>
<?php require_once __DIR__ . '/../helpers/CsvCargaHelper.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Gestión de Coordinador - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
    <link rel="stylesheet" href="assets/css/coordinador-dashboard.css">
</head>
<body data-user-id="<?php echo $_SESSION['usuario_id'] ?? ''; ?>">

    <?php 
    // Incluir navbar compartido
    $action = 'coordinador_gestion';
    include __DIR__ . '/Navbar.php'; 
    ?>

    <div class="main-container">
        <?php 
        // Incluir header compartido
        include __DIR__ . '/Header.php'; 
        ?>

        <!-- Sección Principal de Gestión -->
        <section class="current-call-section">
            <div class="call-details">
                <h3>GESTIÓN DE CLIENTES Y OBLIGACIONES</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Carga y Administración de Datos</p>
                <small>Gestión de Archivos CSV</small>
                <div class="media-controls">
                    <button class="media-button" onclick="abrirPestañaCarga()">
                        <i class="fas fa-upload"></i> Subir CSV
                    </button>
                    <button class="media-button" onclick="descargarPlantilla()">
                        <i class="fas fa-file-download"></i> Descargar Plantilla
                    </button>
                </div>
            </div>
            
            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-database"></i>
                    <div>
                        <span class="client-name">Base de Clientes</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Gestión de Datos</span>
                    </div>
                </div>

                <div class="main-tabs">
                    <span class="active" onclick="cambiarTab('bases')">BASES</span>
                    <span onclick="cambiarTab('tareas')">TAREAS</span>
                    <span onclick="cambiarTab('carga-archivo')">CARGA DE ARCHIVO</span>
                    <span onclick="cambiarTab('habilitar')">HABILITAR</span>
                </div>
                
                <div class="content-sections">
                    <!-- PESTAÑA 1: BASES -->
                    <div class="tab-content active" id="tab-bases">
                        <div class="left-content">
                            <!-- Gestión de Bases de Clientes -->
                            <div class="form-section">
                                <h4 class="section-title" style="margin-bottom: 20px;">Bases de Clientes Creadas</h4>
                                
                                <!-- Tabla de Bases de Clientes -->
                                <div class="bases-table-container">
                                    <table class="bases-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre de la Base</th>
                                                <th>Fecha Creación</th>
                                                <th>Total Clientes</th>
                                                <th>Total Obligaciones</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="bases-tbody">
                                            <tr>
                                                <td colspan="6" class="empty-state">
                                                    <i class="fas fa-database"></i>
                                                    <p>Cargando bases de clientes...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <div class="right-content">
                            <!-- Estadísticas de Bases -->
                            <div class="stats-panel">
                                <h4>Estadísticas de Bases</h4>
                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-label">Total Bases:</span>
                                        <span class="stat-value" id="stat-total-bases">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Clientes Totales:</span>
                                        <span class="stat-value" id="stat-clientes-totales">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Obligaciones Totales:</span>
                                        <span class="stat-value" id="stat-obligaciones-totales">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Bases Inactivas:</span>
                                        <span class="stat-value" id="stat-bases-inactivas">0</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Acciones Rápidas -->
                            <div class="quick-actions-panel">
                                <h4>Acciones Rápidas</h4>
                                <div class="quick-actions">
                                    <button class="action-btn" onclick="openModal('crear-base')">
                                        <i class="fas fa-plus"></i> Nueva Base
                                    </button>
                                    <button class="action-btn" onclick="openModal('importar-base')">
                                        <i class="fas fa-upload"></i> Importar Base
                                    </button>
                                    <button class="action-btn" onclick="exportarBases()">
                                        <i class="fas fa-download"></i> Exportar Bases
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 2: TAREAS -->
                    <div class="tab-content" id="tab-tareas">
                        <div class="tareas-container">
                            <div class="tareas-header">
                                <h4>Asignación de Clientes a Asesores</h4>
                                <p class="tareas-description">Seleccione la base de clientes, asigne un asesor y especifique el número de clientes a asignar</p>
                                <div class="tareas-info-note">
                                    <i class="fas fa-info-circle"></i>
                                    <strong>Nota:</strong> Los asesores deben tener acceso a la base de clientes (desde la pestaña "BASES" → botón "Dar Acceso") para poder recibir asignaciones específicas de clientes.
                                </div>
                            </div>
                            
                            <div class="tareas-assignment-table">
                                <table class="assignment-table">
                                    <thead>
                                        <tr>
                                            <th class="field-column">Campo Requerido</th>
                                            <th class="value-column">Selección</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="field-cell">
                                                <div class="field-label">
                                                    <i class="fas fa-database"></i>
                                                    <span>Base de Clientes</span>
                                                </div>
                                                <small class="field-description">Seleccione la base de datos de clientes</small>
                                            </td>
                                            <td class="value-cell">
                                                <select id="select-base-clientes" class="form-control assignment-select" onchange="seleccionarBaseParaTarea(this.value)">
                                                    <option value="">Seleccione una base de clientes...</option>
                                                </select>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="field-cell">
                                                <div class="field-label">
                                                    <i class="fas fa-user-tie"></i>
                                                    <span>Asesor a Asignar</span>
                                                </div>
                                                <small class="field-description">Seleccione el asesor responsable</small>
                                            </td>
                                            <td class="value-cell">
                                                <select id="select-asesor" class="form-control assignment-select" onchange="validarAsignacion()">
                                                    <option value="">Seleccione un asesor...</option>
                                                </select>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="field-cell">
                                                <div class="field-label">
                                                    <i class="fas fa-users"></i>
                                                    <span>Clientes a Asignar</span>
                                                </div>
                                                <small class="field-description">Especifique cuántos clientes asignar (solo clientes no asignados por tareas anteriores)</small>
                                            </td>
                                            <td class="value-cell">
                                                <div class="client-assignment-controls">
                                                    <input type="number" id="input-clientes-asignar" class="form-control assignment-input" 
                                                           placeholder="0" min="1" max="0" onchange="validarAsignacion()">
                                                    <span class="client-total-info" id="client-total-info">Total disponible: 0</span>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td class="field-cell">
                                                <div class="field-label">
                                                    <i class="fas fa-tag"></i>
                                                    <span>Nombre de la tarea</span>
                                                </div>
                                                <small class="field-description">Opcional. Ej: María García - Base Campaña Ene - 50 clientes (para identificar la tarea al completarla)</small>
                                            </td>
                                            <td class="value-cell">
                                                <input type="text" id="input-nombre-tarea" class="form-control assignment-input" 
                                                       placeholder="Ej: María García - Base Campaña Ene - 50 clientes" maxlength="100">
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="tareas-summary" id="tareas-summary">
                                <div class="summary-card">
                                    <h5>Resumen de Asignación</h5>
                                    <div class="summary-details">
                                        <div class="summary-item">
                                            <span class="summary-label">Base Seleccionada:</span>
                                            <span class="summary-value" id="summary-base">-</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Asesor Asignado:</span>
                                            <span class="summary-value" id="summary-asesor">-</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Clientes a Asignar:</span>
                                            <span class="summary-value" id="summary-clientes">-</span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">Clientes Restantes:</span>
                                            <span class="summary-value" id="summary-restantes">-</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Botón para filtrar por obligaciones (solo aparece cuando hay base y asesor seleccionados) -->
                            <div class="tareas-filter-section" id="tareas-filter-section" style="display: none; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                                <h5 style="margin-bottom: 15px;">
                                    <i class="fas fa-filter"></i> Filtros Avanzados por Obligaciones
                                </h5>
                                <p style="margin-bottom: 15px; color: #6c757d;">
                                    Use filtros avanzados para seleccionar clientes específicos según las características de sus obligaciones.
                                </p>
                                <button class="btn btn-primary" id="btn-abrir-filtros" onclick="abrirModalFiltros()">
                                    <i class="fas fa-filter"></i> Configurar Filtros
                                </button>
                                <div id="filtros-activos-info" style="margin-top: 10px; display: none;">
                                    <small class="text-muted">Filtros activos aplicados</small>
                                </div>
                            </div>
                            
                            <!-- Asignar por CSV de cédulas (solo clientes que estén en la base seleccionada) -->
                            <div class="tareas-csv-section" id="tareas-csv-section" style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px; border: 1px solid #b8daff;">
                                <h5 style="margin-bottom: 10px;">
                                    <i class="fas fa-file-csv"></i> Asignar clientes desde CSV (cédulas)
                                </h5>
                                <p style="margin-bottom: 12px; color: #0c5460; font-size: 14px;">
                                    Suba un CSV con una columna de cédulas (o una cédula por línea). Solo se asignarán los clientes que existan en la <strong>base de clientes</strong> seleccionada arriba.
                                </p>
                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
                                    <input type="file" id="input-csv-cedulas" accept=".csv,.txt" style="max-width: 280px;" onchange="validarBotonAsignarCsv()">
                                    <button type="button" class="btn btn-primary" id="btn-asignar-csv" disabled>
                                        <i class="fas fa-upload"></i> Asignar desde CSV
                                    </button>
                                </div>
                                <div id="csv-cedulas-resultado" style="margin-top: 10px; display: none;"></div>
                            </div>
                            
                            <div class="tareas-actions">
                                <button class="btn btn-primary" id="btn-asignar" onclick="asignarClientes()" disabled>
                                    <i class="fas fa-user-plus"></i> Asignar Clientes
                                </button>
                                <button class="btn btn-secondary" onclick="limpiarAsignacion()">
                                    <i class="fas fa-undo"></i> Limpiar Selección
                                </button>
                                <button class="btn btn-info" onclick="verAsignacionesExistentes()">
                                    <i class="fas fa-list"></i> Ver Asignaciones
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 3: CARGA DE ARCHIVO -->
                    <div class="tab-content" id="tab-carga-archivo">
                        <div class="left-content">
                            <!-- Zona de Carga de Archivos -->
                            <div class="form-section">
                                <h4>Subir Archivo CSV</h4>
                                <p class="upload-hint" style="margin: 0 0 16px; font-size: 13px; color: #666;">
                                    Use el mismo formato que la plantilla descargable (botón <strong>Descargar Plantilla</strong>). Separador: <strong>punto y coma (;)</strong> — ya viene seleccionado abajo. Deje marcado <strong>El archivo tiene encabezados</strong>. Campos obligatorios por fila: <strong>No. Operación</strong> e <strong>Identificación</strong> (numéricos). La misma plantilla sirve para <strong>carga nueva</strong> y <strong>carga existente</strong>; reemplace la fila de ejemplo con sus datos.
                                </p>
                                
                                <!-- Selección de Tipo de Carga -->
                                <div class="upload-type-selection">
                                    <h5>Tipo de Carga</h5>
                                    <div class="upload-type-buttons">
                                        <button type="button" class="btn btn-primary upload-type-btn active" id="btn-carga-nueva" onclick="selectUploadType('nueva')">
                                            <i class="fas fa-plus"></i> Carga Nueva
                                        </button>
                                        <button type="button" class="btn btn-secondary upload-type-btn" id="btn-carga-existente" onclick="selectUploadType('existente')">
                                            <i class="fas fa-database"></i> Carga Existente
                                        </button>
                                    </div>
                                </div>

                                <!-- Formulario para Carga Nueva -->
                                <div class="upload-form" id="form-carga-nueva">
                                    <div class="form-group">
                                        <label for="nombre-archivo">Nombre del Archivo</label>
                                        <input type="text" id="nombre-archivo" class="form-control" placeholder="Ingrese un nombre para el archivo" required>
                                        <small class="form-text text-muted">Este nombre identificará la base de datos creada</small>
                                    </div>
                                    
                                    <!-- Zona de Drop para Carga Nueva -->
                                    <div class="upload-zone" id="upload-zone-nueva" ondrop="dropHandler(event, 'nueva');" ondragover="dragOverHandler(event);" ondragleave="dragLeaveHandler(event);">
                                    <div class="upload-content">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <h3>Arrastra tu archivo CSV aquí</h3>
                                        <p>o haz clic para seleccionar</p>
                                            <form id="csv-upload-form-nueva" enctype="multipart/form-data">
                                                <input type="file" id="csv-file-nueva" name="csv_file" accept=".csv" onchange="handleFileSelect(event, 'nueva')">
                                                <button type="button" class="btn btn-primary" onclick="document.getElementById('csv-file-nueva').click()">
                                            <i class="fas fa-folder-open"></i> Seleccionar Archivo
                                        </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                <!-- Formulario para Carga Existente -->
                                <div class="upload-form" id="form-carga-existente">
                                    <div class="form-group">
                                        <label for="base-datos-existente">Base de Datos Existente</label>
                                        <select id="base-datos-existente" class="form-control" required>
                                            <option value="">Seleccione una base de datos...</option>
                                        </select>
                                        <small class="form-text text-muted">Solo aparecen bases <strong>habilitadas</strong> (estado activo). Si no ve la suya, habilítela en la pestaña HABILITAR.</small>
                                    </div>
                                    
                                    <!-- Zona de Drop para Carga Existente -->
                                    <div class="upload-zone" id="upload-zone-existente" ondrop="dropHandler(event, 'existente');" ondragover="dragOverHandler(event);" ondragleave="dragLeaveHandler(event);">
                                        <div class="upload-content">
                                            <i class="fas fa-cloud-upload-alt"></i>
                                            <h3>Arrastra tu archivo CSV aquí</h3>
                                            <p>o haz clic para seleccionar</p>
                                            <form id="csv-upload-form-existente" enctype="multipart/form-data">
                                                <input type="file" id="csv-file-existente" name="csv_file" accept=".csv" onchange="handleFileSelect(event, 'existente')">
                                                <button type="button" class="btn btn-primary" onclick="document.getElementById('csv-file-existente').click()">
                                                    <i class="fas fa-folder-open"></i> Seleccionar Archivo
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                <!-- Información del Archivo Seleccionado -->
                                <div class="file-info" id="file-info">
                                    <div class="file-details">
                                        <i class="fas fa-file-csv"></i>
                                        <div class="file-data">
                                            <h4 id="file-name">archivo.csv</h4>
                                            <p id="file-size">0 KB</p>
                                            <p id="file-type">text/csv</p>
                                        </div>
                                        <button class="btn btn-danger" onclick="removeFile()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Configuración de Carga -->
                                <div class="upload-config">
                                    <h4>Configuración de Carga</h4>
                                    
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>Separador de Campos</label>
                                            <select id="separator" class="form-control">
                                                <option value=",">Coma (,)</option>
                                                <option value=";" selected>Punto y coma (;)</option>
                                                <option value="\t">Tabulación</option>
                                                <option value="|">Pipe (|)</option>
                                            </select>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>Codificación</label>
                                            <select id="encoding" class="form-control">
                                                <option value="utf-8">UTF-8</option>
                                                <option value="latin1">Latin-1</option>
                                                <option value="windows-1252">Windows-1252</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>
                                                <input type="checkbox" id="has-header" checked>
                                                El archivo tiene encabezados
                                            </label>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label>
                                                <input type="checkbox" id="skip-empty" checked>
                                                Omitir filas vacías
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Botón de Acción -->
                                <div class="upload-actions">
                                    <button class="btn btn-primary" onclick="subirArchivo()" id="btn-subir" disabled>
                                        <i class="fas fa-upload"></i> Subir Archivo
                                    </button>
                                    <button class="btn btn-warning" onclick="descargarPlantilla()">
                                        <i class="fas fa-download"></i> Descargar Plantilla
                                    </button>
                                    <button class="btn btn-secondary" onclick="limpiarFormulario()" id="btn-limpiar">
                                        <i class="fas fa-trash"></i> Limpiar
                                    </button>
                                </div>
                                
                                <!-- Mensajes de Resultado -->
                                <div id="resultado-carga" class="resultado-carga">
                                    <div class="resultado-content">
                                        <h4 id="resultado-titulo">Resultado de la Carga</h4>
                                        <div id="resultado-mensaje"></div>
                                        <div id="resultado-detalles"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="right-content">
                            <!-- Panel de Estadísticas de Procesamiento -->
                            <div class="progress-panel">
                                <h4>Estadísticas de Procesamiento</h4>
                                
                                <div class="progress-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">Filas procesadas:</span>
                                        <span class="stat-value" id="rows-processed">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Obligaciones nuevas:</span>
                                        <span class="stat-value" id="obligaciones-creadas">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Obligaciones (total en la base):</span>
                                        <span class="stat-value" id="total-obligaciones">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Clientes (total en la base):</span>
                                        <span class="stat-value" id="total-clientes-base">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Clientes nuevos:</span>
                                        <span class="stat-value" id="clientes-creados">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Errores en filas:</span>
                                        <span class="stat-value" id="rows-errors">0</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Log de Errores -->
                            <div class="error-log">
                                <h4>Log de Errores</h4>
                                <div class="log-content" id="error-log">
                                    <p class="log-empty">No hay errores</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 4: HABILITAR (bases deshabilitadas) -->
                    <div class="tab-content" id="tab-habilitar">
                        <div class="historial-container">
                            <div class="historial-header">
                                <h4>Bases deshabilitadas</h4>
                                <p class="text-muted" style="margin-top: 8px;">Bases que fueron deshabilitadas. Al habilitar una base vuelve a estar activa y los asesores con acceso podrán verla de nuevo.</p>
                            </div>
                            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Fecha creación</th>
                                            <th>Total clientes</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bases-deshabilitadas-tbody">
                                        <tr>
                                            <td colspan="4" class="text-center">
                                                <i class="fas fa-spinner fa-spin"></i> Cargando...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p id="bases-deshabilitadas-vacio" style="display: none; text-align: center; color: #666; margin-top: 16px;">No hay bases deshabilitadas.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- MODALES -->
    
    <!-- Modal de Subir CSV -->
    <div class="modal" id="modal-subir-csv">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Subir Archivo CSV</h3>
                <button class="modal-close" onclick="closeModal('subir-csv')">&times;</button>
            </div>
            <div class="modal-body">
                <p>Selecciona un archivo CSV para cargar a la base de datos de clientes.</p>
                <div class="file-upload-area">
                    <input type="file" id="modal-csv-file" accept=".csv">
                    <label for="modal-csv-file" class="file-upload-label">
                        <i class="fas fa-upload"></i>
                        <span>Seleccionar Archivo CSV</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('subir-csv')">Cancelar</button>
                <button class="btn btn-primary">Subir Archivo</button>
            </div>
        </div>
    </div>

    <!-- Modal de Plantilla CSV -->
    <div class="modal" id="modal-plantilla-csv">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Descargar Plantilla CSV</h3>
                <button class="modal-close" onclick="closeModal('plantilla-csv')">&times;</button>
            </div>
            <div class="modal-body">
                <p>Descarga la plantilla CSV con el mismo formato que el archivo de exportación Soluciona (pestaña Carga de archivo).</p>
                <div class="template-info">
                    <h4>Formato de la plantilla</h4>
                    <ul>
                        <li>Separador: punto y coma (;)</li>
                        <li>Primera fila: encabezados (<?php echo count(CsvCargaHelper::encabezadosPlantillaCargaSoluciona()); ?> columnas)</li>
                        <li>Segunda fila: ejemplo de referencia (bórrela o sustitúyala por sus datos)</li>
                        <li><strong>Obligatorios:</strong> No. Operación, Identificación</li>
                        <li>Válida para carga nueva y carga existente en la pestaña Carga de archivo</li>
                        <li>Incluye clientes, obligaciones, teléfonos (Celular 1–7, Teléfono 1–3), correos (Email 1–5), montos y judicialización</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('plantilla-csv')">Cancelar</button>
                <button class="btn btn-primary" onclick="descargarPlantilla()">Descargar Plantilla</button>
            </div>
        </div>
    </div>

    <!-- Modal de Validar Datos -->
    <div class="modal" id="modal-validar-datos">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Validar Datos</h3>
                <button class="modal-close" onclick="closeModal('validar-datos')">&times;</button>
            </div>
            <div class="modal-body">
                <p>Valida los datos del archivo CSV antes de cargarlos a la base de datos.</p>
                <div class="validation-results" id="validation-results">
                    <div class="validation-item">
                        <i class="fas fa-check-circle text-success"></i>
                        <span>Formato de archivo válido</span>
                    </div>
                    <div class="validation-item">
                        <i class="fas fa-check-circle text-success"></i>
                        <span>Encabezados correctos</span>
                    </div>
                    <div class="validation-item">
                        <i class="fas fa-exclamation-triangle text-warning"></i>
                        <span>3 registros con datos incompletos</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('validar-datos')">Cerrar</button>
                <button class="btn btn-primary">Procesar Archivo</button>
            </div>
        </div>
    </div>

    <!-- Modal de Configuración de Carga -->
    <div class="modal" id="modal-configuracion-carga">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Configuración de Carga</h3>
                <button class="modal-close" onclick="closeModal('configuracion-carga')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="config-form">
                    <div class="form-group">
                        <label>Tamaño máximo de archivo (MB)</label>
                        <input type="number" class="form-control" value="10">
                    </div>
                    <div class="form-group">
                        <label>Separador de campos</label>
                        <select class="form-control">
                            <option value=",">Coma (,)</option>
                            <option value=";">Punto y coma (;)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('configuracion-carga')">Cancelar</button>
                <button class="btn btn-primary">Guardar</button>
            </div>
        </div>
    </div>

    <!-- Modal de Acceso a Base de Datos -->
    <div class="modal" id="modal-acceso-base" style="display: none;">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Dar Acceso a Base de Datos</h3>
                <button class="modal-close" onclick="closeModalAccesoBase()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="base-access-info">
                    <div class="base-info-card">
                        <h4 id="modal-acceso-base-nombre">Base de Clientes</h4>
                        <input type="hidden" id="modal-acceso-base-id" value="">
                        <div class="base-details">
                            <span class="base-detail-item">
                                <i class="fas fa-info-circle"></i>
                                <strong>Nota:</strong> Los asesores seleccionados tendrán acceso completo a esta base para búsqueda y gestión de clientes.
                            </span>
                        </div>
                    </div>
                </div>

                <div class="asesores-access-section">
                    <h4>Seleccionar Asesores</h4>
                    <p class="section-description">Seleccione los asesores que tendrán acceso completo a esta base de datos.</p>
                    
                    <div class="asesores-list">
                        <div id="asesores-acceso-list" class="asesores-checkbox-list">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando asesores...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModalAccesoBase()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarAccesoBase()" id="btn-guardar-acceso-base">
                    <i class="fas fa-save"></i> Guardar Acceso
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Ver Clientes -->
    <div class="modal" id="modal-ver-clientes" style="display: none;">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Clientes de la Base: <span id="modal-ver-clientes-nombre"></span></h3>
                <button class="modal-close" onclick="closeModalVerClientes()">&times;</button>
            </div>
            <div class="modal-body" id="modal-ver-clientes-body">
                <div class="clientes-summary" style="display: flex; flex-wrap: wrap; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <p style="margin: 0;"><strong>Total de clientes:</strong> <span id="modal-clientes-total">0</span></p>
                    <div style="flex: 1; min-width: 260px;">
                        <label for="modal-ver-clientes-busqueda" class="sr-only">Buscar cliente</label>
                        <input type="text"
                               id="modal-ver-clientes-busqueda"
                               class="form-control"
                               placeholder="Buscar por cédula, teléfono o nombre..."
                               style="width: 100%; padding: 10px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
                    </div>
                </div>
                <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>CC</th>
                                <th>Nombre</th>
                                <th>Celular</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="modal-clientes-tbody">
                            <tr>
                                <td colspan="4" class="text-center">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando clientes...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModalVerClientes()">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Modal Detalle Cliente (info + obligaciones) -->
    <div class="modal" id="modal-detalle-cliente" style="display: none;">
        <div class="modal-content modal-large modal-detalle-cliente">
            <div class="modal-header">
                <h3><i class="fas fa-user"></i> Detalle del Cliente</h3>
                <button class="modal-close" onclick="closeModalDetalleCliente()">&times;</button>
            </div>
            <div class="modal-body" id="modal-detalle-cliente-body">
                <div id="modal-detalle-cliente-loading" class="detalle-cliente-loading">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Cargando información...</p>
                </div>
                <div id="modal-detalle-cliente-content" style="display: none;">
                    <div class="detalle-cliente-info">
                        <h4><i class="fas fa-id-card"></i> Datos del cliente</h4>
                        <div class="detalle-cliente-grid">
                            <div><strong>Cédula:</strong> <span id="detalle-cliente-cc">-</span></div>
                            <div><strong>Nombre:</strong> <span id="detalle-cliente-nombre">-</span></div>
                            <div><strong>Ciudad:</strong> <span id="detalle-cliente-ciudad">-</span></div>
                            <div><strong>Sector:</strong> <span id="detalle-cliente-sector">-</span></div>
                            <div><strong>Correo:</strong> <span id="detalle-cliente-email">-</span></div>
                        </div>
                        <h4 class="detalle-cliente-subtitulo"><i class="fas fa-phone"></i> Teléfonos</h4>
                        <div id="detalle-cliente-telefonos" class="detalle-cliente-telefonos"></div>
                    </div>
                    <div class="detalle-cliente-obligaciones">
                        <h4>
                            <i class="fas fa-file-invoice-dollar"></i> Obligaciones
                            <span id="detalle-cliente-obligaciones-count" class="detalle-obligaciones-badge">0</span>
                        </h4>
                        <div id="detalle-cliente-obligaciones-list" class="detalle-obligaciones-lista"></div>
                        <p id="detalle-cliente-sin-obligaciones" class="detalle-sin-obligaciones" style="display: none;">Sin obligaciones registradas.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModalDetalleCliente()">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Modal de Ver Asesores con Acceso -->
    <div class="modal" id="modal-ver-asesores-acceso" style="display: none;">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Asesores con Acceso a la Base</h3>
                <button class="modal-close" onclick="cerrarModalVerAsesores()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="base-access-info">
                    <div class="base-info-card">
                        <h4 id="modal-ver-asesores-base-nombre">Base de Clientes</h4>
                        <input type="hidden" id="modal-ver-asesores-base-id" value="">
                        <div class="base-details">
                            <span class="base-detail-item">
                                <i class="fas fa-info-circle"></i>
                                <strong>Total de asesores con acceso:</strong> <span id="modal-ver-asesores-total">0</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="asesores-access-list">
                    <h4>Lista de Asesores con Acceso</h4>
                    <div class="table-responsive" style="max-height: 400px; overflow-y: auto; margin-top: 20px;">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Usuario</th>
                                    <th>Cédula</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="modal-ver-asesores-tbody">
                                <tr>
                                    <td colspan="4" class="text-center">
                                        <i class="fas fa-spinner fa-spin"></i> Cargando asesores...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="cerrarModalVerAsesores()">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Modal de Asignaciones de Asesores -->
    <div class="modal" id="modal-asignaciones-asesores">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Dar Acceso a Base de Clientes</h3>
                <button class="modal-close" onclick="cerrarModalAsignaciones()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="base-assignment-info">
                    <div class="base-info-card">
                        <h4 id="modal-assignment-base-name">Base de Clientes</h4>
                        <div class="base-details">
                            <span class="base-detail-item">
                                <i class="fas fa-database"></i>
                                <strong>Base:</strong> <span id="modal-assignment-base-details">-</span>
                            </span>
                            <span class="base-detail-item">
                                <i class="fas fa-users"></i>
                                <strong>Clientes:</strong> <span id="modal-assignment-base-clients">0</span>
                            </span>
                            <span class="base-detail-item">
                                <i class="fas fa-user-check"></i>
                                <strong>Asesores asignados:</strong> <span id="modal-assignment-count">0</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="asesores-assignment-section">
                    <h4>Seleccionar Asesores</h4>
                    <p class="section-description">Seleccione los asesores que tendrán <strong>acceso completo</strong> a esta base de clientes. Los asesores seleccionados podrán buscar y gestionar todos los clientes de esta base. Para asignar clientes específicos, use la pestaña "TAREAS".</p>
                    
                    <div class="asesores-list">
                        <div class="asesores-filters">
                            <div class="filter-group">
                                <label>Buscar asesor:</label>
                                <input type="text" id="search-asesor-assignment" class="form-control" placeholder="Nombre o usuario del asesor..." onkeyup="filtrarAsesoresAsignacion()">
                            </div>
                            <div class="filter-group">
                                <label>Estado:</label>
                                <select id="filter-estado-assignment" class="form-control" onchange="filtrarAsesoresAsignacion()">
                                    <option value="">Todos</option>
                                    <option value="activo">Activos</option>
                                    <option value="inactivo">Inactivos</option>
                                </select>
                            </div>
                        </div>

                        <div class="asesores-checkbox-list" id="asesores-assignment-list">
                            <!-- Los asesores se cargarán dinámicamente aquí -->
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando asesores...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="assignment-summary" id="assignment-summary" style="display: none;">
                    <h4>Resumen de Acceso</h4>
                    <div class="summary-content">
                        <div class="summary-item">
                            <span class="summary-label">Asesores seleccionados:</span>
                            <span class="summary-value" id="selected-assignment-count">0</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Tipo de acceso:</span>
                            <span class="summary-value" id="assignment-access-type">Acceso completo a la base de clientes</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Permisos:</span>
                            <span class="summary-value" id="assignment-permissions">Búsqueda, visualización y gestión de todos los clientes</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="cerrarModalAsignaciones()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarAsignacionesAsesores()" id="btn-guardar-asignaciones" disabled>
                    <i class="fas fa-key"></i> Otorgar Acceso
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Ver Asignaciones -->
    <div class="modal" id="modal-ver-asignaciones" style="display: none;">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Asignaciones Pendientes</h3>
                <button class="modal-close" onclick="cerrarModalVerAsignaciones()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="asignaciones-info">
                    <p class="section-description">Lista de todas las asignaciones de clientes a asesores que están pendientes o en progreso. Use el botón "Completar" para finalizar una asignación.</p>
                </div>
                
                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; margin-top: 20px;">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Base</th>
                                <th>Asesor</th>
                                <th>Clientes</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="modal-asignaciones-tbody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando asignaciones...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="cerrarModalVerAsignaciones()">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Modal de Filtros Avanzados -->
    <div class="modal" id="modal-filtros-obligaciones" style="display: none;">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-filter"></i> Filtros Avanzados por Obligaciones</h3>
                <button class="modal-close" onclick="cerrarModalFiltros()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="filtros-container">
                    <p class="section-description">Seleccione los filtros que desea aplicar. Los clientes se filtrarán según las características de sus obligaciones.</p>
                    
                    <div class="filtros-grid">
                        <!-- Filtro: Oficina -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-oficina-activo" onchange="toggleFiltro('oficina')">
                                <strong>Oficina</strong>
                            </label>
                            <select id="filtro-oficina" class="form-control" disabled style="margin-top: 5px;">
                                <option value="">Cargando...</option>
                            </select>
                        </div>

                        <!-- Filtro: Año Castigo -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-ano-castigo-activo" onchange="toggleFiltro('ano_castigo')">
                                <strong>Año de Castigo</strong>
                            </label>
                            <select id="filtro-ano-castigo" class="form-control" disabled style="margin-top: 5px;">
                                <option value="">Cargando...</option>
                            </select>
                        </div>

                        <!-- Filtro: Concepto Mes Actual -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-concepto-activo" onchange="toggleFiltro('concepto')">
                                <strong>Concepto Mes Actual</strong>
                            </label>
                            <select id="filtro-concepto" class="form-control" disabled style="margin-top: 5px;">
                                <option value="">Cargando...</option>
                            </select>
                        </div>

                        <!-- Filtro: Estado Proceso Jurídico -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-estado-proceso-activo" onchange="toggleFiltro('estado_proceso')">
                                <strong>Estado Proceso Jurídico</strong>
                            </label>
                            <select id="filtro-estado-proceso" class="form-control" disabled style="margin-top: 5px;">
                                <option value="">Seleccione...</option>
                                <option value="JUDICIALIZADO">JUDICIALIZADO</option>
                                <option value="NO JUDICIALIZADO">NO JUDICIALIZADO</option>
                            </select>
                        </div>

                        <!-- Filtro: Total -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-total-activo" onchange="toggleFiltro('total')">
                                <strong>Total</strong>
                            </label>
                            <div style="display: flex; gap: 5px; margin-top: 5px;">
                                <select id="filtro-total-operador" class="form-control" disabled style="flex: 0 0 100px;">
                                    <option value=">=">Mayor o igual</option>
                                    <option value="<=">Menor o igual</option>
                                    <option value=">">Mayor que</option>
                                    <option value="<">Menor que</option>
                                    <option value="=">Igual a</option>
                                </select>
                                <input type="number" id="filtro-total-valor" class="form-control" placeholder="0.00" step="0.01" disabled style="flex: 1;">
                            </div>
                        </div>

                        <!-- Filtro: Total a Pagar -->
                        <div class="filtro-item">
                            <label>
                                <input type="checkbox" id="filtro-total-pagar-activo" onchange="toggleFiltro('total_pagar')">
                                <strong>Total a Pagar</strong>
                            </label>
                            <div style="display: flex; gap: 5px; margin-top: 5px;">
                                <select id="filtro-total-pagar-operador" class="form-control" disabled style="flex: 0 0 100px;">
                                    <option value=">=">Mayor o igual</option>
                                    <option value="<=">Menor o igual</option>
                                    <option value=">">Mayor que</option>
                                    <option value="<">Menor que</option>
                                    <option value="=">Igual a</option>
                                </select>
                                <input type="number" id="filtro-total-pagar-valor" class="form-control" placeholder="0.00" step="0.01" disabled style="flex: 1;">
                            </div>
                        </div>

                        <!-- Filtro por árbol de tipificación (según gestiones de la base en historial_gestion) -->
                        <div class="filtro-item" style="grid-column: 1 / -1; margin-top: 10px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                            <h5 style="margin-bottom: 10px;"><i class="fas fa-sitemap"></i> Filtro por tipificación de gestiones</h5>
                            <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">Filtre clientes que tengan al menos una gestión en esta base con el canal y clasificación indicados (ej: Llamada saliente, NO CONTACTO, no_contesta). Puede combinar con los filtros de obligaciones o usar solo tipificación.</p>
                            <div class="filtros-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                                <div>
                                    <label><strong>Canal de contacto</strong></label>
                                    <select id="filtro-canal-contacto" class="form-control" style="margin-top: 5px;">
                                        <option value="">Todos / Sin filtrar</option>
                                    </select>
                                </div>
                                <div>
                                    <label><strong>Nivel 1 - Clasificación</strong></label>
                                    <select id="filtro-nivel1-tipo" class="form-control" style="margin-top: 5px;">
                                        <option value="">Todos / Sin filtrar</option>
                                    </select>
                                </div>
                                <div>
                                    <label><strong>Nivel 2 - Clasificación</strong></label>
                                    <select id="filtro-nivel2-tipo" class="form-control" style="margin-top: 5px;">
                                        <option value="">Todos / Sin filtrar</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin-top: 12px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" id="filtro-incluir-en-tareas-pendientes" value="1">
                                    <span><strong>Incluir clientes que ya están en tareas pendientes</strong></span>
                                </label>
                                <small class="text-muted" style="display: block; margin-left: 28px; margin-top: 4px;">Útil al filtrar por tipificación: así podrá ver y asignar clientes con esa gestión aunque tengan tarea pendiente (ej. seguimiento por tipo de contacto).</small>
                            </div>
                        </div>
                    </div>

                    <div class="filtros-actions" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <button class="btn btn-primary" onclick="aplicarFiltros()">
                            <i class="fas fa-search"></i> Aplicar Filtros
                        </button>
                        <button class="btn btn-secondary" onclick="limpiarFiltros()">
                            <i class="fas fa-eraser"></i> Limpiar Filtros
                        </button>
                    </div>
                </div>

                <!-- Resultados del Filtro -->
                <div id="resultados-filtro" style="display: none; margin-top: 30px; padding-top: 20px; border-top: 2px solid #00c0e1;">
                    <h4>Resultados del Filtro</h4>
                    <div id="resultados-filtro-info" style="padding: 15px; background: #e7f3ff; border-radius: 5px; margin-bottom: 15px;">
                        <p><strong>Clientes encontrados:</strong> <span id="resultados-cantidad">0</span></p>
                        <p><strong>Obligaciones encontradas:</strong> <span id="resultados-obligaciones">0</span></p>
                    </div>
                    <div class="resultados-actions">
                        <button class="btn btn-success" onclick="asignarClientesFiltrados('todos')">
                            <i class="fas fa-check-double"></i> Asignar Todos los Clientes
                        </button>
                        <div style="display: flex; gap: 10px; margin-top: 10px; align-items: center;">
                            <button class="btn btn-primary" onclick="asignarClientesFiltrados('parcial')">
                                <i class="fas fa-check"></i> Asignar
                            </button>
                            <input type="number" id="cantidad-asignar-filtro" class="form-control" placeholder="Cantidad" min="1" style="width: 150px;">
                            <span>clientes del filtro</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="cerrarModalFiltros()">Cerrar</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/coord-comercio-factura.js"></script>
    <script src="assets/js/hybrid-updater.js"></script>
    
    <script>
        // Cerrar modal al hacer clic fuera de él
        window.onclick = function(event) {
            const modals = ['modal-ver-asesores-acceso', 'modal-ver-clientes', 'modal-detalle-cliente', 'modal-acceso-base', 'modal-asignaciones-asesores', 'modal-ver-asignaciones', 'modal-filtros-obligaciones'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && event.target === modal) {
                    if (modalId === 'modal-ver-asesores-acceso') {
                        cerrarModalVerAsesores();
                    } else if (modalId === 'modal-ver-clientes') {
                        closeModalVerClientes();
                    } else if (modalId === 'modal-detalle-cliente') {
                        closeModalDetalleCliente();
                    } else if (modalId === 'modal-acceso-base') {
                        closeModalAccesoBase();
                    } else if (modalId === 'modal-asignaciones-asesores') {
                        cerrarModalAsignaciones();
                    } else if (modalId === 'modal-ver-asignaciones') {
                        cerrarModalVerAsignaciones();
                    } else if (modalId === 'modal-filtros-obligaciones') {
                        cerrarModalFiltros();
                    }
                }
            });
        };
        
        // Función para abrir la pestaña de carga de archivo
        function abrirPestañaCarga() {
            // Cambiar a la pestaña "CARGA DE ARCHIVO"
            cambiarTab('carga-archivo');
        }
        
        // Descargar la plantilla CSV real desde el servidor (mismo formato que la carga)
        function descargarPlantilla() {
            window.open('index.php?action=descargar_plantilla', '_blank');
        }
    </script>

</body>
</html>
