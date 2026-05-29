/**
 * Coord Export JavaScript
 * Funcionalidad simplificada para la vista de exporte de reportes del coordinador
 */

console.log('Coord_export.js: Script loaded successfully');

// Variable global para rango de fechas seleccionado
let rangoSeleccionado = 'hoy';

function mostrarAlerta(tipo, mensaje) {
    if (typeof alert === 'function') alert(mensaje);
}
let fechaInicio = null;
let fechaFin = null;

// Variables globales para TMO
let rangoSeleccionadoTMO = 'hoy';
let fechaInicioTMO = null;
let fechaFinTMO = null;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Coord_export.js: DOM loaded, initializing...');
    
    // Configurar fecha por defecto (hoy)
    seleccionarRango('hoy');
    seleccionarRangoTMO('hoy');
    
    // Marcar botón "Hoy" como seleccionado por defecto
    setTimeout(() => {
        const btnHoy = document.getElementById('btn-hoy');
        if (btnHoy) {
            btnHoy.style.background = '#6c757d';
            btnHoy.style.boxShadow = '0 2px 8px rgba(108,117,125,0.4)';
        }
    }, 100);
    
    console.log('Coord_export.js: Initialization complete');
});

// =========================================
// FUNCIONES DE NAVEGACIÓN DE PESTAÑAS
// =========================================

function cambiarTab(tabName) {
    console.log('Coord_export.js: Changing tab to:', tabName);
    
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remover clase active de todos los spans
    const tabSpans = document.querySelectorAll('.main-tabs span');
    tabSpans.forEach(span => span.classList.remove('active'));
    
    // Mostrar la pestaña seleccionada
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activar el span correspondiente
    const selectedSpan = document.querySelector(`[onclick="cambiarTab('${tabName}')"]`);
    if (selectedSpan) {
        selectedSpan.classList.add('active');
    }
}

// =========================================
// FUNCIONES DE SELECCIÓN DE RANGO DE FECHAS
// =========================================

function seleccionarRango(rango) {
    console.log('Coord_export.js: Selecting date range:', rango);
    
    rangoSeleccionado = rango;
    
    // Obtener fechas según el rango
    const hoy = new Date();
    let inicio, fin;
    
    switch(rango) {
        case 'hoy':
            inicio = new Date(hoy);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy);
            fin.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            const primerDiaSemana = new Date(hoy);
            primerDiaSemana.setDate(hoy.getDate() - hoy.getDay());
            primerDiaSemana.setHours(0, 0, 0, 0);
            
            const ultimoDiaSemana = new Date(primerDiaSemana);
            ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);
            ultimoDiaSemana.setHours(23, 59, 59, 999);
            
            inicio = primerDiaSemana;
            fin = ultimoDiaSemana;
            break;
        case 'mes':
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            fin.setHours(23, 59, 59, 999);
            break;
        case 'personalizado':
            // Mostrar campos de fecha
            const fields = document.getElementById('date-range-fields');
            if (fields) {
                fields.style.display = 'flex';
            }
            return;
        default:
            inicio = new Date(hoy);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy);
            fin.setHours(23, 59, 59, 999);
    }
    
    // Guardar fechas
    fechaInicio = inicio.toISOString().split('T')[0];
    fechaFin = fin.toISOString().split('T')[0];
    
    // Ocultar campos personalizados si no es personalizado
    if (rango !== 'personalizado') {
        const fields = document.getElementById('date-range-fields');
        if (fields) {
            fields.style.display = 'none';
        }
    }
    
    // Actualizar estilos de botones (cambiar color y sombra)
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        if (btn.id.startsWith('btn-')) {
            const btnType = btn.id.replace('btn-', '');
            if (btnType === rango) {
                // Botón activo - gris
                btn.style.background = '#6c757d';
                btn.style.boxShadow = '0 2px 8px rgba(108,117,125,0.4)';
            } else if (btnType === 'personalizado') {
                // Botón personalizado - cyan
                btn.style.background = '#17a2b8';
                btn.style.boxShadow = '0 2px 8px rgba(23,162,184,0.3)';
            } else {
                // Botones normales - azul
                btn.style.background = '#007bff';
                btn.style.boxShadow = 'none';
            }
        }
    });
    
    console.log('Coord_export.js: Date range set:', fechaInicio, 'to', fechaFin);
}

// =========================================
// FUNCIÓN DE GENERACIÓN DE REPORTE
// =========================================

function generarReporte() {
    console.log('Coord_export.js: Generating report...');
    
    // Obtener fechas
    let inicio, fin;
    
    if (rangoSeleccionado === 'personalizado') {
        inicio = document.getElementById('fecha-inicio').value;
        fin = document.getElementById('fecha-fin').value;
        
        if (!inicio || !fin) {
            mostrarAlerta('warning', 'Debe seleccionar ambas fechas para el rango personalizado.');
            return;
        }
    } else {
        inicio = fechaInicio;
        fin = fechaFin;
    }
    
    console.log('Coord_export.js: Date range:', inicio, 'to', fin);
    
    // Validar fechas
    if (!inicio || !fin) {
        alert('Debe seleccionar un rango de fechas.');
        return;
    }
    
    if (new Date(inicio) > new Date(fin)) {
        alert('La fecha de inicio no puede ser mayor a la fecha de fin.');
        return;
    }
    
    // Descargar el reporte directamente sin alert
    window.location.href = `index.php?action=generar_reporte_gestiones&fecha_inicio=${inicio}&fecha_fin=${fin}`;
}

