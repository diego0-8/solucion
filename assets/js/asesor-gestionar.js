// ========================================
// GESTIÓN DE CLIENTES - ASESOR (DATOS REALES)
// ========================================
// Formato Colombia: punto (.) = separador de miles, coma (,) = decimales. "231.310" = 231310 pesos; "231.310,50" = 231310,50
function parsePesosColombia(str) {
    if (!str || typeof str !== 'string') return 0;
    const s = String(str).trim().replace(/\s/g, '');
    const sinPuntos = s.replace(/\./g, '');
    const conPuntoDecimal = sinPuntos.replace(',', '.');
    const n = parseFloat(conPuntoDecimal);
    return isNaN(n) ? 0 : n;
}

let clienteId = null;
let clienteData = null;
let inicioGestion = null; // Registro de inicio de gestión
let sesionIdGestion = null; // ID de sesión para esta gestión
window.gestionGuardadaCorrectamente = false;
window.ultimaGestionGuardadaNumeroContacto = '';
/** Obligaciones cargadas para el cliente ({ id_obligacion, operacion }) — usado en acuerdos multi-obligación. */
window.obligacionesClienteActual = [];

function cantidadObligacionesCliente() {
    return (window.obligacionesClienteActual || []).length;
}

/** Obligaciones para tarjetas «acuerdo por obligación» (una, todas con subselección si aplica, o ninguna hasta elegir). */
function obtenerListaObligacionesParaTarjetasAcuerdo() {
    const todas = window.obligacionesClienteActual || [];
    if (todas.length <= 1) {
        return todas;
    }
    const sel = document.getElementById('contrato-gestionar');
    const v = sel ? String(sel.value || '').trim() : '';
    if (v === 'todas') {
        if (aplicaSubseleccionObligacionesTodasAcuerdo()) {
            const inner = document.getElementById('acuerdo-todas-obligaciones-checkboxes');
            if (!inner) return todas;
            const checked = inner.querySelectorAll('input.js-subcheck-obl:checked');
            const ids = new Set(Array.from(checked).map(function(c) { return String(c.value); }));
            return todas.filter(function(o) {
                return ids.has(String(o.id_obligacion));
            });
        }
        return todas;
    }
    if (v === '' || v === 'ninguna') {
        return [];
    }
    const idNum = parseInt(v, 10);
    if (idNum > 0) {
        return todas.filter(function(o) {
            return String(o.id_obligacion) === String(idNum);
        });
    }
    return todas;
}

function onContratoGestionarChange() {
    actualizarSubseleccionObligacionesTodasAcuerdo();
    renderizarAcuerdosPorObligacionSiAplica();
}

/** Subselección: «Todas» + ACUERDO DE PAGO + 3+ obligaciones (checkboxes bajo el selector). */
function aplicaSubseleccionObligacionesTodasAcuerdo() {
    const sel = document.getElementById('contrato-gestionar');
    const n1 = document.getElementById('tipo-contacto-nivel1');
    const v = sel ? String(sel.value || '').trim() : '';
    const v1 = n1 ? n1.value : '';
    return v === 'todas' && cantidadObligacionesCliente() >= 3 && esAcuerdoPagoNivel1Valor(v1);
}

function actualizarSubseleccionObligacionesTodasAcuerdo() {
    const wrapOuter = document.getElementById('acuerdo-todas-obligaciones-subseleccion-wrap');
    const inner = document.getElementById('acuerdo-todas-obligaciones-checkboxes');
    if (!wrapOuter || !inner) return;

    if (!aplicaSubseleccionObligacionesTodasAcuerdo()) {
        wrapOuter.style.display = 'none';
        inner.innerHTML = '';
        return;
    }

    const lista = window.obligacionesClienteActual || [];
    const prevChecked = {};
    inner.querySelectorAll('input.js-subcheck-obl').forEach(function(inp) {
        prevChecked[String(inp.value)] = inp.checked;
    });

    let html = '';
    lista.forEach(function(ob) {
        const id = ob.id_obligacion;
        const op = escapeHtmlAcuerdo(ob.operacion || String(id));
        const was = Object.prototype.hasOwnProperty.call(prevChecked, String(id)) ? prevChecked[String(id)] : true;
        const checkedAttr = was ? ' checked' : '';
        html += '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;font-size:13px;">' +
            '<input type="checkbox" class="js-subcheck-obl" value="' + String(id) + '"' + checkedAttr + '> ' +
            '<span>Obligación ' + op + '</span></label>';
    });
    inner.innerHTML = html;

    inner.querySelectorAll('input.js-subcheck-obl').forEach(function(inp) {
        inp.addEventListener('change', function() {
            renderizarAcuerdosPorObligacionSiAplica();
        });
    });

    wrapOuter.style.display = 'block';
}

function obtenerTodosIdsObligacionesValidosDelSelect() {
    const selectFacturas = document.getElementById('contrato-gestionar');
    if (!selectFacturas) return [];
    return Array.from(selectFacturas.options)
        .filter(function(opt) {
            const v = String(opt.value || '').trim();
            if (v === '' || v === 'todas' || v === 'ninguna') return false;
            const idNum = parseInt(v, 10);
            return idNum > 0;
        })
        .map(function(opt) { return opt.value; });
}

/**
 * IDs de obligación al guardar con «Todas las obligaciones».
 * @returns {{ ok: true, ids: string[] } | { ok: false, message: string }}
 */
function obtenerIdsObligacionesParaGuardarTodasAcuerdo(nivel1Codigo) {
    const idsFromSelect = obtenerTodosIdsObligacionesValidosDelSelect();
    if (!esAcuerdoPagoNivel1Valor(nivel1Codigo) || cantidadObligacionesCliente() < 3) {
        return { ok: true, ids: idsFromSelect };
    }
    if (!aplicaSubseleccionObligacionesTodasAcuerdo()) {
        return { ok: true, ids: idsFromSelect };
    }
    const inner = document.getElementById('acuerdo-todas-obligaciones-checkboxes');
    if (!inner) {
        return { ok: true, ids: idsFromSelect };
    }
    const checked = inner.querySelectorAll('input.js-subcheck-obl:checked');
    if (checked.length < 2) {
        return {
            ok: false,
            message: 'Debe mantener al menos 2 obligaciones marcadas para guardar cuando elige «Todas las obligaciones» con 3 o más obligaciones.'
        };
    }
    return { ok: true, ids: Array.from(checked).map(function(c) { return c.value; }) };
}

function configurarEnlacesSubseleccionObligacionesTodasAcuerdo() {
    const marcar = document.getElementById('acuerdo-subseleccion-marcar-todas');
    const desmarcar = document.getElementById('acuerdo-subseleccion-desmarcar-todas');
    const inner = document.getElementById('acuerdo-todas-obligaciones-checkboxes');
    if (marcar) {
        marcar.addEventListener('click', function(e) {
            e.preventDefault();
            if (!inner) return;
            inner.querySelectorAll('input.js-subcheck-obl').forEach(function(inp) {
                inp.checked = true;
            });
            renderizarAcuerdosPorObligacionSiAplica();
        });
    }
    if (desmarcar) {
        desmarcar.addEventListener('click', function(e) {
            e.preventDefault();
            if (!inner) return;
            inner.querySelectorAll('input.js-subcheck-obl').forEach(function(inp) {
                inp.checked = false;
            });
            renderizarAcuerdosPorObligacionSiAplica();
        });
    }
}

function normalizarNumeroContacto(numero) {
    if (numero === null || numero === undefined) return '';
    return String(numero).replace(/\D/g, '').substring(0, 20);
}

/**
 * Teléfono válido para el desplegable: solo dígitos, sin guiones ni símbolos,
 * y el primer dígito debe ser entre 1 y 9 (no puede empezar por 0).
 * @returns {string|null}
 */
function telefonoValidoParaSelector(numero) {
    const digits = normalizarNumeroContacto(numero);
    if (!digits || digits.charAt(0) === '0') {
        return null;
    }
    return digits;
}

function obtenerNumeroContactoSeleccionado() {
    const telefonoSelect = document.getElementById('telefono-select');
    if (!telefonoSelect || !telefonoSelect.value) return '';
    return normalizarNumeroContacto(telefonoSelect.value);
}

function hayCamposPerfilacionConDatos() {
    const idsBase = [
        'canal-contacto',
        'contrato-gestionar',
        'tipo-contacto-nivel1',
        'tipo-contacto-nivel2',
        'observaciones-texto'
    ];
    for (const id of idsBase) {
        const el = document.getElementById(id);
        if (!el) continue;
        const valor = String(el.value || '').trim();
        if (valor !== '') return true;
    }

    const idsAcuerdo = [
        'saldo-a-pagar',
        'descuento-monto',
        'descuento-porcentaje',
        'total-a-pagar-acuerdo',
        'fecha-limite-acuerdo',
        'simulador-monto',
        'simulador-num-cuotas',
        'simulador-valor-cuota',
        'acuerdo-comite-monto-propuesto',
        'acuerdo-comite-estado',
        'fecha-pago',
        'cuota-pago',
        'cuota-actual',
        'volver-llamar-fecha',
        'volver-llamar-hora'
    ];
    for (const id of idsAcuerdo) {
        const el = document.getElementById(id);
        if (!el) continue;
        const valor = String(el.value || '').trim();
        if (valor !== '') return true;
    }

    return false;
}

window.bloquearCambioClientePorGestionPendiente = function() {
    const ultimoNumeroGuardado = normalizarNumeroContacto(window.ultimaGestionGuardadaNumeroContacto || '');
    const numeroActual = obtenerNumeroContactoSeleccionado();
    const canalContactoEl = document.getElementById('canal-contacto');
    const canalContactoValor = canalContactoEl ? String(canalContactoEl.value || '').trim() : '';
    // Si no hay canal de contacto seleccionado, permitir cambiar de cliente.
    if (!canalContactoValor) return false;
    if (!ultimoNumeroGuardado || !numeroActual) return false;
    if (ultimoNumeroGuardado === numeroActual) return false;
    return hayCamposPerfilacionConDatos();
};

// Inicializar la vista cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Asesor_gestionar.js: Inicializando vista de gestión');
    
    // Obtener ID del cliente desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    clienteId = urlParams.get('cliente_id');
    
    if (!clienteId) {
        console.error('Asesor_gestionar.js: No se encontró ID del cliente');
        mostrarError('No se encontró el ID del cliente');
        return;
    }
    
    console.log('Asesor_gestionar.js: Cargando datos del cliente:', clienteId);
    
    // Registrar inicio de gestión del cliente
    iniciarGestionCliente();
    
    // Cargar datos del cliente
    cargarDatosCliente();
    
    // Cargar contratos
    cargarContratos();
    
    // Cargar historial
    cargarHistorial();
    configurarEnlacesSubseleccionObligacionesTodasAcuerdo();
    // El botón "Siguiente cliente" debe aparecer SOLO después de guardar la gestión
});

// ========================================
// CARGA DE DATOS REALES
// ========================================

