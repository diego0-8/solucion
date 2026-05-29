/**
 * Sistema híbrido de actualizaciones en tiempo real
 * Combina polling periódico con actualizaciones inmediatas
 */
class HybridUpdater {
    constructor() {
        this.pollingInterval = 8000; // 8 segundos
        this.immediateUpdate = true;
        this.callbacks = new Map();
        this.lastUpdate = Date.now();
        this.isPolling = false;
        this.pollingTimer = null;
        
        console.log('HybridUpdater: Inicializado');
    }

    // Iniciar sistema híbrido
    start() {
        if (this.isPolling) return;
        
        console.log('HybridUpdater: Iniciando sistema híbrido...');
        
        // Polling para verificación periódica
        this.startPolling();
        
        // Escuchar eventos de la página para actualizaciones inmediatas
        this.setupEventListeners();
        
        this.isPolling = true;
    }

    // Detener sistema
    stop() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        this.isPolling = false;
        console.log('HybridUpdater: Sistema detenido');
    }

    startPolling() {
        this.pollingTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.pollingInterval);
    }

    setupEventListeners() {
        // Interceptar fetch para detectar acciones importantes
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // Si es una acción que requiere actualización inmediata
            if (self.shouldUpdateImmediately(args[0])) {
                console.log('HybridUpdater: Acción detectada, actualizando inmediatamente...');
                setTimeout(() => self.forceUpdate(), 1500); // Esperar 1.5s para que se complete la acción
            }
            
            return response;
        };

        // Escuchar cambios de pestañas para actualizar contenido
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-btn')) {
                setTimeout(() => self.forceUpdate(), 500);
            }
        });

        // Escuchar eventos de formulario
        document.addEventListener('submit', (event) => {
            if (event.target.classList.contains('upload-form') || 
                event.target.classList.contains('assignment-form')) {
                setTimeout(() => self.forceUpdate(), 2000);
            }
        });
    }

    shouldUpdateImmediately(url) {
        const updateActions = [
            'cargar_csv',
            'guardar_asignaciones_base',
            'crear_tarea',
            'completar_asignacion',
            'eliminar_base',
            'liberar_acceso_base',
            'asignar_clientes',
            'limpiar_historial'
        ];
        
        const urlString = typeof url === 'string' ? url : url.toString();
        return updateActions.some(action => urlString.includes(action));
    }

    async checkForUpdates() {
        try {
            const response = await fetch('index.php?action=check_updates', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    last_update: this.lastUpdate,
                    current_tab: this.getCurrentTab(),
                    user_id: this.getCurrentUserId()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.has_updates) {
                console.log('HybridUpdater: Actualizaciones encontradas:', data.updates.length);
                this.lastUpdate = data.timestamp;
                this.notifyCallbacks(data.updates);
            }
        } catch (error) {
            console.error('HybridUpdater: Error checking updates:', error);
        }
    }

    forceUpdate() {
        console.log('HybridUpdater: Forzando actualización inmediata...');
        this.checkForUpdates();
    }

    onUpdate(type, callback) {
        if (!this.callbacks.has(type)) {
            this.callbacks.set(type, []);
        }
        this.callbacks.get(type).push(callback);
        console.log(`HybridUpdater: Callback registrado para tipo: ${type}`);
    }

    notifyCallbacks(updates) {
        updates.forEach(update => {
            const callbacks = this.callbacks.get(update.type) || [];
            console.log(`HybridUpdater: Notificando ${callbacks.length} callbacks para tipo: ${update.type}`);
            callbacks.forEach(callback => {
                try {
                    callback(update.data);
                } catch (error) {
                    console.error('HybridUpdater: Error en callback:', error);
                }
            });
        });
    }

    getCurrentTab() {
        const activeTab = document.querySelector('.tab-content.active');
        return activeTab ? activeTab.id : null;
    }

    getCurrentUserId() {
        // Obtener ID del usuario desde el HTML o una variable global
        const userElement = document.querySelector('[data-user-id]');
        return userElement ? userElement.getAttribute('data-user-id') : null;
    }

    // Método para actualizar manualmente un tipo específico
    updateType(type) {
        console.log(`HybridUpdater: Actualizando tipo específico: ${type}`);
        const callbacks = this.callbacks.get(type) || [];
        callbacks.forEach(callback => {
            try {
                callback({});
            } catch (error) {
                console.error('HybridUpdater: Error en callback específico:', error);
            }
        });
    }
}

