/**
 * JavaScript para el Dashboard de Administrador
 * Funciones comunes para el dashboard
 */

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${mensaje}</span>
        </div>
        <button class="notificacion-cerrar" onclick="cerrarNotificacion(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Agregar estilos si no existen
    if (!document.getElementById('notificacion-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notificacion-styles';
        styles.textContent = `
            .notificacion {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 15px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                min-width: 300px;
                animation: slideIn 0.3s ease-out;
            }
            .notificacion-success {
                border-left: 4px solid #28a745;
            }
            .notificacion-error {
                border-left: 4px solid #dc3545;
            }
            .notificacion-info {
                border-left: 4px solid #17a2b8;
            }
            .notificacion-contenido {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .notificacion-cerrar {
                background: none;
                border: none;
                color: #6c757d;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            }
            .notificacion-cerrar:hover {
                background: #f8f9fa;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Agregar al DOM
    document.body.appendChild(notificacion);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 5000);
}

// Función para cerrar notificaciones
function cerrarNotificacion(boton) {
    const notificacion = boton.closest('.notificacion');
    if (notificacion) {
        notificacion.remove();
    }
}

// Función para confirmar acciones
function confirmarAccion(mensaje, callback) {
    if (confirm(mensaje)) {
        callback();
    }
}

// Función para mostrar loading
function mostrarLoading(elemento) {
    if (typeof elemento === 'string') {
        elemento = document.querySelector(elemento);
    }
    
    if (elemento) {
        elemento.style.position = 'relative';
        elemento.style.pointerEvents = 'none';
        
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Cargando...</span>
            </div>
        `;
        
        // Agregar estilos si no existen
        if (!document.getElementById('loading-styles')) {
            const styles = document.createElement('style');
            styles.id = 'loading-styles';
            styles.textContent = `
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    color: #007bff;
                }
                .loading-spinner i {
                    font-size: 24px;
                }
            `;
            document.head.appendChild(styles);
        }
        
        elemento.appendChild(loading);
    }
}

// Función para ocultar loading
function ocultarLoading(elemento) {
    if (typeof elemento === 'string') {
        elemento = document.querySelector(elemento);
    }
    
    if (elemento) {
        const loading = elemento.querySelector('.loading-overlay');
        if (loading) {
            loading.remove();
        }
        elemento.style.pointerEvents = 'auto';
    }
}

// Función para hacer peticiones AJAX
function hacerPeticion(url, opciones = {}) {
    const config = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        ...opciones
    };
    
    return fetch(url, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error en la petición:', error);
            mostrarNotificacion('Error en la comunicación con el servidor', 'error');
            throw error;
        });
}

// Función para formatear fechas
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para validar formularios
function validarFormulario(formulario) {
    const campos = formulario.querySelectorAll('[required]');
    let valido = true;
    
    campos.forEach(campo => {
        if (!campo.value.trim()) {
            campo.classList.add('error');
            valido = false;
        } else {
            campo.classList.remove('error');
        }
    });
    
    return valido;
}

// Función para limpiar formularios
function limpiarFormulario(formulario) {
    if (typeof formulario === 'string') {
        formulario = document.querySelector(formulario);
    }
    
    if (formulario) {
        formulario.reset();
        const campos = formulario.querySelectorAll('.error');
        campos.forEach(campo => campo.classList.remove('error'));
    }
}

// Función para actualizar contadores
function actualizarContador(selector, valor) {
    const elemento = document.querySelector(selector);
    if (elemento) {
        elemento.textContent = valor;
    }
}

// Función para alternar visibilidad de elementos
function alternarVisibilidad(selector) {
    const elemento = document.querySelector(selector);
    if (elemento) {
        elemento.style.display = elemento.style.display === 'none' ? 'block' : 'none';
    }
}

// Función para copiar al portapapeles
function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        mostrarNotificacion('Texto copiado al portapapeles', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarNotificacion('Error al copiar texto', 'error');
    });
}

