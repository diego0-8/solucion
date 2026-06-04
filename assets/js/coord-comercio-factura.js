// ========================================
// COORDINADOR GESTIÓN - BASES Y TAREAS
// ========================================

let currentTab = 'bases';
let selectedFile = null;
let currentUploadType = 'nueva';

// ========================================
// FUNCIONES DE NAVEGACIÓN DE PESTAÑAS
// ========================================

function cambiarTab(tabName) {
    console.log(`Coord_gestion.js: Cambiando a pestaña: ${tabName}`);
    
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remover clase active de todos los spans de pestañas
    const tabSpans = document.querySelectorAll('.main-tabs span');
    tabSpans.forEach(span => span.classList.remove('active'));
    
    // Mostrar pestaña seleccionada
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activar span de pestaña
    const selectedSpan = document.querySelector(`.main-tabs span[onclick="cambiarTab('${tabName}')"]`);
    if (selectedSpan) {
        selectedSpan.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Cargar datos según la pestaña
    switch(tabName) {
        case 'bases':
            cargarBases();
            cargarEstadisticasBases();
            break;
        case 'tareas':
            cargarTareas();
            break;
        case 'carga-archivo':
            cargarBasesExistentes();
            break;
        case 'habilitar':
            cargarBasesDeshabilitadas();
            break;
    }
    
    console.log(`Coord_gestion.js: Pestaña ${tabName} activada`);
}

// ========================================
// FUNCIONES DE CARGA DE DATOS
// ========================================

function cargarBases() {
    console.log('Coord_gestion.js: Cargando bases...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Bases cargadas:', data);
            
            if (data.success) {
                const bases = data.data || data.bases || [];
                // En la pestaña BASES solo se listan las bases ACTIVAS
                const basesActivas = bases.filter(b => (b.estado || 'activo') === 'activo');
                mostrarBases(basesActivas);
                // Cargar estadísticas por separado
                cargarEstadisticasBases();
            } else {
                mostrarError('Error al cargar bases: ' + (data.error || data.message));
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar bases:', error);
            mostrarError('Error de conexión al cargar bases');
        });
}

function cargarEstadisticasBases() {
    console.log('Coord_gestion.js: Cargando estadísticas de bases...');
    
    fetch('index.php?action=obtener_estadisticas_bases')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Estadísticas de bases recibidas:', data);
            
            if (data.success) {
                actualizarEstadisticasBases(data);
            } else {
                console.error('Coord_gestion.js: Error al cargar estadísticas:', data.message || data.error);
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar estadísticas de bases:', error);
        });
}

function cargarTareas() {
    console.log('Coord_gestion.js: Inicializando pestaña de tareas...');
    
    // Cargar bases disponibles
    cargarBasesParaAsignacion();
    
    // Cargar asesores disponibles
    cargarAsesoresParaAsignacion();
    
    // Asegurar que el botón "Asignar desde CSV" responda al clic (por si el onclick no se ejecutó)
    bindBotonAsignarCsv();
}