// =========================================
// FUNCIONES PARA PESTAÑA TMO
// =========================================

function seleccionarRangoTMO(rango) {
    console.log('Coord_export.js: Selecting TMO date range:', rango);
    
    rangoSeleccionadoTMO = rango;
    
    // Obtener fechas según el rango
    const hoy = new Date();
    let inicio, fin;
    
    switch(rango) {
        case 'hoy':
            inicio = new Date(hoy);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy);
            fin.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            const primerDiaSemana = new Date(hoy);
            primerDiaSemana.setDate(hoy.getDate() - hoy.getDay());
            primerDiaSemana.setHours(0, 0, 0, 0);
            
            const ultimoDiaSemana = new Date(primerDiaSemana);
            ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);
            ultimoDiaSemana.setHours(23, 59, 59, 999);
            
            inicio = primerDiaSemana;
            fin = ultimoDiaSemana;
            break;
        case 'mes':
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
            fin.setHours(23, 59, 59, 999);
            break;
        case 'personalizado':
            // Mostrar campos de fecha
            const fields = document.getElementById('tmo-date-range-fields');
            if (fields) {
                fields.style.display = 'flex';
            }
            return;
        default:
            inicio = new Date(hoy);
            inicio.setHours(0, 0, 0, 0);
            fin = new Date(hoy);
            fin.setHours(23, 59, 59, 999);
    }
    
    // Guardar fechas
    fechaInicioTMO = inicio.toISOString().split('T')[0];
    fechaFinTMO = fin.toISOString().split('T')[0];
    
    // Ocultar campos personalizados si no es personalizado
    if (rango !== 'personalizado') {
        const fields = document.getElementById('tmo-date-range-fields');
        if (fields) {
            fields.style.display = 'none';
        }
    }
    
    // Actualizar estilos de botones
    document.querySelectorAll('[id^="btn-tmo-"]').forEach(btn => {
        if (btn.id.startsWith('btn-tmo-')) {
            const btnType = btn.id.replace('btn-tmo-', '');
            if (btnType === rango) {
                // Botón activo - gris
                btn.style.background = '#6c757d';
                btn.style.boxShadow = '0 2px 8px rgba(108,117,125,0.4)';
            } else if (btnType === 'personalizado') {
                // Botón personalizado - cyan
                btn.style.background = '#17a2b8';
                btn.style.boxShadow = '0 2px 8px rgba(23,162,184,0.3)';
            } else {
                // Botones normales - azul
                btn.style.background = '#007bff';
                btn.style.boxShadow = 'none';
            }
        }
    });
    
    console.log('Coord_export.js: TMO Date range set:', fechaInicioTMO, 'to', fechaFinTMO);
}

function generarReporteTMO() {
    console.log('Coord_export.js: Generating TMO report...');
    
    // Obtener fechas
    let inicio, fin;
    
    if (rangoSeleccionadoTMO === 'personalizado') {
        inicio = document.getElementById('tmo-fecha-inicio').value;
        fin = document.getElementById('tmo-fecha-fin').value;
        
        if (!inicio || !fin) {
            alert('Debe seleccionar ambas fechas para el rango personalizado.');
            return;
        }
    } else {
        inicio = fechaInicioTMO;
        fin = fechaFinTMO;
    }
    
    console.log('Coord_export.js: TMO Date range:', inicio, 'to', fin);
    
    // Validar fechas
    if (!inicio || !fin) {
        alert('Debe seleccionar un rango de fechas.');
        return;
    }
    
    if (new Date(inicio) > new Date(fin)) {
        alert('La fecha de inicio no puede ser mayor a la fecha de fin.');
        return;
    }
    
    // Generar y descargar reporte TMO desde la tabla tiempos (asesores del coordinador)
    fetch('index.php?action=generar_reporte_tmo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_inicio: inicio, fecha_fin: fin })
    })
    .then(async response => {
        const ct = response.headers.get('Content-Type') || '';
        if (ct.includes('text/csv')) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_tmo_${inicio}_a_${fin}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            return;
        }
        let data = null;
        try { data = await response.json(); } catch (e) {}
        const msg = data && data.message ? data.message : 'No se pudo generar el reporte TMO';
        alert('Error al generar reporte: ' + msg);
    })
    .catch(err => {
        console.error('Coord_export.js: Error generating TMO report', err);
        alert('Error de conexión al generar reporte TMO');
    });
}

console.log('Coord_export.js: Script initialized successfully');