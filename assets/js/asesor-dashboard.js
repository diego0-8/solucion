// ===============================================
// ASESOR DASHBOARD - FUNCIONALIDADES PRINCIPALES
// ===============================================

console.log('Asesor Dashboard: Script cargado correctamente');

// Variables globales
let currentTab = 'estadisticas';

// ===============================================
// GESTIÓN DE PESTAÑAS
// ===============================================

function cambiarTab(tabName) {
    console.log('Asesor Dashboard: Cambiando a pestaña:', tabName);
    
    // Ocultar todas las pestañas
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los spans
    const allTabSpans = document.querySelectorAll('.main-tabs span');
    allTabSpans.forEach(span => {
        span.classList.remove('active');
    });
    
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
    
    currentTab = tabName;
    
    // Cargar datos específicos según la pestaña
    switch(tabName) {
        case 'estadisticas':
            cargarEstadisticas();
            break;
        case 'clientes':
            cargarClientes();
            break;
        case 'tareas':
            cargarTareas();
            break;
    }
}

// ===============================================
// FUNCIONES DE MODAL
// ===============================================

function openModal(modalType) {
    console.log('Asesor Dashboard: Abriendo modal:', modalType);
    
    // Crear modal dinámico según el tipo
    let modalContent = '';
    let modalTitle = '';
    
    switch(modalType) {
        case 'buscar-cliente':
            modalTitle = 'Buscar Cliente';
            modalContent = `
                <div class="form-group">
                    <label>Buscar por:</label>
                    <select id="buscar-por" class="form-control">
                        <option value="nombre">Nombre</option>
                        <option value="identificacion">Identificación</option>
                        <option value="telefono">Teléfono</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Término de búsqueda:</label>
                    <input type="text" id="termino-busqueda" class="form-control" placeholder="Ingrese el término a buscar">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="ejecutarBusqueda()">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            `;
            break;
            
        case 'nueva-gestion':
            modalTitle = 'Nueva Gestión';
            modalContent = `
                <div class="form-group">
                    <label>Cliente:</label>
                    <select id="cliente-gestion" class="form-control">
                        <option value="">Seleccione un cliente...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo de Gestión:</label>
                    <select id="tipo-gestion" class="form-control">
                        <option value="llamada">Llamada</option>
                        <option value="email">Email</option>
                        <option value="visita">Visita</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Resultado:</label>
                    <textarea id="resultado-gestion" class="form-control" rows="3" placeholder="Describa el resultado de la gestión"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="guardarGestion()">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            `;
            break;
            
        case 'generar-reporte':
            modalTitle = 'Generar Reporte';
            modalContent = `
                <div class="form-group">
                    <label>Tipo de Reporte:</label>
                    <select id="tipo-reporte" class="form-control">
                        <option value="diario">Reporte Diario</option>
                        <option value="semanal">Reporte Semanal</option>
                        <option value="mensual">Reporte Mensual</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha Desde:</label>
                    <input type="date" id="fecha-desde" class="form-control">
                </div>
                <div class="form-group">
                    <label>Fecha Hasta:</label>
                    <input type="date" id="fecha-hasta" class="form-control">
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="generarReporte()">
                        <i class="fas fa-file-alt"></i> Generar
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            `;
            break;
            
        case 'configuracion':
            modalTitle = 'Configuración';
            modalContent = `
                <div class="form-group">
                    <label>Notificaciones:</label>
                    <div class="checkbox-group">
                        <label><input type="checkbox" id="notif-tareas"> Nuevas tareas</label>
                        <label><input type="checkbox" id="notif-clientes"> Nuevos clientes</label>
                        <label><input type="checkbox" id="notif-recordatorios"> Recordatorios</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>Zona Horaria:</label>
                    <select id="zona-horaria" class="form-control">
                        <option value="America/Bogota">Bogotá (GMT-5)</option>
                        <option value="America/Mexico_City">México (GMT-6)</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="guardarConfiguracion()">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            `;
            break;
    }
    
    // Crear y mostrar modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${modalTitle}</h3>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${modalContent}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animar entrada
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeModal() {
    console.log('Asesor Dashboard: Cerrando modal');
    
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ===============================================
// FUNCIONES DE CARGA DE DATOS
// ===============================================

function cargarEstadisticas() {
    console.log('Asesor Dashboard: Cargando estadísticas');
    
    // Simular carga de estadísticas
    mostrarAlerta('Estadísticas actualizadas', 'success');
}

function cargarClientes() {
    console.log('Asesor Dashboard: Cargando clientes');
    
    // Simular carga de clientes
    mostrarAlerta('Lista de clientes actualizada', 'info');
}

function cargarTareas() {
    console.log('Asesor Dashboard: Cargando tareas');
    
    // Simular carga de tareas
    mostrarAlerta('Lista de tareas actualizada', 'info');
}

// ===============================================
// FUNCIONES DE CLIENTES
// ===============================================

function buscarCliente() {
    console.log('Asesor Dashboard: Buscando cliente');
    openModal('buscar-cliente');
}

function ejecutarBusqueda() {
    const buscarPor = document.getElementById('buscar-por').value;
    const termino = document.getElementById('termino-busqueda').value;
    
    if (!termino.trim()) {
        mostrarAlerta('Por favor ingrese un término de búsqueda', 'warning');
        return;
    }
    
    console.log('Asesor Dashboard: Ejecutando búsqueda:', buscarPor, termino);
    
    // Simular búsqueda
    mostrarAlerta(`Buscando clientes por ${buscarPor}: ${termino}`, 'info');
    closeModal();
}

function llamarCliente(clienteId) {
    console.log('Asesor Dashboard: Llamando cliente:', clienteId);
    mostrarAlerta('Iniciando llamada al cliente...', 'info');
}

function verDetallesCliente(clienteId) {
    console.log('Asesor Dashboard: Ver detalles cliente:', clienteId);
    mostrarAlerta('Mostrando detalles del cliente...', 'info');
}

function gestionarCliente(clienteId) {
    console.log('Asesor Dashboard: Gestionar cliente:', clienteId);
    
    // Redirigir a la vista de gestión del cliente
    window.location.href = `index.php?action=asesor_gestionar&cliente_id=${clienteId}`;
}

function refreshClientes() {
    console.log('Asesor Dashboard: Actualizando clientes');
    cargarClientes();
}

// ===============================================
// FUNCIONES DE TAREAS
// ===============================================

function nuevaTarea() {
    console.log('Asesor Dashboard: Nueva tarea');
    mostrarAlerta('Funcionalidad de nueva tarea en desarrollo', 'info');
}

function iniciarTarea(tareaId) {
    console.log('Asesor Dashboard: Iniciando tarea:', tareaId);
    mostrarAlerta('Tarea iniciada correctamente', 'success');
}

function completarTarea(tareaId) {
    console.log('Asesor Dashboard: Completando tarea:', tareaId);
    mostrarAlerta('Tarea completada correctamente', 'success');
}

function verDetallesTarea(tareaId) {
    console.log('Asesor Dashboard: Ver detalles tarea:', tareaId);
    mostrarAlerta('Mostrando detalles de la tarea...', 'info');
}

function refreshTareas() {
    console.log('Asesor Dashboard: Actualizando tareas');
    cargarTareas();
}

// ===============================================
// FUNCIONES DE GESTIÓN
// ===============================================

function guardarGestion() {
    const cliente = document.getElementById('cliente-gestion').value;
    const tipo = document.getElementById('tipo-gestion').value;
    const resultado = document.getElementById('resultado-gestion').value;
    
    if (!cliente || !resultado.trim()) {
        mostrarAlerta('Por favor complete todos los campos', 'warning');
        return;
    }
    
    console.log('Asesor Dashboard: Guardando gestión:', {cliente, tipo, resultado});
    mostrarAlerta('Gestión guardada correctamente', 'success');
    closeModal();
}

function generarReporte() {
    const tipo = document.getElementById('tipo-reporte').value;
    const fechaDesde = document.getElementById('fecha-desde').value;
    const fechaHasta = document.getElementById('fecha-hasta').value;
    
    if (!fechaDesde || !fechaHasta) {
        mostrarAlerta('Por favor seleccione las fechas', 'warning');
        return;
    }
    
    console.log('Asesor Dashboard: Generando reporte:', {tipo, fechaDesde, fechaHasta});
    mostrarAlerta('Generando reporte...', 'info');
    closeModal();
}

function guardarConfiguracion() {
    console.log('Asesor Dashboard: Guardando configuración');
    mostrarAlerta('Configuración guardada correctamente', 'success');
    closeModal();
}

// ===============================================
// FUNCIONES DE UTILIDAD
// ===============================================

function mostrarAlerta(mensaje, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${mensaje}
    `;
    
    // Agregar al body
    document.body.appendChild(alerta);
    
    // Mostrar con animación
    setTimeout(() => {
        alerta.classList.add('show');
    }, 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => {
            alerta.remove();
        }, 300);
    }, 3000);
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Asesor Dashboard: Inicializando dashboard');
    
    // Cargar estadísticas por defecto
    cargarEstadisticas();
    
    // Configurar fechas por defecto para reportes
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Si hay campos de fecha, configurarlos
    setTimeout(() => {
        const fechaDesde = document.getElementById('fecha-desde');
        const fechaHasta = document.getElementById('fecha-hasta');
        
        if (fechaDesde) {
            fechaDesde.value = hace30Dias.toISOString().split('T')[0];
        }
        if (fechaHasta) {
            fechaHasta.value = hoy.toISOString().split('T')[0];
        }
    }, 100);
    
    console.log('Asesor Dashboard: Dashboard inicializado correctamente');
});

// ===============================================
// EVENTOS GLOBALES
// ===============================================

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ===============================================
// BÚSQUEDA RÁPIDA
// ===============================================

function toggleBusqueda() {
    console.log('Asesor Dashboard: Toggle búsqueda');
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    
    if (searchBar.style.display === 'none' || searchBar.style.display === '') {
        searchBar.style.display = 'block';
        searchInput.focus();
    } else {
        searchBar.style.display = 'none';
        limpiarBusqueda();
    }
}

function buscarClienteRapido(termino) {
    console.log('Asesor Dashboard: Búsqueda rápida:', termino);
    
    if (termino.length < 2) {
        limpiarResultadosBusqueda();
        return;
    }
    
    // Realizar búsqueda real en el backend
    buscarClientesBackend(termino);
}

function ejecutarBusqueda() {
    const searchInput = document.getElementById('search-input');
    const termino = searchInput.value.trim();
    
    if (termino.length >= 2) {
        buscarClienteRapido(termino);
    }
}

function limpiarBusqueda() {
    console.log('Asesor Dashboard: Limpiando búsqueda');
    const searchInput = document.getElementById('search-input');
    searchInput.value = '';
    limpiarResultadosBusqueda();
}

function buscarClientesBackend(termino) {
    console.log('Asesor Dashboard: Buscando clientes en backend:', termino);
    
    // Mostrar indicador de carga
    mostrarIndicadorCarga();
    
    // Realizar petición AJAX al backend
    return fetch('index.php?action=buscar_cliente_asesor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            termino: termino,
            criterio: 'auto' // Auto-detecta si es cédula, teléfono o nombre
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Asesor Dashboard: Respuesta del backend:', data);
        
        if (data.success) {
            mostrarResultadosBusqueda(data.clientes);
            return data.clientes; // Retornar los clientes para uso posterior
        } else {
            console.error('Error en búsqueda:', data.message);
            mostrarErrorBusqueda(data.message || 'Error al buscar clientes');
            return [];
        }
    })
    .catch(error => {
        console.error('Error en petición:', error);
        mostrarErrorBusqueda('Error de conexión al buscar clientes');
        return [];
    })
    .finally(() => {
        ocultarIndicadorCarga();
    });
}

function mostrarResultadosBusqueda(resultados) {
    console.log('mostrarResultadosBusqueda llamada con:', resultados);
    const container = document.getElementById('search-results-quick');
    
    if (!container) {
        console.error('Contenedor search-results-quick no encontrado');
        return;
    }
    
    if (!resultados || resultados.length === 0) {
        container.innerHTML = `
            <div class="no-search-results">
                <i class="fas fa-search"></i>
                <p>No se encontraron clientes</p>
                <small>Intente con otro término de búsqueda</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    resultados.forEach(cliente => {
        console.log('Procesando cliente:', cliente);
        // Campos de cliente y obligacion
        const nombreCliente = cliente['NOMBRE CONTRATANTE'] || cliente.nombre_comercio || cliente.nombre || 'Sin nombre';
        const identificacion = cliente.IDENTIFICACION || cliente.nit_cxc || cliente.identificacion || 'Sin identificación';
        const numeroObligacion = cliente['NUMERO OBLIGACION'] || cliente.numero_factura || cliente.numero_obligacion || 'Sin obligación';
        const celular = cliente.CELULAR || cliente.cel || cliente.celular || 'Sin celular';
        const email = cliente.EMAIL || cliente.email || '';
        
        const clienteId = cliente.ID_CLIENTE || cliente.id;
        
        html += `
            <div class="search-result-item">
                <div class="search-result-content">
                    <div class="search-result-name">${nombreCliente}</div>
                    <div class="search-result-details">
                        <strong>Identificación:</strong> ${identificacion}<br>
                        ${numeroObligacion && numeroObligacion !== 'Sin obligación' ? `<strong>Número de Obligación:</strong> ${numeroObligacion}<br>` : ''}
                        <strong>Celular:</strong> ${celular}
                        ${email ? `<br><strong>Email:</strong> ${email}` : ''}
                    </div>
                </div>
                <div class="search-result-actions">
                    <button class="btn-gestionar-search" onclick="gestionarCliente('${clienteId}')" title="Gestionar Cliente">
                        <i class="fas fa-edit"></i> Gestionar
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function limpiarResultadosBusqueda() {
    const container = document.getElementById('search-results-quick');
    container.innerHTML = '';
}

function mostrarIndicadorCarga() {
    const container = document.getElementById('search-results-quick');
    container.innerHTML = `
        <div class="search-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Buscando clientes...</p>
        </div>
    `;
}

function ocultarIndicadorCarga() {
    // El indicador se oculta cuando se muestran los resultados o errores
}

function mostrarErrorBusqueda(mensaje) {
    const container = document.getElementById('search-results-quick');
    container.innerHTML = `
        <div class="search-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensaje}</p>
            <small>Intente nuevamente</small>
        </div>
    `;
}

function seleccionarCliente(clienteId) {
    console.log('Asesor Dashboard: Cliente seleccionado:', clienteId);
    
    // Obtener los datos del cliente seleccionado
    const searchInput = document.getElementById('search-input');
    const termino = searchInput.value.trim();
    
    // Realizar búsqueda para obtener datos completos del cliente
    buscarClientesBackend(termino).then((clientes) => {
        // Buscar el cliente específico en los resultados
        const cliente = clientes.find(c => c.ID_CLIENTE == clienteId || c.id == clienteId);
        if (cliente) {
            mostrarInformacionCliente(cliente);
        } else {
            mostrarInformacionCliente({ ID_CLIENTE: clienteId, 'NOMBRE CONTRATANTE': 'Cliente no encontrado' });
        }
    });
}

function mostrarInformacionCliente(cliente) {
    console.log('Asesor Dashboard: Mostrando información del cliente:', cliente);
    
    // Ocultar la barra de búsqueda
    const searchBar = document.getElementById('search-bar');
    searchBar.style.display = 'none';
    
    // Limpiar búsqueda
    limpiarBusqueda();
    
    // Mostrar información del cliente en el resumen de actividad
    const resumenContainer = document.querySelector('.call-details');
    if (resumenContainer) {
        // Crear sección de información del cliente
        let clienteInfo = document.getElementById('cliente-info-seleccionado');
        if (!clienteInfo) {
            clienteInfo = document.createElement('div');
            clienteInfo.id = 'cliente-info-seleccionado';
            clienteInfo.className = 'cliente-seleccionado-info';
            clienteInfo.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            resumenContainer.appendChild(clienteInfo);
        }
        
        // Extraer datos del cliente
        const clienteId = cliente.ID_CLIENTE || cliente.id || 'N/A';
        const nombre = cliente['NOMBRE CONTRATANTE'] || cliente.nombre || 'Sin nombre';
        const identificacion = cliente.IDENTIFICACION || cliente.cedula || 'Sin identificación';
        const telefono = cliente['TEL 1'] || cliente.telefono || 'Sin teléfono';
        const estado = cliente.ESTADO || cliente.estado || 'Sin estado';
        const deuda = cliente['TOTAL CARTERA'] || cliente.deuda || 0;
        
        // Mostrar información completa del cliente
        clienteInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #007bff;">
                    <i class="fas fa-user"></i> Cliente Seleccionado
                </h4>
                <button onclick="cerrarInformacionCliente()" style="background: none; border: none; color: #6c757d; cursor: pointer; font-size: 18px; padding: 5px;">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div>
                    <p style="margin: 5px 0; color: #495057;"><strong>Nombre:</strong> ${nombre}</p>
                    <p style="margin: 5px 0; color: #495057;"><strong>ID:</strong> ${clienteId}</p>
                    <p style="margin: 5px 0; color: #495057;"><strong>Cédula:</strong> ${identificacion}</p>
                </div>
                <div>
                    <p style="margin: 5px 0; color: #495057;"><strong>Teléfono:</strong> ${telefono}</p>
                    <p style="margin: 5px 0; color: #495057;"><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">${estado}</span></p>
                    <p style="margin: 5px 0; color: #495057;"><strong>Deuda:</strong> $${new Intl.NumberFormat('es-CO').format(deuda)}</p>
                </div>
            </div>
            
            <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="gestionarClienteSeleccionado(${clienteId})" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-edit"></i> Gestionar
                </button>
                <button onclick="llamarClienteSeleccionado(${clienteId})" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-phone"></i> Llamar
                </button>
                <button onclick="verDetallesClienteSeleccionado(${clienteId})" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
                <button onclick="buscarOtroCliente()" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-search"></i> Buscar Otro
                </button>
            </div>
        `;
    }
}

function cerrarInformacionCliente() {
    const clienteInfo = document.getElementById('cliente-info-seleccionado');
    if (clienteInfo) {
        clienteInfo.remove();
    }
}

function gestionarClienteSeleccionado(clienteId) {
    console.log('Asesor Dashboard: Gestionar cliente seleccionado:', clienteId);
    // Aquí se puede abrir un modal de gestión o cambiar a la pestaña de clientes
    cambiarTab('clientes');
    mostrarAlerta(`Abriendo gestión para cliente ID: ${clienteId}`, 'info');
}

function llamarClienteSeleccionado(clienteId) {
    console.log('Asesor Dashboard: Llamar cliente seleccionado:', clienteId);
    mostrarAlerta(`Iniciando llamada al cliente ID: ${clienteId}`, 'info');
}

function verDetallesClienteSeleccionado(clienteId) {
    console.log('Asesor Dashboard: Ver detalles cliente seleccionado:', clienteId);
    mostrarAlerta(`Mostrando detalles del cliente ID: ${clienteId}`, 'info');
}

function buscarOtroCliente() {
    console.log('Asesor Dashboard: Buscar otro cliente');
    
    // Cerrar información actual
    cerrarInformacionCliente();
    
    // Mostrar barra de búsqueda
    toggleBusqueda();
}

// ===============================================
// BÚSQUEDA EN LISTA DE CLIENTES
// ===============================================

function buscarEnListaClientes(termino) {
    console.log('Asesor Dashboard: Búsqueda en lista de clientes:', termino);
    
    const tbody = document.querySelector('.clientes-table tbody');
    if (!tbody) return;
    
    const filas = tbody.querySelectorAll('tr');
    
    if (termino.length < 2) {
        // Mostrar todas las filas si el término es muy corto
        filas.forEach(fila => {
            fila.style.display = '';
        });
        return;
    }
    
    const terminoLower = termino.toLowerCase();
    
    filas.forEach(fila => {
        const textoFila = fila.textContent.toLowerCase();
        const coincide = textoFila.includes(terminoLower);
        fila.style.display = coincide ? '' : 'none';
    });
    
    // Mostrar mensaje si no hay resultados
    mostrarMensajeSinResultados(termino, filas);
}

// Función ejecutarBusquedaClientes() está en asesor-clientes.js

// ========================================
// FUNCIONES PARA BASES DE CLIENTES
// ========================================

// Cargar bases de clientes disponibles cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Asesor Dashboard: Cargando bases de clientes...');
    cargarBasesAcceso();
});

function cargarBasesAcceso() {
    console.log('Asesor Dashboard: cargarBasesAcceso() llamada');
    
    // Hacer petición AJAX para obtener bases de clientes
    fetch('index.php?action=obtener_bases_acceso')
        .then(response => {
            console.log('Asesor Dashboard: Respuesta de bases recibida:', response.status, response.statusText);
            console.log('Asesor Dashboard: Content-Type:', response.headers.get('content-type'));
            
            // Verificar que la respuesta sea JSON
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/json')) {
                // Si no es JSON, leer como texto para ver qué se recibió
                return response.text().then(text => {
                    console.error('Asesor Dashboard: Respuesta no es JSON:', text.substring(0, 200));
                    throw new Error('Respuesta del servidor no es JSON válido. Ver consola para detalles.');
                });
            }
            
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Asesor Dashboard: Error HTTP:', text.substring(0, 200));
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                });
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Asesor Dashboard: Datos de bases recibidos:', data);
            
            if (data.success) {
                console.log('Asesor Dashboard: Bases obtenidas:', data.bases);
                mostrarBasesAcceso(data.bases);
            } else {
                console.error('Asesor Dashboard: Error al cargar bases:', data.message);
                mostrarErrorBases('Error al cargar bases: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Asesor Dashboard: Error en la petición de bases:', error);
            mostrarErrorBases('Error de conexión al cargar bases: ' + error.message);
        });
}

