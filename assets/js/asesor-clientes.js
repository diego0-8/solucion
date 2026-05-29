// ========================================
// ASESOR CLIENTES - JavaScript
// ========================================

console.log('Asesor_clientes.js: Script loaded successfully');

// Variables globales
let clientesData = [];
let clientesFiltrados = [];
let paginaActual = 1;
const clientesPorPagina = 10;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Asesor_clientes.js: DOM loaded, initializing...');
    
    // Inicializar datos
    inicializarDatos();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Aplicar filtros iniciales
    aplicarFiltros();
    
    console.log('Asesor_clientes.js: Initialization complete');
});

// ========================================
// FUNCIÓN DE CAMBIO DE PESTAÑAS
// ========================================

function cambiarTab(tabName) {
    console.log('Asesor_clientes.js: Changing tab to:', tabName);
    
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los spans de pestañas
    const tabSpans = document.querySelectorAll('.main-tabs span');
    tabSpans.forEach(span => {
        span.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activar el span correspondiente
    const selectedSpan = document.querySelector(`.main-tabs span[onclick="cambiarTab('${tabName}')"]`);
    if (selectedSpan) {
        selectedSpan.classList.add('active');
    }
    
    // Ejecutar acciones específicas por pestaña
    switch(tabName) {
        case 'clientes':
            console.log('Asesor_clientes.js: Clients tab activated');
            actualizarTabla();
            break;
        case 'buscar':
            console.log('Asesor_clientes.js: Search tab activated');
            // Inicializar búsqueda si es necesario
            break;
        case 'filtros':
            console.log('Asesor_clientes.js: Filters tab activated');
            break;
    }
}

// ========================================
// FUNCIONES DE INICIALIZACIÓN
// ========================================

function inicializarDatos() {
    console.log('Asesor_clientes.js: Initializing client data...');
    
    // Obtener datos de clientes del PHP
    const clientesTable = document.querySelector('.clientes-table tbody');
    if (clientesTable) {
        const filas = clientesTable.querySelectorAll('tr[data-cliente-id]');
        clientesData = Array.from(filas).map(fila => {
            const clienteId = fila.getAttribute('data-cliente-id');
            const nombre = fila.querySelector('h4')?.textContent || '';
            const identificacion = fila.querySelector('.identification')?.textContent || '';
            const telefono = fila.querySelector('.phone-number')?.textContent || '';
            const estado = fila.querySelector('.estado-badge')?.textContent?.trim() || '';
            const deuda = fila.querySelector('.debt-value')?.textContent || '';
            const ultimaGestion = fila.querySelector('.last-activity')?.textContent || '';
            
            return {
                id: clienteId,
                nombre: nombre,
                identificacion: identificacion,
                telefono: telefono,
                estado: estado,
                deuda: deuda,
                ultimaGestion: ultimaGestion,
                elemento: fila
            };
        });
        
        console.log(`Asesor_clientes.js: Loaded ${clientesData.length} clients`);
    }
    
    clientesFiltrados = [...clientesData];
}

function configurarEventListeners() {
    console.log('Asesor_clientes.js: Setting up event listeners...');
    
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('search-cliente');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('Asesor_clientes.js: Search input changed:', this.value);
            aplicarFiltros();
        });
    }
}

// ========================================
// FUNCIONES DE FILTRADO Y BÚSQUEDA
// ========================================