function cargarBasesParaAsignacion() {
    console.log('Coord_gestion.js: Cargando bases para asignación...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => response.json())
        .then(data => {
            const lista = data.data || data.bases || [];
            if (!data.success) return;
            const select = document.getElementById('select-base-clientes');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccione una base de clientes...</option>';

            const basesActivas = lista.filter(base => String(base.estado || 'activo').toLowerCase().trim() === 'activo');

            if (basesActivas.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay bases creadas';
                option.disabled = true;
                select.appendChild(option);
            } else {
                basesActivas.forEach(base => {
                    const option = document.createElement('option');
                    option.value = base.id;
                    option.textContent = `${base.nombre} (${base.total_clientes || 0} clientes)`;
                    option.setAttribute('data-nombre', base.nombre);
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar bases:', error);
        });
}

function cargarAsesoresParaAsignacion() {
    // Esta función ahora se llamará dinámicamente cuando se seleccione una base
    // Los asesores se cargarán desde obtener_asesores_con_acceso
    console.log('Coord_gestion.js: Los asesores se cargarán cuando se seleccione una base');
    
    const select = document.getElementById('select-asesor');
    if (select) {
        select.innerHTML = '<option value="">Seleccione primero una base de clientes...</option>';
        select.disabled = true;
    }
}

// Función para cargar asesores con acceso a una base específica
function cargarAsesoresConAccesoTarea(baseId) {
    console.log('Coord_gestion.js: Cargando asesores con acceso para base:', baseId);
    
    const select = document.getElementById('select-asesor');
    if (!select) return;
    
    if (!baseId) {
        select.innerHTML = '<option value="">Seleccione primero una base de clientes...</option>';
        select.disabled = true;
        return;
    }
    
    select.disabled = false;
    select.innerHTML = '<option value="">Cargando asesores...</option>';
    
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Asesores con acceso recibidos:', data);
            
            select.innerHTML = '<option value="">Seleccione un asesor...</option>';
            
            if (data.success && data.asesores && data.asesores.length > 0) {
                data.asesores.forEach(asesor => {
                    const option = document.createElement('option');
                    option.value = asesor.asesor_cedula || asesor.cedula;
                    option.textContent = `${asesor.nombre_completo || asesor.usuario} (${asesor.usuario || ''})`;
                    option.setAttribute('data-nombre', asesor.nombre_completo || asesor.usuario);
                    select.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay asesores con acceso a esta base';
                option.disabled = true;
                select.appendChild(option);
            }
            
            // Obtener clientes disponibles después de cargar asesores
            obtenerClientesDisponiblesParaAsignacion();
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar asesores con acceso:', error);
            select.innerHTML = '<option value="">Error al cargar asesores</option>';
        });
}

function actualizarClientesDisponibles() {
    const baseId = document.getElementById('select-base-clientes').value;
    const inputClientes = document.getElementById('input-clientes-asignar');
    const infoClientes = document.getElementById('client-total-info');
    
    if (!baseId) {
        if (inputClientes) {
            inputClientes.max = 0;
            inputClientes.value = '';
            inputClientes.disabled = true;
        }
        if (infoClientes) {
            infoClientes.textContent = 'Total disponible: 0';
        }
        
        // Limpiar selector de asesor
        const selectAsesor = document.getElementById('select-asesor');
        if (selectAsesor) {
            selectAsesor.innerHTML = '<option value="">Seleccione primero una base de clientes...</option>';
            selectAsesor.disabled = true;
        }
        
        validarAsignacion();
        return;
    }
    
    // Cargar asesores con acceso a esta base
    cargarAsesoresConAccesoTarea(baseId);
}

function obtenerClientesDisponiblesParaAsignacion() {
    const baseId = document.getElementById('select-base-clientes').value;
    const inputClientes = document.getElementById('input-clientes-asignar');
    const infoClientes = document.getElementById('client-total-info');
    
    if (!baseId) {
        if (inputClientes) {
            inputClientes.max = 0;
            inputClientes.value = '';
            inputClientes.disabled = true;
        }
        if (infoClientes) {
            infoClientes.textContent = 'Total disponible: 0';
        }
        validarAsignacion();
        return;
    }
    
    // Obtener clientes disponibles (sin asignaciones pendientes)
    fetch(`index.php?action=obtener_clientes_disponibles&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const disponibles = data.clientes_disponibles || 0;
                if (inputClientes) {
                    inputClientes.max = disponibles;
                    inputClientes.disabled = false;
                    inputClientes.placeholder = `Máximo: ${disponibles}`;
                }
                if (infoClientes) {
                    infoClientes.textContent = `Total disponible: ${disponibles} (solo clientes sin asignación pendiente)`;
                }
                
                // Actualizar resumen
                actualizarResumenAsignacion();
            } else {
                if (inputClientes) {
                    inputClientes.max = 0;
                    inputClientes.disabled = true;
                }
                if (infoClientes) {
                    infoClientes.textContent = 'Error al obtener clientes disponibles';
                }
            }
        })
        .catch(error => {
            console.error('Error al obtener clientes disponibles:', error);
            if (inputClientes) {
                inputClientes.max = 0;
                inputClientes.disabled = true;
            }
            if (infoClientes) {
                infoClientes.textContent = 'Error de conexión';
            }
        });
    
    validarAsignacion();
}

function validarAsignacion() {
    const baseSelect = document.getElementById('select-base-clientes');
    const asesorSelect = document.getElementById('select-asesor');
    const cantidadInput = document.getElementById('input-clientes-asignar');
    
    if (!baseSelect || !asesorSelect || !cantidadInput) {
        return;
    }
    
    const baseId = baseSelect.value;
    const asesorId = asesorSelect.value;
    const cantidadClientes = parseInt(cantidadInput.value) || 0;
    const maxClientes = parseInt(cantidadInput.max) || 0;
    
    const btnAsignar = document.getElementById('btn-asignar');
    
    // Validar que todos los campos estén completos
    const valido = baseId && asesorId && cantidadClientes > 0 && cantidadClientes <= maxClientes;
    
    if (btnAsignar) {
        btnAsignar.disabled = !valido;
    }
    
    // Mostrar/ocultar sección de filtros avanzados
    const filtrosSection = document.getElementById('tareas-filter-section');
    if (filtrosSection) {
        filtrosSection.style.display = (baseId && asesorId) ? 'block' : 'none';
    }
    
    // Habilitar botón "Asignar desde CSV" cuando hay base y asesor (archivo opcional al clic; si falta, se muestra mensaje)
    validarBotonAsignarCsv();
    
    // Los botones "Limpiar Selección" y "Ver Asignaciones" siempre están activos
    // (ya están activos por defecto en el HTML, no necesitan ser activados)
    
    // Actualizar resumen
    actualizarResumenAsignacion();
}

function actualizarResumenAsignacion() {
    const baseSelect = document.getElementById('select-base-clientes');
    const asesorSelect = document.getElementById('select-asesor');
    const cantidadInput = document.getElementById('input-clientes-asignar');
    
    const baseNombre = baseSelect.options[baseSelect.selectedIndex]?.getAttribute('data-nombre') || baseSelect.options[baseSelect.selectedIndex]?.textContent || '-';
    const asesorNombre = asesorSelect.options[asesorSelect.selectedIndex]?.getAttribute('data-nombre') || asesorSelect.options[asesorSelect.selectedIndex]?.textContent || '-';
    const cantidad = parseInt(cantidadInput.value) || 0;
    const maxDisponibles = parseInt(cantidadInput.max) || 0;
    const restantes = maxDisponibles - cantidad;
    
    document.getElementById('summary-base').textContent = baseNombre;
    document.getElementById('summary-asesor').textContent = asesorNombre;
    document.getElementById('summary-clientes').textContent = cantidad || '-';
    document.getElementById('summary-restantes').textContent = restantes >= 0 ? restantes : '-';
}

function asignarClientes() {
    const baseId = document.getElementById('select-base-clientes').value;
    const asesorCedula = document.getElementById('select-asesor').value;
    const cantidadClientes = parseInt(document.getElementById('input-clientes-asignar').value);
    
    if (!baseId || !asesorCedula || !cantidadClientes) {
        mostrarError('Por favor complete todos los campos requeridos');
        return;
    }
    
    const nombreTareaEl = document.getElementById('input-nombre-tarea');
    const nombreTarea = nombreTareaEl ? nombreTareaEl.value.trim() : '';
    
    const formData = new FormData();
    formData.append('base_id', baseId);
    formData.append('asesor_cedula', asesorCedula);
    formData.append('cantidad_clientes', cantidadClientes);
    if (nombreTarea) formData.append('nombre_tarea', nombreTarea);
    
    const btnAsignar = document.getElementById('btn-asignar');
    btnAsignar.disabled = true;
    btnAsignar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Asignando...';
    
    fetch('index.php?action=crear_asignacion_clientes', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', 'Clientes asignados exitosamente');
            // Actualizar clientes disponibles después de la asignación
            obtenerClientesDisponiblesParaAsignacion();
            limpiarAsignacion();
        } else {
            mostrarError('Error al asignar clientes: ' + (data.message || data.error));
        }
    })
    .catch(error => {
        console.error('Error al asignar clientes:', error);
        mostrarError('Error de conexión al asignar clientes');
    })
    .finally(() => {
        btnAsignar.disabled = false;
        btnAsignar.innerHTML = '<i class="fas fa-user-plus"></i> Asignar Clientes';
    });
}

/** Flag para no duplicar listener del botón CSV */
let _botonCsvBind = false;
/** Si el usuario hizo clic en el botón y falta archivo, al elegirlo se sube automáticamente */
let _csvPendienteSubir = false;

/**
 * Enlaza el clic del botón "Asignar desde CSV" por código (respaldo del onclick del HTML).
 */
function bindBotonAsignarCsv() {
    const btn = document.getElementById('btn-asignar-csv');
    const input = document.getElementById('input-csv-cedulas');
    if (!btn || !input) return;
    if (_botonCsvBind) return;

    // Click del botón: si no hay archivo, abrir selector; si ya hay archivo, subirlo.
    btn.addEventListener('click', function(e) {
        e.preventDefault();

        const baseId = document.getElementById('select-base-clientes')?.value;
        const asesorId = document.getElementById('select-asesor')?.value;
        if (!baseId || !asesorId) {
            mostrarError('Seleccione una base de clientes y un asesor.');
            return;
        }

        const tieneArchivo = input.files && input.files.length > 0;
        if (!tieneArchivo) {
            _csvPendienteSubir = true;
            input.click(); // abre el selector de archivo
            return;
        }

        if (typeof asignarClientesDesdeCsv === 'function') {
            asignarClientesDesdeCsv();
        } else {
            console.error('Coord_gestion: asignarClientesDesdeCsv no está definida');
        }
    });

    // Si el usuario eligió archivo después de hacer clic en el botón, subir automáticamente.
    input.addEventListener('change', function() {
        validarBotonAsignarCsv();

        if (_csvPendienteSubir && input.files && input.files.length > 0) {
            _csvPendienteSubir = false;
            if (typeof asignarClientesDesdeCsv === 'function') {
                asignarClientesDesdeCsv();
            }
        }
    });

    _botonCsvBind = true;
    console.log('Coord_gestion.js: Botón "Asignar desde CSV" enlazado correctamente');
}

/**
 * Habilita o deshabilita el botón "Asignar desde CSV" cuando hay base y asesor.
 * Si no hay archivo, el botón sigue habilitado y al clic se muestra mensaje pidiendo el archivo.
 */
function validarBotonAsignarCsv() {
    const baseId = document.getElementById('select-base-clientes')?.value;
    const asesorId = document.getElementById('select-asesor')?.value;
    const btnAsignarCsv = document.getElementById('btn-asignar-csv');
    if (btnAsignarCsv) {
        btnAsignarCsv.disabled = !(baseId && asesorId);
    }
}

function asignarClientesDesdeCsv() {
    const baseId = document.getElementById('select-base-clientes').value;
    const asesorCedula = document.getElementById('select-asesor').value;
    const inputFile = document.getElementById('input-csv-cedulas');
    const resultadoEl = document.getElementById('csv-cedulas-resultado');
    
    if (!baseId || !asesorCedula) {
        mostrarError('Seleccione una base de clientes y un asesor.');
        return;
    }
    if (!inputFile || !inputFile.files || !inputFile.files.length) {
        mostrarError('Seleccione un archivo CSV con cédulas.');
        return;
    }
    
    const nombreTareaEl = document.getElementById('input-nombre-tarea');
    const nombreTarea = nombreTareaEl ? nombreTareaEl.value.trim() : '';
    
    const formData = new FormData();
    formData.append('base_id', baseId);
    formData.append('asesor_cedula', asesorCedula);
    formData.append('archivo_csv', inputFile.files[0]);
    if (nombreTarea) formData.append('nombre_tarea', nombreTarea);
    
    const btn = document.getElementById('btn-asignar-csv');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...'; }
    if (resultadoEl) { resultadoEl.style.display = 'none'; resultadoEl.innerHTML = ''; }
    
    fetch('index.php?action=crear_asignacion_clientes_csv', {
        method: 'POST',
        body: formData
    })
    .then(function(response) {
        const ct = response.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) return response.json();
        return response.text().then(function(t) {
            console.error('Coord_gestion: respuesta no JSON', t ? t.slice(0, 300) : response.status);
            throw new Error('El servidor no devolvió JSON. Revisar consola.');
        });
    })
    .then(function(data) {
        if (data.success) {
            mostrarNotificacion('success', data.message || 'Clientes asignados desde CSV.');
            if (resultadoEl) {
                let html = '<span class="text-success"><i class="fas fa-check-circle"></i> ' + (data.message || '') + '</span>';
                if (data.cedulas_no_encontradas > 0) {
                    html += ' <span class="text-muted">(En CSV: ' + data.cedulas_csv + ', en base: ' + data.cedulas_encontradas + ', no encontradas: ' + data.cedulas_no_encontradas + ')</span>';
                }
                resultadoEl.innerHTML = html;
                resultadoEl.style.display = 'block';
            }
            inputFile.value = '';
            obtenerClientesDisponiblesParaAsignacion();
            actualizarResumenAsignacion();
        } else {
            mostrarError(data.message || 'Error al asignar desde CSV.');
            if (resultadoEl) {
                resultadoEl.innerHTML = '<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ' + (data.message || '') + '</span>';
                resultadoEl.style.display = 'block';
            }
        }
    })
    .catch(function(err) {
        console.error('Error asignarClientesDesdeCsv:', err);
        mostrarError('Error al subir el CSV: ' + (err && err.message ? err.message : 'Error de conexión'));
        if (resultadoEl) {
            resultadoEl.innerHTML = '<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ' + (err && err.message ? err.message : 'Error de conexión') + '</span>';
            resultadoEl.style.display = 'block';
        }
    })
    .finally(function() {
        if (btn) { validarBotonAsignarCsv(); btn.innerHTML = '<i class="fas fa-upload"></i> Asignar desde CSV'; }
    });
}

function limpiarAsignacion() {
    document.getElementById('select-base-clientes').value = '';
    document.getElementById('select-asesor').value = '';
    document.getElementById('input-clientes-asignar').value = '';
    document.getElementById('input-clientes-asignar').max = 0;
    document.getElementById('client-total-info').textContent = 'Total disponible: 0';
    const inputNombre = document.getElementById('input-nombre-tarea');
    if (inputNombre) inputNombre.value = '';
    const inputCsv = document.getElementById('input-csv-cedulas');
    if (inputCsv) inputCsv.value = '';
    const csvResultado = document.getElementById('csv-cedulas-resultado');
    if (csvResultado) { csvResultado.style.display = 'none'; csvResultado.innerHTML = ''; }
    
    validarAsignacion();
    actualizarResumenAsignacion();
}

function verAsignacionesExistentes() {
    console.log('Coord_gestion.js: Ver asignaciones existentes');
    
    // Mostrar modal
    const modal = document.getElementById('modal-ver-asignaciones');
    if (!modal) {
        mostrarError('Modal no encontrado');
        return;
    }
    
    modal.style.display = 'block';
    
    // Mostrar loading
    const tbody = document.getElementById('modal-asignaciones-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando asignaciones...</td></tr>';
    }
    
    // Cargar tareas del coordinador
    fetch('index.php?action=obtener_tareas_coordinador')
        .then(response => response.json())
        .then(data => {
            console.log('Tareas recibidas:', data);
            if (data.success && data.asignaciones) {
                mostrarAsignacionesEnModal(data.asignaciones);
            } else {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center alert alert-warning">${data.message || 'No hay asignaciones'}</td></tr>`;
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar asignaciones:', error);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center alert alert-danger">Error al cargar asignaciones</td></tr>';
            }
        });
}

function mostrarAsignacionesEnModal(asignaciones) {
    const tbody = document.getElementById('modal-asignaciones-tbody');
    if (!tbody) return;
    
    if (!asignaciones || asignaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center alert alert-info">No hay asignaciones</td></tr>';
        return;
    }
    
    tbody.innerHTML = asignaciones.map(tarea => {
        // Los clientes_asignados ya vienen como array desde el modelo
        const clientesAsignados = Array.isArray(tarea.clientes_asignados) ? tarea.clientes_asignados : [];
        const cantidadClientes = clientesAsignados.length;
        
        // Formatear fecha
        let fechaFormateada = '-';
        if (tarea.fecha_creacion) {
            try {
                fechaFormateada = new Date(tarea.fecha_creacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                fechaFormateada = tarea.fecha_creacion;
            }
        }
        
        // Badge de estado según la estructura de la BD
        let estadoBadge = '';
        let estadoClass = '';
        switch(tarea.estado) {
            case 'pendiente':
                estadoBadge = 'Pendiente';
                estadoClass = 'badge-warning';
                break;
            case 'en progreso':
                estadoBadge = 'En Progreso';
                estadoClass = 'badge-info';
                break;
            case 'completa':
                estadoBadge = 'Completada';
                estadoClass = 'badge-success';
                break;
            case 'cancelada':
                estadoBadge = 'Cancelada';
                estadoClass = 'badge-danger';
                break;
            default:
                estadoBadge = tarea.estado || '-';
                estadoClass = 'badge-secondary';
        }
        const badgeHtml = `<span class="badge ${estadoClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${estadoBadge}</span>`;
        
        const nombreTarea = (tarea.nombre_tarea && String(tarea.nombre_tarea).trim()) ? String(tarea.nombre_tarea).trim() : '-';
        // Botón completar solo para tareas pendientes o en progreso
        const botonCompletar = (tarea.estado === 'pendiente' || tarea.estado === 'en progreso')
            ? `<button class="btn btn-sm btn-success" onclick="completarTarea(${tarea.id_tarea}, this)" title="Completar" data-tarea-nombre="${nombreTarea.replace(/"/g, '&quot;')}">
                    <i class="fas fa-check"></i> Completar
                </button>`
            : '<span class="text-muted">Finalizada</span>';
        
        return `
            <tr data-tarea-id="${tarea.id_tarea}" data-tarea-nombre="${nombreTarea.replace(/"/g, '&quot;')}">
                <td>${tarea.id_tarea}</td>
                <td>${nombreTarea}</td>
                <td>${tarea.base_nombre || `Base ${tarea.base_id}` || '-'}</td>
                <td>${tarea.asesor_nombre || tarea.asesor_cedula || '-'}</td>
                <td>${cantidadClientes}</td>
                <td>${fechaFormateada}</td>
                <td>${badgeHtml}</td>
                <td>${botonCompletar}</td>
            </tr>
        `;
    }).join('');
}

function completarTarea(tareaId, botonEl) {
    const fila = document.querySelector(`tr[data-tarea-id="${tareaId}"]`);
    const nombreTarea = (fila && fila.getAttribute('data-tarea-nombre')) ? fila.getAttribute('data-tarea-nombre') : '';
    const msg = nombreTarea && nombreTarea !== '-'
        ? `¿Completar la tarea "${nombreTarea}"? Esta acción la marcará como completada.`
        : '¿Está seguro que desea completar esta tarea? Esta acción marcará la tarea como completada.';
    if (!confirm(msg)) {
        return;
    }
    
    const boton = botonEl || (fila ? fila.querySelector('button[onclick*="completarTarea"]') : null);
    
    if (boton) {
        boton.disabled = true;
        boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }
    
    fetch('index.php?action=completar_tarea', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tarea_id=${tareaId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', 'Tarea completada exitosamente');
            // Recargar asignaciones
            verAsignacionesExistentes();
        } else {
            mostrarError('Error al completar tarea: ' + (data.message || data.error));
            if (boton) {
                boton.disabled = false;
                boton.innerHTML = '<i class="fas fa-check"></i> Completar';
            }
        }
    })
    .catch(error => {
        console.error('Error al completar asignación:', error);
        mostrarError('Error de conexión al completar asignación');
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = '<i class="fas fa-check"></i> Completar';
        }
    });
}

function seleccionarBaseParaTarea(baseId) {
    console.log('seleccionarBaseParaTarea: Base seleccionada:', baseId);
    actualizarClientesDisponibles();
}

function cerrarModalVerAsignaciones() {
    document.getElementById('modal-ver-asignaciones').style.display = 'none';
}

function cargarHistorial() {
    console.log('Coord_gestion.js: Cargando historial...');
    
    fetch('index.php?action=obtener_historial')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Historial cargado:', data);
            
            if (data.success) {
                mostrarHistorial(data.data);
            } else {
                mostrarError('Error al cargar historial: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar historial:', error);
            mostrarError('Error de conexión al cargar historial');
        });
}

// ========================================
// FUNCIONES DE MOSTRAR DATOS
// ========================================

