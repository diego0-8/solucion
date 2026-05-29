/**
 * Utilidad de manejo de errores para el sistema APEX
 * Centraliza el manejo de errores y muestra mensajes consistentes
 */

const ErrorHandler = {
    /**
     * Mostrar mensaje de error en un contenedor específico
     * @param {string} mensaje - Mensaje de error a mostrar
     * @param {string|HTMLElement} contenedor - Selector o elemento donde mostrar el error
     */
    mostrarError: function(mensaje, contenedor = null) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            <strong>Error:</strong> ${this.sanitizarHTML(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        if (contenedor) {
            const element = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
            if (element) {
                element.insertBefore(errorDiv, element.firstChild);
            }
        } else {
            // Si no hay contenedor, mostrar en la parte superior de la página
            const mainContent = document.querySelector('main') || document.body;
            mainContent.insertBefore(errorDiv, mainContent.firstChild);
        }
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    },
    
    /**
     * Mostrar mensaje de éxito
     * @param {string} mensaje - Mensaje de éxito a mostrar
     * @param {string|HTMLElement} contenedor - Selector o elemento donde mostrar el mensaje
     */
    mostrarExito: function(mensaje, contenedor = null) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show';
        successDiv.role = 'alert';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${this.sanitizarHTML(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        if (contenedor) {
            const element = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
            if (element) {
                element.insertBefore(successDiv, element.firstChild);
            }
        } else {
            const mainContent = document.querySelector('main') || document.body;
            mainContent.insertBefore(successDiv, mainContent.firstChild);
        }
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    },
    
    /**
     * Mostrar mensaje de advertencia
     * @param {string} mensaje - Mensaje de advertencia a mostrar
     * @param {string|HTMLElement} contenedor - Selector o elemento donde mostrar el mensaje
     */
    mostrarAdvertencia: function(mensaje, contenedor = null) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning alert-dismissible fade show';
        warningDiv.role = 'alert';
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${this.sanitizarHTML(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        if (contenedor) {
            const element = typeof contenedor === 'string' ? document.querySelector(contenedor) : contenedor;
            if (element) {
                element.insertBefore(warningDiv, element.firstChild);
            }
        } else {
            const mainContent = document.querySelector('main') || document.body;
            mainContent.insertBefore(warningDiv, mainContent.firstChild);
        }
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.remove();
            }
        }, 4000);
    },
    
    /**
     * Manejar errores de fetch/AJAX
     * @param {Error} error - Objeto de error
     * @param {string|HTMLElement} contenedor - Donde mostrar el error
     * @returns {void}
     */
    manejarErrorFetch: function(error, contenedor = null) {
        console.error('Error en petición:', error);
        
        let mensaje = 'Error de conexión. Por favor, verifica tu conexión a internet.';
        
        if (error.message) {
            if (error.message.includes('Failed to fetch')) {
                mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión.';
            } else if (error.message.includes('JSON')) {
                mensaje = 'Error al procesar la respuesta del servidor.';
            } else {
                mensaje = `Error: ${error.message}`;
            }
        }
        
        this.mostrarError(mensaje, contenedor);
    },
    
    /**
     * Manejar respuestas HTTP con errores
     * @param {Response} response - Respuesta HTTP
     * @param {string|HTMLElement} contenedor - Donde mostrar el error
     * @returns {Promise}
     */
    manejarRespuestaError: async function(response, contenedor = null) {
        let mensaje = `Error ${response.status}: ${response.statusText}`;
        
        try {
            const data = await response.json();
            if (data.message) {
                mensaje = data.message;
            }
        } catch (e) {
            // Si no se puede parsear como JSON, usar mensaje por defecto
        }
        
        this.mostrarError(mensaje, contenedor);
        throw new Error(mensaje);
    },
    
    /**
     * Validar formulario antes de enviar
     * @param {HTMLFormElement} form - Formulario a validar
     * @returns {boolean} - true si es válido, false si no
     */
    validarFormulario: function(form) {
        // Limpiar errores previos
        const erroresAnteriores = form.querySelectorAll('.invalid-feedback');
        erroresAnteriores.forEach(error => error.remove());
        
        const camposInvalidos = form.querySelectorAll('.is-invalid');
        camposInvalidos.forEach(campo => campo.classList.remove('is-invalid'));
        
        // Validar campos requeridos
        const camposRequeridos = form.querySelectorAll('[required]');
        let esValido = true;
        
        camposRequeridos.forEach(campo => {
            if (!campo.value || campo.value.trim() === '') {
                this.marcarCampoInvalido(campo, 'Este campo es requerido');
                esValido = false;
            }
        });
        
        // Validar emails
        const camposEmail = form.querySelectorAll('input[type="email"]');
        camposEmail.forEach(campo => {
            if (campo.value && !this.validarEmail(campo.value)) {
                this.marcarCampoInvalido(campo, 'Email no válido');
                esValido = false;
            }
        });
        
        // Validar números
        const camposNumero = form.querySelectorAll('input[type="number"]');
        camposNumero.forEach(campo => {
            if (campo.value) {
                const min = campo.getAttribute('min');
                const max = campo.getAttribute('max');
                const valor = parseFloat(campo.value);
                
                if (min !== null && valor < parseFloat(min)) {
                    this.marcarCampoInvalido(campo, `El valor mínimo es ${min}`);
                    esValido = false;
                }
                
                if (max !== null && valor > parseFloat(max)) {
                    this.marcarCampoInvalido(campo, `El valor máximo es ${max}`);
                    esValido = false;
                }
            }
        });
        
        return esValido;
    },
    
    /**
     * Marcar un campo como inválido
     * @param {HTMLElement} campo - Campo a marcar
     * @param {string} mensaje - Mensaje de error
     */
    marcarCampoInvalido: function(campo, mensaje) {
        campo.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = mensaje;
        
        campo.parentNode.appendChild(errorDiv);
    },
    
    /**
     * Validar formato de email
     * @param {string} email - Email a validar
     * @returns {boolean}
     */
    validarEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    /**
     * Sanitizar HTML para prevenir XSS
     * @param {string} html - HTML a sanitizar
     * @returns {string}
     */
    sanitizarHTML: function(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },
    
    /**
     * Mostrar loading spinner en un botón
     * @param {HTMLElement} boton - Botón donde mostrar el loading
     * @param {string} texto - Texto a mostrar durante la carga
     */
    mostrarLoading: function(boton, texto = 'Cargando...') {
        if (!boton) return;
        
        // Guardar el contenido original
        boton.dataset.originalContent = boton.innerHTML;
        boton.disabled = true;
        
        boton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${texto}
        `;
    },
    
    /**
     * Ocultar loading spinner de un botón
     * @param {HTMLElement} boton - Botón donde ocultar el loading
     */
    ocultarLoading: function(boton) {
        if (!boton || !boton.dataset.originalContent) return;
        
        boton.innerHTML = boton.dataset.originalContent;
        boton.disabled = false;
        delete boton.dataset.originalContent;
    },
    
    /**
     * Confirmar acción con el usuario
     * @param {string} mensaje - Mensaje de confirmación
     * @returns {Promise<boolean>}
     */
    confirmar: async function(mensaje) {
        return new Promise((resolve) => {
            // Si existe SweetAlert2, usarlo
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '¿Estás seguro?',
                    text: mensaje,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, continuar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            } else {
                // Fallback a confirm nativo
                resolve(confirm(mensaje));
            }
        });
    },
    
    /**
     * Log de errores en consola (solo en desarrollo)
     * @param {string} mensaje - Mensaje a loguear
     * @param {*} datos - Datos adicionales
     */
    log: function(mensaje, datos = null) {
        // Solo mostrar en desarrollo (puedes agregar una constante DEBUG)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.group('🔍 Error Log');
            console.error(mensaje);
            if (datos) {
                console.log('Datos:', datos);
            }
            console.trace();
            console.groupEnd();
        }
    }
};

// Manejar errores no capturados globalmente
window.addEventListener('error', function(event) {
    ErrorHandler.log('Error no capturado:', {
        mensaje: event.message,
        archivo: event.filename,
        linea: event.lineno,
        columna: event.colno,
        error: event.error
    });
});

// Manejar promesas rechazadas no capturadas
window.addEventListener('unhandledrejection', function(event) {
    ErrorHandler.log('Promesa rechazada no capturada:', {
        motivo: event.reason
    });
});

// Exportar para uso global
window.ErrorHandler = ErrorHandler;

