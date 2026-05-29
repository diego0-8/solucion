<?php
/**
 * Navbar Compartido - Sistema IPS CRM
 * Contiene los navbars para todos los roles del sistema
 */

// Obtener el rol del usuario actual
$rol_usuario = $_SESSION['usuario_rol'] ?? 'guest';
$usuario_nombre = $_SESSION['usuario_nombre'] ?? 'Usuario';
$usuario_inicial = substr($usuario_nombre, 0, 1);
$action = $action ?? $_GET['action'] ?? 'login';
?>

<div id="app-sidebar" class="sidebar" style="background-color: #232759;" role="navigation" aria-label="Menú principal">
    <img src="img/banco_logo1.png" alt="Logo bancow" class="sidebar-logo-img">
    <nav class="sidebar-nav">
        <ul>
            <?php if ($rol_usuario === 'administrador'): ?>
                <!-- NAVBAR ADMINISTRADOR: solo Dashboard, Usuarios (crear usuario), Asignaciones (asignar personal) -->
                <li class="<?php echo ($action === 'dashboard' || $action === 'admin_dashboard') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=dashboard'">
                    <i class="fas fa-th-large"></i> Dashboard
                </li>
                <li class="<?php echo ($action === 'admin_usuarios' || $action === 'admin_crear_usuario') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=admin_usuarios'">
                    <i class="fas fa-users"></i> Usuarios
                </li>
                <li class="<?php echo ($action === 'admin_asignaciones' || $action === 'admin_asignar_personal') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=admin_asignaciones'">
                    <i class="fas fa-user-friends"></i> Asignaciones
                </li>
                <li class="<?php echo ($action === 'admin_reportes') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=admin_reportes'">
                    <i class="fas fa-chart-bar"></i> Reportes
                </li>
                
            <?php elseif ($rol_usuario === 'coordinador'): ?>
                <!-- NAVBAR COORDINADOR -->
                <li class="<?php echo ($action === 'coordinador_dashboard') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=coordinador_dashboard'">
                    <i class="fas fa-th-large"></i> Dashboard
                </li>
                <li class="<?php echo ($action === 'coordinador_gestion') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=coordinador_gestion'">
                    <i class="fas fa-cogs"></i> Gestión
                </li>
                <li class="<?php echo ($action === 'coordinador_exporte') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=coordinador_exporte'">
                    <i class="fas fa-download"></i> Exporte
                </li>
                
            <?php elseif ($rol_usuario === 'asesor'): ?>
                <!-- NAVBAR ASESOR -->
                <li class="<?php echo ($action === 'asesor_dashboard') ? 'active' : ''; ?>" 
                    onclick="window.location.href='index.php?action=asesor_dashboard'">
                    <i class="fas fa-th-large"></i> Dashboard
                </li>
                <!-- Botón de búsqueda de cliente -->
                <li id="navbar-buscar-cliente" onclick="abrirBusquedaClienteNavbar()" title="Buscar cliente por cédula o celular">
                    <i class="fas fa-search"></i> Buscar Cliente
                </li>
                <li class="recordatorios-volver-llamar-nav" data-recordatorios-trigger title="Clientes con volver a llamar hoy" style="cursor: pointer;">
                    <span style="position: relative; display: inline-block; margin-right: 8px; vertical-align: middle;">
                        <i class="fas fa-bell" style="display: inline-block;"></i>
                        <span class="recordatorios-volver-llamar-badge" data-recordatorios-badge style="display: none; position: absolute; top: -6px; right: -10px; min-width: 18px; height: 18px; padding: 0 5px; font-size: 11px; line-height: 18px; border-radius: 9px; background: #dc3545; color: #fff; font-weight: 700; text-align: center; box-sizing: border-box;">0</span>
                    </span>
                    Recordatorios
                </li>
                <!-- Botón de tiempo de sesión -->
                <li id="navbar-tiempo-sesion" onclick="toggleTiempoModal()">
                    <i class="fas fa-clock"></i> Tiempo de Sesión
                </li>
                <!-- Botón de Cerrar Sesión -->
                <li class="logout-menu-item" onclick="window.location.href='index.php?action=logout'" title="Cerrar Sesión">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </li>
            <?php else: ?>
                <!-- NAVBAR GUEST (No autenticado) -->
                <li onclick="window.location.href='index.php?action=login'">
                    <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                </li>
            <?php endif; ?>
            
            <?php if ($rol_usuario === 'administrador'): ?>
                <!-- Botón de Cerrar Sesión para Administrador -->
                <li class="logout-menu-item" onclick="window.location.href='index.php?action=logout'" title="Cerrar Sesión">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </li>
            <?php elseif ($rol_usuario === 'coordinador'): ?>
                <!-- Botón de Cerrar Sesión para Coordinador -->
                <li class="logout-menu-item" onclick="window.location.href='index.php?action=logout'" title="Cerrar Sesión">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </li>
            <?php endif; ?>
        </ul>
    </nav>
</div>