function cargarDatosCliente() {
    console.log('Asesor_gestionar.js: Cargando datos del cliente:', clienteId);
    
    // Hacer petición AJAX para obtener datos reales
    fetch(`index.php?action=obtener_datos_cliente&cliente_id=${clienteId}`)
        .then(response => {
            console.log('Asesor_gestionar.js: Respuesta recibida:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Asesor_gestionar.js: Datos recibidos:', data);
            
            if (data.success) {
                console.log('Asesor_gestionar.js: Datos del cliente obtenidos:', data.cliente);
                const datosCliente = data.cliente;
                
                // Validar que datosCliente existe y tiene las propiedades necesarias
                if (!datosCliente) {
                    throw new Error('Datos del cliente no válidos');
                }
                
                // Actualizar datos personales con validaciones
                document.getElementById('cliente-nombre-completo').textContent = datosCliente.nombre || 'N/A';
                document.getElementById('cliente-cedula').textContent = datosCliente.cc || datosCliente.identificacion || 'N/A';
                const ciudadEl = document.getElementById('cliente-ciudad');
                if (ciudadEl) {
                    ciudadEl.textContent = (datosCliente.ciudad || '').trim() || '-';
                }
                // Configurar teléfonos con validación (tel1 a tel10)
                configurarTelefonos(datosCliente);
                
                // Configurar email (solo mostrar si existe)
                configurarEmail(datosCliente);
                
                clienteData = datosCliente;
                console.log('Asesor_gestionar.js: Datos del cliente cargados exitosamente');
            } else {
                console.error('Asesor_gestionar.js: Error al cargar datos:', data.message);
                mostrarError('Error al cargar datos del cliente: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Asesor_gestionar.js: Error en la petición:', error);
            mostrarError('Error de conexión al cargar datos del cliente: ' + error.message);
        });
}

function cargarContratos() {
    console.log('Asesor_gestionar.js: Cargando contratos del cliente:', clienteId);
    
    // Hacer petición AJAX para obtener contratos reales
    fetch(`index.php?action=obtener_contratos_cliente&cliente_id=${clienteId}`)
        .then(response => {
            console.log('Asesor_gestionar.js: Respuesta de contratos recibida:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Asesor_gestionar.js: Datos recibidos:', data);
            
            if (data.success) {
                // Priorizar obligaciones, pero mantener compatibilidad con facturas y contratos
                let obligacionesData = [];
                if (data.obligaciones && Array.isArray(data.obligaciones)) {
                    obligacionesData = data.obligaciones;
                } else if (data.facturas && Array.isArray(data.facturas)) {
                    obligacionesData = data.facturas;
                } else if (data.contratos && Array.isArray(data.contratos)) {
                    obligacionesData = data.contratos;
                }
                
                console.log('Asesor_gestionar.js: Obligaciones obtenidas:', obligacionesData);
                mostrarContratos(obligacionesData);
            } else {
                console.error('Asesor_gestionar.js: Error al cargar obligaciones:', data.message);
                mostrarErrorContratos('Error al cargar obligaciones: ' + (data.message || 'Error desconocido'));
            }
        })
        .catch(error => {
            console.error('Asesor_gestionar.js: Error en la petición de obligaciones:', error);
            mostrarErrorContratos('Error de conexión al cargar obligaciones: ' + error.message);
        });
}

function mostrarContratos(obligaciones) {
    const container = document.getElementById('contratos-container');
    const titulo = document.getElementById('contratos-titulo');
    const bloqueTotales = document.getElementById('obligaciones-totales');
    const spanTotal = document.getElementById('obligaciones-sum-total');
    const spanTotalPagar = document.getElementById('obligaciones-sum-total-pagar');
    
    if (!container) {
        console.error('Asesor_gestionar.js: No se encontró el contenedor de obligaciones');
        return;
    }
    if (!titulo) return;
    
    if (!Array.isArray(obligaciones)) {
        obligaciones = [];
    }
    
    if (obligaciones.length === 0) {
        titulo.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Obligaciones';
        if (bloqueTotales) bloqueTotales.style.display = 'none';
        container.innerHTML = `
            <div class="sin-contratos">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>No hay obligaciones registradas para este cliente</p>
            </div>
        `;
        window.obligacionesClienteActual = [];
        llenarSelectorContratos([]);
        return;
    }
    
    // Sumar saldo capital y total obligación desde la base de datos
    let sumTotal = 0;
    let sumTotalPagar = 0;
    obligaciones.forEach(ob => {
        const saldo = ob.saldo_capital != null && ob.saldo_capital !== ''
            ? parseFloat(ob.saldo_capital)
            : parseFloat(ob.total != null ? ob.total : ob.TOTAL || 0);
        const totalObl = ob.total_obligacion != null && ob.total_obligacion !== ''
            ? parseFloat(ob.total_obligacion)
            : parseFloat(ob.total_a_pagar != null ? ob.total_a_pagar : ob.TOTAL_A_PAGAR || 0);
        sumTotal += isNaN(saldo) ? 0 : saldo;
        sumTotalPagar += isNaN(totalObl) ? 0 : totalObl;
    });
    
    titulo.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Obligaciones';
    if (bloqueTotales) {
        bloqueTotales.style.display = 'block';
        if (spanTotal) spanTotal.textContent = '$' + sumTotal.toLocaleString('es-CO');
        if (spanTotalPagar) spanTotalPagar.textContent = '$' + sumTotalPagar.toLocaleString('es-CO');
    }
    
    // Cada obligación en formato vertical: nombre de columna a la izquierda, valor al frente (derecha)
    const fmtMontoOblig = (n) => {
        if (n == null || n === '' || n === undefined) return '-';
        const v = parseFloat(n);
        return isNaN(v) ? '-' : '$' + v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };
    const txtOblig = (v) => {
        const s = v == null ? '' : String(v).trim();
        return s === '' || s === '-' ? '-' : s;
    };

    /** Omite filas cuyo valor ya se mostró en otro campo (legacy duplicado). */
    const filtrarEtiquetasSinDuplicado = (lista, valores) => {
        const n = (k) => txtOblig(valores[k]);
        const omitir = new Set();
        if (n('oficina') !== '-' && n('oficina') === n('compra')) {
            omitir.add('oficina');
        }
        if (n('conceptoMes') !== '-' && n('conceptoMes') === n('tipoProducto')) {
            omitir.add('conceptoMes');
        }
        return lista.filter(({ key }) => !omitir.has(key));
    };

    const etiquetasBase = [
        { key: 'numObl', label: 'Nº Obligación' },
        { key: 'compra', label: 'Compra' },
        { key: 'tipoProducto', label: 'Tipo de producto' },
        { key: 'oficina', label: 'Oficina' },
        { key: 'añoCastigo', label: 'Año castigo' },
        { key: 'conceptoMes', label: 'Concepto mes actual' },
        { key: 'estadoJuridico', label: 'Estado proceso jurídico' },
        { key: 'valorDesembolso', label: 'Valor desembolso', monto: true },
        { key: 'saldoCapital', label: 'Saldo capital', monto: true },
        { key: 'saldoCapitalActual', label: 'Saldo de capital actual', monto: true },
        { key: 'interesesCorrientes', label: 'Intereses corrientes', monto: true },
        { key: 'interesesMora', label: 'Intereses mora', monto: true },
        { key: 'seguros', label: 'Seguros', monto: true },
        { key: 'otrosConceptos', label: 'Otros conceptos', monto: true },
        { key: 'totalObligacion', label: 'Total obligación', monto: true },
        { key: 'valorCuota', label: 'Valor cuota', monto: true }
    ];
    
    // Contenedor con scroll solo cuando hay más de una obligación (a partir de "Obligación 1")
    const conScroll = obligaciones.length > 1;
    const claseScroll = conScroll ? ' obligaciones-lista-con-scroll' : '';
    let html = `<div class="obligaciones-contenedor-scroll${claseScroll}">`;
    html += '<div class="obligaciones-lista-vertical">';
    
    obligaciones.forEach((obligacion, index) => {
        const numObl = obligacion.operacion || obligacion.numero_operacion || obligacion.numero_obligacion || 'N/A';
        const compra = txtOblig(obligacion.compra || obligacion.oficina);
        const tipoProducto = txtOblig(obligacion.tipo_producto || obligacion.concepto_mes_actual);
        const oficina = txtOblig(obligacion.oficina);
        const añoCastigo = txtOblig(obligacion.ano_castigo || obligacion.año_castigo || obligacion.anio_castigo);
        const conceptoMes = txtOblig(obligacion.concepto_mes_actual);
        const estadoJuridico = txtOblig(obligacion.estado_proceso_juridico);
        const saldoCapitalNum = parseFloat(
            obligacion.saldo_capital != null && obligacion.saldo_capital !== ''
                ? obligacion.saldo_capital
                : (obligacion.total != null ? obligacion.total : obligacion.TOTAL || 0)
        );
        const saldoCapitalActualNum = parseFloat(
            obligacion.saldo_capital_actual != null && obligacion.saldo_capital_actual !== ''
                ? obligacion.saldo_capital_actual
                : saldoCapitalNum
        );
        const totalObligNum = parseFloat(
            obligacion.total_obligacion != null && obligacion.total_obligacion !== ''
                ? obligacion.total_obligacion
                : (obligacion.total_a_pagar != null ? obligacion.total_a_pagar : obligacion.TOTAL_A_PAGAR || 0)
        );
        
        const parseMontoRaw = (v) => {
            const n = parseFloat(v);
            return isNaN(n) ? 0 : n;
        };
        const montosRaw = {
            valorDesembolso: parseMontoRaw(obligacion.valor_desembolso),
            saldoCapital: isNaN(saldoCapitalNum) ? 0 : saldoCapitalNum,
            saldoCapitalActual: isNaN(saldoCapitalActualNum) ? 0 : saldoCapitalActualNum,
            interesesCorrientes: parseMontoRaw(obligacion.intereses_corrientes),
            interesesMora: parseMontoRaw(obligacion.intereses_mora),
            seguros: parseMontoRaw(obligacion.seguros),
            otrosConceptos: parseMontoRaw(obligacion.otros_conceptos),
            totalObligacion: isNaN(totalObligNum) ? 0 : totalObligNum,
            valorCuota: parseMontoRaw(obligacion.valor_cuota)
        };
        const valores = {
            numObl,
            compra,
            tipoProducto,
            oficina,
            añoCastigo,
            conceptoMes,
            estadoJuridico,
            valorDesembolso: fmtMontoOblig(montosRaw.valorDesembolso),
            saldoCapital: fmtMontoOblig(montosRaw.saldoCapital),
            saldoCapitalActual: fmtMontoOblig(montosRaw.saldoCapitalActual),
            interesesCorrientes: fmtMontoOblig(montosRaw.interesesCorrientes),
            interesesMora: fmtMontoOblig(montosRaw.interesesMora),
            seguros: fmtMontoOblig(montosRaw.seguros),
            otrosConceptos: fmtMontoOblig(montosRaw.otrosConceptos),
            totalObligacion: fmtMontoOblig(montosRaw.totalObligacion),
            valorCuota: fmtMontoOblig(montosRaw.valorCuota)
        };
        
        html += `<div class="obligacion-card">`;
        html += `<div class="obligacion-card-titulo">Obligación ${index + 1}</div>`;
        html += `<div class="obligacion-campos">`;
        
        const etiquetas = filtrarEtiquetasSinDuplicado(etiquetasBase, valores);
        etiquetas.forEach(({ key, label, monto }) => {
            if (monto) {
                const raw = montosRaw[key];
                if (raw == null || raw < 1) {
                    return;
                }
            }
            const valor = valores[key] !== undefined && valores[key] !== null ? valores[key] : '-';
            const claseExtra = monto ? ' obligacion-valor-monto' : (key === 'compra' ? ' obligacion-valor-compra' : '');
            html += `
                <div class="obligacion-fila${key === 'compra' ? ' obligacion-fila-compra' : ''}">
                    <span class="obligacion-label">${label}</span>
                    <span class="obligacion-valor${claseExtra}">${valor}</span>
                </div>`;
        });
        
        html += `</div></div>`;
    });
    
    html += '</div></div>';
    container.innerHTML = html;

    window.obligacionesClienteActual = obligaciones.map(function(ob) {
        return {
            id_obligacion: ob.id_obligacion || ob.id || 0,
            operacion: ob.operacion || ob.numero_operacion || ob.numero_obligacion || 'N/A'
        };
    }).filter(function(row) {
        return row.id_obligacion > 0;
    });
    
    llenarSelectorContratos(obligaciones);
}

function llenarSelectorContratos(obligaciones) {
    const select = document.getElementById('contrato-gestionar');
    
    if (!select) {
        console.error('Asesor_gestionar.js: No se encontró el selector de obligaciones');
        return;
    }
    
    select.removeEventListener('change', onContratoGestionarChange);
    select.addEventListener('change', onContratoGestionarChange);
    
    // Limpiar opciones existentes pero mantener las opciones base
    select.innerHTML = '<option value="">Selecciona una obligación (opcional)</option>';
    select.innerHTML += '<option value="ninguna">Ninguna (Cliente no quiso pagar ninguna)</option>';
    
    // Agregar opciones según la cantidad de obligaciones
    if (obligaciones && obligaciones.length > 0) {
        // Solo agregar opción "Todas" si hay MÁS DE UNA obligación
        if (obligaciones.length > 1) {
            const optionTodas = document.createElement('option');
            optionTodas.value = 'todas';
            optionTodas.textContent = 'Todas las obligaciones';
            select.appendChild(optionTodas);
        }
        
        // Agregar opciones para cada obligación (value = id_obligacion para guardar gestión)
        obligaciones.forEach((obligacion) => {
            const idObl = obligacion.id_obligacion || obligacion.id || 0;
            const numObl = obligacion.operacion || obligacion.numero_operacion || obligacion.numero_obligacion || 'N/A';
            const totalObligSel = parseFloat(
                obligacion.total_obligacion != null && obligacion.total_obligacion !== ''
                    ? obligacion.total_obligacion
                    : (obligacion.total_a_pagar != null ? obligacion.total_a_pagar : obligacion.TOTAL_A_PAGAR || 0)
            );
            
            const option = document.createElement('option');
            option.value = idObl;
            option.textContent = `${numObl} - $${(isNaN(totalObligSel) ? 0 : totalObligSel).toLocaleString('es-CO')}`;
            select.appendChild(option);
        });
        actualizarSubseleccionObligacionesTodasAcuerdo();
        renderizarAcuerdosPorObligacionSiAplica();
    } else {
        actualizarSubseleccionObligacionesTodasAcuerdo();
        renderizarAcuerdosPorObligacionSiAplica();
    }
    
    console.log('Asesor_gestionar.js: Selector de obligaciones llenado con', obligaciones ? obligaciones.length : 0, 'obligaciones');
    console.log('Asesor_gestionar.js: Opción "Todas" agregada:', obligaciones && obligaciones.length > 1 ? 'Sí' : 'No');
}

function escapeHtmlAcuerdo(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function esAcuerdoPagoNivel1Valor(valorNivel1) {
    return valorNivel1 === '1.1' || valorNivel1 === 'ws_1.1' || valorNivel1 === 'rc_1.1';
}

function esNivel2AcuerdoDatosExtendidos(nivel2) {
    return nivel2 === 'acuerdo_pago_total' || nivel2 === 'acuerdo_largo_plazo' || nivel2 === 'acuerdo_aprobado';
}

function debeMostrarAcuerdosMultiObligacion() {
    if (cantidadObligacionesCliente() <= 1) return false;
    const nivel1 = document.getElementById('tipo-contacto-nivel1');
    const nivel2 = document.getElementById('tipo-contacto-nivel2');
    const v1 = nivel1 ? nivel1.value : '';
    const v2 = nivel2 ? nivel2.value : '';
    if (!esAcuerdoPagoNivel1Valor(v1)) return false;
    return esNivel2AcuerdoDatosExtendidos(v2);
}

function fechaMinimaHoyAcuerdo() {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
}

function formatearNumeroEnteroAcuerdo(numero) {
    if (numero === 0 || isNaN(numero)) return '';
    return numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function obtenerValorNumericoInputMulti(input) {
    if (!input) return 0;
    return parsePesosColombia(input.value);
}

function calcularTotalAPagarEnTarjeta(card) {
    const saldoEl = card.querySelector('.js-saldo-a-pagar');
    const descMontoEl = card.querySelector('.js-descuento-monto');
    const descPctEl = card.querySelector('.js-descuento-porcentaje');
    const totalEl = card.querySelector('.js-total-a-pagar-acuerdo');
    if (!saldoEl || !totalEl) return;

    const saldo = obtenerValorNumericoInputMulti(saldoEl);
    const descuentoMonto = obtenerValorNumericoInputMulti(descMontoEl);
    const descuentoPorcentaje = parseFloat((descPctEl && descPctEl.value ? descPctEl.value : '').replace(/[^\d.]/g, '')) || 0;

    let descuento = 0;
    let porcentajeCalculado = 0;
    let montoCalculado = 0;

    if (descuentoMonto > 0 && saldo > 0) {
        descuento = descuentoMonto;
        porcentajeCalculado = (descuentoMonto / saldo) * 100;
        if (descPctEl && descPctEl !== document.activeElement) {
            descPctEl.value = porcentajeCalculado.toFixed(2);
        }
    } else if (descuentoPorcentaje > 0 && saldo > 0) {
        descuento = (saldo * descuentoPorcentaje) / 100;
        montoCalculado = descuento;
        if (descMontoEl && descMontoEl !== document.activeElement) {
            descMontoEl.value = formatearNumeroEnteroAcuerdo(montoCalculado);
        }
    }

    const total = saldo - descuento;
    totalEl.value = total > 0 ? formatearNumeroEnteroAcuerdo(total) : '0';
}

function attachListenersPagoTotalCard(card) {
    if (!card) return;
    const saldoEl = card.querySelector('.js-saldo-a-pagar');
    const descMontoEl = card.querySelector('.js-descuento-monto');
    const descPctEl = card.querySelector('.js-descuento-porcentaje');

    function fmtInputSaldo(e) {
        let value = e.target.value.replace(/[^\d.,]/g, '');
        if (value) {
            const numValue = parsePesosColombia(value);
            if (!isNaN(numValue) && numValue >= 0) {
                const tieneDecimales = /,\d*$/.test(value);
                e.target.value = tieneDecimales
                    ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : formatearNumeroEnteroAcuerdo(Math.floor(numValue));
            } else {
                e.target.value = value;
            }
        } else {
            e.target.value = '';
        }
        calcularTotalAPagarEnTarjeta(card);
    }

    if (saldoEl) {
        saldoEl.addEventListener('input', fmtInputSaldo);
        saldoEl.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = formatearNumeroEnteroAcuerdo(num);
        });
    }
    if (descMontoEl) {
        descMontoEl.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : formatearNumeroEnteroAcuerdo(Math.floor(numValue));
                } else {
                    e.target.value = value;
                }
            } else {
                e.target.value = '';
            }
            if (value && descPctEl) descPctEl.value = '';
            calcularTotalAPagarEnTarjeta(card);
        });
        descMontoEl.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = formatearNumeroEnteroAcuerdo(num);
        });
    }
    if (descPctEl) {
        descPctEl.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.]/g, '');
            if (value) {
                let numValue = parseFloat(value);
                if (numValue > 100) {
                    value = '100';
                    numValue = 100;
                }
                e.target.value = value;
            } else {
                e.target.value = '';
            }
            if (value && descMontoEl) descMontoEl.value = '';
            calcularTotalAPagarEnTarjeta(card);
        });
    }
}

function buildHtmlTarjetaPagoTotal(ob, fechaMin) {
    const id = ob.id_obligacion;
    const op = escapeHtmlAcuerdo(ob.operacion);
    return `
<div class="acuerdo-tarjeta-obligacion" data-obligacion-id="${id}" data-operacion="${op}" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; background: #fafbfc;">
    <div style="font-weight: 700; margin-bottom: 10px; color: #1a5276;"><i class="fas fa-file-invoice-dollar"></i> Obligación ${op}</div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Saldo a pagar:</label>
            <div style="position: relative; flex: 1;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                <input type="text" class="js-saldo-a-pagar" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Descuento:</label>
            <div style="flex: 1; display: flex; gap: 8px;">
                <div style="position: relative; flex: 1;">
                    <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                    <input type="text" class="js-descuento-monto" placeholder="Monto" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                </div>
                <span style="align-self: center; color: #666;">o</span>
                <div style="position: relative; flex: 1;">
                    <input type="text" class="js-descuento-porcentaje" placeholder="%" style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #ddd; border-radius: 4px; text-align: right;" inputmode="numeric">
                    <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600; pointer-events: none;">%</span>
                </div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Total a pagar:</label>
            <div style="position: relative; flex: 1;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #28a745; font-weight: 700;">$</span>
                <input type="text" class="js-total-a-pagar-acuerdo" placeholder="0" readonly style="width: 100%; padding: 8px 8px 8px 30px; border: 2px solid #28a745; border-radius: 4px; background: #f8f9fa; font-weight: 600; color: #28a745;">
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Fecha límite:</label>
            <input type="date" class="js-fecha-limite-acuerdo" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" min="${fechaMin}">
        </div>
    </div>
</div>`;
}

function obtenerCuotasAcuerdoManualDesdeContenedor(container) {
    if (!container) return [];
    const items = container.querySelectorAll('[data-cuota-item]');
    return Array.from(items).map(function(item, index) {
        const valorInput = item.querySelector('.cuota-valor');
        const fechaInput = item.querySelector('.cuota-fecha');
        return {
            numero_cuota: index + 1,
            valor_cuota: valorInput ? parsePesosColombia(valorInput.value) : 0,
            fecha_pago: fechaInput ? fechaInput.value : ''
        };
    });
}