function aplicarFiltros() {
    console.log('Asesor_clientes.js: Applying filters...');
    
    const searchTerm = document.getElementById('search-cliente-filtros')?.value.toLowerCase() || '';
    const estado = document.getElementById('filter-estado')?.value || '';
    const contactado = document.getElementById('filter-contactado')?.value || '';
    const nivel2 = document.getElementById('filter-nivel2')?.value || '';
    const sortBy = document.getElementById('sort-by')?.value || 'nombre';
    
    console.log('Asesor_clientes.js: Filter parameters:', {
        searchTerm,
        estado,
        contactado,
        nivel2,
        sortBy
    });
    
    clientesFiltrados = clientesData.filter(cliente => {
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            cliente.nombre.toLowerCase().includes(searchTerm) ||
            cliente.identificacion.toLowerCase().includes(searchTerm) ||
            cliente.telefono.includes(searchTerm);
        
        // Filtro de estado
        const matchesEstado = !estado || cliente.estado === estado;
        
        // Filtro de contactado
        const matchesContactado = !contactado || 
            (contactado === 'contactado' && cliente.nivel1_tipo === '1') ||
            (contactado === 'no_contactado' && cliente.nivel1_tipo === '2');
        
        // Filtro de nivel 2 (clasificación de tipificación)
        const matchesNivel2 = !nivel2 || cliente.nivel2_clasificacion === nivel2;
        
        return matchesSearch && matchesEstado && matchesContactado && matchesNivel2;
    });
    
    // Ordenar los resultados
    clientesFiltrados.sort((a, b) => {
        switch (sortBy) {
            case 'nombre':
                return a.nombre.localeCompare(b.nombre);
            case 'deuda':
                const deudaA = parseFloat(a.deuda.replace(/[$,]/g, '')) || 0;
                const deudaB = parseFloat(b.deuda.replace(/[$,]/g, '')) || 0;
                return deudaB - deudaA;
            case 'estado':
                return a.estado.localeCompare(b.estado);
            case 'fecha':
                return new Date(b.ultima_gestion) - new Date(a.ultima_gestion);
            case 'contactado':
                return (a.contactado || 'no').localeCompare(b.contactado || 'no');
            default:
                return 0;
        }
    });
    
    console.log(`Asesor_clientes.js: Found ${clientesFiltrados.length} clients matching filters`);
    
    // Actualizar visualización según la pestaña activa
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab-clientes') {
        actualizarTabla();
    } else if (activeTab && activeTab.id === 'tab-buscar') {
        mostrarResultadosBusqueda();
    }
    
    actualizarEstadisticas();
}

function evaluarRangoDeuda(valorDeuda, rango) {
    // Extraer número del valor de deuda (remover $ y comas)
    const numero = parseFloat(valorDeuda.replace(/[$,]/g, ''));
    
    switch (rango) {
        case '0-100000':
            return numero >= 0 && numero <= 100000;
        case '100000-500000':
            return numero > 100000 && numero <= 500000;
        case '500000-1000000':
            return numero > 500000 && numero <= 1000000;
        case '1000000+':
            return numero > 1000000;
        default:
            return true;
    }
}

function limpiarFiltros() {
    console.log('Asesor_clientes.js: Clearing filters...');
    
    // Limpiar todos los campos de filtro
    const searchInput = document.getElementById('search-cliente-filtros');
    if (searchInput) searchInput.value = '';
    
    const estadoSelect = document.getElementById('filter-estado');
    if (estadoSelect) estadoSelect.value = '';
    
    const contactadoSelect = document.getElementById('filter-contactado');
    if (contactadoSelect) {
        contactadoSelect.value = '';
        // Actualizar el nivel 2 cuando se limpia
        actualizarFiltroNivel2('');
    }
    
    const nivel2Select = document.getElementById('filter-nivel2');
    if (nivel2Select) nivel2Select.value = '';
    
    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) sortBySelect.value = 'nombre';
    
    // Volver a aplicar filtros (que mostrará todos los clientes)
    aplicarFiltros();
}

function actualizarTabla() {
    console.log('Asesor_clientes.js: Updating table display...');
    
    const tbody = document.querySelector('.clientes-table tbody');
    if (!tbody) return;
    
    // Ocultar todas las filas de datos
    const filasDatos = tbody.querySelectorAll('tr[data-cliente-id]');
    filasDatos.forEach(fila => {
        fila.style.display = 'none';
    });
    
    // Mostrar solo las filas filtradas
    clientesFiltrados.forEach(cliente => {
        if (cliente.elemento) {
            cliente.elemento.style.display = '';
        }
    });
    
    // Mostrar mensaje si no hay resultados
    const noDataRow = tbody.querySelector('tr:not([data-cliente-id])');
    if (clientesFiltrados.length === 0) {
        if (noDataRow) {
            noDataRow.style.display = '';
        }
    } else {
        if (noDataRow) {
            noDataRow.style.display = 'none';
        }
    }
}

function actualizarEstadisticas() {
    console.log('Asesor_clientes.js: Updating statistics...');
    
    const totalClientes = clientesFiltrados.length;
    const clientesActivos = clientesFiltrados.filter(c => 
        c.estado.toLowerCase().includes('activo')).length;
    
    // Actualizar números en las tarjetas de estadísticas
    const statCards = document.querySelectorAll('.stat-card .number');
    if (statCards.length >= 2) {
        statCards[0].textContent = totalClientes;
        statCards[1].textContent = clientesActivos;
    }
}