function mostrarBases(bases) {
    const tbody = document.getElementById('bases-tbody');
    
    if (!bases || bases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>No hay bases de clientes registradas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = bases.map(base => {
        // Extraer valores de forma explícita y segura
        const totalClientes = base.total_clientes !== undefined && base.total_clientes !== null 
            ? parseInt(base.total_clientes) || 0 
            : 0;
        
        // Priorizar total_obligaciones en minúsculas, luego TOTAL_OBLIGACIONES en mayúsculas
        let totalObligaciones = 0;
        if (base.total_obligaciones !== undefined && base.total_obligaciones !== null) {
            totalObligaciones = parseInt(base.total_obligaciones) || 0;
        } else if (base.TOTAL_OBLIGACIONES !== undefined && base.TOTAL_OBLIGACIONES !== null) {
            totalObligaciones = parseInt(base.TOTAL_OBLIGACIONES) || 0;
        }
        
        const estado = base.estado || 'activo';
        
        return `
        <tr>
            <td>${base.nombre || '-'}</td>
            <td>${formatearFecha(base.fecha_creacion)}</td>
            <td>${totalClientes}</td>
            <td><strong>${totalObligaciones}</strong></td>
            <td>
                <span class="status-badge ${estado === 'activo' ? 'active' : 'inactive'}">
                    ${estado}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="btn btn-sm btn-success" onclick="darAccesoBase(${base.id}, '${base.nombre || ''}')" title="Dar Acceso">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="verAsesoresAccesoBase(${base.id}, '${base.nombre || ''}')" title="Ver Asesores con Acceso">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="verClientesBase(${base.id}, '${base.nombre || ''}')" title="Ver Clientes">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${
                        (base.from_base_clientes === true)
                            ? (
                                ((base.estado || 'activo') === 'activo')
                                    ? `<button class="btn btn-sm btn-warning" onclick="deshabilitarBase(${base.id}, '${(base.nombre || '').replace(/'/g, "\\'")}')" title="Deshabilitar base">
                                            <i class="fas fa-ban"></i> Deshabilitar
                                       </button>`
                                    : `<button class="btn btn-sm btn-secondary" disabled title="Esta base ya está deshabilitada. Habilítela en la pestaña 'HABILITAR'.">
                                            <i class="fas fa-ban"></i> Deshabilitar
                                       </button>`
                              )
                            : `<button class="btn btn-sm btn-secondary" disabled title="Solo las bases creadas desde 'Carga de archivo' se pueden deshabilitar.">
                                    <i class="fas fa-ban"></i> Deshabilitar
                               </button>`
                    }
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Funciones de mostrar tareas eliminadas - ya no se usan en la nueva estructura

function mostrarHistorial(historial) {
    const tbody = document.getElementById('historial-tbody');
    
    if (!tbody) {
        console.error('mostrarHistorial: Tbody no encontrado');
        return;
    }
    
    // Asegurarse de que historial sea un array
    if (!Array.isArray(historial)) {
        console.error('mostrarHistorial: historial no es un array:', historial);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error: Formato de datos incorrecto</p>
                </td>
            </tr>
        `;
        return;
    }
    
    if (historial.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No hay actividades registradas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = historial.map(actividad => {
        // Mapear campos de la tabla historial_actividades
        const tipo_actividad = actividad.tipo_actividad || actividad.tipo || 'Actividad';
        const descripcion = actividad.descripcion || actividad.actividad || '-';
        const fecha = actividad.fecha_actividad || actividad.fecha_creacion || actividad.fecha || '-';
        const estado = actividad.estado || 'completado';
        const archivo_tarea = actividad.archivo_tarea || actividad.archivo || '-';
        const usuario_nombre = actividad.usuario_nombre || actividad.nombre_usuario || 'Sistema';
        const base_nombre = actividad.base_nombre || actividad.base || '-';
        
        // Formatear fecha
        let fechaFormateada = '-';
        if (fecha && fecha !== '-') {
            try {
                fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                fechaFormateada = fecha;
            }
        }
        
        // Badge de estado
        let estadoBadge = '';
        switch(estado.toLowerCase()) {
            case 'exitoso':
            case 'completado':
            case 'completada':
                estadoBadge = '<span class="status-badge active">Completado</span>';
                break;
            case 'error':
            case 'fallido':
                estadoBadge = '<span class="status-badge inactive">Error</span>';
                break;
            default:
                estadoBadge = `<span class="status-badge">${estado}</span>`;
        }
        
        return `
            <tr>
                <td>${tipo_actividad}</td>
                <td>
                    <div>
                        <strong>${descripcion}</strong>
                        ${archivo_tarea && archivo_tarea !== '-' ? `<br><small>Archivo: ${archivo_tarea}</small>` : ''}
                        ${base_nombre && base_nombre !== '-' ? `<br><small>Base: ${base_nombre}</small>` : ''}
                    </div>
                </td>
                <td>${fechaFormateada}</td>
                <td>
                    ${estadoBadge}
                    ${usuario_nombre && usuario_nombre !== 'Sistema' ? `<br><small>Por: ${usuario_nombre}</small>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// FUNCIONES DE ESTADÍSTICAS
// ========================================

function actualizarEstadisticasBases(estadisticas) {
    if (!estadisticas) return;
    
    // Actualizar estadísticas: Total Bases, Clientes Totales, Obligaciones Totales (solo activas) y Bases Inactivas
    const statTotalBases = document.getElementById('stat-total-bases');
    const statClientesTotales = document.getElementById('stat-clientes-totales');
    const statObligacionesTotales = document.getElementById('stat-obligaciones-totales');
    const statBasesInactivas = document.getElementById('stat-bases-inactivas');
    
    if (statTotalBases) statTotalBases.textContent = estadisticas.total_bases || 0;
    if (statClientesTotales) statClientesTotales.textContent = estadisticas.total_clientes || estadisticas.clientes_totales || 0;
    if (statObligacionesTotales) statObligacionesTotales.textContent = estadisticas.obligaciones_totales || 0;
    if (statBasesInactivas) statBasesInactivas.textContent = estadisticas.bases_inactivas || 0;
}

// Función de estadísticas de tareas eliminada - ya no se usa en la nueva estructura

// ========================================
// FUNCIONES DE CARGA DE ARCHIVOS
// ========================================

function selectUploadType(tipo) {
    console.log(`Coord_gestion.js: Seleccionando tipo de carga: ${tipo}`);
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.upload-type-btn').forEach(btn => btn.classList.remove('active'));
    
    // Activar botón seleccionado
    const selectedBtn = document.getElementById(`btn-carga-${tipo}`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Mostrar/ocultar formularios
    document.getElementById('form-carga-nueva').style.display = tipo === 'nueva' ? 'block' : 'none';
    document.getElementById('form-carga-existente').style.display = tipo === 'existente' ? 'block' : 'none';
    
    currentUploadType = tipo;
    
    // Si se selecciona carga existente, cargar las bases disponibles
    if (tipo === 'existente') {
        cargarBasesExistentes();
    }
    
    // Validar formulario después del cambio
    validarFormulario();
    
    console.log(`Coord_gestion.js: Tipo de carga cambiado a: ${tipo}`);
}

function handleFileSelect(event, tipo) {
    console.log(`Coord_gestion.js: Archivo seleccionado para carga ${tipo}`);
    
    const file = event.target.files[0];
    if (file) {
        console.log(`Coord_gestion.js: Detalles del archivo - Nombre: ${file.name}, Tamaño: ${file.size}, Tipo: ${file.type}`);
        
        // Validar tipo de archivo
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
            console.error('Coord_gestion.js: Tipo de archivo inválido');
            alert('Por favor selecciona un archivo CSV válido');
            return;
        }
        
        selectedFile = file;
        showFileInfo(file, tipo);
        validarFormulario();
        
        // Habilitar botón de subir archivo
        const btnSubir = document.getElementById('btn-subir');
        if (btnSubir) {
            btnSubir.disabled = false;
        }
        
        console.log('Coord_gestion.js: Archivo procesado exitosamente');
    }
}

function dropHandler(ev, tipo) {
    console.log(`Coord_gestion.js: Archivo arrastrado para carga ${tipo}`);
    ev.preventDefault();
    
    const files = ev.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        console.log(`Coord_gestion.js: Archivo arrastrado - Nombre: ${file.name}, Tipo: ${file.type}`);
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            selectedFile = file;
            showFileInfo(file, tipo);
            validarFormulario();
            console.log('Coord_gestion.js: Archivo arrastrado exitosamente');
        } else {
            console.error('Coord_gestion.js: Tipo de archivo inválido arrastrado');
            alert('Por favor selecciona un archivo CSV válido');
        }
    }
}

function dragOverHandler(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

function dragLeaveHandler(ev) {
    ev.currentTarget.classList.remove('drag-over');
}

function showFileInfo(file, tipo) {
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = formatFileSize(file.size);
        document.getElementById('file-type').textContent = file.type;
        fileInfo.style.display = 'block';
    }
}

function validarFormulario() {
    const tipoCarga = currentUploadType;
    let valido = false;
    
    if (tipoCarga === 'nueva') {
        const nombreArchivo = document.getElementById('nombre-archivo').value.trim();
        valido = nombreArchivo.length > 0 && selectedFile !== null;
    } else if (tipoCarga === 'existente') {
        const baseDatos = document.getElementById('base-datos-existente').value;
        valido = baseDatos.length > 0 && selectedFile !== null;
    }
    
    const btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        btnSubir.disabled = !valido;
    }
    
    return valido;
}

// ========================================
// FUNCIONES DE HABILITACIÓN DE BOTONES
// ========================================

function enableButtons() {
    console.log('Coord_gestion.js: Habilitando botones...');
    
    const btnSubir = document.getElementById('btn-subir');
    const btnLimpiar = document.getElementById('btn-limpiar');
    
    if (btnSubir) btnSubir.disabled = false;
    if (btnLimpiar) btnLimpiar.disabled = false;
    
    console.log('Coord_gestion.js: Botones habilitados');
}

function disableButtons() {
    console.log('Coord_gestion.js: Deshabilitando botones...');
    
    const btnSubir = document.getElementById('btn-subir');
    const btnLimpiar = document.getElementById('btn-limpiar');
    
    if (btnSubir) btnSubir.disabled = true;
    if (btnLimpiar) btnLimpiar.disabled = false; // Limpiar siempre debe estar habilitado
    
    console.log('Coord_gestion.js: Botones deshabilitados');
}

// ========================================
// FUNCIONES DE CARGA DE BASES EXISTENTES
// ========================================

function cargarBasesExistentes() {
    console.log('Coord_gestion.js: Cargando bases de datos existentes...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => {
            console.log('Coord_gestion.js: Respuesta recibida de obtener_bases');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Coord_gestion.js: Datos de bases recibidos:', data);
            
            const bases = data.data || data.bases || [];
            const basesHabilitadas = Array.isArray(bases)
                ? bases.filter(b => String(b.estado || 'activo').toLowerCase().trim() === 'activo')
                : [];
            
            if (data.success && basesHabilitadas.length > 0) {
                const select = document.getElementById('base-datos-existente');
                if (select) {
                    // Limpiar opciones existentes excepto la primera
                    select.innerHTML = '<option value="">Seleccione una base de datos...</option>';
                    
                    basesHabilitadas.forEach(base => {
                        const option = document.createElement('option');
                        option.value = base.id;
                        const totalClientes = base.total_clientes || 0;
                        option.textContent = `${base.nombre} (${totalClientes} clientes)`;
                        select.appendChild(option);
                    });
                    
                    console.log(`Coord_gestion.js: ${basesHabilitadas.length} bases habilitadas en el select (carga existente)`);
                } else {
                    console.warn('Coord_gestion.js: Elemento base-datos-existente no encontrado');
                }
            } else {
                console.warn('Coord_gestion.js: No hay bases habilitadas para carga existente. Data:', data);
                const select = document.getElementById('base-datos-existente');
                if (select) {
                    select.innerHTML = '<option value="">No hay bases habilitadas (active una en la pestaña HABILITAR)</option>';
                }
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al cargar bases:', error);
            const select = document.getElementById('base-datos-existente');
            if (select) {
                select.innerHTML = '<option value="">Error al cargar bases</option>';
            }
        });
}

function subirArchivo() {
    console.log('Coord_gestion.js: Iniciando proceso de subida de archivo...');
    
    if (!validarFormulario()) {
        mostrarNotificacion('error', 'Por favor complete todos los campos requeridos');
        return;
    }
    
    if (!selectedFile) {
        mostrarNotificacion('error', 'Por favor seleccione un archivo CSV para subir');
        return;
    }
    
    // Validar tamaño del archivo (aumentado a 500MB para archivos grandes)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
        mostrarNotificacion('error', 'El archivo es demasiado grande. Máximo permitido: 500MB');
        return;
    }
    
    // Mostrar indicador de carga
    mostrarNotificacion('info', 'Subiendo archivo...');
    
    // Deshabilitar botón durante la carga
    const btnSubir = document.getElementById('btn-subir');
    btnSubir.disabled = true;
    btnSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    
    // Preparar datos del formulario (todos los parámetros que espera el servidor)
    const formData = new FormData();
    formData.append('csv_file', selectedFile);
    formData.append('tipo_carga', currentUploadType);
    
    if (currentUploadType === 'nueva') {
        const nombreArchivo = document.getElementById('nombre-archivo').value.trim();
        formData.append('nombre_archivo', nombreArchivo);
    } else if (currentUploadType === 'existente') {
        const baseDatosId = document.getElementById('base-datos-existente').value;
        if (baseDatosId) {
            formData.append('base_datos_id', baseDatosId);
        }
    }
    const hasHeader = document.getElementById('has-header');
    const skipEmpty = document.getElementById('skip-empty');
    const separatorSel = document.getElementById('separator');
    const encodingSel = document.getElementById('encoding');
    formData.append('has_header', (hasHeader && hasHeader.checked) ? '1' : '0');
    formData.append('skip_empty', (skipEmpty && skipEmpty.checked) ? '1' : '0');
    // Respetar el separador/codificación elegidos en la UI (el servidor además
    // auto-detecta el separador real si el archivo usa otro distinto).
    formData.append('separator', (separatorSel && separatorSel.value) ? separatorSel.value : ',');
    formData.append('encoding', (encodingSel && encodingSel.value) ? encodingSel.value : 'utf-8');
    
    procesarArchivoReal(formData);
}

function procesarArchivoReal(formData) {
    console.log('Coord_gestion.js: Enviando archivo al servidor para procesamiento...');
    
    // Mostrar indicador de progreso para archivos grandes
    const fileSize = selectedFile ? selectedFile.size : 0;
    const isLargeFile = fileSize > 50 * 1024 * 1024; // > 50MB
    
    if (isLargeFile) {
        mostrarNotificacion('info', 'Procesando archivo grande. Esto puede tardar varios minutos. Por favor espere...');
        
        // Actualizar barra de progreso
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill) {
            progressFill.style.width = '10%';
        }
        if (progressText) {
            progressText.textContent = 'Iniciando procesamiento de archivo grande...';
        }
    }
    
    // Usar XMLHttpRequest en lugar de fetch para mejor manejo de errores en archivos grandes
    const xhr = new XMLHttpRequest();
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            const raw = (xhr.responseText || '').trim();
            if (raw === '') {
                console.error('Coord_gestion.js: Respuesta vacía del servidor (posible timeout o error al procesar el archivo).');
                restaurarBotonSubir();
                mostrarResultado({
                    success: false,
                    message: 'El servidor respondió vacío. Puede deberse a un archivo muy grande, timeout o error interno. Intente con menos filas o revise el registro de errores de PHP.'
                }, 'error');
                return;
            }
            try {
                const data = JSON.parse(raw);
                console.log('Coord_gestion.js: Processing result received:', data);
                
                // Actualizar estadísticas de procesamiento
                actualizarEstadisticasProcesamiento(data);
                
                // Actualizar log de errores
                actualizarLogErrores(data.errores || []);
                
                // Restaurar botón primero
                restaurarBotonSubir();
                
                if (data.success) {
                    console.log('Coord_gestion.js: File processed successfully');
                    mostrarResultado(data, 'success');
                    
                    cargarBasesExistentes();
                    if (typeof cargarBases === 'function') cargarBases();
                    
                    // Limpiar formulario después de un pequeño delay para que se vea el resultado
                    setTimeout(() => {
                        limpiarFormulario();
                    }, 3000); // 3 segundos para que el usuario vea el resultado
                } else {
                    console.error('Coord_gestion.js: File processing failed:', data.message || data.mensaje || 'Error desconocido');
                    // Mostrar mensaje más descriptivo si hay errores
                    if (data.errores && data.errores.length > 0) {
                        console.error('Coord_gestion.js: Errores detallados:', data.errores);
                    }
                    mostrarResultado(data, 'error');
                }
            } catch (e) {
                console.error('Coord_gestion.js: Error parsing response:', e);
                restaurarBotonSubir();
                mostrarResultado({
                    success: false,
                    message: 'Error al procesar respuesta del servidor'
                }, 'error');
            }
        } else {
            console.error('Coord_gestion.js: HTTP error:', xhr.status);
            restaurarBotonSubir();
            mostrarResultado({
                success: false,
                message: 'Error de servidor (HTTP ' + xhr.status + ')'
            }, 'error');
        }
    };
    
    xhr.onerror = function() {
        console.error('Coord_gestion.js: Network error during file processing');
        restaurarBotonSubir();
        mostrarResultado({
            success: false,
            message: 'Error de conexión. Por favor verifique su conexión a internet.'
        }, 'error');
    };
    
    xhr.onloadend = function() {
        console.log('Coord_gestion.js: File processing completed');
    };
    
    xhr.open('POST', 'index.php?action=cargar_csv', true);
    xhr.send(formData);
}