function actualizarResumenCuotasManualMulti(card) {
    const primerValorEl = card.querySelector('.js-sim-valor-cuota');
    const detalle = card.querySelector('.js-acuerdo-cuotas-detalle');
    if (!primerValorEl || !detalle) return;
    const cuotas = obtenerCuotasAcuerdoManualDesdeContenedor(detalle);
    if (cuotas.length === 0 || !cuotas[0].valor_cuota) {
        primerValorEl.value = '';
        return;
    }
    primerValorEl.value = cuotas[0].valor_cuota.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function renderizarCuotasAcuerdoManualMulti(card) {
    const cantidadCuotasEl = card.querySelector('.js-sim-num-cuotas');
    const container = card.querySelector('.js-acuerdo-cuotas-detalle');
    if (!cantidadCuotasEl || !container) return;

    const fechaMinCuota = (card && card.getAttribute('data-fecha-min-cuota')) || fechaMinimaHoyAcuerdo();
    const minFechaAttr = fechaMinCuota ? ' min="' + fechaMinCuota + '"' : '';

    const raw = parseInt(cantidadCuotasEl.value, 10);
    const totalCuotas = Math.min(10, Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : 2));
    const valoresPrevios = {};
    const fechasPrevias = {};
    container.querySelectorAll('[data-cuota-item]').forEach(function(item) {
        const numero = item.getAttribute('data-cuota-item');
        const valorInput = item.querySelector('.cuota-valor');
        const fechaInput = item.querySelector('.cuota-fecha');
        if (numero) {
            valoresPrevios[numero] = valorInput ? valorInput.value : '';
            fechasPrevias[numero] = fechaInput ? fechaInput.value : '';
        }
    });

    let html = '';
    for (let i = 1; i <= totalCuotas; i++) {
        const valorPrevio = valoresPrevios[String(i)] || '';
        const fechaPrevia = fechasPrevias[String(i)] || '';
        html += `
            <div data-cuota-item="${i}" style="border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; background: #fafbfc;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #2c3e50;">Cuota ${i}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; margin-bottom: 4px;">Valor</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                            <input type="text" class="cuota-valor" data-numero-cuota="${i}" value="${valorPrevio}" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; margin-bottom: 4px;">Fecha de pago</label>
                        <input type="date" class="cuota-fecha" data-numero-cuota="${i}" value="${fechaPrevia}"${minFechaAttr} style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.cuota-fecha').forEach(function(input) {
        input.addEventListener('change', function() {
            actualizarResumenCuotasManualMulti(card);
        });
    });

    container.querySelectorAll('.cuota-valor').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                e.target.value = !isNaN(numValue) && numValue >= 0
                    ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : value;
            } else {
                e.target.value = '';
            }
            actualizarResumenCuotasManualMulti(card);
        });
        input.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) {
                e.target.value = num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
            actualizarResumenCuotasManualMulti(card);
        });
    });

    actualizarResumenCuotasManualMulti(card);
}

function buildHtmlTarjetaLargoPlazo(ob, fechaMin) {
    const id = ob.id_obligacion;
    const op = escapeHtmlAcuerdo(ob.operacion);
    let opts = '';
    for (let i = 1; i <= 10; i++) {
        opts += `<option value="${i}"${i === 2 ? ' selected' : ''}>${i}</option>`;
    }
    return `
<div class="acuerdo-tarjeta-obligacion" data-obligacion-id="${id}" data-operacion="${op}" data-fecha-min-cuota="${fechaMin}" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; background: #fafbfc;">
    <div style="font-weight: 700; margin-bottom: 10px; color: #1a5276;"><i class="fas fa-list-ol"></i> Obligación ${op}</div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 160px; margin: 0;">Monto a financiar:</label>
            <div style="position: relative; flex: 1;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                <input type="text" class="js-sim-monto" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 160px; margin: 0;">Número de cuotas:</label>
            <select class="js-sim-num-cuotas" style="flex: 1; max-width: 180px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${opts}</select>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 160px; margin: 0;">Valor primera cuota:</label>
            <div style="position: relative; flex: 1;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #28a745; font-weight: 700;">$</span>
                <input type="text" class="js-sim-valor-cuota" readonly placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 2px solid #28a745; border-radius: 4px; background: #f8f9fa; font-weight: 600; color: #28a745;">
            </div>
        </div>
        <div class="js-acuerdo-cuotas-detalle" style="display: flex; flex-direction: column; gap: 10px;"></div>
    </div>
</div>`;
}

function attachListenersLargoPlazoCard(card) {
    if (!card) return;
    const simMonto = card.querySelector('.js-sim-monto');
    const simNum = card.querySelector('.js-sim-num-cuotas');

    if (simMonto) {
        simMonto.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : Math.floor(numValue).toLocaleString('es-CO');
                } else e.target.value = value;
            } else e.target.value = '';
        });
        simMonto.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        });
    }
    if (simNum) {
        simNum.addEventListener('change', function() {
            renderizarCuotasAcuerdoManualMulti(card);
        });
    }
}

function buildHtmlTarjetaComite(ob) {
    const id = ob.id_obligacion;
    const op = escapeHtmlAcuerdo(ob.operacion);
    return `
<div class="acuerdo-tarjeta-obligacion" data-obligacion-id="${id}" data-operacion="${op}" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 12px; background: #fafbfc;">
    <div style="font-weight: 700; margin-bottom: 10px; color: #1a5276;"><i class="fas fa-clipboard-check"></i> Obligación ${op}</div>
    <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Monto propuesto:</label>
            <div style="position: relative; flex: 1;">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                <input type="text" class="js-comite-monto" placeholder="Valor" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <label style="min-width: 140px; margin: 0;">Estado:</label>
            <select class="js-comite-estado" style="flex: 1; max-width: 220px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
            </select>
        </div>
    </div>
</div>`;
}

function attachListenersComiteCard(card) {
    if (!card) return;
    const monto = card.querySelector('.js-comite-monto');
    if (!monto) return;
    monto.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d.,]/g, '');
        if (value) {
            const numValue = parsePesosColombia(value);
            if (!isNaN(numValue) && numValue >= 0) {
                const tieneDecimales = /,\d*$/.test(value);
                e.target.value = tieneDecimales
                    ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    : Math.floor(numValue).toLocaleString('es-CO');
            } else e.target.value = value;
        } else e.target.value = '';
    });
    monto.addEventListener('blur', function(e) {
        const num = parsePesosColombia(e.target.value);
        if (num > 0) e.target.value = Math.floor(num).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    });
}

function obtenerTarjetaAcuerdoMulti(obligacionId) {
    const wrap = document.getElementById('acuerdos-multi-obligacion');
    if (!wrap) return null;
    return wrap.querySelector('.acuerdo-tarjeta-obligacion[data-obligacion-id="' + String(obligacionId) + '"]');
}

function validarTarjetaAcuerdoMulti(obligacionId, operacion, nivel2) {
    const card = obtenerTarjetaAcuerdoMulti(obligacionId);
    const pref = 'Obligación ' + operacion + ': ';
    if (!card) {
        return { ok: false, message: pref + 'no se encontró el formulario de acuerdo.' };
    }
    if (nivel2 === 'acuerdo_pago_total') {
        const saldoRaw = card.querySelector('.js-saldo-a-pagar');
        const dmRaw = card.querySelector('.js-descuento-monto');
        const dpRaw = card.querySelector('.js-descuento-porcentaje');
        const totalRaw = card.querySelector('.js-total-a-pagar-acuerdo');
        const flRaw = card.querySelector('.js-fecha-limite-acuerdo');
        const saldo = saldoRaw ? String(saldoRaw.value || '').trim() : '';
        const dm = dmRaw ? String(dmRaw.value || '').trim() : '';
        const dp = dpRaw ? String(dpRaw.value || '').trim() : '';
        const tot = totalRaw ? String(totalRaw.value || '').trim() : '';
        const fl = flRaw ? String(flRaw.value || '').trim() : '';
        if (!saldo || !dm || !dp || !tot || !fl) {
            return { ok: false, message: pref + 'diligencie saldo, descuento (monto y %), total y fecha límite.' };
        }
        return { ok: true };
    }
    if (nivel2 === 'acuerdo_aprobado') {
        const m = card.querySelector('.js-comite-monto');
        const e = card.querySelector('.js-comite-estado');
        const mRaw = m ? String(m.value || '').trim() : '';
        const eRaw = e ? String(e.value || '').trim() : '';
        if (!mRaw || !eRaw) {
            return { ok: false, message: pref + 'indique monto propuesto y estado de aprobación.' };
        }
        return { ok: true };
    }
    if (nivel2 === 'acuerdo_largo_plazo') {
        const simMonto = card.querySelector('.js-sim-monto');
        const simNum = card.querySelector('.js-sim-num-cuotas');
        const detalle = card.querySelector('.js-acuerdo-cuotas-detalle');
        const numCuotas = simNum ? parseInt(simNum.value, 10) : 0;
        const montoVal = simMonto ? parsePesosColombia(simMonto.value) : 0;
        if (!numCuotas || numCuotas < 1 || numCuotas > 10) {
            return { ok: false, message: pref + 'número de cuotas inválido (1–10).' };
        }
        if (!montoVal || montoVal <= 0) {
            return { ok: false, message: pref + 'indique un monto a financiar mayor a cero.' };
        }
        if (detalle) {
            detalle.querySelectorAll('.cuota-fecha, .cuota-valor').forEach(function(el) {
                if (el && typeof el.blur === 'function') el.blur();
            });
        }
        const cuotas = obtenerCuotasAcuerdoManualDesdeContenedor(detalle);
        if (cuotas.length !== numCuotas) {
            return { ok: false, message: pref + 'registre exactamente ' + numCuotas + ' cuota(s) con valor y fecha.' };
        }
        const bad = cuotas.find(function(item, index) {
            const fechaOk = item.fecha_pago && String(item.fecha_pago).trim() !== '';
            const valorOk = item.valor_cuota && item.valor_cuota > 0;
            return item.numero_cuota !== (index + 1) || !fechaOk || !valorOk;
        });
        if (bad) {
            const idx = cuotas.indexOf(bad) + 1;
            const fechaOk = bad.fecha_pago && String(bad.fecha_pago).trim() !== '';
            const valorOk = bad.valor_cuota && bad.valor_cuota > 0;
            const faltas = [];
            if (!valorOk) faltas.push('valor mayor a cero');
            if (!fechaOk) faltas.push('fecha de pago');
            return { ok: false, message: pref + 'cuota ' + idx + ': indique ' + faltas.join(' y ') + '.' };
        }
        return { ok: true };
    }
    return { ok: true };
}

function obtenerOperacionLabelPorIdObligacion(obligacionId) {
    const lista = window.obligacionesClienteActual || [];
    const row = lista.find(function(o) {
        return String(o.id_obligacion) === String(obligacionId);
    });
    return row ? row.operacion : String(obligacionId);
}

function construirDatosAcuerdoMultiParaPayload(obligacionId, nivel2) {
    const card = obtenerTarjetaAcuerdoMulti(obligacionId);
    if (!card) return {};
    if (nivel2 === 'acuerdo_pago_total') {
        const saldoInput = card.querySelector('.js-saldo-a-pagar');
        const descuentoMontoInput = card.querySelector('.js-descuento-monto');
        const descuentoPorcentajeInput = card.querySelector('.js-descuento-porcentaje');
        const totalInput = card.querySelector('.js-total-a-pagar-acuerdo');
        const fechaLimiteInput = card.querySelector('.js-fecha-limite-acuerdo');
        const saldoAPagar = saldoInput ? parsePesosColombia(saldoInput.value) : null;
        const descuentoMonto = descuentoMontoInput ? parsePesosColombia(descuentoMontoInput.value) : null;
        const descuentoPorcentaje = descuentoPorcentajeInput ? parseFloat(descuentoPorcentajeInput.value.replace(',', '.').replace(/[^\d.]/g, '')) : null;
        const totalAPagarAcuerdo = totalInput ? parsePesosColombia(totalInput.value) : null;
        const fechaLimiteAcuerdo = fechaLimiteInput && fechaLimiteInput.value ? fechaLimiteInput.value : null;
        return {
            fecha_pago: fechaLimiteAcuerdo,
            cuota: totalAPagarAcuerdo,
            saldo_a_pagar: saldoAPagar,
            descuento_monto: descuentoMonto,
            descuento_porcentaje: descuentoPorcentaje,
            total_a_pagar_acuerdo: totalAPagarAcuerdo,
            fecha_limite_acuerdo: fechaLimiteAcuerdo,
            simulador_monto: null,
            simulador_numero_cuotas: null,
            simulador_valor_cuota: null,
            cuotas_acuerdo: [],
            acuerdo_comite_monto_propuesto: null,
            acuerdo_comite_estado: null
        };
    }
    if (nivel2 === 'acuerdo_aprobado') {
        const montoInput = card.querySelector('.js-comite-monto');
        const estadoSelect = card.querySelector('.js-comite-estado');
        return {
            fecha_pago: null,
            cuota: null,
            cuota_actual: null,
            saldo_a_pagar: null,
            descuento_monto: null,
            descuento_porcentaje: null,
            total_a_pagar_acuerdo: null,
            fecha_limite_acuerdo: null,
            simulador_monto: null,
            simulador_numero_cuotas: null,
            simulador_valor_cuota: null,
            cuotas_acuerdo: [],
            acuerdo_comite_monto_propuesto: montoInput ? parsePesosColombia(montoInput.value) : null,
            acuerdo_comite_estado: estadoSelect ? estadoSelect.value : 'pendiente'
        };
    }
    if (nivel2 === 'acuerdo_largo_plazo') {
        const simMonto = card.querySelector('.js-sim-monto');
        const simNum = card.querySelector('.js-sim-num-cuotas');
        const simValor = card.querySelector('.js-sim-valor-cuota');
        const detalle = card.querySelector('.js-acuerdo-cuotas-detalle');
        const numCuotas = simNum ? parseInt(simNum.value, 10) : null;
        const montoFin = simMonto ? parsePesosColombia(simMonto.value) : null;
        const valorPrimera = simValor ? parsePesosColombia(simValor.value) : null;
        const cuotasAcuerdo = obtenerCuotasAcuerdoManualDesdeContenedor(detalle);
        let fechaPrimera = cuotasAcuerdo.length ? cuotasAcuerdo[0].fecha_pago : null;
        let cuotaPrimera = cuotasAcuerdo.length ? cuotasAcuerdo[0].valor_cuota : null;
        return {
            fecha_pago: fechaPrimera,
            cuota: cuotaPrimera,
            cuota_actual: null,
            saldo_a_pagar: null,
            descuento_monto: null,
            descuento_porcentaje: null,
            total_a_pagar_acuerdo: null,
            fecha_limite_acuerdo: cuotasAcuerdo.length ? cuotasAcuerdo[cuotasAcuerdo.length - 1].fecha_pago : null,
            simulador_monto: montoFin,
            simulador_numero_cuotas: numCuotas,
            simulador_valor_cuota: valorPrimera,
            cuotas_acuerdo: cuotasAcuerdo,
            acuerdo_comite_monto_propuesto: null,
            acuerdo_comite_estado: null
        };
    }
    return {};
}

function renderizarAcuerdosPorObligacionSiAplica() {
    const wrapMulti = document.getElementById('acuerdos-multi-obligacion-wrap');
    const innerMulti = document.getElementById('acuerdos-multi-obligacion');
    const wrapSingle = document.getElementById('acuerdo-formulario-unico-wrap');
    if (!wrapMulti || !innerMulti || !wrapSingle) return;

    const nivel2El = document.getElementById('tipo-contacto-nivel2');
    const nivel2 = nivel2El ? nivel2El.value : '';

    if (!debeMostrarAcuerdosMultiObligacion()) {
        wrapMulti.style.display = 'none';
        innerMulti.innerHTML = '';
        wrapSingle.style.display = '';
        sincronizarVistaCamposAcuerdoPorNivelTipificacion();
        return;
    }

    wrapSingle.style.display = 'none';
    wrapMulti.style.display = 'block';

    const camposFechaValorMulti = document.getElementById('campos-fecha-valor');
    if (camposFechaValorMulti) camposFechaValorMulti.style.display = 'none';

    const lista = obtenerListaObligacionesParaTarjetasAcuerdo();
    const fechaMin = fechaMinimaHoyAcuerdo();

    if (lista.length === 0) {
        innerMulti.innerHTML = '<p style="margin:0;font-size:13px;color:#666;">Seleccione obligaciones arriba (una, <strong>Todas</strong> con al menos 2 marcadas si aplica) para mostrar los bloques de acuerdo por obligación.</p>';
        return;
    }

    if (nivel2 === 'acuerdo_pago_total') {
        innerMulti.innerHTML = lista.map(function(ob) {
            return buildHtmlTarjetaPagoTotal(ob, fechaMin);
        }).join('');
        lista.forEach(function(ob) {
            const card = obtenerTarjetaAcuerdoMulti(ob.id_obligacion);
            attachListenersPagoTotalCard(card);
        });
    } else if (nivel2 === 'acuerdo_largo_plazo') {
        innerMulti.innerHTML = lista.map(function(ob) {
            return buildHtmlTarjetaLargoPlazo(ob, fechaMin);
        }).join('');
        lista.forEach(function(ob) {
            const card = obtenerTarjetaAcuerdoMulti(ob.id_obligacion);
            attachListenersLargoPlazoCard(card);
            renderizarCuotasAcuerdoManualMulti(card);
        });
    } else if (nivel2 === 'acuerdo_aprobado') {
        innerMulti.innerHTML = lista.map(function(ob) {
            return buildHtmlTarjetaComite(ob);
        }).join('');
        lista.forEach(function(ob) {
            attachListenersComiteCard(obtenerTarjetaAcuerdoMulti(ob.id_obligacion));
        });
    } else {
        wrapMulti.style.display = 'none';
        innerMulti.innerHTML = '';
        wrapSingle.style.display = '';
        sincronizarVistaCamposAcuerdoPorNivelTipificacion();
    }
}

function mostrarErrorContratos(mensaje) {
    const container = document.getElementById('contratos-container');
    const titulo = document.getElementById('contratos-titulo');
    
    // Validar que los elementos existen
    if (!container) {
        console.error('Asesor_gestionar.js: No se encontró el contenedor de contratos (error)');
        return;
    }
    
    if (titulo) {
        titulo.textContent = 'Contratos - Error';
    }
    
    container.innerHTML = `
        <div class="error-contratos">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensaje}</p>
        </div>
    `;
}

// ========================================
// FUNCIONES DE TELÉFONOS
// ========================================

function configurarTelefonos(datosCliente) {
    console.log('Asesor_gestionar.js: Configurando teléfonos');
    console.log('Asesor_gestionar.js: datosCliente:', datosCliente);
    console.log('Asesor_gestionar.js: datosCliente.telefonos:', datosCliente.telefonos);
    console.log('Asesor_gestionar.js: Tipo de telefonos:', typeof datosCliente.telefonos);
    console.log('Asesor_gestionar.js: Es array:', Array.isArray(datosCliente.telefonos));
    
    const container = document.getElementById('telefonos-cliente');
    
    // Validar que datosCliente existe
    if (!datosCliente) {
        console.error('Asesor_gestionar.js: datosCliente es null o undefined');
        container.innerHTML = '<span>Error: Datos del cliente no disponibles</span>';
        return;
    }
    
    // Extraer teléfonos del cliente (tel1 a tel10 o cel1 a cel10): solo dígitos, sin empezar por 0
    const celulares = [];
    const vistos = new Set();
    for (let i = 1; i <= 10; i++) {
        const tel = datosCliente[`tel${i}`] || datosCliente[`cel${i}`];
        const numero = telefonoValidoParaSelector(tel);
        if (numero && !vistos.has(numero)) {
            vistos.add(numero);
            celulares.push({
                numero: numero,
                tipo: `Teléfono ${i}`
            });
        }
    }
    
    console.log('Asesor_gestionar.js: Celulares encontrados:', celulares);
    
    if (celulares.length === 0) {
        container.innerHTML = '<span>No hay celulares registrados</span>';
        return;
    }
    
    // Crear desplegable de celulares + campo clickeable para copiar al softphone
    let html = '<div class="telefono-selector-container">';
    
    // Selector de teléfono: etiqueta al lado (sin icono), solo dígitos válidos en opciones
    html += '<div class="telefono-select-row">';
    html += '<label class="telefono-select-label" for="telefono-select">Teléfono:</label>';
    html += '<select id="telefono-select" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-weight: 500; background: white; cursor: pointer; box-sizing: border-box;">';
    
    celulares.forEach((celular, index) => {
        html += `<option value="${celular.numero}">${celular.numero}</option>`;
    });
    
    html += '</select>';
    html += '</div>';
    
    // Campo de texto clickeable para copiar al softphone
    html += '<div>';
    html += '<label for="telefono-softphone">Llamar:</label>';
    html += '<div style="position: relative; width: 100%; box-sizing: border-box;">';
    html += '<input type="text" id="telefono-softphone" readonly class="telefono-softphone-input" style="width: 100%; padding: 10px 40px 10px 12px; border: 2px solid #00c0e1; border-radius: 4px; font-size: 14px; background: #f8f9fa; font-weight: 600; color: #00c0e1; cursor: pointer; transition: all 0.3s ease; box-sizing: border-box;" placeholder="Haz clic para copiar al softphone" title="Haz clic para copiar este número al softphone">';
    html += '<i class="fas fa-phone-alt" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #00c0e1; pointer-events: none;"></i>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Configurar eventos
    const select = document.getElementById('telefono-select');
    const campoSoftphone = document.getElementById('telefono-softphone');
    
    if (select && campoSoftphone) {
        // Función para copiar número al softphone e iniciar llamada automáticamente
        const copiarAlSoftphone = function(numero) {
            console.log('Asesor_gestionar.js: Copiando número al softphone e iniciando llamada:', numero);
            
            // Verificar que el softphone esté disponible
            if (typeof window.webrtcSoftphone === 'undefined' || window.webrtcSoftphone === null) {
                console.warn('Asesor_gestionar.js: Softphone no está disponible aún');
                mostrarMensajeTemporal('El softphone se está inicializando. Por favor, espera un momento.', 'warning');
                return false;
            }
            
            // Usar callNumber() que establece el número e inicia la llamada automáticamente
            if (typeof window.webrtcSoftphone.callNumber === 'function') {
                window.webrtcSoftphone.callNumber(numero);
                mostrarMensajeTemporal('Llamada iniciada automáticamente.', 'success');
                return true;
            } 
            // Fallback: si callNumber no existe, usar setNumber y luego makeCall
            else if (typeof window.webrtcSoftphone.setNumber === 'function' && typeof window.webrtcSoftphone.makeCall === 'function') {
                window.webrtcSoftphone.setNumber(numero);
                setTimeout(() => {
                    window.webrtcSoftphone.makeCall();
                }, 100);
                mostrarMensajeTemporal('Llamada iniciada automáticamente.', 'success');
                return true;
            } 
            // Fallback alternativo: establecer directamente el número y actualizar el display
            else if (typeof window.webrtcSoftphone.currentNumber !== 'undefined') {
                window.webrtcSoftphone.currentNumber = numero;
                if (typeof window.webrtcSoftphone.updateNumberDisplay === 'function') {
                    window.webrtcSoftphone.updateNumberDisplay();
                }
                if (typeof window.webrtcSoftphone.makeCall === 'function') {
                    setTimeout(() => {
                        window.webrtcSoftphone.makeCall();
                    }, 100);
                    mostrarMensajeTemporal('Llamada iniciada automáticamente.', 'success');
                } else {
                    mostrarMensajeTemporal('Número copiado al softphone. Presiona el botón de llamar.', 'success');
                }
                return true;
            } else {
                console.error('Asesor_gestionar.js: No se pudo copiar el número al softphone');
                mostrarMensajeTemporal('Error al copiar el número. Intenta nuevamente.', 'error');
                return false;
            }
        };
        
        // Evento para actualizar el campo cuando cambia la selección
        select.addEventListener('change', function() {
            const numeroSeleccionado = telefonoValidoParaSelector(this.value) || '';
            this.value = numeroSeleccionado;
            campoSoftphone.value = numeroSeleccionado;
            console.log('Asesor_gestionar.js: Celular seleccionado:', numeroSeleccionado);
        });
        
        // Evento de clic en el campo de texto para copiar al softphone
        campoSoftphone.addEventListener('click', function() {
            const numero = this.value;
            if (numero && numero.trim() !== '') {
                copiarAlSoftphone(numero);
                
                // Efecto visual de feedback
                this.style.background = '#d4edda';
                this.style.borderColor = '#28a745';
                setTimeout(() => {
                    this.style.background = '#f8f9fa';
                    this.style.borderColor = '#00c0e1';
                }, 500);
            } else {
                mostrarMensajeTemporal('No hay número seleccionado', 'warning');
            }
        });
        
        // También permitir copiar al portapapeles con doble clic
        campoSoftphone.addEventListener('dblclick', function() {
            const numero = this.value;
            if (numero && numero.trim() !== '') {
                // Copiar al portapapeles
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(numero).then(() => {
                        mostrarMensajeTemporal('Número copiado al portapapeles', 'success');
                    }).catch(() => {
                        // Fallback para navegadores antiguos
                        this.select();
                        document.execCommand('copy');
                        mostrarMensajeTemporal('Número copiado al portapapeles', 'success');
                    });
                } else {
                    // Fallback para navegadores antiguos
                    this.select();
                    document.execCommand('copy');
                    mostrarMensajeTemporal('Número copiado al portapapeles', 'success');
                }
            }
        });
        
        // Seleccionar automáticamente el primer celular
        if (celulares.length > 0) {
            select.value = celulares[0].numero;
            campoSoftphone.value = celulares[0].numero;
            console.log('Asesor_gestionar.js: Primer celular seleccionado:', celulares[0].numero);
        }
    }
    
    console.log('Asesor_gestionar.js: Desplegable de celulares configurado exitosamente');
}

/**
 * Configurar email del cliente (solo mostrar si existe)
 * @param {object} datosCliente - Datos del cliente
 */
function configurarEmail(datosCliente) {
    console.log('Asesor_gestionar.js: Configurando email del cliente');
    
    const emailContainer = document.getElementById('cliente-email-container');
    const emailSpan = document.getElementById('cliente-email');
    
    if (!emailContainer || !emailSpan) {
        console.warn('Asesor_gestionar.js: No se encontraron los elementos del email');
        return;
    }
    
    // Obtener email del cliente
    const email = datosCliente.email || datosCliente.EMAIL || null;
    
    // Validar que el email no esté vacío
    const tieneEmail = email && email.trim() !== '' && email !== 'null' && email !== 'NULL' && email.toLowerCase() !== 'null';
    
    if (tieneEmail) {
        // Mostrar el contenedor y establecer el email
        emailContainer.style.display = 'flex';
        emailSpan.textContent = email.trim();
        emailSpan.style.color = '#00c0e1';
        emailSpan.style.fontWeight = '500';
        console.log('Asesor_gestionar.js: Email mostrado:', email.trim());
    } else {
        // Ocultar el contenedor si no hay email
        emailContainer.style.display = 'none';
        console.log('Asesor_gestionar.js: Cliente sin email registrado, campo oculto');
    }
}

// Función auxiliar para mostrar mensajes temporales
function mostrarMensajeTemporal(mensaje, tipo = 'info') {
    // Crear elemento de mensaje si no existe
    let mensajeDiv = document.getElementById('mensaje-temporal-telefono');
    if (!mensajeDiv) {
        mensajeDiv = document.createElement('div');
        mensajeDiv.id = 'mensaje-temporal-telefono';
        mensajeDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease;';
        document.body.appendChild(mensajeDiv);
    }
    
    // Colores según el tipo
    const colores = {
        success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
        error: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
        warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
        info: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
    };
    
    const color = colores[tipo] || colores.info;
    mensajeDiv.style.background = color.bg;
    mensajeDiv.style.border = `2px solid ${color.border}`;
    mensajeDiv.style.color = color.text;
    mensajeDiv.textContent = mensaje;
    mensajeDiv.style.display = 'block';
    mensajeDiv.style.opacity = '1';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        mensajeDiv.style.opacity = '0';
        setTimeout(() => {
            mensajeDiv.style.display = 'none';
        }, 300);
    }, 3000);
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function calcularDiasMora(fechaVencimiento) {
    if (!fechaVencimiento) return 0;
    
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diffTime = hoy - vencimiento;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

function obtenerFranja(diasMora) {
    if (diasMora <= 30) return 'MENOR A 30';
    if (diasMora <= 60) return '30 A 60';
    if (diasMora <= 90) return '60 A 90';
    return 'MAYOR A 90';
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearFechaSoloFecha(fecha) {
    if (!fecha) return 'N/A';

    // Evitar desfases por zona horaria cuando la fecha viene como YYYY-MM-DD
    if (typeof fecha === 'string') {
        const soloFecha = fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (soloFecha) {
            return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
        }
    }

    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) {
        return fecha;
    }

    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function renderizarCuotasAcuerdoManual() {
    const cantidadCuotasEl = document.getElementById('simulador-num-cuotas');
    const container = document.getElementById('acuerdo-cuotas-detalle');
    if (!cantidadCuotasEl || !container) return;

    const raw = parseInt(cantidadCuotasEl.value, 10);
    const totalCuotas = Math.min(10, Math.max(1, Number.isFinite(raw) && raw > 0 ? raw : 2));
    const valoresPrevios = {};
    const fechasPrevias = {};
    container.querySelectorAll('[data-cuota-item]').forEach(function(item) {
        const numero = item.getAttribute('data-cuota-item');
        const valorInput = item.querySelector('.cuota-valor');
        const fechaInput = item.querySelector('.cuota-fecha');
        if (numero) {
            valoresPrevios[numero] = valorInput ? valorInput.value : '';
            fechasPrevias[numero] = fechaInput ? fechaInput.value : '';
        }
    });

    let html = '';
    for (let i = 1; i <= totalCuotas; i++) {
        const valorPrevio = valoresPrevios[String(i)] || '';
        const fechaPrevia = fechasPrevias[String(i)] || '';
        html += `
            <div data-cuota-item="${i}" style="border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; background: #fafbfc;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #2c3e50;">Cuota ${i}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; margin-bottom: 4px;">Valor</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                            <input type="text" class="cuota-valor" data-numero-cuota="${i}" value="${valorPrevio}" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; margin-bottom: 4px;">Fecha de pago</label>
                        <input type="date" class="cuota-fecha" data-numero-cuota="${i}" value="${fechaPrevia}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.cuota-valor').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                e.target.value = !isNaN(numValue) && numValue >= 0
                    ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : value;
            } else {
                e.target.value = '';
            }
            actualizarResumenCuotasManual();
        });
        input.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) {
                e.target.value = num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
            actualizarResumenCuotasManual();
        });
    });

    actualizarResumenCuotasManual();
}