// Instancia global
window.hybridUpdater = new HybridUpdater();

    // Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('HybridUpdater: DOM cargado, iniciando sistema...');
    window.hybridUpdater.start();
    
    // Configurar callbacks específicos según el rol del usuario
    setupRoleSpecificCallbacks();
});

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    if (window.hybridUpdater) {
        window.hybridUpdater.stop();
    }
});

// Configurar callbacks específicos según el rol del usuario
function setupRoleSpecificCallbacks() {
    console.log('HybridUpdater: Configurando callbacks específicos del rol...');
    
    // Detectar el rol del usuario basado en la URL o elementos de la página
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    
    // Callbacks para coordinador
    if (currentUrl.includes('coordinador_dashboard') || currentUrl.includes('coordinador_gestion')) {
        console.log('HybridUpdater: Configurando callbacks para COORDINADOR');
        
        window.hybridUpdater.onUpdate('bases', () => {
            if (typeof cargarBases === 'function') {
                console.log('HybridUpdater: Actualizando bases para coordinador');
                cargarBases();
            }
        });

        window.hybridUpdater.onUpdate('asesores', () => {
            if (typeof cargarAsesores === 'function') {
                console.log('HybridUpdater: Actualizando asesores para coordinador');
                cargarAsesores();
            }
        });

        window.hybridUpdater.onUpdate('historial', () => {
            if (typeof cargarHistorial === 'function') {
                console.log('HybridUpdater: Actualizando historial para coordinador');
                cargarHistorial();
            }
        });

        window.hybridUpdater.onUpdate('tareas', () => {
            if (typeof cargarAsignacionesExistentes === 'function') {
                console.log('HybridUpdater: Actualizando tareas para coordinador');
                cargarAsignacionesExistentes();
            }
        });
    }
    
    // Callbacks para administrador
    else if (currentUrl.includes('admin_dashboard') || currentUrl.includes('dashboard')) {
        console.log('HybridUpdater: Configurando callbacks para ADMINISTRADOR');
        
        window.hybridUpdater.onUpdate('bases', () => {
            if (typeof cargarBases === 'function') {
                console.log('HybridUpdater: Actualizando bases para administrador');
                cargarBases();
            }
        });

        window.hybridUpdater.onUpdate('asesores', () => {
            if (typeof cargarAsesores === 'function') {
                console.log('HybridUpdater: Actualizando asesores para administrador');
                cargarAsesores();
            }
        });

        window.hybridUpdater.onUpdate('historial', () => {
            if (typeof cargarHistorial === 'function') {
                console.log('HybridUpdater: Actualizando historial para administrador');
                cargarHistorial();
            }
        });

        window.hybridUpdater.onUpdate('tareas', () => {
            if (typeof cargarTareas === 'function') {
                console.log('HybridUpdater: Actualizando tareas para administrador');
                cargarTareas();
            }
        });
    }
    
    // Callbacks para asesor
    else if (currentUrl.includes('asesor_dashboard')) {
        console.log('HybridUpdater: Configurando callbacks para ASESOR');
        
        window.hybridUpdater.onUpdate('bases', () => {
            if (typeof cargarClientes === 'function') {
                console.log('HybridUpdater: Actualizando clientes para asesor');
                cargarClientes();
            }
        });

        window.hybridUpdater.onUpdate('tareas', () => {
            if (typeof cargarTareasAsesor === 'function') {
                console.log('HybridUpdater: Actualizando tareas para asesor');
                cargarTareasAsesor();
            }
        });

        window.hybridUpdater.onUpdate('historial', () => {
            if (typeof cargarActividadReciente === 'function') {
                console.log('HybridUpdater: Actualizando actividad reciente para asesor');
                cargarActividadReciente();
            }
        });
    }
    
    // Callbacks genéricos para cualquier rol
    window.hybridUpdater.onUpdate('historial', () => {
        // Actualizar notificaciones o indicadores de actividad
        if (typeof mostrarNotificacionActividad === 'function') {
            mostrarNotificacionActividad('Nueva actividad registrada');
        }
    });
    
    console.log('HybridUpdater: Callbacks configurados exitosamente');
}

console.log('HybridUpdater: Script cargado exitosamente');
