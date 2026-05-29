<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Exporte de Reportes - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
    <link rel="stylesheet" href="assets/css/coordinador-dashboard.css">
</head>
<body>

    <?php 
    // Incluir navbar compartido
    $action = 'coordinador_exporte';
    include __DIR__ . '/Navbar.php'; 
    ?>

    <div class="main-container">
        <?php 
        // Incluir header compartido
        include __DIR__ . '/Header.php'; 
        ?>

        <!-- Sección Principal de Exporte -->
        <section class="current-call-section">
            <div class="call-details">
                <h3>EXPORTE DE REPORTES</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Generación y Descarga de Reportes</p>
                <small>Análisis y Exportación de Datos</small>
                <div class="media-controls">
                    <button class="media-button" onclick="generarReporte('general')">
                        <i class="fas fa-chart-bar"></i> Reporte General
                    </button>
                    <button class="media-button" onclick="generarReporte('asesores')">
                        <i class="fas fa-users"></i> Reporte Asesores
                    </button>
                    <button class="media-button" onclick="generarReporte('clientes')">
                        <i class="fas fa-user-friends"></i> Reporte Clientes
                    </button>
                    <button class="media-button" onclick="generarReporte('productividad')">
                        <i class="fas fa-chart-line"></i> Reporte Productividad
                    </button>
                </div>
            </div>
            
            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-file-export"></i>
                    <div>
                        <span class="client-name">Centro de Exportación</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Reportes y Análisis</span>
                    </div>
                </div>

                <div class="main-tabs">
                    <span class="active" onclick="cambiarTab('reportes')">REPORTES</span>
                    <span onclick="cambiarTab('tmo')">TMO</span>
                </div>
                
                <div class="content-sections">
                    <!-- PESTAÑA 1: REPORTES -->
                    <div class="tab-content active" id="tab-reportes">
                        <div class="report-container">
                            <!-- Título y Descripción -->
                            <div class="report-header">
                                <h3 style="color: #2c3e50; margin-bottom: 10px;">
                                    <i class="fas fa-file-csv"></i> Generar Reporte de Gestiones
                                </h3>
                                <p style="color: #7f8c8d; margin-bottom: 15px;">
                                    Genera un reporte completo de todas las gestiones realizadas por los asesores sobre clientes y obligaciones en formato CSV, conservando la fecha de gestión por fila y el contenido completo de observaciones.
                                </p>
                                
                            </div>

                            <!-- Selección de Rango de Fechas -->
                            <div class="date-range-card" style="background: #fff; padding: 25px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                                <h5 style="color: #2c3e50; margin-bottom: 20px; font-size: 16px; font-weight: 600;">
                                    <i class="fas fa-calendar-alt"></i> Seleccionar Rango de Fechas
                                </h5>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">
                                    <button onclick="seleccionarRango('hoy')" id="btn-hoy" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-day"></i> Hoy
                                    </button>
                                    <button onclick="seleccionarRango('semana')" id="btn-semana" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-week"></i> Esta Semana
                                    </button>
                                    <button onclick="seleccionarRango('mes')" id="btn-mes" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-alt"></i> Este Mes
                                    </button>
                                    <button onclick="seleccionarRango('personalizado')" id="btn-personalizado" style="padding: 12px 24px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(23,162,184,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar"></i> Personalizado
                                    </button>
                                </div>
                                
                                <!-- Campos de fecha personalizados -->
                                <div id="date-range-fields" style="display: none; gap: 20px;">
                                    <div style="flex: 1;">
                                        <label for="fecha-inicio" style="display: block; margin-bottom: 8px; color: #495057; font-weight: 600; font-size: 14px;">Fecha de Inicio</label>
                                        <input type="date" id="fecha-inicio" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <label for="fecha-fin" style="display: block; margin-bottom: 8px; color: #495057; font-weight: 600; font-size: 14px;">Fecha de Fin</label>
                                        <input type="date" id="fecha-fin" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                    </div>
                                </div>
                            </div>

                            <!-- Información del Reporte -->
                            

                            <!-- Botón de Acción -->
                            <div style="text-align: center;">
                                <button onclick="generarReporte()" style="padding: 15px 40px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,123,255,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,123,255,0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,123,255,0.3)'">
                                    <i class="fas fa-download"></i> Generar y Descargar Reporte CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 2: TMO -->
                    <div class="tab-content" id="tab-tmo">
                        <div class="report-container">
                            <!-- Título y Descripción -->
                            <div class="report-header">
                                <h3 style="color: #2c3e50; margin-bottom: 10px;">
                                    <i class="fas fa-clock"></i> Generar Reporte de Tiempos (TMO)
                                </h3>
                                <p style="color: #7f8c8d; margin-bottom: 15px;">
                                    Genera un reporte CSV con los registros de la tabla <strong>tiempos</strong>: sesiones, pausas (break, almuerzo, baño, capacitación, retroalimentación) y gestión de los asesores asignados a usted.
                                </p>
                                <p style="color: #6c757d; font-size: 13px; margin-bottom: 30px;">
                                    Los datos se registran cuando los asesores usan el sistema de medición de tiempo (reloj y pausas) en su vista.
                                </p>
                            </div>

                            <!-- Selección de Rango de Fechas -->
                            <div class="date-range-card" style="background: #fff; padding: 25px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                                <h5 style="color: #2c3e50; margin-bottom: 20px; font-size: 16px; font-weight: 600;">
                                    <i class="fas fa-calendar-alt"></i> Seleccionar Rango de Fechas
                                </h5>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">
                                    <button onclick="seleccionarRangoTMO('hoy')" id="btn-tmo-hoy" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-day"></i> Hoy
                                    </button>
                                    <button onclick="seleccionarRangoTMO('semana')" id="btn-tmo-semana" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-week"></i> Esta Semana
                                    </button>
                                    <button onclick="seleccionarRangoTMO('mes')" id="btn-tmo-mes" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,123,255,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar-alt"></i> Este Mes
                                    </button>
                                    <button onclick="seleccionarRangoTMO('personalizado')" id="btn-tmo-personalizado" style="padding: 12px 24px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(23,162,184,0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                                        <i class="fas fa-calendar"></i> Personalizado
                                    </button>
                                </div>
                                
                                <!-- Campos de fecha personalizados -->
                                <div id="tmo-date-range-fields" style="display: none; gap: 20px; margin-top: 15px;">
                                    <div style="flex: 1;">
                                        <label for="tmo-fecha-inicio" style="display: block; margin-bottom: 8px; color: #495057; font-weight: 600; font-size: 14px;">Fecha de Inicio</label>
                                        <input type="date" id="tmo-fecha-inicio" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <label for="tmo-fecha-fin" style="display: block; margin-bottom: 8px; color: #495057; font-weight: 600; font-size: 14px;">Fecha de Fin</label>
                                        <input type="date" id="tmo-fecha-fin" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                                    </div>
                                </div>
                            </div>

                            <!-- Botón de Acción -->
                            <div style="text-align: center;">
                                <button onclick="generarReporteTMO()" style="padding: 15px 40px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,123,255,0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,123,255,0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,123,255,0.3)'">
                                    <i class="fas fa-download"></i> Generar y Descargar Reporte TMO CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Scripts -->
    <script src="assets/js/coord-export.js"></script>

</body>
</html>