function obtenerCuotasAcuerdoManual() {
    const items = document.querySelectorAll('#acuerdo-cuotas-detalle [data-cuota-item]');
    return Array.from(items).map(function(item, index) {
        const valorInput = item.querySelector('.cuota-valor');
        const fechaInput = item.querySelector('.cuota-fecha');
        return {
            numero_cuota: index + 1,
            valor_cuota: valorInput ? parsePesosColombia(valorInput.value) : 0,
            fecha_pago: fechaInput ? fechaInput.value : ''
        };
    });
}

function actualizarResumenCuotasManual() {
    const primerValorEl = document.getElementById('simulador-valor-cuota');
    if (!primerValorEl) return;

    const cuotas = obtenerCuotasAcuerdoManual();
    if (cuotas.length === 0 || !cuotas[0].valor_cuota) {
        primerValorEl.value = '';
        return;
    }

    primerValorEl.value = cuotas[0].valor_cuota.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function cargarHistorial() {
    console.log('Asesor_gestionar.js: Cargando historial del cliente:', clienteId);
    
    // Hacer petición AJAX para obtener historial
    fetch(`index.php?action=obtener_historial_gestiones&cliente_id=${clienteId}`)
        .then(response => {
            console.log('Asesor_gestionar.js: Respuesta de historial recibida:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Asesor_gestionar.js: Datos de historial recibidos:', data);
            
            if (data.success) {
                console.log('Asesor_gestionar.js: Gestiones obtenidas:', data.gestiones);
                mostrarHistorial(data.gestiones);
            } else {
                console.error('Asesor_gestionar.js: Error al cargar historial:', data.message);
                mostrarErrorHistorial('Error al cargar historial: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Asesor_gestionar.js: Error en la petición de historial:', error);
            mostrarErrorHistorial('Error de conexión al cargar historial: ' + error.message);
        });
}

function mostrarHistorial(gestiones) {
    const container = document.getElementById('historial-container');
    
    if (!container) {
        console.error('Asesor_gestionar.js: No se encontró el contenedor de historial');
        return;
    }
    
    if (gestiones.length === 0) {
        container.innerHTML = `
            <div class="historial-vacio">
                <i class="fas fa-info-circle"></i>
                <p>Sin historial: Este cliente no tiene gestiones registradas aún.</p>
            </div>
        `;
        return;
    }
    
    // Generar HTML del historial
    let html = '<div class="historial-lista">';
    
    gestiones.forEach((gestion, index) => {
        const fecha = formatearFecha(gestion.fecha_creacion);
        const canal = gestion.canal_contacto || 'No especificado';
        const nivel1 = gestion.nivel1_tipo || 'No especificado';
        const nivel2 = obtenerNivel2(gestion);
        const codigoNivel2 = gestion.nivel2_tipo || gestion.nivel2_clasificacion || '';
        const codigoNivel3 = gestion.nivel3_tipo || gestion.nivel3_detalle || '';
        const esVolverLlamarTipificacion = codigoNivel2 === 'volver_llamar' || codigoNivel3 === 'volver_llamar';
        const htmlVolverLlamarProgramado = esVolverLlamarTipificacion && gestion.volver_llamar_programado
            ? `<p><strong>Volver a llamar programado:</strong> ${formatearVolverLlamarProgramado(gestion.volver_llamar_programado)}</p>`
            : '';
        const esAcuerdoPago = String(gestion.nivel1_tipo || '').trim().toUpperCase() === 'ACUERDO DE PAGO';
        const canalesAuth = obtenerCanalesAutorizados(gestion);
        const asesor = gestion.asesor_nombre || 'Asesor no identificado';
        const nombreBase = gestion.nombre_base || gestion.NOMBRE_BASE || gestion.base || 'Sin base';
        
        html += `
            <div class="historial-item">
                <div style="margin-bottom: 10px;">
                    <div style="color: #00c0e1; font-weight: 600;">
                        <i class="fas fa-calendar"></i> ${fecha}
                    </div>
                    <div style="margin-top: 5px;">
                        <span style="background: #6c757d; color: white; padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; display: inline-block;">
                            <i class="fas fa-user"></i> Asesor: ${asesor}
                        </span>
                        <span style="background: #17a2b8; color: white; padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; display: inline-block; margin-left: 6px;">
                            <i class="fas fa-database"></i> Base: ${nombreBase}
                        </span>
                    </div>
                </div>
                <div class="historial-detalle">
                    <div class="detalle-columna">
                        <p><strong>Canal:</strong> ${canal}</p>
                        <p><strong>Nivel 1 (Clasificación):</strong> ${nivel1}</p>
                        <p><strong>Nivel 2 (Tipificación):</strong> ${nivel2}</p>
                        ${htmlVolverLlamarProgramado}
                        ${gestion.fecha_pago ? `<p><strong>${esAcuerdoPago ? 'Fecha de pago del acuerdo' : 'Fecha de Pago'}:</strong> ${formatearFechaSoloFecha(gestion.fecha_pago)}</p>` : ''}
                        ${gestion.valor_pago ? `<p><strong>Valor de Pago:</strong> $${parseFloat(gestion.valor_pago).toLocaleString('es-CO')}</p>` : ''}
                    </div>
                    <div class="detalle-columna">
                        <p><strong>Canales autorizados:</strong> ${canalesAuth}</p>
                        <p><strong>Obligación:</strong> ${gestion.obligacion_operacion || gestion.contrato_id || 'Ninguna'}</p>
                        ${gestion.duracion_segundos ? `<p><strong>Duración:</strong> ${Math.floor(gestion.duracion_segundos / 60)} min ${gestion.duracion_segundos % 60} seg</p>` : ''}
                        ${gestion.numero_contacto ? `<p><strong>Número contactado:</strong> ${gestion.numero_contacto}</p>` : ''}
                    </div>
                </div>
                ${gestion.acuerdo ? (function() {
                    const a = gestion.acuerdo;
                    let bloque = '<div class="historial-acuerdo" style="margin-top: 12px; padding: 10px; background: #f0f8ff; border-left: 4px solid #00c0e1; border-radius: 4px;">';
                    bloque += '<p style="margin: 0 0 8px; font-weight: 600; color: #00c0e1;"><i class="fas fa-file-contract"></i> Datos del acuerdo</p>';
                    if (a.tipo_acuerdo === 'total') {
                        if (a.valor_original != null) bloque += '<p style="margin: 4px 0;"><strong>Saldo a pagar:</strong> $' + parseFloat(a.valor_original).toLocaleString('es-CO') + '</p>';
                        if (a.descuento_aplicado != null && parseFloat(a.descuento_aplicado) > 0) bloque += '<p style="margin: 4px 0;"><strong>Descuento aplicado:</strong> $' + parseFloat(a.descuento_aplicado).toLocaleString('es-CO') + '</p>';
                        if (a.valor_final_pago_total != null) bloque += '<p style="margin: 4px 0;"><strong>Total a pagar:</strong> $' + parseFloat(a.valor_final_pago_total).toLocaleString('es-CO') + '</p>';
                        if (a.fecha_limite_pago) bloque += '<p style="margin: 4px 0;"><strong>Fecha de pago:</strong> ' + formatearFechaSoloFecha(a.fecha_limite_pago) + '</p>';
                    } else if (a.tipo_acuerdo === 'cuotas') {
                        if (a.valor_original != null) bloque += '<p style="margin: 4px 0;"><strong>Monto a financiar:</strong> $' + parseFloat(a.valor_original).toLocaleString('es-CO') + '</p>';
                        if (a.numero_cuotas != null) bloque += '<p style="margin: 4px 0;"><strong>Número de cuotas:</strong> ' + a.numero_cuotas + '</p>';
                        if (a.valor_cuota_mensual != null) bloque += '<p style="margin: 4px 0;"><strong>Valor cuota:</strong> $' + parseFloat(a.valor_cuota_mensual).toLocaleString('es-CO') + '</p>';
                        if (Array.isArray(gestion.acuerdo_cuotas) && gestion.acuerdo_cuotas.length > 0) {
                            bloque += '<div style="margin-top: 10px;"><p style="margin: 0 0 8px; font-weight: 600;">Detalle de cuotas</p>';
                            gestion.acuerdo_cuotas.forEach(function(cuotaDetalle) {
                                const valorCuota = parseFloat(cuotaDetalle.valor_cuota || 0);
                                bloque += '<p style="margin: 4px 0;"><strong>Cuota ' + cuotaDetalle.numero_cuota + ':</strong> $' + valorCuota.toLocaleString('es-CO') + ' - ' + formatearFechaSoloFecha(cuotaDetalle.fecha_pago) + '</p>';
                            });
                            bloque += '</div>';
                        }
                    } else if (a.tipo_acuerdo === 'comite') {
                        if (a.valor_original != null) bloque += '<p style="margin: 4px 0;"><strong>Monto propuesto:</strong> $' + parseFloat(a.valor_original).toLocaleString('es-CO') + '</p>';
                        if (a.estado_aprobacion) bloque += '<p style="margin: 4px 0;"><strong>Estado:</strong> ' + (a.estado_aprobacion === 'pendiente' ? 'Pendiente' : a.estado_aprobacion === 'aprobado' ? 'Aprobado' : 'Rechazado') + '</p>';
                    }
                    bloque += '</div>';
                    return bloque;
                })() : ''}
                ${gestion.observaciones ? `
                <div class="historial-observaciones">
                    <p><strong>Observaciones:</strong></p>
                    <p>${gestion.observaciones}</p>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Función para obtener solo el nivel 2 de la tipificación (texto amigable)
function obtenerNivel2(gestion) {
    const valor = gestion.nivel2_tipo || gestion.nivel2_clasificacion;
    if (!valor) return 'No especificado';
    const textosAcuerdo = {
        'acuerdo_pago_total': 'Pago total',
        'acuerdo_largo_plazo': 'Acuerdo a largo plazo',
        'acuerdo_aprobado': 'Acuerdo aprobado por comité'
    };
    if (textosAcuerdo[valor]) return textosAcuerdo[valor];
    const nivel2Textos = {
        // Sub-opciones guardadas en historial.nivel2_tipo (antes “nivel 3” en UI)
        'volver_llamar': 'VOLVER A LLAMAR',
        'seguimiento': 'SEGUIMIENTO NEGOCIACIÓN VIGENTE',
        'propuesta_estudio': 'PROPUESTA EN ESTUDIO',
        'posible_negociacion': 'POSIBLE NEGOCIACION',
        'pago_total': 'PAGO TOTAL',
        'pago_cuota': 'PAGO CUOTA',
        'no_reconoce': 'NO RECONOCE LA OBLIGACIÓN',
        'dificultad_pago': 'DIFICULTAD DE PAGO',
        'reclamacion': 'RECLAMACIÓN',
        'renuente': 'RENUENTE',
        'contesta_cuelga': 'CONTESTA Y CUELGA',
        'contacto_tercero': 'CONTACTO CON TERCERO',
        'fallecido': 'FALLECIDO',
        'no_contesta': 'NO CONTESTA',
        'buzon_mensaje': 'BUZÓN DE MENSAJE',
        'fuera_servicio': 'FUERA DE SERVICIO',
        'numero_equivocado': 'NUMERO EQUIVOCADO',
        'telefono_apagado': 'TELÉFONO APAGADO',
        'telefono_danado': 'TELÉFONO DAÑADO',
        'ilocalizado': 'ILOCALIZADO',
        'no_entregado': 'NO ENTREGADO',
        'entregado': 'ENTREGADO',
        'envio_mensaje': 'ENVIO DE MENSAJE A TITULAR',
        // LLAMADA SALIENTE
        '1.0': 'YA PAGO',
        '1.1': 'ACUERDO DE PAGO',
        '1.2': 'RECORDATORIO',
        '1.3': 'VOLUNTAD DE PAGO',
        '2.0': 'LOCALIZADO SIN ACUERDO',
        '3.0': 'FALLECIDO',
        '4.0': 'NO CONTACTO',
        
        // WHATSAPP
        'ws_1.0': 'YA PAGO',
        'ws_1.1': 'ACUERDO DE PAGO',
        'ws_1.2': 'RECORDATORIO',
        'ws_1.3': 'VOLUNTAD DE PAGO',
        'ws_2.0': 'LOCALIZADO SIN ACUERDO',
        'ws_3.0': 'FALLECIDO',
        'ws_4.0': 'NO CONTACTO',
        
        // EMAIL
        'em_1.0': 'NO ENTREGADO',
        'em_1.1': 'ENTREGADO',
        'em_1.2': 'ENVIO DE MENSAJE A TITULAR',
        
        // RECIBIR LLAMADA
        'rc_1.0': 'YA PAGO',
        'rc_1.1': 'ACUERDO DE PAGO',
        'rc_1.2': 'VOLUNTAD DE PAGO',
        'rc_2.0': 'LOCALIZADO SIN ACUERDO',
        'rc_3.0': 'FALLECIDO',
        'rc_4.0': 'NO CONTACTO',
        
        // Valores antiguos (compatibilidad)
        '5.0': 'BUZON DE MENSAJE',
        '6.0': 'DESERTO / COLGO / NO ESCUCHA / NO ENTIENDE',
        '6.1': 'NO CONTESTA',
        '7.0': 'AQUI NO VIVE / TRABAJA / EQUIVOCADO',
        '7.1': 'TELEFONO DAÑADO / ERRADO',
        '8.0': 'FALLECIDO / OTROS',
        '2.1': 'INGRESO A PLATAFORMA / CONSULTA OFERTA',
        '2.2': 'CONFIRMA QUE SI A MSG OBJETIVO',
        '2.3': 'CONFIRMA QUE NO A MSG OBJETIVO',
        '3.1': 'RECLAMO / RENUENTE'
    };
    
    // Usar nivel2_tipo de la nueva tabla historial_gestion
    const nivel2Value = gestion.nivel2_tipo || gestion.nivel2_clasificacion;
    return nivel2Textos[nivel2Value] || nivel2Value || 'No especificado';
}

function formatearVolverLlamarProgramado(raw) {
    if (!raw) return '';
    const d = new Date(String(raw).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

/** Fecha local Y-m-d en zona America/Bogota (sin DST). */
function obtenerFechaMinVolverLlamarColombia() {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());
        const y = parts.find(function (p) { return p.type === 'year'; });
        const mo = parts.find(function (p) { return p.type === 'month'; });
        const d = parts.find(function (p) { return p.type === 'day'; });
        if (y && mo && d) {
            return y.value + '-' + mo.value + '-' + d.value;
        }
    } catch (e) { /* ignore */ }
    return new Date().toISOString().slice(0, 10);
}

/**
 * Comprueba que fecha (Y-m-d) + hora (HH:MM) no sea anterior a "ahora" en Colombia (UTC-5).
 */
function validarVolverLlamarNoPasado(fechaYmd, horaHm) {
    const minD = obtenerFechaMinVolverLlamarColombia();
    if (!fechaYmd || fechaYmd < minD) {
        return { ok: false, message: 'La fecha de volver a llamar no puede ser anterior a hoy (hora Colombia).' };
    }
    const horaNorm = horaHm && horaHm.length === 5 ? horaHm + ':00' : horaHm;
    const tMs = Date.parse(fechaYmd + 'T' + horaNorm + '-05:00');
    if (isNaN(tMs)) {
        return { ok: false, message: 'Fecha u hora de volver a llamar inválida.' };
    }
    if (tMs < Date.now()) {
        return { ok: false, message: 'La fecha y hora de volver a llamar no pueden ser anteriores al momento actual.' };
    }
    return { ok: true };
}

function actualizarCamposVolverLlamarProgramacion(nivel2Valor) {
    const box = document.getElementById('campos-volver-llamar-programacion');
    if (!box) return;
    if (nivel2Valor === 'volver_llamar') {
        box.style.display = 'block';
        const fe = document.getElementById('volver-llamar-fecha');
        const minD = obtenerFechaMinVolverLlamarColombia();
        if (fe) {
            fe.min = minD;
            if (fe.value && fe.value < minD) {
                fe.value = '';
            }
        }
    } else {
        box.style.display = 'none';
        const fe = document.getElementById('volver-llamar-fecha');
        const ho = document.getElementById('volver-llamar-hora');
        if (fe) fe.value = '';
        if (ho) ho.value = '';
    }
}

function obtenerTipificacionCompleta(gestion) {
    if (!gestion.nivel1_tipo) return 'No tipificado';
    
    // Mapear Nivel 1 a texto (nueva estructura)
    const nivel1Textos = {
        'llamada_saliente': 'LLAMADA SALIENTE',
        'whatsapp': 'WHATSAPP',
        'email': 'EMAIL',
        'recibir_llamada': 'RECIBIR LLAMADA',
        // Mantener compatibilidad con valores antiguos
        'hacer_llamada': 'HACER LLAMADA',
        'interaccion': 'INTERACCION',
        '1': 'CONTACTADO',
        '2': 'NO CONTACTADO'
    };
    let resultado = nivel1Textos[gestion.nivel1_tipo] || gestion.nivel1_tipo;
    
    const nivel2Val = gestion.nivel2_tipo || gestion.nivel2_clasificacion;
    // Mapear Nivel 2 a texto (en BD viene como nivel2_tipo)
    if (nivel2Val) {
        const nivel2Texto = obtenerNivel2(gestion);
        resultado += ' > ' + nivel2Texto;
    }
    
    // Mapear Nivel 3 a texto (nueva estructura completa)
    const nivel3Val = gestion.nivel3_detalle || gestion.nivel3_tipo;
    if (nivel3Val) {
        const nivel3Textos = {
            // Nueva estructura
            'pago_total': 'PAGO TOTAL',
            'pago_cuota': 'PAGO CUOTA',
            'acuerdo_pago_total': 'ACUERDO PAGO TOTAL',
            'acuerdo_largo_plazo': 'ACUERDO A LARGO PLAZO',
            'acuerdo_aprobado': 'ACUERDO APROBADO COMITÉ',
            'seguimiento': 'SEGUIMIENTO NEGOCIACIÓN VIGENTE',
            'volver_llamar': 'VOLVER A LLAMAR',
            'propuesta_estudio': 'PROPUESTA EN ESTUDIO',
            'posible_negociacion': 'POSIBLE NEGOCIACION',
            'no_reconoce': 'NO RECONOCE LA OBLIGACIÓN',
            'dificultad_pago': 'DIFICULTAD DE PAGO',
            'reclamacion': 'RECLAMACIÓN',
            'renuente': 'RENUENTE',
            'contesta_cuelga': 'CONTESTA Y CUELGA',
            'contacto_tercero': 'CONTACTO CON TERCERO',
            'fallecido': 'FALLECIDO',
            'no_contesta': 'NO CONTESTA',
            'buzon_mensaje': 'BUZÓN DE MENSAJE',
            'fuera_servicio': 'FUERA DE SERVICIO',
            'numero_equivocado': 'NUMERO EQUIVOCADO',
            'telefono_apagado': 'TELÉFONO APAGADO',
            'telefono_danado': 'TELÉFONO DAÑADO',
            'ilocalizado': 'ILOCALIZADO',
            'no_entregado': 'NO ENTREGADO',
            'entregado': 'ENTREGADO',
            'envio_mensaje': 'ENVIO DE MENSAJE A TITULAR',
            
            // Valores antiguos (compatibilidad)
            '1': 'TITULAR / ENCARGADO',
            '2': 'TERCERO VALIDO',
            '3': 'NO CONTACTO',
            '4': 'ILOCALIZADO',
            '1.1.1': 'Informa fecha probable de pago',
            '1.1.2': 'Pagos parciales',
            '1.1.3': 'Inconvenientes plataforma de pago',
            '1.1.4': 'Débito automático no realizado',
            '1.1.5': 'Problemas en facturación',
            '1.1.6': 'Espera ingreso de dinero',
            '1.1.7': 'Paga un Tercero',
            '1.1.8': 'Solicitará cambio modalidad de pago',
            '1.1.9': 'No informa fecha probable'
        };
        
        resultado += ' > ' + (nivel3Textos[nivel3Val] || nivel3Val);
    }

    if (nivel2Val === 'volver_llamar' && gestion.volver_llamar_programado) {
        resultado += ' · ' + formatearVolverLlamarProgramado(gestion.volver_llamar_programado);
    }
    
    return resultado;
}

function obtenerCanalesAutorizados(gestion) {
    const canales = [];
    
    // Usar los nuevos campos de la tabla historial_gestion
    if (gestion.llamada_telefonica === 'si' || gestion.llamada_telefonica === true) canales.push('Llamada');
    if (gestion.whatsapp === 'si' || gestion.whatsapp === true) canales.push('WhatsApp');
    if (gestion.email === 'si' || gestion.email === true) canales.push('Email');
    if (gestion.sms === 'si' || gestion.sms === true) canales.push('SMS');
    if (gestion.correo_fisico === 'si' || gestion.correo_fisico === true) canales.push('Correo Físico');
    
    // Compatibilidad con campos antiguos
    if (gestion.correo_electronico === 'si' || gestion.correo_electronico === true) canales.push('Email');
    if (gestion.mensajeria_aplicacion === 'si' || gestion.mensajeria_aplicacion === true) canales.push('Mensajería');
    
    return canales.length > 0 ? canales.join(', ') : 'Ninguno';
}

function mostrarErrorHistorial(mensaje) {
    const container = document.getElementById('historial-container');
    
    if (!container) {
        console.error('Asesor_gestionar.js: No se encontró el contenedor de historial (error)');
        return;
    }
    
    container.innerHTML = `
        <div class="error-historial">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensaje}</p>
        </div>
    `;
}

function mostrarError(mensaje) {
    console.error('Asesor_gestionar.js: Error:', mensaje);
    alert('Error: ' + mensaje);
}

// ========================================
// FUNCIONES DE NAVEGACIÓN
// ========================================

function volverTareas() {
    console.log('Asesor_gestionar.js: Volviendo a tareas');
    window.location.href = 'index.php?action=asesor_dashboard';
}

function irDashboard() {
    console.log('Asesor_gestionar.js: Yendo al dashboard');
    window.location.href = 'index.php?action=asesor_dashboard';
}

function guardarGestion() {
    console.log('Asesor_gestionar.js: Guardando gestión');
    
    // Obtener datos del formulario
    const canalContacto = document.getElementById('canal-contacto').value;
    const contratoGestionar = document.getElementById('contrato-gestionar').value;
    const nivel1Select = document.getElementById('tipo-contacto-nivel1');
    const nivel1 = nivel1Select ? nivel1Select.value : '';
    const nivel1TipoLabel = (nivel1 && nivel1Select.selectedOptions[0]) ? nivel1Select.selectedOptions[0].textContent.trim() : null;
    const nivel2 = document.getElementById('tipo-contacto-nivel2').value;
    const observaciones = document.getElementById('observaciones-texto').value;
    const esAcuerdoPago = nivel1 === '1.1' || nivel1 === 'ws_1.1' || nivel1 === 'rc_1.1';
    const acuerdoDesdeTarjetasMulti = esAcuerdoPago && debeMostrarAcuerdosMultiObligacion() && contratoGestionar && contratoGestionar !== '' && contratoGestionar !== 'ninguna' && contratoGestionar !== 'todas';
    const salteaFormularioAcuerdoUnicoPorTodasMulti = contratoGestionar === 'todas' && esAcuerdoPago && cantidadObligacionesCliente() > 1 && esNivel2AcuerdoDatosExtendidos(nivel2);

    // ACUERDO DE PAGO: cuota, cuota actual, fecha de pago y obligación obligatoria
    let fechaPago = null;
    let cuota = null;
    let cuotaActual = null;
    let saldoAPagar = null;
    let descuentoMonto = null;
    let descuentoPorcentaje = null;
    let totalAPagarAcuerdo = null;
    let fechaLimiteAcuerdo = null;
    let acuerdoComiteMontoPropuesto = null;
    let acuerdoComiteEstado = null;
    let simuladorMonto = null;
    let simuladorNumeroCuotas = null;
    let simuladorValorCuota = null;
    let cuotasAcuerdo = [];
    
    if (!acuerdoDesdeTarjetasMulti && !salteaFormularioAcuerdoUnicoPorTodasMulti && (nivel1 === '1.1' || nivel1 === 'ws_1.1' || nivel1 === 'rc_1.1')) {
        // Si es ACUERDO APROBADO POR COMITÉ, usar flujo de aprobación
        if (nivel2 === 'acuerdo_aprobado') {
            const montoInput = document.getElementById('acuerdo-comite-monto-propuesto');
            const estadoSelect = document.getElementById('acuerdo-comite-estado');
            if (montoInput && montoInput.value) {
                const v = parsePesosColombia(montoInput.value);
                acuerdoComiteMontoPropuesto = v > 0 ? v : null;
            }
            if (estadoSelect) acuerdoComiteEstado = estadoSelect.value || 'pendiente';
        }
        // Si es ACUERDO PAGO TOTAL, usar los campos específicos
        else if (nivel2 === 'acuerdo_pago_total') {
            const saldoInput = document.getElementById('saldo-a-pagar');
            const descuentoMontoInput = document.getElementById('descuento-monto');
            const descuentoPorcentajeInput = document.getElementById('descuento-porcentaje');
            const totalInput = document.getElementById('total-a-pagar-acuerdo');
            const fechaLimiteInput = document.getElementById('fecha-limite-acuerdo');
            
            if (saldoInput && saldoInput.value) {
                const v = parsePesosColombia(saldoInput.value);
                saldoAPagar = v > 0 ? v : null;
            }
            if (descuentoMontoInput && descuentoMontoInput.value) {
                const v = parsePesosColombia(descuentoMontoInput.value);
                descuentoMonto = v > 0 ? v : null;
            }
            if (descuentoPorcentajeInput && descuentoPorcentajeInput.value) {
                const v = descuentoPorcentajeInput.value.replace(',', '.').replace(/[^\d.]/g, '');
                descuentoPorcentaje = v ? parseFloat(v) : null;
            }
            if (totalInput && totalInput.value) {
                const v = parsePesosColombia(totalInput.value);
                totalAPagarAcuerdo = v > 0 ? v : null;
            }
            if (fechaLimiteInput && fechaLimiteInput.value) {
                fechaLimiteAcuerdo = fechaLimiteInput.value;
            }
            // Para acuerdo pago total, usar fecha límite como fecha de pago
            fechaPago = fechaLimiteAcuerdo;
            // Usar total a pagar como cuota
            cuota = totalAPagarAcuerdo;
        } else if (nivel2 === 'acuerdo_largo_plazo') {
            const simMontoEl = document.getElementById('simulador-monto');
            const simNumCuotasEl = document.getElementById('simulador-num-cuotas');
            const simValorCuotaEl = document.getElementById('simulador-valor-cuota');
            if (simMontoEl && simMontoEl.value) {
                const v = parsePesosColombia(simMontoEl.value);
                simuladorMonto = v > 0 ? v : null;
            }
            if (simNumCuotasEl && simNumCuotasEl.value) simuladorNumeroCuotas = parseInt(simNumCuotasEl.value, 10) || null;
            if (simValorCuotaEl && simValorCuotaEl.value) {
                const v = parsePesosColombia(simValorCuotaEl.value);
                simuladorValorCuota = v > 0 ? v : null;
            }
            cuotasAcuerdo = obtenerCuotasAcuerdoManual();
            if (!simuladorNumeroCuotas || simuladorNumeroCuotas < 1 || simuladorNumeroCuotas > 10) {
                alert('El acuerdo a largo plazo debe tener entre 1 y 10 cuotas.');
                return;
            }
            if (cuotasAcuerdo.length !== simuladorNumeroCuotas) {
                alert('Debe registrar exactamente la cantidad de cuotas indicada.');
                return;
            }
            const cuotaInvalida = cuotasAcuerdo.find(function(item, index) {
                return item.numero_cuota !== (index + 1) || !item.fecha_pago || !item.valor_cuota || item.valor_cuota <= 0;
            });
            if (cuotaInvalida) {
                alert('Cada cuota debe tener un valor mayor a cero y una fecha de pago.');
                return;
            }
            fechaPago = cuotasAcuerdo[0].fecha_pago;
            cuota = cuotasAcuerdo[0].valor_cuota;
        } else {
            // Campos generales para otros tipos de acuerdo
            const fechaPagoInput = document.getElementById('fecha-pago');
            const cuotaInput = document.getElementById('cuota-pago');
            const cuotaActualInput = document.getElementById('cuota-actual');
            if (fechaPagoInput && fechaPagoInput.value) fechaPago = fechaPagoInput.value;
            if (cuotaInput && cuotaInput.value) {
                const v = cuotaInput.value.replace(/[^\d.]/g, '');
                cuota = v ? parseFloat(v) : null;
            }
            if (cuotaActualInput && cuotaActualInput.value) {
                const v = cuotaActualInput.value.replace(/[^\d.]/g, '');
                cuotaActual = v ? parseFloat(v) : null;
            }
        }
    }
    
    // Verificar si se seleccionó "Todas"
    if (contratoGestionar === 'todas') {
        const packIds = obtenerIdsObligacionesParaGuardarTodasAcuerdo(nivel1);
        if (!packIds.ok) {
            alert(packIds.message);
            return;
        }
        const todasFacturas = packIds.ids;
        if (todasFacturas.length === 0) {
            alert('No hay facturas disponibles para gestionar');
            return;
        }

        guardarGestionMultiplesFacturas(todasFacturas, canalContacto, nivel1TipoLabel, nivel2, observaciones, nivel1);
        return;
    }
    
    // Validar campos obligatorios para factura individual
    if (!canalContacto) {
        alert('Por favor seleccione el Canal de Contacto');
        return;
    }
    if (!nivel1) {
        alert('Por favor seleccione la Clasificación (Nivel 1)');
        return;
    }
    if (!nivel2) {
        alert('Por favor seleccione la Clasificación (Nivel 2)');
        return;
    }
    if (!observaciones || observaciones.trim().length < 10) {
        alert('Las observaciones detalladas son obligatorias y deben tener al menos 10 caracteres.');
        return;
    }
    // Si es ACUERDO DE PAGO debe elegir un número de obligación (Obligación a gestionar)
    if (!esAcuerdoPago && !contratoGestionar) {
        alert('Por favor seleccione la Obligación a gestionar o marque "Ninguna".');
        return;
    }
    if (esAcuerdoPago && (contratoGestionar === '' || contratoGestionar === 'ninguna')) {
        alert('Para ACUERDO DE PAGO debe seleccionar un Número de obligación (Obligación a gestionar).');
        return;
    }

    if (acuerdoDesdeTarjetasMulti) {
        const listaTarjetas = obtenerListaObligacionesParaTarjetasAcuerdo();
        if (listaTarjetas.length === 0) {
            alert('Seleccione una obligación o Todas las obligaciones para diligenciar el acuerdo.');
            return;
        }
        for (let ti = 0; ti < listaTarjetas.length; ti++) {
            const obRow = listaTarjetas[ti];
            const operacion = obRow.operacion || String(obRow.id_obligacion);
            const vTarj = validarTarjetaAcuerdoMulti(obRow.id_obligacion, operacion, nivel2);
            if (!vTarj.ok) {
                alert(vTarj.message);
                return;
            }
        }
    }

    if (!acuerdoDesdeTarjetasMulti && !salteaFormularioAcuerdoUnicoPorTodasMulti && esAcuerdoPago && nivel2 === 'acuerdo_pago_total') {
        const saldoInput = document.getElementById('saldo-a-pagar');
        const descuentoMontoInput = document.getElementById('descuento-monto');
        const descuentoPorcentajeInput = document.getElementById('descuento-porcentaje');
        const totalInput = document.getElementById('total-a-pagar-acuerdo');
        const fechaLimiteInput = document.getElementById('fecha-limite-acuerdo');
        const saldoRaw = saldoInput ? String(saldoInput.value || '').trim() : '';
        const descuentoMontoRaw = descuentoMontoInput ? String(descuentoMontoInput.value || '').trim() : '';
        const descuentoPctRaw = descuentoPorcentajeInput ? String(descuentoPorcentajeInput.value || '').trim() : '';
        const totalRaw = totalInput ? String(totalInput.value || '').trim() : '';
        const fechaLimiteRaw = fechaLimiteInput ? String(fechaLimiteInput.value || '').trim() : '';
        if (!saldoRaw || !descuentoMontoRaw || !descuentoPctRaw || !totalRaw || !fechaLimiteRaw) {
            alert('Para ACUERDO PAGO TOTAL debe diligenciar todos los campos del acuerdo.');
            return;
        }
    }

    if (!acuerdoDesdeTarjetasMulti && !salteaFormularioAcuerdoUnicoPorTodasMulti && esAcuerdoPago && nivel2 === 'acuerdo_largo_plazo') {
        const simMontoEl = document.getElementById('simulador-monto');
        const simNumCuotasEl = document.getElementById('simulador-num-cuotas');
        const simValorCuotaEl = document.getElementById('simulador-valor-cuota');
        const montoRaw = simMontoEl ? String(simMontoEl.value || '').trim() : '';
        const numCuotasRaw = simNumCuotasEl ? String(simNumCuotasEl.value || '').trim() : '';
        const valorCuotaRaw = simValorCuotaEl ? String(simValorCuotaEl.value || '').trim() : '';
        if (!montoRaw || !numCuotasRaw || !valorCuotaRaw) {
            alert('Para ACUERDO A LARGO PLAZO debe diligenciar todos los campos del acuerdo.');
            return;
        }
    }

    if (!acuerdoDesdeTarjetasMulti && !salteaFormularioAcuerdoUnicoPorTodasMulti && esAcuerdoPago && nivel2 === 'acuerdo_aprobado') {
        const montoComiteEl = document.getElementById('acuerdo-comite-monto-propuesto');
        const estadoComiteEl = document.getElementById('acuerdo-comite-estado');
        const montoComiteRaw = montoComiteEl ? String(montoComiteEl.value || '').trim() : '';
        const estadoComiteRaw = estadoComiteEl ? String(estadoComiteEl.value || '').trim() : '';
        if (!montoComiteRaw || !estadoComiteRaw) {
            alert('Para ACUERDO APROBADO POR COMITÉ debe diligenciar todos los campos del acuerdo.');
            return;
        }
    }

    if (nivel2 === 'volver_llamar') {
        const fe = document.getElementById('volver-llamar-fecha');
        const ho = document.getElementById('volver-llamar-hora');
        const feRaw = fe ? String(fe.value || '').trim() : '';
        const hoRaw = ho ? String(ho.value || '').trim() : '';
        if (!feRaw || !hoRaw) {
            alert('Para VOLVER A LLAMAR debe indicar fecha y hora de la próxima llamada.');
            return;
        }
        const chk = validarVolverLlamarNoPasado(feRaw, hoRaw);
        if (!chk.ok) {
            alert(chk.message);
            return;
        }
    }
    
    // Si no se selecciona factura, se guardará como "ninguna" (cliente no quiso pagar ninguna)
    // No es obligatorio seleccionar factura
    
    // Obtener canales de comunicación autorizados
    const canales = {
        llamada: document.getElementById('canal-llamada')?.checked || false,
        whatsapp: document.getElementById('canal-whatsapp')?.checked || false,
        email: document.getElementById('canal-email')?.checked || false,
        sms: document.getElementById('canal-sms')?.checked || false,
        correo: document.getElementById('canal-correo')?.checked || false,
        mensajeria: document.getElementById('canal-mensajeria')?.checked || false
    };
    
    // Calcular duración de la gestión
    let duracionSegundos = 0;
    if (inicioGestion) {
        const finGestion = new Date();
        duracionSegundos = Math.floor((finGestion - inicioGestion) / 1000);
        console.log('Duración de la gestión:', duracionSegundos, 'segundos');
    }
    
    // Preparar datos para enviar
    // Si no se selecciona factura o se selecciona "ninguna", guardar como "ninguna"
    const contratoIdFinal = (contratoGestionar && contratoGestionar !== '' && contratoGestionar !== 'ninguna') 
        ? contratoGestionar 
        : 'ninguna';
    
    // Teléfono seleccionado en la información del cliente → historial_gestion.numero_contacto (telefono_contacto)
    let numeroContacto = obtenerNumeroContactoSeleccionado();

    let volverLlamarFecha = null;
    let volverLlamarHora = null;
    if (nivel2 === 'volver_llamar') {
        const fe = document.getElementById('volver-llamar-fecha');
        const ho = document.getElementById('volver-llamar-hora');
        volverLlamarFecha = fe && fe.value ? fe.value : null;
        volverLlamarHora = ho && ho.value ? ho.value : null;
    }
    
    const datosGestion = {
        canal_contacto: canalContacto || null,
        contrato_id: contratoIdFinal,
        nivel1_tipo: nivel1TipoLabel || null,
        nivel2_clasificacion: nivel2 || null,
        nivel3_detalle: '', // Tipificación solo hasta Nivel 2
        nivel4_tipo: '',
        observaciones: observaciones || null,
        canales: canales,
        duracion_segundos: duracionSegundos,
        fecha_pago: fechaPago || null,
        cuota: cuota,
        cuota_actual: cuotaActual,
        numero_contacto: numeroContacto || '',
        // Campos específicos para ACUERDO PAGO TOTAL
        saldo_a_pagar: saldoAPagar,
        descuento_monto: descuentoMonto,
        descuento_porcentaje: descuentoPorcentaje,
        total_a_pagar_acuerdo: totalAPagarAcuerdo,
        fecha_limite_acuerdo: fechaLimiteAcuerdo,
        // Campos para ACUERDO APROBADO POR COMITÉ
        acuerdo_comite_monto_propuesto: acuerdoComiteMontoPropuesto,
        acuerdo_comite_estado: acuerdoComiteEstado,
        // Campos para ACUERDO A LARGO PLAZO (simulador)
        simulador_monto: simuladorMonto,
        simulador_numero_cuotas: simuladorNumeroCuotas,
        simulador_valor_cuota: simuladorValorCuota,
        cuotas_acuerdo: cuotasAcuerdo,
        volver_llamar_fecha: volverLlamarFecha,
        volver_llamar_hora: volverLlamarHora
    };

    if (acuerdoDesdeTarjetasMulti) {
        Object.assign(datosGestion, construirDatosAcuerdoMultiParaPayload(contratoGestionar, nivel2));
    }

    console.log('Datos de gestión a enviar:', datosGestion);
    
    // Enviar petición AJAX
    enviarGestion(clienteId, datosGestion);
}

// Función para guardar gestión de múltiples facturas
function guardarGestionMultiplesFacturas(facturasIds, canalContacto, nivel1Label, nivel2, observaciones, nivel1Codigo) {
    if (!canalContacto) {
        alert('Por favor seleccione el Canal de Contacto');
        return;
    }
    if (!nivel1Label) {
        alert('Por favor seleccione la Clasificación (Nivel 1)');
        return;
    }
    if (!nivel2) {
        alert('Por favor seleccione la Clasificación (Nivel 2)');
        return;
    }
    if (!observaciones || observaciones.trim().length < 10) {
        alert('Las observaciones detalladas son obligatorias y deben tener al menos 10 caracteres.');
        return;
    }

    const nivel1Val = nivel1Codigo != null && nivel1Codigo !== '' ? nivel1Codigo : '';

    if (nivel2 === 'volver_llamar') {
        const fe = document.getElementById('volver-llamar-fecha');
        const ho = document.getElementById('volver-llamar-hora');
        const feRaw = fe ? String(fe.value || '').trim() : '';
        const hoRaw = ho ? String(ho.value || '').trim() : '';
        if (!feRaw || !hoRaw) {
            alert('Para VOLVER A LLAMAR debe indicar fecha y hora de la próxima llamada.');
            return;
        }
        const chk = validarVolverLlamarNoPasado(feRaw, hoRaw);
        if (!chk.ok) {
            alert(chk.message);
            return;
        }
    }

    const acuerdoPorTarjetas = cantidadObligacionesCliente() > 1 && esNivel2AcuerdoDatosExtendidos(nivel2) && esAcuerdoPagoNivel1Valor(nivel1Val);
    if (acuerdoPorTarjetas) {
        for (let i = 0; i < facturasIds.length; i++) {
            const fid = facturasIds[i];
            const operacion = obtenerOperacionLabelPorIdObligacion(fid);
            const v = validarTarjetaAcuerdoMulti(fid, operacion, nivel2);
            if (!v.ok) {
                alert(v.message);
                return;
            }
        }
    }

    const canales = {
        llamada: document.getElementById('canal-llamada')?.checked || false,
        whatsapp: document.getElementById('canal-whatsapp')?.checked || false,
        email: document.getElementById('canal-email')?.checked || false,
        sms: document.getElementById('canal-sms')?.checked || false,
        correo: document.getElementById('canal-correo')?.checked || false,
        mensajeria: document.getElementById('canal-mensajeria')?.checked || false
    };
    
    let duracionSegundos = 0;
    if (inicioGestion) {
        const finGestion = new Date();
        duracionSegundos = Math.floor((finGestion - inicioGestion) / 1000);
    }
    
    const mensajeConfirm = acuerdoPorTarjetas
        ? `¿Guardar ${facturasIds.length} gestión(es)? Misma tipificación; los datos del acuerdo son distintos por obligación.`
        : `¿Desea tipificar todas las ${facturasIds.length} factura(s) con los mismos datos?`;
    const confirmacion = confirm(mensajeConfirm);
    if (!confirmacion) return;
    
    alert(`Guardando gestión para ${facturasIds.length} factura(s). Por favor espere...`);
    
    let fechaPago = null;
    let cuota = null;
    let cuotaActual = null;
    let saldoAPagar = null;
    let descuentoMonto = null;
    let descuentoPorcentaje = null;
    let totalAPagarAcuerdo = null;
    let fechaLimiteAcuerdo = null;
    let acuerdoComiteMontoPropuesto = null;
    let acuerdoComiteEstado = null;
    let simuladorMonto = null;
    let simuladorNumeroCuotas = null;
    let simuladorValorCuota = null;
    let cuotasAcuerdo = [];

    if (esAcuerdoPagoNivel1Valor(nivel1Val) && !acuerdoPorTarjetas) {
        if (nivel2 === 'acuerdo_pago_total') {
            const saldoInput = document.getElementById('saldo-a-pagar');
            const descuentoMontoInput = document.getElementById('descuento-monto');
            const descuentoPorcentajeInput = document.getElementById('descuento-porcentaje');
            const totalInput = document.getElementById('total-a-pagar-acuerdo');
            const fechaLimiteInput = document.getElementById('fecha-limite-acuerdo');
            if (saldoInput && saldoInput.value) saldoAPagar = parsePesosColombia(saldoInput.value) || null;
            if (descuentoMontoInput && descuentoMontoInput.value) descuentoMonto = parsePesosColombia(descuentoMontoInput.value) || null;
            if (descuentoPorcentajeInput && descuentoPorcentajeInput.value) descuentoPorcentaje = parseFloat(descuentoPorcentajeInput.value.replace(',', '.').replace(/[^\d.]/g, '')) || null;
            if (totalInput && totalInput.value) totalAPagarAcuerdo = parsePesosColombia(totalInput.value) || null;
            if (fechaLimiteInput && fechaLimiteInput.value) fechaLimiteAcuerdo = fechaLimiteInput.value;
            fechaPago = fechaLimiteAcuerdo;
            cuota = totalAPagarAcuerdo;
        } else if (nivel2 === 'acuerdo_aprobado') {
            const montoInput = document.getElementById('acuerdo-comite-monto-propuesto');
            const estadoSelect = document.getElementById('acuerdo-comite-estado');
            if (montoInput && montoInput.value) acuerdoComiteMontoPropuesto = parsePesosColombia(montoInput.value) || null;
            if (estadoSelect) acuerdoComiteEstado = estadoSelect.value || 'pendiente';
        } else if (nivel2 === 'acuerdo_largo_plazo') {
            const simMontoEl = document.getElementById('simulador-monto');
            const simNumCuotasEl = document.getElementById('simulador-num-cuotas');
            const simValorCuotaEl = document.getElementById('simulador-valor-cuota');
            if (simMontoEl && simMontoEl.value) simuladorMonto = parsePesosColombia(simMontoEl.value) || null;
            if (simNumCuotasEl && simNumCuotasEl.value) simuladorNumeroCuotas = parseInt(simNumCuotasEl.value, 10) || null;
            if (simValorCuotaEl && simValorCuotaEl.value) simuladorValorCuota = parsePesosColombia(simValorCuotaEl.value) || null;
            cuotasAcuerdo = obtenerCuotasAcuerdoManual();
            const c0 = cuotasAcuerdo.length ? cuotasAcuerdo[0] : null;
            if (c0) {
                fechaPago = c0.fecha_pago;
                cuota = c0.valor_cuota;
            }
        } else {
            const fechaPagoInput = document.getElementById('fecha-pago');
            const cuotaInput = document.getElementById('cuota-pago');
            const cuotaActualInput = document.getElementById('cuota-actual');
            if (fechaPagoInput && fechaPagoInput.value) fechaPago = fechaPagoInput.value;
            if (cuotaInput && cuotaInput.value) { const v = cuotaInput.value.replace(/[^\d.]/g, ''); cuota = v ? parseFloat(v) : null; }
            if (cuotaActualInput && cuotaActualInput.value) { const v = cuotaActualInput.value.replace(/[^\d.]/g, ''); cuotaActual = v ? parseFloat(v) : null; }
        }
    }
    
    let numeroContacto = obtenerNumeroContactoSeleccionado();

    let vlFecha = null;
    let vlHora = null;
    if (nivel2 === 'volver_llamar') {
        const fe = document.getElementById('volver-llamar-fecha');
        const ho = document.getElementById('volver-llamar-hora');
        vlFecha = fe && fe.value ? fe.value : null;
        vlHora = ho && ho.value ? ho.value : null;
    }
    
    const datosBase = {
        canal_contacto: canalContacto || null,
        nivel1_tipo: nivel1Label || null,
        nivel2_clasificacion: nivel2 || null,
        nivel3_detalle: '',
        observaciones: observaciones || null,
        canales: canales,
        duracion_segundos: duracionSegundos,
        fecha_pago: fechaPago || null,
        cuota: cuota,
        cuota_actual: cuotaActual,
        numero_contacto: numeroContacto || '',
        // Campos específicos para ACUERDO PAGO TOTAL
        saldo_a_pagar: saldoAPagar,
        descuento_monto: descuentoMonto,
        descuento_porcentaje: descuentoPorcentaje,
        total_a_pagar_acuerdo: totalAPagarAcuerdo,
        fecha_limite_acuerdo: fechaLimiteAcuerdo,
        // Campos para ACUERDO APROBADO POR COMITÉ
        acuerdo_comite_monto_propuesto: acuerdoComiteMontoPropuesto,
        acuerdo_comite_estado: acuerdoComiteEstado,
        simulador_monto: simuladorMonto,
        simulador_numero_cuotas: simuladorNumeroCuotas,
        simulador_valor_cuota: simuladorValorCuota,
        cuotas_acuerdo: cuotasAcuerdo,
        volver_llamar_fecha: vlFecha,
        volver_llamar_hora: vlHora
    };
    
    // Enviar una gestión por cada factura
    let gestionesGuardadas = 0;
    let gestionesError = 0;
    const totalGestiones = facturasIds.length;
    
    // Usar Promise.all para enviar todas las gestiones
    const promesas = facturasIds.map(facturaId => {
        const extrasAcuerdo = acuerdoPorTarjetas ? construirDatosAcuerdoMultiParaPayload(facturaId, nivel2) : {};
        const datosGestion = Object.assign({}, datosBase, extrasAcuerdo, {
            contrato_id: facturaId
        });
        
        return fetch('index.php?action=guardar_gestion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cliente_id: clienteId,
                datos: datosGestion
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                gestionesGuardadas++;
                return { success: true, facturaId };
            } else {
                gestionesError++;
                return { success: false, facturaId, error: data.message };
            }
        })
        .catch(error => {
            gestionesError++;
            return { success: false, facturaId, error: error.message };
        });
    });
    
    // Esperar a que todas las promesas se resuelvan
    Promise.all(promesas)
        .then(async resultados => {
            // Finalizar el tiempo de gestión
            await finalizarGestionCliente();
            
            // Mostrar mensaje de resultado
            if (gestionesGuardadas === totalGestiones) {
                alert(`Gestión guardada exitosamente para todas las ${totalGestiones} factura(s)`);
            } else {
                alert(`Se guardaron ${gestionesGuardadas} de ${totalGestiones} gestión(es). ${gestionesError} error(es).`);
            }
            
            // Recargar historial después de guardar
            cargarHistorial();
            
            if (gestionesGuardadas > 0) {
                window.gestionGuardadaCorrectamente = true;
                window.ultimaGestionGuardadaNumeroContacto = datosBase.numero_contacto || '';
            }
            if (typeof window.mostrarBotonesDespuesGuardar === 'function') {
                setTimeout(function() { window.mostrarBotonesDespuesGuardar(); }, 250);
            }
        })
        .catch(error => {
            console.error('Error al guardar gestiones múltiples:', error);
            alert('Error al guardar algunas gestiones. Por favor revise el historial.');
        });
}

// Función auxiliar para enviar una gestión individual
function enviarGestion(clienteId, datosGestion) {
    fetch('index.php?action=guardar_gestion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            cliente_id: clienteId,
            datos: datosGestion
        })
    })
    .then(response => response.json())
    .then(async data => {
        console.log('Respuesta del servidor:', data);
        
        if (data.success) {
            // Finalizar el tiempo de gestión antes de mostrar el alert
            await finalizarGestionCliente();
            window.gestionGuardadaCorrectamente = true;
            window.ultimaGestionGuardadaNumeroContacto = datosGestion.numero_contacto || '';
            
            alert('Gestión guardada exitosamente');
            
            // Recargar historial después de guardar
            cargarHistorial();
            
            // Mostrar botón "Siguiente cliente" si hay siguiente pendiente (retraso para que la UI y sesión estén listas)
            if (typeof window.mostrarBotonesDespuesGuardar === 'function') {
                setTimeout(function() { window.mostrarBotonesDespuesGuardar(); }, 250);
            }
        } else {
            alert('Error al guardar: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error al guardar gestión:', error);
        alert('Error al conectar con el servidor');
    });
}

// ========================================
// FUNCIONES PARA AGREGAR MÁS INFORMACIÓN
// ========================================

// Agregar event listener al botón cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Botón agregar información
    const btnAgregarInfo = document.querySelector('.btn-agregar-info');
    if (btnAgregarInfo) {
        btnAgregarInfo.addEventListener('click', function() {
            mostrarModalAgregarInfo();
        });
    }
    
    // Árbol de tipificación
    configurarArbolTipificacion();
    
    // Configurar fecha mínima a hoy (solo fechas futuras)
    const fechaPagoInput = document.getElementById('fecha-pago');
    if (fechaPagoInput) {
        const hoy = new Date();
        const fechaMinima = hoy.toISOString().split('T')[0];
        fechaPagoInput.setAttribute('min', fechaMinima);
    }
    
    // Configurar fecha límite mínima a hoy
    const fechaLimiteInput = document.getElementById('fecha-limite-acuerdo');
    if (fechaLimiteInput) {
        const hoy = new Date();
        const fechaMinima = hoy.toISOString().split('T')[0];
        fechaLimiteInput.setAttribute('min', fechaMinima);
    }
    
    // Configurar formato de pesos colombianos y cálculo automático para campos de acuerdo pago total
    // Formato Colombia: punto (.) = separador de miles, coma (,) = decimales (centavos). Ej: 231.310 = doscientos treinta y un mil; 231.310,50 = con cincuenta centavos
    const saldoAPagarInput = document.getElementById('saldo-a-pagar');
    const descuentoMontoInput = document.getElementById('descuento-monto');
    const descuentoPorcentajeInput = document.getElementById('descuento-porcentaje');
    const totalAPagarAcuerdoInput = document.getElementById('total-a-pagar-acuerdo');
    
    function obtenerValorNumerico(input) {
        if (!input) return 0;
        return parsePesosColombia(input.value);
    }
    
    function formatearNumero(numero) {
        if (numero === 0 || isNaN(numero)) return '';
        return numero.toLocaleString('es-CO', {minimumFractionDigits: 0, maximumFractionDigits: 0});
    }
    
    function calcularTotalAPagar() {
        if (!saldoAPagarInput || !totalAPagarAcuerdoInput) return;
        
        const saldo = obtenerValorNumerico(saldoAPagarInput);
        const descuentoMonto = obtenerValorNumerico(descuentoMontoInput);
        const descuentoPorcentaje = parseFloat(descuentoPorcentajeInput.value.replace(/[^\d.]/g, '')) || 0;
        
        let descuento = 0;
        let porcentajeCalculado = 0;
        let montoCalculado = 0;
        
        // Si hay descuento en monto, calcular el porcentaje equivalente
        if (descuentoMonto > 0 && saldo > 0) {
            descuento = descuentoMonto;
            porcentajeCalculado = (descuentoMonto / saldo) * 100;
            // Actualizar el campo de porcentaje sin disparar eventos
            if (descuentoPorcentajeInput && descuentoPorcentajeInput !== document.activeElement) {
                descuentoPorcentajeInput.value = porcentajeCalculado.toFixed(2);
            }
        } 
        // Si hay descuento en porcentaje, calcular el monto equivalente
        else if (descuentoPorcentaje > 0 && saldo > 0) {
            descuento = (saldo * descuentoPorcentaje) / 100;
            montoCalculado = descuento;
            // Actualizar el campo de monto sin disparar eventos
            if (descuentoMontoInput && descuentoMontoInput !== document.activeElement) {
                const montoFormateado = formatearNumero(montoCalculado);
                descuentoMontoInput.value = montoFormateado;
            }
        }
        
        const total = saldo - descuento;
        totalAPagarAcuerdoInput.value = total > 0 ? formatearNumero(total) : '0';
    }
    
    // Formatear saldo a pagar: permitir punto (miles) y coma (decimales). Al escribir/blur parseamos formato Colombia y mostramos con punto de miles.
    if (saldoAPagarInput) {
        saldoAPagarInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : formatearNumero(Math.floor(numValue));
                } else {
                    e.target.value = value;
                }
            } else {
                e.target.value = '';
            }
            calcularTotalAPagar();
        });
        saldoAPagarInput.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = formatearNumero(num);
        });
    }
    
    // Formatear descuento monto: mismo criterio (punto = miles, coma = centavos)
    if (descuentoMontoInput) {
        descuentoMontoInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : formatearNumero(Math.floor(numValue));
                } else {
                    e.target.value = value;
                }
            } else {
                e.target.value = '';
            }
            if (value && descuentoPorcentajeInput) descuentoPorcentajeInput.value = '';
            calcularTotalAPagar();
        });
        descuentoMontoInput.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = formatearNumero(num);
        });
    }
    
    // Formatear descuento porcentaje
    if (descuentoPorcentajeInput) {
        descuentoPorcentajeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.]/g, '');
            if (value) {
                const numValue = parseFloat(value);
                if (numValue > 100) {
                    value = '100';
                    numValue = 100;
                }
                e.target.value = value;
            } else {
                e.target.value = '';
            }
            // Limpiar monto si se ingresa porcentaje
            if (value && descuentoMontoInput) {
                descuentoMontoInput.value = '';
            }
            calcularTotalAPagar();
        });
    }
    
    // ========== Cuotas manuales (Acuerdo a largo plazo) ==========
    const simuladorMonto = document.getElementById('simulador-monto');
    const simuladorNumCuotas = document.getElementById('simulador-num-cuotas');
    const simuladorValorCuota = document.getElementById('simulador-valor-cuota');

    if (simuladorMonto) {
        simuladorMonto.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : Math.floor(numValue).toLocaleString('es-CO');
                } else e.target.value = value;
            } else e.target.value = '';
        });
        simuladorMonto.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        });
    }
    if (simuladorNumCuotas) {
        simuladorNumCuotas.addEventListener('change', renderizarCuotasAcuerdoManual);
    }
    if (simuladorValorCuota) simuladorValorCuota.readOnly = true;
    renderizarCuotasAcuerdoManual();
    
    // Formato monto propuesto (Acuerdo aprobado comité): punto = miles, coma = decimales
    const acuerdoComiteMonto = document.getElementById('acuerdo-comite-monto-propuesto');
    if (acuerdoComiteMonto) {
        acuerdoComiteMonto.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d.,]/g, '');
            if (value) {
                const numValue = parsePesosColombia(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    const tieneDecimales = /,\d*$/.test(value);
                    e.target.value = tieneDecimales
                        ? numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : Math.floor(numValue).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                } else e.target.value = value;
            } else e.target.value = '';
        });
        acuerdoComiteMonto.addEventListener('blur', function(e) {
            const num = parsePesosColombia(e.target.value);
            if (num > 0) e.target.value = Math.floor(num).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        });
    }
    
    // Configurar formato de pesos colombianos para el input de valor
    const valorPagoInput = document.getElementById('valor-pago');
    if (valorPagoInput) {
        // Formatear mientras el usuario escribe
        valorPagoInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^\d]/g, ''); // Solo números
            
            if (value) {
                // Formatear con separadores de miles
                value = parseInt(value, 10).toLocaleString('es-CO');
                e.target.value = value;
            } else {
                e.target.value = '';
            }
        });
        
        // Formatear al perder el foco
        valorPagoInput.addEventListener('blur', function(e) {
            let value = e.target.value.replace(/[^\d]/g, '');
            if (value) {
                value = parseInt(value, 10).toLocaleString('es-CO');
                e.target.value = value;
            }
        });
    }
});