// Función para exportar datos
function exportarDatos(datos, nombreArchivo = 'datos') {
    const csv = convertirACSV(datos);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${nombreArchivo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Función para convertir datos a CSV
function convertirACSV(datos) {
    if (!Array.isArray(datos) || datos.length === 0) return '';
    
    const headers = Object.keys(datos[0]);
    const csvContent = [
        headers.join(','),
        ...datos.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

// Función para inicializar tooltips (con try/catch para no bloquear el resto si falla)
function inicializarTooltips() {
    try {
        const elementos = document.querySelectorAll('[title]');
        var list = elementos;
        if (list && (typeof list.forEach === 'function')) {
            list.forEach(function(elemento) {
                elemento.addEventListener('mouseenter', function() {
                    var tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = this.getAttribute('title');
                    tooltip.style.cssText = 'position:absolute;background:#333;color:white;padding:5px 10px;border-radius:4px;font-size:12px;z-index:1000;pointer-events:none;';
                    document.body.appendChild(tooltip);
                    var rect = this.getBoundingClientRect();
                    tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
                    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
                    this._tooltip = tooltip;
                });
                elemento.addEventListener('mouseleave', function() {
                    if (this._tooltip) {
                        this._tooltip.remove();
                        this._tooltip = null;
                    }
                });
            });
        }
    } catch (e) {
        console.warn('admin-dashboard: inicializarTooltips:', e);
    }
}

// ----- Pestañas del dashboard (usuarios, asignaciones, clientes, actividad) -----
function cambiarTab(tabName) {
    var tabContents = document.querySelectorAll('.content-sections .tab-content');
    if (tabContents && tabContents.length) {
        for (var i = 0; i < tabContents.length; i++) {
            tabContents[i].style.display = 'none';
            tabContents[i].classList.remove('active');
        }
    }
    var tabBtns = document.querySelectorAll('.main-tabs .tab-btn');
    if (tabBtns && tabBtns.length) {
        for (var j = 0; j < tabBtns.length; j++) {
            tabBtns[j].classList.remove('active');
        }
    }
    var selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    var selectedBtn = document.querySelector('.main-tabs .tab-btn[data-tab="' + tabName + '"]');
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

function initTabsDashboard() {
    var mainTabs = document.querySelector('.main-tabs');
    if (!mainTabs) return;
    mainTabs.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest ? e.target.closest('.tab-btn') : null;
        if (!btn) {
            var target = e.target;
            while (target && target !== mainTabs) {
                if (target.classList && target.classList.contains('tab-btn')) {
                    btn = target;
                    break;
                }
                target = target.parentElement;
            }
        }
        if (btn && btn.getAttribute && btn.getAttribute('data-tab')) {
            cambiarTab(btn.getAttribute('data-tab'));
        }
    });
}

function initDashboard() {
    try {
        inicializarTooltips();
    } catch (e) {
        console.warn('admin-dashboard: tooltips', e);
    }
    try {
        var style = document.createElement('style');
        style.textContent = '.error{border-color:#dc3545 !important;box-shadow:0 0 0 0.2rem rgba(220,53,69,0.25) !important;}';
        document.head.appendChild(style);
    } catch (e) {}
    initTabsDashboard();
}

// Inicializar cuando el DOM esté listo (o ya si el script se cargó tarde)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Función para mostrar alertas (compatible con admin.js)
function mostrarAlerta(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

// Función para mostrar alertas específicas por formulario
function mostrarAlertaGeneral(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

function mostrarAlertaAsignar(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

function mostrarAlertaCargar(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

function mostrarAlertaReporte(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

function mostrarAlertaEditar(mensaje, tipo) {
    mostrarNotificacion(mensaje, tipo);
}

// Función para abrir modales
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Función para cerrar modales
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Exportar funciones para uso global
window.mostrarNotificacion = mostrarNotificacion;
window.cerrarNotificacion = cerrarNotificacion;
window.confirmarAccion = confirmarAccion;
window.mostrarLoading = mostrarLoading;
window.ocultarLoading = ocultarLoading;
window.hacerPeticion = hacerPeticion;
window.formatearFecha = formatearFecha;
window.validarFormulario = validarFormulario;
window.limpiarFormulario = limpiarFormulario;
window.actualizarContador = actualizarContador;
window.alternarVisibilidad = alternarVisibilidad;
window.copiarAlPortapapeles = copiarAlPortapapeles;
window.exportarDatos = exportarDatos;
window.mostrarAlerta = mostrarAlerta;
window.mostrarAlertaGeneral = mostrarAlertaGeneral;
window.mostrarAlertaAsignar = mostrarAlertaAsignar;
window.mostrarAlertaCargar = mostrarAlertaCargar;
window.mostrarAlertaReporte = mostrarAlertaReporte;
window.mostrarAlertaEditar = mostrarAlertaEditar;
window.openModal = openModal;
window.closeModal = closeModal;
window.cambiarTab = cambiarTab;
window.initTabsDashboard = initTabsDashboard;