function mostrarBasesAcceso(bases) {
    const container = document.getElementById('bases-lista');
    
    if (!container) {
        console.error('Asesor Dashboard: No se encontró el contenedor de bases');
        return;
    }
    
    if (bases.length === 0) {
        container.innerHTML = `
            <div style="padding: 15px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; text-align: center;">
                <i class="fas fa-info-circle" style="color: #856404;"></i>
                <p style="margin: 5px 0 0 0; color: #856404; font-size: 13px;">
                    No tiene acceso a ninguna base de clientes
                </p>
            </div>
        `;
        return;
    }
    
    // Generar HTML de las bases
    let html = '';
    
    bases.forEach((base, index) => {
        html += `
            <div class="base-item" style="padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff; border-radius: 4px;">
                <span style="font-weight: 600; color: #333;">
                    <i class="fas fa-database" style="color: #007bff;"></i> ${base.nombre_base || base.NOMBRE_BASE || 'Base sin nombre'}
                </span>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    ${base.total_clientes || 0} clientes
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function mostrarErrorBases(mensaje) {
    const container = document.getElementById('bases-lista');
    
    if (!container) {
        console.error('Asesor Dashboard: No se encontró el contenedor de bases (error)');
        return;
    }
    
    container.innerHTML = `
        <div style="padding: 15px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">
            <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>
            <p style="margin: 5px 0 0 0; color: #856404; font-size: 13px;">${mensaje}</p>
        </div>
    `;
}

// Función limpiarBusquedaClientes() está en asesor-clientes.js

// Función mostrarMensajeSinResultados() está en asesor-clientes.js