// ========================================
// ÁRBOL DE TIPIFICACIÓN (Canal → Nivel 1 → Nivel 2 → Nivel 3)
// ========================================

/** Opciones de Nivel 1 según canal de contacto (empalme con historial_gestion) */
function getOpcionesNivel1(canal) {
    const opciones = {
        llamada_saliente: [
            { value: '1.0', text: 'YA PAGO' },
            { value: '1.1', text: 'ACUERDO DE PAGO' },
            { value: '1.2', text: 'RECORDATORIO' },
            { value: '1.3', text: 'VOLUNTAD DE PAGO' },
            { value: '2.0', text: 'LOCALIZADO SIN ACUERDO' },
            { value: '3.0', text: 'FALLECIDO' },
            { value: '4.0', text: 'NO CONTACTO' }
        ],
        whatsapp: [
            { value: 'ws_1.0', text: 'YA PAGO' },
            { value: 'ws_1.1', text: 'ACUERDO DE PAGO' },
            { value: 'ws_1.2', text: 'RECORDATORIO' },
            { value: 'ws_1.3', text: 'VOLUNTAD DE PAGO' },
            { value: 'ws_2.0', text: 'LOCALIZADO SIN ACUERDO' },
            { value: 'ws_3.0', text: 'FALLECIDO' },
            { value: 'ws_4.0', text: 'NO CONTACTO' }
        ],
        email: [
            { value: 'em_1.0', text: 'NO ENTREGADO' },
            { value: 'em_1.1', text: 'ENTREGADO' },
            { value: 'em_1.2', text: 'ENVIO DE MENSAJE A TITULAR' }
        ],
        recibir_llamada: [
            { value: 'rc_1.0', text: 'YA PAGO' },
            { value: 'rc_1.1', text: 'ACUERDO DE PAGO' },
            { value: 'rc_1.2', text: 'VOLUNTAD DE PAGO' },
            { value: 'rc_2.0', text: 'LOCALIZADO SIN ACUERDO' },
            { value: 'rc_3.0', text: 'FALLECIDO' },
            { value: 'rc_4.0', text: 'NO CONTACTO' }
        ]
    };
    return opciones[canal] || [];
}

