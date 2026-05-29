<?php
/**
 * Header Compartido - Sistema IPS CRM
 * Header superior para todas las vistas del sistema
 */

// Obtener el rol del usuario actual
$rol_usuario = $_SESSION['usuario_rol'] ?? 'guest';
$usuario_nombre = $_SESSION['usuario_nombre'] ?? 'Usuario';
$usuario_inicial = substr($usuario_nombre, 0, 1);
?>

<!-- Header Superior Compartido -->
<header class="top-header">
    <div class="header-left">
        <div class="user-info">
            <i class="fas fa-<?php 
                echo $rol_usuario === 'administrador' ? 'user-shield' : 
                    ($rol_usuario === 'coordinador' ? 'user-tie' : 
                    ($rol_usuario === 'asesor' ? 'user' : 'user-circle')); 
            ?>"></i>
            <div class="user-details">
                <span class="user-role"><?php 
                    echo $rol_usuario === 'administrador' ? 'Administrador' : 
                        ($rol_usuario === 'coordinador' ? 'Coordinador' : 
                        ($rol_usuario === 'asesor' ? 'Asesor' : 'Usuario')); 
                ?></span>
                <span class="user-name"><?php echo htmlspecialchars($usuario_nombre); ?></span>
            </div>
        </div>
    </div>
    <div class="header-right">
        <div class="header-actions">
            <span class="action-icon" title="Información"><i class="fas fa-circle-info"></i></span>
            <?php if ($rol_usuario === 'asesor'): ?>
            <button type="button" class="action-icon recordatorios-volver-llamar-trigger" data-recordatorios-trigger title="Volver a llamar hoy" style="border: none; background: transparent; cursor: pointer; position: relative;">
                <i class="fas fa-bell"></i>
                <span class="recordatorios-volver-llamar-badge" data-recordatorios-badge style="display: none; position: absolute; top: -4px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; font-size: 11px; line-height: 18px; border-radius: 9px; background: #dc3545; color: #fff; font-weight: 700;">0</span>
            </button>
            <?php else: ?>
            <span class="action-icon" title="Notificaciones"><i class="fas fa-bell"></i></span>
            <?php endif; ?>
        </div>
    </div>
</header>
