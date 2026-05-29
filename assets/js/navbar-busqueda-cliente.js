/**
 * Script para búsqueda de clientes desde el navbar
 * Funciona en todas las vistas del asesor
 */

// Modal de búsqueda (se crea dinámicamente si no existe)
let modalBusquedaNavbar = null;

/**
 * Abrir modal de búsqueda desde el navbar
 */
function abrirBusquedaClienteNavbar() {
    // Crear modal si no existe
    if (!modalBusquedaNavbar) {
        crearModalBusqueda();
    }
    
    // Mostrar modal
    if (modalBusquedaNavbar) {
        modalBusquedaNavbar.style.display = 'flex';
        const input = modalBusquedaNavbar.querySelector('#navbar-busqueda-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        // Limpiar resultados anteriores
        const resultados = modalBusquedaNavbar.querySelector('#navbar-resultados-busqueda');
        if (resultados) {
            resultados.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-search"></i>
                    <p>Ingrese cédula, teléfono, nombre o número de operación</p>
                </div>
            `;
        }
        // Cargar bases que gestiona el asesor (misma lógica que Coord_gestion → bases del coordinador)
        cargarBasesGestionandoEnNavbar();
    }
}

/**
 * Cargar y mostrar en el modal del navbar las bases de clientes que gestiona el asesor.
 * Las bases son las que el coordinador cargó en la pestaña BASES y a las que dio acceso al asesor.
 */
function cargarBasesGestionandoEnNavbar() {
    const contenedor = document.getElementById('navbar-bases-gestionando-lista');
    const bloqueBases = document.getElementById('navbar-bases-gestionando');
    if (!contenedor) return;

    contenedor.innerHTML = '<span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Cargando...</span>';

    fetch('index.php?action=obtener_bases_acceso')
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener bases');
            return response.json();
        })
        .then(data => {
            if (data.success && data.bases && data.bases.length > 0) {
                const nombres = data.bases.map(b => b.nombre_base || b.NOMBRE_BASE || 'Base sin nombre');
                const clientes = data.bases.map(b => (b.total_clientes || 0) + ' clientes');
                contenedor.innerHTML = nombres.map((nombre, i) =>
                    `<div style="margin-bottom: 4px;"><strong>${nombre}</strong> <span style="color: #666; font-size: 12px;">(${clientes[i]})</span></div>`
                ).join('') || '<span style="color: #666;">No tienes bases asignadas</span>';
            } else {
                contenedor.innerHTML = '<span style="color: #856404;"><i class="fas fa-info-circle"></i> No tienes bases de clientes asignadas</span>';
            }
            if (bloqueBases) bloqueBases.style.display = 'block';
        })
        .catch(() => {
            contenedor.innerHTML = '<span style="color: #666;">No se pudo cargar la información de bases</span>';
            if (bloqueBases) bloqueBases.style.display = 'block';
        });
}

/**
 * Cerrar modal de búsqueda
 */
function cerrarBusquedaNavbar() {
    if (modalBusquedaNavbar) {
        modalBusquedaNavbar.style.display = 'none';
    }
}

/**
 * Crear el modal de búsqueda dinámicamente
 */
function crearModalBusqueda() {
    // Verificar si ya existe
    const existente = document.getElementById('modal-busqueda-navbar');
    if (existente) {
        modalBusquedaNavbar = existente;
        return;
    }
    
    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'modal-busqueda-navbar';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10003;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #007bff;">
                    <i class="fas fa-search"></i> Buscar Cliente
                </h3>
                <button onclick="cerrarBusquedaNavbar()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            
            <!-- Base(s) que gestiona el asesor (visible solo para asesores con bases) -->
            <div id="navbar-bases-gestionando" style="margin-bottom: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
                <div style="font-size: 12px; font-weight: 600; color: #0056b3; margin-bottom: 6px;">
                    <i class="fas fa-database"></i> Base(s) que gestionas
                </div>
                <div id="navbar-bases-gestionando-lista" style="font-size: 13px; color: #333;">
                    <span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Cargando...</span>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="navbar-busqueda-input" style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">Cédula, teléfono, nombre o número de operación:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" 
                           id="navbar-busqueda-input" 
                           placeholder="Cédula, teléfono, nombre o número de operación..." 
                           style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                           onkeypress="if(event.key === 'Enter') buscarClienteNavbar();">
                    <button onclick="buscarClienteNavbar()" 
                            style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            
            <!-- Resultados de búsqueda -->
            <div id="navbar-resultados-busqueda" style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px; background: #f8f9fa;">
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-search"></i>
                    <p>Ingrese cédula, teléfono, nombre o número de operación</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modalBusquedaNavbar = modal;
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarBusquedaNavbar();
        }
    });
}

/**
 * Buscar cliente desde el navbar
 */
async function buscarClienteNavbar() {
    const termino = document.getElementById('navbar-busqueda-input')?.value.trim();
    const resultadosDiv = document.getElementById('navbar-resultados-busqueda');
    
    console.log('[Navbar Busqueda] Iniciando búsqueda con término:', termino);
    
    if (!termino) {
        alert('Por favor ingrese un término de búsqueda (cédula, teléfono, nombre o número de operación)');
        return;
    }
    
    if (!resultadosDiv) {
        console.error('[Navbar Busqueda] No se encontró el contenedor de resultados');
        return;
    }
    
    // Mostrar loading
    resultadosDiv.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Buscando cliente...</p>
        </div>
    `;
    
    try {
        console.log('[Navbar Busqueda] Enviando petición a index.php?action=buscar_cliente_asesor');
        const response = await fetch('index.php?action=buscar_cliente_asesor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                termino: termino,
                criterio: 'mixto' // Busca en CC, nombre y celular
            })
        });
        
        console.log('[Navbar Busqueda] Respuesta recibida, status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Navbar Busqueda] Datos recibidos:', data);
        
        if (data.success && data.clientes && data.clientes.length > 0) {
            console.log('[Navbar Busqueda] Clientes encontrados:', data.clientes.length);
            let html = '';
            data.clientes.forEach(cliente => {
                const clienteId = cliente.ID_CLIENTE || cliente.ID_COMERCIO || cliente.id;
                const nombreCliente = cliente['NOMBRE CONTRATANTE'] || cliente.nombre || cliente.NOMBRE_CLIENTE || 'N/A';
                const cc = cliente.IDENTIFICACION || cliente.cc || cliente.ID_CLIENTE || 'N/A';
                const celular = cliente.CELULAR || cliente.CEL || cliente['TEL 1'] || cliente.cel || 'N/A';
                const nombreBase = cliente.nombre_base || cliente.NOMBRE_BASE || cliente.base || 'No asignada';
                
                console.log('[Navbar Busqueda] Cliente encontrado:', { clienteId, nombreCliente, cc });
                
                html += `
                    <div style="padding: 15px; border-bottom: 1px solid #dee2e6; cursor: pointer; transition: background 0.2s;" 
                         onmouseover="this.style.background='#e9ecef'" 
                         onmouseout="this.style.background='transparent'"
                         onclick="gestionarClienteNavbar('${clienteId}')">
                        <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                            ${nombreCliente}
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            <div><i class="fas fa-id-card"></i> CC: ${cc}</div>
                            <div><i class="fas fa-phone"></i> Celular: ${celular}</div>
                            <div><i class="fas fa-database"></i> Base: ${nombreBase}</div>
                        </div>
                    </div>
                `;
            });
            resultadosDiv.innerHTML = html;
        } else {
            console.log('[Navbar Busqueda] No se encontraron clientes. Respuesta:', data);
            let mensaje = 'No se encontraron clientes';
            if (data.message) {
                mensaje = data.message;
            }
            resultadosDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${mensaje}</p>
                    <small>Verifique el CC o celular ingresado</small>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('[Navbar Busqueda] Error al buscar cliente:', error);
        resultadosDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al buscar cliente</p>
                <small>${error.message || 'Intente nuevamente'}</small>
            </div>
        `;
    }
}

/**
 * Redirigir a gestionar cliente desde el navbar
 * Si estamos en la vista de gestión, cambia sin recargar para no perder la llamada
 */
function gestionarClienteNavbar(clienteId) {
    cerrarBusquedaNavbar();
    
    // Verificar si estamos en la vista de gestión del asesor
    const urlParams = new URLSearchParams(window.location.search);
    const currentAction = urlParams.get('action');
    
    // Si estamos en la vista de gestión, usar cambio sin recargar
    if (currentAction === 'asesor_gestionar' && typeof window.cambiarClienteSinRecargar === 'function') {
        console.log('Navbar-busqueda: Cambiando cliente sin recargar para mantener la llamada');
        window.cambiarClienteSinRecargar(clienteId);
    } else {
        // Si no estamos en la vista de gestión, usar redirección normal
        console.log('Navbar-busqueda: Redirigiendo a vista de gestión');
        window.location.href = `index.php?action=asesor_gestionar&cliente_id=${clienteId}`;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // El modal se creará cuando se necesite
    });
} else {
    // DOM ya está listo
}