function actualizarNivel1(canal) {
    const nivel1 = document.getElementById('tipo-contacto-nivel1');
    const nivel1Container = document.getElementById('nivel1-container');
    const nivel2 = document.getElementById('tipo-contacto-nivel2');
    const nivel3 = document.getElementById('tipo-contacto-nivel3');
    const nivel2Container = document.getElementById('nivel2-container');
    const nivel3Container = document.getElementById('nivel3-container');

    if (!nivel1 || !nivel1Container) return;

    nivel1.innerHTML = '<option value="">Selecciona una opción</option>';
    if (nivel2) nivel2.innerHTML = '<option value="">Primero selecciona el Nivel 1</option>';
    if (nivel3) nivel3.innerHTML = '<option value="">Primero selecciona el Nivel 2</option>';
    if (nivel2Container) nivel2Container.style.display = 'none';
    if (nivel3Container) nivel3Container.style.display = 'none';

    const opciones = getOpcionesNivel1(canal);
    opciones.forEach(function (opcion) {
        const option = document.createElement('option');
        option.value = opcion.value;
        option.textContent = opcion.text;
        nivel1.appendChild(option);
    });
    nivel1Container.style.display = 'block';
}

/**
 * Muestra/oculta los bloques estáticos de acuerdo (#campos-acuerdo-*) según nivel 1 y 2 (modo una obligación).
 */