function mostrarResultadosBusquedaClientes() {
    console.log('Asesor_clientes.js: Showing search results...');
    
    const resultsBody = document.getElementById('search-results-body');
    if (!resultsBody) return;
    
    if (clientesFiltrados.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron resultados</p>
                    <small>Intente con otros criterios de búsqueda</small>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    clientesFiltrados.forEach(cliente => {
        html += `
            <tr data-cliente-id="${cliente.id}">
                <td>
                    <div class="user-info">
                        <div class="user-details">
                            <strong>${cliente.nombre}</strong>
                            <small>ID: ${cliente.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="identification">${cliente.identificacion}</span>
                </td>
                <td>
                    <span class="phone-number">${cliente.telefono}</span>
                </td>
                <td>
                    <span class="estado-badge estado-${cliente.estado.toLowerCase()}">
                        <i class="fas fa-circle"></i>
                        ${cliente.estado}
                    </span>
                </td>
                <td>
                    <span class="debt-value">${cliente.deuda}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-call" onclick="llamarCliente('${cliente.id}')" title="Llamar Cliente">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="btn-action btn-details" onclick="verDetallesCliente('${cliente.id}')" title="Ver Detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="gestionarCliente('${cliente.id}')" title="Gestionar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    resultsBody.innerHTML = html;
    console.log(`Asesor_clientes.js: Displayed ${clientesFiltrados.length} search results`);
}

// ========================================
// FUNCIONES DE ACCIONES DE CLIENTES
// ========================================

function buscarCliente() {
    console.log('Asesor_clientes.js: Opening client search modal...');
    
    // Crear modal de búsqueda
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-search"></i> Buscar Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Buscar por:</label>
                    <select id="search-type">
                        <option value="nombre">Nombre</option>
                        <option value="identificacion">Cédula</option>
                        <option value="telefono">Teléfono</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Término de búsqueda:</label>
                    <input type="text" id="search-term" placeholder="Ingrese el término a buscar...">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="ejecutarBusquedaModal()">
                    <i class="fas fa-search"></i> Buscar
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar búsqueda en tiempo real
    const searchTerm = document.getElementById('search-term');
    if (searchTerm) {
        searchTerm.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            const type = document.getElementById('search-type').value;
            
            if (term.length >= 2) {
                const resultados = clientesData.filter(cliente => {
                    switch (type) {
                        case 'nombre':
                            return cliente.nombre.toLowerCase().includes(term);
                        case 'identificacion':
                            return cliente.identificacion.includes(term);
                        case 'telefono':
                            return cliente.telefono.includes(term);
                        default:
                            return true;
                    }
                });
                
                console.log(`Asesor_clientes.js: Found ${resultados.length} results for "${term}"`);
            }
        });
    }
}

// Función ejecutarBusqueda() está en asesor-dashboard.js para el resumen de actividad

function ejecutarBusquedaModal() {
    const searchTerm = document.getElementById('search-term');
    const searchType = document.getElementById('search-type');
    
    if (!searchTerm || !searchType) {
        console.error('Asesor_clientes.js: Modal search elements not found');
        return;
    }
    
    const termino = searchTerm.value.trim();
    const tipo = searchType.value;
    
    console.log('Asesor_clientes.js: Executing modal search:', { termino, tipo });
    
    if (termino.length < 2) {
        mostrarAlerta('Por favor ingrese al menos 2 caracteres para buscar', 'warning');
        return;
    }
    
    // Aplicar filtro de búsqueda en la tabla
    buscarEnListaClientes(termino);
    
    // Cerrar modal
    closeModal();
}

function ejecutarBusquedaClientes() {
    const searchInput = document.getElementById('clientes-search-input');
    if (!searchInput) {
        console.error('Asesor_clientes.js: clientes search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    
    console.log('Asesor_clientes.js: Executing clientes search:', searchTerm);
    
    if (searchTerm.length >= 2) {
        buscarEnListaClientes(searchTerm);
    } else {
        // Mostrar todas las filas si el término es muy corto
        const tbody = document.querySelector('.clientes-table tbody');
        if (tbody) {
            const filas = tbody.querySelectorAll('tr');
            filas.forEach(fila => {
                fila.style.display = '';
            });
        }
    }
}

function limpiarBusquedaClientes() {
    console.log('Asesor_clientes.js: Clearing clientes search');
    
    const searchInput = document.getElementById('clientes-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Mostrar todas las filas
    const tbody = document.querySelector('.clientes-table tbody');
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            fila.style.display = '';
        });
    }
    
    // Ocultar mensaje de sin resultados
    const mensajeSinResultados = document.getElementById('mensaje-sin-resultados');
    if (mensajeSinResultados) {
        mensajeSinResultados.remove();
    }
}

function buscarEnListaClientes(termino) {
    console.log('Asesor_clientes.js: Searching in client list:', termino);
    
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

function mostrarMensajeSinResultados(termino, filas) {
    // Remover mensaje anterior si existe
    const mensajeAnterior = document.getElementById('mensaje-sin-resultados');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
    }
    
    // Contar filas visibles
    const filasVisibles = Array.from(filas).filter(fila => fila.style.display !== 'none');
    
    if (filasVisibles.length === 0 && termino.length >= 2) {
        // Crear mensaje de sin resultados
        const mensaje = document.createElement('tr');
        mensaje.id = 'mensaje-sin-resultados';
        mensaje.innerHTML = `
            <td colspan="7" class="no-data">
                <i class="fas fa-search"></i>
                <p>No se encontraron clientes con "${termino}"</p>
                <small>Intente con otro término de búsqueda</small>
            </td>
        `;
        
        // Insertar mensaje al final de la tabla
        const tbody = document.querySelector('.clientes-table tbody');
        if (tbody) {
            tbody.appendChild(mensaje);
        }
    }
}

function llamarCliente(clienteId) {
    console.log('Asesor_clientes.js: Calling client:', clienteId);
    
    // Buscar datos del cliente
    const cliente = clientesData.find(c => c.id === clienteId);
    if (!cliente) {
        mostrarAlerta('Cliente no encontrado', 'error');
        return;
    }
    
    // Crear modal de llamada
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-phone"></i> Llamar Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="client-call-info">
                    <h4>${cliente.nombre}</h4>
                    <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                    <p><strong>Identificación:</strong> ${cliente.identificacion}</p>
                    <p><strong>Deuda:</strong> ${cliente.deuda}</p>
                </div>
                <div class="form-group">
                    <label>Motivo de la llamada:</label>
                    <select id="call-reason">
                        <option value="cobro">Cobro de cartera</option>
                        <option value="recordatorio">Recordatorio de pago</option>
                        <option value="negociacion">Negociación</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notas:</label>
                    <textarea id="call-notes" placeholder="Agregar notas sobre la llamada..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-success" onclick="iniciarLlamada('${clienteId}')">
                    <i class="fas fa-phone"></i> Iniciar Llamada
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function iniciarLlamada(clienteId) {
    const motivo = document.getElementById('call-reason').value;
    const notas = document.getElementById('call-notes').value;
    
    console.log('Asesor_clientes.js: Starting call:', { clienteId, motivo, notas });
    
    // Simular inicio de llamada
    mostrarAlerta('Iniciando llamada...', 'info');
    
    // Aquí se podría integrar con un sistema de telefonía real
    setTimeout(() => {
        mostrarAlerta('Llamada iniciada correctamente', 'success');
        closeModal();
    }, 1000);
}

function verDetallesCliente(clienteId) {
    console.log('Asesor_clientes.js: Viewing client details:', clienteId);
    
    // Buscar datos del cliente
    const cliente = clientesData.find(c => c.id === clienteId);
    if (!cliente) {
        mostrarAlerta('Cliente no encontrado', 'error');
        return;
    }
    
    // Crear modal de detalles
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-user"></i> Detalles del Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="client-details-grid">
                    <div class="detail-section">
                        <h4>Información Personal</h4>
                        <div class="detail-item">
                            <label>Nombre:</label>
                            <span>${cliente.nombre}</span>
                        </div>
                        <div class="detail-item">
                            <label>Identificación:</label>
                            <span>${cliente.identificacion}</span>
                        </div>
                        <div class="detail-item">
                            <label>Teléfono:</label>
                            <span>${cliente.telefono}</span>
                        </div>
                        <div class="detail-item">
                            <label>Estado:</label>
                            <span class="estado-badge estado-${cliente.estado.toLowerCase()}">${cliente.estado}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Información Financiera</h4>
                        <div class="detail-item">
                            <label>Valor Deuda:</label>
                            <span class="debt-value">${cliente.deuda}</span>
                        </div>
                        <div class="detail-item">
                            <label>Última Gestión:</label>
                            <span>${cliente.ultimaGestion}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="gestionarCliente('${clienteId}')">
                    <i class="fas fa-edit"></i> Gestionar Cliente
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function gestionarCliente(clienteId) {
    console.log('Asesor_clientes.js: Managing client:', clienteId);
    
    // Buscar datos del cliente
    const cliente = clientesData.find(c => c.id === clienteId);
    if (!cliente) {
        mostrarAlerta('Cliente no encontrado', 'error');
        return;
    }
    
    // Crear modal de gestión
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Gestionar Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="client-info-header">
                    <h4>${cliente.nombre}</h4>
                    <p>ID: ${cliente.id} | Teléfono: ${cliente.telefono}</p>
                </div>
                
                <form id="gestion-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo de Gestión:</label>
                            <select id="tipo-gestion" required>
                                <option value="">Seleccionar...</option>
                                <option value="llamada">Llamada</option>
                                <option value="visita">Visita</option>
                                <option value="email">Email</option>
                                <option value="sms">SMS</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Resultado:</label>
                            <select id="resultado-gestion" required>
                                <option value="">Seleccionar...</option>
                                <option value="contactado">Contactado</option>
                                <option value="no_contesta">No contesta</option>
                                <option value="numero_equivocado">Número equivocado</option>
                                <option value="promesa_pago">Promesa de pago</option>
                                <option value="pago_parcial">Pago parcial</option>
                                <option value="pago_completo">Pago completo</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Observaciones:</label>
                        <textarea id="observaciones" placeholder="Detalles de la gestión..." rows="4"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Valor Recuperado:</label>
                            <input type="number" id="valor-recuperado" placeholder="0" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Seguimiento:</label>
                            <input type="date" id="fecha-seguimiento">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-success" onclick="guardarGestion('${clienteId}')">
                    <i class="fas fa-save"></i> Guardar Gestión
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function guardarGestion(clienteId) {
    const tipoGestion = document.getElementById('tipo-gestion').value;
    const resultado = document.getElementById('resultado-gestion').value;
    const observaciones = document.getElementById('observaciones').value;
    const valorRecuperado = document.getElementById('valor-recuperado').value;
    const fechaSeguimiento = document.getElementById('fecha-seguimiento').value;
    
    if (!tipoGestion || !resultado) {
        mostrarAlerta('Por favor complete todos los campos obligatorios', 'error');
        return;
    }
    
    console.log('Asesor_clientes.js: Saving management:', {
        clienteId,
        tipoGestion,
        resultado,
        observaciones,
        valorRecuperado,
        fechaSeguimiento
    });
    
    // Simular guardado
    mostrarAlerta('Guardando gestión...', 'info');
    
    setTimeout(() => {
        mostrarAlerta('Gestión guardada exitosamente', 'success');
        closeModal();
        
        // Actualizar datos del cliente
        const cliente = clientesData.find(c => c.id === clienteId);
        if (cliente) {
            cliente.ultimaGestion = new Date().toLocaleString('es-CO');
        }
        
        actualizarTabla();
    }, 1000);
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function refreshClientes() {
    console.log('Asesor_clientes.js: Refreshing clients...');
    
    mostrarAlerta('Actualizando datos...', 'info');
    
    // Simular recarga
    setTimeout(() => {
        location.reload();
    }, 1000);
}

function exportarClientes() {
    console.log('Asesor_clientes.js: Exporting clients...');
    
    if (clientesFiltrados.length === 0) {
        mostrarAlerta('No hay clientes para exportar', 'warning');
        return;
    }
    
    // Crear CSV
    let csv = 'ID,Nombre,Identificación,Teléfono,Estado,Deuda,Última Gestión\n';
    clientesFiltrados.forEach(cliente => {
        csv += `${cliente.id},"${cliente.nombre}","${cliente.identificacion}","${cliente.telefono}","${cliente.estado}","${cliente.deuda}","${cliente.ultimaGestion}"\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    mostrarAlerta('Archivo exportado exitosamente', 'success');
}

function cambiarPagina(pagina) {
    console.log('Asesor_clientes.js: Changing page to:', pagina);
    
    if (pagina < 1) return;
    
    const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);
    if (pagina > totalPaginas) return;
    
    paginaActual = pagina;
    
    // Actualizar botones de paginación
    const paginationButtons = document.querySelectorAll('.pagination button');
    paginationButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent == pagina) {
            btn.classList.add('active');
        }
    });
    
    // Aquí se implementaría la lógica de paginación
    console.log(`Asesor_clientes.js: Showing page ${pagina} of ${totalPaginas}`);
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// ========================================
// FUNCIONES DE GESTIÓN DE CLIENTES
// ========================================