function _numCargaCsv(v) {
    if (v == null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// Panel lateral: mismos campos que el resumen de carga exitosa
function actualizarEstadisticasProcesamiento(data) {
    const d = data || {};
    const filas = _numCargaCsv(d.filas_procesadas ?? d.procesado ?? d.total_filas);
    const oblNuevas = _numCargaCsv(d.obligaciones_creadas);
    const oblTotBase = _numCargaCsv(d.total_obligaciones_en_base ?? d.obligaciones_unicas);
    const cliTotBase = _numCargaCsv(d.total_clientes_en_base ?? d.clientes_unicos);
    const cliNuevos = _numCargaCsv(d.clientes_creados);
    const errores = _numCargaCsv(d.total_errores != null ? d.total_errores : (Array.isArray(d.errores) ? d.errores.length : 0));

    const rowsProcessed = document.getElementById('rows-processed');
    const totalClientesBase = document.getElementById('total-clientes-base');
    const totalObligaciones = document.getElementById('total-obligaciones');
    const clientesCreados = document.getElementById('clientes-creados');
    const obligacionesCreadas = document.getElementById('obligaciones-creadas');
    const rowsErrors = document.getElementById('rows-errors');

    if (rowsProcessed) rowsProcessed.textContent = String(filas);
    if (totalClientesBase) totalClientesBase.textContent = String(cliTotBase);
    if (totalObligaciones) totalObligaciones.textContent = String(oblTotBase);
    if (clientesCreados) clientesCreados.textContent = String(cliNuevos);
    if (obligacionesCreadas) obligacionesCreadas.textContent = String(oblNuevas);
    if (rowsErrors) rowsErrors.textContent = String(errores);
}

// Función para actualizar log de errores
function actualizarLogErrores(errores) {
    const errorLog = document.getElementById('error-log');
    if (!errorLog) return;
    
    if (!errores || errores.length === 0) {
        errorLog.innerHTML = '<p class="log-empty">No hay errores</p>';
        return;
    }
    
    // Mostrar hasta 100 errores con scroll
    const erroresMostrar = errores.slice(0, 100);
    const htmlErrores = erroresMostrar.map((error, index) => {
        return `<div class="log-entry" style="padding: 8px; margin-bottom: 4px; border-left: 3px solid #dc3545; background: #fff5f5;">
                    <span style="color: #dc3545; font-weight: bold;">Error ${index + 1}:</span> 
                    <span style="color: #333;">${error}</span>
                </div>`;
    }).join('');
    
    const mensajeFinal = errores.length > 100 
        ? `<div style="padding: 8px; color: #856404; font-style: italic;">... y ${errores.length - 100} errores más</div>`
        : '';
    
    errorLog.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${htmlErrores}
            ${mensajeFinal}
        </div>
    `;
}

function htmlResumenCargaCsvDetalle(data, maxErrList) {
    const d = data || {};
    const filas = _numCargaCsv(d.filas_procesadas ?? d.procesado ?? d.total_filas);
    const oblNuev = _numCargaCsv(d.obligaciones_creadas);
    const oblTot = _numCargaCsv(d.total_obligaciones_en_base ?? d.obligaciones_unicas);
    const cliTot = _numCargaCsv(d.total_clientes_en_base ?? d.clientes_unicos);
    const cliNuev = _numCargaCsv(d.clientes_creados);
    const errs = Array.isArray(d.errores) ? d.errores : [];
    const maxErr = maxErrList != null ? maxErrList : 20;
    return `
            <div class="resultado-detalles">
                <div class="detalle-item">
                    <span class="detalle-label">Filas procesadas:</span>
                    <span class="detalle-valor">${filas}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Obligaciones nuevas:</span>
                    <span class="detalle-valor">${oblNuev}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Obligaciones (total en la base):</span>
                    <span class="detalle-valor">${oblTot}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Clientes (total en la base):</span>
                    <span class="detalle-valor">${cliTot}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Clientes nuevos:</span>
                    <span class="detalle-valor">${cliNuev}</span>
                </div>
                ${errs.length > 0 ? `
                    <div class="detalle-item">
                        <span class="detalle-label">Errores en filas:</span>
                        <span class="detalle-valor text-warning">${errs.length}</span>
                    </div>
                    <div class="errores-detalle" style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
                        <ul style="text-align: left; font-size: 12px;">
                            ${errs.slice(0, maxErr).map(error => `<li style="color: #dc3545;">${String(error)}</li>`).join('')}
                            ${errs.length > maxErr ? `<li style="color: #856404;">… y ${errs.length - maxErr} más</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            </div>`;
}

function mostrarResultado(data, tipo) {
    if (tipo === undefined || tipo === null) {
        tipo = data && data.success ? 'success' : 'error';
    }
    console.log(`Coord_gestion.js: Mostrando resultado ${tipo}:`, data);

    const resultadoDiv = document.getElementById('resultado-carga');
    const titulo = document.getElementById('resultado-titulo');
    const mensaje = document.getElementById('resultado-mensaje');
    const detalles = document.getElementById('resultado-detalles');

    if (!resultadoDiv || !titulo || !mensaje || !detalles) {
        console.warn('Coord_gestion.js: mostrarResultado — faltan elementos #resultado-carga / titulo / mensaje / detalles');
        return;
    }

    if (tipo === 'success') {
        titulo.textContent = 'Carga exitosa';
        titulo.className = 'text-success';

        mensaje.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i>
                ${data.mensaje || data.message || 'Archivo procesado correctamente'}
            </div>
        `;

        detalles.innerHTML = htmlResumenCargaCsvDetalle(data, 20);

        const filas = _numCargaCsv(data.filas_procesadas);
        const cliN = _numCargaCsv(data.clientes_creados);
        const oblN = _numCargaCsv(data.obligaciones_creadas);
        const mensajeExito = data.mensaje || data.message ||
            `Resumen: ${filas} filas procesadas; ${cliN} clientes nuevos; ${oblN} obligaciones nuevas.`;
        mostrarNotificacion('success', mensajeExito);
    } else {
        titulo.textContent = 'Error en la carga';
        titulo.className = 'text-danger';

        const mensajeError = data.message || data.mensaje || 'Error al procesar el archivo';

        mensaje.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                ${mensajeError}
            </div>
        `;

        detalles.innerHTML = htmlResumenCargaCsvDetalle(data, 50);

        mostrarNotificacion('error', mensajeError);
    }

    resultadoDiv.style.display = 'block';
}

function limpiarFormulario() {
    console.log('Coord_gestion.js: Limpiando formulario...');
    
    // Limpiar archivo seleccionado
    selectedFile = null;
    
    // Limpiar inputs de archivo
    document.getElementById('csv-file-nueva').value = '';
    document.getElementById('csv-file-existente').value = '';
    
    // Limpiar nombre de archivo
    document.getElementById('nombre-archivo').value = '';
    
    // Ocultar información del archivo
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    
    // Ocultar resultado
    const resultadoDiv = document.getElementById('resultado-carga');
    if (resultadoDiv) {
        resultadoDiv.style.display = 'none';
    }
    
    // Deshabilitar botón
    const btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        btnSubir.disabled = true;
    }
    
    console.log('Coord_gestion.js: Formulario limpiado');
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function formatearNumero(numero) {
    return new Intl.NumberFormat('es-CO').format(numero);
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-CO');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para restaurar el botón de subir
function restaurarBotonSubir() {
    const btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        btnSubir.disabled = false;
        btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir Archivo';
    }
}

function mostrarNotificacion(tipo, mensaje) {
    // Crear notificación visual
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    const colores = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notificacion.style.backgroundColor = colores[tipo] || colores.info;
    
    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notificacion.innerHTML = `
        <i class="${iconos[tipo] || iconos.info}"></i>
        <span style="margin-left: 8px;">${mensaje}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            margin-left: 10px;
            cursor: pointer;
            opacity: 0.8;
        ">&times;</button>
    `;
    
    document.body.appendChild(notificacion);
    
    // Duración de la notificación según el tipo
    const duracion = tipo === 'success' ? 8000 : tipo === 'error' ? 10000 : 5000; // 8s para éxito, 10s para error, 5s para otros
    
    setTimeout(() => {
        if (notificacion.parentElement) {
            notificacion.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notificacion.parentElement) {
                    notificacion.remove();
                }
            }, 300);
        }
    }, duracion);
    
    console.log(`Notificación ${tipo}: ${mensaje}`);
}

function mostrarError(mensaje) {
    mostrarNotificacion('error', mensaje);
}

// ========================================
// FUNCIONES DE ACCIONES (eliminadas - ahora están arriba)
// ========================================

// Función filtrarTareas eliminada - ya no se usa en la nueva estructura

function exportarBases() {
    console.log('Coord_gestion.js: Exportar bases');
    window.location.href = 'index.php?action=exportar_bases';
}

// Funciones para modales (placeholders)
function openModal(modalId) {
    console.log(`Coord_gestion.js: Abrir modal ${modalId}`);
    // Implementar lógica de modal según sea necesario
    if (modalId === 'crear-base') {
        alert('Función de crear base - Por implementar');
    } else if (modalId === 'importar-base') {
        abrirPestañaCarga();
    }
}

function darAccesoBase(baseId, baseNombre) {
    console.log(`Coord_gestion.js: Dar acceso a base ID: ${baseId}, Nombre: ${baseNombre}`);
    
    // Guardar datos de la base para el modal
    window.currentBaseAcceso = {
        id: baseId,
        nombre: baseNombre
    };
    
    // Abrir modal de dar acceso
    openModalAccesoBase(baseId, baseNombre);
}

function verClientesBase(baseId, baseNombre) {
    console.log(`verClientesBase: Ver clientes de base ID: ${baseId}, Nombre: ${baseNombre}`);
    
    // Verificar que el modal existe
    const modal = document.getElementById('modal-ver-clientes');
    if (!modal) {
        console.error('verClientesBase: Modal modal-ver-clientes no encontrado');
        mostrarError('Error: Modal no encontrado');
        return;
    }
    
    // Abrir modal PRIMERO
    openModalVerClientes(baseId, baseNombre);
    
    // Obtener elementos del modal
    const modalBody = document.getElementById('modal-ver-clientes-body');
    const nombreElement = document.getElementById('modal-ver-clientes-nombre');
    const tbody = document.getElementById('modal-clientes-tbody');
    
    // Verificar que los elementos existen
    if (!modalBody || !nombreElement || !tbody) {
        console.error('verClientesBase: Elementos del modal no encontrados', {
            modalBody: !!modalBody,
            nombre: !!nombreElement,
            tbody: !!tbody
        });
        if (modalBody) {
            modalBody.innerHTML = '<div class="alert alert-danger">Error: Elementos del modal no encontrados</div>';
        }
        return;
    }
    
    // Establecer nombre
    nombreElement.textContent = baseNombre;
    
    // Mostrar loading en el tbody (no en todo el modal body)
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando clientes...</td></tr>';
    
    console.log('verClientesBase: Cargando clientes para base ID:', baseId);
    
    window._modalVerClientesBaseId = baseId;
    window._modalVerClientesBaseNombre = baseNombre;

    // Cargar clientes (con límite en servidor para bases grandes; total indica tamaño real)
    fetch(`index.php?action=obtener_clientes_base&base_id=${baseId}`)
        .then(response => {
            console.log('verClientesBase: Respuesta recibida. Status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('verClientesBase: Datos recibidos:', data);
            
            if (data.success && data.clientes) {
                const total = data.total != null ? parseInt(data.total, 10) : data.clientes.length;
                console.log('verClientesBase: Mostrando', data.clientes.length, 'de', total, 'clientes');
                mostrarClientesEnModal(data.clientes, baseNombre, total);
            } else {
                console.error('verClientesBase: Error del servidor:', data);
                const errorMsg = data.message || data.error || 'Error desconocido al cargar clientes';
                tbody.innerHTML = `<tr><td colspan="4" class="text-center alert alert-danger">Error: ${errorMsg}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('verClientesBase: Error al cargar clientes:', error);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center alert alert-danger">Error de conexión al cargar clientes</td></tr>';
            } else if (modalBody) {
                modalBody.innerHTML = '<div class="alert alert-danger">Error de conexión al cargar clientes</div>';
            }
        });
}

