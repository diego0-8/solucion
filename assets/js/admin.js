/**
 * JavaScript para Funciones de Administración
 * Funciones específicas para el panel de administración
 */

// Función para manejar la creación de usuarios
function crearUsuario(event) {
    event.preventDefault();
    
    const formulario = event.target;
    const formData = new FormData(formulario);
    
    // Detectar si hay un contenedor de alertas específico (admin_dashboard.php)
    const alertContainer = document.getElementById('alert-container-crear');
    const usarContenedorEspecifico = alertContainer !== null;
    
    // Función helper para mostrar mensajes
    const mostrarMensaje = (mensaje, tipo) => {
        if (usarContenedorEspecifico && typeof mostrarAlerta === 'function') {
            mostrarAlerta(mensaje, tipo, 'crear-usuario');
        } else if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(mensaje, tipo);
        } else {
            alert(mensaje);
        }
    };
    
    // Validar formulario
    if (!validarFormulario(formulario)) {
        mostrarMensaje('Por favor, complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar contraseñas
    const contrasena = formData.get('contrasena');
    const confirmar_contrasena = formData.get('confirmar_contrasena');
    
    if (contrasena !== confirmar_contrasena) {
        mostrarMensaje('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (contrasena.length < 6) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Mostrar loading
    mostrarLoading(formulario);
    
    // Enviar petición
    hacerPeticion('index.php?action=crear_usuario', {
        method: 'POST',
        body: new URLSearchParams(formData)
    })
    .then(response => {
        if (response.success) {
            mostrarMensaje(response.message, 'success');
            limpiarFormulario(formulario);
            // Limpiar campos de asesor si existen
            if (typeof toggleCamposAsesor === 'function') {
                toggleCamposAsesor();
            }
            if (typeof closeModal === 'function') {
                closeModal('crear-usuario');
            } else if (typeof cerrarModal === 'function') {
                cerrarModal('crear-usuario');
            }
            // Actualizar tabla de usuarios si existe
            if (typeof actualizarTablaUsuarios === 'function') {
                actualizarTablaUsuarios();
            } else {
                // Recargar página después de 2 segundos si no hay función de actualización
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }
        } else {
            mostrarMensaje(response.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje('Error al crear el usuario: ' + error.message, 'error');
    })
    .finally(() => {
        ocultarLoading(formulario);
    });
}

// Función para manejar la edición de usuarios
function editarUsuarioSubmit(event) {
    event.preventDefault();
    
    const formulario = event.target;
    const formData = new FormData(formulario);
    
    // Validar formulario
    if (!validarFormulario(formulario)) {
        mostrarNotificacion('Por favor, complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar contraseñas si se proporcionan
    const contrasena = formData.get('contrasena');
    const confirmar_contrasena = formData.get('confirmar_contrasena');
    
    if (contrasena && contrasena.length > 0) {
        if (contrasena !== confirmar_contrasena) {
            mostrarNotificacion('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (contrasena.length < 6) {
            mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
    }
    
    // Mostrar loading
    mostrarLoading(formulario);
    
    // Enviar petición
    hacerPeticion('index.php?action=actualizar_usuario', {
        method: 'POST',
        body: new URLSearchParams(formData)
    })
    .then(response => {
        if (response.success) {
            mostrarNotificacion(response.message, 'success');
            cerrarModal('editar-usuario');
            // Actualizar fila de usuario si existe
            if (typeof actualizarFilaUsuario === 'function') {
                const cedula = formData.get('cedula');
                const datos = {
                    nombre_completo: formData.get('nombre_completo'),
                    usuario: formData.get('usuario'),
                    rol: formData.get('rol'),
                    estado: formData.get('estado')
                };
                actualizarFilaUsuario(cedula, datos);
            }
        } else {
            mostrarNotificacion(response.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al actualizar el usuario', 'error');
    })
    .finally(() => {
        ocultarLoading(formulario);
    });
}

// Función para manejar la asignación de personal
function asignarPersonalSubmit(event) {
    event.preventDefault();
    
    const formulario = event.target;
    const formData = new FormData(formulario);
    
    // Validar formulario
    if (!validarFormulario(formulario)) {
        mostrarNotificacion('Por favor, complete todos los campos requeridos', 'error');
        return;
    }
    
    // Mostrar loading
    mostrarLoading(formulario);
    
    // Enviar petición
    hacerPeticion('index.php?action=crear_asignacion', {
        method: 'POST',
        body: new URLSearchParams(formData)
    })
    .then(response => {
        if (response.success) {
            mostrarNotificacion(response.message, 'success');
            limpiarFormulario(formulario);
            cerrarModal('asignar-personal');
            // Recargar página para actualizar estadísticas
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            mostrarNotificacion(response.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al asignar personal', 'error');
    })
    .finally(() => {
        ocultarLoading(formulario);
    });
}

// Función para cambiar estado de usuario (habilitar/deshabilitar)
function cambiarEstadoUsuario(cedula, nuevoEstado) {
    const accion = nuevoEstado === 'activo' ? 'habilitar' : 'deshabilitar';
    
    if (!confirm(`¿Está seguro de que desea ${accion} este usuario?`)) {
        return;
    }
    
    const params = new URLSearchParams();
    params.append('cedula', String(cedula));
    params.append('estado', String(nuevoEstado));
    
    hacerPeticion('index.php?action=cambiar_estado_usuario', {
        method: 'POST',
        body: params
    })
    .then(response => {
        if (response.success) {
            mostrarNotificacion(response.message, 'success');
            // Actualizar estado en la tabla si existe
            if (typeof actualizarEstadoUsuario === 'function') {
                actualizarEstadoUsuario(cedula, nuevoEstado);
            }
        } else {
            mostrarNotificacion(response.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al cambiar el estado del usuario', 'error');
    });
}

// Función para eliminar usuario
function eliminarUsuario(cedula) {
    if (!confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const params = new URLSearchParams();
    params.append('cedula', String(cedula));
    
    hacerPeticion('index.php?action=eliminar_usuario', {
        method: 'POST',
        body: params
    })
    .then(response => {
        if (response.success) {
            mostrarNotificacion(response.message, 'success');
            // Eliminar fila de la tabla si existe
            if (typeof eliminarFilaUsuario === 'function') {
                eliminarFilaUsuario(cedula);
            }
        } else {
            mostrarNotificacion(response.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarNotificacion('Error al eliminar el usuario', 'error');
    });
}

// Función para abrir modal de edición
function editarUsuario(cedula) {
    // Buscar la fila del usuario en la tabla
    const fila = document.querySelector(`tr[data-usuario-id="${cedula}"]`);
    if (!fila) {
        mostrarNotificacion('No se encontró la información del usuario', 'error');
        return;
    }
    
    // Extraer datos de la fila
    const nombreCompleto = fila.querySelector('.user-details strong')?.textContent || '';
    const usuario = fila.querySelector('.user-details small')?.textContent?.replace('Usuario: ', '') || '';
    const rol = fila.querySelector('.rol-badge')?.textContent?.trim() || '';
    const estado = fila.querySelector('.estado-badge')?.textContent?.trim() || '';
    
    // Llenar el formulario de edición
    const modal = document.getElementById('editar-usuario');
    if (modal) {
        const form = modal.querySelector('form');
        if (form) {
            form.querySelector('input[name="cedula"]').value = cedula;
            form.querySelector('input[name="nombre_completo"]').value = nombreCompleto;
            form.querySelector('input[name="usuario"]').value = usuario;
            form.querySelector('select[name="rol"]').value = rol.toLowerCase();
            form.querySelector('select[name="estado"]').value = estado.toLowerCase();
            
            // Limpiar campos de contraseña
            form.querySelector('input[name="contrasena"]').value = '';
            form.querySelector('input[name="confirmar_contrasena"]').value = '';
        }
        
        // Mostrar modal
        modal.style.display = 'block';
    }
}

// Función para cerrar modales
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Limpiar formulario si existe
        const form = modal.querySelector('form');
        if (form) {
            limpiarFormulario(form);
        }
    }
}

// Función para abrir modales
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Función para actualizar tabla de usuarios
function actualizarTablaUsuarios() {
    // Recargar la página para mostrar los cambios
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Función para actualizar fila de usuario
function actualizarFilaUsuario(cedula, datos) {
    const fila = document.querySelector(`tr[data-usuario-id="${cedula}"]`);
    if (fila) {
        // Actualizar nombre completo
        const nombreElement = fila.querySelector('.user-details strong');
        if (nombreElement) {
            nombreElement.textContent = datos.nombre_completo;
        }
        
        // Actualizar usuario
        const usuarioElement = fila.querySelector('.user-details small');
        if (usuarioElement) {
            usuarioElement.textContent = `Usuario: ${datos.usuario}`;
        }
        
        // Actualizar rol
        const rolElement = fila.querySelector('.rol-badge');
        if (rolElement) {
            rolElement.textContent = datos.rol.charAt(0).toUpperCase() + datos.rol.slice(1);
            rolElement.className = `rol-badge rol-${datos.rol}`;
        }
        
        // Actualizar estado
        const estadoElement = fila.querySelector('.estado-badge');
        if (estadoElement) {
            estadoElement.textContent = datos.estado.charAt(0).toUpperCase() + datos.estado.slice(1);
            estadoElement.className = `estado-badge estado-${datos.estado}`;
        }
        
        // Actualizar botones de acción
        if (typeof actualizarBotonesAccion === 'function') {
            actualizarBotonesAccion(fila, datos.estado);
        }
    }
}

// Función para actualizar estado de usuario (badge + botón Deshabilitar/Habilitar)
function actualizarEstadoUsuario(cedula, nuevoEstado) {
    const fila = document.querySelector(`tr[data-usuario-id="${cedula}"]`);
    if (fila) {
        // Actualizar badge de estado (mantener icono)
        const estadoElement = fila.querySelector('.estado-badge');
        if (estadoElement) {
            const texto = nuevoEstado.charAt(0).toUpperCase() + nuevoEstado.slice(1);
            estadoElement.innerHTML = '<i class="fas fa-circle"></i> ' + texto;
            estadoElement.className = 'estado-badge estado-' + nuevoEstado;
        }
        
        // Actualizar botones de acción
        if (typeof actualizarBotonesAccion === 'function') {
            actualizarBotonesAccion(fila, nuevoEstado);
        }
    }
}

// Función para actualizar botones de acción (Deshabilitar / Habilitar)
function actualizarBotonesAccion(fila, estado) {
    const botonEstado = fila.querySelector('.btn-enable, .btn-disable');
    if (botonEstado) {
        const usuarioId = fila.dataset.usuarioId;
        const esUsuarioActual = document.body.dataset.userId && usuarioId && (document.body.dataset.userId === usuarioId);
        if (estado === 'activo') {
            botonEstado.className = 'btn-action btn-disable';
            botonEstado.innerHTML = '<i class="fas fa-user-times"></i>';
            botonEstado.title = esUsuarioActual ? 'No puede deshabilitar su propio usuario' : 'Deshabilitar usuario';
            botonEstado.disabled = !!esUsuarioActual;
            botonEstado.onclick = esUsuarioActual ? null : () => cambiarEstadoUsuario(usuarioId, 'inactivo');
        } else {
            botonEstado.className = 'btn-action btn-enable';
            botonEstado.innerHTML = '<i class="fas fa-user-check"></i>';
            botonEstado.title = 'Habilitar usuario';
            botonEstado.disabled = false;
            botonEstado.onclick = () => cambiarEstadoUsuario(usuarioId, 'activo');
        }
    }
}

// Función para eliminar fila de usuario
function eliminarFilaUsuario(cedula) {
    const fila = document.querySelector(`tr[data-usuario-id="${cedula}"]`);
    if (fila) {
        fila.remove();
    }
}

// Función para refrescar asesores (coordinador)
function refreshAsesores() {
    location.reload();
}

// Función para ver detalles de asesor
function verDetallesAsesor(cedula) {
    mostrarNotificacion('Función de ver detalles del asesor en desarrollo', 'info');
}

// Función para asignar cliente a asesor
function asignarClienteAsesor(cedula) {
    mostrarNotificacion('Función de asignar cliente al asesor en desarrollo', 'info');
}

// Función para enviar mensaje a asesor
function enviarMensaje(cedula) {
    mostrarNotificacion('Función de enviar mensaje al asesor en desarrollo', 'info');
}

// Cerrar modal al hacer clic fuera de él
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modales = document.querySelectorAll('.modal');
        modales.forEach(modal => {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Agregar estilos para modales si no existen
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                overflow-y: auto;
            }
            .modal-content {
                background-color: #fefefe;
                margin: 5% auto;
                padding: 20px;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                position: relative;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #e9ecef;
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
            }
            .modal-close:hover {
                color: #000;
            }
        `;
        document.head.appendChild(style);
    }
});

// Exportar funciones para uso global
window.crearUsuario = crearUsuario;
window.editarUsuarioSubmit = editarUsuarioSubmit;
window.asignarPersonalSubmit = asignarPersonalSubmit;
window.cambiarEstadoUsuario = cambiarEstadoUsuario;
window.eliminarUsuario = eliminarUsuario;
window.editarUsuario = editarUsuario;
window.cerrarModal = cerrarModal;
window.abrirModal = abrirModal;
window.actualizarTablaUsuarios = actualizarTablaUsuarios;
window.actualizarFilaUsuario = actualizarFilaUsuario;
window.actualizarEstadoUsuario = actualizarEstadoUsuario;
window.actualizarBotonesAccion = actualizarBotonesAccion;
window.eliminarFilaUsuario = eliminarFilaUsuario;
window.refreshAsesores = refreshAsesores;
window.verDetallesAsesor = verDetallesAsesor;
window.asignarClienteAsesor = asignarClienteAsesor;
window.enviarMensaje = enviarMensaje;
