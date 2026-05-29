/**
 * COORD_GESTION.PHP - SCRIPT PRINCIPAL
 * Sistema de carga de archivos CSV con dos tipos: Nueva y Existente
 */

console.log('Coord_gestion.js: Script loaded successfully');
console.log('Coord_gestion.js: Checking if upload functions are defined...');

// Variables globales
let currentUploadType = 'nueva';
let selectedFile = null;

// ========================================
// FUNCIONES DE INICIALIZACIÓN
// ========================================

// Verificar funciones críticas al cargar
// NOTA: Solo un listener DOMContentLoaded para evitar ejecuciones duplicadas
let _domContentLoadedExecuted = false;
document.addEventListener('DOMContentLoaded', function() {
    if (_domContentLoadedExecuted) {
        console.warn('Coord_gestion.js: DOMContentLoaded ya fue ejecutado, ignorando duplicado');
        return;
    }
    _domContentLoadedExecuted = true;
    
    console.log('Coord_gestion.js: DOM Content Loaded');
    console.log('Coord_gestion.js: Initializing upload system...');
    
    // Cargar bases de datos existentes (para el select de carga existente)
    cargarBasesExistentes();
    
    // Configurar eventos
    configurarEventos();
    
    // Asegurar que la pestaña de bases esté activa por defecto
    const basesTab = document.getElementById('tab-bases');
    if (basesTab) {
        basesTab.style.display = 'block';
        basesTab.classList.add('active');
        const basesSpan = document.querySelector('.main-tabs span[onclick="cambiarTab(\'bases\')"]');
        if (basesSpan) {
            basesSpan.classList.add('active');
        }
        // Cargar bases solo si estamos en la pestaña de bases
        cargarBases();
        cargarEstadisticasBases();
    }
    
    // Ocultar otras pestañas
    const otherTabs = document.querySelectorAll('.tab-content:not(#tab-bases)');
    otherTabs.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Remover clase active de otros spans
    const otherSpans = document.querySelectorAll('.main-tabs span:not([onclick="cambiarTab(\'bases\')"])');
    otherSpans.forEach(span => {
        span.classList.remove('active');
    });
    
    console.log('Coord_gestion.js: Upload system initialized successfully');
});

function configurarEventos() {
    console.log('Coord_gestion.js: Setting up event listeners...');
    
    // Event listeners para validación en tiempo real
    const nombreArchivo = document.getElementById('nombre-archivo');
    if (nombreArchivo) {
        nombreArchivo.addEventListener('input', validarFormulario);
    }
    
    const baseDatosExistente = document.getElementById('base-datos-existente');
    if (baseDatosExistente) {
        baseDatosExistente.addEventListener('change', validarFormulario);
    }
    
    console.log('Coord_gestion.js: Event listeners configured');
}

// ========================================
// FUNCIONES DE SELECCIÓN DE TIPO DE CARGA
// ========================================