function deshabilitarBase(baseId, baseNombre) {
    if (!confirm('¿Deshabilitar la base "' + (baseNombre || '') + '"?\n\nLos asesores dejarán de verla y no se podrá asignar. El historial y los reportes seguirán incluyendo sus datos. Puede volver a habilitarla en la pestaña "Habilitar".')) {
        return;
    }
    fetch('index.php?action=deshabilitar_base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'base_id=' + encodeURIComponent(baseId)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', data.message || 'Base deshabilitada');
            cargarBases();
            if (typeof cargarBasesExistentes === 'function') cargarBasesExistentes();
        } else {
            mostrarNotificacion('error', data.message || 'Error al deshabilitar');
        }
    })
    .catch(error => {
        console.error('Error al deshabilitar base:', error);
        mostrarNotificacion('error', 'Error de conexión');
    });
}

function cargarBasesDeshabilitadas() {
    const tbody = document.getElementById('bases-deshabilitadas-tbody');
    const vacio = document.getElementById('bases-deshabilitadas-vacio');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';
    if (vacio) vacio.style.display = 'none';
    fetch('index.php?action=obtener_bases_deshabilitadas')
        .then(response => response.json())
        .then(data => {
            const bases = data.data || data.bases || [];
            if (data.success && Array.isArray(bases) && bases.length > 0) {
                mostrarBasesDeshabilitadas(bases);
                if (vacio) vacio.style.display = 'none';
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay bases deshabilitadas.</td></tr>';
                if (vacio) vacio.style.display = 'block';
            }
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center alert alert-danger">Error al cargar.</td></tr>';
            if (vacio) vacio.style.display = 'none';
        });
}

function mostrarBasesDeshabilitadas(bases) {
    const tbody = document.getElementById('bases-deshabilitadas-tbody');
    if (!tbody) return;
    const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
    tbody.innerHTML = bases.map(b => `
        <tr>
            <td>${b.nombre || '-'}</td>
            <td>${fmt(b.fecha_creacion)}</td>
            <td>${b.total_clientes != null ? b.total_clientes : 0}</td>
            <td>
                <button type="button" class="btn btn-sm btn-success" onclick="habilitarBase(${b.id}, '${(b.nombre || '').replace(/'/g, "\\'")}')" title="Habilitar base">
                    <i class="fas fa-check-circle"></i> Habilitar
                </button>
            </td>
        </tr>
    `).join('');
}

function habilitarBase(baseId, baseNombre) {
    if (!confirm('¿Habilitar la base "' + (baseNombre || '') + '"?\n\nVolverá a estar activa y los asesores con acceso podrán verla.')) {
        return;
    }
    fetch('index.php?action=habilitar_base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'base_id=' + encodeURIComponent(baseId)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', data.message || 'Base habilitada');
            cargarBasesDeshabilitadas();
            if (typeof cargarBases === 'function') cargarBases();
            if (typeof cargarBasesExistentes === 'function') cargarBasesExistentes();
        } else {
            mostrarNotificacion('error', data.message || 'Error al habilitar');
        }
    })
    .catch(() => mostrarNotificacion('error', 'Error de conexión'));
}

function openModalAccesoBase(baseId, baseNombre) {
    console.log('openModalAccesoBase: Abriendo modal. Base ID:', baseId, 'Nombre:', baseNombre);
    
    // Verificar que el modal existe
    const modal = document.getElementById('modal-acceso-base');
    if (!modal) {
        console.error('openModalAccesoBase: Modal modal-acceso-base no encontrado');
        mostrarError('Error: Modal no encontrado');
        return;
    }
    
    // Establecer ID y nombre en el modal PRIMERO (antes de cargar asesores)
    const nombreElement = document.getElementById('modal-acceso-base-nombre');
    const idElement = document.getElementById('modal-acceso-base-id');
    
    if (!nombreElement || !idElement) {
        console.error('openModalAccesoBase: Elementos del modal no encontrados', {
            nombre: !!nombreElement,
            id: !!idElement
        });
        mostrarError('Error: Elementos del modal no encontrados');
        return;
    }
    
    nombreElement.textContent = baseNombre;
    idElement.value = baseId;
    
    console.log('openModalAccesoBase: Valores establecidos. Base ID:', idElement.value, 'Nombre:', nombreElement.textContent);
    
    // Mostrar modal
    modal.style.display = 'block';
    console.log('openModalAccesoBase: Modal mostrado');
    
    // Mostrar loading
    const asesoresList = document.getElementById('asesores-acceso-list');
    if (asesoresList) {
        asesoresList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando asesores...</p></div>';
    }
    
    // Cargar solo los asesores que NO tienen acceso a esta base
    // Esto permite agregar múltiples asesores sin revocar los existentes
    console.log('openModalAccesoBase: Cargando asesores sin acceso...');
    
    fetch(`index.php?action=obtener_asesores_sin_acceso&base_id=${baseId}`)
        .then(response => {
            console.log('openModalAccesoBase: Respuesta de asesores sin acceso. Status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('openModalAccesoBase: Datos de asesores sin acceso:', data);
            
            if (data.success && data.asesores) {
                if (asesoresList) {
                    console.log('openModalAccesoBase: Creando lista de asesores sin acceso. Total:', data.asesores.length);
                    if (data.asesores.length === 0) {
                        asesoresList.innerHTML = `
                            <div class="empty-state" style="padding: 12px 8px; color: #6c757d;">
                                <i class="fas fa-info-circle"></i> Todos los asesores ya tienen acceso a esta base
                            </div>
                        `;
                    } else {
                        asesoresList.innerHTML = data.asesores.map(asesor => {
                            const cedula = String(asesor.cedula || '');
                            const nombre = asesor.nombre_completo || asesor.usuario || 'Sin nombre';
                            return `
                                <div class="asesor-checkbox-item">
                                    <label style="display: flex; align-items: center; padding: 8px; cursor: pointer;">
                                        <input type="checkbox" value="${cedula}" class="asesor-checkbox" id="asesor-check-${cedula}" style="margin-right: 8px;">
                                        <span>${nombre} - ${cedula}</span>
                                    </label>
                                </div>
                            `;
                        }).join('');
                    }
                    console.log('openModalAccesoBase: Lista de asesores sin acceso creada');
                } else {
                    console.error('openModalAccesoBase: Elemento asesores-acceso-list no encontrado');
                }
            } else {
                console.error('openModalAccesoBase: Error al obtener asesores:', data);
                if (asesoresList) {
                    asesoresList.innerHTML = '<div class="error">Error al cargar asesores: ' + (data.error || data.message || 'Error desconocido') + '</div>';
                }
            }
        })
        .catch(error => {
            console.error('openModalAccesoBase: Error al cargar asesores sin acceso:', error);
            if (asesoresList) {
                asesoresList.innerHTML = '<div class="error">Error de conexión al cargar asesores</div>';
            }
        });
}

function cargarAsesoresConAcceso(baseId) {
    console.log('cargarAsesoresConAcceso: Cargando asesores con acceso para base:', baseId);
    
    if (!baseId) {
        console.warn('cargarAsesoresConAcceso: Base ID no proporcionado');
        return;
    }
    
    fetch(`index.php?action=obtener_asesores_acceso_base&base_id=${baseId}`)
        .then(response => {
            console.log('cargarAsesoresConAcceso: Respuesta recibida. Status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('cargarAsesoresConAcceso: Datos recibidos:', data);
            
            if (data.success && data.asesores) {
                const asesoresIds = data.asesores.map(a => a.asesor_cedula || a.cedula);
                console.log('cargarAsesoresConAcceso: Asesores con acceso:', asesoresIds);
                
                const checkboxes = document.querySelectorAll('.asesor-checkbox');
                console.log('cargarAsesoresConAcceso: Checkboxes encontrados:', checkboxes.length);
                
                checkboxes.forEach(cb => {
                    if (asesoresIds.includes(cb.value)) {
                        cb.checked = true;
                        console.log('cargarAsesoresConAcceso: Checkbox marcado para asesor:', cb.value);
                    }
                });
            } else {
                console.log('cargarAsesoresConAcceso: No hay asesores con acceso o error:', data);
            }
        })
        .catch(error => {
            console.error('cargarAsesoresConAcceso: Error al cargar asesores con acceso:', error);
        });
}

function guardarAccesoBase() {
    console.log('guardarAccesoBase: Iniciando proceso...');
    
    // Obtener base ID
    const baseIdElement = document.getElementById('modal-acceso-base-id');
    if (!baseIdElement) {
        console.error('guardarAccesoBase: Elemento modal-acceso-base-id no encontrado');
        mostrarError('Error interno: Campo de ID no encontrado');
        return;
    }
    
    const baseId = baseIdElement.value;
    console.log('guardarAccesoBase: Base ID obtenido:', baseId);
    
    if (!baseId || baseId.trim() === '') {
        console.error('guardarAccesoBase: Base ID vacío');
        mostrarError('ID de base no encontrado. Por favor, cierre y vuelva a abrir el modal.');
        return;
    }
    
    // Obtener checkboxes seleccionados
    const checkboxes = document.querySelectorAll('.asesor-checkbox:checked');
    console.log('guardarAccesoBase: Checkboxes encontrados:', checkboxes.length);
    
    if (checkboxes.length === 0) {
        console.warn('guardarAccesoBase: No hay asesores seleccionados');
        mostrarError('Por favor, seleccione al menos un asesor');
        return;
    }
    
    const asesoresIds = Array.from(checkboxes).map(cb => cb.value);
    console.log('guardarAccesoBase: Asesores seleccionados:', asesoresIds);
    
    // Crear FormData
    const formData = new FormData();
    formData.append('base_id', baseId);
    formData.append('asesores', JSON.stringify(asesoresIds));
    
    console.log('guardarAccesoBase: FormData creado. Base ID:', baseId, 'Asesores:', asesoresIds);
    
    // Obtener botón y deshabilitar
    const btnGuardar = document.getElementById('btn-guardar-acceso-base');
    if (!btnGuardar) {
        console.error('guardarAccesoBase: Botón btn-guardar-acceso-base no encontrado');
        mostrarError('Error interno: Botón no encontrado');
        return;
    }
    
    const btnTextOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    console.log('guardarAccesoBase: Enviando petición a index.php?action=guardar_acceso_base');
    
    // Enviar petición
    fetch('index.php?action=guardar_acceso_base', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('guardarAccesoBase: Respuesta recibida. Status:', response.status);
        console.log('guardarAccesoBase: Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.text().then(text => {
            console.log('guardarAccesoBase: Respuesta raw:', text);
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('guardarAccesoBase: Error al parsear JSON:', e);
                console.error('guardarAccesoBase: Texto recibido:', text);
                throw new Error('Respuesta no es JSON válido: ' + text.substring(0, 100));
            }
        });
    })
    .then(data => {
        console.log('guardarAccesoBase: Datos parseados:', data);
        
        if (data.success) {
            console.log('guardarAccesoBase: Éxito - Acceso guardado correctamente');
            mostrarNotificacion('success', `Acceso otorgado a ${asesoresIds.length} asesor(es) exitosamente`);
            
            // Recargar bases para reflejar cambios
            if (typeof cargarBases === 'function') {
                cargarBases();
            }
            
            // Cerrar modal
            closeModalAccesoBase();
        } else {
            console.error('guardarAccesoBase: Error del servidor:', data);
            const errorMsg = data.message || data.error || 'Error desconocido al guardar acceso';
            mostrarError('Error al guardar acceso: ' + errorMsg);
            
            // Si hay debug info, mostrarla en consola
            if (data.debug) {
                console.error('guardarAccesoBase: Debug info:', data.debug);
            }
        }
    })
    .catch(error => {
        console.error('guardarAccesoBase: Error en petición:', error);
        console.error('guardarAccesoBase: Stack:', error.stack);
        mostrarError('Error de conexión al guardar acceso: ' + error.message);
    })
    .finally(() => {
        console.log('guardarAccesoBase: Finalizando...');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = btnTextOriginal;
        }
    });
}

function closeModalAccesoBase() {
    document.getElementById('modal-acceso-base').style.display = 'none';
}

