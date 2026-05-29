<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Crear Usuario - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
</head>
<body>

    <div class="sidebar">
        <div class="sidebar-logo"><?php echo APP_NAME; ?></div>
        <nav class="sidebar-nav">
            <ul>
                <li onclick="window.location.href='index.php?action=dashboard'"><i class="fas fa-th-large"></i> Dashboard</li>
                <li class="active" onclick="window.location.href='index.php?action=admin_usuarios'"><i class="fas fa-users"></i> Usuarios</li>
                <li onclick="window.location.href='index.php?action=admin_asignaciones'"><i class="fas fa-user-friends"></i> Asignaciones</li>
            </ul>
        </nav>
        
        <!-- Botón de Cerrar Sesión en la parte inferior -->
        <div class="sidebar-footer">
            <a href="index.php?action=logout" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span>Cerrar Sesión</span>
            </a>
        </div>
    </div>

    <div class="main-container">
        <!-- Encabezado Superior -->
        <header class="top-header">
            <div class="header-left">
                <i class="fas fa-user-plus"></i>
                <span>Crear Usuario</span>
                <span><?php echo $_SESSION['usuario_nombre'] ?? 'Usuario'; ?></span>
            </div>
            <div class="header-right">
                <span><i class="fas fa-circle-info"></i></span>
                <span><i class="fas fa-bell"></i></span>
                <img src="https://placehold.co/30x30/FFFFFF/000000?text=<?php echo substr($_SESSION['usuario_nombre'] ?? 'A', 0, 1); ?>" class="user-avatar-img" alt="">
                <span><?php echo $_SESSION['usuario_nombre'] ?? 'Admin'; ?> <i class="fas fa-caret-down"></i></span>
            </div>
        </header>

        <!-- Sección Principal -->
        <section class="current-call-section">
            <div class="call-details">
                <h3>CREAR NUEVO USUARIO</h3>
                <p class="call-info">Sistema <?php echo APP_NAME; ?></p>
                <p class="call-info">Gestión de Usuarios</p>
                <small>Complete todos los campos requeridos</small>
                <div class="media-controls">
                    <button class="media-button" onclick="window.location.href='index.php?action=admin_usuarios'">
                        <i class="fas fa-arrow-left"></i> Volver a Usuarios
                    </button>
                    <button class="media-button" onclick="window.location.href='index.php?action=dashboard'">
                        <i class="fas fa-th-large"></i> Dashboard
                    </button>
                </div>
            </div>
            
            <div class="call-main-view">
                <div class="client-info">
                    <i class="fas fa-user-plus"></i>
                    <div>
                        <span class="client-name">Formulario de Usuario</span>
                        <span class="client-company"><?php echo APP_NAME; ?> - Administración</span>
                    </div>
                </div>

                <div class="main-tabs">
                    <span class="active" onclick="cambiarTab('datos-personales')">DATOS PERSONALES</span>
                    <span onclick="cambiarTab('credenciales')">CREDENCIALES</span>
                    <span onclick="cambiarTab('asignacion')">ASIGNACIÓN</span>
                    <span onclick="cambiarTab('revision')">REVISIÓN</span>
                </div>
                
                <div class="content-sections">
                    <!-- PESTAÑA 1: DATOS PERSONALES -->
                    <div class="tab-content active" id="tab-datos-personales">
                        <div class="left-content">
                            <h4 class="section-heading">Información Personal</h4>
                            <form id="form-crear-usuario" onsubmit="crearUsuario(event)">
                                <div class="form-section">
                                    <div class="input-group">
                                        <label for="cedula">Cédula *</label>
                                        <input type="text" id="cedula" name="cedula" required placeholder="Ej: 12345678">
                                        <small>Identificación única del usuario</small>
                                    </div>
                                    <div class="input-group">
                                        <label for="nombre_completo">Nombre Completo *</label>
                                        <input type="text" id="nombre_completo" name="nombre_completo" required placeholder="Ej: Juan Pérez García">
                                        <small>Nombre y apellidos completos</small>
                                    </div>
                                </div>
                                
                                <div class="form-section">
                                    <div class="input-group">
                                        <label for="telefono">Teléfono</label>
                                        <input type="tel" id="telefono" name="telefono" placeholder="Ej: +57 300 123 4567">
                                        <small>Número de contacto (opcional)</small>
                                    </div>
                                    <div class="input-group">
                                        <label for="email">Correo Electrónico</label>
                                        <input type="email" id="email" name="email" placeholder="Ej: usuario@empresa.com">
                                        <small>Correo para notificaciones (opcional)</small>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <aside class="right-sidebar">
                            <h4>Información del Sistema</h4>
                            <div class="info-card">
                                <i class="fas fa-info-circle"></i>
                                <div>
                                    <h5>Datos Requeridos</h5>
                                    <p>La cédula y nombre completo son obligatorios para crear el usuario.</p>
                                </div>
                            </div>
                            <div class="info-card">
                                <i class="fas fa-shield-alt"></i>
                                <div>
                                    <h5>Seguridad</h5>
                                    <p>Los datos personales se almacenan de forma segura y confidencial.</p>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <!-- PESTAÑA 2: CREDENCIALES -->
                    <div class="tab-content" id="tab-credenciales">
                        <div class="left-content">
                            <h4 class="section-heading">Credenciales de Acceso</h4>
                            <div class="form-section">
                                <div class="input-group">
                                    <label for="usuario">Nombre de Usuario *</label>
                                    <input type="text" id="usuario" name="usuario" required placeholder="Ej: jperez">
                                    <small>Nombre único para iniciar sesión</small>
                                </div>
                                <div class="input-group">
                                    <label for="contrasena">Contraseña *</label>
                                    <input type="password" id="contrasena" name="contrasena" required placeholder="Mínimo 6 caracteres">
                                    <small>Contraseña segura para el acceso</small>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <div class="input-group">
                                    <label for="confirmar_contrasena">Confirmar Contraseña *</label>
                                    <input type="password" id="confirmar_contrasena" name="confirmar_contrasena" required placeholder="Repita la contraseña">
                                    <small>Debe coincidir con la contraseña anterior</small>
                                </div>
                                <div class="input-group">
                                    <label for="rol">Rol del Usuario *</label>
                                    <select id="rol" name="rol" required>
                                        <option value="">Seleccionar rol</option>
                                        <option value="administrador">Administrador</option>
                                        <option value="coordinador">Coordinador</option>
                                        <option value="asesor">Asesor</option>
                                    </select>
                                    <small>Define los permisos del usuario</small>
                                </div>
                            </div>
                        </div>
                        
                        <aside class="right-sidebar">
                            <h4>Requisitos de Seguridad</h4>
                            <div class="requirement-list">
                                <div class="requirement-item">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Mínimo 6 caracteres</span>
                                </div>
                                <div class="requirement-item">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Usuario único en el sistema</span>
                                </div>
                                <div class="requirement-item">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Contraseña encriptada</span>
                                </div>
                            </div>
                            
                            <div class="info-card">
                                <i class="fas fa-user-shield"></i>
                                <div>
                                    <h5>Roles Disponibles</h5>
                                    <ul>
                                        <li><strong>Administrador:</strong> Acceso completo</li>
                                        <li><strong>Coordinador:</strong> Gestión de asesores</li>
                                        <li><strong>Asesor:</strong> Atención a clientes</li>
                                    </ul>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <!-- PESTAÑA 3: ASIGNACIÓN -->
                    <div class="tab-content" id="tab-asignacion">
                        <div class="left-content">
                            <h4 class="section-heading">Asignación de Personal</h4>
                            <div class="form-section">
                                <div class="input-group">
                                    <label for="coordinador_id">Coordinador Asignado</label>
                                    <select id="coordinador_id" name="coordinador_id">
                                        <option value="">Sin asignar</option>
                                        <?php 
                                        // Obtener coordinadores disponibles
                                        require_once __DIR__ . '/../models/Usuario.php';
                                        $usuario_model = new Usuario();
                                        $coordinadores = array_filter($usuario_model->obtenerTodos(), function($u) { 
                                            return $u['rol'] === 'coordinador' && $u['estado'] === 'activo'; 
                                        });
                                        foreach ($coordinadores as $coord): 
                                        ?>
                                            <option value="<?php echo $coord['cedula']; ?>"><?php echo htmlspecialchars($coord['nombre_completo']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <small>Solo para usuarios con rol de asesor</small>
                                </div>
                                <div class="input-group">
                                    <label for="estado">Estado del Usuario</label>
                                    <select id="estado" name="estado">
                                        <option value="activo" selected>Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                    <small>Estado inicial del usuario</small>
                                </div>
                            </div>
                            
                            <div class="form-section">
                                <div class="input-group">
                                    <label for="notas">Notas Adicionales</label>
                                    <textarea id="notas" name="notas" rows="4" placeholder="Información adicional sobre el usuario..."></textarea>
                                    <small>Comentarios o información relevante</small>
                                </div>
                            </div>
                        </div>
                        
                        <aside class="right-sidebar">
                            <h4>Asignaciones</h4>
                            <div class="info-card">
                                <i class="fas fa-users"></i>
                                <div>
                                    <h5>Coordinadores Disponibles</h5>
                                    <p><?php echo count($coordinadores); ?> coordinadores activos</p>
                                </div>
                            </div>
                            
                            <div class="info-card">
                                <i class="fas fa-info-circle"></i>
                                <div>
                                    <h5>Notas Importantes</h5>
                                    <ul>
                                        <li>Los asesores deben tener un coordinador asignado</li>
                                        <li>Los coordinadores pueden gestionar múltiples asesores</li>
                                        <li>Los administradores no requieren asignación</li>
                                    </ul>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <!-- PESTAÑA 4: REVISIÓN -->
                    <div class="tab-content" id="tab-revision">
                        <div class="left-content">
                            <h4 class="section-heading">Revisión Final</h4>
                            <div class="review-section">
                                <h5>Datos del Usuario</h5>
                                <div class="review-item">
                                    <span class="review-label">Cédula:</span>
                                    <span class="review-value" id="review-cedula">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Nombre:</span>
                                    <span class="review-value" id="review-nombre">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Usuario:</span>
                                    <span class="review-value" id="review-usuario">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Rol:</span>
                                    <span class="review-value" id="review-rol">-</span>
                                </div>
                                <div class="review-item">
                                    <span class="review-label">Estado:</span>
                                    <span class="review-value" id="review-estado">-</span>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="window.location.href='index.php?action=admin_usuarios'">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                                <button type="submit" form="form-crear-usuario" class="btn btn-primary" id="btn-crear-usuario">
                                    <i class="fas fa-user-plus"></i> Crear Usuario
                                </button>
                            </div>
                        </div>
                        
                        <aside class="right-sidebar">
                            <h4>Resumen</h4>
                            <div class="summary-card">
                                <div class="summary-item">
                                    <i class="fas fa-user"></i>
                                    <div>
                                        <h5>Usuario Nuevo</h5>
                                        <p>Se creará un nuevo usuario en el sistema</p>
                                    </div>
                                </div>
                                <div class="summary-item">
                                    <i class="fas fa-shield-alt"></i>
                                    <div>
                                        <h5>Seguridad</h5>
                                        <p>Contraseña encriptada y datos seguros</p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Alertas -->
    <div id="alert-container"></div>

    <script>
        // Función para cambiar entre pestañas
        function cambiarTab(tabName) {
            // Ocultar todas las pestañas
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tab => {
                tab.style.display = 'none';
            });
            
            // Remover clase active de todas las pestañas
            const tabSpans = document.querySelectorAll('.main-tabs span');
            tabSpans.forEach(span => {
                span.classList.remove('active');
            });
            
            // Mostrar la pestaña seleccionada
            const selectedTab = document.getElementById('tab-' + tabName);
            if (selectedTab) {
                selectedTab.style.display = 'block';
            }
            
            // Marcar la pestaña como activa
            const selectedSpan = document.querySelector(`[onclick="cambiarTab('${tabName}')"]`);
            if (selectedSpan) {
                selectedSpan.classList.add('active');
            }
            
            // Actualizar revisión si es la pestaña de revisión
            if (tabName === 'revision') {
                actualizarRevision();
            }
        }
        
        // Función para actualizar la pestaña de revisión
        function actualizarRevision() {
            document.getElementById('review-cedula').textContent = document.getElementById('cedula').value || '-';
            document.getElementById('review-nombre').textContent = document.getElementById('nombre_completo').value || '-';
            document.getElementById('review-usuario').textContent = document.getElementById('usuario').value || '-';
            document.getElementById('review-rol').textContent = document.getElementById('rol').options[document.getElementById('rol').selectedIndex].text || '-';
            document.getElementById('review-estado').textContent = document.getElementById('estado').options[document.getElementById('estado').selectedIndex].text || '-';
        }
        
        // Función para crear usuario
        function crearUsuario(event) {
            event.preventDefault();
            
            const form = document.getElementById('form-crear-usuario');
            const btnCrear = document.getElementById('btn-crear-usuario');
            
            // Validar formulario
            if (!validateForm()) {
                return;
            }
            
            // Deshabilitar botón y mostrar loading
            btnCrear.disabled = true;
            btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
            
            // Limpiar alertas anteriores
            const alertContainer = document.getElementById('alert-container');
            alertContainer.innerHTML = '';
            
            // Recopilar datos del formulario
            const formData = new FormData(form);
            formData.append('ajax', '1');
            
            // Enviar solicitud AJAX
            fetch('index.php?action=crear_usuario', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                // Verificar que la respuesta sea JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error('Respuesta no es JSON: ' + text.substring(0, 100));
                    });
                }
                return response.json();
            })
            .then(result => {
                // Ya viene parseado como JSON
                    if (result.success) {
                        mostrarAlerta(result.message, 'success');
                        form.reset();
                        setTimeout(() => {
                            window.location.href = 'index.php?action=admin_usuarios';
                        }, 2000);
                    } else {
                        mostrarAlerta(result.message, 'error');
                    }
            })
            .catch(error => {
                mostrarAlerta('Error de conexión: ' + error.message, 'error');
            })
            .finally(() => {
                // Restaurar botón
                btnCrear.disabled = false;
                btnCrear.innerHTML = '<i class="fas fa-user-plus"></i> Crear Usuario';
            });
        }
        
        // Función para validar formulario
        function validateForm() {
            const requiredFields = ['cedula', 'nombre_completo', 'usuario', 'contrasena', 'confirmar_contrasena', 'rol'];
            let isValid = true;
            
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!field.value.trim()) {
                    field.classList.add('error');
                    isValid = false;
                } else {
                    field.classList.remove('error');
                }
            });
            
            // Validar confirmación de contraseña
            const contrasena = document.getElementById('contrasena').value;
            const confirmarContrasena = document.getElementById('confirmar_contrasena').value;
            
            if (contrasena !== confirmarContrasena) {
                document.getElementById('confirmar_contrasena').classList.add('error');
                mostrarAlerta('Las contraseñas no coinciden', 'error');
                isValid = false;
            }
            
            // Validar longitud de contraseña
            if (contrasena.length < 6) {
                document.getElementById('contrasena').classList.add('error');
                mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
                isValid = false;
            }
            
            return isValid;
        }
        
        // Función para mostrar alertas
        function mostrarAlerta(mensaje, tipo) {
            const alertContainer = document.getElementById('alert-container');
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${tipo}`;
            alertDiv.innerHTML = `
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                ${mensaje}
            `;
            
            alertContainer.appendChild(alertDiv);
            
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
        
        // Validación en tiempo real
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('form-crear-usuario');
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    if (this.hasAttribute('required') && !this.value.trim()) {
                        this.classList.add('error');
                    } else {
                        this.classList.remove('error');
                    }
                });
            });
        });
    </script>
</body>
</html>
