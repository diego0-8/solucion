// Coordinador Dashboard JavaScript
console.log('Coord-dashboard.js: Script loaded successfully');

// Función para cambiar entre pestañas
function cambiarTab(tabName) {
    console.log('Coord-dashboard.js: Changing tab to:', tabName);
    
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
        console.log('Coord-dashboard.js: Tab', tabName, 'displayed');
    } else {
        console.error('Coord-dashboard.js: Tab', tabName, 'not found');
    }
    
    // Marcar la pestaña como activa
    const selectedSpan = document.querySelector(`[onclick="cambiarTab('${tabName}')"]`);
    if (selectedSpan) {
        selectedSpan.classList.add('active');
        console.log('Coord-dashboard.js: Tab', tabName, 'marked as active');
    } else {
        console.error('Coord-dashboard.js: Tab span for', tabName, 'not found');
    }
}

// Función para abrir modales
function openModal(modalId) {
    console.log('Coord-dashboard.js: Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Coord-dashboard.js: Modal', modalId, 'not found');
    }
}

// Función para cerrar modales
function closeModal(modalId) {
    console.log('Coord-dashboard.js: Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Funciones específicas para coordinadores
function refreshAsesores() {
    console.log('Coord-dashboard.js: Refreshing asesores');
    location.reload();
}

function verDetallesAsesor(cedula) {
    console.log('Coord-dashboard.js: Ver detalles asesor:', cedula);
    alert('Función de ver detalles del asesor en desarrollo. Cédula: ' + cedula);
}

function asignarClienteAsesor(cedula) {
    console.log('Coord-dashboard.js: Asignar cliente asesor:', cedula);
    alert('Función de asignar cliente al asesor en desarrollo. Cédula: ' + cedula);
}

function enviarMensaje(cedula) {
    console.log('Coord-dashboard.js: Enviar mensaje asesor:', cedula);
    alert('Función de enviar mensaje al asesor en desarrollo. Cédula: ' + cedula);
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Coord-dashboard.js: DOM loaded, initializing...');
    
    // Verificar que las pestañas estén funcionando
    const tabSpans = document.querySelectorAll('.main-tabs span');
    console.log('Coord-dashboard.js: Found', tabSpans.length, 'tab spans');
    
    // Asegurar que la pestaña activa esté visible
    const activeTab = document.querySelector('.main-tabs span.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('onclick').match(/cambiarTab\('([^']+)'\)/)[1];
        console.log('Coord-dashboard.js: Active tab:', tabName);
        cambiarTab(tabName);
    }
});