function selectUploadType(tipo) {
    console.log(`Coord_gestion.js: Selecting upload type: ${tipo}`);
    
    // Actualizar botones
    document.querySelectorAll('.upload-type-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    const btnSeleccionado = document.getElementById(`btn-carga-${tipo}`);
    if (btnSeleccionado) {
        btnSeleccionado.classList.add('active', 'btn-primary');
        btnSeleccionado.classList.remove('btn-secondary');
    }
    
    // Mostrar/ocultar formularios
    document.getElementById('form-carga-nueva').style.display = tipo === 'nueva' ? 'block' : 'none';
    document.getElementById('form-carga-existente').style.display = tipo === 'existente' ? 'block' : 'none';
    
    // Actualizar variable global
    currentUploadType = tipo;
    
    // Limpiar formulario
    limpiarFormulario();
    
    console.log(`Coord_gestion.js: Upload type changed to: ${tipo}`);
}

// ========================================
// FUNCIONES DE MANEJO DE ARCHIVOS
// ========================================

function handleFileSelect(event, tipo) {
    console.log(`Coord_gestion.js: File selected for ${tipo} upload`);
    
    const file = event.target.files[0];
    if (file) {
        console.log(`Coord_gestion.js: File details - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
        
        // Validar tipo de archivo
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
            console.error('Coord_gestion.js: Invalid file type selected');
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
        
        console.log('Coord_gestion.js: File processed successfully');
    }
}

function dropHandler(ev, tipo) {
    console.log(`Coord_gestion.js: File dropped for ${tipo} upload`);
    ev.preventDefault();
    
    const files = ev.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        console.log(`Coord_gestion.js: Dropped file - Name: ${file.name}, Type: ${file.type}`);
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            selectedFile = file;
            showFileInfo(file, tipo);
            validarFormulario();
            console.log('Coord_gestion.js: File dropped successfully');
        } else {
            console.error('Coord_gestion.js: Invalid file type dropped');
            alert('Por favor selecciona un archivo CSV válido');
        }
    }
}

function dragOverHandler(ev) {
    ev.preventDefault();
    const uploadZone = ev.currentTarget;
    uploadZone.classList.add('drag-over');
}

function dragLeaveHandler(ev) {
    ev.preventDefault();
    const uploadZone = ev.currentTarget;
    uploadZone.classList.remove('drag-over');
}

function showFileInfo(file, tipo) {
    console.log(`Coord_gestion.js: Showing file info for ${tipo} upload`);
    
    // Actualizar información del archivo
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileType = document.getElementById('file-type');
    
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    if (fileType) fileType.textContent = file.type;
    
    // Mostrar información del archivo
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.style.display = 'block';
    }
    
    // Ocultar zona de upload correspondiente
    const uploadZone = document.getElementById(`upload-zone-${tipo}`);
    if (uploadZone) {
        uploadZone.style.display = 'none';
    }
    
    console.log('Coord_gestion.js: File info displayed');
}

function removeFile() {
    console.log('Coord_gestion.js: Removing selected file');
    
    selectedFile = null;
    
    // Ocultar información del archivo
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    
    // Mostrar zona de upload correspondiente
    const uploadZone = document.getElementById(`upload-zone-${currentUploadType}`);
    if (uploadZone) {
        uploadZone.style.display = 'block';
    }
    
    // Limpiar inputs de archivo
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => input.value = '');
    
    // Deshabilitar botones
    disableButtons();
    
    console.log('Coord_gestion.js: File removed successfully');
}

function enableButtons() {
    console.log('Coord_gestion.js: Enabling action buttons');
    
    const btnProcesar = document.getElementById('btn-procesar');
    const btnPreview = document.getElementById('btn-preview');
    const btnValidar = document.getElementById('btn-validar');
    
    if (btnProcesar) btnProcesar.disabled = false;
    if (btnPreview) btnPreview.disabled = false;
    if (btnValidar) btnValidar.disabled = false;
    
    console.log('Coord_gestion.js: Action buttons enabled');
}

function disableButtons() {
    console.log('Coord_gestion.js: Disabling action buttons');
    
    const btnProcesar = document.getElementById('btn-procesar');
    const btnPreview = document.getElementById('btn-preview');
    const btnValidar = document.getElementById('btn-validar');
    
    if (btnProcesar) btnProcesar.disabled = true;
    if (btnPreview) btnPreview.disabled = true;
    if (btnValidar) btnValidar.disabled = true;
    
    console.log('Coord_gestion.js: Action buttons disabled');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================

function validarFormulario() {
    console.log('Coord_gestion.js: Validating form...');
    
    let esValido = false;
    
    if (currentUploadType === 'nueva') {
        // Validar carga nueva
        const nombreArchivo = document.getElementById('nombre-archivo').value.trim();
        esValido = nombreArchivo.length > 0 && selectedFile !== null;
        console.log(`Coord_gestion.js: Nueva carga - Nombre: "${nombreArchivo}", Archivo: ${selectedFile ? 'Sí' : 'No'}`);
    } else if (currentUploadType === 'existente') {
        // Validar carga existente
        const baseDatos = document.getElementById('base-datos-existente').value;
        esValido = baseDatos.length > 0 && selectedFile !== null;
        console.log(`Coord_gestion.js: Carga existente - Base: "${baseDatos}", Archivo: ${selectedFile ? 'Sí' : 'No'}`);
    }
    
    // Habilitar/deshabilitar botones según validación
    if (esValido) {
        enableButtons();
        console.log('Coord_gestion.js: Form validation passed');
    } else {
        disableButtons();
        console.log('Coord_gestion.js: Form validation failed');
    }
    
    return esValido;
}

// ========================================
// FUNCIONES DE CARGA DE BASES EXISTENTES
// ========================================

function cargarBasesExistentes() {
    console.log('Coord_gestion.js: Loading existing databases...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => {
            console.log('Coord_gestion.js: Response received from obtener_bases');
            return response.json();
        })
        .then(data => {
            console.log('Coord_gestion.js: Bases data received:', data);
            
            const lista = (data.success && (data.bases || data.data)) ? (data.bases || data.data) : [];
            const habilitadas = lista.filter(b => String(b.estado || 'activo').toLowerCase().trim() === 'activo');
            if (data.success && habilitadas.length > 0) {
                const select = document.getElementById('base-datos-existente');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione una base de datos...</option>';
                    habilitadas.forEach(base => {
                        const option = document.createElement('option');
                        option.value = base.id;
                        option.textContent = `${base.nombre} (${base.total_clientes} clientes)`;
                        select.appendChild(option);
                    });
                    
                    console.log(`Coord_gestion.js: ${habilitadas.length} bases habilitadas en el select`);
                }
            } else {
                const select = document.getElementById('base-datos-existente');
                if (select) {
                    select.innerHTML = '<option value="">No hay bases habilitadas</option>';
                }
                console.warn('Coord_gestion.js: No hay bases habilitadas para carga existente');
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading bases:', error);
        });
}

// ========================================
// FUNCIONES DE PROCESAMIENTO
// ========================================

function subirArchivo() {
    console.log('Coord_gestion.js: Starting file upload process...');
    
    // Verificar que hay un archivo seleccionado
    const tipoCarga = document.querySelector('.upload-type-btn.active').id === 'btn-carga-nueva' ? 'nueva' : 'existente';
    const fileInput = tipoCarga === 'nueva' ? document.getElementById('csv-file-nueva') : document.getElementById('csv-file-existente');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        mostrarNotificacion('error', 'Por favor seleccione un archivo CSV para subir');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Validar tipo de archivo
    if (!file.name.toLowerCase().endsWith('.csv')) {
        mostrarNotificacion('error', 'Por favor seleccione un archivo CSV válido');
        return;
    }
    
    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        mostrarNotificacion('error', 'El archivo es demasiado grande. Máximo permitido: 10MB');
        return;
    }
    
    // Mostrar indicador de carga
    mostrarNotificacion('info', 'Subiendo archivo...');
    
    // Deshabilitar botón durante la carga
    const btnSubir = document.getElementById('btn-subir');
    btnSubir.disabled = true;
    btnSubir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    
    // Preparar datos del formulario
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('tipo_carga', tipoCarga);
    
    // Agregar parámetros según el tipo de carga
    if (tipoCarga === 'nueva') {
        const nombreArchivo = document.getElementById('nombre-archivo').value.trim();
        if (!nombreArchivo) {
            mostrarNotificacion('error', 'Por favor ingrese un nombre para el archivo');
            btnSubir.disabled = false;
            btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir Archivo';
            return;
        }
        formData.append('nombre_archivo', nombreArchivo);
    } else {
        const baseExistente = document.getElementById('base-datos-existente').value;
        if (!baseExistente) {
            mostrarNotificacion('error', 'Por favor seleccione una base de datos existente');
            btnSubir.disabled = false;
            btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir Archivo';
            return;
        }
        formData.append('base_datos_id', baseExistente);
    }
    
    // Agregar configuración
    formData.append('separator', document.getElementById('separator').value);
    formData.append('encoding', document.getElementById('encoding').value);
    formData.append('has_header', document.getElementById('has-header').checked ? '1' : '0');
    formData.append('skip_empty', document.getElementById('skip-empty').checked ? '1' : '0');
    
    // Enviar archivo
    fetch('index.php?action=cargar_csv', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Upload response:', data);
        
        if (data.success) {
            mostrarNotificacion('success', data.mensaje || 'Archivo subido exitosamente');
            
            // Mostrar resultado detallado
            mostrarResultado(data);
            
            // Recargar bases si es necesario
            if (typeof cargarBases === 'function') {
                cargarBases();
            }
            
            // Limpiar formulario
            limpiarFormulario();
        } else {
            mostrarNotificacion('error', data.mensaje || 'Error al subir el archivo');
            
            // Mostrar errores si existen
            if (data.errores && data.errores.length > 0) {
                mostrarResultado(data);
            }
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Upload error:', error);
        mostrarNotificacion('error', 'Error de conexión al subir el archivo');
    })
    .finally(() => {
        // Restaurar botón
        btnSubir.disabled = false;
        btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir Archivo';
    });
}

function procesarArchivo() {
    console.log('Coord_gestion.js: Starting file processing...');
    
    // Validar formulario antes de procesar
    if (!validarFormulario()) {
        console.error('Coord_gestion.js: Form validation failed, cannot process file');
        alert('Por favor complete todos los campos requeridos');
        return;
    }
    
    if (!selectedFile) {
        console.error('Coord_gestion.js: No file selected for processing');
        alert('Por favor selecciona un archivo CSV');
        return;
    }
    
    console.log(`Coord_gestion.js: Processing ${currentUploadType} upload with file: ${selectedFile.name}`);
    
    // Deshabilitar botones durante el procesamiento
    disableButtons();
    
    // Crear FormData
    const formData = new FormData();
    formData.append('csv_file', selectedFile);
    
    // Agregar parámetros según el tipo de carga
    if (currentUploadType === 'nueva') {
        const nombreArchivo = document.getElementById('nombre-archivo').value.trim();
        formData.append('nombre_archivo', nombreArchivo);
        formData.append('tipo_carga', 'nueva');
        console.log(`Coord_gestion.js: Nueva carga - Nombre: ${nombreArchivo}`);
    } else if (currentUploadType === 'existente') {
        const baseDatos = document.getElementById('base-datos-existente').value;
        formData.append('base_datos_id', baseDatos);
        formData.append('tipo_carga', 'existente');
        console.log(`Coord_gestion.js: Carga existente - Base ID: ${baseDatos}`);
    }
    
    // Procesar archivo
    procesarArchivoReal(formData);
}

function procesarArchivoReal(formData) {
    console.log('Coord_gestion.js: Sending file to server for processing...');
    
    fetch('index.php?action=cargar_csv', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Coord_gestion.js: Response received from cargar_csv');
        return response.json();
    })
    .then(data => {
        console.log('Coord_gestion.js: Processing result received:', data);
        
        if (data.success) {
            console.log('Coord_gestion.js: File processed successfully');
            mostrarResultado(data, 'success');
            
            // Recargar bases existentes si es necesario
            if (currentUploadType === 'nueva') {
                cargarBasesExistentes();
            }
            
            // Limpiar formulario
            limpiarFormulario();
        } else {
            console.error('Coord_gestion.js: File processing failed:', data.message);
            mostrarResultado(data, 'error');
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error during file processing:', error);
        mostrarResultado({
            success: false,
            message: 'Error de conexión: ' + error.message
        }, 'error');
    })
    .finally(() => {
        // Rehabilitar botones
        if (validarFormulario()) {
            enableButtons();
        }
        
        console.log('Coord_gestion.js: File processing completed');
    });
}


function mostrarResultado(data, tipo) {
    console.log(`Coord_gestion.js: Showing ${tipo} result:`, data);
    
    const resultadoDiv = document.getElementById('resultado-carga');
    if (resultadoDiv) {
        resultadoDiv.style.display = 'block';
        
        let html = `
            <div class="resultado-content">
                <h4 class="${tipo === 'success' ? 'text-success' : 'text-danger'}">
                    <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${tipo === 'success' ? 'Archivo Procesado Exitosamente' : 'Error al Procesar Archivo'}
                </h4>
        `;
        
        if (data.message) {
            html += `<p class="resultado-message">${data.message}</p>`;
        }
        
        if (data.estadisticas) {
            html += `
                <div class="resultado-stats">
                    <div class="stat-item">
                        <span class="stat-label">Registros procesados:</span>
                        <span class="stat-value">${data.estadisticas.total_registros || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Clientes creados:</span>
                        <span class="stat-value text-success">${data.estadisticas.clientes_creados || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Contratos creados:</span>
                        <span class="stat-value text-success">${data.estadisticas.contratos_creados || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Errores:</span>
                        <span class="stat-value text-danger">${data.estadisticas.errores || 0}</span>
                    </div>
                </div>
            `;
        }
        
        if (data.errores && data.errores.length > 0) {
            html += `
                <div class="errores-lista">
                    <h5>Errores encontrados:</h5>
                    <ul>
                        ${data.errores.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        html += `
                <div class="resultado-actions">
                    <button class="btn btn-primary" onclick="ocultarResultado()">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                </div>
            </div>
        `;
        
        resultadoDiv.innerHTML = html;
    }
}

function ocultarResultado() {
    console.log('Coord_gestion.js: Hiding result');
    const resultadoDiv = document.getElementById('resultado-carga');
    if (resultadoDiv) {
        resultadoDiv.style.display = 'none';
    }
}

function limpiarFormulario() {
    console.log('Coord_gestion.js: Cleaning form');
    
    // Limpiar archivo seleccionado
    selectedFile = null;
    
    // Limpiar inputs
    const nombreArchivo = document.getElementById('nombre-archivo');
    if (nombreArchivo) nombreArchivo.value = '';
    
    const baseDatosExistente = document.getElementById('base-datos-existente');
    if (baseDatosExistente) baseDatosExistente.value = '';
    
    // Limpiar inputs de archivo
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => input.value = '');
    
    // Ocultar información del archivo
    const fileInfo = document.getElementById('file-info');
    if (fileInfo) fileInfo.style.display = 'none';
    
    // Mostrar zonas de upload
    document.getElementById('upload-zone-nueva').style.display = 'block';
    document.getElementById('upload-zone-existente').style.display = 'block';
    
    // Deshabilitar botones
    disableButtons();
    
    // Deshabilitar botón de subir archivo
    const btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        btnSubir.disabled = true;
        btnSubir.innerHTML = '<i class="fas fa-upload"></i> Subir Archivo';
    }
    
    // Ocultar resultado
    ocultarResultado();
    
    console.log('Coord_gestion.js: Form cleaned successfully');
}

// ========================================
// FUNCIONES ADICIONALES
// ========================================



function descargarPlantilla() {
    console.log('Coord_gestion.js: Download template requested');
    window.open('index.php?action=descargar_plantilla', '_blank');
}

// ========================================
// FUNCIONES DE MOSTRAR RESULTADOS
// ========================================

function mostrarResultadoValidacion(data) {
    console.log('Coord_gestion.js: Displaying validation results:', data);
    
    const resultadoCargaDiv = document.getElementById('resultado-carga');
    const resultadoTitulo = document.getElementById('resultado-titulo');
    const resultadoMensaje = document.getElementById('resultado-mensaje');
    const resultadoDetalles = document.getElementById('resultado-detalles');
    
    if (resultadoCargaDiv) resultadoCargaDiv.style.display = 'block';
    
    if (data.success) {
        if (resultadoTitulo) {
            resultadoTitulo.innerHTML = '<i class="fas fa-check-circle text-success"></i> Validación Exitosa';
            resultadoTitulo.classList.remove('text-danger');
            resultadoTitulo.classList.add('text-success');
        }
        if (resultadoMensaje) {
            resultadoMensaje.innerHTML = `
                <div class="alert alert-success">
                    <strong>Archivo válido para procesamiento</strong><br>
                    ${data.mensaje || 'El archivo CSV cumple con todos los requisitos.'}
                </div>
            `;
        }
    } else {
        if (resultadoTitulo) {
            resultadoTitulo.innerHTML = '<i class="fas fa-times-circle text-danger"></i> Errores de Validación';
            resultadoTitulo.classList.remove('text-success');
            resultadoTitulo.classList.add('text-danger');
        }
        if (resultadoMensaje) {
            resultadoMensaje.innerHTML = `
                <div class="alert alert-danger">
                    <strong>El archivo tiene errores</strong><br>
                    ${data.mensaje || 'Se encontraron problemas en el archivo CSV.'}
                </div>
            `;
        }
    }
    
    // Mostrar detalles de validación
    if (resultadoDetalles) {
        let detallesHTML = '<div class="validation-details">';
        
        if (data.info && data.info.length > 0) {
            detallesHTML += '<h5>Información del archivo:</h5><ul>';
            data.info.forEach(info => {
                detallesHTML += `<li>${info}</li>`;
            });
            detallesHTML += '</ul>';
        }
        
        if (data.warnings && data.warnings.length > 0) {
            detallesHTML += '<h5>Advertencias:</h5><ul class="text-warning">';
            data.warnings.forEach(warning => {
                detallesHTML += `<li>${warning}</li>`;
            });
            detallesHTML += '</ul>';
        }
        
        if (data.errores && data.errores.length > 0) {
            detallesHTML += '<h5>Errores encontrados:</h5><ul class="text-danger">';
            data.errores.forEach(error => {
                detallesHTML += `<li>${error}</li>`;
            });
            detallesHTML += '</ul>';
        }
        
        detallesHTML += '</div>';
        resultadoDetalles.innerHTML = detallesHTML;
    }
    
    console.log('Coord_gestion.js: Validation results displayed to user');
}

function mostrarPrevisualizacion(data) {
    console.log('Coord_gestion.js: Displaying preview results:', data);
    
    const resultadoCargaDiv = document.getElementById('resultado-carga');
    const resultadoTitulo = document.getElementById('resultado-titulo');
    const resultadoMensaje = document.getElementById('resultado-mensaje');
    const resultadoDetalles = document.getElementById('resultado-detalles');
    
    if (resultadoCargaDiv) resultadoCargaDiv.style.display = 'block';
    
    if (data.success) {
        if (resultadoTitulo) {
            resultadoTitulo.innerHTML = '<i class="fas fa-eye text-info"></i> Previsualización del Archivo';
            resultadoTitulo.classList.remove('text-danger', 'text-success');
            resultadoTitulo.classList.add('text-info');
        }
        if (resultadoMensaje) {
            resultadoMensaje.innerHTML = `
                <div class="alert alert-info">
                    <strong>Vista previa del archivo CSV</strong><br>
                    ${data.mensaje || 'Se muestra una muestra de los datos que se procesarán.'}
                </div>
            `;
        }
    } else {
        if (resultadoTitulo) {
            resultadoTitulo.innerHTML = '<i class="fas fa-times-circle text-danger"></i> Error en Previsualización';
            resultadoTitulo.classList.remove('text-success', 'text-info');
            resultadoTitulo.classList.add('text-danger');
        }
        if (resultadoMensaje) {
            resultadoMensaje.innerHTML = `
                <div class="alert alert-danger">
                    <strong>No se pudo previsualizar el archivo</strong><br>
                    ${data.mensaje || 'Hubo un error al procesar el archivo para la previsualización.'}
                </div>
            `;
        }
    }
    
    // Mostrar tabla de previsualización
    if (resultadoDetalles) {
        let detallesHTML = '<div class="preview-details">';
        
        if (data.preview_data && data.preview_data.length > 0) {
            detallesHTML += '<h5>Vista previa de los datos (primeras 10 filas):</h5>';
            detallesHTML += '<div class="table-responsive">';
            detallesHTML += '<table class="table table-striped table-sm">';
            
            // Encabezados
            if (data.headers && data.headers.length > 0) {
                detallesHTML += '<thead><tr>';
                data.headers.forEach(header => {
                    detallesHTML += `<th>${header}</th>`;
                });
                detallesHTML += '</tr></thead>';
            }
            
            // Datos
            detallesHTML += '<tbody>';
            data.preview_data.forEach((row, index) => {
                detallesHTML += '<tr>';
                row.forEach(cell => {
                    detallesHTML += `<td>${cell || ''}</td>`;
                });
                detallesHTML += '</tr>';
            });
            detallesHTML += '</tbody>';
            detallesHTML += '</table>';
            detallesHTML += '</div>';
        }
        
        if (data.info && data.info.length > 0) {
            detallesHTML += '<h5>Información del archivo:</h5><ul>';
            data.info.forEach(info => {
                detallesHTML += `<li>${info}</li>`;
            });
            detallesHTML += '</ul>';
        }
        
        if (data.errores && data.errores.length > 0) {
            detallesHTML += '<h5>Errores encontrados:</h5><ul class="text-danger">';
            data.errores.forEach(error => {
                detallesHTML += `<li>${error}</li>`;
            });
            detallesHTML += '</ul>';
        }
        
        detallesHTML += '</div>';
        resultadoDetalles.innerHTML = detallesHTML;
    }
    
    console.log('Coord_gestion.js: Preview results displayed to user');
}

// ========================================
// FUNCIONES DE PESTAÑAS
// ========================================

function cambiarTab(tabName) {
    console.log(`Coord_gestion.js: Changing to tab: ${tabName}`);
    
    // Ocultar todas las pestañas
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
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
        selectedTab.classList.add('active');
    }
    
    // Marcar la pestaña como activa
    const selectedSpan = document.querySelector(`[onclick="cambiarTab('${tabName}')"]`);
    if (selectedSpan) {
        selectedSpan.classList.add('active');
    }
    
    // Cargar datos específicos de la pestaña
    if (tabName === 'bases') {
        cargarBases();
    } else if (tabName === 'historial') {
        cargarHistorial();
    }
    
    console.log(`Coord_gestion.js: Tab changed to: ${tabName}`);
}

// ========================================
// FUNCIONES DE CARGA DE DATOS
// ========================================

function cargarBases() {
    console.log('Coord_gestion.js: Loading bases data...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Bases data received:', data);
            
            const tbody = document.getElementById('bases-tbody');
            if (tbody) {
                if (data.success && data.bases.length > 0) {
                    tbody.innerHTML = '';
                    data.bases.forEach(base => {
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
                        
                        // Log detallado para depuración
                        console.log(`Base ${base.id}:`, {
                            nombre: base.nombre,
                            total_clientes: totalClientes,
                            total_obligaciones_raw: base.total_obligaciones,
                            TOTAL_OBLIGACIONES_raw: base.TOTAL_OBLIGACIONES,
                            total_obligaciones_calculado: totalObligaciones,
                            estado: estado,
                            objeto_completo: base
                        });
                        
                        const row = document.createElement('tr');
                        // Asegurar que cada celda esté en el orden correcto: nombre, fecha, clientes, obligaciones, estado, acciones
                        row.innerHTML = `
                            <td>${base.nombre || 'Sin nombre'}</td>
                            <td>${base.fecha_creacion ? new Date(base.fecha_creacion).toLocaleDateString() : '-'}</td>
                            <td>${totalClientes}</td>
                            <td><strong>${totalObligaciones}</strong></td>
                            <td><span class="badge badge-success">${estado}</span></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-primary" onclick="abrirModalAsignaciones('${base.id}', '${base.nombre}', ${totalClientes})" title="Dar Acceso">
                                        <i class="fas fa-key"></i> Dar Acceso
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="verAsesoresConAcceso('${base.id}', '${base.nombre}')" title="Ver Asesores con Acceso">
                                        <i class="fas fa-users"></i> Ver
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="verClientesBase(${base.id}, '${(base.nombre || '').replace(/'/g, "\\'")}')" title="Ver Clientes">
                                        <i class="fas fa-eye"></i> Clientes
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="eliminarBase('${base.id}', '${base.nombre}')" title="Eliminar Base">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="empty-state">
                                <i class="fas fa-database"></i>
                                <p>No hay bases de clientes creadas</p>
                            </td>
                        </tr>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading bases:', error);
        });
}


// ========================================
// FUNCIONES DE ACCIONES
// ========================================

function verAsesoresConAcceso(baseId, baseNombre) {
    console.log(`Coord_gestion.js: Viewing advisors with access to base: ${baseId}`);
    
    // Mostrar modal de carga
    mostrarModalAsesoresAcceso(baseId, baseNombre);
    
    // Cargar asesores con acceso
    cargarAsesoresConAcceso(baseId);
}

function mostrarModalAsesoresAcceso(baseId, baseNombre) {
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById('modal-asesores-acceso');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-asesores-acceso';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Asesores con Acceso a la Base</h3>
                    <button class="modal-close" onclick="cerrarModalAsesoresAcceso()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="base-info-card">
                        <h4 id="modal-base-nombre">${baseNombre}</h4>
                        <div class="base-details">
                            <span class="base-detail-item">
                                <i class="fas fa-database"></i>
                                <strong>Base ID:</strong> <span id="modal-base-id">${baseId}</span>
                            </span>
                            <span class="base-detail-item">
                                <i class="fas fa-user-check"></i>
                                <strong>Asesores con acceso:</strong> <span id="modal-asesores-count">0</span>
                            </span>
                        </div>
                    </div>
                    
                    <div class="asesores-acceso-section">
                        <h4>Lista de Asesores con Acceso</h4>
                        <div class="asesores-acceso-list" id="asesores-acceso-list">
                            <div class="loading-state">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Cargando asesores con acceso...</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="cerrarModalAsesoresAcceso()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Actualizar información de la base
    document.getElementById('modal-base-nombre').textContent = baseNombre;
    document.getElementById('modal-base-id').textContent = baseId;
    
    // Mostrar modal
    modal.style.display = 'block';
}

function cargarAsesoresConAcceso(baseId) {
    console.log(`Coord_gestion.js: Loading advisors with access to base: ${baseId}`);
    
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Advisors with access data received:', data);
            
            const asesoresList = document.getElementById('asesores-acceso-list');
            const asesoresCount = document.getElementById('modal-asesores-count');
            
            if (data.success && data.asesores.length > 0) {
                asesoresCount.textContent = data.asesores.length;
                
                asesoresList.innerHTML = '';
                data.asesores.forEach(asesor => {
                    const asesorCard = document.createElement('div');
                    asesorCard.className = 'asesor-acceso-card';
                    asesorCard.innerHTML = `
                        <div class="asesor-info">
                            <div class="asesor-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="asesor-details">
                                <h5>${asesor.nombre_completo}</h5>
                                <p class="asesor-usuario">Usuario: ${asesor.usuario}</p>
                                <p class="asesor-estado">
                                    <span class="badge badge-${asesor.estado === 'activo' ? 'success' : 'secondary'}">
                                        ${asesor.estado}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="asesor-access-info">
                            <div class="access-detail">
                                <i class="fas fa-calendar"></i>
                                <span>Acceso desde: ${new Date(asesor.fecha_asignacion).toLocaleDateString()}</span>
                            </div>
                            <div class="access-detail">
                                <i class="fas fa-key"></i>
                                <span>Estado: ${asesor.asignacion_estado}</span>
                            </div>
                        </div>
                        <div class="asesor-actions">
                            <button class="btn btn-sm btn-danger" onclick="liberarAccesoAsesor('${asesor.cedula}', '${asesor.nombre_completo}', '${baseId}')" title="Quitar acceso a esta base">
                                <i class="fas fa-times"></i> Liberar
                            </button>
                        </div>
                    `;
                    asesoresList.appendChild(asesorCard);
                });
            } else {
                asesoresCount.textContent = '0';
                asesoresList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-times"></i>
                        <p>No hay asesores con acceso a esta base</p>
                        <small>Use el botón "Dar Acceso" para asignar asesores a esta base</small>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading advisors with access:', error);
            const asesoresList = document.getElementById('asesores-acceso-list');
            asesoresList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar los asesores con acceso</p>
                    <small>${error.message}</small>
                </div>
            `;
        });
}

function cerrarModalAsesoresAcceso() {
    const modal = document.getElementById('modal-asesores-acceso');
    if (modal) {
        modal.style.display = 'none';
    }
}

function liberarAccesoAsesor(asesorCedula, asesorNombre, baseId) {
    console.log(`Coord_gestion.js: Liberating access for advisor: ${asesorCedula} from base: ${baseId}`);
    
    // Mostrar confirmación
    const confirmacion = confirm(`¿Está seguro de que desea quitar el acceso de ${asesorNombre} a esta base de clientes?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Mostrar indicador de carga
    const botonLiberar = event.target;
    const textoOriginal = botonLiberar.innerHTML;
    botonLiberar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Liberando...';
    botonLiberar.disabled = true;
    
    // Hacer petición para liberar acceso
    fetch('index.php?action=liberar_acceso_base', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `asesor_cedula=${asesorCedula}&base_id=${baseId}`
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Liberate access response:', data);
        
        if (data.success) {
            // Mostrar mensaje de éxito
            mostrarNotificacion('success', `Acceso de ${asesorNombre} liberado exitosamente`);
            
            // Recargar la lista de asesores
            cargarAsesoresConAcceso(baseId);
        } else {
            // Mostrar mensaje de error
            mostrarNotificacion('error', `Error al liberar acceso: ${data.message}`);
            
            // Restaurar botón
            botonLiberar.innerHTML = textoOriginal;
            botonLiberar.disabled = false;
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error liberating access:', error);
        mostrarNotificacion('error', 'Error de conexión al liberar acceso');
        
        // Restaurar botón
        botonLiberar.innerHTML = textoOriginal;
        botonLiberar.disabled = false;
    });
}

function mostrarNotificacion(tipo, mensaje) {
    // Crear notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div class="notificacion-content">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Agregar al body
    document.body.appendChild(notificacion);
    
    // Mostrar con animación
    setTimeout(() => {
        notificacion.classList.add('show');
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notificacion.classList.remove('show');
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 3000);
}




// ========================================
// FUNCIONES PARA ESTADÍSTICAS DE BASES
// ========================================

function cargarEstadisticasBases() {
    console.log('Coord_gestion.js: Loading base statistics...');
    
    fetch('index.php?action=obtener_estadisticas_bases')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Base statistics received:', data);
            
            if (data.success) {
                // Actualizar estadísticas de BASES ACTIVAS
                const statTotalBases = document.getElementById('stat-total-bases');
                const statClientesTotales = document.getElementById('stat-clientes-totales');
                const statObligacionesTotales = document.getElementById('stat-obligaciones-totales');
                const statBasesInactivas = document.getElementById('stat-bases-inactivas');
                
                if (statTotalBases) statTotalBases.textContent = data.total_bases || 0;
                if (statClientesTotales) statClientesTotales.textContent = data.clientes_totales || 0;
                if (statObligacionesTotales) statObligacionesTotales.textContent = data.obligaciones_totales || 0;
                if (statBasesInactivas) statBasesInactivas.textContent = data.bases_inactivas || 0;
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading base statistics:', error);
        });
}

function refreshBases() {
    console.log('Coord_gestion.js: Refreshing bases data...');
    cargarBases();
    cargarEstadisticasBases();
}

function verDetallesBase(baseId) {
    console.log('Coord_gestion.js: Viewing base details for ID:', baseId);
    alert('Función de ver detalles de base en desarrollo. ID: ' + baseId);
}

function exportarBase(baseId) {
    console.log('Coord_gestion.js: Exporting base with ID:', baseId);
    alert('Función de exportar base en desarrollo. ID: ' + baseId);
}

function exportarBases() {
    console.log('Coord_gestion.js: Exporting all bases');
    alert('Función de exportar todas las bases en desarrollo');
}

// ========================================
// FUNCIONES PARA ASIGNACIÓN DE TAREAS
// ========================================

function cargarDatosTareas() {
    console.log('Coord_gestion.js: Loading task assignment data...');
    
    // Cargar bases de clientes
    cargarBasesParaTareas();
    
    // Cargar asesores
    cargarAsesoresParaTareas();
}

function cargarBasesParaTareas() {
    console.log('Coord_gestion.js: Loading bases for task assignment...');
    
    fetch('index.php?action=obtener_bases')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Bases data for tasks received:', data);
            
            const selectBase = document.getElementById('select-base-clientes');
            if (selectBase) {
                selectBase.innerHTML = '<option value="">Seleccione una base de clientes...</option>';
                
                if (data.success && data.bases.length > 0) {
                    data.bases.forEach(base => {
                        const option = document.createElement('option');
                        option.value = base.id;
                        option.textContent = `${base.nombre} (${base.total_clientes} clientes)`;
                        option.dataset.totalClientes = base.total_clientes;
                        selectBase.appendChild(option);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading bases for tasks:', error);
        });
}

function cargarAsesoresParaTareas() {
    console.log('Coord_gestion.js: Loading advisors for task assignment...');
    
    fetch('index.php?action=obtener_asesores')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Advisors data for tasks received:', data);
            
            const selectAsesor = document.getElementById('select-asesor');
            if (selectAsesor) {
                selectAsesor.innerHTML = '<option value="">Seleccione un asesor...</option>';
                
                if (data.success && data.asesores.length > 0) {
                    data.asesores.forEach(asesor => {
                        const option = document.createElement('option');
                        option.value = asesor.cedula;
                        option.textContent = `${asesor.nombre_completo} (${asesor.usuario})`;
                        selectAsesor.appendChild(option);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading advisors for tasks:', error);
        });
}

function actualizarClientesDisponibles() {
    console.log('Coord_gestion.js: Updating available clients...');
    
    const selectBase = document.getElementById('select-base-clientes');
    const selectAsesor = document.getElementById('select-asesor');
    const inputClientes = document.getElementById('input-clientes-asignar');
    const clientTotalInfo = document.getElementById('client-total-info');
    
    if (selectBase && selectBase.value) {
        const baseId = selectBase.value;
        
        // Obtener clientes no asignados por tareas específicas
        fetch(`index.php?action=obtener_clientes_no_asignados&base_id=${baseId}`)
            .then(response => response.json())
            .then(data => {
                console.log('Coord_gestion.js: Available clients data:', data);
                
                if (data.success) {
                    const clientesDisponibles = data.clientes_no_asignados;
                    
                    if (inputClientes) {
                        inputClientes.max = clientesDisponibles;
                        inputClientes.placeholder = `Máximo ${clientesDisponibles}`;
                    }
                    
                    if (clientTotalInfo) {
                        clientTotalInfo.textContent = `Disponibles para asignar: ${clientesDisponibles} (${data.total_clientes} total, ${data.clientes_asignados} ya asignados)`;
                    }
                    
                    console.log(`Coord_gestion.js: Updated client limit to ${clientesDisponibles} available clients`);
                    
                    // Limpiar selección de asesor cuando cambia la base
                    if (selectAsesor) {
                        selectAsesor.value = '';
                    }
                    
                    // Cargar asesores que tienen acceso a esta base específica
                    cargarAsesoresConAccesoBase(baseId);
                } else {
                    console.error('Coord_gestion.js: Error getting available clients:', data.message);
                    mostrarAlerta('error', 'Error al obtener clientes disponibles');
                }
            })
            .catch(error => {
                console.error('Coord_gestion.js: Error fetching available clients:', error);
                mostrarAlerta('error', 'Error de conexión al obtener clientes disponibles');
            });
    } else {
        if (inputClientes) {
            inputClientes.max = 0;
            inputClientes.placeholder = '0';
        }
        
        if (clientTotalInfo) {
            clientTotalInfo.textContent = 'Total disponible: 0';
        }
        
        // Limpiar asesores si no hay base seleccionada
        if (selectAsesor) {
            selectAsesor.innerHTML = '<option value="">Seleccione un asesor...</option>';
        }
    }
    
    validarAsignacion();
}

function cargarAsesoresConAccesoBase(baseId) {
    console.log('Coord_gestion.js: Loading advisors with access to base:', baseId);
    
    const selectAsesor = document.getElementById('select-asesor');
    if (!selectAsesor) return;
    
    if (!baseId) {
        selectAsesor.innerHTML = '<option value="">Seleccione un asesor...</option>';
        return;
    }
    
    // Mostrar loading
    selectAsesor.innerHTML = '<option value="">Cargando asesores con acceso...</option>';
    
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Advisors with access received:', data);
            
            selectAsesor.innerHTML = '<option value="">Seleccione un asesor...</option>';
            
            if (data.success && data.asesores.length > 0) {
                data.asesores.forEach(asesor => {
                    const option = document.createElement('option');
                    option.value = asesor.cedula;
                    option.textContent = `${asesor.nombre_completo} (${asesor.usuario})`;
                    selectAsesor.appendChild(option);
                });
                console.log(`Coord_gestion.js: Loaded ${data.asesores.length} advisors with access to base ${baseId}`);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay asesores con acceso a esta base';
                option.disabled = true;
                selectAsesor.appendChild(option);
                console.log('Coord_gestion.js: No advisors with access to this base');
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading advisors with access:', error);
            selectAsesor.innerHTML = '<option value="">Error al cargar asesores</option>';
        });
}

function validarAsignacion() {
    console.log('Coord_gestion.js: Validating assignment...');
    
    const selectBase = document.getElementById('select-base-clientes');
    const selectAsesor = document.getElementById('select-asesor');
    const inputClientes = document.getElementById('input-clientes-asignar');
    const btnAsignar = document.getElementById('btn-asignar');
    const tareasSummary = document.getElementById('tareas-summary');
    
    const baseSeleccionada = selectBase && selectBase.value;
    const asesorSeleccionado = selectAsesor && selectAsesor.value;
    const clientesAsignar = inputClientes && parseInt(inputClientes.value);
    
    const esValida = baseSeleccionada && asesorSeleccionado && clientesAsignar && clientesAsignar > 0;
    
    if (btnAsignar) {
        btnAsignar.disabled = !esValida;
    }
    
    if (esValida) {
        mostrarResumenAsignacion();
    } else {
        if (tareasSummary) {
            tareasSummary.style.display = 'none';
        }
    }
    
    console.log(`Coord_gestion.js: Assignment valid: ${esValida}`);
}

function mostrarResumenAsignacion() {
    console.log('Coord_gestion.js: Showing assignment summary...');
    
    const selectBase = document.getElementById('select-base-clientes');
    const selectAsesor = document.getElementById('select-asesor');
    const inputClientes = document.getElementById('input-clientes-asignar');
    const tareasSummary = document.getElementById('tareas-summary');
    
    if (!tareasSummary) return;
    
    const baseNombre = selectBase ? selectBase.options[selectBase.selectedIndex].textContent : '-';
    const asesorNombre = selectAsesor ? selectAsesor.options[selectAsesor.selectedIndex].textContent : '-';
    const clientesAsignar = inputClientes ? parseInt(inputClientes.value) : 0;
    // Obtener el máximo disponible del input (que ya fue actualizado por actualizarClientesDisponibles)
    const maxDisponibles = inputClientes ? parseInt(inputClientes.max) : 0;
    const clientesRestantes = maxDisponibles - clientesAsignar;
    
    // Actualizar resumen
    const summaryBase = document.getElementById('summary-base');
    const summaryAsesor = document.getElementById('summary-asesor');
    const summaryClientes = document.getElementById('summary-clientes');
    const summaryRestantes = document.getElementById('summary-restantes');
    
    if (summaryBase) summaryBase.textContent = baseNombre;
    if (summaryAsesor) summaryAsesor.textContent = asesorNombre;
    if (summaryClientes) summaryClientes.textContent = clientesAsignar;
    if (summaryRestantes) summaryRestantes.textContent = clientesRestantes;
    
    tareasSummary.style.display = 'block';
    
    console.log('Coord_gestion.js: Assignment summary displayed');
}

function asignarClientes() {
    console.log('Coord_gestion.js: Assigning clients...');
    
    const selectBase = document.getElementById('select-base-clientes');
    const selectAsesor = document.getElementById('select-asesor');
    const inputClientes = document.getElementById('input-clientes-asignar');
    const btnAsignar = document.getElementById('btn-asignar');
    
    if (!selectBase || !selectAsesor || !inputClientes) {
        mostrarAlerta('error', 'Error: No se pudieron obtener los datos de asignación');
        return;
    }
    
    const baseId = selectBase.value;
    const asesorCedula = selectAsesor.value;
    const clientesAsignar = parseInt(inputClientes.value);
    
    if (!baseId || !asesorCedula || !clientesAsignar) {
        mostrarAlerta('warning', 'Por favor complete todos los campos requeridos');
        return;
    }
    
    // Deshabilitar botón durante el proceso
    if (btnAsignar) {
        btnAsignar.disabled = true;
        btnAsignar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Asignando...';
    }
    
    // Crear datos para enviar
    const datosAsignacion = {
        base_id: baseId,
        asesor_cedula: asesorCedula,
        clientes_asignar: clientesAsignar,
        fecha_asignacion: new Date().toISOString()
    };
    
    console.log('Coord_gestion.js: Sending assignment data:', datosAsignacion);
    
    // Enviar asignación al servidor
    fetch('index.php?action=asignar_clientes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosAsignacion)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Assignment response:', data);
        
        if (data.success) {
            mostrarAlerta('success', `Asignación exitosa: ${clientesAsignar} clientes asignados al asesor seleccionado`);
            
            // Actualizar estadísticas
            cargarEstadisticasBases();
            
            // Limpiar formulario
            limpiarAsignacion();
        } else {
            mostrarAlerta('error', data.message || 'Error al asignar clientes');
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error during assignment:', error);
        mostrarAlerta('error', 'Error de conexión al asignar clientes');
    })
    .finally(() => {
        // Restaurar botón
        if (btnAsignar) {
            btnAsignar.disabled = false;
            btnAsignar.innerHTML = '<i class="fas fa-user-plus"></i> Asignar Clientes';
        }
    });
}

function limpiarAsignacion() {
    console.log('Coord_gestion.js: Clearing assignment form...');
    
    const selectBase = document.getElementById('select-base-clientes');
    const selectAsesor = document.getElementById('select-asesor');
    const inputClientes = document.getElementById('input-clientes-asignar');
    const tareasSummary = document.getElementById('tareas-summary');
    const btnAsignar = document.getElementById('btn-asignar');
    
    if (selectBase) selectBase.value = '';
    if (selectAsesor) selectAsesor.value = '';
    if (inputClientes) {
        inputClientes.value = '';
        inputClientes.max = 0;
        inputClientes.placeholder = '0';
    }
    if (tareasSummary) tareasSummary.style.display = 'none';
    if (btnAsignar) btnAsignar.disabled = true;
    
    // Actualizar información de clientes disponibles
    const clientTotalInfo = document.getElementById('client-total-info');
    if (clientTotalInfo) {
        clientTotalInfo.textContent = 'Total disponible: 0';
    }
    
    console.log('Coord_gestion.js: Assignment form cleared');
}

function verAsignacionesExistentes() {
    console.log('Coord_gestion.js: Viewing existing assignments');
    
    // Mostrar modal de asignaciones
    mostrarModalAsignaciones();
    
    // Cargar datos de asignaciones
    cargarAsignacionesExistentes();
}

function mostrarModalAsignaciones() {
    console.log('Coord_gestion.js: Opening assignments modal');
    
    // Crear modal si no existe
    let modal = document.getElementById('modal-asignaciones');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-asignaciones';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Asignaciones de Clientes a Asesores</h3>
                    <button class="modal-close" onclick="cerrarModalAsignacionesExistentes()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tareas-table-container">
                        <table class="tareas-table">
                            <thead>
                                <tr>
                                    <th>Base de Clientes</th>
                                    <th>Asesor Asignado</th>
                                    <th>Clientes Asignados</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tareas-tbody">
                                <tr>
                                    <td colspan="4" class="empty-state">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p>Cargando asignaciones...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Agregar event listener para cerrar con ESC
        const escHandler = function(event) {
            if (event.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Agregar event listener para cerrar al hacer clic fuera del modal
        const clickHandler = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        modal.addEventListener('click', clickHandler);
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    console.log('Coord_gestion.js: Modal displayed');
    
    // Cargar datos
    cargarAsignacionesExistentes();
}

function cargarAsignacionesExistentes() {
    console.log('Coord_gestion.js: Loading existing assignments...');
    
    const tbody = document.getElementById('tareas-tbody');
    if (!tbody) return;
    
    // Mostrar estado de carga
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando asignaciones...</p>
            </td>
        </tr>
    `;
    
    // Cargar datos reales desde el servidor
    fetch('index.php?action=obtener_tareas_coordinador')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Assignments data received:', data);
            
            if (data.success && data.asignaciones && data.asignaciones.length > 0) {
                // Filtrar solo tareas no completadas
                const tareasActivas = data.asignaciones.filter(asignacion => asignacion.estado !== 'completada');
                
                // Llenar tabla con datos reales
                tbody.innerHTML = '';
                
                if (tareasActivas.length > 0) {
                    tareasActivas.forEach(asignacion => {
                        const row = document.createElement('tr');
                        
                        // Parsear clientes asignados (JSON)
                        let clientesCount = 0;
                        try {
                            const clientesData = JSON.parse(asignacion.clientes_asignados || '{}');
                            clientesCount = clientesData.clientes ? clientesData.clientes.length : 0;
                        } catch (e) {
                            // Si no es JSON, intentar contar comas + 1
                            clientesCount = asignacion.clientes_asignados ? (asignacion.clientes_asignados.split(',').length) : 0;
                        }
                        
                        // Determinar el estado del botón
                        const isCompleted = asignacion.estado === 'completada';
                        const buttonClass = isCompleted ? 'btn-success' : 'btn-primary';
                        const buttonText = isCompleted ? 'Completado' : 'Completar';
                        const buttonIcon = isCompleted ? 'fa-check-circle' : 'fa-check';
                        const buttonDisabled = isCompleted ? 'disabled' : '';
                        
                        row.innerHTML = `
                            <td>
                                <div class="base-info">
                                    <i class="fas fa-database"></i>
                                    <span>Asignación #${asignacion.id}</span>
                                </div>
                            </td>
                            <td>
                                <div class="asesor-info">
                                    <i class="fas fa-user"></i>
                                    <span>${asignacion.asesor_nombre || 'Asesor'}</span>
                                </div>
                            </td>
                            <td>
                                <div class="clientes-info">
                                    <span class="clientes-count">${clientesCount}</span>
                                    <small>clientes</small>
                                </div>
                            </td>
                            <td>
                                <div class="tarea-actions">
                                    <button class="btn btn-sm ${buttonClass}" 
                                            onclick="${isCompleted ? '' : `completarAsignacion(${asignacion.id}, '${asignacion.asesor_nombre}')`}" 
                                            title="Completar asignación" ${buttonDisabled}>
                                        <i class="fas ${buttonIcon}"></i> ${buttonText}
                                    </button>
                                </div>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="empty-state">
                                <i class="fas fa-check-circle"></i>
                                <p>Todas las asignaciones están completadas</p>
                                <small>No hay tareas pendientes en este momento</small>
                            </td>
                        </tr>
                    `;
                }
                
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No hay asignaciones disponibles</p>
                            <small>Las asignaciones aparecerán aquí cuando se creen tareas desde la pestaña TAREAS</small>
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading assignments:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al cargar las asignaciones</p>
                    </td>
                </tr>
            `;
        });
}



// ==================== FUNCIONES DEL HISTORIAL ====================

function cargarHistorial() {
    console.log('Coord_gestion.js: Loading history...');
    
    const tbody = document.getElementById('historial-tbody');
    if (!tbody) return;
    
    // Mostrar estado de carga
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando historial...</p>
            </td>
        </tr>
    `;
    
    // Cargar datos del historial
    fetch('index.php?action=obtener_historial')
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: History data received:', data);
            
            if (data.success && data.historial && data.historial.length > 0) {
                tbody.innerHTML = '';
                
                data.historial.forEach(actividad => {
                    const row = document.createElement('tr');
                    
                    // Determinar el icono según el tipo de actividad
                    let icono = 'fas fa-file';
                    let claseEstado = '';
                    
                    switch (actividad.tipo_actividad) {
                        case 'carga_csv':
                            icono = 'fas fa-upload';
                            claseEstado = actividad.estado === 'exitoso' ? 'text-success' : 'text-danger';
                            break;
                        case 'asignacion_tarea':
                            icono = 'fas fa-user-plus';
                            claseEstado = 'text-info';
                            break;
                        case 'completar_tarea':
                            icono = 'fas fa-check-circle';
                            claseEstado = 'text-success';
                            break;
                        case 'acceso_base':
                            icono = 'fas fa-key';
                            claseEstado = 'text-warning';
                            break;
                        case 'liberar_acceso_base':
                            icono = 'fas fa-unlock';
                            claseEstado = 'text-danger';
                            break;
                        case 'crear_base':
                            icono = 'fas fa-database';
                            claseEstado = 'text-success';
                            break;
                        case 'eliminar_base':
                            icono = 'fas fa-trash';
                            claseEstado = 'text-danger';
                            break;
                        default:
                            icono = 'fas fa-file';
                            claseEstado = 'text-muted';
                            break;
                    }
                    
                    row.innerHTML = `
                        <td>
                            <div class="activity-info">
                                <i class="${icono}"></i>
                                <span>${actividad.descripcion}</span>
                            </div>
                        </td>
                        <td>
                            <div class="activity-target">
                                <strong>${actividad.archivo_tarea || '-'}</strong>
                            </div>
                        </td>
                        <td>
                            <div class="activity-date">
                                ${formatearFecha(actividad.fecha_actividad)}
                            </div>
                        </td>
                        <td>
                            <span class="activity-status ${claseEstado}">
                                ${actividad.estado || 'Completado'}
                            </span>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-history"></i>
                            <p>No hay actividades registradas</p>
                            <small>Las actividades aparecerán aquí cuando realices acciones en el sistema</small>
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading history:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al cargar el historial</p>
                    </td>
                </tr>
            `;
        });
}

function filtrarHistorial() {
    const filtro = document.querySelector('#tab-historial select').value;
    console.log('Coord_gestion.js: Filtering history by:', filtro);
    
    // Aquí se implementaría la lógica de filtrado
    // Por ahora, recargamos todo el historial
    cargarHistorial();
}


function limpiarHistorial() {
    console.log('Coord_gestion.js: Clearing history...');
    
    const confirmacion = confirm('¿Está seguro de que desea limpiar todo el historial?\n\nEsta acción no se puede deshacer.');
    
    if (!confirmacion) {
        return;
    }
    
    fetch('index.php?action=limpiar_historial', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', 'Historial limpiado exitosamente');
            cargarHistorial();
        } else {
            mostrarNotificacion('error', `Error al limpiar historial: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error clearing history:', error);
        mostrarNotificacion('error', 'Error de conexión al limpiar historial');
    });
}


function formatearFecha(fecha) {
    if (!fecha) return '-';
    
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - fechaObj;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffMin < 1) {
        return 'Hace un momento';
    } else if (diffMin < 60) {
        return `Hace ${diffMin} min`;
    } else if (diffHoras < 24) {
        return `Hace ${diffHoras}h`;
    } else if (diffDias < 7) {
        return `Hace ${diffDias} días`;
    } else {
        return fechaObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ========================================
// FUNCIONES AUXILIARES PARA TAREAS
// ========================================

function getEstadoClass(estado) {
    const estados = {
        'pendiente': 'estado-pendiente',
        'en_progreso': 'estado-progreso',
        'completada': 'estado-completada',
        'cancelada': 'estado-cancelada',
        'pausada': 'estado-pausada'
    };
    return estados[estado] || 'estado-pendiente';
}

function getPrioridadClass(prioridad) {
    const prioridades = {
        'baja': 'prioridad-baja',
        'media': 'prioridad-media',
        'alta': 'prioridad-alta',
        'urgente': 'prioridad-urgente'
    };
    return prioridades[prioridad] || 'prioridad-media';
}

function getEstadoLabel(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'en_progreso': 'En Progreso',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'pausada': 'Pausada'
    };
    return estados[estado] || estado;
}

function getPrioridadLabel(prioridad) {
    const prioridades = {
        'baja': 'Baja',
        'media': 'Media',
        'alta': 'Alta',
        'urgente': 'Urgente'
    };
    return prioridades[prioridad] || prioridad;
}

function getTipoTareaLabel(tipo) {
    const tipos = {
        'llamada': 'Llamada',
        'gestion': 'Gestión',
        'seguimiento': 'Seguimiento',
        'revision': 'Revisión',
        'otro': 'Otro'
    };
    return tipos[tipo] || tipo;
}

// ========================================
// FUNCIONES DE ACCIONES DE TAREAS
// ========================================

function completarTarea(tareaId, tituloTarea) {
    console.log(`Coord_gestion.js: Completing task: ${tareaId}`);
    
    // Mostrar confirmación
    const confirmacion = confirm(`¿Está seguro de que desea marcar como completada la tarea "${tituloTarea}"?\n\nUna vez completada, el asesor ya no podrá trabajar en esta tarea.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Mostrar indicador de carga
    const botonCompletar = event.target.closest('button');
    const textoOriginal = botonCompletar.innerHTML;
    botonCompletar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    botonCompletar.disabled = true;
    
    // Hacer petición para completar tarea
    fetch('index.php?action=completar_tarea', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tarea_id=${tareaId}&nuevo_estado=completada`
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Complete task response:', data);
        
        if (data.success) {
            // Mostrar mensaje de éxito
            mostrarNotificacion('success', `Tarea "${tituloTarea}" completada exitosamente`);
            
            // Recargar la lista de tareas
            cargarAsignacionesExistentes();
        } else {
            // Mostrar mensaje de error
            mostrarNotificacion('error', `Error al completar tarea: ${data.message}`);
            
            // Restaurar botón
            botonCompletar.innerHTML = textoOriginal;
            botonCompletar.disabled = false;
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error completing task:', error);
        mostrarNotificacion('error', 'Error de conexión al completar tarea');
        
        // Restaurar botón
        botonCompletar.innerHTML = textoOriginal;
        botonCompletar.disabled = false;
    });
}

function verDetallesTarea(tareaId) {
    console.log(`Coord_gestion.js: Viewing task details: ${tareaId}`);
    alert(`Función de ver detalles de tarea en desarrollo. ID: ${tareaId}`);
}

function editarTarea(tareaId) {
    console.log(`Coord_gestion.js: Editing task: ${tareaId}`);
    alert(`Función de editar tarea en desarrollo. ID: ${tareaId}`);
}

function eliminarTarea(tareaId, tituloTarea) {
    console.log(`Coord_gestion.js: Deleting task: ${tareaId}`);
    
    const confirmacion = confirm(`¿Está seguro de que desea eliminar la tarea "${tituloTarea}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Hacer petición para eliminar tarea
    fetch('index.php?action=eliminar_tarea', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tarea_id=${tareaId}`
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Delete task response:', data);
        
        if (data.success) {
            mostrarNotificacion('success', `Tarea "${tituloTarea}" eliminada exitosamente`);
            cargarAsignacionesExistentes();
        } else {
            mostrarNotificacion('error', `Error al eliminar tarea: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error deleting task:', error);
        mostrarNotificacion('error', 'Error de conexión al eliminar tarea');
    });
}

function completarAsignacion(asignacionId, nombreAsesor) {
    console.log(`Coord_gestion.js: Completing assignment: ${asignacionId}`);
    
    const confirmacion = confirm(`¿Está seguro de que desea marcar como completada la asignación de ${nombreAsesor}?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Hacer petición para completar la asignación
    fetch('index.php?action=completar_asignacion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `asignacion_id=${asignacionId}`
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Complete assignment response:', data);
        
        if (data.success) {
            // Mostrar notificación de éxito
            mostrarNotificacion('success', `Asignación de ${nombreAsesor} completada exitosamente`);
            
            // Recargar la lista de asignaciones para que desaparezca la tarea completada
            cargarAsignacionesExistentes();
            
            console.log('Coord_gestion.js: Task completed and list reloaded');
        } else {
            mostrarNotificacion('error', `Error al completar asignación: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error completing assignment:', error);
        mostrarNotificacion('error', 'Error de conexión al completar asignación');
    });
}

function filtrarAsignaciones() {
    console.log('Coord_gestion.js: Filtering assignments...');
    // Implementar filtrado si es necesario
}

function verDetallesAsignacion(id) {
    console.log('Coord_gestion.js: Viewing assignment details for ID:', id);
    mostrarAlerta('info', `Ver detalles de asignación ID: ${id}`);
}

function editarAsignacion(id) {
    console.log('Coord_gestion.js: Editing assignment ID:', id);
    mostrarAlerta('warning', `Editar asignación ID: ${id}`);
}

function eliminarAsignacion(id) {
    console.log('Coord_gestion.js: Deleting assignment ID:', id);
    
    if (confirm('¿Está seguro de que desea eliminar esta asignación?')) {
        fetch('index.php?action=eliminar_asignacion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarAlerta('success', 'Asignación eliminada exitosamente');
                cargarAsignacionesExistentes(); // Recargar tabla
            } else {
                mostrarAlerta('error', data.message || 'Error al eliminar asignación');
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error deleting assignment:', error);
            mostrarAlerta('error', 'Error de conexión al eliminar asignación');
        });
    }
}

function exportarAsignaciones() {
    console.log('Coord_gestion.js: Exporting assignments');
    mostrarAlerta('info', 'Función de exportar asignaciones en desarrollo');
}

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function mostrarAlerta(tipo, mensaje) {
    console.log(`Coord_gestion.js: Showing ${tipo} alert: ${mensaje}`);
    
    // Crear elemento de alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.style.cssText = `
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
    
    // Colores según el tipo
    const colores = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    alerta.style.backgroundColor = colores[tipo] || colores.info;
    
    // Iconos según el tipo
    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    alerta.innerHTML = `
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
    
    // Agregar al DOM
    document.body.appendChild(alerta);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alerta.parentElement) {
            alerta.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (alerta.parentElement) {
                    alerta.remove();
                }
            }, 300);
        }
    }, 5000);
}

// ========================================
// FUNCIONES DE ACCESO A BASE DE DATOS
// ========================================

let currentBaseData = null;
let allAsesores = [];

function abrirModalAcceso(baseData) {
    console.log('Coord_gestion.js: Opening access modal for base:', baseData);
    
    currentBaseData = baseData;
    
    // Llenar información de la base
    document.getElementById('modal-base-name').textContent = baseData.nombre || 'Base de Clientes';
    document.getElementById('modal-base-date').textContent = baseData.fecha || 'N/A';
    document.getElementById('modal-base-clients').textContent = baseData.total_clientes || '0';
    
    // Mostrar modal
    document.getElementById('modal-acceso-base').style.display = 'block';
    
    // Cargar contador real de asesores con acceso
    cargarContadorAsesoresConAcceso(baseData.id || baseData.fecha);
    
    // Cargar asesores sin acceso
    cargarAsesoresParaAcceso();
}

function cargarContadorAsesoresConAcceso(baseId) {
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Count of advisors with access:', data);
            
            if (data.success && data.asesores) {
                document.getElementById('modal-base-access-count').textContent = data.asesores.length;
            } else {
                document.getElementById('modal-base-access-count').textContent = '0';
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading count:', error);
            document.getElementById('modal-base-access-count').textContent = '0';
        });
}

function cargarAsesoresParaAcceso() {
    console.log('Coord_gestion.js: Loading advisors for access...');
    
    const checkboxList = document.getElementById('asesores-checkbox-list');
    checkboxList.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando asesores...</p>
        </div>
    `;
    
    // Obtener asesores SIN acceso a la base actual
    const base_id = currentBaseData.id || currentBaseData.fecha;
    
    fetch(`index.php?action=obtener_asesores_sin_acceso&base_id=${base_id}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Advisors without access loaded:', data);
            
            if (data.success && data.asesores) {
                allAsesores = data.asesores;
                mostrarAsesoresEnModal(data.asesores);
            } else {
                checkboxList.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>No se pudieron cargar los asesores</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading advisors:', error);
            checkboxList.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar los asesores</p>
                </div>
            `;
        });
}

function mostrarAsesoresEnModal(asesores) {
    const checkboxList = document.getElementById('asesores-checkbox-list');
    
    if (!asesores || asesores.length === 0) {
        checkboxList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-users"></i>
                <p>No hay asesores disponibles</p>
            </div>
        `;
        return;
    }
    
    checkboxList.innerHTML = asesores.map(asesor => `
        <div class="asesor-checkbox-item" data-asesor-id="${asesor.cedula}">
            <input type="checkbox" 
                   id="asesor-${asesor.cedula}" 
                   value="${asesor.cedula}"
                   onchange="actualizarSeleccionAsesores()">
            <div class="asesor-info">
                <div class="asesor-name">${asesor.nombre_completo}</div>
                <div class="asesor-details">Usuario: ${asesor.usuario}</div>
            </div>
            <span class="asesor-status ${asesor.estado}">${asesor.estado}</span>
        </div>
    `).join('');
    
    // Agregar evento de clic en el item completo
    checkboxList.querySelectorAll('.asesor-checkbox-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                actualizarSeleccionAsesores();
            }
        });
    });
}

function filtrarAsesores() {
    const searchTerm = document.getElementById('search-asesor').value.toLowerCase();
    const estadoFilter = document.getElementById('filter-estado').value;
    
    const items = document.querySelectorAll('.asesor-checkbox-item');
    
    items.forEach(item => {
        const nombre = item.querySelector('.asesor-name').textContent.toLowerCase();
        const estado = item.querySelector('.asesor-status').textContent.toLowerCase();
        
        const matchesSearch = nombre.includes(searchTerm);
        const matchesEstado = !estadoFilter || estado === estadoFilter;
        
        if (matchesSearch && matchesEstado) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function actualizarSeleccionAsesores() {
    const checkboxes = document.querySelectorAll('#asesores-checkbox-list input[type="checkbox"]:checked');
    const selectedCount = checkboxes.length;
    
    // Actualizar contador
    document.getElementById('selected-count').textContent = selectedCount;
    
    // Mostrar/ocultar resumen
    const summary = document.getElementById('access-summary');
    if (selectedCount > 0) {
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
    
    // Habilitar/deshabilitar botón de guardar
    const btnGuardar = document.getElementById('btn-guardar-acceso');
    btnGuardar.disabled = selectedCount === 0;
    
    // Actualizar clases visuales
    document.querySelectorAll('.asesor-checkbox-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function guardarAccesoBase() {
    const checkboxes = document.querySelectorAll('#asesores-checkbox-list input[type="checkbox"]:checked');
    const asesoresSeleccionados = Array.from(checkboxes).map(cb => cb.value);
    
    if (asesoresSeleccionados.length === 0) {
        mostrarAlerta('warning', 'Seleccione al menos un asesor');
        return;
    }
    
    console.log('Coord_gestion.js: Saving access for base:', currentBaseData);
    console.log('Coord_gestion.js: Selected advisors:', asesoresSeleccionados);
    
    const btnGuardar = document.getElementById('btn-guardar-acceso');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const datosAcceso = {
        base_id: currentBaseData.id || currentBaseData.fecha,
        base_nombre: currentBaseData.nombre,
        asesores: asesoresSeleccionados,
        tipo_acceso: 'completo'
    };
    
    fetch('index.php?action=guardar_acceso_base', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosAcceso)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Coord_gestion.js: Access save response:', data);
        
        if (data.success) {
            mostrarAlerta('success', `Acceso otorgado a ${asesoresSeleccionados.length} asesor(es) exitosamente`);
            closeModal('acceso-base');
            
            // Actualizar la tabla de bases
            refreshBases();
        } else {
            mostrarAlerta('error', data.message || 'Error al guardar el acceso');
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error saving access:', error);
        mostrarAlerta('error', 'Error de conexión al guardar el acceso');
    })
    .finally(() => {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Acceso';
    });
}

// ========================================
// INICIALIZACIÓN
// ========================================

// Inicialización de pestañas al cargar el DOM (consolidado con el listener principal)
// NOTA: Este código se ejecuta desde el listener principal en la línea 18
// para evitar duplicación. Si necesitas inicialización adicional, agregarla allí.

// =========================================
// FUNCIONES DE ELIMINACIÓN DE BASES
// =========================================

function eliminarBase(baseId, baseNombre) {
    console.log(`Coord_gestion.js: Deleting base: ${baseId} - ${baseNombre}`);
    
    const confirmacion = confirm(`¿Está seguro de que desea eliminar la base "${baseNombre}"?\n\nEsta acción eliminará:\n- La base de datos\n- Todos los clientes asociados\n- Todos los contratos asociados\n- Todas las asignaciones de asesores\n\nEsta acción NO se puede deshacer.`);
    
    if (!confirmacion) {
        return;
    }
    
    // Mostrar indicador de carga
    mostrarNotificacion('info', 'Eliminando base de datos...');
    
    fetch('index.php?action=eliminar_base', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `base_id=${baseId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarNotificacion('success', `Base "${baseNombre}" eliminada exitosamente`);
            cargarBases(); // Recargar la lista de bases
        } else {
            mostrarNotificacion('error', `Error al eliminar base: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Coord_gestion.js: Error deleting base:', error);
        mostrarNotificacion('error', 'Error de conexión al eliminar base');
    });
}

// =========================================
// FUNCIONES DE ASIGNACIONES DE ASESORES
// =========================================

let currentAssignmentBaseData = null;
let allAsesoresAsignacion = [];

function abrirModalAsignaciones(baseId, baseNombre, totalClientes) {
    console.log('Coord_gestion.js: Opening access modal for base:', { baseId, baseNombre, totalClientes });
    
    currentAssignmentBaseData = {
        id: baseId,
        nombre: baseNombre,
        total_clientes: totalClientes
    };
    
    // Llenar información de la base
    document.getElementById('modal-assignment-base-name').textContent = baseNombre || 'Base de Clientes';
    document.getElementById('modal-assignment-base-details').textContent = baseNombre || 'N/A';
    document.getElementById('modal-assignment-base-clients').textContent = totalClientes || '0';
    
    // Mostrar modal
    document.getElementById('modal-asignaciones-asesores').style.display = 'block';
    
    // Cargar contador real de asesores con acceso
    cargarContadorAsesoresConAccesoAsignacion(baseId);
    
    // Cargar asesores sin acceso
    cargarAsesoresParaAsignacion();
}

function cargarContadorAsesoresConAccesoAsignacion(baseId) {
    fetch(`index.php?action=obtener_asesores_con_acceso&base_id=${baseId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Coord_gestion.js: Count of advisors with access for assignment:', data);
            
            if (data.success && data.asesores) {
                document.getElementById('modal-assignment-count').textContent = data.asesores.length;
            } else {
                document.getElementById('modal-assignment-count').textContent = '0';
            }
        })
        .catch(error => {
            console.error('Coord_gestion.js: Error loading count:', error);
            document.getElementById('modal-assignment-count').textContent = '0';
        });
}

async function cargarAsesoresParaAsignacion() {
    console.log('Coord_gestion.js: Loading advisors for assignment...');
    
    const asesoresListDiv = document.getElementById('asesores-assignment-list');
    asesoresListDiv.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando asesores...</p>
        </div>
    `;
    document.getElementById('btn-guardar-asignaciones').disabled = true;

    // Obtener asesores SIN acceso a la base actual
    const baseId = currentAssignmentBaseData.id;
    
    try {
        const response = await fetch(`index.php?action=obtener_asesores_sin_acceso&base_id=${baseId}`);
        const data = await response.json();

        if (data.success) {
            allAsesoresAsignacion = data.asesores;
            filtrarAsesoresAsignacion(); // Mostrar todos los asesores inicialmente
            console.log('Coord_gestion.js: Advisors WITHOUT access loaded successfully:', data.asesores.length);
        } else {
            asesoresListDiv.innerHTML = `<p class="empty-state">Error al cargar asesores: ${data.message}</p>`;
            mostrarAlerta('error', `Error al cargar asesores: ${data.message}`);
            console.error('Coord_gestion.js: Error loading advisors:', data.message);
        }
    } catch (error) {
        console.error('Coord_gestion.js: Error fetching advisors for assignment:', error);
        asesoresListDiv.innerHTML = `<p class="empty-state">Error de red al cargar asesores.</p>`;
        mostrarAlerta('error', 'Error de red al cargar asesores.');
    }
}

function filtrarAsesoresAsignacion() {
    const searchTerm = document.getElementById('search-asesor-assignment').value.toLowerCase();
    const filterEstado = document.getElementById('filter-estado-assignment').value;
    const asesoresCheckboxList = document.getElementById('asesores-assignment-list');
    asesoresCheckboxList.innerHTML = '';

    const filteredAsesores = allAsesoresAsignacion.filter(asesor => {
        const matchesSearch = asesor.nombre_completo.toLowerCase().includes(searchTerm) || 
                             asesor.usuario.toLowerCase().includes(searchTerm);
        const matchesStatus = filterEstado === '' || asesor.estado === filterEstado;
        return matchesSearch && matchesStatus;
    });

    if (filteredAsesores.length > 0) {
        filteredAsesores.forEach(asesor => {
            const asesorItem = document.createElement('div');
            asesorItem.className = 'asesor-checkbox-item';
            asesorItem.innerHTML = `
                <input type="checkbox" id="asesor-assignment-${asesor.cedula}" value="${asesor.cedula}" onchange="toggleAsesorAsignacion(this, '${asesor.cedula}')">
                <div class="asesor-info">
                    <div class="asesor-name">${asesor.nombre_completo}</div>
                    <div class="asesor-details">Usuario: ${asesor.usuario} | Cédula: ${asesor.cedula}</div>
                </div>
                <span class="asesor-status ${asesor.estado}">${asesor.estado}</span>
            `;
            asesoresCheckboxList.appendChild(asesorItem);
        });
    } else {
        asesoresCheckboxList.innerHTML = `<p class="empty-state">No se encontraron asesores con los filtros aplicados.</p>`;
    }
    actualizarResumenAsignacion();
}

function toggleAsesorAsignacion(checkbox, cedula) {
    const item = checkbox.closest('.asesor-checkbox-item');
    if (checkbox.checked) {
        item.classList.add('selected');
    } else {
        item.classList.remove('selected');
    }
    actualizarResumenAsignacion();
}

function actualizarResumenAsignacion() {
    const selectedCheckboxes = document.querySelectorAll('#asesores-assignment-list input[type="checkbox"]:checked');
    const selectedCount = selectedCheckboxes.length;
    document.getElementById('selected-assignment-count').textContent = selectedCount;
    document.getElementById('assignment-summary').style.display = selectedCount > 0 ? 'block' : 'none';
    document.getElementById('btn-guardar-asignaciones').disabled = selectedCount === 0;
}

async function guardarAsignacionesAsesores() {
    const selectedAsesores = Array.from(document.querySelectorAll('#asesores-assignment-list input[type="checkbox"]:checked'))
                                .map(cb => cb.value);
    
    if (!currentAssignmentBaseData || !currentAssignmentBaseData.id) {
        mostrarAlerta('error', 'No se ha seleccionado una base de datos válida.');
        return;
    }

    if (selectedAsesores.length === 0) {
        mostrarAlerta('warning', 'Debe seleccionar al menos un asesor para otorgar acceso.');
        return;
    }

    document.getElementById('btn-guardar-asignaciones').disabled = true;
    document.getElementById('btn-guardar-asignaciones').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Otorgando acceso...';

    try {
        const response = await fetch('index.php?action=guardar_asignaciones_base', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                base_id: currentAssignmentBaseData.id,
                asesor_ids: selectedAsesores
            })
        });
        const data = await response.json();

        if (data.success) {
            mostrarAlerta('success', 'Acceso a la base de clientes otorgado exitosamente.');
            document.getElementById('modal-asignaciones-asesores').style.display = 'none';
            cargarBases(); // Recargar la tabla de bases para reflejar los cambios
            console.log('Coord_gestion.js: Access granted successfully');
        } else {
            mostrarAlerta('error', `Error al otorgar acceso: ${data.message}`);
            console.error('Coord_gestion.js: Error granting access:', data.message);
        }
    } catch (error) {
        console.error('Coord_gestion.js: Error granting access:', error);
        mostrarAlerta('error', 'Error de red al otorgar acceso.');
    } finally {
        document.getElementById('btn-guardar-asignaciones').disabled = false;
        document.getElementById('btn-guardar-asignaciones').innerHTML = '<i class="fas fa-key"></i> Otorgar Acceso';
    }
}

function cerrarModalAsignaciones() {
    console.log('Coord_gestion.js: Closing assignment modal');
    const modal = document.getElementById('modal-asignaciones-asesores');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModal(modalId) {
    console.log(`Coord_gestion.js: Closing modal: ${modalId}`);
    
    // Si el ID ya tiene 'modal-', usarlo directamente
    let modalElementId = modalId;
    if (!modalId.startsWith('modal-')) {
        modalElementId = `modal-${modalId}`;
    }
    
    const modal = document.getElementById(modalElementId);
    if (modal) {
        modal.style.display = 'none';
        console.log(`Coord_gestion.js: Modal ${modalElementId} closed successfully`);
    } else {
        console.error(`Coord_gestion.js: Modal element not found: ${modalElementId}`);
    }
}

function cerrarModalAsignacionesExistentes() {
    console.log('Coord_gestion.js: Closing assignments modal');
    const modal = document.getElementById('modal-asignaciones');
    if (modal) {
        modal.style.display = 'none';
    }
}

console.log('Coord_gestion.js: All functions defined successfully');