function openModalVerClientes(baseId, baseNombre) {
    console.log('openModalVerClientes: Abriendo modal. Base ID:', baseId, 'Nombre:', baseNombre);
    
    const modal = document.getElementById('modal-ver-clientes');
    if (!modal) {
        console.error('openModalVerClientes: Modal no encontrado');
        return;
    }
    
    // Establecer nombre
    const nombreElement = document.getElementById('modal-ver-clientes-nombre');
    if (nombreElement) {
        nombreElement.textContent = baseNombre;
    }
    
    // Mostrar modal
    modal.style.display = 'block';
    console.log('openModalVerClientes: Modal mostrado');
    
    // Asegurarse de que el tbody existe antes de continuar
    const tbody = document.getElementById('modal-clientes-tbody');
    if (!tbody) {
        console.error('openModalVerClientes: Tbody no encontrado después de abrir modal');
    } else {
        console.log('openModalVerClientes: Tbody encontrado correctamente');
    }
}

function closeModalVerClientes() {
    document.getElementById('modal-ver-clientes').style.display = 'none';
}

// Función para ver asesores con acceso a una base
function verAsesoresAccesoBase(baseId, baseNombre) {
    console.log(`verAsesoresAccesoBase: Ver asesores con acceso. Base ID: ${baseId}, Nombre: ${baseNombre}`);
    
    // Verificar que el modal existe
    const modal = document.getElementById('modal-ver-asesores-acceso');
    if (!modal) {
        console.error('verAsesoresAccesoBase: Modal modal-ver-asesores-acceso no encontrado');
        mostrarError('Error: Modal no encontrado');
        return;
    }
    
    // Establecer valores en el modal
    const nombreElement = document.getElementById('modal-ver-asesores-base-nombre');
    const idElement = document.getElementById('modal-ver-asesores-base-id');
    const tbody = document.getElementById('modal-ver-asesores-tbody');
    
    if (!nombreElement || !idElement || !tbody) {
        console.error('verAsesoresAccesoBase: Elementos del modal no encontrados');
        mostrarError('Error: Elementos del modal no encontrados');
        return;
    }
    
    // Establecer valores
    nombreElement.textContent = baseNombre;
    idElement.value = baseId;
    
    // Mostrar modal
    modal.style.display = 'block';
    
    // Mostrar loading
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Cargando asesores...</td></tr>';
    
    // Cargar asesores con acceso
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('verAsesoresAccesoBase: Datos recibidos:', data);
            
            if (data.success && data.asesores) {
                mostrarAsesoresEnModal(data.asesores, baseId, baseNombre);
            } else {
                const errorMsg = data.message || data.error || 'Error desconocido al cargar asesores';
                tbody.innerHTML = `<tr><td colspan="4" class="text-center alert alert-danger">Error: ${errorMsg}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('verAsesoresAccesoBase: Error al cargar asesores:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center alert alert-danger">Error de conexión al cargar asesores</td></tr>';
        });
}

// Función para mostrar asesores en el modal
function mostrarAsesoresEnModal(asesores, baseId, baseNombre) {
    const tbody = document.getElementById('modal-ver-asesores-tbody');
    const totalElement = document.getElementById('modal-ver-asesores-total');
    
    if (!tbody) {
        console.error('mostrarAsesoresEnModal: Tbody no encontrado');
        return;
    }
    
    // Actualizar contador
    if (totalElement) {
        totalElement.textContent = asesores.length;
    }
    
    if (!asesores || asesores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <i class="fas fa-info-circle"></i>
                    <p>No hay asesores con acceso a esta base</p>
                    <small>Para dar acceso, use el botón "Dar Acceso" en la tabla de bases</small>
                </td>
            </tr>
        `;
        return;
    }
    
    // Crear filas de asesores
    tbody.innerHTML = asesores.map(asesor => {
        const cedula = (asesor && (asesor.asesor_cedula || asesor.cedula)) ? String(asesor.asesor_cedula || asesor.cedula) : '';
        const nombre = (asesor && (asesor.nombre_completo || asesor.nombre)) ? String(asesor.nombre_completo || asesor.nombre) : '-';
        const usuario = (asesor && asesor.usuario) ? String(asesor.usuario) : '-';
        const inicial = nombre && nombre !== '-' ? nombre.charAt(0).toUpperCase() : 'A';
        const safeNombre = nombre.replace(/'/g, "\\'");
        return `
        <tr data-asesor-cedula="${cedula}">
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 35px; height: 35px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #00c0e1); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${inicial}
                    </div>
                    <strong>${nombre}</strong>
                </div>
            </td>
            <td>${usuario}</td>
            <td>${cedula || '-'}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="liberarAccesoAsesor(${baseId}, '${cedula}', '${safeNombre}')" title="Liberar Acceso">
                    <i class="fas fa-unlock"></i> Liberar
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// Función para liberar acceso de un asesor
function liberarAccesoAsesor(baseId, asesorCedula, asesorNombre) {
    const confirmacion = confirm(`¿Está seguro que desea quitarle el acceso a "${asesorNombre}"?\n\nEste asesor ya no podrá acceder a los clientes de esta base.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Mostrar loading en el botón
    const botones = document.querySelectorAll(`[onclick*="liberarAccesoAsesor(${baseId}, '${asesorCedula}'"]`);
    botones.forEach(btn => {
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        // Liberar acceso
        fetch('index.php?action=liberar_acceso_base', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `base_id=${baseId}&asesor_cedula=${asesorCedula}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacion('success', `Acceso liberado para ${asesorNombre}`);
                // Recargar la lista de asesores
                const nombreElement = document.getElementById('modal-ver-asesores-base-nombre');
                const baseNombre = nombreElement ? nombreElement.textContent : '';
                verAsesoresAccesoBase(baseId, baseNombre);
                // Recargar bases para actualizar contadores
                if (typeof cargarBases === 'function') {
                    cargarBases();
                }
            } else {
                mostrarError('Error al liberar acceso: ' + (data.message || data.error));
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        })
        .catch(error => {
            console.error('Error al liberar acceso:', error);
            mostrarError('Error de conexión al liberar acceso');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        });
    });
}

// Función para cerrar el modal de ver asesores
function cerrarModalVerAsesores() {
    document.getElementById('modal-ver-asesores-acceso').style.display = 'none';
}

// Lista completa de clientes del modal "Ver clientes" (para filtrar sin volver a pedir al servidor)
let _clientesModalVerClientes = [];

function mostrarClientesEnModal(clientes, baseNombre, totalEnBase) {
    console.log('mostrarClientesEnModal: Mostrando clientes. Lista:', clientes?.length || 0, 'Total en base:', totalEnBase);
    
    const tbody = document.getElementById('modal-clientes-tbody');
    if (!tbody) {
        console.error('mostrarClientesEnModal: Elemento modal-clientes-tbody no encontrado');
        const modalBody = document.getElementById('modal-ver-clientes-body');
        if (modalBody) {
            modalBody.innerHTML = '<div class="alert alert-danger">Error: Elemento de tabla no encontrado</div>';
        }
        return;
    }
    
    _clientesModalVerClientes = clientes || [];
    _clientesModalTotalEnBase = totalEnBase != null ? totalEnBase : _clientesModalVerClientes.length;
    
    const inputBusqueda = document.getElementById('modal-ver-clientes-busqueda');
    if (inputBusqueda) {
        inputBusqueda.value = '';
        inputBusqueda.removeEventListener('input', _filtrarClientesModalHandler);
        inputBusqueda.removeEventListener('input', _busquedaClientesModalServidor);
        inputBusqueda.addEventListener('input', _filtrarClientesModalHandler);
        inputBusqueda.addEventListener('input', _busquedaClientesModalServidor);
    }
    
    _renderizarClientesEnModal(_clientesModalVerClientes);
    
    const totalElement = document.getElementById('modal-clientes-total');
    if (totalElement) {
        if (_clientesModalTotalEnBase > _clientesModalVerClientes.length) {
            totalElement.textContent = 'Mostrando ' + _clientesModalVerClientes.length + ' de ' + _clientesModalTotalEnBase + ' (use búsqueda para filtrar)';
        } else {
            totalElement.textContent = _clientesModalVerClientes.length;
        }
    }
}

let _clientesModalTotalEnBase = 0;
let _busquedaClientesModalTimeout = null;
function _busquedaClientesModalServidor() {
    const input = document.getElementById('modal-ver-clientes-busqueda');
    const baseId = window._modalVerClientesBaseId;
    const baseNombre = window._modalVerClientesBaseNombre;
    if (!input || !baseId) return;
    clearTimeout(_busquedaClientesModalTimeout);
    const term = (input.value || '').trim();
    _busquedaClientesModalTimeout = setTimeout(function() {
        const tbody = document.getElementById('modal-clientes-tbody');
        const url = term.length >= 2
            ? 'index.php?action=obtener_clientes_base&base_id=' + baseId + '&busqueda=' + encodeURIComponent(term)
            : 'index.php?action=obtener_clientes_base&base_id=' + baseId;
        if (term.length >= 2 && tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Buscando...</td></tr>';
        fetch(url).then(function(r) { return r.json(); }).then(function(data) {
            if (data.success && data.clientes) {
                mostrarClientesEnModal(data.clientes, baseNombre, data.total);
            }
        }).catch(function() {
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center alert alert-danger">Error al buscar</td></tr>';
        });
    }, term.length >= 2 ? 400 : 0);
}

function _filtrarClientesModalHandler() {
    const termino = (document.getElementById('modal-ver-clientes-busqueda')?.value || '').trim().toLowerCase();
    if (!termino) {
        _renderizarClientesEnModal(_clientesModalVerClientes);
        const totalElement = document.getElementById('modal-clientes-total');
        if (totalElement) totalElement.textContent = _clientesModalVerClientes.length;
        return;
    }
    const filtrados = _clientesModalVerClientes.filter(cliente => {
        const cc = String(cliente.cedula || cliente.IDENTIFICACION || cliente.cc || '').toLowerCase();
        const nombre = String(cliente.nombre || cliente['NOMBRE CONTRATANTE'] || '').toLowerCase();
        const cels = [cliente.tel1, cliente.CELULAR, cliente.cel1, cliente.tel2, cliente.tel3, cliente.tel4, cliente.tel5]
            .filter(Boolean)
            .map(c => String(c).toLowerCase());
        const textoBusqueda = [cc, nombre, ...cels].join(' ');
        return textoBusqueda.indexOf(termino) !== -1;
    });
    _renderizarClientesEnModal(filtrados);
    const totalElement = document.getElementById('modal-clientes-total');
    if (totalElement) {
        totalElement.textContent = _clientesModalVerClientes.length !== filtrados.length
            ? (filtrados.length + ' de ' + _clientesModalVerClientes.length)
            : filtrados.length;
    }
}

function _renderizarClientesEnModal(clientes) {
    const tbody = document.getElementById('modal-clientes-tbody');
    if (!tbody) return;
    
    if (!clientes || clientes.length === 0) {
        const msg = _clientesModalVerClientes.length === 0 ? 'No hay clientes en esta base' : 'No hay clientes que coincidan con la búsqueda';
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">${msg}</td></tr>`;
        return;
    }
    
    console.log('_renderizarClientesEnModal: Renderizando', clientes.length, 'clientes');
    if (clientes.length > 0) {
        console.log('_renderizarClientesEnModal: Primer cliente (estructura):', Object.keys(clientes[0]));
        console.log('_renderizarClientesEnModal: Primer cliente (valores):', clientes[0]);
    }
    
    const idCliente = (c) => c.id != null ? c.id : (c.id_cliente != null ? c.id_cliente : (c.ID_CLIENTE != null ? c.ID_CLIENTE : c.ID_COMERCIO));
    const valorOMostrar = (val, fallback = '-') => {
        if (val === null || val === undefined || val === '') return fallback;
        const str = String(val).trim();
        return str === '' ? fallback : str;
    };
    tbody.innerHTML = clientes.map(cliente => {
        const id = idCliente(cliente);
        const cedula = valorOMostrar(cliente.cedula || cliente.IDENTIFICACION || cliente.cc);
        // Priorizar nombre del servidor, luego alternativas
        const nombre = valorOMostrar(
            cliente.nombre || 
            cliente['NOMBRE CONTRATANTE'] || 
            cliente.nombre_completo ||
            (cliente.cedula ? `Cliente ${cliente.cedula}` : 'Sin nombre')
        );
        const telefono = valorOMostrar(cliente.tel1 || cliente.CELULAR || cliente.cel1);
        return `<tr>
            <td>${cedula}</td>
            <td>${nombre}</td>
            <td>${telefono}</td>
            <td><button type="button" class="btn btn-sm btn-outline-primary" onclick="verDetalleClienteModal(${id})" title="Ver obligaciones del cliente"><i class="fas fa-eye"></i></button></td>
        </tr>`;
    }).join('');
}

function _fmtDetalleNumero(n) {
    if (n == null || n === '' || n === undefined) return '-';
    const num = parseFloat(n);
    return isNaN(num) ? '-' : num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _fmtDetalleTexto(v) {
    const s = (v == null ? '' : String(v)).trim();
    return s === '' || s === '-' ? '-' : s;
}

function _fmtDetalleFecha(v) {
    const s = _fmtDetalleTexto(v);
    if (s === '-') return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const p = s.substring(0, 10).split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return s;
}

function _renderFilaDetalleObligacion(label, valor, esMonto, resaltarCompra) {
    const claseMonto = esMonto ? ' detalle-obligacion-valor-monto' : '';
    const claseCompra = resaltarCompra ? ' detalle-obligacion-valor-compra' : '';
    const claseFila = resaltarCompra ? ' detalle-obligacion-fila-compra' : '';
    return `<div class="detalle-obligacion-fila${claseFila}">
        <span class="detalle-obligacion-label">${label}</span>
        <span class="detalle-obligacion-valor${claseMonto}${claseCompra}">${valor}</span>
    </div>`;
}

function _renderSeccionDetalleObligacion(titulo, filasHtml) {
    if (!filasHtml) return '';
    return `<div class="detalle-obligacion-seccion">
        <h5>${titulo}</h5>
        <div class="detalle-obligacion-campos">${filasHtml}</div>
    </div>`;
}

function _filasDetalleObligacion(items) {
    const normTxt = (v) => _fmtDetalleTexto(v);
    const normMonto = (v) => {
        if (v == null || v === '') return '-';
        const n = parseFloat(v);
        return isNaN(n) ? '-' : n.toFixed(2);
    };
    const seen = new Set();
    const out = [];
    for (const item of items) {
        if (!item) continue;
        const raw = item.raw != null ? item.raw : item.valor;
        const isEmptyMonto = item.monto && (raw == null || raw === '' || (typeof raw === 'string' && String(raw).trim() === ''));
        const isEmptyTexto = !item.monto && normTxt(raw) === '-';
        if (isEmptyMonto || isEmptyTexto) {
            continue;
        }
        // Dedupe por etiqueta + valor (evita ocultar montos distintos con el mismo número, p. ej. saldo capital vs saldo actual)
        const dedupeKey = (item.label || '') + '|' + (item.monto ? 'm:' + normMonto(raw) : 't:' + normTxt(raw));
        if (seen.has(dedupeKey)) {
            continue;
        }
        seen.add(dedupeKey);
        out.push(_renderFilaDetalleObligacion(item.label, item.valor, item.monto, item.resaltarCompra === true));
    }
    return out.join('');
}

function _htmlDetalleObligacionCard(ob, index) {
    const op = _fmtDetalleTexto(ob.operacion);
    const compra = _fmtDetalleTexto(ob.compra || ob.oficina);
    const tipoProducto = _fmtDetalleTexto(ob.tipo_producto || ob.concepto_mes_actual);
    const anoCastigo = _fmtDetalleTexto(ob.ano_castigo || ob['año_castigo'] || ob.anos_castigo);
    const saldoCapital = ob.saldo_capital != null && ob.saldo_capital !== '' ? ob.saldo_capital : ob.total;
    const saldoCapitalActual = ob.saldo_capital_actual != null && ob.saldo_capital_actual !== ''
        ? ob.saldo_capital_actual
        : saldoCapital;
    const totalOblig = ob.total_obligacion != null && ob.total_obligacion !== '' ? ob.total_obligacion : ob.total_a_pagar;

    const secIdent = _renderSeccionDetalleObligacion('Identificación', _filasDetalleObligacion([
        { label: 'No. operación', valor: op, raw: op },
        { label: 'Cuenta cliente cartera', valor: _fmtDetalleTexto(ob.cuenta_cliente || ob.cuenta), raw: ob.cuenta_cliente || ob.cuenta },
        { label: 'Ident. crédito', valor: _fmtDetalleTexto(ob.ident_credito), raw: ob.ident_credito },
        { label: 'Tipo cliente', valor: _fmtDetalleTexto(ob.tipo_cliente), raw: ob.tipo_cliente },
    ]));

    const secCartera = _renderSeccionDetalleObligacion('Cartera y producto', _filasDetalleObligacion([
        { label: 'Dueño cartera', valor: _fmtDetalleTexto(ob.dueno_cartera), raw: ob.dueno_cartera },
        { label: 'Cartera', valor: _fmtDetalleTexto(ob.cartera), raw: ob.cartera },
        { label: 'Compra', valor: compra, raw: ob.compra || ob.oficina, resaltarCompra: true },
        { label: 'Tipo producto', valor: tipoProducto, raw: ob.tipo_producto || ob.concepto_mes_actual },
        { label: 'Ciudad origen crédito', valor: _fmtDetalleTexto(ob.ciudad_origen_credito), raw: ob.ciudad_origen_credito },
        { label: 'Estado jurídico', valor: _fmtDetalleTexto(ob.estado_proceso_juridico), raw: ob.estado_proceso_juridico },
    ]));

    const filasMontos = [
        { label: 'Valor desembolso', valor: _fmtDetalleNumero(ob.valor_desembolso), raw: ob.valor_desembolso, monto: true },
        { label: 'Saldo capital', valor: _fmtDetalleNumero(saldoCapital), raw: saldoCapital, monto: true },
    ];
    filasMontos.push({
        label: 'Saldo de capital actual',
        valor: _fmtDetalleNumero(saldoCapitalActual),
        raw: saldoCapitalActual,
        monto: true,
    });
    filasMontos.push(
        { label: 'Intereses corrientes', valor: _fmtDetalleNumero(ob.intereses_corrientes), raw: ob.intereses_corrientes, monto: true },
        { label: 'Intereses mora', valor: _fmtDetalleNumero(ob.intereses_mora), raw: ob.intereses_mora, monto: true },
        { label: 'Seguros', valor: _fmtDetalleNumero(ob.seguros), raw: ob.seguros, monto: true },
        { label: 'Otros conceptos', valor: _fmtDetalleNumero(ob.otros_conceptos), raw: ob.otros_conceptos, monto: true },
        { label: 'Total obligación', valor: _fmtDetalleNumero(totalOblig), raw: totalOblig, monto: true },
        { label: 'Valor cuota', valor: _fmtDetalleNumero(ob.valor_cuota), raw: ob.valor_cuota, monto: true }
    );
    const secMontos = _renderSeccionDetalleObligacion('Montos', _filasDetalleObligacion(filasMontos));

    const secCuotas = _renderSeccionDetalleObligacion('Cuotas y condiciones', _filasDetalleObligacion([
        { label: 'Reestructurado', valor: _fmtDetalleTexto(ob.reestructurado), raw: ob.reestructurado },
        { label: 'Tasa', valor: _fmtDetalleTexto(ob.tasa), raw: ob.tasa },
        { label: 'Cuotas pactadas', valor: _fmtDetalleTexto(ob.cuotas_pactadas), raw: ob.cuotas_pactadas },
        { label: 'Cuotas pagadas', valor: _fmtDetalleTexto(ob.cuotas_pagadas), raw: ob.cuotas_pagadas },
        { label: 'Cuotas restantes', valor: _fmtDetalleTexto(ob.cuotas_restantes), raw: ob.cuotas_restantes },
        { label: 'Año castigo', valor: anoCastigo, raw: anoCastigo },
    ]));

    const secFechas = _renderSeccionDetalleObligacion('Fechas', _filasDetalleObligacion([
        { label: 'Fecha desembolso', valor: _fmtDetalleFecha(ob.fecha_desembolso), raw: ob.fecha_desembolso },
        { label: 'Fecha inicio mora', valor: _fmtDetalleFecha(ob.fecha_inicio_mora), raw: ob.fecha_inicio_mora },
        { label: 'Fecha vencimiento final', valor: _fmtDetalleFecha(ob.fecha_vencimiento_final), raw: ob.fecha_vencimiento_final },
        { label: 'Fecha castigo', valor: _fmtDetalleFecha(ob.fecha_castigo), raw: ob.fecha_castigo },
        { label: 'Fecha último pago', valor: _fmtDetalleFecha(ob.fecha_ultimo_pago), raw: ob.fecha_ultimo_pago },
        { label: 'Fecha días mora', valor: _fmtDetalleFecha(ob.fecha_dias_mora), raw: ob.fecha_dias_mora },
    ]));

    return `<article class="detalle-obligacion-card">
        <div class="detalle-obligacion-card-header">Obligación ${index + 1} — Operación ${op}</div>
        ${secIdent}${secCartera}${secMontos}${secCuotas}${secFechas}
    </article>`;
}

function verDetalleClienteModal(clienteId) {
    const modal = document.getElementById('modal-detalle-cliente');
    const loading = document.getElementById('modal-detalle-cliente-loading');
    const content = document.getElementById('modal-detalle-cliente-content');
    if (!modal || !loading || !content) return;
    modal.style.display = 'flex';
    loading.style.display = 'block';
    content.style.display = 'none';
    fetch(`index.php?action=detalle_cliente_coordinador&cliente_id=${encodeURIComponent(clienteId)}`)
        .then(r => r.json())
        .then(data => {
            loading.style.display = 'none';
            content.style.display = 'block';
            if (!data.success || !data.cliente) {
                content.innerHTML = '<div class="alert alert-danger">' + (data.message || 'Error al cargar el cliente') + '</div>';
                return;
            }
            const c = data.cliente;
            document.getElementById('detalle-cliente-cc').textContent = c.cedula || c.cc || '-';
            const nombreCliente = c.nombre || c.nombre_completo || (c.cedula ? `Cliente ${c.cedula}` : 'Sin nombre');
            document.getElementById('detalle-cliente-nombre').textContent = nombreCliente;
            const ciudadEl = document.getElementById('detalle-cliente-ciudad');
            if (ciudadEl) {
                ciudadEl.textContent = (c.ciudad || c.barrio || '').trim() || '-';
            }
            const sectorEl = document.getElementById('detalle-cliente-sector');
            if (sectorEl) {
                sectorEl.textContent = (c.sector || '').trim() || '-';
            }
            document.getElementById('detalle-cliente-email').textContent = (c.email || '').trim() || '-';
            const tels = [];
            for (let i = 1; i <= 10; i++) {
                const t = (c['tel' + i] || '').trim();
                if (t && t !== '-') tels.push(t);
            }
            const telContainer = document.getElementById('detalle-cliente-telefonos');
            if (telContainer) {
                telContainer.innerHTML = tels.length === 0
                    ? '<span style="color: #666;">-</span>'
                    : tels.map(t => `<span>${t}</span>`).join('');
            }
            const lista = document.getElementById('detalle-cliente-obligaciones-list');
            const sinObl = document.getElementById('detalle-cliente-sin-obligaciones');
            const countBadge = document.getElementById('detalle-cliente-obligaciones-count');
            const obligaciones = data.obligaciones || [];
            if (countBadge) countBadge.textContent = String(obligaciones.length);
            if (!lista || !sinObl) return;
            if (obligaciones.length === 0) {
                lista.innerHTML = '';
                sinObl.style.display = 'block';
            } else {
                sinObl.style.display = 'none';
                lista.innerHTML = obligaciones.map((ob, i) => _htmlDetalleObligacionCard(ob, i)).join('');
            }
        })
        .catch(() => {
            loading.style.display = 'none';
            content.style.display = 'block';
            content.innerHTML = '<div class="alert alert-danger">Error de conexión al cargar el detalle.</div>';
        });
}

function closeModalDetalleCliente() {
    const modal = document.getElementById('modal-detalle-cliente');
    if (modal) modal.style.display = 'none';
}

// Funciones verDetalleTarea y completarTarea eliminadas - ya no se usan en la nueva estructura

// ========================================
// FUNCIÓN DE VERIFICACIÓN DE TABLAS
// ========================================

function verificarTablas() {
    console.log('Coord_gestion.js: Verificando tablas...');
    
    fetch('index.php?action=verificar_tablas')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Resultado verificación:', data);
            
            if (data.success) {
                console.log(`Coord_gestion.js: Tablas OK - Comercios: ${data.total_comercios}, Facturas: ${data.total_facturas}`);
                // Cargar datos iniciales
                cargarBases();
            } else {
                console.error('Coord_gestion.js: Error en verificación:', data.error);
                mostrarErrorTablas(data);
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error al verificar tablas:', error);
            mostrarError('Error de conexión al verificar tablas');
        });
}

function mostrarErrorTablas(data) {
    const mensaje = `
        <div class="alert alert-danger">
            <h4><i class="fas fa-exclamation-triangle"></i> Error de Configuración</h4>
            <p><strong>Problema:</strong> ${data.error}</p>
            <p><strong>Instrucciones:</strong> ${data.instrucciones}</p>
            <hr>
            <p><strong>Pasos a seguir:</strong></p>
            <ol>
                <li>Abra la terminal/consola</li>
                <li>Ejecute el comando: <code>mysql -u root -p crediBanco < database/crear_tablas_simple.sql</code></li>
                <li>Ingrese la contraseña de MySQL cuando se solicite</li>
                <li>Recargue esta página</li>
            </ol>
        </div>
    `;
    
    // Mostrar en la pestaña de bases
    const basesTbody = document.getElementById('bases-tbody');
    if (basesTbody) {
        basesTbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    ${mensaje}
                </td>
            </tr>
        `;
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coord_gestion.js: Inicializando página...');
    
    // Verificar tablas antes de cargar datos
    verificarTablas();
    
    // Cargar bases existentes para el select de carga existente
    cargarBasesExistentes();
    
    // Cargar estadísticas de bases al iniciar
    cargarEstadisticasBases();
    
    // Enlazar botón "Asignar desde CSV" para que responda al clic
    bindBotonAsignarCsv();
    
    console.log('Coord_gestion.js: Página inicializada');
});

// ========================================
// FUNCIONES DE FILTROS AVANZADOS POR OBLIGACIONES
// ========================================

let filtrosAplicados = null;
let clientesFiltrados = [];

function abrirModalFiltros() {
    const baseId = document.getElementById('select-base-clientes').value;
    const asesorId = document.getElementById('select-asesor').value;
    
    if (!baseId || !asesorId) {
        mostrarError('Debe seleccionar una base y un asesor primero');
        return;
    }
    
    const modal = document.getElementById('modal-filtros-obligaciones');
    if (modal) {
        modal.style.display = 'block';
        cargarValoresFiltros(baseId);
    }
}

function cerrarModalFiltros() {
    const modal = document.getElementById('modal-filtros-obligaciones');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleFiltro(tipo) {
    const checkboxId = tipo === 'ano_castigo' ? 'filtro-ano-castigo-activo' : 
                       tipo === 'concepto' ? 'filtro-concepto-activo' :
                       tipo === 'estado_proceso' ? 'filtro-estado-proceso-activo' :
                       tipo === 'total_pagar' ? 'filtro-total-pagar-activo' :
                       `filtro-${tipo}-activo`;
    
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) return;
    
    // Habilitar/deshabilitar los campos correspondientes
    if (tipo === 'oficina') {
        document.getElementById('filtro-oficina').disabled = !checkbox.checked;
    } else if (tipo === 'ano_castigo') {
        document.getElementById('filtro-ano-castigo').disabled = !checkbox.checked;
    } else if (tipo === 'concepto') {
        document.getElementById('filtro-concepto').disabled = !checkbox.checked;
    } else if (tipo === 'estado_proceso') {
        document.getElementById('filtro-estado-proceso').disabled = !checkbox.checked;
    } else if (tipo === 'total') {
        document.getElementById('filtro-total-operador').disabled = !checkbox.checked;
        document.getElementById('filtro-total-valor').disabled = !checkbox.checked;
    } else if (tipo === 'total_pagar') {
        document.getElementById('filtro-total-pagar-operador').disabled = !checkbox.checked;
        document.getElementById('filtro-total-pagar-valor').disabled = !checkbox.checked;
    }
}

function cargarValoresFiltros(baseId) {
    // Cargar valores únicos para cada campo
    fetch(`index.php?action=obtener_valores_filtros&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Cargar oficinas
                const selectOficina = document.getElementById('filtro-oficina');
                if (selectOficina && data.oficinas) {
                    selectOficina.innerHTML = '<option value="">Todas las oficinas</option>';
                    data.oficinas.forEach(oficina => {
                        const option = document.createElement('option');
                        option.value = oficina;
                        option.textContent = oficina;
                        selectOficina.appendChild(option);
                    });
                }
                
                // Cargar años de castigo
                const selectAno = document.getElementById('filtro-ano-castigo');
                if (selectAno && data.anos_castigo) {
                    selectAno.innerHTML = '<option value="">Todos los años</option>';
                    data.anos_castigo.sort((a, b) => b - a).forEach(ano => {
                        const option = document.createElement('option');
                        option.value = ano;
                        option.textContent = ano;
                        selectAno.appendChild(option);
                    });
                }
                
                // Cargar conceptos
                const selectConcepto = document.getElementById('filtro-concepto');
                if (selectConcepto && data.conceptos) {
                    selectConcepto.innerHTML = '<option value="">Todos los conceptos</option>';
                    data.conceptos.forEach(concepto => {
                        const option = document.createElement('option');
                        option.value = concepto;
                        option.textContent = concepto;
                        selectConcepto.appendChild(option);
                    });
                }
                // Cargar valores de tipificación (historial_gestion: canal, nivel1, nivel2)
                const labelCanal = { llamada_saliente: 'Llamada saliente', whatsapp: 'WhatsApp', email: 'Email', recibir_llamada: 'Recibir llamada' };
                const selectCanal = document.getElementById('filtro-canal-contacto');
                if (selectCanal) {
                    selectCanal.innerHTML = '<option value="">Todos / Sin filtrar</option>';
                    (data.canales_contacto || []).forEach(canal => {
                        const option = document.createElement('option');
                        option.value = canal;
                        option.textContent = labelCanal[canal] || canal;
                        selectCanal.appendChild(option);
                    });
                }
                const selectNivel1 = document.getElementById('filtro-nivel1-tipo');
                if (selectNivel1) {
                    selectNivel1.innerHTML = '<option value="">Todos / Sin filtrar</option>';
                    (data.nivel1_tipos || []).forEach(t => {
                        const option = document.createElement('option');
                        option.value = t;
                        option.textContent = t;
                        selectNivel1.appendChild(option);
                    });
                }
                const selectNivel2 = document.getElementById('filtro-nivel2-tipo');
                if (selectNivel2) {
                    selectNivel2.innerHTML = '<option value="">Todos / Sin filtrar</option>';
                    (data.nivel2_tipos || []).forEach(t => {
                        const option = document.createElement('option');
                        option.value = t;
                        option.textContent = t;
                        selectNivel2.appendChild(option);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar valores de filtros:', error);
        });
}

function aplicarFiltros() {
    const baseId = document.getElementById('select-base-clientes').value;
    const asesorId = document.getElementById('select-asesor').value;
    
    if (!baseId || !asesorId) {
        mostrarError('Debe seleccionar una base y un asesor');
        return;
    }
    
    // Recopilar filtros activos
    const filtros = {};
    
    if (document.getElementById('filtro-oficina-activo').checked) {
        const valor = document.getElementById('filtro-oficina').value;
        if (valor) filtros.oficina = valor;
    }
    
    if (document.getElementById('filtro-ano-castigo-activo').checked) {
        const valor = document.getElementById('filtro-ano-castigo').value;
        if (valor) filtros.ano_castigo = valor;
    }
    
    if (document.getElementById('filtro-concepto-activo').checked) {
        const valor = document.getElementById('filtro-concepto').value;
        if (valor) filtros.concepto_mes_actual = valor;
    }
    
    if (document.getElementById('filtro-estado-proceso-activo').checked) {
        const valor = document.getElementById('filtro-estado-proceso').value;
        if (valor) filtros.estado_proceso_juridico = valor;
    }
    
    if (document.getElementById('filtro-total-activo').checked) {
        const operador = document.getElementById('filtro-total-operador').value;
        const valor = parseFloat(document.getElementById('filtro-total-valor').value);
        if (!isNaN(valor)) {
            filtros.total = { operador, valor };
        }
    }
    
    if (document.getElementById('filtro-total-pagar-activo').checked) {
        const operador = document.getElementById('filtro-total-pagar-operador').value;
        const valor = parseFloat(document.getElementById('filtro-total-pagar-valor').value);
        if (!isNaN(valor)) {
            filtros.total_a_pagar = { operador, valor };
        }
    }
    
    // Filtro por tipificación (canal, nivel1, nivel2 desde historial_gestion)
    const canalTipif = document.getElementById('filtro-canal-contacto') && document.getElementById('filtro-canal-contacto').value;
    const nivel1Tipif = document.getElementById('filtro-nivel1-tipo') && document.getElementById('filtro-nivel1-tipo').value;
    const nivel2Tipif = document.getElementById('filtro-nivel2-tipo') && document.getElementById('filtro-nivel2-tipo').value;
    if (canalTipif) filtros.canal_contacto = canalTipif;
    if (nivel1Tipif) filtros.nivel1_tipo = nivel1Tipif;
    if (nivel2Tipif) filtros.nivel2_tipo = nivel2Tipif;
    
    if (Object.keys(filtros).length === 0) {
        mostrarError('Debe seleccionar al menos un filtro (obligaciones o tipificación)');
        return;
    }
    
    // Incluir clientes en tareas pendientes (checkbox)
    const incluirEnTareasPendientes = document.getElementById('filtro-incluir-en-tareas-pendientes') && document.getElementById('filtro-incluir-en-tareas-pendientes').checked;
    
    // Aplicar filtros en el servidor
    const formData = new FormData();
    formData.append('base_id', baseId);
    formData.append('asesor_cedula', asesorId);
    formData.append('filtros', JSON.stringify(filtros));
    if (incluirEnTareasPendientes) {
        formData.append('incluir_en_tareas_pendientes', '1');
    }
    
    fetch('index.php?action=aplicar_filtros_obligaciones', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            filtrosAplicados = filtros;
            clientesFiltrados = data.clientes || [];
            
            // Mostrar resultados
            document.getElementById('resultados-filtro').style.display = 'block';
            document.getElementById('resultados-cantidad').textContent = data.total_clientes || 0;
            document.getElementById('resultados-obligaciones').textContent = data.total_obligaciones || 0;
            
            // Actualizar info de filtros activos
            const filtrosInfo = document.getElementById('filtros-activos-info');
            if (filtrosInfo) {
                filtrosInfo.style.display = 'block';
                filtrosInfo.innerHTML = `<small class="text-success"><i class="fas fa-check"></i> Filtros aplicados: ${Object.keys(filtros).length} filtro(s)</small>`;
            }
            
            mostrarNotificacion('success', `Se encontraron ${data.total_clientes} clientes con los filtros aplicados`);
        } else {
            mostrarError('Error al aplicar filtros: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error al aplicar filtros:', error);
        mostrarError('Error de conexión al aplicar filtros');
    });
}

function limpiarFiltros() {
    // Desmarcar todos los checkboxes y deshabilitar campos
    const checkboxes = [
        { id: 'filtro-oficina-activo', tipo: 'oficina' },
        { id: 'filtro-ano-castigo-activo', tipo: 'ano_castigo' },
        { id: 'filtro-concepto-activo', tipo: 'concepto' },
        { id: 'filtro-estado-proceso-activo', tipo: 'estado_proceso' },
        { id: 'filtro-total-activo', tipo: 'total' },
        { id: 'filtro-total-pagar-activo', tipo: 'total_pagar' }
    ];
    
    checkboxes.forEach(item => {
        const checkbox = document.getElementById(item.id);
        if (checkbox) {
            checkbox.checked = false;
            toggleFiltro(item.tipo);
        }
    });
    
    // Limpiar valores
    const campos = [
        'filtro-oficina',
        'filtro-ano-castigo',
        'filtro-concepto',
        'filtro-estado-proceso',
        'filtro-total-valor',
        'filtro-total-pagar-valor'
    ];
    
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });
    
    // Resetear operadores a valores por defecto
    document.getElementById('filtro-total-operador').value = '>=';
    document.getElementById('filtro-total-pagar-operador').value = '>=';
    
    // Limpiar filtros de tipificación
    const selCanal = document.getElementById('filtro-canal-contacto');
    const selNivel1 = document.getElementById('filtro-nivel1-tipo');
    const selNivel2 = document.getElementById('filtro-nivel2-tipo');
    if (selCanal) selCanal.value = '';
    if (selNivel1) selNivel1.value = '';
    if (selNivel2) selNivel2.value = '';
    const chkIncluir = document.getElementById('filtro-incluir-en-tareas-pendientes');
    if (chkIncluir) chkIncluir.checked = false;
    
    // Ocultar resultados
    document.getElementById('resultados-filtro').style.display = 'none';
    filtrosAplicados = null;
    clientesFiltrados = [];
    
    const filtrosInfo = document.getElementById('filtros-activos-info');
    if (filtrosInfo) {
        filtrosInfo.style.display = 'none';
    }
}

function asignarClientesFiltrados(tipo) {
    const baseId = document.getElementById('select-base-clientes').value;
    const asesorCedula = document.getElementById('select-asesor').value;
    
    if (!baseId || !asesorCedula) {
        mostrarError('Debe seleccionar una base y un asesor');
        return;
    }
    
    if (!filtrosAplicados || clientesFiltrados.length === 0) {
        mostrarError('No hay clientes filtrados para asignar');
        return;
    }
    
    let cantidad = clientesFiltrados.length;
    const inputCantidad = document.getElementById('cantidad-asignar-filtro');
    if (tipo === 'parcial') {
        const valor = inputCantidad ? inputCantidad.value.trim() : '';
        cantidad = parseInt(valor, 10);
        if (isNaN(cantidad) || cantidad <= 0 || cantidad > clientesFiltrados.length) {
            mostrarError(`Debe ingresar una cantidad válida entre 1 y ${clientesFiltrados.length}`);
            return;
        }
    }
    
    const idsAEnviar = clientesFiltrados.slice(0, cantidad);
    
    const nombreTareaEl = document.getElementById('input-nombre-tarea');
    const nombreTarea = nombreTareaEl ? nombreTareaEl.value.trim() : '';
    
    const formData = new FormData();
    formData.append('base_id', baseId);
    formData.append('asesor_cedula', asesorCedula);
    formData.append('clientes_ids', JSON.stringify(idsAEnviar));
    if (tipo === 'parcial' && cantidad > 0) {
        formData.append('cantidad_asignar', cantidad);
    }
    formData.append('usar_filtros', '1');
    if (nombreTarea) formData.append('nombre_tarea', nombreTarea);
    
    fetch('index.php?action=crear_asignacion_clientes_filtrados', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', `Se asignaron ${cantidad} clientes exitosamente`);
            cerrarModalFiltros();
            limpiarFiltros();
            obtenerClientesDisponiblesParaAsignacion();
            limpiarAsignacion();
        } else {
            mostrarError('Error al asignar clientes: ' + (data.message || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error al asignar clientes filtrados:', error);
        mostrarError('Error de conexión al asignar clientes');
    });
}