function sincronizarVistaCamposAcuerdoPorNivelTipificacion() {
    const nivel1El = document.getElementById('tipo-contacto-nivel1');
    const nivel2El = document.getElementById('tipo-contacto-nivel2');
    const valorNivel1 = nivel1El ? nivel1El.value : '';
    const valorNivel2 = nivel2El ? nivel2El.value : '';
    if (debeMostrarAcuerdosMultiObligacion()) {
        const camposFechaValor = document.getElementById('campos-fecha-valor');
        const camposAcuerdoPagoTotal = document.getElementById('campos-acuerdo-pago-total');
        const camposAcuerdoLargoPlazo = document.getElementById('campos-acuerdo-largo-plazo');
        const camposAcuerdoAprobadoComite = document.getElementById('campos-acuerdo-aprobado-comite');
        if (camposFechaValor) camposFechaValor.style.display = 'none';
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
        return;
    }
    const camposFechaValor = document.getElementById('campos-fecha-valor');
    const camposAcuerdoPagoTotal = document.getElementById('campos-acuerdo-pago-total');
    const camposAcuerdoLargoPlazo = document.getElementById('campos-acuerdo-largo-plazo');
    const camposAcuerdoAprobadoComite = document.getElementById('campos-acuerdo-aprobado-comite');

    if ((valorNivel1 === '1.1' || valorNivel1 === 'ws_1.1' || valorNivel1 === 'rc_1.1') && valorNivel2 === 'acuerdo_pago_total') {
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'block';
        if (camposFechaValor) camposFechaValor.style.display = 'none';
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
    } else if ((valorNivel1 === '1.1' || valorNivel1 === 'ws_1.1' || valorNivel1 === 'rc_1.1') && valorNivel2 === 'acuerdo_largo_plazo') {
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'block';
        if (camposFechaValor) camposFechaValor.style.display = 'none';
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
        renderizarCuotasAcuerdoManual();
    } else if ((valorNivel1 === '1.1' || valorNivel1 === 'ws_1.1' || valorNivel1 === 'rc_1.1') && valorNivel2 === 'acuerdo_aprobado') {
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'block';
        if (camposFechaValor) camposFechaValor.style.display = 'none';
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
    } else if (valorNivel1 === '1.1' || valorNivel1 === 'ws_1.1' || valorNivel1 === 'rc_1.1') {
        if (camposFechaValor) camposFechaValor.style.display = 'block';
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
    } else {
        if (camposFechaValor) camposFechaValor.style.display = 'none';
        if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
        if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
        if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
    }
}

function configurarArbolTipificacion() {
    const canalSelect = document.getElementById('canal-contacto');
    const nivel1 = document.getElementById('tipo-contacto-nivel1');
    const nivel2 = document.getElementById('tipo-contacto-nivel2');
    const nivel3 = document.getElementById('tipo-contacto-nivel3');
    const nivel1Container = document.getElementById('nivel1-container');
    const nivel2Container = document.getElementById('nivel2-container');
    const nivel3Container = document.getElementById('nivel3-container');

    if (canalSelect) {
        canalSelect.addEventListener('change', function () {
            const canal = this.value;
            if (!canal) {
                if (nivel1Container) nivel1Container.style.display = 'none';
                if (nivel1) nivel1.innerHTML = '<option value="">Primero selecciona el Canal de Contacto</option>';
                if (nivel2Container) nivel2Container.style.display = 'none';
                if (nivel3Container) nivel3Container.style.display = 'none';
                actualizarCamposVolverLlamarProgramacion('');
                actualizarSubseleccionObligacionesTodasAcuerdo();
                renderizarAcuerdosPorObligacionSiAplica();
                return;
            }
            actualizarNivel1(canal);
            actualizarSubseleccionObligacionesTodasAcuerdo();
            renderizarAcuerdosPorObligacionSiAplica();
        });
    }

    if (nivel1) {
        nivel1.addEventListener('change', function() {
            const valor = this.value;
            const camposFechaValor = document.getElementById('campos-fecha-valor');
            const camposAcuerdoPagoTotal = document.getElementById('campos-acuerdo-pago-total');
            const camposAcuerdoLargoPlazo = document.getElementById('campos-acuerdo-largo-plazo');
            const camposAcuerdoAprobadoComite = document.getElementById('campos-acuerdo-aprobado-comite');
            
            // Ocultar campos específicos cuando cambia el nivel 1
            if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
            if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
            if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
            
            // Mostrar/ocultar según Nivel 1 y Nivel 2
            const nivel2Value = nivel2 ? nivel2.value : '';
            if ((valor === '1.1' || valor === 'ws_1.1' || valor === 'rc_1.1') && nivel2Value === 'acuerdo_pago_total') {
                if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'block';
                if (camposFechaValor) camposFechaValor.style.display = 'none';
                if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
                if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
            } else if ((valor === '1.1' || valor === 'ws_1.1' || valor === 'rc_1.1') && nivel2Value === 'acuerdo_largo_plazo') {
                if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'block';
                if (camposFechaValor) camposFechaValor.style.display = 'none';
                if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
                if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
                renderizarCuotasAcuerdoManual();
            } else if ((valor === '1.1' || valor === 'ws_1.1' || valor === 'rc_1.1') && nivel2Value === 'acuerdo_aprobado') {
                if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'block';
                if (camposFechaValor) camposFechaValor.style.display = 'none';
                if (camposAcuerdoPagoTotal) camposAcuerdoPagoTotal.style.display = 'none';
                if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
            } else if (valor === '1.1' || valor === 'ws_1.1' || valor === 'rc_1.1') {
                if (camposFechaValor) camposFechaValor.style.display = 'block';
                if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
                if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
            } else {
                if (camposFechaValor) camposFechaValor.style.display = 'none';
                if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
                if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
            }
            
            if (valor) {
                // Mostrar Nivel 2
                if (nivel2Container) nivel2Container.style.display = 'block';
                
                // Limpiar y actualizar Nivel 2
                if (nivel2) {
                    nivel2.innerHTML = '<option value="">Cargando...</option>';
                    actualizarNivel2(valor);
                }
                
                // Ocultar y limpiar Nivel 3
                if (nivel3Container) nivel3Container.style.display = 'none';
                if (nivel3) {
                    nivel3.innerHTML = '<option value="">Primero selecciona el Nivel 2</option>';
                }
                actualizarCamposVolverLlamarProgramacion('');
                actualizarSubseleccionObligacionesTodasAcuerdo();
                renderizarAcuerdosPorObligacionSiAplica();
            } else {
                // Ocultar ambos niveles
                if (nivel2Container) nivel2Container.style.display = 'none';
                if (nivel3Container) nivel3Container.style.display = 'none';
                actualizarCamposVolverLlamarProgramacion('');
                actualizarSubseleccionObligacionesTodasAcuerdo();
                renderizarAcuerdosPorObligacionSiAplica();
            }
        });
    }
    
    if (nivel2) {
        const nuevoListener = function() {
            const valorNivel2 = this.value;
            actualizarSubseleccionObligacionesTodasAcuerdo();
            renderizarAcuerdosPorObligacionSiAplica();
            if (nivel3Container) nivel3Container.style.display = 'none';
            actualizarCamposVolverLlamarProgramacion(valorNivel2 || '');
        };
        nivel2.addEventListener('change', nuevoListener);
    }
    // Nivel 3 no se muestra (tipificación termina en Nivel 2)
    if (nivel3Container) nivel3Container.style.display = 'none';
    actualizarCamposVolverLlamarProgramacion('');
}