function gestionarCliente(clienteId) {
    console.log('Asesor_clientes.js: Gestionar cliente:', clienteId);
    
    // Redirigir a la vista de gestión
    window.location.href = `index.php?action=asesor_gestionar&cliente_id=${clienteId}`;
}

function verHistorialCliente(clienteId) {
    console.log('Asesor_clientes.js: Ver historial cliente:', clienteId);
    
    // Mostrar modal de historial
    mostrarModalHistorial(clienteId);
}

function mostrarModalGestion(clienteId) {
    console.log('Asesor_clientes.js: Mostrando modal de gestión para cliente:', clienteId);
    
    // Crear modal de gestión
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Gestionar Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>ID Cliente:</label>
                    <input type="text" value="${clienteId}" readonly>
                </div>
                <div class="form-group">
                    <label>Tipo de Gestión:</label>
                    <select id="tipo-gestion">
                        <option value="llamada">Llamada</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="visita">Visita</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Resultado:</label>
                    <select id="resultado-gestion">
                        <option value="contactado">Contactado</option>
                        <option value="no_contesta">No Contesta</option>
                        <option value="numero_incorrecto">Número Incorrecto</option>
                        <option value="promesa_pago">Promesa de Pago</option>
                        <option value="pago_realizado">Pago Realizado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Comentarios:</label>
                    <textarea id="comentarios-gestion" rows="4" placeholder="Ingrese comentarios sobre la gestión..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="guardarGestion('${clienteId}')">
                    <i class="fas fa-save"></i> Guardar Gestión
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function mostrarModalHistorial(clienteId) {
    console.log('Asesor_clientes.js: Mostrando modal de historial para cliente:', clienteId);
    
    // Crear modal de historial
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-history"></i> Historial del Cliente</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="historial-container">
                    <div class="historial-item">
                        <div class="historial-fecha">15/01/2024 10:30</div>
                        <div class="historial-tipo">Llamada</div>
                        <div class="historial-resultado">Contactado</div>
                        <div class="historial-comentario">Cliente confirmó pago para el 20/01/2024</div>
                    </div>
                    <div class="historial-item">
                        <div class="historial-fecha">10/01/2024 14:15</div>
                        <div class="historial-tipo">Email</div>
                        <div class="historial-resultado">Enviado</div>
                        <div class="historial-comentario">Recordatorio de pago enviado</div>
                    </div>
                    <div class="historial-item">
                        <div class="historial-fecha">08/01/2024 09:00</div>
                        <div class="historial-tipo">SMS</div>
                        <div class="historial-resultado">Enviado</div>
                        <div class="historial-comentario">Mensaje de recordatorio</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;
    
    // Agregar estilos para el historial
    const style = document.createElement('style');
    style.textContent = `
        .historial-container {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .historial-item {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            background: #f8f9fa;
        }
        
        .historial-fecha {
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        
        .historial-tipo {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 10px;
        }
        
        .historial-resultado {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .historial-comentario {
            margin-top: 8px;
            color: #666;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
}

function guardarGestion(clienteId) {
    console.log('Asesor_clientes.js: Guardando gestión para cliente:', clienteId);
    
    const tipoGestion = document.getElementById('tipo-gestion').value;
    const resultado = document.getElementById('resultado-gestion').value;
    const comentarios = document.getElementById('comentarios-gestion').value;
    
    if (!comentarios.trim()) {
        mostrarAlerta('Por favor ingrese comentarios sobre la gestión', 'warning');
        return;
    }
    
    // Aquí se haría la petición AJAX para guardar la gestión
    console.log('Datos de gestión:', {
        clienteId,
        tipoGestion,
        resultado,
        comentarios
    });
    
    mostrarAlerta('Gestión guardada exitosamente', 'success');
    closeModal();
}

function mostrarAlerta(mensaje, tipo = 'info') {
    console.log(`Asesor_clientes.js: Alert [${tipo}]: ${mensaje}`);
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    alert.style.backgroundColor = colors[tipo] || colors.info;
    alert.textContent = mensaje;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// ========================================
// FUNCIONES GLOBALES
// ========================================

// Hacer funciones disponibles globalmente
window.cambiarTab = cambiarTab;
window.buscarCliente = buscarCliente;
window.llamarCliente = llamarCliente;
window.verDetallesCliente = verDetallesCliente;
window.gestionarCliente = gestionarCliente;
window.refreshClientes = refreshClientes;
window.exportarClientes = exportarClientes;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.cambiarPagina = cambiarPagina;
window.closeModal = closeModal;

console.log('Asesor_clientes.js: All functions loaded and ready');
