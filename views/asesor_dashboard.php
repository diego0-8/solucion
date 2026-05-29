<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Dashboard Asesor - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
    <link rel="stylesheet" href="assets/css/asesor-dashboard.css">
    <link rel="stylesheet" href="assets/css/coordinador-dashboard.css">
</head>
<body data-user-id="<?php echo $_SESSION['usuario_cedula'] ?? ($_SESSION['usuario_id'] ?? ''); ?>">

    <?php 
    // Incluir navbar compartido
    $action = 'asesor_dashboard';
    include __DIR__ . '/Navbar.php'; 
    ?>

    <div class="main-container">
        <?php 
        // Incluir header compartido
        include __DIR__ . '/Header.php'; 
        ?>

        <!-- Sección Principal del Dashboard -->
        <section class="current-call-section">
            <div class="call-details">
                <h3>ESTADÍSTICAS DEL ASESOR</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Gestión de Clientes</p>
                <small>Resumen de Actividad</small>
                <div class="media-controls">
                    <button class="media-button" onclick="toggleBusqueda()">
                        <i class="fas fa-search"></i> Buscar Cliente
                    </button>
                </div>
                
                <!-- Barra de búsqueda desplegable -->
                <div class="search-bar" id="search-bar" style="display: none;">
                    <div class="search-input-group">
                        <input type="text" id="search-input" placeholder="Buscar por cédula, teléfono, nombre o número de operación..." 
                               onkeyup="buscarClienteRapido(this.value)">
                        <button class="search-btn" onclick="ejecutarBusqueda()">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="clear-btn" onclick="limpiarBusqueda()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <!-- Resultados de búsqueda rápida -->
                    <div class="search-results-quick" id="search-results-quick"></div>
                </div>
                
                <!-- Bases de Clientes Disponibles -->
                <div class="bases-acceso">
                    <h4><i class="fas fa-database"></i> Bases de Clientes Disponibles</h4>
                    <div id="bases-lista">
                        <div class="base-item">
                            <span><i class="fas fa-check-circle"></i> Cargando bases...</span>
                        </div>
                    </div>
                </div>
                
            </div>
            
            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-user-tie"></i>
                    <div>
                        <span class="client-name">Panel de Asesor</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Gestión de Clientes</span>
                    </div>
                </div>

                <div class="main-tabs">
                    <span class="active" onclick="cambiarTab('estadisticas')">ESTADÍSTICAS</span>
                    <span onclick="cambiarTab('clientes')">CLIENTES</span>
                    <span onclick="cambiarTab('gestiones')">GESTIONES</span>
                </div>
                
                <div class="content-sections">
                    <!-- PESTAÑA 1: ESTADÍSTICAS (métricas globales: esté o no el cliente en una tarea) -->
                    <div class="tab-content active" id="tab-estadisticas">
                        <div class="left-content">
                            <h4 class="section-title">Resumen Personal</h4>
                            <p class="section-description" style="margin-bottom: 16px; color: #666; font-size: 13px;">Métricas de todas tus gestiones (clientes en tarea o no)</p>
                            <div class="form-section">
                                <div class="input-group">
                                    <label>Clientes gestionados en el mes</label>
                                    <input type="text" id="stat-clientes-gestionados-mes" value="<?php echo $estadisticas['clientes_gestionados_mes'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Gestiones de hoy</label>
                                    <input type="text" id="stat-gestiones-hoy" value="<?php echo $estadisticas['gestiones_hoy'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Acuerdos de pago</label>
                                    <input type="text" id="stat-acuerdos-pago" value="<?php echo $estadisticas['acuerdos_pago'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Tareas completadas en el mes</label>
                                    <input type="text" id="stat-tareas-completadas-mes" value="<?php echo $estadisticas['tareas_completadas_mes'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Contacto exitoso</label>
                                    <input type="text" id="stat-contacto-exitoso" value="<?php echo $estadisticas['contacto_exitoso'] ?? 0; ?>" readonly title="Llamada saliente: todo lo que no sea NO CONTACTO (nivel 1)">
                                </div>
                                <div class="input-group">
                                    <label>Llamadas realizadas</label>
                                    <input type="text" id="stat-llamadas-realizadas" value="<?php echo $estadisticas['llamadas_realizadas'] ?? 0; ?>" readonly title="Tipificación canal: Llamada saliente">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 2: CLIENTES -->
                    <div class="tab-content" id="tab-clientes">
                        <div class="left-content">
                            <!-- Filtro -->
                            <div class="filtros-clientes">
                                <h4><i class="fas fa-filter"></i> Filtro</h4>
                                <div class="filtros-grid">
                                    <div class="input-group">
                                        <label>Estado de Gestión</label>
                                        <select id="filter-gestionado" onchange="manejarCambioGestion(this.value)">
                                            <option value="">Todos</option>
                                            <option value="gestionado">Ya gestionado</option>
                                            <option value="no_gestionado">No gestionado</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Estado de Contacto</label>
                                        <select id="filter-contactado">
                                            <option value="">Todos</option>
                                            <option value="contactado">Contactado</option>
                                            <option value="no_contactado">No contactado</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Fecha de Gestión</label>
                                        <input type="date" id="filter-fecha">
                                    </div>
                                    <div class="input-group btn-group-filtros">
                                        <button type="button" class="btn btn-primary" onclick="aplicarFiltrosClientes()"><i class="fas fa-search"></i> Aplicar</button>
                                        <button type="button" class="btn btn-secondary" onclick="limpiarFiltrosClientes()"><i class="fas fa-times"></i> Limpiar</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="clientes-header">
                            <h4 class="section-title">Lista de Clientes</h4>
                                
                                <!-- Barra de búsqueda específica para la lista de clientes -->
                                <div class="clientes-search-bar">
                                    <div class="search-input-group">
                                        <input type="text" id="clientes-search-input" placeholder="Buscar por cédula, teléfono, nombre o número de operación..." 
                                               onkeyup="if(event.key==='Enter') ejecutarBusquedaClientes()">
                                        <button class="search-btn" onclick="ejecutarBusquedaClientes()">
                                            <i class="fas fa-search"></i>
                                        </button>
                                        <button class="clear-btn" onclick="limpiarBusquedaClientes()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Contenedor principal con dos columnas -->
                            <div class="clientes-main-container">
                                
                                <!-- Columna izquierda: Lista de clientes -->
                                <div class="clientes-table-container">
                                <div class="table-responsive">
                                    <table class="clientes-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Celular</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php
                                            $limite_clientes = defined('ASESOR_DASHBOARD_LIMIT_CLIENTES') ? (int) ASESOR_DASHBOARD_LIMIT_CLIENTES : 500;
                                            $mostrando_limite = isset($clientes) && is_array($clientes) && count($clientes) >= $limite_clientes && $limite_clientes > 0;
                                            if ($mostrando_limite): ?>
                                                <tr><td colspan="3" class="text-muted"><i class="fas fa-info-circle"></i> Mostrando los primeros <?php echo $limite_clientes; ?> clientes. Use la búsqueda para encontrar más.</td></tr>
                                            <?php endif; ?>
                                            <?php if (isset($clientes) && !empty($clientes) && is_array($clientes)): ?>
                                                <?php foreach ($clientes as $comercio): ?>
                                                    <tr data-comercio-id="<?php echo $comercio['ID_COMERCIO'] ?? $comercio['id'] ?? ''; ?>">
                                                        <td>
                                                            <div class="user-info">
                                                                <div class="user-details">
                                                                    <strong><?php echo htmlspecialchars($comercio['NOMBRE_COMERCIO'] ?? $comercio['nombre_comercio'] ?? '-'); ?></strong>
                                                                    <small>NIT CXC: <?php echo htmlspecialchars($comercio['NIT_CXC'] ?? $comercio['nit_cxc'] ?? '-'); ?></small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span class="phone-number"><?php echo htmlspecialchars($comercio['CEL'] ?? $comercio['cel'] ?? '-'); ?></span>
                                                        </td>
                                                        <td>
                                                            <div class="action-buttons">
                                                                <button class="btn-action btn-manage" onclick="gestionarCliente('<?php echo $comercio['ID_COMERCIO'] ?? $comercio['id'] ?? ''; ?>')" title="Gestionar">
                                                                    <i class="fas fa-edit"></i> Gestionar
                                                                </button>
                                                                <button class="btn-action btn-history" onclick="verHistorialCliente('<?php echo $comercio['ID_COMERCIO'] ?? $comercio['id'] ?? ''; ?>')" title="Historial">
                                                                    <i class="fas fa-history"></i> Historial
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            <?php else: ?>
                                                <tr>
                                                    <td colspan="3" class="no-data">
                                                        <i class="fas fa-users"></i>
                                                        <p>No hay clientes asignados</p>
                                                        <small>Contacte al coordinador para obtener tareas</small>
                                                    </td>
                                                </tr>
                                            <?php endif; ?>
                                        </tbody>
                                    </table>
                                </div>
                                <div id="clientes-paginador" style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;"></div>
                                </div>
                                
                                <!-- Columna derecha: Resumen de tareas -->
                                <div class="resumen-tareas-container">
                                    <h4 class="section-title">Resumen de Tareas</h4>
                                    <div class="table-responsive">
                                        <table class="clientes-table">
                                            <thead>
                                                <tr>
                                                    <th>Base</th>
                                                    <th>Asignados</th>
                                                    <th>Gestionados</th>
                                                    <th>Pendientes</th>
                                                    <th>Progreso</th>
                                                </tr>
                                            </thead>
                                            <tbody id="resumen-tareas-body">
                                                <tr>
                                                    <td colspan="5" class="no-data">
                                                        <i class="fas fa-spinner fa-spin"></i>
                                                        <p>Cargando resumen...</p>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 3: GESTIONES (listado de gestiones del asesor con filtros y paginación) -->
                    <div class="tab-content" id="tab-gestiones">
                        <div class="left-content">
                            <div class="filtros-clientes">
                                <h4><i class="fas fa-filter"></i> Filtros</h4>
                                <div class="filtros-grid">
                                    <div class="input-group">
                                        <label>Canal de comunicación</label>
                                        <select id="gestiones-filter-canal">
                                            <option value="">Todos</option>
                                            <option value="llamada_saliente">Llamada saliente</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="email">Email</option>
                                            <option value="recibir_llamada">Recibir llamada</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Nivel 1 (Clasificación)</label>
                                        <select id="gestiones-filter-nivel1">
                                            <option value="">Todos</option>
                                        </select>
                                    </div>
                                    <div class="input-group">
                                        <label>Nivel 2 (Tipificación)</label>
                                        <select id="gestiones-filter-nivel2">
                                            <option value="">Todos</option>
                                        </select>
                                    </div>
                                    <div class="input-group btn-group-filtros">
                                        <button type="button" class="btn btn-primary" onclick="aplicarFiltrosGestiones()"><i class="fas fa-search"></i> Aplicar</button>
                                        <button type="button" class="btn btn-secondary" onclick="limpiarFiltrosGestiones()"><i class="fas fa-times"></i> Limpiar</button>
                                    </div>
                                </div>
                            </div>
                            <div class="clientes-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                                <h4 class="section-title" style="margin: 0;">Lista de gestiones</h4>
                                <div class="clientes-search-bar" style="flex: 1; min-width: 260px; max-width: 400px;">
                                    <div class="search-input-group">
                                        <input type="text" id="gestiones-search-input" placeholder="Cédula, obligación, teléfono o nombre..." 
                                               onkeyup="if(event.key==='Enter') cargarGestiones(1)">
                                        <button class="search-btn" onclick="cargarGestiones(1)"><i class="fas fa-search"></i></button>
                                        <button class="clear-btn" onclick="document.getElementById('gestiones-search-input').value=''; cargarGestiones(1);"><i class="fas fa-times"></i></button>
                                    </div>
                                </div>
                            </div>
                            <div id="gestiones-lista-container">
                                <div class="table-responsive">
                                    <table class="clientes-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Cliente</th>
                                                <th>Canal / Nivel 1 / Nivel 2</th>
                                                <th>Obligación</th>
                                                <th>Acuerdo</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="gestiones-tbody">
                                            <tr><td colspan="6" class="no-data"><i class="fas fa-spinner fa-spin"></i> Cargando gestiones...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div id="gestiones-paginador" style="margin-top: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;"></div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    </div>

    <!-- Modal de Tiempo de Sesión -->
    <div id="modal-tiempo-sesion" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; min-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #007bff;">
                    <i class="fas fa-clock"></i> Tiempo de Sesión
                </h3>
                <button onclick="toggleTiempoModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <span style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Hora Actual</span>
                    <span id="reloj-activo" style="font-size: 20px; font-weight: 700; color: #007bff;">--:-- --</span>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <span style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Tiempo de Sesión</span>
                    <span id="tiempo-sesion" style="font-size: 20px; font-weight: 700; color: #28a745;">00:00:00</span>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="btn-pausa" onclick="iniciarPausaBreak()" style="padding: 12px; background: #ffc107; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-coffee"></i> Break
                    </button>
                    <button id="btn-almuerzo" onclick="iniciarPausaAlmuerzo()" style="padding: 12px; background: #fd7e14; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-utensils"></i> Almuerzo
                    </button>
                    <button id="btn-bano" onclick="iniciarPausaBano()" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-toilet"></i> Baño
                    </button>
                    <button id="btn-mantenimiento" onclick="iniciarPausaMantenimiento()" style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-tools"></i> Mantenimiento 
                    </button>
                    <button id="btn-pausa-activa" onclick="iniciarPausaActiva()" style="padding: 12px; background: #20c997; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-running"></i> Pausa Activa
                    </button>
                    <button id="btn-actividad-extra" onclick="iniciarActividadExtra()" style="padding: 12px; background: #6610f2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-stopwatch"></i> Actividad Extra
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de Pausa (cuando está en pausa) -->
    <div id="modal-pausa" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
            <i class="fas fa-clock" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">En Pausa</h3>
            <p style="margin: 0 0 20px 0; color: #666;" id="tipo-pausa-texto">Break de 30 minutos</p>
            <div style="font-size: 32px; font-weight: 700; color: #007bff; margin-bottom: 20px;">
                <span class="tiempo-pausa">30:00</span>
            </div>
            <button onclick="mostrarModalVerificacion()" class="btn btn-primary" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-play"></i> Continuar Trabajo
            </button>
        </div>
    </div>

    <!-- Modal de Verificación de Contraseña -->
    <div id="modal-verificacion-contrasena" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10002; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <i class="fas fa-lock" style="font-size: 48px; color: #007bff; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">Verificación de Contraseña</h3>
            <p style="margin: 0 0 20px 0; color: #666;">Ingrese su contraseña para reanudar la sesión</p>
            
            <div style="margin-bottom: 20px; text-align: left;">
                <label for="input-contrasena-verificacion" style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">Contraseña:</label>
                <input type="password" id="input-contrasena-verificacion" placeholder="Ingrese su contraseña" 
                       style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                       onkeypress="if(event.key === 'Enter') verificarContrasena();">
            </div>
            
            <div id="mensaje-error-verificacion" style="display: none; background: #f8d7da; color: #721c24; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px;">
                Contraseña incorrecta. Intentos restantes: <span id="intentos-restantes">3</span>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="verificarContrasena()" class="btn btn-primary" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Verificar
                </button>
                <button onclick="cerrarModalVerificacion()" class="btn btn-secondary" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Actividad Extra (cronómetro) -->
    <div id="modal-actividad-extra" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
            <i class="fas fa-stopwatch" style="font-size: 48px; color: #6610f2; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">Actividad Extra</h3>
            <p style="margin: 0 0 20px 0; color: #666;">En progreso...</p>
            <div style="font-size: 32px; font-weight: 700; color: #007bff; margin-bottom: 20px;">
                <span id="tiempo-actividad-extra">00:00:00</span>
            </div>
            <button onclick="finalizarActividadExtra()" class="btn btn-primary" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-stop"></i> Finalizar Actividad
            </button>
        </div>
    </div>

    <script src="assets/js/navbar-busqueda-cliente.js"></script>
    <script src="assets/js/asesor-dashboard.js"></script>
    <script src="assets/js/asesor-clientes.js"></script>
    <script src="assets/js/asesor-tiempos.js"></script>
    <script src="assets/js/hybrid-updater.js"></script>
    <script src="assets/js/header-recordatorios-asesor.js"></script>
    
    <script>
        // Función para abrir/cerrar modal de tiempo
        function toggleTiempoModal() {
            const modalTiempo = document.getElementById('modal-tiempo-sesion');
            const modalPausa = document.getElementById('modal-pausa');
            
            // Si está en pausa, mostrar el modal de pausa en vez del de tiempo
            if (window.asesorTiemposGlobal && window.asesorTiemposGlobal.estaPausado) {
                if (modalPausa) {
                    modalPausa.style.display = 'flex';
                }
                // No abrir el modal de tiempo si está en pausa
                return;
            }
            
            // Si no está en pausa, mostrar el modal de tiempo normal
            if (modalTiempo) {
                modalTiempo.style.display = modalTiempo.style.display === 'none' ? 'flex' : 'none';
            }
        }
        
        // Funciones globales para los botones de pausa
        function iniciarPausaBreak() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('break');
            }
        }
        
        function iniciarPausaAlmuerzo() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('almuerzo');
            }
        }
        
        // Variables para la verificación de contraseña
        let intentosVerificacion = 3;
        
        function mostrarModalVerificacion() {
            const modal = document.getElementById('modal-verificacion-contrasena');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('input-contrasena-verificacion').value = '';
                document.getElementById('mensaje-error-verificacion').style.display = 'none';
                intentosVerificacion = 3;
                document.getElementById('intentos-restantes').textContent = '3';
            }
        }
        
        function cerrarModalVerificacion() {
            const modal = document.getElementById('modal-verificacion-contrasena');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        async function verificarContrasena() {
            const contrasena = document.getElementById('input-contrasena-verificacion').value;
            const mensajeError = document.getElementById('mensaje-error-verificacion');
            const intentosRestantes = document.getElementById('intentos-restantes');
            
            if (!contrasena) {
                alert('Por favor ingrese su contraseña');
                return;
            }
            
            try {
                const response = await fetch('index.php?action=verificar_contrasena', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contrasena: contrasena
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Contraseña correcta, cerrar modal de verificación
                    cerrarModalVerificacion();
                    
                    // Finalizar la pausa
                    if (window.asesorTiempos) {
                        window.asesorTiempos.finalizarPausa();
                    }
                    
                    intentosVerificacion = 3;
                } else {
                    // Contraseña incorrecta
                    intentosVerificacion--;
                    
                    if (intentosVerificacion > 0) {
                        mensajeError.style.display = 'block';
                        intentosRestantes.textContent = intentosVerificacion;
                        document.getElementById('input-contrasena-verificacion').value = '';
                    } else {
                        alert('Demasiados intentos fallidos. La cuenta será bloqueada temporalmente por seguridad.');
                        window.location.href = 'index.php?action=logout';
                    }
                }
            } catch (error) {
                console.error('Error al verificar contraseña:', error);
                alert('Error al verificar la contraseña. Por favor intente nuevamente.');
            }
        }
        
        function finalizarPausa() {
            // Esta función ahora se llama después de la verificación
            if (window.asesorTiempos) {
                window.asesorTiempos.finalizarPausa();
            }
        }
        
        function iniciarPausaBano() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('bano');
            }
        }
        
        function iniciarPausaMantenimiento() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('mantenimiento');
            }
        }
        
        function iniciarPausaActiva() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('pausa_activa');
            }
        }
        
        function iniciarActividadExtra() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarActividadExtra();
            }
        }
        
        function finalizarActividadExtra() {
            if (window.asesorTiempos) {
                window.asesorTiempos.finalizarActividadExtra();
            }
        }
        
        // Función para manejar el cambio en el filtro de gestión
        function manejarCambioGestion(valor) {
            const filterContactado = document.getElementById('filter-contactado');
            const labelContactado = filterContactado.previousElementSibling;
            
            if (valor === 'no_gestionado') {
                // Si no gestionado está seleccionado, deshabilitar y limpiar el filtro de contacto
                filterContactado.disabled = true;
                filterContactado.value = '';
                filterContactado.style.opacity = '0.5';
                labelContactado.style.opacity = '0.5';
            } else {
                // Si gestionado está seleccionado, habilitar el filtro de contacto
                filterContactado.disabled = false;
                filterContactado.style.opacity = '1';
                labelContactado.style.opacity = '1';
            }
        }
        
        // Funciones para los filtros de clientes (solo comercios asignados por tareas)
        async function aplicarFiltrosClientes() {
            const gestionado = document.getElementById('filter-gestionado').value;
            const contactado = document.getElementById('filter-contactado').value;
            const fecha = document.getElementById('filter-fecha').value;
            
            console.log('Aplicando filtros:', { gestionado, contactado, fecha });
            
            try {
                // Construir URL con parámetros de filtro
                const params = new URLSearchParams();
                if (gestionado) params.append('gestionado', gestionado);
                if (contactado) params.append('contactado', contactado);
                if (fecha) params.append('fecha', fecha);
                
                const response = await fetch(`index.php?action=obtener_clientes_filtrados&${params.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Error al obtener clientes filtrados');
                }
                
                const data = await response.json();
                
                // Compatibilidad: algunos endpoints antiguos podían devolver un array directo
                let lista = [];
                if (Array.isArray(data)) {
                    lista = data;
                } else if (data && data.success) {
                    lista = Array.isArray(data.clientes) ? data.clientes : [];
                } else {
                    throw new Error((data && data.message) ? data.message : 'Respuesta inválida');
                }
                
                // Actualizar la tabla de clientes
                actualizarTablaClientes(lista);
                
                console.log('Clientes filtrados obtenidos:', lista);
                
            } catch (error) {
                console.error('Error al aplicar filtros:', error);
                alert('Error al aplicar filtros. Por favor intente nuevamente.');
            }
        }
        
        function limpiarFiltrosClientes() {
            document.getElementById('filter-gestionado').value = '';
            document.getElementById('filter-contactado').value = '';
            document.getElementById('filter-fecha').value = '';
            
            // Habilitar el filtro de contacto si estaba deshabilitado
            const filterContactado = document.getElementById('filter-contactado');
            const labelContactado = filterContactado.previousElementSibling;
            filterContactado.disabled = false;
            filterContactado.style.opacity = '1';
            labelContactado.style.opacity = '1';
            
            console.log('Filtros limpiados');
            
            // Recargar todos los clientes asignados
            aplicarFiltrosClientes();
        }
        
        // ==========================
        // CLIENTES: paginación local
        // ==========================
        const CLIENTES_POR_PAGINA = 4;
        let clientesListaActual = [];
        let clientesPaginaActual = 1;

        function obtenerIdClienteListado(row) {
            return row ? (row.ID_COMERCIO || row.id) : '';
        }

        function escapeHtml(valor) {
            return String(valor ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function asegurarPaginadorClientes() {
            let pag = document.getElementById('clientes-paginador');
            if (pag) return pag;
            // Fallback si el HTML no lo trae
            const cont = document.querySelector('#tab-clientes .clientes-table-container');
            if (!cont) return null;
            pag = document.createElement('div');
            pag.id = 'clientes-paginador';
            pag.style.cssText = 'margin-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;';
            cont.appendChild(pag);
            return pag;
        }

        function pintarTablaClientesPagina(lista, pagina) {
            const tbody = document.querySelector('#tab-clientes .clientes-table tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const arr = Array.isArray(lista) ? lista : [];
            if (arr.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="no-data">
                            <i class="fas fa-users"></i>
                            <p>No se encontraron clientes con los filtros aplicados</p>
                            <small>Intente ajustar los criterios de búsqueda</small>
                        </td>
                    </tr>
                `;
                const pagEl = asegurarPaginadorClientes();
                if (pagEl) pagEl.innerHTML = '';
                return;
            }

            const pag = Math.max(1, parseInt(pagina || 1, 10));
            const totalPag = Math.max(1, Math.ceil(arr.length / CLIENTES_POR_PAGINA));
            const page = Math.min(pag, totalPag);
            clientesPaginaActual = page;
            const start = (page - 1) * CLIENTES_POR_PAGINA;
            const end = start + CLIENTES_POR_PAGINA;
            const slice = arr.slice(start, end);

            slice.forEach(comercio => {
                const id = obtenerIdClienteListado(comercio);
                const idEsc = encodeURIComponent(String(id ?? ''));
                const nombre = escapeHtml(comercio.NOMBRE_COMERCIO || comercio.nombre_comercio || '-');
                const nit = escapeHtml(comercio.NIT_CXC || comercio.nit_cxc || '-');
                const cel = escapeHtml(comercio.CEL || comercio.cel || '-');

                const row = document.createElement('tr');
                row.setAttribute('data-comercio-id', id);
                row.innerHTML = `
                    <td>
                        <div class="user-info">
                            <div class="user-details">
                                <strong>${nombre}</strong>
                                <small>NIT CXC: ${nit}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="phone-number">${cel}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-manage" onclick="gestionarCliente(decodeURIComponent('${idEsc}'))" title="Gestionar">
                                <i class="fas fa-edit"></i> Gestionar
                            </button>
                            <button class="btn-action btn-history" onclick="verHistorialCliente(decodeURIComponent('${idEsc}'))" title="Historial">
                                <i class="fas fa-history"></i> Historial
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            const pagEl = asegurarPaginadorClientes();
            if (pagEl) {
                let html = '<span class="text-muted">Total: ' + arr.length + ' clientes</span>';
                if (totalPag > 1) {
                    html += ' <div style="display:flex; gap:6px; align-items:center;">';
                    if (page > 1) html += '<button type="button" class="btn btn-sm btn-secondary" onclick="cambiarPaginaClientes(' + (page - 1) + ')"><i class="fas fa-chevron-left"></i></button>';
                    html += '<span>Página ' + page + ' de ' + totalPag + '</span>';
                    if (page < totalPag) html += '<button type="button" class="btn btn-sm btn-secondary" onclick="cambiarPaginaClientes(' + (page + 1) + ')"><i class="fas fa-chevron-right"></i></button>';
                    html += '</div>';
                }
                pagEl.innerHTML = html;
            }
        }

        function cambiarPaginaClientes(pagina) {
            pintarTablaClientesPagina(clientesListaActual, pagina);
        }

        function actualizarTablaClientes(clientes) {
            clientesListaActual = Array.isArray(clientes) ? clientes : [];
            pintarTablaClientesPagina(clientesListaActual, 1);
        }

        // Buscar por CC o Número de Obligación dentro de los clientes ASIGNADOS
        async function ejecutarBusquedaClientes() {
            const termino = document.getElementById('clientes-search-input').value.trim();
            const tbody = document.querySelector('#tab-clientes .clientes-table tbody');
            if (!tbody) return;
            if (!termino) { aplicarFiltrosClientes(); return; }
            try {
                const resp = await fetch('index.php?action=buscar_cliente_asesor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ criterio: 'auto', termino })
                });
                const data = await resp.json();
                const resultados = Array.isArray(data.clientes) ? data.clientes : [];
                // Limitar a IDs que estén actualmente asignados (lista completa, no solo la página visible)
                const asignadosIds = (Array.isArray(clientesListaActual) ? clientesListaActual : []).map(c => String(obtenerIdClienteListado(c)));
                const filtrados = resultados.filter(c => asignadosIds.includes(String(obtenerIdClienteListado(c))));
                
                actualizarTablaClientesAsignados(filtrados);
            } catch (e) {
                console.error('Error en búsqueda de clientes:', e);
            }
        }

        function limpiarBusquedaClientes() {
            const input = document.getElementById('clientes-search-input');
            input.value = '';
            aplicarFiltrosClientes();
        }

        function actualizarTablaClientesAsignados(lista) {
            clientesListaActual = Array.isArray(lista) ? lista : [];
            pintarTablaClientesPagina(clientesListaActual, 1);
        }
        
        // Función para actualizar estadísticas automáticamente
        async function actualizarEstadisticas() {
            try {
                const response = await fetch('index.php?action=obtener_estadisticas_asesor', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Error al obtener estadísticas');
                }
                
                const data = await response.json();
                
                // Extraer estadísticas de la respuesta
                const estadisticas = (data.success && data.estadisticas) ? data.estadisticas : {};
                
                // Actualizar campos de la pestaña Estadísticas (resumen personal)
                const setStat = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.value = value ?? 0;
                };
                setStat('stat-clientes-gestionados-mes', estadisticas.clientes_gestionados_mes);
                setStat('stat-gestiones-hoy', estadisticas.gestiones_hoy);
                setStat('stat-acuerdos-pago', estadisticas.acuerdos_pago);
                setStat('stat-tareas-completadas-mes', estadisticas.tareas_completadas_mes);
                setStat('stat-contacto-exitoso', estadisticas.contacto_exitoso);
                setStat('stat-llamadas-realizadas', estadisticas.llamadas_realizadas);
                
                console.log('Estadísticas actualizadas:', estadisticas);
                
            } catch (error) {
                console.error('Error al actualizar estadísticas:', error);
            }
        }
        
        // Función para actualizar resumen de tareas
        async function actualizarResumenTareas() {
            try {
                console.log('[ResumenTareas] solicitando obtener_resumen_tareas...');
                const response = await fetch('index.php?action=obtener_resumen_tareas', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    throw new Error(`Error HTTP al obtener resumen de tareas: ${response.status}`);
                }
                
                const raw = await response.text();
                let data = {};
                try {
                    data = JSON.parse(raw);
                } catch (e) {
                    console.warn('[ResumenTareas] respuesta no es JSON:', raw.substring(0, 300));
                    throw new Error('Respuesta no válida (no JSON)');
                }
                const tbody = document.getElementById('resumen-tareas-body');
                
                if (!tbody) return;
                
                // Limpiar contenido anterior
                tbody.innerHTML = '';
                
                // Extraer el array de tareas de la respuesta
                const resumenTareas = (data.success && Array.isArray(data.tareas)) ? data.tareas : [];
                console.log('[ResumenTareas] respuesta:', data);
                
                if (resumenTareas.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="no-data">
                                <i class="fas fa-tasks"></i>
                                <p>${(data && data.message) ? data.message : 'No hay tareas activas'}</p>
                                <small>Si acaba de asignar una tarea, recargue o espere 30s</small>
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                // Generar filas para cada tarea
                resumenTareas.forEach(tarea => {
                    const progresoColor = tarea.porcentaje_progreso >= 80 ? 'green' : 
                                        tarea.porcentaje_progreso >= 50 ? 'orange' : 'red';
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <div class="user-info">
                                <div class="user-details">
                                    <strong>${tarea.base_nombre}</strong>
                                    <small>ID: ${tarea.tarea_id} | ${tarea.fecha_asignacion}</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="phone-number">${tarea.total_clientes_asignados}</span>
                        </td>
                        <td>
                            <span style="color: #28a745; font-weight: bold;">${tarea.clientes_gestionados}</span>
                        </td>
                        <td>
                            <span style="color: #dc3545; font-weight: bold;">${tarea.clientes_pendientes}</span>
                        </td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="flex: 1; background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden;">
                                    <div style="background: ${progresoColor}; height: 100%; width: ${tarea.porcentaje_progreso}%; transition: width 0.3s ease;"></div>
                                </div>
                                <span style="font-size: 12px; font-weight: bold; color: ${progresoColor};">${tarea.porcentaje_progreso}%</span>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                
                console.log('Resumen de tareas actualizado:', resumenTareas);
                
            } catch (error) {
                console.error('Error al actualizar resumen de tareas:', error);
                const tbody = document.getElementById('resumen-tareas-body');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="no-data">
                                <i class="fas fa-exclamation-triangle"></i>
                                <p>Error al cargar resumen</p>
                                <small>Intente recargar la página</small>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        // Actualizar estadísticas cada 30 segundos
        setInterval(actualizarEstadisticas, 30000);
        
        // Actualizar resumen de tareas cada 30 segundos
        setInterval(actualizarResumenTareas, 30000);
        
        // Actualizar estadísticas cuando se regresa a la pestaña de estadísticas
        function cambiarTab(tabName, evt) {
            // Ocultar todas las pestañas
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Remover clase active de todos los spans
            const tabSpans = document.querySelectorAll('.main-tabs span');
            tabSpans.forEach(span => span.classList.remove('active'));
            
            // Mostrar la pestaña seleccionada
            document.getElementById('tab-' + tabName).classList.add('active');
            
            // Activar el span correspondiente
            const targetSpan = (evt && evt.target) ? evt.target : document.querySelector('.main-tabs span[onclick*="' + tabName + '"]');
            if (targetSpan) targetSpan.classList.add('active');
            
            if (tabName === 'estadisticas') {
                actualizarEstadisticas();
            }
            if (tabName === 'clientes') {
                actualizarResumenTareas();
            }
            if (tabName === 'gestiones') {
                if (typeof cargarGestiones === 'function') cargarGestiones(1);
            }
        }
        
        // Datos iniciales de clientes asignados renderizados por PHP
        const comerciosAsignadosInicial = <?php echo json_encode($clientes ?? [], JSON_UNESCAPED_UNICODE); ?>;

        // Cargar resumen de tareas al cargar la página
        document.addEventListener('DOMContentLoaded', function() {
            actualizarResumenTareas();
            actualizarEstadisticas();
            // Pintar la tabla con los datos de clientes asignados al cargar
            actualizarTablaClientes(comerciosAsignadosInicial);
        });
        
        // Función global para gestionar cliente (para compatibilidad)
        function gestionarCliente(clienteId) {
            window.location.href = 'index.php?action=asesor_gestionar&cliente_id=' + clienteId;
        }
        
        // Función global para ver historial (para compatibilidad)
        function verHistorialCliente(clienteId) {
            window.location.href = 'index.php?action=asesor_gestionar&cliente_id=' + clienteId;
        }

        // ========== Pestaña GESTIONES: filtros (canal, nivel1, nivel2), búsqueda, paginación 6 por página ==========
        const GESTIONES_POR_PAGINA = 6;
        const opcionesNivel1PorCanal = {
            llamada_saliente: [{ value: 'YA PAGO', text: 'YA PAGO' }, { value: 'ACUERDO DE PAGO', text: 'ACUERDO DE PAGO' }, { value: 'RECORDATORIO', text: 'RECORDATORIO' }, { value: 'VOLUNTAD DE PAGO', text: 'VOLUNTAD DE PAGO' }, { value: 'LOCALIZADO SIN ACUERDO', text: 'LOCALIZADO SIN ACUERDO' }, { value: 'FALLECIDO', text: 'FALLECIDO' }, { value: 'NO CONTACTO', text: 'NO CONTACTO' }],
            whatsapp: [{ value: 'YA PAGO', text: 'YA PAGO' }, { value: 'ACUERDO DE PAGO', text: 'ACUERDO DE PAGO' }, { value: 'RECORDATORIO', text: 'RECORDATORIO' }, { value: 'VOLUNTAD DE PAGO', text: 'VOLUNTAD DE PAGO' }, { value: 'LOCALIZADO SIN ACUERDO', text: 'LOCALIZADO SIN ACUERDO' }, { value: 'FALLECIDO', text: 'FALLECIDO' }, { value: 'NO CONTACTO', text: 'NO CONTACTO' }],
            email: [{ value: 'NO ENTREGADO', text: 'NO ENTREGADO' }, { value: 'ENTREGADO', text: 'ENTREGADO' }, { value: 'ENVIO DE MENSAJE A TITULAR', text: 'ENVIO DE MENSAJE A TITULAR' }],
            recibir_llamada: [{ value: 'YA PAGO', text: 'YA PAGO' }, { value: 'ACUERDO DE PAGO', text: 'ACUERDO DE PAGO' }, { value: 'VOLUNTAD DE PAGO', text: 'VOLUNTAD DE PAGO' }, { value: 'LOCALIZADO SIN ACUERDO', text: 'LOCALIZADO SIN ACUERDO' }, { value: 'FALLECIDO', text: 'FALLECIDO' }, { value: 'NO CONTACTO', text: 'NO CONTACTO' }]
        };
        const opcionesNivel2PorNivel1 = {
            'ACUERDO DE PAGO': [{ value: 'acuerdo_pago_total', text: 'Acuerdo pago total' }, { value: 'acuerdo_largo_plazo', text: 'Acuerdo a largo plazo' }, { value: 'acuerdo_aprobado', text: 'Acuerdo aprobado comité' }],
            'YA PAGO': [{ value: 'pago_total', text: 'Pago total' }, { value: 'pago_cuota', text: 'Pago cuota' }],
            'RECORDATORIO': [{ value: 'seguimiento', text: 'Seguimiento negociación vigente' }],
            'VOLUNTAD DE PAGO': [{ value: 'volver_llamar', text: 'Volver a llamar' }, { value: 'propuesta_estudio', text: 'Propuesta en estudio' }, { value: 'posible_negociacion', text: 'Posible negociación' }],
            'LOCALIZADO SIN ACUERDO': [{ value: 'volver_llamar', text: 'Volver a llamar' }, { value: 'no_reconoce', text: 'No reconoce la obligación' }, { value: 'dificultad_pago', text: 'Dificultad de pago' }, { value: 'reclamacion', text: 'Reclamación' }, { value: 'renuente', text: 'Renuente' }, { value: 'contesta_cuelga', text: 'Contesta y cuelga' }, { value: 'contacto_tercero', text: 'Contacto con tercero' }],
            'FALLECIDO': [{ value: 'fallecido', text: 'Fallecido' }],
            'NO CONTACTO': [{ value: 'no_contesta', text: 'No contesta' }, { value: 'buzon_mensaje', text: 'Buzón de mensaje' }, { value: 'fuera_servicio', text: 'Fuera de servicio' }, { value: 'numero_equivocado', text: 'Número equivocado' }, { value: 'telefono_apagado', text: 'Teléfono apagado' }, { value: 'telefono_danado', text: 'Teléfono dañado' }, { value: 'ilocalizado', text: 'Ilocalizado' }],
            'NO ENTREGADO': [{ value: 'no_entregado', text: 'No entregado' }],
            'ENTREGADO': [{ value: 'entregado', text: 'Entregado' }],
            'ENVIO DE MENSAJE A TITULAR': [{ value: 'envio_mensaje', text: 'Envío de mensaje a titular' }]
        };
        function actualizarGestionesNivel1() {
            const canal = document.getElementById('gestiones-filter-canal').value;
            const sel = document.getElementById('gestiones-filter-nivel1');
            sel.innerHTML = '<option value="">Todos</option>';
            document.getElementById('gestiones-filter-nivel2').innerHTML = '<option value="">Todos</option>';
            if (!canal) return;
            const opciones = opcionesNivel1PorCanal[canal] || [];
            opciones.forEach(function(o) { const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.text; sel.appendChild(opt); });
        }
        function actualizarGestionesNivel2() {
            const nivel1 = document.getElementById('gestiones-filter-nivel1').value;
            const sel = document.getElementById('gestiones-filter-nivel2');
            sel.innerHTML = '<option value="">Todos</option>';
            if (!nivel1) return;
            const opciones = opcionesNivel2PorNivel1[nivel1] || [];
            opciones.forEach(function(o) { const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.text; sel.appendChild(opt); });
        }
        document.getElementById('gestiones-filter-canal').addEventListener('change', actualizarGestionesNivel1);
        document.getElementById('gestiones-filter-nivel1').addEventListener('change', actualizarGestionesNivel2);
        function aplicarFiltrosGestiones() { cargarGestiones(1); }
        function limpiarFiltrosGestiones() {
            document.getElementById('gestiones-filter-canal').value = '';
            document.getElementById('gestiones-filter-nivel1').innerHTML = '<option value="">Todos</option>';
            document.getElementById('gestiones-filter-nivel2').innerHTML = '<option value="">Todos</option>';
            document.getElementById('gestiones-search-input').value = '';
            cargarGestiones(1);
        }
        function textoAcuerdo(gestion) {
            const a = gestion.acuerdo;
            if (!a) return '-';
            if (a.tipo_acuerdo === 'total') return 'Pago total';
            if (a.tipo_acuerdo === 'cuotas') return 'Cuotas';
            if (a.tipo_acuerdo === 'comite') return 'Comité';
            return '-';
        }
        function cargarGestiones(pagina) {
            const tbody = document.getElementById('gestiones-tbody');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
            const params = new URLSearchParams();
            params.set('pagina', String(pagina || 1));
            params.set('por_pagina', String(GESTIONES_POR_PAGINA));
            const canal = document.getElementById('gestiones-filter-canal').value;
            const nivel1 = document.getElementById('gestiones-filter-nivel1').value;
            const nivel2 = document.getElementById('gestiones-filter-nivel2').value;
            const busqueda = (document.getElementById('gestiones-search-input') || {}).value || '';
            if (canal) params.set('canal_contacto', canal);
            if (nivel1) params.set('nivel1_tipo', nivel1);
            if (nivel2) params.set('nivel2_tipo', nivel2);
            if (busqueda.trim()) params.set('busqueda', busqueda.trim());
            fetch('index.php?action=obtener_gestiones_asesor&' + params.toString())
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.success) {
                        tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-exclamation-triangle"></i> ' + (data.message || 'Error al cargar') + '</td></tr>';
                        document.getElementById('gestiones-paginador').innerHTML = '';
                        return;
                    }
                    const gestiones = data.gestiones || [];
                    const totalSrv = data.total || 0;
                    const pag = data.pagina || 1;
                    const porPag = data.por_pagina || GESTIONES_POR_PAGINA;
                    // Filtro de seguridad: solo mostrar gestiones del asesor en sesión
                    const asesorSesion = (document.body && document.body.dataset && document.body.dataset.userId) ? String(document.body.dataset.userId) : '';
                    let gestionesView = gestiones;
                    let total = totalSrv;
                    if (asesorSesion) {
                        const hayDeOtro = gestiones.some(g => String(g.asesor_cedula || '') !== asesorSesion);
                        if (hayDeOtro) {
                            gestionesView = gestiones.filter(g => String(g.asesor_cedula || '') === asesorSesion);
                            total = gestionesView.length;
                        }
                    }
                    if (gestionesView.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-folder-open"></i> No hay gestiones con los filtros aplicados</td></tr>';
                    } else {
                        tbody.innerHTML = gestionesView.map(function(g) {
                            const fecha = g.fecha_creacion ? new Date(g.fecha_creacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-';
                            const cliente = escapeHtml((g.cliente_nombre || '-') + (g.cliente_cedula ? ' (' + g.cliente_cedula + ')' : ''));
                            const canalLabel = escapeHtml(g.canal_contacto === 'llamada_saliente' ? 'Llamada saliente' : g.canal_contacto === 'recibir_llamada' ? 'Recibir llamada' : (g.canal_contacto || '-'));
                            const nivel1Label = escapeHtml(g.nivel1_tipo || '-');
                            const nivel2Label = escapeHtml(g.nivel2_tipo || '-');
                            const acuerdo = escapeHtml(textoAcuerdo(g));
                            const obligacion = escapeHtml(g.obligacion_operacion || '-');
                            const clienteIdParam = encodeURIComponent(String(g.cliente_id || ''));
                            return '<tr><td>' + fecha + '</td><td>' + (cliente || '-') + '</td><td><small>' + canalLabel + '</small><br><strong>' + nivel1Label + '</strong><br>' + nivel2Label + '</td><td>' + obligacion + '</td><td>' + acuerdo + '</td><td><button type="button" class="btn-action btn-manage" onclick="gestionarCliente(decodeURIComponent(\'' + clienteIdParam + '\'))" title="Gestionar"><i class="fas fa-edit"></i> Gestionar</button></td></tr>';
                        }).join('');
                    }
                    const totalPag = Math.max(1, Math.ceil(total / porPag));
                    let pagHtml = '<span class="text-muted">Total: ' + total + ' gestiones</span>';
                    if (totalPag > 1) {
                        pagHtml += ' <div style="display: flex; gap: 6px; align-items: center;">';
                        if (pag > 1) pagHtml += '<button type="button" class="btn btn-sm btn-secondary" onclick="cargarGestiones(' + (pag - 1) + ')"><i class="fas fa-chevron-left"></i></button>';
                        pagHtml += ' <span>Página ' + pag + ' de ' + totalPag + '</span>';
                        if (pag < totalPag) pagHtml += '<button type="button" class="btn btn-sm btn-secondary" onclick="cargarGestiones(' + (pag + 1) + ')"><i class="fas fa-chevron-right"></i></button>';
                        pagHtml += '</div>';
                    }
                    document.getElementById('gestiones-paginador').innerHTML = pagHtml;
                })
                .catch(function(err) {
                    tbody.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-exclamation-triangle"></i> Error de conexión</td></tr>';
                    document.getElementById('gestiones-paginador').innerHTML = '';
                });
        }
    </script>

</body>
</html>