function actualizarNivel2(valorNivel1) {
    const nivel2 = document.getElementById('tipo-contacto-nivel2');
    const camposFechaValor = document.getElementById('campos-fecha-valor');
    
    if (!nivel2) return;
    
    // Ocultar campos de fecha, valor y simulador inicialmente
    if (camposFechaValor) camposFechaValor.style.display = 'none';
    const camposAcuerdoLargoPlazo = document.getElementById('campos-acuerdo-largo-plazo');
    const camposAcuerdoAprobadoComite = document.getElementById('campos-acuerdo-aprobado-comite');
    if (camposAcuerdoLargoPlazo) camposAcuerdoLargoPlazo.style.display = 'none';
    if (camposAcuerdoAprobadoComite) camposAcuerdoAprobadoComite.style.display = 'none';
    
    // Limpiar opciones
    nivel2.innerHTML = '<option value="">Selecciona una opción</option>';
    
    if (!valorNivel1) {
        nivel2.innerHTML = '<option value="">Primero selecciona el Nivel 1</option>';
        return;
    }
    
    // Nivel 2 = subopciones del Nivel 1 (mismo mapeo que antes Nivel 2 → Nivel 3)
    const opciones = getOpcionesNivel3(valorNivel1) || [];
    
    if (opciones.length === 0) {
        nivel2.innerHTML = '<option value="">Sin subopciones</option>';
        return;
    }
    
    opciones.forEach(function (opcion) {
        const option = document.createElement('option');
        option.value = opcion.value;
        option.textContent = opcion.text;
        nivel2.appendChild(option);
    });
}

function actualizarNivel3(valorNivel2) {
    const nivel3 = document.getElementById('tipo-contacto-nivel3');
    
    if (!nivel3) return;
    
    // Limpiar opciones
    nivel3.innerHTML = '<option value="">Selecciona una opción</option>';
    
    if (!valorNivel2) {
        nivel3.innerHTML = '<option value="">Primero selecciona el Nivel 2</option>';
        return;
    }
    
    // Opciones según el nivel 2
    const opciones = getOpcionesNivel3(valorNivel2);
    
    opciones.forEach(opcion => {
        const option = document.createElement('option');
        option.value = opcion.value;
        option.textContent = opcion.text;
        nivel3.appendChild(option);
    });
}

function getOpcionesNivel3(valorNivel2) {
    // Mapeo Nivel 1 (CONTACTO) → Nivel 2 (PERFIL). Para canal LLAMADA SALIENTE y resto de canales.
    const opciones = {
        // ============================================
        // LLAMADA SALIENTE - Perfil (Nivel 2) por cada Contacto (Nivel 1)
        // ============================================
        '1.0': [ // YA PAGO
            { value: 'pago_total', text: 'PAGO TOTAL' },
            { value: 'pago_cuota', text: 'PAGO CUOTA' }
        ],
        '1.1': [ // ACUERDO DE PAGO
            { value: 'acuerdo_pago_total', text: 'ACUERDO PAGO TOTAL' },
            { value: 'acuerdo_largo_plazo', text: 'ACUERDO A LARGO PLAZO' },
            { value: 'acuerdo_aprobado', text: 'ACUERDO APROBADO COMITÉ' }
        ],
        '1.2': [ // RECORDATORIO
            { value: 'seguimiento', text: 'SEGUIMIENTO NEGOCIACIÓN VIGENTE' }
        ],
        '1.3': [ // VOLUNTAD DE PAGO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'propuesta_estudio', text: 'PROPUESTA EN ESTUDIO' },
            { value: 'posible_negociacion', text: 'POSIBLE NEGOCIACION' }
        ],
        '2.0': [ // LOCALIZADO SIN ACUERDO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'no_reconoce', text: 'NO RECONOCE LA OBLIGACIÓN' },
            { value: 'dificultad_pago', text: 'DIFICULTAD DE PAGO' },
            { value: 'reclamacion', text: 'RECLAMACIÓN' },
            { value: 'renuente', text: 'RENUENTE' },
            { value: 'contesta_cuelga', text: 'CONTESTA Y CUELGA' },
            { value: 'contacto_tercero', text: 'CONTACTO CON TERCERO' }
        ],
        '3.0': [ // FALLECIDO
            { value: 'fallecido', text: 'FALLECIDO' }
        ],
        '4.0': [ // NO CONTACTO
            { value: 'no_contesta', text: 'NO CONTESTA' },
            { value: 'buzon_mensaje', text: 'BUZÓN DE MENSAJE' },
            { value: 'fuera_servicio', text: 'FUERA DE SERVICIO' },
            { value: 'numero_equivocado', text: 'NUMERO EQUIVOCADO' },
            { value: 'telefono_apagado', text: 'TELÉFONO APAGADO' },
            { value: 'telefono_danado', text: 'TELÉFONO DAÑADO' },
            { value: 'ilocalizado', text: 'ILOCALIZADO' }
        ],
        
        // ============================================
        // WHATSAPP - Perfil (Nivel 2) por cada Contacto (Nivel 1)
        // ============================================
        'ws_1.0': [ // YA PAGO
            { value: 'pago_total', text: 'PAGO TOTAL' },
            { value: 'pago_cuota', text: 'PAGO CUOTA' }
        ],
        'ws_1.1': [ // ACUERDO DE PAGO
            { value: 'acuerdo_pago_total', text: 'ACUERDO PAGO TOTAL' },
            { value: 'acuerdo_largo_plazo', text: 'ACUERDO A LARGO PLAZO' },
            { value: 'acuerdo_aprobado', text: 'ACUERDO APROBADO COMITÉ' }
        ],
        'ws_1.2': [ // RECORDATORIO
            { value: 'seguimiento', text: 'SEGUIMIENTO NEGOCIACIÓN VIGENTE' }
        ],
        'ws_1.3': [ // VOLUNTAD DE PAGO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'propuesta_estudio', text: 'PROPUESTA EN ESTUDIO' },
            { value: 'posible_negociacion', text: 'POSIBLE NEGOCIACION' }
        ],
        'ws_2.0': [ // LOCALIZADO SIN ACUERDO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'no_reconoce', text: 'NO RECONOCE LA OBLIGACIÓN' },
            { value: 'dificultad_pago', text: 'DIFICULTAD DE PAGO' },
            { value: 'reclamacion', text: 'RECLAMACIÓN' },
            { value: 'contacto_tercero', text: 'CONTACTO CON TERCERO' }
        ],
        'ws_3.0': [ // FALLECIDO
            { value: 'fallecido', text: 'FALLECIDO' }
        ],
        'ws_4.0': [ // NO CONTACTO
            { value: 'no_contesta', text: 'NO CONTESTA' },
            { value: 'numero_equivocado', text: 'NUMERO EQUIVOCADO' }
        ],
        
        // ============================================
        // EMAIL - Solo Nivel 1 (sin subopciones distintas en Nivel 2)
        // ============================================
        'em_1.0': [ // NO ENTREGADO
            { value: 'no_entregado', text: 'NO ENTREGADO' }
        ],
        'em_1.1': [ // ENTREGADO
            { value: 'entregado', text: 'ENTREGADO' }
        ],
        'em_1.2': [ // ENVIO DE MENSAJE A TITULAR
            { value: 'envio_mensaje', text: 'ENVIO DE MENSAJE A TITULAR' }
        ],
        
        // ============================================
        // RECIBIR LLAMADA - Perfil (Nivel 2) por cada Contacto (Nivel 1)
        // ============================================
        'rc_1.0': [ // YA PAGO
            { value: 'pago_total', text: 'PAGO TOTAL' },
            { value: 'pago_cuota', text: 'PAGO CUOTA' }
        ],
        'rc_1.1': [ // ACUERDO DE PAGO
            { value: 'acuerdo_pago_total', text: 'ACUERDO PAGO TOTAL' },
            { value: 'acuerdo_largo_plazo', text: 'ACUERDO A LARGO PLAZO' },
            { value: 'acuerdo_aprobado', text: 'ACUERDO APROBADO COMITÉ' }
        ],
        'rc_1.2': [ // VOLUNTAD DE PAGO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'propuesta_estudio', text: 'PROPUESTA EN ESTUDIO' },
            { value: 'posible_negociacion', text: 'POSIBLE NEGOCIACION' }
        ],
        'rc_2.0': [ // LOCALIZADO SIN ACUERDO
            { value: 'volver_llamar', text: 'VOLVER A LLAMAR' },
            { value: 'no_reconoce', text: 'NO RECONOCE LA OBLIGACIÓN' },
            { value: 'dificultad_pago', text: 'DIFICULTAD DE PAGO' },
            { value: 'reclamacion', text: 'RECLAMACIÓN' },
            { value: 'renuente', text: 'RENUENTE' },
            { value: 'contacto_tercero', text: 'CONTACTO CON TERCERO' }
        ],
        'rc_3.0': [ // FALLECIDO
            { value: 'fallecido', text: 'FALLECIDO' }
        ],
        'rc_4.0': [ // NO CONTACTO
            { value: 'numero_equivocado', text: 'NUMERO EQUIVOCADO' }
        ]
    };
    
    return opciones[valorNivel2] || [];
}

function mostrarModalAgregarInfo() {
    // Crear el modal
    const modalHTML = `
        <div id="modal-agregar-info" style="display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
            <div style="background-color: #fefefe; margin: 5% auto; padding: 30px; border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #333;"><i class="fas fa-plus"></i> Agregar Más Información</h2>
                    <span style="color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; line-height: 20px;" onclick="cerrarModalAgregarInfo()">&times;</span>
                </div>
                
                <form id="form-agregar-info">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">
                            <i class="fas fa-envelope"></i> Correo Electrónico:
                        </label>
                        <input type="email" name="nuevo-email" placeholder="ejemplo@correo.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 500; color: #333;">
                            <i class="fas fa-phone"></i> Nuevos Teléfonos:
                        </label>
                        <div id="telefonos-contenedor">
                            <div class="telefono-input-group" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                                <input type="text" name="nuevo-telefono[]" placeholder="Número de teléfono (opcional)" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                                <button type="button" onclick="eliminarTelefono(this)" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;" disabled><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <button type="button" onclick="agregarTelefono()" style="background: #28a745; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 14px; width: 100%;">
                            <i class="fas fa-plus"></i> Agregar otro teléfono
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                        <button type="button" onclick="cerrarModalAgregarInfo()" style="padding: 10px 20px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 14px;">
                            Cancelar
                        </button>
                        <button type="submit" style="padding: 10px 20px; border: none; border-radius: 6px; background: #00c0e1; color: white; cursor: pointer; font-size: 14px;">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Insertar el modal en el body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Agregar event listener al formulario
    document.getElementById('form-agregar-info').addEventListener('submit', function(e) {
        e.preventDefault();
        guardarNuevaInformacion();
    });
}

function cerrarModalAgregarInfo() {
    const modal = document.getElementById('modal-agregar-info');
    if (modal) {
        modal.remove();
    }
}

function agregarTelefono() {
    const contenedor = document.getElementById('telefonos-contenedor');
    const numTelefonos = contenedor.children.length;
    
    const nuevoTelefono = document.createElement('div');
    nuevoTelefono.className = 'telefono-input-group';
    nuevoTelefono.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    nuevoTelefono.innerHTML = `
        <input type="text" name="nuevo-telefono[]" placeholder="Número de teléfono (opcional)" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
        <button type="button" onclick="eliminarTelefono(this)" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;"><i class="fas fa-trash"></i></button>
    `;
    
    contenedor.appendChild(nuevoTelefono);
    
    // Habilitar botones de eliminar en todos
    actualizarBotonesEliminar();
}

// Función eliminada: actualizarTelefonoPrincipal - Ya no se usa la opción de principal

function eliminarTelefono(btn) {
    const contenedor = document.getElementById('telefonos-contenedor');
    const grupo = btn.closest('.telefono-input-group');
    
    // No permitir eliminar si es el último o si hay solo uno
    if (contenedor.children.length <= 1) {
        alert('Debe tener al menos un teléfono');
        return;
    }
    
    if (grupo) {
        grupo.remove();
        
        // Si solo queda uno, deshabilitar su botón de eliminar
        if (contenedor.children.length === 1) {
            const eliminarBtn = contenedor.querySelector('.telefono-input-group button');
            if (eliminarBtn) {
                eliminarBtn.disabled = true;
            }
        }
    }
}

// Habilitar botón de eliminar en los teléfonos adicionales
function actualizarBotonesEliminar() {
    const contenedor = document.getElementById('telefonos-contenedor');
    if (!contenedor) return;
    
    const grupos = contenedor.querySelectorAll('.telefono-input-group');
    grupos.forEach((grupo, index) => {
        const btnEliminar = grupo.querySelector('button');
        if (btnEliminar) {
            btnEliminar.disabled = grupos.length === 1;
        }
    });
}

function guardarNuevaInformacion() {
    const form = document.getElementById('form-agregar-info');
    const formData = new FormData(form);
    
    // Obtener datos del formulario
    const email = formData.get('nuevo-email');
    const telefonos = formData.getAll('nuevo-telefono[]');
    
    // Construir objeto de datos solo con campos que tienen valor
    const datosToSend = {};
    
    if (email && email.trim() !== '') {
        datosToSend.email = email.trim();
    }
    
    // Procesar teléfonos solo si se ingresaron (sin opción de principal)
    if (telefonos.some(tel => tel && tel.trim() !== '')) {
        datosToSend.telefonos = [];
        
        telefonos.forEach((tel) => {
            if (tel && tel.trim() !== '') {
                datosToSend.telefonos.push({
                    numero: tel.trim()
                });
            }
        });
    }
    
    console.log('Teléfonos ingresados:', telefonos);
    console.log('Datos a enviar:', datosToSend);
    
    console.log('Enviando datos a actualizar:', datosToSend);
    
    // Validar que hay datos para actualizar (todos los campos son opcionales)
    const tieneDatos = datosToSend.email || (datosToSend.telefonos && datosToSend.telefonos.length > 0);
    
    if (!tieneDatos) {
        alert('Por favor ingrese al menos un dato para actualizar');
        return;
    }
    
    // Hacer petición AJAX para guardar en la base de datos
    fetch('index.php?action=actualizar_info_cliente', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            cliente_id: clienteId,
            datos: datosToSend
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta del servidor:', data);
        
        if (data.success) {
            alert('Información actualizada exitosamente');
            
            // Cerrar el modal
            cerrarModalAgregarInfo();
            
            // Recargar datos del cliente para reflejar cambios (siempre, porque puede haber actualizado cualquier campo)
            if (datosToSend.email || (datosToSend.telefonos && datosToSend.telefonos.length > 0)) {
                cargarDatosCliente();
                // Si se agregó un email, también recargar para mostrarlo
                if (datosToSend.email) {
                    setTimeout(() => {
                        cargarDatosCliente();
                    }, 500);
                }
            }
            
            // Si se agregaron o modificaron teléfonos, recargar también los contratos (que incluyen el selector)
            if (datosToSend.telefonos && datosToSend.telefonos.length > 0) {
                cargarContratos();
            }
        } else {
            const msg = (data && data.message) ? String(data.message) : 'Error desconocido';
            if (msg.indexOf('No se puede guardar números') !== -1 && msg.indexOf('Comuníquese con el administrador') !== -1) {
                alert('No se puede guardar números. Comuníquese con el administrador.');
            } else {
                alert('Error al actualizar: ' + msg);
            }
        }
    })
    .catch(error => {
        console.error('Error al actualizar información:', error);
        alert('Error al conectar con el servidor');
    });
}

// ========================================
// FUNCIONES DE TIEMPO DE GESTIÓN
// ========================================

function iniciarGestionCliente() {
    console.log('Asesor_gestionar.js: Iniciando gestión del cliente:', clienteId);
    
    // Registrar hora de inicio
    inicioGestion = new Date();
    
    // Enviar petición al servidor para iniciar el tiempo de gestión
    fetch('index.php?action=iniciar_gestion_tiempo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            cliente_id: clienteId
        })
    })
    .then(async response => {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn('Inicio gestión: respuesta no es JSON:', text.substring(0, 200));
            return { success: false, message: 'Respuesta no válida' };
        }
    })
    .then(data => {
        console.log('Respuesta inicio gestión:', data);
        if (data.success) {
            sesionIdGestion = data.sesion_id;
            console.log('Asesor_gestionar.js: Gestión iniciada - Sesión ID:', sesionIdGestion);
        }
    })
    .catch(error => {
        console.error('Error al iniciar gestión:', error);
    });
}

function finalizarGestionCliente() {
    if (!inicioGestion || !sesionIdGestion) {
        console.warn('Asesor_gestionar.js: No hay registro de inicio de gestión');
        return Promise.resolve();
    }
    
    console.log('Asesor_gestionar.js: Finalizando gestión del cliente');
    
    const finGestion = new Date();
    
    // Enviar petición al servidor para finalizar el tiempo de gestión
    return fetch('index.php?action=finalizar_gestion_tiempo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            sesion_id: sesionIdGestion,
            hora_inicio: inicioGestion.toISOString(),
            hora_fin: finGestion.toISOString()
        })
    })
    .then(async response => {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn('Finalizar gestión: respuesta no es JSON:', text.substring(0, 200));
            return { success: false, message: 'Respuesta no válida' };
        }
    })
    .then(data => {
        console.log('Respuesta finalización gestión:', data);
        if (data.success) {
            console.log('Asesor_gestionar.js: Gestión finalizada - Tiempo:', data.tiempo_gestion, 'segundos');
        }
    })
    .catch(error => {
        console.error('Error al finalizar gestión:', error);
    });
}

// ========================================
// NOTA: Las funciones para cambiar cliente sin recargar han sido eliminadas
// Ahora la página se recarga completamente al cambiar de cliente
// ========================================