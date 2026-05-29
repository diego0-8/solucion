<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Dashboard Coordinador - <?php echo APP_NAME; ?></title>
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
    $action = 'coordinador_dashboard';
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
                <h3>ESTADÍSTICAS DEL COORDINADOR</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Gestión de Asesores</p>
                <small>Resumen de Actividad</small>
                <div class="media-controls">
                    <button class="media-button" onclick="openModal('nueva-tarea')">
                        <i class="fas fa-plus"></i> Nueva Tarea
                    </button>
                    <button class="media-button" onclick="openModal('asignar-cliente')">
                        <i class="fas fa-user-plus"></i> Asignar Cliente
                    </button>
                    <button class="media-button" onclick="openModal('generar-reporte')">
                        <i class="fas fa-file-alt"></i> Generar Reporte
                    </button>
                    <button class="media-button" onclick="openModal('configuracion')">
                        <i class="fas fa-cog"></i> Configuración
                    </button>
                </div>
                
            </div>
            
            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-chart-line"></i>
                    <div>
                        <span class="client-name">Panel de Coordinación</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Gestión de Equipo</span>
                    </div>
                </div>

                <div class="main-tabs">
                    <span class="active" onclick="cambiarTab('estadisticas')">ESTADÍSTICAS</span>
                    <span onclick="cambiarTab('asesores')">ASESORES</span>
                </div>
                
                <div class="content-sections">
                    <!-- PESTAÑA 1: ESTADÍSTICAS -->
                    <div class="tab-content active" id="tab-estadisticas">
                        <div class="left-content">
                            <!-- Widgets de Estadísticas -->
                            <h4 class="section-title">Resumen de Coordinación</h4>
                            <div class="form-section">
                                <div class="input-group">
                                    <label>Asesores Asignados</label>
                                    <input type="text" value="<?php echo $estadisticas['asesores_asignados'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Bases de Clientes</label>
                                    <input type="text" value="<?php echo $estadisticas['bases_clientes'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Tareas Realizadas</label>
                                    <input type="text" value="<?php echo $estadisticas['tareas_realizadas'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Total Clientes</label>
                                    <input type="text" value="<?php echo $estadisticas['total_clientes'] ?? 0; ?>" readonly>
                                </div>
                            </div>
                            
                            <!-- Segunda fila de estadísticas -->
                            <div class="form-section">
                                <div class="input-group">
                                    <label>Clientes Gestionados</label>
                                    <input type="text" value="<?php echo $estadisticas['clientes_gestionados'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Clientes Pendientes</label>
                                    <input type="text" value="<?php echo $estadisticas['clientes_pendientes'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Tareas Pendientes</label>
                                    <input type="text" value="<?php echo $estadisticas['tareas_pendientes'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Eficiencia (%)</label>
                                    <input type="text" value="<?php 
                                        $total = $estadisticas['total_clientes'] ?? 0;
                                        $gestionados = $estadisticas['clientes_gestionados'] ?? 0;
                                        echo ($total > 0) ? round(($gestionados / $total) * 100, 1) : 0;
                                    ?>%" readonly>
                                </div>
                            </div>

                            <!-- Tercera fila de estadísticas -->
                            <div class="form-section">
                                <div class="input-group">
                                    <label>Total Contratos</label>
                                    <input type="text" value="<?php echo $estadisticas['total_contratos'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Total Cartera</label>
                                    <input type="text" value="$<?php echo number_format($estadisticas['total_cartera'] ?? 0, 0, ',', '.'); ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Clientes Nuevos (30 días)</label>
                                    <input type="text" value="<?php echo $estadisticas['clientes_nuevos'] ?? 0; ?>" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Promedio por Asesor</label>
                                    <input type="text" value="<?php 
                                        $total_asesores = $estadisticas['asesores_asignados'] ?? 0;
                                        $clientes = $estadisticas['total_clientes'] ?? 0;
                                        echo ($total_asesores > 0) ? round($clientes / $total_asesores, 1) : 0;
                                    ?>" readonly>
                                </div>
                            </div>

                            <!-- Porcentajes de Rendimiento -->
                            <h4>Rendimiento del Equipo</h4>
                            <div class="form-section">
                                <div class="input-group">
                                    <label>Asesores Activos (%)</label>
                                    <input type="text" value="<?php 
                                        $total_asesores = $estadisticas['asesores_asignados'] ?? 0;
                                        $asesores_activos = $estadisticas['asesores_activos'] ?? 0;
                                        echo ($total_asesores > 0) ? round(($asesores_activos / $total_asesores) * 100, 1) : 0;
                                    ?>%" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Clientes Atendidos (%)</label>
                                    <input type="text" value="<?php 
                                        $total = $estadisticas['total_clientes'] ?? 0;
                                        $atendidos = $estadisticas['clientes_gestionados'] ?? 0;
                                        echo ($total > 0) ? round(($atendidos / $total) * 100, 1) : 0;
                                    ?>%" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Tareas Completadas (%)</label>
                                    <input type="text" value="<?php 
                                        $total_tareas = ($estadisticas['tareas_realizadas'] ?? 0) + ($estadisticas['tareas_pendientes'] ?? 0);
                                        $completadas = $estadisticas['tareas_realizadas'] ?? 0;
                                        echo ($total_tareas > 0) ? round(($completadas / $total_tareas) * 100, 1) : 0;
                                    ?>%" readonly>
                                </div>
                                <div class="input-group">
                                    <label>Productividad (%)</label>
                                    <input type="text" value="<?php 
                                        $total_asesores = $estadisticas['asesores_asignados'] ?? 0;
                                        $clientes = $estadisticas['total_clientes'] ?? 0;
                                        echo ($total_asesores > 0) ? round($clientes / $total_asesores, 1) : 0;
                                    ?>" readonly>
                                </div>
                            </div>

                            <!-- Tercera sección: Base de Datos -->
                            <h4>Base de Datos</h4>
                            <div class="form-section">
                                <?php 
                                $estadisticasBases = $estadisticas['estadisticas_bases'] ?? [];
                                if (!empty($estadisticasBases)): 
                                ?>
                                    <div style="overflow-x: auto;">
                                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                            <thead>
                                                <tr style="background: #007bff; color: white;">
                                                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd; width: 30px;"></th>
                                                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Base de Datos</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Clientes</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">En tarea</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Pendientes</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Gestionados</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Total a Pagar</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Recaudado</th>
                                                    <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Eficacia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($estadisticasBases as $base): ?>
                                                    <tr style="border-bottom: 1px solid #ddd; cursor: pointer;" onclick="toggleBaseDiagram(<?php echo $base['id_base']; ?>)">
                                                        <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                                                            <i class="fas fa-chevron-down base-diagram-icon" id="icon-base-<?php echo $base['id_base']; ?>" style="transition: transform 0.3s ease;"></i>
                                                        </td>
                                                        <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600;">
                                                            <?php echo htmlspecialchars($base['nombre']); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">
                                                            <?php echo number_format($base['clientes_total'], 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;" title="Clientes en tareas activas (detalle_tareas)">
                                                            <?php echo number_format($base['en_tarea'] ?? 0, 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; color: #fd7e14; font-weight: 600;" title="Por gestionar (gestionado=no)">
                                                            <?php echo number_format($base['pendientes_tarea'] ?? 0, 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; color: #28a745; font-weight: 600;">
                                                            <?php echo number_format($base['clientes_gestionados'], 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">
                                                            $<?php echo number_format($base['total'] ?? 0, 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">
                                                            $<?php echo number_format($base['total_a_pagar'], 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600; color: #28a745;">
                                                            $<?php echo number_format($base['recaudado'] ?? 0, 0, ',', '.'); ?>
                                                        </td>
                                                        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">
                                                            <?php 
                                                            $eficacia = $base['porcentaje_eficacia'];
                                                            $colorEficacia = $eficacia >= 80 ? '#28a745' : ($eficacia >= 50 ? '#ffc107' : '#dc3545');
                                                            ?>
                                                            <span style="font-weight: 700; color: <?php echo $colorEficacia; ?>;">
                                                                <?php echo number_format($eficacia, 2, ',', '.'); ?>%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <!-- Fila expandible con diagrama de clasificaciones y acuerdos -->
                                                    <tr class="base-diagram-row" data-base-id="<?php echo $base['id_base']; ?>" style="display: none;">
                                                        <td colspan="10" style="padding: 20px; background: #f8f9fa; border: 1px solid #ddd;">
                                                            <?php 
                                                            $desglose = $base['desglose_clasificacion'] ?? [];
                                                            $totalGestionados = $base['clientes_gestionados'];
                                                            $desgloseAcuerdos = $base['desglose_acuerdos'] ?? ['total' => 0, 'cuotas' => 0, 'comite' => 0];
                                                            $clasificacionesLabels = [
                                                                'ya_pago' => ['label' => 'Ya Pago', 'color' => '#28a745'],
                                                                'acuerdo_pago' => ['label' => 'Acuerdo de Pago', 'color' => '#007bff'],
                                                                'recordatorio' => ['label' => 'Recordatorio', 'color' => '#17a2b8'],
                                                                'voluntad_pago' => ['label' => 'Voluntad de Pago', 'color' => '#ffc107'],
                                                                'localizado_sin_acuerdo' => ['label' => 'Localizado Sin Acuerdo', 'color' => '#fd7e14'],
                                                                'fallecido' => ['label' => 'Fallecido', 'color' => '#6c757d'],
                                                                'no_contacto' => ['label' => 'No Contacto', 'color' => '#dc3545'],
                                                            ];
                                                            $acuerdosLabels = [
                                                                'total' => ['label' => 'Acuerdo Pago Total', 'color' => '#28a745'],
                                                                'cuotas' => ['label' => 'Acuerdo a Largo Plazo (Cuotas)', 'color' => '#007bff'],
                                                                'comite' => ['label' => 'Acuerdo Aprobado Comité', 'color' => '#6f42c1'],
                                                            ];
                                                            ?>
                                                            <div style="margin-bottom: 20px;">
                                                                <h5 style="margin: 0 0 10px 0; color: #333; font-size: 0.95rem;">
                                                                    <i class="fas fa-file-contract"></i> Acuerdos (tabla acuerdos)
                                                                </h5>
                                                                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 15px;">
                                                                    <?php foreach ($acuerdosLabels as $clave => $info): ?>
                                                                        <?php $cant = $desgloseAcuerdos[$clave] ?? 0; ?>
                                                                        <div style="background: white; padding: 10px 14px; border-radius: 6px; border-left: 4px solid <?php echo $info['color']; ?>;">
                                                                            <span style="font-weight: 600; color: #495057; font-size: 0.85rem;"><?php echo htmlspecialchars($info['label']); ?></span>
                                                                            <span style="font-weight: 700; color: <?php echo $info['color']; ?>; margin-left: 8px;"><?php echo number_format($cant, 0, ',', '.'); ?></span>
                                                                        </div>
                                                                    <?php endforeach; ?>
                                                                </div>
                                                            </div>
                                                            <div style="margin-bottom: 15px;">
                                                                <h5 style="margin: 0 0 15px 0; color: #333; font-size: 1rem;">
                                                                    <i class="fas fa-chart-bar"></i> Desglose de Clientes Gestionados
                                                                </h5>
                                                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px;">
                                                                    <?php foreach ($clasificacionesLabels as $clave => $info): ?>
                                                                        <?php 
                                                                        $cantidad = $desglose[$clave] ?? 0;
                                                                        $porcentaje = $totalGestionados > 0 ? round(($cantidad / $totalGestionados) * 100, 1) : 0;
                                                                        ?>
                                                                        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                                                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                                                                <span style="font-weight: 600; color: #495057; font-size: 0.9rem;">
                                                                                    <?php echo htmlspecialchars($info['label']); ?>
                                                                                </span>
                                                                                <span style="font-weight: 700; color: <?php echo $info['color']; ?>; font-size: 1rem;">
                                                                                    <?php echo number_format($cantidad, 0, ',', '.'); ?>
                                                                                </span>
                                                                            </div>
                                                                            <?php 
                                                                            $anchoBarra = min(100, max(0, $porcentaje));
                                                                            $minWidthBarra = $porcentaje > 0 ? '50px' : '0';
                                                                            $estiloBarraClasif = "background: {$info['color']}; height: 100%; width: {$anchoBarra}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; min-width: {$minWidthBarra};";
                                                                            ?>
                                                                            <div style="background: #e9ecef; border-radius: 4px; height: 24px; overflow: hidden; position: relative;">
                                                                                <div style="<?php echo htmlspecialchars($estiloBarraClasif); ?>">
                                                                                    <?php if ($porcentaje > 5): ?>
                                                                                        <span style="color: white; font-size: 0.75rem; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                                                                                            <?php echo number_format($porcentaje, 1, ',', '.'); ?>%
                                                                                        </span>
                                                                                    <?php endif; ?>
                                                                                </div>
                                                                            </div>
                                                                            <?php if ($porcentaje <= 5 && $cantidad > 0): ?>
                                                                                <div style="text-align: right; margin-top: 4px;">
                                                                                    <span style="font-size: 0.75rem; font-weight: 600; color: <?php echo $info['color']; ?>;">
                                                                                        <?php echo number_format($porcentaje, 1, ',', '.'); ?>%
                                                                                    </span>
                                                                                </div>
                                                                            <?php endif; ?>
                                                                        </div>
                                                                    <?php endforeach; ?>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php else: ?>
                                    <div style="padding: 20px; text-align: center; color: #999;">
                                        <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 10px;"></i>
                                        <p>No hay bases de datos activas con tareas asignadas</p>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <!-- PESTAÑA 2: ASESORES -->
                    <div class="tab-content" id="tab-asesores">
                        <div class="left-content">
                            <div class="asesores-header">
                                <h4 class="section-title">Mis Asesores</h4>
                                <div class="table-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="refreshAsesores()">
                                        <i class="fas fa-sync-alt"></i> Actualizar
                                    </button>
                                </div>
                            </div>
                            
                            
                            <!-- Tabla de asesores -->
                            <div class="asesores-table-container">
                                
                                <div class="table-responsive">
                                    <table class="asesores-table">
                                        <thead>
                                            <tr>
                                                <th>Asesor</th>
                                                <th>Clientes Gestionados</th>
                                                <th>Tareas Activas</th>
                                                <th>Progreso Tarea</th>
                                                <th>Estado</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php 
                                            // Debug: Verificar variables
                                            ?>
                                            <?php if (isset($asesores) && !empty($asesores) && is_array($asesores)): ?>
                                                <?php foreach ($asesores as $asesor): ?>
                                                    <tr data-asesor-id="<?php echo $asesor['cedula']; ?>">
                                                        <td>
                                                            <div class="user-info">
                                                                <div class="user-details">
                                                                    <strong><?php echo htmlspecialchars($asesor['nombre_completo']); ?></strong>
                                                                    <small>Usuario: <?php echo $asesor['usuario']; ?></small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span class="managed-count" style="font-weight: 600; color: #28a745;">
                                                                <?php echo $asesor['clientes_gestionados'] ?? 0; ?>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span class="tareas-activas-count" style="font-weight: 600; color: #667eea;">
                                                                <?php echo $asesor['numero_tareas_activas'] ?? 0; ?>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <?php 
                                                            $progresoTareas = $asesor['progreso_tareas'] ?? [];
                                                            if (!empty($progresoTareas)): 
                                                                $totalTareas = count($progresoTareas);
                                                                
                                                                // Calcular promedio de progreso si hay múltiples tareas
                                                                $promedioProgreso = 0;
                                                                foreach ($progresoTareas as $t) {
                                                                    $promedioProgreso += ($t['porcentaje'] ?? 0);
                                                                }
                                                                $promedioProgreso = $totalTareas > 0 ? round($promedioProgreso / $totalTareas) : 0;
                                                                
                                                                // Color basado en el promedio
                                                                $progresoColor = $promedioProgreso >= 80 ? '#28a745' : ($promedioProgreso >= 50 ? '#ffc107' : '#dc3545');
                                                                $anchoProgreso = min(100, max(0, $promedioProgreso));
                                                                $minWidthBarra = $promedioProgreso > 0 ? '30px' : '0';
                                                            ?>
                                                                <div style="display: flex; flex-direction: column; gap: 6px;">
                                                                    <?php if ($totalTareas > 1): ?>
                                                                        <small style="font-size: 0.75rem; color: #666; font-weight: 500;">
                                                                            <?php echo $totalTareas; ?> tareas activas
                                                                        </small>
                                                                    <?php else: ?>
                                                                        <small style="font-size: 0.75rem; color: #666; font-weight: 500;">
                                                                            <?php echo htmlspecialchars($progresoTareas[0]['base_nombre'] ?? 'Tarea'); ?>
                                                                        </small>
                                                                    <?php endif; ?>
                                                                    
                                                                    <!-- Barra de progreso principal (promedio si hay múltiples) -->
                                                                    <?php 
                                                                    $estiloBarraProgreso = "background: {$progresoColor}; height: 100%; width: {$anchoProgreso}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; min-width: {$minWidthBarra};";
                                                                    $estiloTextoProgreso = "font-size: 0.8rem; font-weight: 700; color: {$progresoColor}; min-width: 40px;";
                                                                    ?>
                                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                                        <div style="flex: 1; background: #e9ecef; border-radius: 4px; height: 24px; overflow: hidden; position: relative; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
                                                                            <div style="<?php echo htmlspecialchars($estiloBarraProgreso); ?>">
                                                                                <?php if ($promedioProgreso > 15): ?>
                                                                                    <span style="color: white; font-size: 0.75rem; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                                                                                        <?php echo $promedioProgreso; ?>%
                                                                                    </span>
                                                                                <?php endif; ?>
                                                                            </div>
                                                                        </div>
                                                                        <?php if ($promedioProgreso <= 15): ?>
                                                                            <span style="<?php echo htmlspecialchars($estiloTextoProgreso); ?>">
                                                                                <?php echo $promedioProgreso; ?>%
                                                                            </span>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                    
                                                                    <?php if ($totalTareas > 1): ?>
                                                                        <!-- Mostrar detalles de cada tarea si hay múltiples -->
                                                                        <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">
                                                                            <details style="cursor: pointer;">
                                                                                <summary style="color: #667eea; font-weight: 500;">Ver detalle por tarea</summary>
                                                                                <div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #e9ecef;">
                                                                                    <?php foreach ($progresoTareas as $idx => $tarea): ?>
                                                                                        <?php 
                                                                                        $tareaPorcentaje = $tarea['porcentaje'] ?? 0;
                                                                                        $tareaColor = $tareaPorcentaje >= 80 ? '#28a745' : ($tareaPorcentaje >= 50 ? '#ffc107' : '#dc3545');
                                                                                        $anchoTarea = min(100, max(0, $tareaPorcentaje));
                                                                                        $estiloTareaColor = "font-weight: 600; color: {$tareaColor};";
                                                                                        $estiloBarraTarea = "background: {$tareaColor}; height: 100%; width: {$anchoTarea}%;";
                                                                                        ?>
                                                                                        <div style="margin-bottom: 4px; font-size: 0.7rem;">
                                                                                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                                                                                <span><?php echo htmlspecialchars($tarea['base_nombre'] ?? 'Tarea ' . ($idx + 1)); ?></span>
                                                                                                <span style="<?php echo htmlspecialchars($estiloTareaColor); ?>">
                                                                                                    <?php echo $tareaPorcentaje; ?>%
                                                                                                </span>
                                                                                            </div>
                                                                                            <div style="background: #e9ecef; border-radius: 2px; height: 6px; overflow: hidden;">
                                                                                                <div style="<?php echo htmlspecialchars($estiloBarraTarea); ?>"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    <?php endforeach; ?>
                                                                                </div>
                                                                            </details>
                                                                        </div>
                                                                    <?php endif; ?>
                                                                </div>
                                                            <?php else: ?>
                                                                <span style="color: #999; font-size: 0.9rem; font-style: italic;">Sin tareas activas</span>
                                                            <?php endif; ?>
                                                        </td>
                                                        <td>
                                                            <span class="estado-badge estado-<?php echo strtolower($asesor['estado'] ?? 'activo'); ?>">
                                                                <i class="fas fa-circle"></i>
                                                                <?php echo ucfirst(strtolower($asesor['estado'] ?? 'activo')); ?>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div class="action-buttons" style="display: flex; gap: 5px;">
                                                                <button class="btn-action btn-details" onclick="verDetallesAsesor('<?php echo $asesor['cedula']; ?>')" title="Ver Detalles">
                                                                    <i class="fas fa-eye"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            <?php else: ?>
                                                <tr>
                                                    <td colspan="6" class="no-data" style="text-align: center;">
                                                        <i class="fas fa-users"></i>
                                                        <p>No hay asesores asignados</p>
                                                        <small>Contacte al administrador para asignar asesores a su equipo</small>
                                                    </td>
                                                </tr>
                                            <?php endif; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    
                    
                </div>
            </div>
        </section>
    </div>

    <!-- Modal Detalles Asesor -->
    <div id="modal-detalles-asesor" class="modal">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Detalles de Gestión del Asesor</h3>
                <button class="modal-close" onclick="cerrarModalDetallesAsesor()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="detalles-asesor-content">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin fa-3x"></i>
                        <p>Cargando detalles...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="assets/js/coord-dashboard.js"></script>
    <script src="assets/js/hybrid-updater.js"></script>
    <script>
        // Función para expandir/colapsar diagrama de base de datos
        function toggleBaseDiagram(baseId) {
            const row = document.querySelector(`.base-diagram-row[data-base-id="${baseId}"]`);
            const icon = document.getElementById(`icon-base-${baseId}`);
            
            if (row) {
                if (row.style.display === 'none') {
                    row.style.display = 'table-row';
                    if (icon) {
                        icon.style.transform = 'rotate(180deg)';
                    }
                } else {
                    row.style.display = 'none';
                    if (icon) {
                        icon.style.transform = 'rotate(0deg)';
                    }
                }
            }
        }
    </script>
    <script>
        // Función para convertir tipificación numérica a texto
        function obtenerTipificacionTexto(gestion) {
            if (!gestion.nivel1_tipo) return 'No tipificado';
            
            // Mapear Nivel 1 a texto (usar valores reales de la BD)
            const nivel1Tipo = (gestion.nivel1_tipo || '').toUpperCase();
            let nivel1Texto = nivel1Tipo;
            
            // Si es un valor numérico o código antiguo, convertir a texto
            if (nivel1Tipo === '1' || nivel1Tipo === 'CONTACTADO') {
                nivel1Texto = 'CONTACTADO';
            } else if (nivel1Tipo === '0' || nivel1Tipo === 'NO CONTACTO' || nivel1Tipo === '') {
                nivel1Texto = 'NO CONTACTO';
            }
            
            // Mapear Nivel 2 a texto (usar nivel2_clasificacion o nivel2_tipo)
            let nivel2Texto = '';
            const nivel2Valor = gestion.nivel2_clasificacion || gestion.nivel2_tipo || '';
            if (nivel2Valor) {
                const nivel2Textos = {
                    '1.1': 'CON INTENCIÓN DE PAGO',
                    '1.2': 'SIN INTENCIÓN DE PAGO',
                    '1.3': 'NO COLABORA',
                    '1.4': 'YA PAGÓ',
                    '2.1': 'Llamada no contestada',
                    '2.2': 'Mensaje con tercero',
                    '2.3': 'Buzón de voz',
                    '2.4': 'Datos inconsistentes',
                    'Con intención de pago': 'CON INTENCIÓN DE PAGO',
                    'Sin intención de pago': 'SIN INTENCIÓN DE PAGO',
                    'No colabora': 'NO COLABORA',
                    'Ya pagó': 'YA PAGÓ',
                    'Llamada no contestada': 'Llamada no contestada',
                    'Mensaje con tercero': 'Mensaje con tercero',
                    'Buzón de voz': 'Buzón de voz',
                    'Datos inconsistentes': 'Datos inconsistentes'
                };
                nivel2Texto = nivel2Textos[nivel2Valor] || nivel2Valor;
            }
            
            // Mapear Nivel 3 a texto (usar nivel3_detalle o nivel3_tipo)
            let nivel3Texto = '';
                const nivel3Valor = gestion.nivel3_detalle || gestion.nivel3_tipo || '';
            if (nivel3Valor) {
                const nivel3Textos = {
                    'volver_llamar': 'VOLVER A LLAMAR',
                    '1.1.1': 'Informa fecha probable de pago',
                    '1.1.2': 'Pagos parciales',
                    '1.1.3': 'Inconvenientes plataforma de pago',
                    '1.1.4': 'Débito automático no realizado',
                    '1.1.5': 'Problemas en facturación',
                    '1.1.6': 'Espera ingreso de dinero',
                    '1.1.7': 'Paga un Tercero',
                    '1.1.8': 'Solicitará cambio modalidad de pago',
                    '1.1.9': 'No informa fecha probable',
                    '1.2.1': 'Entregó dinero al asesor',
                    '1.2.2': 'Económico',
                    '1.2.3': 'No informa motivo',
                    '1.2.4': 'Desacuerdo con valor cobrado',
                    '1.2.5': 'Tarifas',
                    '1.2.6': 'No utilización del servicio',
                    '1.2.7': 'Solicitó cancelación',
                    '1.2.8': 'Servicio administrativo',
                    '1.2.9': 'Servicio del asesor',
                    '1.2.10': 'Desistimiento',
                    '1.2.11': 'Viaje',
                    '1.2.12': 'Titular fallecido',
                    '1.2.13': 'Calidad del servicio o no prestación del servicio',
                    '1.2.14': 'Falta de cobertura',
                    '1.2.15': 'Falsa promesa comercial',
                    '1.2.16': 'Posible fraude',
                    '1.3.1': 'No informa motivo',
                    '1.3.2': 'Solicita comunicación posterior',
                    '1.3.3': 'Solo se comunica con su asesor',
                    '1.3.4': 'Cuelga la llamada',
                    '1.4.1': 'Validación en portal de pagos',
                    '1.4.2': 'Pago por confirmar',
                    '1.4.3': 'Pago en Reporte de Recaudo Diario',
                    '2.1.1': 'Llamada no contestada',
                    '2.2.1': 'Mensaje con tercero',
                    '2.3.1': 'Buzón de voz',
                    '2.4.1': 'Datos inconsistentes',
                    'Informa fecha probable de pago': 'Informa fecha probable de pago',
                    'Pagos parciales': 'Pagos parciales',
                    'Inconvenientes plataforma de pago': 'Inconvenientes plataforma de pago',
                    'Débito automático no realizado': 'Débito automático no realizado',
                    'Problemas en facturación': 'Problemas en facturación',
                    'Espera ingreso de dinero': 'Espera ingreso de dinero',
                    'Paga un Tercero': 'Paga un Tercero',
                    'Solicitará cambio modalidad de pago': 'Solicitará cambio modalidad de pago',
                    'No informa fecha probable': 'No informa fecha probable',
                    'Entregó dinero al asesor': 'Entregó dinero al asesor',
                    'Económico': 'Económico',
                    'No informa motivo': 'No informa motivo',
                    'Desacuerdo con valor cobrado': 'Desacuerdo con valor cobrado',
                    'Tarifas': 'Tarifas',
                    'No utilización del servicio': 'No utilización del servicio',
                    'Solicitó cancelación': 'Solicitó cancelación',
                    'Servicio administrativo': 'Servicio administrativo',
                    'Servicio del asesor': 'Servicio del asesor',
                    'Desistimiento': 'Desistimiento',
                    'Viaje': 'Viaje',
                    'Titular fallecido': 'Titular fallecido',
                    'Calidad del servicio o no prestación del servicio': 'Calidad del servicio o no prestación del servicio',
                    'Falta de cobertura': 'Falta de cobertura',
                    'Falsa promesa comercial': 'Falsa promesa comercial',
                    'Posible fraude': 'Posible fraude',
                    'Solicita comunicación posterior': 'Solicita comunicación posterior',
                    'Solo se comunica con su asesor': 'Solo se comunica con su asesor',
                    'Cuelga la llamada': 'Cuelga la llamada',
                    'Validación en portal de pagos': 'Validación en portal de pagos',
                    'Pago por confirmar': 'Pago por confirmar',
                    'Pago en Reporte de Recaudo Diario': 'Pago en Reporte de Recaudo Diario'
                };
                nivel3Texto = nivel3Textos[nivel3Valor] || nivel3Valor;
            }
            
            let resultado = nivel1Texto;
            if (nivel2Texto) resultado += ' - ' + nivel2Texto;
            if (nivel3Texto) resultado += ' - ' + nivel3Texto;
            
            return resultado;
        }
        
        // Función para ver detalles del asesor
        function verDetallesAsesor(cedula) {
            console.log('Coord Dashboard: Ver detalles del asesor:', cedula);
            
            // Mostrar modal
            const modal = document.getElementById('modal-detalles-asesor');
            modal.style.display = 'block';
            
            // Mostrar loading
            const content = document.getElementById('detalles-asesor-content');
            content.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin fa-3x"></i>
                    <p>Cargando detalles...</p>
                </div>
            `;
            
            // Hacer petición AJAX para obtener detalles
            fetch(`index.php?action=obtener_detalles_asesor_coord&asesor_cedula=${cedula}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        mostrarDetallesAsesor(data);
                    } else {
                        content.innerHTML = `
                            <div style="text-align: center; padding: 40px;">
                                <i class="fas fa-exclamation-triangle fa-3x" style="color: #dc3545;"></i>
                                <p>Error al cargar los detalles</p>
                                <p style="color: #999;">${data.message || 'Error desconocido'}</p>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    content.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle fa-3x" style="color: #dc3545;"></i>
                            <p>Error de conexión</p>
                            <p style="color: #999;">${error.message}</p>
                        </div>
                    `;
                });
        }
        
        function mostrarDetallesAsesor(data) {
            const content = document.getElementById('detalles-asesor-content');
            
            let html = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #667eea;">${data.asesor.nombre_completo}</h4>
                    <p style="color: #666; margin: 5px 0;">Cédula: ${data.asesor.cedula} | Usuario: ${data.asesor.usuario}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Clientes Asignados</strong>
                        <div style="font-size: 2rem; color: #667eea;">${data.asesor.clientes_asignados || 0}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Clientes Gestionados</strong>
                        <div style="font-size: 2rem; color: #28a745;">${data.asesor.clientes_gestionados || 0}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Estado</strong>
                        <div style="font-size: 1.2rem; margin-top: 5px;">
                            <span class="estado-badge estado-${data.asesor.estado}">
                                <i class="fas fa-circle"></i> ${data.asesor.estado.charAt(0).toUpperCase() + data.asesor.estado.slice(1)}
                            </span>
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <strong>Última Actividad</strong>
                        <div style="font-size: 1rem; margin-top: 5px; color: #495057;">${data.asesor.ultima_actividad || 'N/A'}</div>
                    </div>
                </div>
            `;
            
            // Guardar gestiones originales globalmente para búsqueda
            window.gestionesOriginales = data.gestiones || [];
            window.asesorCedulaActual = data.asesor.cedula;
            
            // Mostrar gestiones recientes en tabla
            if (data.gestiones && data.gestiones.length > 0) {
                html += `
                    <div style="margin-top: 30px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: #667eea;">Gestiones Recientes</h4>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input 
                                    type="text" 
                                    id="buscar-gestiones-input" 
                                    placeholder="Buscar por cédula, teléfono, nombre o operación..." 
                                    style="
                                        padding: 8px 12px;
                                        border: 1px solid #dee2e6;
                                        border-radius: 6px;
                                        font-size: 0.9rem;
                                        width: 300px;
                                    "
                                    onkeyup="buscarGestionesAsesor(this.value)"
                                />
                                <button 
                                    onclick="limpiarBusquedaGestiones()" 
                                    style="
                                        padding: 8px 16px;
                                        background: #6c757d;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-size: 0.9rem;
                                    "
                                    title="Limpiar búsqueda"
                                >
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div id="gestiones-container" style="max-height: 400px; overflow-y: auto;">
                            <!-- Las gestiones se renderizarán aquí -->
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="margin-top: 30px;">
                        <h4 style="margin-bottom: 15px; color: #667eea;">Gestiones Recientes</h4>
                        <div style="text-align: center; padding: 40px; color: #999;">
                            <i class="fas fa-inbox fa-3x"></i>
                            <p style="margin-top: 15px;">No hay gestiones registradas</p>
                        </div>
                    </div>
                `;
            }
            
            // Agregar modal para mostrar observaciones (solo una vez)
            html += `
                <!-- Modal de Observaciones -->
                <div id="modal-observaciones" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Observaciones de la Gestión</h3>
                            <button class="modal-close" onclick="cerrarModalObservaciones()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="observaciones-content"></div>
                        </div>
                    </div>
                </div>
            `;
            
            content.innerHTML = html;
            
            // Si hay gestiones, renderizar la tabla
            if (data.gestiones && data.gestiones.length > 0) {
                renderizarGestionesEnTabla(data.gestiones);
            }
        }
        
        // Función para renderizar gestiones en la tabla
        function renderizarGestionesEnTabla(gestiones) {
            const container = document.getElementById('gestiones-container');
            if (!container) return;
            
            if (!gestiones || gestiones.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-search fa-3x"></i>
                        <p style="margin-top: 15px;">No se encontraron gestiones</p>
                    </div>
                `;
                window.gestionesData = [];
                return;
            }
            
            let html = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Cliente</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Contactado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Resultado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Fecha</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #495057;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            gestiones.forEach((gestion, index) => {
                const fecha = new Date(gestion.fecha_creacion);
                const fechaFormato = fecha.toLocaleString('es-CO', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const clienteNombre = gestion.cliente_info?.nombre || 'ID: ' + gestion.cliente_id;
                const nivel1Tipo = (gestion.nivel1_tipo || '').toUpperCase();
                const fueContactado = nivel1Tipo !== 'NO CONTACTO' && nivel1Tipo !== '' && nivel1Tipo !== '0';
                const contactado = fueContactado ? 'SI' : 'NO';
                const contactadoColor = fueContactado ? '#28a745' : '#dc3545';
                const resultadoTipificacion = obtenerTipificacionTexto(gestion);
                
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;" data-gestion-index="${index}">
                        <td style="padding: 12px;">
                            <div>
                                <strong>${clienteNombre}</strong>
                                <br><small style="color: #666;">${gestion.cliente_info?.identificacion || 'N/A'}</small>
                            </div>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="
                                background: ${contactadoColor};
                                color: white;
                                padding: 4px 10px;
                                border-radius: 20px;
                                font-weight: 600;
                                font-size: 0.85rem;
                            ">${contactado}</span>
                        </td>
                        <td style="padding: 12px;">
                            <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${resultadoTipificacion}">
                                <small style="color: #495057;">${resultadoTipificacion}</small>
                            </div>
                        </td>
                        <td style="padding: 12px; color: #666; font-size: 0.9rem;">${fechaFormato}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="verObservacionesGestion(${index})" style="
                                background: #007bff;
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 0.85rem;
                                transition: background 0.3s;
                            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            container.innerHTML = html;
            
            // Actualizar gestiones globales para el modal de observaciones
            window.gestionesData = gestiones;
        }
        
        // Función para buscar gestiones
        function buscarGestionesAsesor(termino) {
            const terminoLower = (termino || '').toLowerCase().trim();
            
            if (!terminoLower) {
                // Si no hay término, mostrar todas las gestiones originales
                renderizarGestionesEnTabla(window.gestionesOriginales || []);
                return;
            }
            
            // Primero intentar filtrar localmente por cliente (más rápido)
            const gestionesFiltradas = (window.gestionesOriginales || []).filter(gestion => {
                const clienteNombre = (gestion.cliente_info?.nombre || '').toLowerCase();
                const clienteCedula = (gestion.cliente_info?.cedula || gestion.cliente_info?.identificacion || '').toLowerCase();
                const clienteId = String(gestion.cliente_id || '').toLowerCase();
                
                // Buscar en nombre, cédula o ID del cliente
                return clienteNombre.includes(terminoLower) || 
                       clienteCedula.includes(terminoLower) || 
                       clienteId.includes(terminoLower);
            });
            
            // Si encontramos resultados en el cliente, mostrarlos
            if (gestionesFiltradas.length > 0) {
                renderizarGestionesEnTabla(gestionesFiltradas);
            } else {
                // Si no encontramos en cliente, buscar en operaciones y teléfonos (necesita petición al servidor)
                buscarGestionesPorOperacionTelefono(terminoLower);
            }
        }
        
        // Función para buscar gestiones por operación o teléfono (requiere petición al servidor)
        function buscarGestionesPorOperacionTelefono(termino) {
            if (!termino || !window.asesorCedulaActual) {
                renderizarGestionesEnTabla([]);
                return;
            }
            
            // Mostrar loading
            const container = document.getElementById('gestiones-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="margin-top: 10px;">Buscando...</p>
                    </div>
                `;
            }
            
            fetch(`index.php?action=buscar_gestiones_asesor_coord&asesor_cedula=${window.asesorCedulaActual}&termino=${encodeURIComponent(termino)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.gestiones) {
                        renderizarGestionesEnTabla(data.gestiones);
                    } else {
                        renderizarGestionesEnTabla([]);
                    }
                })
                .catch(error => {
                    console.error('Error al buscar gestiones:', error);
                    renderizarGestionesEnTabla([]);
                });
        }
        
        // Función para mostrar la tabla de gestiones (alias para compatibilidad)
        function mostrarTablaGestiones(gestiones) {
            renderizarGestionesEnTabla(gestiones);
        }
        
        // Función para renderizar gestiones en la tabla (versión mejorada)
        function renderizarGestionesEnTabla(gestiones) {
            const container = document.getElementById('gestiones-container');
            if (!container) return;
            
            if (gestiones.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-search fa-3x"></i>
                        <p style="margin-top: 15px;">No se encontraron gestiones</p>
                    </div>
                `;
                return;
            }
            
            let html = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Cliente</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Contactado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Resultado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Fecha</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #495057;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            gestiones.forEach((gestion, index) => {
                const fecha = new Date(gestion.fecha_creacion);
                const fechaFormato = fecha.toLocaleString('es-CO', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const clienteNombre = gestion.cliente_info?.nombre || 'ID: ' + gestion.cliente_id;
                const nivel1Tipo = (gestion.nivel1_tipo || '').toUpperCase();
                const fueContactado = nivel1Tipo !== 'NO CONTACTO' && nivel1Tipo !== '' && nivel1Tipo !== '0';
                const contactado = fueContactado ? 'SI' : 'NO';
                const contactadoColor = fueContactado ? '#28a745' : '#dc3545';
                const resultadoTipificacion = obtenerTipificacionTexto(gestion);
                
                html += `
                    <tr style="border-bottom: 1px solid #e9ecef;" data-gestion-index="${index}">
                        <td style="padding: 12px;">
                            <div>
                                <strong>${clienteNombre}</strong>
                                <br><small style="color: #666;">${gestion.cliente_info?.identificacion || 'N/A'}</small>
                            </div>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="
                                background: ${contactadoColor};
                                color: white;
                                padding: 4px 10px;
                                border-radius: 20px;
                                font-weight: 600;
                                font-size: 0.85rem;
                            ">${contactado}</span>
                        </td>
                        <td style="padding: 12px;">
                            <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${resultadoTipificacion}">
                                <small style="color: #495057;">${resultadoTipificacion}</small>
                            </div>
                        </td>
                        <td style="padding: 12px; color: #666; font-size: 0.9rem;">${fechaFormato}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="verObservacionesGestion(${index})" style="
                                background: #007bff;
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 0.85rem;
                                transition: background 0.3s;
                            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            container.innerHTML = html;
            
            // Actualizar gestiones globales para el modal de observaciones
            window.gestionesData = gestiones;
        }
        
        // Función para limpiar búsqueda
        function limpiarBusquedaGestiones() {
            const input = document.getElementById('buscar-gestiones-input');
            if (input) {
                input.value = '';
            }
            renderizarGestionesEnTabla(window.gestionesOriginales || []);
        }
        
        function cerrarModalDetallesAsesor() {
            console.log('Coord Dashboard: Cerrando modal de detalles');
            const modal = document.getElementById('modal-detalles-asesor');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        function verObservacionesGestion(index) {
            console.log('Ver observaciones de gestión:', index);
            
            if (!window.gestionesData || !window.gestionesData[index]) {
                alert('No se encontró la información de la gestión');
                return;
            }
            
            const gestion = window.gestionesData[index];
            const modal = document.getElementById('modal-observaciones');
            const content = document.getElementById('observaciones-content');
            
            // Formatear fecha
            const fecha = new Date(gestion.fecha_creacion);
            const fechaFormato = fecha.toLocaleString('es-CO', { 
                year: 'numeric', 
                month: 'long', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Obtener tipificación en texto usando la función de conversión
            let tipificacion = obtenerTipificacionTexto(gestion);
            
            // Información del cliente
            const clienteNombre = gestion.cliente_info?.nombre || 'ID: ' + gestion.cliente_id;
            const clienteIdentificacion = gestion.cliente_info?.identificacion || 'N/A';
            
            let html = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #667eea;">${clienteNombre}</h4>
                    <p style="color: #666; margin: 5px 0;">Cédula: ${clienteIdentificacion} | Fecha: ${fechaFormato}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                        <strong>Canal de Contacto</strong>
                        <div style="color: #495057; margin-top: 5px;">${gestion.canal_contacto || 'N/A'}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                        <strong>Tipificación</strong>
                        <div style="color: #495057; margin-top: 5px;">${tipificacion}</div>
                    </div>
                </div>
            `;
            
            // Canales de comunicación autorizados
            const canales = [];
            if (gestion.llamada_telefonica === 'si') canales.push('Llamada Telefónica');
            if (gestion.whatsapp === 'si') canales.push('WhatsApp');
            if (gestion.correo_electronico === 'si') canales.push('Correo Electrónico');
            if (gestion.sms === 'si') canales.push('SMS');
            if (gestion.correo_fisico === 'si') canales.push('Correo Físico');
            if (gestion.mensajeria_aplicacion === 'si') canales.push('Mensajería por Aplicación');
            
            if (canales.length > 0) {
                html += `
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                        <strong>Canales de Comunicación Autorizados</strong>
                        <div style="color: #495057; margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
                            ${canales.map(c => `<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${c}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Observaciones
            if (gestion.observaciones) {
                html += `
                    <div style="background: white; border-left: 4px solid #007bff; padding: 15px; border-radius: 6px;">
                        <strong style="color: #007bff;">Observaciones</strong>
                        <p style="color: #495057; margin-top: 8px; white-space: pre-wrap; word-wrap: break-word;">${gestion.observaciones}</p>
                    </div>
                `;
            } else {
                html += `
                    <div style="text-align: center; padding: 20px; color: #999; background: #f8f9fa; border-radius: 6px;">
                        <i class="fas fa-info-circle fa-2x"></i>
                        <p style="margin-top: 10px;">No hay observaciones registradas para esta gestión</p>
                    </div>
                `;
            }
            
            content.innerHTML = html;
            modal.style.display = 'block';
        }
        
        function cerrarModalObservaciones() {
            const modal = document.getElementById('modal-observaciones');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        // Cerrar modal al hacer clic fuera
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        }

        function refreshAsesores() {
            location.reload();
        }
    </script>

</body>
</html>
