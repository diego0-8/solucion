/**
 * Softphone WebRTC corregido para Issabel
 * Versión optimizada con FIX para error 0.0.0.0 en SDP y soporte LAN/WAN
 * 
 * Funciones: conectar/registrar, llamada saliente, llamada entrante (aceptar/rechazar), colgar,
 * manejo de micrófono con mediaStreamFactory y tonos (ring/ringback).
 * 
 * Cambios aplicados:
 * 1. Se eliminó la limpieza de rtcp-mux (ahora se permite).
 * 2. Se añadió .trim() a credenciales para evitar el Error 403.
 * 3. Se eliminó código duplicado y funciones redundantes.
 * 4. Habilitación de traceSip para depuración en consola.
 * 5. FIX CRÍTICO: iceGatheringTimeout para evitar error 0.0.0.0 en SDP.
 * 6. Soporte mejorado para entornos LAN/WAN con detección automática.
 * 7. CONFIGURACIÓN DE CODECS: Solo G.711 (A-law y μ-law).
 *    - Prioridad: 1. G.711 A-law (PCMA) - Estándar "de facto" para troncales SIP en Colombia
 *                 2. G.711 μ-law (PCMU) - Compatibilidad internacional
 *    - Los codecs no deseados se eliminan del SDP.
 * 8. DETECCIÓN DE BUZÓN DE VOZ: Detecta automáticamente cuando una llamada es redirigida al buzón de voz.
 *    - Detecta headers SIP: Alert-Info, Call-Info, Diversion, X-Asterisk-*
 *    - Detecta extensiones comunes de buzón (*98, *97, *99, etc.)
 *    - Muestra notificación visual con opción de continuar o colgar
 * 9. SINCRONIZACIÓN DE COLGADO: Implementación rigurosa de eventos BYE y CANCEL.
 *    - Detiene el audio de timbrado inmediatamente cuando se recibe BYE o CANCEL
 *    - Compatible con operadores Wom, Tigo y Movistar en Colombia
 *    - Previene timbrado infinito al colgar remotamente
 * 10. PREVENCIÓN DE LLAMADAS DUPLICADAS: Validación para evitar dos objetos de llamada simultáneamente.
 *     - Rechaza automáticamente llamadas entrantes si ya hay una sesión activa
 *     - Evita conflictos de WebRTC y problemas de audio
 * 
 * IMPORTANTE: Este softphone requiere HTTPS para funcionar correctamente.
 * El navegador solo permite acceso al micrófono en contextos seguros.
 * 
 * NOTA: RTCP-MUX está habilitado en Asterisk/Issabel, por lo que se mantiene en el SDP.
 * NOTA: Solo se utilizan codecs G.711 (PCMA y PCMU). Todos los demás codecs se eliminan del SDP.
 * NOTA: Para máxima compatibilidad con operadores colombianos (Wom, Tigo, Movistar),
 *       asegúrate de que tu servidor Issabel/Asterisk tenga configurado:
 *       disallow=all y allow=alaw (PCMA) en el perfil de la extensión o troncal.
 */

/**
 * Factory personalizada para SessionDescriptionHandler
 * Mantenemos RTCP-MUX ya que está habilitado en Asterisk/Issabel.
 * Los navegadores modernos lo exigen para WebRTC.
 * 
 * NOTA: Esta factory asegura que el mediaStreamFactory se pase correctamente
 * a todas las instancias de SessionDescriptionHandler.
 * 
 * FIX: iceGatheringTimeout obliga al navegador a esperar candidatos antes de enviar el SDP con 0.0.0.0
 */
function normalizeRemoteSdpForBundle(sdp) {
    if (!sdp || typeof sdp !== 'string') return sdp;
    const lines = sdp.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const audioIndex = lines.findIndex((line) => line.startsWith('m=audio '));
    if (audioIndex < 0) return sdp;

    const hasMid = lines.some((line) => /^a=mid:/i.test(line));
    const hasBundle = lines.some((line) => /^a=group:BUNDLE/i.test(line));
    if (hasMid && hasBundle) return sdp;

    const out = [...lines];
    if (!hasBundle) {
        out.splice(audioIndex, 0, 'a=group:BUNDLE 0');
    }
    if (!hasMid) {
        const insertAt = out.findIndex((line) => line.startsWith('m=audio '));
        if (insertAt >= 0) {
            out.splice(insertAt + 1, 0, 'a=mid:0');
        }
    }
    return out.join('\r\n') + '\r\n';
}

function stripBundleFromLocalSdp(sdp) {
    if (!sdp || typeof sdp !== 'string') return sdp;
    return sdp
        .split(/\r?\n/)
        .filter((line) => !line.startsWith('a=group:BUNDLE'))
        .join('\r\n');
}

function createCustomSessionDescriptionHandlerFactory(softphone, peerConnectionConfig) {
    return function customSDHFactory(session, options) {
        const logger = session.userAgent.getLogger('sip.SessionDescriptionHandler', session.id);
        const sdhOptions = Object.assign({}, options || {});

        // SIP.js 0.21.x usa esta firma:
        // new SessionDescriptionHandler(logger, mediaStreamFactory, configuration)
        // Si pasamos el objeto de opciones como segundo argumento, SIP.js intenta
        // ejecutarlo como función y falla con "this.mediaStreamFactory is not a function".
        const mediaStreamFactory = (typeof sdhOptions.mediaStreamFactory === 'function')
            ? sdhOptions.mediaStreamFactory
            : softphone.mediaStreamFactory;

        if (typeof mediaStreamFactory !== 'function') {
            throw new Error('mediaStreamFactory no está disponible para SIP.js');
        }

        const peerConnectionConfiguration =
            sdhOptions.peerConnectionConfiguration ||
            sdhOptions.rtcConfiguration ||
            peerConnectionConfig;

        const sdhConfiguration = {
            iceGatheringTimeout: sdhOptions.iceGatheringTimeout || 3000,
            peerConnectionConfiguration,
        };

        const SessionDescriptionHandler = (SIP.Web && SIP.Web.SessionDescriptionHandler)
            ? SIP.Web.SessionDescriptionHandler
            : SIP.SessionDescriptionHandler;

        const sdh = new SessionDescriptionHandler(logger, mediaStreamFactory, sdhConfiguration);

        const originalSetDescription = sdh.setDescription?.bind(sdh);
        if (originalSetDescription) {
            sdh.setDescription = function (sessionDescription, options, modifiers) {
                if (typeof sessionDescription === 'string') {
                    sessionDescription = normalizeRemoteSdpForBundle(sessionDescription);
                } else if (sessionDescription && typeof sessionDescription.sdp === 'string') {
                    sessionDescription = Object.assign({}, sessionDescription, {
                        sdp: normalizeRemoteSdpForBundle(sessionDescription.sdp),
                    });
                }
                return originalSetDescription(sessionDescription, options, modifiers);
            };
        }

        // FIX CRÍTICO: Interceptar el SDP para configurar codecs y corregir IP pública
        let localCandidateIp = null;
        let candidateListenerAdded = false;

        // Interceptar el método getDescription que genera el SDP
        const originalGetDescription = sdh.getDescription;
        if (originalGetDescription) {
            sdh.getDescription = function (constraints, modifiers) {
                console.log('⚡ [CustomSDH] Interceptando getDescription - ENTRADA');
                return originalGetDescription.call(this, constraints, modifiers).then((description) => {
                    console.log('⚡ [CustomSDH] getDescription completado - Procesando SDP');
                    if (description && description.sdp) {
                        let sdpLines = description.sdp.split('\r\n');
                        let hasPublicIp = false;
                        let foundLocalIp = localCandidateIp;
                        let audioMediaIndex = -1;
                        let codecLines = [];
                        let rtpmapLines = [];
                        let fmtpLines = [];

                        // Buscar la línea m=audio y procesar codecs
                        console.log('🔍 [DEBUG] Iniciando bucle for. sdpLines.length:', sdpLines.length);
                        for (let i = 0; i < sdpLines.length; i++) {
                            // Buscar línea m=audio
                            if (sdpLines[i].startsWith('m=audio ')) {
                                audioMediaIndex = i;
                                const parts = sdpLines[i].split(' ');
                                // Guardar los payload types actuales
                                codecLines = parts.slice(3);
                                console.log('🎵 [Codecs] audioMediaIndex encontrado:', audioMediaIndex);
                                console.log('🎵 [Codecs] Codecs originales:', codecLines);
                            }

                            // Buscar líneas a=rtpmap (definiciones de codecs)
                            if (sdpLines[i].startsWith('a=rtpmap:')) {
                                rtpmapLines.push({ index: i, line: sdpLines[i] });
                            }

                            // Buscar líneas a=fmtp (parámetros de codecs)
                            if (sdpLines[i].startsWith('a=fmtp:')) {
                                fmtpLines.push({ index: i, line: sdpLines[i] });
                            }

                            // Buscar la línea c= y verificar si tiene IP pública
                            if (sdpLines[i].startsWith('c=IN IP4 ')) {
                                const ip = sdpLines[i].substring(9).trim();
                                // Verificar si es IP pública (no privada)
                                const isPublic = !ip.startsWith('192.168.') && !ip.startsWith('10.') &&
                                    !ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) &&
                                    ip !== '127.0.0.1' && ip !== '0.0.0.0';

                                if (isPublic) {
                                    hasPublicIp = true;
                                }
                            }

                            // Buscar candidatos host locales (typ host) si aún no tenemos la IP local
                            if (!foundLocalIp && sdpLines[i].startsWith('a=candidate:') && sdpLines[i].includes(' typ host ')) {
                                const parts = sdpLines[i].split(' ');
                                if (parts.length >= 5) {
                                    const candidateIp = parts[4];
                                    // Verificar si es IP local
                                    if (candidateIp.startsWith('192.168.') || candidateIp.startsWith('10.') ||
                                        candidateIp.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
                                        foundLocalIp = candidateIp;
                                    }
                                }
                            }
                        }

                        // CONFIGURACIÓN DE CODECS: Solo G.711 (A-law y μ-law)
                        // Prioridad:
                        // 1. G.711 A-law (PCMA) - Estándar "de facto" para troncales SIP en Colombia
                        // 2. G.711 μ-law (PCMU) - Compatibilidad internacional
                        if (audioMediaIndex >= 0) {
                            const preferredPayloads = [];
                            const addedPayloads = new Set(); // Prevenir duplicados

                            // Buscar todos los codecs disponibles en las líneas rtpmap
                            rtpmapLines.forEach(rtpmap => {
                                const match = rtpmap.line.match(/^a=rtpmap:(\d+)\s+(.+)$/);
                                if (match) {
                                    const payload = match[1];
                                    const codecName = match[2].toUpperCase();

                                    // PRIORIDAD 1: G.711 A-law (PCMA) - MÁS IMPORTANTE PARA COLOMBIA
                                    if ((payload === '8' || codecName.includes('PCMA') || codecName.includes('G711A')) && !addedPayloads.has('8')) {
                                        preferredPayloads.push({ payload: '8', priority: 1, name: 'PCMA/8000' });
                                        addedPayloads.add('8');
                                    }
                                    // PRIORIDAD 2: G.711 μ-law (PCMU) - Compatibilidad internacional
                                    else if ((payload === '0' || codecName.includes('PCMU') || codecName.includes('G711U')) && !addedPayloads.has('0')) {
                                        preferredPayloads.push({ payload: '0', priority: 2, name: 'PCMU/8000' });
                                        addedPayloads.add('0');
                                    }
                                    // Todos los demás codecs se ignoran (solo G.711 permitido)
                                }
                            });

                            // Si no encontramos codecs preferidos en el SDP, agregar los estándar manualmente
                            // Esto asegura que siempre tengamos al menos G.711
                            const foundPCMA = preferredPayloads.some(c => c.payload === '8');
                            const foundPCMU = preferredPayloads.some(c => c.payload === '0');

                            if (!foundPCMA) {
                                preferredPayloads.push({ payload: '8', priority: 1, name: 'PCMA/8000' });
                            }
                            if (!foundPCMU) {
                                preferredPayloads.push({ payload: '0', priority: 2, name: 'PCMU/8000' });
                            }

                            // Ordenar por prioridad
                            preferredPayloads.sort((a, b) => a.priority - b.priority);
                            const newPayloads = preferredPayloads.map(c => c.payload);

                            console.log('🎵 [Codecs] rtpmapLines encontradas:', rtpmapLines.length);
                            console.log('🎵 [Codecs] preferredPayloads:', preferredPayloads);
                            console.log('🎵 [Codecs] newPayloads (solo G.711):', newPayloads);

                            // Reemplazar la línea m=audio con los codecs preferidos (solo G.711: PCMA y PCMU)
                            const mAudioParts = sdpLines[audioMediaIndex].split(' ');
                            const originalMLine = sdpLines[audioMediaIndex];
                            sdpLines[audioMediaIndex] = mAudioParts.slice(0, 3).concat(newPayloads).join(' ');
                            console.log('🎵 [Codecs] m=audio ORIGINAL:', originalMLine);
                            console.log('🎵 [Codecs] m=audio MODIFICADO:', sdpLines[audioMediaIndex]);

                            // Eliminar líneas a=rtpmap, a=fmtp y a=rtcp-fb de codecs no deseados
                            const allowedPayloads = new Set(newPayloads);
                            for (let i = sdpLines.length - 1; i >= 0; i--) {
                                if (sdpLines[i].startsWith('a=rtpmap:')) {
                                    const match = sdpLines[i].match(/^a=rtpmap:(\d+)/);
                                    if (match && !allowedPayloads.has(match[1])) {
                                        sdpLines.splice(i, 1);
                                    }
                                } else if (sdpLines[i].startsWith('a=fmtp:')) {
                                    const match = sdpLines[i].match(/^a=fmtp:(\d+)/);
                                    if (match && !allowedPayloads.has(match[1])) {
                                        sdpLines.splice(i, 1);
                                    }
                                } else if (sdpLines[i].startsWith('a=rtcp-fb:')) {
                                    const match = sdpLines[i].match(/^a=rtcp-fb:(\d+)/);
                                    if (match && !allowedPayloads.has(match[1])) {
                                        sdpLines.splice(i, 1);
                                    }
                                }
                            }

                            // Corregir IP pública si estamos en LAN
                            if (softphone.config.is_local_network && hasPublicIp && foundLocalIp) {
                                for (let i = 0; i < sdpLines.length; i++) {
                                    if (sdpLines[i].startsWith('c=IN IP4 ')) {
                                        sdpLines[i] = 'c=IN IP4 ' + foundLocalIp;
                                        break;
                                    }
                                }
                            }

                            // Optimizaciones de bandwidth para redes móviles (especialmente 3G)
                            // G.711 usa ~64 kbps, configuramos límite conservador para redes móviles
                            const bandwidthLine = 'b=AS:64'; // 64 kbps (suficiente para G.711)
                            const bandwidthLineExists = sdpLines.some(line => line.startsWith('b=AS:') || line.startsWith('b=TIAS:'));
                            
                            if (!bandwidthLineExists) {
                                // Insertar línea de bandwidth después de la línea m=audio
                                sdpLines.splice(audioMediaIndex + 1, 0, bandwidthLine);
                                if (softphone.config.debug_mode) {
                                    console.log('📡 [Bandwidth] Agregada línea de bandwidth para optimización móvil:', bandwidthLine);
                                }
                            } else {
                                // Reemplazar línea de bandwidth existente
                                for (let i = 0; i < sdpLines.length; i++) {
                                    if (sdpLines[i].startsWith('b=AS:') || sdpLines[i].startsWith('b=TIAS:')) {
                                        sdpLines[i] = bandwidthLine;
                                        if (softphone.config.debug_mode) {
                                            console.log('📡 [Bandwidth] Actualizada línea de bandwidth:', bandwidthLine);
                                        }
                                        break;
                                    }
                                }
                            }

                            // Reconstruir el SDP (sin BUNDLE en oferta local: evita conflicto 183->200 en buzón móvil)
                            description.sdp = stripBundleFromLocalSdp(sdpLines.join('\r\n'));

                            // LOG PÚBLICO: Mostrar siempre los codecs activos en la consola
                            const codecsList = preferredPayloads.map(c => c.name).join(' | ');
                            console.log('%c📞 [CODECS ACTIVOS] ' + codecsList, 'background: #28a745; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                            console.log('%c   Payloads: ' + newPayloads.join(', '), 'background: #17a2b8; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                            console.log('%c   Prioridad: ' + preferredPayloads.map(c => `${c.name} (${c.priority})`).join(' → '), 'background: #6c757d; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                            console.log('%c📡 [BANDWIDTH] Optimizado para redes móviles: 64 kbps (G.711)', 'background: #6f42c1; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                        }
                    }

                    return description;
                });
            };
        }

        // Escuchar candidatos ICE para detectar IP local
        if (sdh.peerConnection && !candidateListenerAdded) {
            candidateListenerAdded = true;
            sdh.peerConnection.addEventListener('icecandidate', (event) => {
                if (event.candidate && event.candidate.candidate) {
                    const candidate = event.candidate.candidate;
                    if (candidate.includes('typ host')) {
                        const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                        if (ipMatch) {
                            const ip = ipMatch[1];
                            if (ip.startsWith('192.168.') || ip.startsWith('10.') ||
                                ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
                                if (!localCandidateIp) {
                                    localCandidateIp = ip;
                                    if (softphone.config.debug_mode) {
                                        console.log('✅ [WebRTC] Candidato ICE local detectado:', ip);
                                    }
                                }
                            }
                        }
                    }
                }
            }, { once: false });
        }

        return sdh;
    };
}

class WebRTCSoftphone {
    constructor(config) {
        this.config = config;
        this._validateConfig();

        this.userAgent = null;
        this.registerer = null;
        this.currentCall = null;
        this.incomingCall = null;
        this.incomingCallInvitation = null; // Alias para compatibilidad con APEX5.1
        this.acceptInProgress = false;
        this.voicemailDetected = false;
        this.hasRung = false;
        this.ringingDetected = false;
        this.received183WithSdp = false;

        this.status = 'disconnected';
        this.currentNumber = '';

        this.incomingCallAudio = null;
        this.ringbackAudio = null;
        this.hangupAudio = null;
        this.dtmfSounds = {};
        this.remoteAudioElement = null;
        /** Ruta base para assets/audio (funciona desde cualquier vista del proyecto) */
        this.audioBaseUrl = this._getAudioBaseUrl();
        /** Flag para reproducir 2up2 solo una vez por llamada al conectar */
        this._playedConnectedSound = false;
        this._incomingFallbackUsed = false;
        this.blipClickAudio = null;
        this.blip1Audio = null;
        this.voicemailAlertAudio = null;
        this.connectedSoundAudio = null;
        this.lastMediaStream = null;
        this.timer = null;
        this.callStart = null;
        this.incomingCallTimeout = null; // Timer para timeout de llamadas entrantes
        this.outgoingCallTimeout = null; // Timer para timeout de llamadas salientes

        // Estado del micrófono
        this.noAudioDevice = false;        // No hay dispositivo de audio físico
        this.micPermissionDenied = false;  // Usuario denegó el permiso
        this.micPermissionGranted = false; // Usuario otorgó el permiso
        this.audioDevices = [];            // Lista de dispositivos de audio

        this.mediaStreamFactory = this._mediaStreamFactory.bind(this);

        if (typeof SIP === 'undefined' || !SIP.UserAgent) {
            throw new Error('SIP.js no está cargado');
        }

        // Validar contexto seguro (HTTPS)
        this._validateSecureContext();

        this._initUI();

        // Exponer la instancia globalmente para que esté disponible desde onclick
        window.webrtcSoftphone = this;

        // CRÍTICO: Solicitar micrófono ANTES de conectar al PBX (igual que APEX4.2 funcional)
        // Esto asegura que el permiso esté concedido cuando SIP.js intente adquirir el stream
        this._requestMicrophonePermissionBeforeConnect().then(() => {
            this._connect();
        }).catch((err) => {
            console.warn('⚠️ [Softphone] Error al solicitar permiso de micrófono antes de conectar:', err);
            // Continuar con la conexión aunque falle el permiso (el stream silencioso funcionará)
            this._connect();
        });
    }

    /* -------------------------------------------------------------
     * Validación de contexto seguro (HTTPS)
     * ------------------------------------------------------------- */
    _validateSecureContext() {
        const isSecure = window.isSecureContext ||
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        if (!isSecure) {
            console.error('❌ [Softphone] ADVERTENCIA: El sitio no está en HTTPS.');
            console.error('   WebRTC requiere HTTPS para acceder al micrófono.');
            console.error('   URL actual:', window.location.href);

            // Mostrar advertencia visual
            this._showSecurityWarning();
        } else {
            if (this.config.debug_mode) {
                console.log('✅ [Softphone] Contexto seguro verificado:', window.location.protocol);
            }
        }

        return isSecure;
    }

    _showSecurityWarning() {
        const warning = document.createElement('div');
        warning.id = 'softphone-security-warning';
        warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc3545;color:white;padding:10px;text-align:center;z-index:99999;font-weight:bold;';
        warning.innerHTML = '⚠️ Softphone: Se requiere HTTPS para usar el micrófono. <a href="#" onclick="this.parentElement.remove();return false;" style="color:white;margin-left:20px;">✕ Cerrar</a>';
        document.body.insertBefore(warning, document.body.firstChild);
    }

    /* -------------------------------------------------------------
     * Solicitar permiso de micrófono ANTES de conectar al PBX
     * Esto asegura que el permiso esté concedido cuando SIP.js lo necesite
     * (igual que APEX4.2 funcional - solicita antes de conectar)
     * ------------------------------------------------------------- */
    async _requestMicrophonePermissionBeforeConnect() {
        if (this.config.debug_mode) {
            console.log('🎤 [Softphone] Solicitando permiso de micrófono ANTES de conectar al PBX...');
        }

        // Verificar si getUserMedia está disponible
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ [Softphone] getUserMedia no disponible');
            return;
        }

        // Verificar si ya tenemos permiso usando Permissions API
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                if (this.config.debug_mode) {
                    console.log('🎤 [Softphone] Estado del permiso de micrófono:', result.state);
                }

                if (result.state === 'granted') {
                    this.micPermissionGranted = true;
                    this._updateMicStatus('granted');
                    if (this.config.debug_mode) {
                        console.log('✅ [Softphone] Permiso de micrófono ya concedido');
                    }
                    return;
                } else if (result.state === 'denied') {
                    this.micPermissionDenied = true;
                    this._updateMicStatus('denied');
                    if (this.config.debug_mode) {
                        console.warn('⚠️ [Softphone] Permiso de micrófono denegado previamente');
                    }
                    return;
                }
            }
        } catch (e) {
            // Permissions API puede no estar disponible, continuar
            if (this.config.debug_mode) {
                console.log('ℹ️ [Softphone] Permissions API no disponible, solicitando directamente');
            }
        }

        // Solicitar permiso usando getUserMedia (igual que APEX4.2 funcional)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Permiso concedido - detener el stream inmediatamente (solo queríamos el permiso)
            stream.getTracks().forEach(t => t.stop());

            this.micPermissionGranted = true;
            this.micPermissionDenied = false;
            this.noAudioDevice = false;
            this._updateMicStatus('granted');

            if (this.config.debug_mode) {
                console.log('✅ [Softphone] Permiso de micrófono concedido - Listo para conectar al PBX');
            }

        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                console.warn('⚠️ [Softphone] Permiso de micrófono DENEGADO por el usuario');
                this.micPermissionDenied = true;
                this._updateMicStatus('denied');
            } else if (err.name === 'NotFoundError') {
                console.warn('⚠️ [Softphone] No se encontró micrófono disponible');
                this.noAudioDevice = true;
                this._updateMicStatus('no-device');
            } else {
                console.error('❌ [Softphone] Error al solicitar permiso:', err);
            }
            // No lanzar el error - continuar con la conexión (el stream silencioso funcionará)
        }
    }

    /* -------------------------------------------------------------
     * Inicialización de dispositivos de audio (mantenido para compatibilidad)
     * ------------------------------------------------------------- */
    async _initializeAudioDevices() {
        try {
            // 1. Detectar dispositivos de audio disponibles
            await this._detectAudioDevices();

            // 2. Si hay dispositivos, solicitar permisos proactivamente
            if (this.audioDevices.length > 0 && !this.noAudioDevice) {
                await this._requestMicrophonePermission();
            }
        } catch (err) {
            console.warn('⚠️ [Softphone] Error inicializando audio:', err);
        }
    }

    async _detectAudioDevices() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn('⚠️ [Softphone] enumerateDevices no disponible');
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            this.audioDevices = devices.filter(d => d.kind === 'audioinput');

            if (this.config.debug_mode) {
                console.log('🎤 [Softphone] Dispositivos de audio detectados:', this.audioDevices.length);
                this.audioDevices.forEach((d, i) => {
                    console.log(`   ${i + 1}. ${d.label || 'Sin nombre'} (${d.deviceId.substring(0, 8)}...)`);
                });
            }

            if (this.audioDevices.length === 0) {
                console.warn('⚠️ [Softphone] No se detectaron micrófonos.');
                this.noAudioDevice = true;
                this._updateMicStatus('no-device');
            } else {
                this.noAudioDevice = false;
                this._updateMicStatus('pending');
            }

        } catch (err) {
            console.error('❌ [Softphone] Error detectando dispositivos:', err);
        }
    }

    async _requestMicrophonePermission() {
        // No solicitar si ya sabemos que no hay dispositivo o el permiso fue denegado
        if (this.noAudioDevice || this.micPermissionDenied) {
            return false;
        }

        // Verificar si ya tenemos un permiso previo usando Permissions API
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                if (this.config.debug_mode) {
                    console.log('🎤 [Softphone] Estado del permiso de micrófono:', result.state);
                }

                if (result.state === 'granted') {
                    this.micPermissionGranted = true;
                    this._updateMicStatus('granted');
                    return true;
                } else if (result.state === 'denied') {
                    this.micPermissionDenied = true;
                    this._updateMicStatus('denied');
                    return false;
                }
                // Si es 'prompt', continuamos para solicitar el permiso
            }
        } catch (e) {
            // Permissions API puede no estar disponible
            if (this.config.debug_mode) {
                console.log('ℹ️ [Softphone] Permissions API no disponible, solicitando directamente');
            }
        }

        // Solicitar permiso usando getUserMedia
        try {
            if (this.config.debug_mode) {
                console.log('🎤 [Softphone] Solicitando permiso de micrófono...');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // Permiso concedido - detener el stream inmediatamente (solo queríamos el permiso)
            stream.getTracks().forEach(t => t.stop());

            this.micPermissionGranted = true;
            this.micPermissionDenied = false;
            this.noAudioDevice = false;
            this._updateMicStatus('granted');

            if (this.config.debug_mode) {
                console.log('✅ [Softphone] Permiso de micrófono concedido');
            }

            // Re-detectar dispositivos (ahora tendrán etiquetas)
            await this._detectAudioDevices();

            return true;

        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                console.warn('⚠️ [Softphone] Permiso de micrófono DENEGADO por el usuario');
                this.micPermissionDenied = true;
                this._updateMicStatus('denied');
            } else if (err.name === 'NotFoundError') {
                console.warn('⚠️ [Softphone] No se encontró micrófono disponible');
                this.noAudioDevice = true;
                this._updateMicStatus('no-device');
            } else {
                console.error('❌ [Softphone] Error al solicitar permiso:', err);
                this._updateMicStatus('error');
            }
            return false;
        }
    }

    _updateMicStatus(status) {
        const indicator = document.getElementById('mic-status-indicator');
        if (!indicator) return;

        const statusMap = {
            'pending': { icon: 'fa-microphone-slash', color: '#ffc107', title: 'Micrófono: pendiente de permiso' },
            'granted': { icon: 'fa-microphone', color: '#28a745', title: 'Micrófono: listo' },
            'denied': { icon: 'fa-microphone-slash', color: '#dc3545', title: 'Micrófono: permiso denegado' },
            'no-device': { icon: 'fa-microphone-slash', color: '#6c757d', title: 'Micrófono: no detectado' },
            'error': { icon: 'fa-exclamation-triangle', color: '#dc3545', title: 'Micrófono: error' }
        };

        const s = statusMap[status] || statusMap['error'];
        indicator.innerHTML = `<i class="fas ${s.icon}" style="color:${s.color}"></i>`;
        indicator.title = s.title;
        indicator.style.cursor = status === 'denied' ? 'pointer' : 'default';

        // Si fue denegado, permitir hacer clic para reintentar
        if (status === 'denied') {
            indicator.onclick = () => this._retryMicrophonePermission();
        } else {
            indicator.onclick = null;
        }
    }

    async _retryMicrophonePermission() {
        // Resetear banderas
        this.micPermissionDenied = false;
        this.noAudioDevice = false;

        // Intentar de nuevo
        const granted = await this._requestMicrophonePermission();

        if (!granted) {
            this._showError('Por favor, permite el acceso al micrófono en la configuración del navegador.');
        }
    }

    /* -------------------------------------------------------------
     * Config & UI
     * ------------------------------------------------------------- */
    _validateConfig() {
        const required = ['extension', 'password', 'wss_server', 'sip_domain'];
        const missing = required.filter((k) => !this.config[k] || String(this.config[k]).trim() === '');
        if (missing.length) throw new Error('Config incompleta: ' + missing.join(', '));
    }

    _initUI() {
        const c = document.getElementById('webrtc-softphone');
        if (!c) return;
        c.innerHTML = `
            <div class="softphone-header">
                <h3>
                    <i class="fas fa-phone"></i> Softphone WebRTC
                    <span id="mic-status-indicator" style="margin-left:10px;font-size:14px;" title="Estado del micrófono">
                        <i class="fas fa-microphone-slash" style="color:#ffc107"></i>
                    </span>
                </h3>
                </div>
            <div class="softphone-body">
                <div class="softphone-status">
                    <span class="status-dot disconnected" id="status-dot"></span>
                    <span id="status-text">Desconectado</span>
                </div>
                <div class="number-input-container">
                    <input type="text" class="number-display" id="number-display" placeholder="Ingrese número" autocomplete="off" inputmode="tel">
                </div>
                <div class="dialpad" id="dialpad">
                    ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(n => `<button class="dialpad-btn" data-number="${n}">${n}</button>`).join('')}
                </div>
                <div class="action-buttons">
                    <button class="action-btn delete-btn" id="btn-delete">Borrar</button>
                    <button class="action-btn call-btn" id="btn-call">Llamar</button>
                    <button class="action-btn hangup-btn" id="btn-hangup" style="display:none;">Colgar</button>
                    <button class="action-btn transfer-btn" id="btn-transfer" style="display:none;">Transferir</button>
                </div>
                <div class="call-info" id="call-info" style="display:none;">
                    <div id="call-info-number"></div>
                    <div id="call-info-duration">00:00</div>
                    <div id="call-info-status">Llamando...</div>
                </div>
                
                <!-- Modal para transferencia -->
                <div class="softphone-modal" id="transfer-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4><i class="fas fa-exchange-alt"></i> Transferir Llamada</h4>
                            <button class="modal-close" onclick="window.webrtcSoftphone?.hideTransferDialog()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Ingrese la extensión a la que desea transferir la llamada:</p>
                            <input type="text" id="transfer-extension" class="modal-input" placeholder="Ej: 1003" maxlength="10">
                            <div class="modal-actions">
                                <button class="modal-btn modal-btn-primary" onclick="window.webrtcSoftphone?.transferCall()">
                                    <i class="fas fa-exchange-alt"></i> Transferir
                                </button>
                                <button class="modal-btn modal-btn-secondary" onclick="window.webrtcSoftphone?.hideTransferDialog()">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const dialpad = c.querySelector('#dialpad');
        dialpad?.addEventListener('click', (e) => {
            const btn = e.target.closest('.dialpad-btn');
            if (btn) this._addDigit(btn.dataset.number);
        });
        c.querySelector('#btn-delete')?.addEventListener('click', () => this._deleteLastDigit());
        c.querySelector('#btn-call')?.addEventListener('click', () => this.makeCall());
        c.querySelector('#btn-hangup')?.addEventListener('click', () => this.hangup());
        c.querySelector('#btn-transfer')?.addEventListener('click', () => this.showTransferDialog());

        // Permitir Enter para confirmar transferencia
        const transferInput = document.getElementById('transfer-extension');
        if (transferInput) {
            transferInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.transferCall();
                }
            });
        }

        // Configurar eventos de teclado para marcar con el teclado físico
        this._setupKeyboardEvents();

        // Configurar eventos del input de número para permitir pegar y escribir
        this._setupNumberInputEvents();
    }

    /* -------------------------------------------------------------
     * Conexión y registro
     * ------------------------------------------------------------- */
    _connect() {
        const iceServers = this._getIceServers();

        // LIMPIEZA CRÍTICA: Elimina espacios que causan el Error 403
        const extensionStr = String(this.config.extension).trim();
        const passwordStr = String(this.config.password).trim();
        const domainStr = String(this.config.sip_domain).trim();

        // DEBUG: Verificar valores antes de usarlos
        if (this.config.debug_mode) {
            console.log(`📝 [WebRTC] Intentando registro: ${extensionStr} @ ${domainStr}`);
            console.log(`📝 [WebRTC] Estrategia ICE: ${iceServers.length > 0 ? 'WAN (STUN activo)' : 'LAN (Solo Local)'}`);
            console.log('🔍 [SOFTPHONE _connect] Verificando credenciales:');
            console.log('  - extensionStr:', extensionStr);
            console.log('  - passwordStr longitud:', passwordStr.length);
            console.log('  - domainStr:', domainStr);
        }

        const uriString = `sip:${extensionStr}@${domainStr}`;
        let userURI = SIP.UserAgent.makeURI(uriString);
        userURI = this._patchUriClone(userURI);

        // Configuración RTC para el PeerConnection
        // RTCP-MUX está habilitado en Asterisk/Issabel, así que lo mantenemos
        // FIX: En LAN, forzar 'relay' si no hay STUN para evitar candidatos srflx (IP pública)
        // Optimizado para redes móviles (3G/4G/5G)
        const rtcConfig = {
            iceServers: iceServers,
            // CRÍTICO: En LAN sin STUN, usar 'relay' evita que el navegador genere candidatos srflx
            // Si hay STUN (WAN), usar 'all' para permitir todos los tipos
            iceTransportPolicy: (iceServers.length === 0) ? 'relay' : 'all',
            bundlePolicy: 'balanced',
            rtcpMuxPolicy: 'negotiate', // Negociar RTCP-MUX (más flexible que 'require')
            
            // Optimizaciones para redes móviles
            iceCandidatePoolSize: 0,
            iceConnectionReceivingTimeout: 30000,
            iceBackupCandidatePairPingInterval: 25000
        };

        // Usar nuestro SessionDescriptionHandlerFactory personalizado
        const customSDHFactory = createCustomSessionDescriptionHandlerFactory(this, rtcConfig);

        // LOG: Mostrar URL de conexión WebSocket
        console.log('%c🔌 [WebSocket] Conectando a: ' + this.config.wss_server, 'background: #007bff; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
        
        this.userAgent = new SIP.UserAgent({
            uri: userURI,
            authorizationUsername: extensionStr,
            authorizationPassword: passwordStr,
            hackIpInContact: true, // CRÍTICO: Reemplazar dominio .invalid por IP local (CORREGIDO: Nivel raíz)
            hackWssInTransport: true, // CRÍTICO: Asegurar transporte WSS correcto en Contact
            transportOptions: {
                server: this.config.wss_server,
                keepAliveInterval: 30,
                traceSip: this.config.debug_mode, // Habilitar traza SIP para debugging
                // CRÍTICO: Para puerto 8089 (WSS), asegurar que se use conexión segura
                connectionTimeout: 10000, // Timeout de 10 segundos para conexión
            },
            sessionDescriptionHandlerFactory: customSDHFactory,
            sessionDescriptionHandlerFactoryOptions: {
                // SIP.js 0.21.x recibe estas opciones en nuestra factory personalizada.
                mediaStreamFactory: this.mediaStreamFactory,
                iceServers,
                iceGatheringTimeout: 3000,
                peerConnectionConfiguration: {
                    iceServers: iceServers,
                    iceTransportPolicy: (iceServers.length === 0) ? 'relay' : 'all',
                    bundlePolicy: 'balanced',
                    rtcpMuxPolicy: 'negotiate'
                }
            },
            delegate: {
                onInvite: (invitation) => {
                    // CRÍTICO: Usar arrow function para mantener el binding de 'this'
                    console.log('🔔 [WebRTC Softphone] ===== INVITACIÓN RECIBIDA (onInvite delegate) =====');
                    console.log('   📞 Invitation recibida:', invitation);
                    console.log('   📞 Invitation type:', typeof invitation);
                    console.log('   📞 Invitation state:', invitation?.state);
                    console.log('   📞 this.handleIncomingCall disponible:', typeof this.handleIncomingCall === 'function');

                    if (this.config.debug_mode) {
                        console.log('   📞 Invitation object completo:', invitation);
                        if (invitation.request) {
                            console.log('   📞 Request From:', invitation.request.from);
                            console.log('   📞 Request To:', invitation.request.to);
                        }
                    }

                    if (typeof this.handleIncomingCall === 'function') {
                        console.log('   ✅ Llamando a handleIncomingCall...');
                        try {
                            this.handleIncomingCall(invitation);
                        } catch (error) {
                            console.error('❌ [WebRTC Softphone] Error al ejecutar handleIncomingCall:', error);
                        }
                    } else {
                        console.error('❌ [WebRTC Softphone] handleIncomingCall NO está definido en delegate');
                        console.error('   📞 Tipo de this:', typeof this);
                        console.error('   📞 this es:', this);
                    }
                }
            }
        });

        // REMOVED: Redundant onInvite assignment. The delegate in the constructor handles this.
        // If specific PJSIP handling is needed, ensure it is done within the delegate or a unified handler.

        this._setupTransportEvents();

        this._updateStatus('connecting', 'Conectando...');
        this.userAgent.start()
            .then(() => {
                const registrarURI = this._patchUriClone(SIP.UserAgent.makeURI(`sip:${domainStr}`));

                // Mejorar manejo de errores de registro, especialmente 403
                this.registerer = new SIP.Registerer(this.userAgent, {
                    registrar: registrarURI,
                    expires: 600,
                    requestDelegate: {
                        onReject: (response) => {
                            const code = response.message.statusCode;
                            const reason = response.message.reasonPhrase || 'Sin razón especificada';

                            console.error(`❌ [WebRTC Softphone] Registro RECHAZADO. Código: ${code} - ${reason}`);

                            if (code === 403) {
                                console.warn('⚠️ REVISIÓN REQUERIDA:');
                                console.warn('   1. Clave incorrecta: Verifica que la contraseña en PHP sea idéntica al "secret" en el PBX');
                                console.warn('   2. IP bloqueada: Verifica que el campo "permit" de la extensión esté VACÍO');
                                console.warn('   3. Transporte WSS: Verifica que la extensión tenga "Transport: wss" activado');
                                console.warn('   4. Realm: Verifica que el "Realm" en pjsip.conf coincida con ASTERISK_SIP_DOMAIN');
                                this._updateStatus('disconnected', 'Error 403: Verificar credenciales');
                            }
                        }
                    }
                });

                this.registerer.stateChange.addListener((st) => {
                    console.log('🔄 [WebRTC] Estado SIP:', st);
                    if (st === SIP.RegistererState.Registered) {
                        this._updateStatus('connected', 'En línea');
                        console.log('🎉 [WebRTC] ¡Softphone registrado con éxito!');

                        // DIAGNÓSTICO: Verificar configuración después del registro
                        if (this.config.debug_mode) {
                            console.log('🔍 [WebRTC Softphone] Verificando configuración después del registro:');
                            console.log('   📞 Extensión registrada:', this.config.extension);
                            console.log('   📞 userAgent.delegate:', this.userAgent.delegate);
                            console.log('   📞 userAgent.onInvite:', typeof this.userAgent.onInvite);
                            console.log('   📞 handleIncomingCall disponible:', typeof this.handleIncomingCall === 'function');
                            console.log('   📞 Registerer state:', this.registerer.state);
                            console.log('   📞 UserAgent state:', this.userAgent.state);

                            // Exponer para diagnóstico
                            window.sipUserAgent = this.userAgent;
                            window.sipRegisterer = this.registerer;
                            console.log('🔧 [WebRTC Softphone] UserAgent expuesto como window.sipUserAgent');
                            console.log('🔧 [WebRTC Softphone] Registerer expuesto como window.sipRegisterer');
                        }
                    } else if (st === SIP.RegistererState.Unregistered) {
                        this._updateStatus('disconnected', 'Sin registro');
                    }
                });

                return this.registerer.register();
            })
            .catch((err) => {
                console.error('❌ Conexión/Registro falló:', err);
                this._updateStatus('disconnected', 'Error de conexión');
            });
    }

    _setupTransportEvents() {
        if (!this.userAgent?.transport) return;
        this.userAgent.transport.stateChange.addListener((st) => {
            if (st === 'Connected') {
                console.log('%c✅ [WebSocket] CONECTADO EXITOSAMENTE a ' + this.config.wss_server, 'background: #28a745; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                if (this.config.debug_mode) {
                    console.log('✅ [WebRTC] WebSocket Conectado');
                }
                this._updateStatus('connected', 'En línea');

                // DIAGNÓSTICO: Verificar que el delegate esté configurado después de la conexión
                if (this.config.debug_mode) {
                    console.log('🔍 [WebRTC Softphone] Verificando configuración de delegate después de conexión:');
                    console.log('   📞 userAgent.delegate:', this.userAgent.delegate);
                    console.log('   📞 userAgent.onInvite:', typeof this.userAgent.onInvite);
                    console.log('   📞 handleIncomingCall disponible:', typeof this.handleIncomingCall === 'function');
                }

                // DIAGNÓSTICO: Agregar listener para WebSocket raw para detectar INVITEs entrantes
                // Esto debe hacerse DESPUÉS de que el WebSocket esté conectado
                if (this.config.debug_mode && this.userAgent.transport && this.userAgent.transport.ws) {
                    const originalOnMessage = this.userAgent.transport.ws.onmessage;
                    this.userAgent.transport.ws.onmessage = (event) => {
                        if (event.data && typeof event.data === 'string') {
                            // CRÍTICO: Verificar si es un INVITE entrante REAL (comienza con "INVITE", no "SIP/2.0")
                            // Las respuestas como "100 Trying" o "503 Service Unavailable" comienzan con "SIP/2.0"
                            // y contienen "INVITE" en el CSeq, pero NO son INVITEs entrantes
                            if (event.data.trim().startsWith('INVITE')) {
                                console.log('🔔 [WebRTC Softphone] ===== INVITE ENTRANTE EN WEBSOCKET RAW =====');
                                console.log('   ⚠️ ESTE ES UN INVITE ENTRANTE REAL');
                                console.log('   📝 Datos recibidos:', event.data.substring(0, 1000) + (event.data.length > 1000 ? '...' : ''));

                                // Extraer información del INVITE
                                const fromMatch = event.data.match(/From:\s*[^<]*<sip:(\d+)@/);
                                const toMatch = event.data.match(/To:\s*[^<]*<sip:(\d+)@/);
                                const callIdMatch = event.data.match(/Call-ID:\s*([^\r\n]+)/);
                                if (fromMatch) console.log('   📞 Desde (llamante):', fromMatch[1]);
                                if (toMatch) console.log('   📞 Hacia (destino):', toMatch[1]);
                                if (callIdMatch) console.log('   📞 Call-ID:', callIdMatch[1]);

                                // Verificar si el INVITE es para nuestra extensión (comparar solo los primeros 4 dígitos si es necesario)
                                const extensionMatch = toMatch ? toMatch[1] : null;
                                const ourExtension = String(this.config.extension).trim();

                                if (extensionMatch && extensionMatch === ourExtension) {
                                    console.log('   ✅ INVITE ES PARA NUESTRA EXTENSIÓN:', ourExtension);
                                    console.log('   ⚠️ Si no ves el delegate onInvite ejecutándose, hay un problema');
                                } else {
                                    console.log('   ⚠️ INVITE NO ES PARA NUESTRA EXTENSIÓN');
                                    console.log('   📞 Extensión destino en INVITE:', extensionMatch);
                                    console.log('   📞 Nuestra extensión:', ourExtension);
                                }
                            }
                        }

                        // Llamar al handler original
                        if (originalOnMessage) {
                            originalOnMessage.call(this.userAgent.transport.ws, event);
                        }
                    };
                    console.log('✅ [WebRTC Softphone] Listener de WebSocket raw configurado para diagnóstico');
                }
            }
            if (st === 'Disconnected') {
                console.error('%c❌ [WebSocket] DESCONECTADO - Verifica la configuración del servidor', 'background: #dc3545; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                console.error('   URL intentada: ' + this.config.wss_server);
                console.error('   Verifica:');
                console.error('   1. El puerto 8089 está abierto en el servidor');
                console.error('   2. El certificado SSL es válido (para wss://)');
                console.error('   3. La ruta /ws está configurada en http.conf');
                console.error('   4. No hay firewall bloqueando el puerto 8089');
                if (this.config.debug_mode) {
                    console.warn('❌ [WebRTC] WebSocket Desconectado');
                }
                this._updateStatus('disconnected', 'Desconectado');
            }
        });
    }

    /* -------------------------------------------------------------
     * Llamada saliente
     * ------------------------------------------------------------- */
    async makeCall() {
        if (!this.currentNumber.trim()) {
            this._showError('Ingrese un número');
            return;
        }
        if (!this.userAgent || !this.registerer) {
            this._showError('No está conectado');
            return;
        }
        const regState = this.registerer.state;
        if (regState !== SIP.RegistererState.Registered && regState !== 'Registered') {
            this._showError('No está registrado');
            return;
        }
        if (this.currentCall) {
            this._showError('Ya hay una llamada en curso');
            return;
        }

        // Reset flag de buzón de voz al iniciar nueva llamada
        this.voicemailDetected = false;
        this.hasRung = false;
        this.ringingDetected = false;
        this.received183WithSdp = false;
        this._hideVoicemailNotification();

        // LIMPIEZA: Asegurar que el número y dominio no tengan espacios
        const number = this.currentNumber.trim();
        const domainStr = String(this.config.sip_domain).trim();
        const targetUri = this._patchUriClone(SIP.UserAgent.makeURI(`sip:${number}@${domainStr}`));

        // Configuración RTC
        // RTCP-MUX está habilitado en Asterisk/Issabel
        const iceServers = this._getIceServers();
        // FIX: En LAN sin STUN, usar 'relay' evita que el navegador genere candidatos srflx (IP pública)
        const rtcConfig = {
            iceServers: iceServers,
            // CRÍTICO: En LAN sin STUN, usar 'relay' evita que el navegador genere candidatos srflx
            // Si hay STUN (WAN), usar 'all' para permitir todos los tipos
            iceTransportPolicy: (iceServers.length === 0) ? 'relay' : 'all',
            bundlePolicy: 'balanced',
            rtcpMuxPolicy: 'negotiate' // Negociar RTCP-MUX (más flexible que 'require')
        };

        // CRÍTICO: Delegados para eventos BYE y CANCEL (sincronización de colgado)
        // IMPORTANTE: Debe estar DENTRO del constructor del Inviter para capturar eventos desde el inicio
        // En redes de Wom, Tigo o Movistar, si el usuario cuelga desde su celular,
        // el operador envía CANCEL (si no ha contestado) o BYE (si ya estaba hablando)
        const inviter = new SIP.Inviter(this.userAgent, targetUri, {
            // Evita conflicto SDP BUNDLE cuando el operador envía 183 y luego 200 (buzón móvil)
            earlyMedia: false,
            sessionDescriptionHandlerOptions: {
                // CRÍTICO: Constraints optimizados para redes móviles (3G/4G/5G)
                constraints: {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 8000,
                        channelCount: 1,
                        latency: 0.01,
                        sampleSize: 16
                    },
                    video: false
                },
                iceServers: this._getIceServers(),
                // FIX: Timeout aumentado para llamadas salientes (Evita el 0.0.0.0 y IP pública en LAN)
                // 3000ms da tiempo suficiente para que los candidatos locales se recojan primero
                iceGatheringTimeout: 3000,
                peerConnectionConfiguration: (() => {
                    const iceServersCall = this._getIceServers();
                    return {
                        iceServers: iceServersCall,
                        iceTransportPolicy: (iceServersCall.length === 0) ? 'relay' : 'all',
                        bundlePolicy: 'balanced',
                        rtcpMuxPolicy: 'negotiate', // Negociar RTCP-MUX (más flexible que 'require')
                        
                        // Optimizaciones para redes móviles
                        iceCandidatePoolSize: 0,    // No pre-generar candidatos (ahorra recursos en móviles)
                        iceConnectionReceivingTimeout: 30000, // 30s timeout para conexión ICE (mejor para 3G)
                        iceBackupCandidatePairPingInterval: 25000 // Intervalo de ping para candidatos de respaldo
                    };
                })(),
                // CRÍTICO: Pasar mediaStreamFactory como función async (igual que APEX4.2 funcional)
                // Este es el ÚNICO método que debe usarse para adquirir el stream
                mediaStreamFactory: async () => {
                    if (this.config.debug_mode) {
                        console.log('🎤 [Softphone] mediaStreamFactory llamada para hacer llamada');
                    }
                    return await this._mediaStreamFactory();
                }
            },
            requestDelegate: {
                onAccept: (response) => {
                    this._trackCallProgress(response);
                    this._detectVoicemail(response);

                    this._updateStatus('in-call', 'En llamada');
                    this._showCallInfo(number);
                    this._startCallTimer();
                    this._stopRingback();
                    this._playConnectedSound();
                },
                onProgress: (response) => {
                    this._trackCallProgress(response);
                    this._detectVoicemail(response);
                },
                onReject: (response) => {
                    // Limpiar timeout de llamada saliente (llamada rechazada)
                    if (this.outgoingCallTimeout) {
                        clearTimeout(this.outgoingCallTimeout);
                        this.outgoingCallTimeout = null;
                    }

                    let msg = 'Llamada rechazada';
                    if (response) {
                        const code = response.statusCode || 0;
                        const reason = response.reasonPhrase || 'Desconocido';
                        msg += ` (${code}: ${reason})`;

                        // Intentar extraer causa específica de Asterisk
                        if (response.hasHeader && response.hasHeader('X-Asterisk-HangupCause')) {
                            const cause = response.getHeader('X-Asterisk-HangupCause');
                            msg += ` - ${cause}`;
                        } else if (response.message && response.message.headers && response.message.headers['X-Asterisk-HangupCause']) {
                            // Fallback para estructuras alternativas de SIP.js
                            const cause = response.message.headers['X-Asterisk-HangupCause'][0].raw;
                            msg += ` - ${cause}`;
                        }
                    }
                    console.warn(`❌ [Softphone] ${msg}`);
                    this._showError(msg);
                    this.endCall();
                }
            },
            // CRÍTICO: Delegate DENTRO del constructor para capturar BYE/CANCEL desde el inicio
            delegate: {
                onBye: () => {
                    if (this.config.debug_mode) {
                        console.log('📞 [Softphone] Evento BYE recibido - Colgado remoto detectado');
                    }
                    // Verificar que la sesión aún esté activa antes de procesar
                    if (this.currentCall && this.currentCall === inviter) {
                        this.endCall();
                    }
                },
                onCancel: () => {
                    if (this.config.debug_mode) {
                        console.log('📞 [Softphone] Evento CANCEL recibido - Llamada cancelada remotamente');
                    }
                    // Verificar que la sesión aún esté activa antes de procesar
                    if (this.currentCall && this.currentCall === inviter) {
                        this.endCall();
                    }
                },
                onProgress: (response) => {
                    this._trackCallProgress(response);
                    this._detectVoicemail(response);
                }
            }
        });

        this.currentCall = inviter;
        this._updateStatus('in-call', 'Llamando...');
        this._showCallInfo(number);

        // CRÍTICO: Agregar stateChange listener ANTES de invite() para capturar todos los cambios de estado
        // Esto es el método principal para detectar cuando la sesión termina (colgado remoto)
        inviter.stateChange.addListener((st) => {
            const s = String(st);
            if (this.config.debug_mode) {
                console.log(`📞 [Softphone] Cambio de estado en llamada saliente: ${s} (${st})`);
            }

            if (s === 'Established' || s === '4') {
                // Limpiar timeout de llamada saliente (llamada establecida)
                if (this.outgoingCallTimeout) {
                    clearTimeout(this.outgoingCallTimeout);
                    this.outgoingCallTimeout = null;
                    if (this.config.debug_mode) {
                        console.log('⏱️ [WebRTC Softphone] Timeout de llamada saliente cancelado (llamada establecida)');
                    }
                }

                // LOG PÚBLICO: Confirmar codecs REALES en uso cuando la llamada se establece
                console.log('%c✅ [LLAMADA ESTABLECIDA] ' + number, 'background: #28a745; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                
                // Obtener el codec REAL que se está usando en la llamada
                this._getActualCodec(inviter).then((actualCodec) => {
                    if (actualCodec) {
                        console.log('%c📞 Codec REAL en uso: ' + actualCodec, 'background: #28a745; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                    } else {
                        console.log('%c📞 Codec REAL: Detectando...', 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                    }
                }).catch(() => {
                    console.log('%c📞 Codec REAL: No disponible aún', 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                });
                
                this._updateStatus('in-call', 'En llamada');
                this._stopRingback();
                this._playConnectedSound();
                this._startCallTimer();
                this._setupAudio(inviter);
            } else if (s === 'Progress' || s === '2' || s === 'Establishing' || s === '3' || s === 'Ringing' || s === '1') {
                this._playRingback();
            } else if (s === 'Terminated' || s === '5') {
                // Limpiar timeout de llamada saliente (llamada terminada)
                if (this.outgoingCallTimeout) {
                    clearTimeout(this.outgoingCallTimeout);
                    this.outgoingCallTimeout = null;
                }

                // CRÍTICO: Detener timbrado inmediatamente cuando la sesión termina
                // Este es el método más confiable para detectar colgado remoto
                if (this.config.debug_mode) {
                    console.log('📞 [Softphone] Sesión terminada detectada por stateChange - Colgado remoto');
                }
                this._stopRingback(); // Detener timbrado inmediatamente
                this.endCall();
            }
        });

        try {
            // LOG PÚBLICO: Mostrar codecs que se usarán en la llamada
            console.log('%c🚀 [INICIANDO LLAMADA] ' + number, 'background: #007bff; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
            console.log('%c📞 Codecs configurados: G.711 A-law (PCMA) y G.711 μ-law (PCMU)', 'background: #28a745; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
            
            if (this.config.debug_mode) {
                console.log(`🚀 [Softphone] Llamando a ${number}...`);
            }
            await inviter.invite();
            
            // LOG PÚBLICO: Confirmar que el INVITE fue enviado
            console.log('%c✅ [INVITE ENVIADO] Esperando respuesta del servidor...', 'background: #17a2b8; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
            
            if (this.config.debug_mode) {
                console.log('✅ [Softphone] INVITE enviado');
            }

            // Configurar timeout para cancelar automáticamente la llamada saliente si no hay respuesta
            // Valor por defecto: 60 segundos (60000ms) si no está configurado
            // NOTA: Si outgoingCallTimeout es 0 o false, el timeout está deshabilitado
            const outgoingTimeoutSeconds = (this.config.outgoingCallTimeout !== undefined && this.config.outgoingCallTimeout !== null) 
                ? this.config.outgoingCallTimeout 
                : 60; // Aumentado a 60 segundos por defecto
            
            // Solo configurar timeout si es mayor a 0
            if (outgoingTimeoutSeconds > 0) {
                const outgoingTimeoutMs = outgoingTimeoutSeconds * 1000;
                
                if (this.config.debug_mode) {
                    console.log(`⏱️ [WebRTC Softphone] Timeout de llamada saliente configurado: ${outgoingTimeoutSeconds} segundos`);
                }
                
                // Limpiar cualquier timeout anterior
                if (this.outgoingCallTimeout) {
                    clearTimeout(this.outgoingCallTimeout);
                    this.outgoingCallTimeout = null;
                }
                
                // Crear timer para cancelar automáticamente después del timeout
                this.outgoingCallTimeout = setTimeout(() => {
                    // Solo cancelar si la llamada aún está en estado "Establishing" o "Ringing"
                    if (this.currentCall === inviter) {
                        const currentState = String(inviter.state);
                        if (currentState === 'Establishing' || currentState === '3' || 
                            currentState === 'Progress' || currentState === '2' || 
                            currentState === 'Ringing' || currentState === '1') {
                            if (this.config.debug_mode) {
                                console.log(`⏱️ [WebRTC Softphone] Timeout alcanzado (${outgoingTimeoutSeconds}s). Cancelando llamada saliente automáticamente.`);
                            }
                            console.log(`%c⏱️ [TIMEOUT] Llamada cancelada automáticamente después de ${outgoingTimeoutSeconds} segundos sin respuesta`, 'background: #ffc107; color: black; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                            this._showError(`Llamada cancelada: No hubo respuesta después de ${outgoingTimeoutSeconds} segundos`);
                            this.hangup();
                        }
                    }
                }, outgoingTimeoutMs);
            } else {
                if (this.config.debug_mode) {
                    console.log('⏱️ [WebRTC Softphone] Timeout de llamada saliente deshabilitado (outgoingCallTimeout = 0)');
                }
            }
        } catch (err) {
            console.error('❌ Error INVITE:', err);
            const msg = String(err?.message || err);
            if (msg.includes('NotFoundError')) {
                console.warn('⚠️ INVITE falló por falta de dispositivo de audio (NotFoundError).');
                this._showError('No se encontró micrófono. Verifica que esté conectado.');
            } else {
                this._showError('Error al invitar: ' + msg);
            }
            this.endCall();
        }
    }

    /* -------------------------------------------------------------
     * Llamada entrante
     * ------------------------------------------------------------- */
    handleIncomingCall(invitation) {
        if (this.config.debug_mode) {
            console.log('🔔 [WebRTC Softphone] ===== handleIncomingCall LLAMADO =====');
            console.log('   📞 Invitation:', invitation);
            console.log('   📞 Invitation type:', typeof invitation);
        }

        // CRÍTICO: Prevención de llamadas duplicadas
        // Si ya hay una sesión activa (llamada en curso o entrante pendiente), rechazar la nueva
        if (this.currentCall || this.incomingCall) {
            if (this.config.debug_mode) {
                console.warn('⚠️ [WebRTC Softphone] Ya hay una sesión activa, rechazando llamada entrante duplicada');
            }
            invitation.reject();
            return;
        }

        // Intentar obtener el número del llamante de diferentes formas
        let caller = 'Desconocido';

        try {
            // Método 1: Desde remoteIdentity
            if (invitation.remoteIdentity && invitation.remoteIdentity.uri) {
                if (invitation.remoteIdentity.uri.user) {
                    caller = invitation.remoteIdentity.uri.user;
                    if (this.config.debug_mode) {
                        console.log('   📞 Caller desde remoteIdentity.uri.user:', caller);
                    }
                } else if (invitation.remoteIdentity.uri.toString) {
                    const uriString = invitation.remoteIdentity.uri.toString();
                    const match = uriString.match(/sip:(\d+)@/);
                    if (match && match[1]) {
                        caller = match[1];
                        if (this.config.debug_mode) {
                            console.log('   📞 Caller desde remoteIdentity.uri.toString:', caller);
                        }
                    }
                }
            }

            // Método 2: Desde request.from
            if (caller === 'Desconocido' && invitation.request && invitation.request.from) {
                const fromHeader = invitation.request.from;
                if (fromHeader.uri && fromHeader.uri.user) {
                    caller = fromHeader.uri.user;
                    if (this.config.debug_mode) {
                        console.log('   📞 Caller desde request.from.uri.user:', caller);
                    }
                } else if (fromHeader.displayName) {
                    caller = fromHeader.displayName;
                    if (this.config.debug_mode) {
                        console.log('   📞 Caller desde request.from.displayName:', caller);
                    }
                }
            }

            // Método 3: Desde request.headers.From
            if (caller === 'Desconocido' && invitation.request && invitation.request.headers) {
                const fromHeader = invitation.request.headers.From;
                if (fromHeader) {
                    const match = fromHeader.match(/sip:(\d+)@/);
                    if (match && match[1]) {
                        caller = match[1];
                        if (this.config.debug_mode) {
                            console.log('   📞 Caller desde request.headers.From:', caller);
                        }
                    }
                }
            }

            // Método 4: Desde request.from.uri directamente
            if (caller === 'Desconocido' && invitation.request && invitation.request.from && invitation.request.from.uri) {
                const uri = invitation.request.from.uri;
                if (uri.user) {
                    caller = uri.user;
                    if (this.config.debug_mode) {
                        console.log('   📞 Caller desde request.from.uri.user (directo):', caller);
                    }
                }
            }
        } catch (error) {
            if (this.config.debug_mode) {
                console.warn('⚠️ [WebRTC Softphone] Error al extraer número del llamante:', error);
            }
        }

        if (this.config.debug_mode) {
            console.log('📞 [WebRTC Softphone] Llamada entrante de:', caller);
            console.log('   📞 Caller final identificado:', caller);
        }

        // 1. Guardar la sesión actual (igual que APEX5.1)
        this.incomingCall = invitation;
        this.incomingCallInvitation = invitation; // Alias para compatibilidad
        this.currentNumber = caller;

        // 2. Actualizar UI - Mostrar información de llamada entrante (igual que APEX5.1)
        try {
            this._showCallInfo(caller);
            this._updateCallStatus('Llamada Entrante...');
            this._updateStatus('in-call', 'Llamando...');
        } catch (error) {
            if (this.config.debug_mode) {
                console.warn('⚠️ [WebRTC Softphone] Error al actualizar UI:', error);
            }
        }

        // 3. Mostrar notificación visual de llamada entrante (CRÍTICO - debe mostrarse) (igual que APEX5.1)
        try {
            this._showIncomingNotification(caller, caller, invitation);
            if (this.config.debug_mode) {
                console.log('✅ [WebRTC Softphone] Notificación de llamada entrante mostrada');
            }
        } catch (error) {
            console.error('❌ [WebRTC Softphone] Error al mostrar notificación:', error);
            // Intentar mostrar una alerta como fallback
            alert(`📞 Llamada entrante de: ${caller}`);
        }

        // 4. Reproducir sonido de llamada entrante (CRÍTICO - debe sonar) (igual que APEX5.1)
        try {
            this._playIncoming();
            if (this.config.debug_mode) {
                console.log('✅ [WebRTC Softphone] Sonido de llamada entrante iniciado');
            }
        } catch (error) {
            console.error('❌ [WebRTC Softphone] Error al reproducir sonido:', error);
        }

        // 5. Configurar timeout para rechazar automáticamente la llamada después de cierto tiempo
        // Valor por defecto: 30 segundos (30000ms) si no está configurado
        const timeoutSeconds = this.config.incomingCallTimeout || 30;
        const timeoutMs = timeoutSeconds * 1000;
        
        if (this.config.debug_mode) {
            console.log(`⏱️ [WebRTC Softphone] Timeout de llamada entrante configurado: ${timeoutSeconds} segundos`);
        }
        
        // Limpiar cualquier timeout anterior
        if (this.incomingCallTimeout) {
            clearTimeout(this.incomingCallTimeout);
            this.incomingCallTimeout = null;
        }
        
        // Crear timer para rechazar automáticamente después del timeout
        this.incomingCallTimeout = setTimeout(() => {
            if (this.incomingCall === invitation && !this.currentCall) {
                if (this.config.debug_mode) {
                    console.log(`⏱️ [WebRTC Softphone] Timeout alcanzado (${timeoutSeconds}s). Rechazando llamada automáticamente.`);
                }
                console.log(`%c⏱️ [TIMEOUT] Llamada rechazada automáticamente después de ${timeoutSeconds} segundos`, 'background: #ffc107; color: black; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                this.rejectIncomingCall();
            }
        }, timeoutMs);

        // CRÍTICO: Delegados para eventos BYE y CANCEL en llamadas entrantes
        // Esto asegura que el timbrado se detenga inmediatamente si el remoto cuelga
        invitation.delegate = {
            onBye: () => {
                if (this.config.debug_mode) {
                    console.log('📞 [WebRTC Softphone] Evento BYE recibido en llamada entrante - Colgado remoto');
                }
                this._stopIncoming(); // Detener timbrado inmediatamente
                this.endCall();
            },
            onCancel: () => {
                if (this.config.debug_mode) {
                    console.log('📞 [WebRTC Softphone] Evento CANCEL recibido en llamada entrante - Cancelada remotamente');
                }
                this._stopIncoming(); // Detener timbrado inmediatamente
                this.endCall();
            },
            onReject: () => {
                if (this.config.debug_mode) {
                    console.log('📞 [WebRTC Softphone] Evento REJECT recibido en llamada entrante');
                }
                this._stopIncoming(); // Detener timbrado inmediatamente
                this.endCall();
            },
            onSessionDescriptionHandler: (sessionDescriptionHandler) => {
                if (this.config.debug_mode) {
                    console.log('🔊 [WebRTC Softphone] SessionDescriptionHandler disponible para llamada entrante');
                }
                this._setupAudio(invitation);
            }
        };

        // 5. Configurar eventos de la llamada entrante
        // CRÍTICO: Agregar listener ANTES de cualquier otra operación para capturar todos los cambios
        invitation.stateChange.addListener((newState) => {
            const stateStr = String(newState);
            if (this.config.debug_mode) {
                console.log(`📞 [WebRTC Softphone] Cambio de estado en llamada entrante: ${stateStr} (${newState})`);
            }

            if (stateStr === 'Terminated' || stateStr === 'Canceled' || stateStr === '5') {
                // CRÍTICO: Detener timbrado inmediatamente cuando la sesión termina
                // Este es el método más confiable para detectar colgado remoto
                if (this.config.debug_mode) {
                    console.log('📞 [WebRTC Softphone] Llamada entrante terminada/cancelada detectada por stateChange - Colgado remoto');
                }
                this._stopIncoming(); // Detener timbrado inmediatamente
                this._hideIncomingNotification();

                // Si es la llamada actual, limpiar todo
                if (this.currentCall === invitation || this.incomingCall === invitation) {
                    this.endCall();
                } else {
                    // Si no es la llamada actual, solo limpiar la invitación entrante
                    if (this.incomingCall === invitation) {
                        this.incomingCall = null;
                    }
                    // Restaurar UI si no hay llamada activa
                    if (!this.currentCall) {
                        this._hideCallInfo();
                        this._updateStatus('connected', 'En línea');
                    }
                }
            } else if (stateStr === 'Established' || stateStr === '4') {
                // LOG PÚBLICO: Confirmar codec REAL cuando la llamada entrante se establece
                console.log('%c✅ [LLAMADA ENTRANTE ESTABLECIDA] ' + caller, 'background: #28a745; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                
                // Obtener el codec REAL que se está usando en la llamada
                this._getActualCodec(invitation).then((actualCodec) => {
                    if (actualCodec) {
                        console.log('%c📞 Codec REAL en uso: ' + actualCodec, 'background: #28a745; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                    } else {
                        console.log('%c📞 Codec REAL: Detectando...', 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                    }
                }).catch(() => {
                    console.log('%c📞 Codec REAL: No disponible aún', 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                });
                
                // Llamada aceptada (igual que APEX5.1)
                this.currentCall = invitation;
                this.incomingCall = null;
                this.incomingCallInvitation = null; // Ya no es una llamada entrante pendiente
                this._updateStatus('in-call', 'En llamada');
                this._showCallInfo(caller);
                this._startCallTimer();
                this._hideIncomingNotification();
                this._stopIncoming();
                this._playConnectedSound();

                // Configurar audio después de un breve delay para asegurar que el PeerConnection esté listo
                setTimeout(() => {
                    this._setupAudio(invitation);
                }, 500);
            }
        });
    }

    _showIncomingNotification(callerName, callerNumber, invitation) {
        // Crear o actualizar el modal de llamada entrante
        let notif = document.getElementById('incoming-call-notification');

        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'incoming-call-notification';
            notif.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                min-width: 300px;
                animation: slideInRight 0.3s ease-out;
            `;
            document.body.appendChild(notif);

            // Agregar animación CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }

        notif.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Llamada Entrante</div>
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 3px;">${this._escapeHtml(callerName)}</div>
                    <div style="font-size: 14px; opacity: 0.8;">${this._escapeHtml(callerNumber)}</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.webrtcSoftphone?.acceptIncomingCall()" 
                            style="background: white; color: #28a745; border: none; border-radius: 50%; width: 50px; height: 50px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2); animation: pulse 1s infinite;">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button onclick="window.webrtcSoftphone?.rejectIncomingCall()" 
                            style="background: #dc3545; color: white; border: none; border-radius: 50%; width: 50px; height: 50px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;

        // Asegurar que la notificación esté visible
        notif.style.display = 'block';
        notif.style.visibility = 'visible';
        notif.style.opacity = '1';

        // Asegurar z-index alto para que esté por encima de todo
        notif.style.zIndex = '99999';

        // Guardar la invitación para aceptar/rechazar (ya está guardada en handleIncomingCall, pero por si acaso) (igual que APEX5.1)
        this.incomingCallInvitation = invitation;

        // El sonido ya se reproduce en handleIncomingCall, pero asegurémonos de que se reproduzca
        if (!this.incomingCallAudio || this.incomingCallAudio.paused) {
            this._playIncoming();
        }

        if (this.config.debug_mode) {
            console.log('✅ [WebRTC Softphone] Notificación de llamada entrante mostrada y visible');
            console.log('   📍 Elemento display:', window.getComputedStyle(notif).display);
            console.log('   📍 Elemento visibility:', window.getComputedStyle(notif).visibility);
            console.log('   📍 Elemento z-index:', window.getComputedStyle(notif).zIndex);
        }
    }

    _hideIncomingNotification() {
        const notif = document.getElementById('incoming-call-notification');
        if (notif) {
            notif.style.display = 'none';
        }
        this._stopIncoming();
        // No limpiar incomingCallInvitation aquí, se limpia en rejectIncomingCall o acceptIncomingCall
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async acceptIncomingCall() {
        // Limpiar timeout si existe (usuario aceptó manualmente)
        if (this.incomingCallTimeout) {
            clearTimeout(this.incomingCallTimeout);
            this.incomingCallTimeout = null;
            if (this.config.debug_mode) {
                console.log('⏱️ [WebRTC Softphone] Timeout de llamada entrante cancelado (usuario aceptó)');
            }
        }

        // Usar incomingCallInvitation si está disponible, sino usar incomingCall (igual que APEX5.1)
        const invitation = this.incomingCallInvitation || this.incomingCall;

        if (!invitation) {
            console.warn('⚠️ [WebRTC Softphone] No hay llamada entrante para aceptar');
            return;
        }

        try {
            if (this.config.debug_mode) {
                console.log('✅ [WebRTC Softphone] Usuario presionó Contestar');
            }

            // Reutilizar la misma configuración robusta de ICE y Audio que usamos para llamar (igual que APEX5.1)
            // Optimizado para redes móviles (3G/4G/5G)
            const options = {
                sessionDescriptionHandlerOptions: {
                    // Constraints optimizados para redes móviles (igual que en makeCall)
                    constraints: {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 8000,
                            channelCount: 1,
                            latency: 0.01,
                            sampleSize: 16
                        },
                        video: false
                    },
                    iceServers: this._getIceServers(),
                    // FIX: Timeout aumentado para llamadas entrantes (Evita el 0.0.0.0 y IP pública en LAN)
                    // 3000ms da tiempo suficiente para que los candidatos locales se recojan primero
                    iceGatheringTimeout: 3000,
                    peerConnectionConfiguration: (() => {
                        const iceServersIncoming = this._getIceServers();
                        return {
                            iceServers: iceServersIncoming,
                            // CRÍTICO: En LAN sin STUN, usar 'relay' evita que el navegador genere candidatos srflx (IP pública)
                            // Si hay STUN (WAN), usar 'all' para permitir todos los tipos
                            iceTransportPolicy: (iceServersIncoming.length === 0) ? 'relay' : 'all',
                            bundlePolicy: 'balanced',
                            rtcpMuxPolicy: 'negotiate', // Negociar RTCP-MUX (mejor compatibilidad)
                            
                            // Optimizaciones para redes móviles (igual que en makeCall)
                            iceCandidatePoolSize: 0,
                            iceConnectionReceivingTimeout: 30000,
                            iceBackupCandidatePairPingInterval: 25000
                        };
                    })(),
                    // Pasar mediaStreamFactory que retorna el stream pre-adquirido
                    mediaStreamFactory: async () => {
                        if (this.config.debug_mode) {
                            console.log('🎤 [WebRTC Softphone] mediaStreamFactory LLAMADA PARA CONTESTAR');
                        }
                        // Adquirir stream antes de contestar
                        return await this._mediaStreamFactory();
                    }
                }
            };

            // LOG PÚBLICO: Mostrar codecs al aceptar llamada entrante
            console.log('%c📞 [ACEPTANDO LLAMADA ENTRANTE]', 'background: #007bff; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
            console.log('%c📞 Codecs configurados: G.711 A-law (PCMA) y G.711 μ-law (PCMU)', 'background: #28a745; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
            
            // Aceptar la llamada
            await invitation.accept(options);

            // Actualizar UI a "En llamada"
            this.currentCall = invitation;
            this._hideIncomingNotification();
            this._stopIncoming();

            // LOG PÚBLICO: Confirmar que la llamada fue aceptada
            console.log('%c✅ [LLAMADA ENTRANTE ACEPTADA]', 'background: #28a745; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
            
            if (this.config.debug_mode) {
                console.log('✅ [WebRTC Softphone] Llamada aceptada exitosamente');
            }

        } catch (error) {
            console.error('❌ [WebRTC Softphone] Error al aceptar llamada:', error);
            this._showError('Error al aceptar la llamada: ' + error.message);
            this._hideIncomingNotification();
            this.endCall();
        }
    }

    rejectIncomingCall() {
        // Limpiar timeout si existe (usuario rechazó manualmente)
        if (this.incomingCallTimeout) {
            clearTimeout(this.incomingCallTimeout);
            this.incomingCallTimeout = null;
            if (this.config.debug_mode) {
                console.log('⏱️ [WebRTC Softphone] Timeout de llamada entrante cancelado (usuario rechazó)');
            }
        }

        // Usar incomingCallInvitation si está disponible, sino usar incomingCall (igual que APEX5.1)
        const invitation = this.incomingCallInvitation || this.incomingCall;

        if (!invitation) {
            console.warn('⚠️ [WebRTC Softphone] No hay llamada entrante para rechazar');
            return;
        }

        try {
            if (this.config.debug_mode) {
                console.log('❌ [WebRTC Softphone] Rechazando llamada entrante');
            }

            invitation.reject();
            this._hideIncomingNotification();
            this._stopIncoming();
            this.incomingCall = null;
            this.incomingCallInvitation = null;
            this._updateStatus('connected', 'En línea');

        } catch (error) {
            console.error('❌ [WebRTC Softphone] Error al rechazar llamada:', error);
            this._hideIncomingNotification();
            this._stopIncoming();
            this.incomingCall = null;
            this.incomingCallInvitation = null;
        }
    }

    /* -------------------------------------------------------------
     * Colgar / finalizar
     * ------------------------------------------------------------- */
    hangup() {
        if (!this.currentCall) return;
        this._playHangupSound();
        try {
            const state = String(this.currentCall.state);
            if (state === 'Establishing' || state === '3' || state === 'Progress' || state === '2') {
                this.currentCall.cancel?.();
            } else {
                this.currentCall.bye?.();
            }
        } catch (e) {
            console.warn('⚠️ error al colgar', e);
        }
        this.endCall(false);
    }

    _playHangupSound() {
        try {
            if (!this.hangupAudio) {
                this.hangupAudio = new Audio(this.audioBaseUrl + 'edd call.mp3');
                this.hangupAudio.volume = 1.0;
            }
            this.hangupAudio.currentTime = 2;
            this.hangupAudio.play().catch((err) => {
                if (this.config.debug_mode) {
                    console.warn('⚠️ [Hangup Sound] No se pudo reproducir:', err);
                }
            });
        } catch (_) {}
    }

    endCall(playSound = true) {
        if (playSound && (this.currentCall || this.incomingCall)) {
            this._playHangupSound();
        }
        // Limpiar timeouts de llamadas si existen
        if (this.incomingCallTimeout) {
            clearTimeout(this.incomingCallTimeout);
            this.incomingCallTimeout = null;
        }
        if (this.outgoingCallTimeout) {
            clearTimeout(this.outgoingCallTimeout);
            this.outgoingCallTimeout = null;
        }

        // CRÍTICO: Detener todos los audios inmediatamente (timbrado infinito fix)
        // Esto asegura que el timbrado se detenga cuando se recibe BYE o CANCEL
        this._stopIncoming();
        this._stopRingback();
        this._hideIncomingNotification();
        this._hideVoicemailNotification();

        // Detener y limpiar audio remoto
        if (this.remoteAudioElement) {
            this.remoteAudioElement.pause();
            this.remoteAudioElement.srcObject = null;
        }

        // Liberar stream de medios
        this._releaseLastMediaStream();

        // Limpiar todas las referencias de sesión
        this.currentCall = null;
        this.incomingCall = null;
        this.incomingCallInvitation = null; // Limpiar también el alias (igual que APEX5.1)
        this.currentNumber = '';
        this.voicemailDetected = false;
        this.hasRung = false;
        this.ringingDetected = false;
        this.received183WithSdp = false;
        this._playedConnectedSound = false;

        // Detener timer y restaurar UI
        this._stopCallTimer();
        this._hideCallInfo();
        this._updateStatus('connected', 'En línea');

        if (this.config.debug_mode) {
            console.log('🧹 [Softphone] Sesión terminada y recursos limpiados');
        }
    }

    /* -------------------------------------------------------------
     * Audio y media
     * ------------------------------------------------------------- */
    async _mediaStreamFactory(constraintsFromSIP = {}) {
        if (this.config.debug_mode) {
            console.log('🎤 [Softphone] mediaStreamFactory LLAMADA POR SIP.js');
        }

        // Constraints optimizados para redes móviles (3G/4G/5G)
        // Configuración específica para mejorar calidad y reducir ancho de banda
        // NOTA: Algunas propiedades pueden no estar disponibles en todos los navegadores
        const finalConstraints = {
            audio: {
                // Configuración básica (soportada por todos los navegadores modernos)
                echoCancellation: true,      // Cancelación de eco (mejora calidad)
                noiseSuppression: true,       // Supresión de ruido (mejora claridad)
                autoGainControl: true,       // Control automático de ganancia (nivel de audio consistente)
                
                // Optimización para redes móviles (especialmente 3G)
                // Estas propiedades pueden no estar disponibles en todos los navegadores
                // El navegador usará valores por defecto si no las soporta
                sampleRate: 8000,            // 8kHz es suficiente para G.711 (reduce ancho de banda)
                channelCount: 1,             // Mono (reduce ancho de banda vs estéreo)
                
                // Configuraciones avanzadas (pueden no estar disponibles en todos los navegadores)
                // Si el navegador no las soporta, se ignoran sin error
                latency: 0.01,                // Latencia baja (10ms) para mejor respuesta
                sampleSize: 16                // 16 bits por muestra (estándar para G.711)
            },
            video: false
        };
        
        if (this.config.debug_mode) {
            console.log('📱 [Optimización Móvil] Constraints de audio configurados para redes móviles (3G/4G/5G)');
            console.log('   - Echo Cancellation: ON');
            console.log('   - Noise Suppression: ON');
            console.log('   - Auto Gain Control: ON');
            console.log('   - Sample Rate: 8kHz (optimizado para G.711)');
            console.log('   - Channel: Mono (reduce ancho de banda)');
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (this.config.debug_mode) {
                console.error('❌ [Softphone] getUserMedia no disponible en este navegador/contexto.');
            }
            // Igual que APEX4.2 funcional: lanzar error en lugar de devolver stream silencioso
            throw new Error('getUserMedia no disponible en este navegador/contexto.');
        }

        try {
            // Liberar stream anterior si existe
            this._releaseLastMediaStream();

            // Intentar adquirir el stream (igual que APEX4.2 funcional)
            const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            this.lastMediaStream = stream;

            // Actualizar estado
            this.micPermissionGranted = true;
            this.micPermissionDenied = false;
            this.noAudioDevice = false;
            this._updateMicStatus('granted');

            if (this.config.debug_mode) {
                const audioTracks = stream.getAudioTracks();
                console.log(`✅ [Softphone] MediaStream adquirido. Tracks: ${audioTracks.length}`);
                audioTracks.forEach((t, i) => {
                    console.log(`   Track ${i}: ${t.label || 'Sin nombre'} (${t.readyState})`);
                });
            }

            return stream;

        } catch (error) {
            if (this.config.debug_mode) {
                console.error('❌ [Softphone] mediaStreamFactory no pudo abrir el micrófono:', error);
            }

            // Actualizar estado según el error
            if (error && error.name === 'NotFoundError') {
                console.warn('⚠️ [Softphone] No se encontró dispositivo de audio.');
                this.noAudioDevice = true;
                this._updateMicStatus('no-device');
            } else if (error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
                console.warn('⚠️ [Softphone] Permiso de micrófono denegado.');
                this.micPermissionDenied = true;
                this._updateMicStatus('denied');
            } else {
                console.error('❌ [Softphone] Error desconocido:', error.message);
                this._updateMicStatus('error');
            }

            // Igual que APEX4.2 funcional: lanzar el error en lugar de devolver stream silencioso
            // Esto permite que SIP.js maneje el error correctamente
            throw error;
        }
    }

    _releaseLastMediaStream() {
        if (this.lastMediaStream) {
            this.lastMediaStream.getTracks().forEach((t) => t.stop());
            this.lastMediaStream = null;
        }
    }

    /**
     * Obtiene el codec REAL que se está usando en la llamada activa
     * @param {Object} session - Sesión SIP (Inviter o Invitation)
     * @returns {Promise<string>} Nombre del codec en uso o null
     */
    async _getActualCodec(session) {
        try {
            if (!session?.sessionDescriptionHandler) {
                if (this.config.debug_mode) {
                    console.warn('⚠️ [Codec] sessionDescriptionHandler no disponible');
                }
                return null;
            }
            
            const pc = session.sessionDescriptionHandler.peerConnection;
            if (!pc) {
                if (this.config.debug_mode) {
                    console.warn('⚠️ [Codec] PeerConnection no disponible');
                }
                return null;
            }

            // Esperar un poco si el remoteDescription no está disponible aún
            let remoteSdp = null;
            if (session.sessionDescriptionHandler.remoteDescription) {
                remoteSdp = session.sessionDescriptionHandler.remoteDescription.sdp;
            } else {
                // Esperar hasta 500ms para que el remoteDescription esté disponible
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    if (session.sessionDescriptionHandler.remoteDescription) {
                        remoteSdp = session.sessionDescriptionHandler.remoteDescription.sdp;
                        break;
                    }
                }
            }

            // Método 1: Obtener del SDP answer del servidor (más confiable)
            if (remoteSdp) {
                if (this.config.debug_mode) {
                    console.log('🔍 [Codec] Analizando SDP remoto (answer del servidor)');
                }
                
                const sdpLines = remoteSdp.split('\r\n');
                
                // Buscar línea m=audio
                for (let i = 0; i < sdpLines.length; i++) {
                    if (sdpLines[i].startsWith('m=audio ')) {
                        const parts = sdpLines[i].split(' ');
                        // El primer payload en m=audio es el codec que el servidor aceptó
                        if (parts.length > 3) {
                            const activePayload = parts[3];
                            
                            if (this.config.debug_mode) {
                                console.log('🔍 [Codec] Payload activo encontrado:', activePayload);
                            }
                            
                            // Buscar la definición de este payload en rtpmap
                            for (let j = i + 1; j < sdpLines.length; j++) {
                                if (sdpLines[j].startsWith('a=rtpmap:' + activePayload + ' ')) {
                                    const match = sdpLines[j].match(/^a=rtpmap:\d+\s+(.+)$/);
                                    if (match) {
                                        const codecName = match[1].trim();
                                        
                                        if (this.config.debug_mode) {
                                            console.log('🔍 [Codec] Codec encontrado en SDP:', codecName);
                                        }
                                        
                                        // Mapear nombres comunes a nombres legibles
                                        if (codecName.includes('PCMA') || codecName.includes('G711A') || codecName.includes('G.711A')) {
                                            return 'G.711 A-law (PCMA)';
                                        } else if (codecName.includes('PCMU') || codecName.includes('G711U') || codecName.includes('G.711U')) {
                                            return 'G.711 μ-law (PCMU)';
                                        } else {
                                            return codecName;
                                        }
                                    }
                                }
                                // Si encontramos otra línea m=, detener
                                if (sdpLines[j].startsWith('m=')) break;
                            }
                        }
                        break;
                    }
                }
            }

            // Método 2: Usar getStats() como fallback (método más confiable para codec real)
            try {
                if (this.config.debug_mode) {
                    console.log('🔍 [Codec] Intentando obtener codec desde getStats()');
                }
                
                const stats = await pc.getStats();
                let codecName = null;
                
                stats.forEach((report) => {
                    if (report.type === 'codec' && report.mimeType) {
                        const mimeType = report.mimeType.toLowerCase();
                        
                        if (this.config.debug_mode) {
                            console.log('🔍 [Codec] Codec encontrado en getStats:', report.mimeType);
                        }
                        
                        if (mimeType.includes('pcma') || mimeType.includes('g711a')) {
                            codecName = 'G.711 A-law (PCMA)';
                        } else if (mimeType.includes('pcmu') || mimeType.includes('g711u')) {
                            codecName = 'G.711 μ-law (PCMU)';
                        } else if (!codecName) {
                            codecName = report.mimeType;
                        }
                    }
                });

                if (codecName) {
                    return codecName;
                }
            } catch (statsError) {
                if (this.config.debug_mode) {
                    console.warn('⚠️ [Codec] No se pudo obtener codec desde getStats:', statsError);
                }
            }

            if (this.config.debug_mode) {
                console.warn('⚠️ [Codec] No se pudo determinar el codec real');
            }
            return null;
        } catch (error) {
            if (this.config.debug_mode) {
                console.warn('⚠️ [Codec] Error al obtener codec real:', error);
            }
            return null;
        }
    }

    _setupAudio(session) {
        if (!session?.sessionDescriptionHandler) return;
        const pc = session.sessionDescriptionHandler.peerConnection;
        if (!pc) return;

        if (!this.remoteAudioElement) {
            this.remoteAudioElement = document.createElement('audio');
            this.remoteAudioElement.autoplay = true;
            this.remoteAudioElement.playsInline = true;
            this.remoteAudioElement.style.display = 'none';
            document.body.appendChild(this.remoteAudioElement);
        }

        const attach = () => {
            const receivers = pc.getReceivers ? pc.getReceivers() : [];
            receivers.forEach((r) => {
                if (r.track && r.track.kind === 'audio') {
                    const ms = new MediaStream([r.track]);
                    this.remoteAudioElement.srcObject = ms;
                    this.remoteAudioElement.play().catch(() => { });
                }
            });
        };
        attach();
        pc.addEventListener('track', (ev) => {
            if (ev.track?.kind === 'audio') {
                const ms = new MediaStream([ev.track]);
                this.remoteAudioElement.srcObject = ms;
                this.remoteAudioElement.play().catch(() => { });
            }
        });
    }

    /* -------------------------------------------------------------
     * UI helpers
     * ------------------------------------------------------------- */
    /* -------------------------------------------------------------
     * Configurar eventos de teclado para marcar con el teclado físico
     * (igual que APEX4.2 funcional)
     * ------------------------------------------------------------- */
    _setupKeyboardEvents() {
        // Solo capturar teclas cuando no hay un input activo (para no interferir con modales)
        document.addEventListener('keydown', (e) => {
            // Ignorar si hay un input, textarea o modal activo
            const activeElement = document.activeElement;
            const isInputActive = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable ||
                activeElement.closest('.softphone-modal') ||
                activeElement.closest('.modal')
            );

            // Ignorar si hay una llamada en curso
            if (this.currentCall) {
                return;
            }

            // Si hay un input activo, no procesar las teclas
            if (isInputActive) {
                return;
            }

            // Capturar números del teclado (0-9, *, #)
            const key = e.key;

            // Números del 0 al 9
            if (key >= '0' && key <= '9') {
                e.preventDefault();
                this._addDigit(key);
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Dígito agregado desde teclado:', key);
                }
            }
            // Asterisco
            else if (key === '*' || (key === '8' && e.shiftKey)) {
                e.preventDefault();
                this._addDigit('*');
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Dígito agregado desde teclado: *');
                }
            }
            // Numeral
            else if (key === '#' || (key === '3' && e.shiftKey)) {
                e.preventDefault();
                this._addDigit('#');
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Dígito agregado desde teclado: #');
                }
            }
            // Backspace para borrar
            else if (key === 'Backspace' || key === 'Delete') {
                e.preventDefault();
                this._deleteLastDigit();
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Último dígito borrado desde teclado');
                }
            }
            // Enter para llamar
            else if (key === 'Enter' && this.currentNumber && this.currentNumber.trim() !== '') {
                e.preventDefault();
                this.makeCall();
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Llamada iniciada desde teclado (Enter)');
                }
            }
        });

        if (this.config.debug_mode) {
            console.log('⌨️ [Softphone] Eventos de teclado configurados');
        }
    }

    _addDigit(d) {
        this.currentNumber += d;
        this._updateNumberDisplay();
        this._playBlipClick();
        this._playDtmfSound(d);
    }

    _playDtmfSound(digit) {
        if (!digit || typeof digit !== 'string') return;

        const dtmfMap = {
            '0': 'DTMF_0.mp3',
            '1': 'DTMF_1.mp3',
            '2': 'DTMF_2.mp3',
            '3': 'DTMF_3.mp3',
            '4': 'DTMF_4.mp3',
            '5': 'DTMF_5.mp3',
            '6': 'DTMF_6.mp3',
            '7': 'DTMF_7.mp3',
            '8': 'DTMF_8.mp3',
            '9': 'DTMF_9.mp3',
            '*': 'DTMF_star.mp3',
            '#': 'DTMF_pound.mp3',
        };

        const audioFile = dtmfMap[digit];
        if (!audioFile) return;

        if (!this.dtmfSounds[digit]) {
            this.dtmfSounds[digit] = new Audio(this.audioBaseUrl + audioFile);
            this.dtmfSounds[digit].volume = 0.5;
        }

        const sound = this.dtmfSounds[digit];
        sound.currentTime = 0;
        sound.play().catch((err) => {
            if (this.config.debug_mode) {
                console.warn('⚠️ [DTMF Sound] No se pudo reproducir:', err);
            }
        });
    }

    _playBlipClick() {
        try {
            if (!this.blipClickAudio) {
                this.blipClickAudio = new Audio(this.audioBaseUrl + 'blip_click.mp3');
                this.blipClickAudio.volume = 0.4;
            }
            this.blipClickAudio.currentTime = 0;
            this.blipClickAudio.play().catch(() => {});
        } catch (_) {}
    }

    _playBlip1() {
        try {
            if (!this.blip1Audio) {
                this.blip1Audio = new Audio(this.audioBaseUrl + 'blip1.mp3');
                this.blip1Audio.volume = 0.35;
            }
            this.blip1Audio.currentTime = 0;
            this.blip1Audio.play().catch(() => {});
        } catch (_) {}
    }

    _playVoicemailAlert() {
        try {
            if (!this.voicemailAlertAudio) {
                this.voicemailAlertAudio = new Audio(this.audioBaseUrl + 'silkyalert.mp3');
                this.voicemailAlertAudio.volume = 0.7;
            }
            this.voicemailAlertAudio.currentTime = 0;
            this.voicemailAlertAudio.play().catch(() => {});
        } catch (_) {}
    }

    _playConnectedSound() {
        if (this._playedConnectedSound) return;
        this._playedConnectedSound = true;
        try {
            if (!this.connectedSoundAudio) {
                this.connectedSoundAudio = new Audio(this.audioBaseUrl + '2up2.mp3');
                this.connectedSoundAudio.volume = 0.6;
            }
            this.connectedSoundAudio.currentTime = 0;
            this.connectedSoundAudio.play().catch(() => {});
        } catch (_) {}
    }

    _deleteLastDigit() {
        if (this.currentNumber.length === 0) return;
        this.currentNumber = this.currentNumber.slice(0, -1);
        this._updateNumberDisplay();
        this._playBlip1();
    }

    _updateNumberDisplay() {
        const el = document.getElementById('number-display');
        if (el) {
            if (el.tagName === 'INPUT') {
                el.value = this.currentNumber || '';
            } else {
                el.textContent = this.currentNumber || 'Ingrese número';
            }
        }
    }

    /**
     * Configurar eventos del input de número para permitir pegar, escribir y validar
     */
    _setupNumberInputEvents() {
        const numberInput = document.getElementById('number-display');
        if (!numberInput || numberInput.tagName !== 'INPUT') return;

        // Sincronizar el valor del input con this.currentNumber cuando el usuario escribe
        numberInput.addEventListener('input', (e) => {
            // Filtrar solo caracteres permitidos: números, *, #
            const filtered = e.target.value.replace(/[^0-9*#]/g, '');
            this.currentNumber = filtered;
            e.target.value = filtered;

            if (this.config.debug_mode) {
                console.log('⌨️ [Softphone] Número actualizado desde input:', this.currentNumber);
            }
        });

        // Permitir pegar números (Ctrl+V, Cmd+V)
        numberInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');

            // Filtrar solo números, asteriscos y numerales
            const filtered = pastedText.replace(/[^0-9*#]/g, '');

            if (filtered) {
                this.currentNumber = filtered;
                this._updateNumberDisplay();

                // Seleccionar todo el texto para que el usuario pueda ver lo que pegó
                setTimeout(() => {
                    numberInput.select();
                }, 10);

                if (this.config.debug_mode) {
                    console.log('📋 [Softphone] Número pegado:', filtered);
                }
            }
        });

        // Permitir Enter para llamar directamente desde el input
        numberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.currentNumber && this.currentNumber.trim() !== '') {
                e.preventDefault();
                this.makeCall();
                if (this.config.debug_mode) {
                    console.log('⌨️ [Softphone] Llamada iniciada desde input (Enter)');
                }
            }
        });

        // Enfocar el input cuando no hay llamada activa
        numberInput.addEventListener('focus', () => {
            if (!this.currentCall) {
                // Seleccionar todo el texto al enfocar para facilitar reemplazo
                setTimeout(() => {
                    numberInput.select();
                }, 10);
            }
        });

        // Prevenir que se escriba durante una llamada
        numberInput.addEventListener('keydown', (e) => {
            if (this.currentCall) {
                // Permitir solo Ctrl+A, Ctrl+C, Ctrl+V, Backspace, Delete, Arrow keys
                const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                const isCtrl = e.ctrlKey || e.metaKey;
                const isAllowedKey = allowedKeys.includes(e.key) ||
                    (isCtrl && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()));

                if (!isAllowedKey && !e.key.match(/^[0-9*#]$/)) {
                    e.preventDefault();
                }
            }
        });

        if (this.config.debug_mode) {
            console.log('✅ [Softphone] Eventos del input de número configurados');
        }
    }

    /**
     * Establece el número de teléfono directamente
     * @param {string} numero - Número de teléfono a establecer
     */
    setNumber(numero) {
        if (!numero || typeof numero !== 'string') {
            console.warn('⚠️ [Softphone] setNumber: número inválido');
            return;
        }
        // Limpiar el número (solo dígitos, asteriscos y numerales)
        this.currentNumber = numero.toString().replace(/[^0-9*#]/g, '');
        this._updateNumberDisplay();
        if (this.config.debug_mode) {
            console.log('📞 [Softphone] Número establecido:', this.currentNumber);
        }
    }

    /**
     * Establece el número y hace la llamada automáticamente
     * @param {string} numero - Número de teléfono a llamar
     */
    async callNumber(numero) {
        if (!numero || typeof numero !== 'string') {
            this._showError('Número inválido');
            return;
        }

        // Establecer el número
        this.setNumber(numero);

        // Hacer la llamada
        await this.makeCall();
    }

    /**
     * Mostrar diálogo de transferencia
     */
    showTransferDialog() {
        if (!this.currentCall) {
            this._showError('No hay llamada activa');
            return;
        }

        // Verificar que la llamada esté establecida
        const state = String(this.currentCall.state);
        if (state !== 'Established' && state !== '4') {
            this._showError('La llamada debe estar establecida para transferir');
            return;
        }

        const modal = document.getElementById('transfer-modal');
        const input = document.getElementById('transfer-extension');
        if (modal && input) {
            modal.style.display = 'flex';
            input.value = '';
            input.focus();

            // Permitir Enter para confirmar
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.transferCall();
                }
            };
        }
    }

    /**
     * Ocultar diálogo de transferencia
     */
    hideTransferDialog() {
        const modal = document.getElementById('transfer-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const input = document.getElementById('transfer-extension');
        if (input) {
            input.value = '';
        }
    }

    /**
     * Transferir llamada a otra extensión
     */
    async transferCall() {
        const input = document.getElementById('transfer-extension');
        if (!input) {
            return;
        }

        const extension = input.value.trim();
        if (!extension) {
            this._showError('Por favor ingrese una extensión');
            return;
        }

        if (!this.currentCall) {
            this._showError('No hay llamada activa');
            this.hideTransferDialog();
            return;
        }

        if (this.config.debug_mode) {
            console.log('📞 [WebRTC Softphone] Transferiendo llamada a extensión:', extension);
        }

        try {
            // Verificar que la sesión tenga el método refer()
            if (!this.currentCall || typeof this.currentCall.refer !== 'function') {
                throw new Error('La sesión actual no soporta transferencias');
            }

            // Crear URI de destino para transferencia
            const targetUriString = `sip:${extension}@${this.config.sip_domain}`;
            let targetUri = SIP.UserAgent.makeURI(targetUriString);
            if (!targetUri) {
                throw new Error('No se pudo crear URI de destino');
            }

            // Parchear URI
            targetUri = this._patchUriClone(targetUri);

            if (this.config.debug_mode) {
                console.log('📞 [WebRTC Softphone] Iniciando transferencia a:', targetUriString);
            }

            // Realizar la transferencia usando el método refer() directamente de la sesión
            // SIP.js usa refer() para transferencias ciegas (blind transfer)
            const referResult = this.currentCall.refer(targetUri);

            // Si refer() retorna una promesa, manejarla
            if (referResult && typeof referResult.then === 'function') {
                referResult
                    .then(() => {
                        if (this.config.debug_mode) {
                            console.log('✅ [WebRTC Softphone] Transferencia completada a', extension);
                        }
                        this.hideTransferDialog();
                        this._updateStatus('in-call', 'Transfiriendo...');

                        // La llamada se terminará automáticamente después de la transferencia
                        setTimeout(() => {
                            if (this.config.debug_mode) {
                                console.log('🔄 [WebRTC Softphone] Limpiando sesión después de transferencia');
                            }
                            this.endCall();
                        }, 1000);
                    })
                    .catch((referError) => {
                        console.error('❌ [WebRTC Softphone] Error en la promesa de refer():', referError);
                        this._showError(`Error al transferir llamada: ${referError.message || 'Desconocido'}`);
                        this.hideTransferDialog();
                    });
            } else {
                // Si no retorna promesa, asumir que fue exitoso
                if (this.config.debug_mode) {
                    console.log('✅ [WebRTC Softphone] Transferencia iniciada a', extension);
                }
                this.hideTransferDialog();
                this._updateStatus('in-call', 'Transfiriendo...');

                // Esperar un momento y luego limpiar
                setTimeout(() => {
                    this.endCall();
                }, 1500);
            }

        } catch (error) {
            console.error('❌ [WebRTC Softphone] Error al transferir llamada:', error);
            this._showError('Error al transferir llamada: ' + error.message);
            this.hideTransferDialog();
        }
    }

    _updateStatus(status, text) {
        this.status = status;
        const dot = document.getElementById('status-dot');
        const txt = document.getElementById('status-text');
        if (dot) dot.className = `status-dot ${status}`;
        if (txt) txt.textContent = text || status;
    }
    _showCallInfo(num) {
        const ci = document.getElementById('call-info'); const n = document.getElementById('call-info-number');
        const btnC = document.getElementById('btn-call'); const btnH = document.getElementById('btn-hangup');
        const btnT = document.getElementById('btn-transfer');
        const numberInput = document.getElementById('number-display');

        if (ci) ci.style.display = 'block';
        if (n) n.textContent = num;
        if (btnC) btnC.style.display = 'none';
        if (btnH) btnH.style.display = 'inline-block';
        if (btnT) btnT.style.display = 'inline-block';

        // Deshabilitar el input durante la llamada
        if (numberInput && numberInput.tagName === 'INPUT') {
            numberInput.disabled = true;
            numberInput.style.cursor = 'not-allowed';
            numberInput.style.opacity = '0.6';
        }
    }

    _hideCallInfo() {
        const ci = document.getElementById('call-info');
        const btnC = document.getElementById('btn-call'); const btnH = document.getElementById('btn-hangup');
        const btnT = document.getElementById('btn-transfer');
        const numberInput = document.getElementById('number-display');

        if (ci) ci.style.display = 'none';
        if (btnC) btnC.style.display = 'inline-block';
        if (btnH) btnH.style.display = 'none';
        if (btnT) btnT.style.display = 'none';

        // Habilitar el input cuando no hay llamada
        if (numberInput && numberInput.tagName === 'INPUT') {
            numberInput.disabled = false;
            numberInput.style.cursor = 'text';
            numberInput.style.opacity = '1';
        }

        this._updateNumberDisplay();
    }
    _startCallTimer() {
        this._stopCallTimer();
        this.callStart = Date.now();
        this.timer = setInterval(() => {
            const s = Math.floor((Date.now() - this.callStart) / 1000);
            const mm = String(Math.floor(s / 60)).padStart(2, '0');
            const ss = String(s % 60).padStart(2, '0');
            const el = document.getElementById('call-info-duration');
            if (el) el.textContent = `${mm}:${ss}`;
        }, 1000);
    }
    _stopCallTimer() { if (this.timer) clearInterval(this.timer); this.timer = null; }

    _updateCallStatus(status) {
        const callInfoStatus = document.getElementById('call-info-status');
        if (callInfoStatus) {
            callInfoStatus.textContent = status;
        }
    }

    _getAudioBaseUrl() {
        if (typeof document === 'undefined' || !document.location) {
            return 'assets/audio/';
        }
        const path = document.location.pathname || '';
        const base = path.replace(/\/[^/]*$/, '') || '';
        return (base ? base + '/' : '') + 'assets/audio/';
    }

    /* -------------------------------------------------------------
     * Tonos
     * ------------------------------------------------------------- */
    _playIncoming() {
        this._stopRingback();
        if (!this.incomingCallAudio) {
            this.incomingCallAudio = new Audio(this.audioBaseUrl + 'ringtone.mp3');
            this.incomingCallAudio.loop = true;
            this.incomingCallAudio.volume = 0.7;
            this.incomingCallAudio.addEventListener('error', () => {
                if (!this._incomingFallbackUsed) {
                    this._incomingFallbackUsed = true;
                    this.incomingCallAudio = new Audio(this.audioBaseUrl + 'ring.mp3');
                    this.incomingCallAudio.loop = true;
                    this.incomingCallAudio.volume = 0.7;
                    this.incomingCallAudio.play().catch(() => {});
                }
            }, { once: true });
        }
        this.incomingCallAudio.currentTime = 0;
        this.incomingCallAudio.play().catch(() => { });
    }
    _stopIncoming() {
        if (this.incomingCallAudio) {
            this.incomingCallAudio.pause();
            this.incomingCallAudio.currentTime = 0;
            // CRÍTICO: Asegurar que el audio se detenga completamente
            if (this.incomingCallAudio.load) {
                this.incomingCallAudio.load(); // Reiniciar el elemento de audio
            }
        }
    }
    _playRingback() {
        this._stopIncoming();
        if (!this.ringbackAudio) {
            this.ringbackAudio = new Audio(this.audioBaseUrl + 'ringback.mp3');
            this.ringbackAudio.loop = true;
            this.ringbackAudio.volume = 0.6;
        }
        this.ringbackAudio.currentTime = 0;
        this.ringbackAudio.play().catch(() => { });
    }
    _stopRingback() {
        if (this.ringbackAudio) {
            this.ringbackAudio.pause();
            this.ringbackAudio.currentTime = 0;
            // CRÍTICO: Asegurar que el audio se detenga completamente
            if (this.ringbackAudio.load) {
                this.ringbackAudio.load(); // Reiniciar el elemento de audio
            }
        }
    }

    /* -------------------------------------------------------------
     * Detección de Buzón de Voz
     * ------------------------------------------------------------- */
    _getSipStatusCode(response) {
        return Number(response?.message?.statusCode ?? response?.statusCode ?? 0);
    }

    _hasSdpBody(response) {
        const body = response?.body ?? response?.message?.body;
        return typeof body === 'string' && body.trim().startsWith('v=');
    }

    _trackCallProgress(response) {
        const statusCode = this._getSipStatusCode(response);
        if (statusCode === 180) {
            this.hasRung = true;
            this.ringingDetected = true;
            if (this.config.debug_mode) {
                console.log('📞 [Softphone] 180 Ringing - teléfono timbrando');
            }
        }
        if (statusCode === 183 && this._hasSdpBody(response)) {
            this.received183WithSdp = true;
            if (this.config.debug_mode) {
                console.log('📞 [Softphone] 183 Session Progress con SDP recibido');
            }
        }
    }

    _detectVoicemail(response) {
        if (!response || this.voicemailDetected) {
            return; // Ya detectado o sin respuesta
        }

        let isVoicemail = false;
        let voicemailInfo = '';

        try {
            // Método 1: Verificar header Alert-Info (común en Asterisk/Issabel)
            let alertInfo = null;
            if (response.hasHeader && response.hasHeader('Alert-Info')) {
                alertInfo = response.getHeader('Alert-Info');
            } else if (response.message && response.message.headers) {
                const alertInfoHeader = response.message.headers['Alert-Info'];
                if (alertInfoHeader) {
                    alertInfo = Array.isArray(alertInfoHeader) ? alertInfoHeader[0].raw : alertInfoHeader;
                }
            }

            if (alertInfo) {
                const alertInfoLower = String(alertInfo).toLowerCase();
                if (alertInfoLower.includes('voicemail') ||
                    alertInfoLower.includes('mailbox') ||
                    alertInfoLower.includes('buzon') ||
                    alertInfoLower.includes('vm') ||
                    alertInfoLower.includes('message')) {
                    isVoicemail = true;
                    voicemailInfo = `Alert-Info: ${alertInfo}`;
                }
            }

            // Método 2: Verificar header Call-Info
            let callInfo = null;
            if (response.hasHeader && response.hasHeader('Call-Info')) {
                callInfo = response.getHeader('Call-Info');
            } else if (response.message && response.message.headers) {
                const callInfoHeader = response.message.headers['Call-Info'];
                if (callInfoHeader) {
                    callInfo = Array.isArray(callInfoHeader) ? callInfoHeader[0].raw : callInfoHeader;
                }
            }

            if (callInfo && !isVoicemail) {
                const callInfoLower = String(callInfo).toLowerCase();
                if (callInfoLower.includes('voicemail') ||
                    callInfoLower.includes('mailbox') ||
                    callInfoLower.includes('buzon') ||
                    callInfoLower.includes('message')) {
                    isVoicemail = true;
                    voicemailInfo = `Call-Info: ${callInfo}`;
                }
            }

            // Método 3: Verificar header Diversion (redirección a buzón)
            let diversion = null;
            if (response.hasHeader && response.hasHeader('Diversion')) {
                diversion = response.getHeader('Diversion');
            } else if (response.message && response.message.headers) {
                const diversionHeader = response.message.headers['Diversion'];
                if (diversionHeader) {
                    diversion = Array.isArray(diversionHeader) ? diversionHeader[0].raw : diversionHeader;
                }
            }

            if (diversion && !isVoicemail) {
                const diversionLower = String(diversion).toLowerCase();
                // Buscar extensiones comunes de buzón de voz
                if (diversionLower.includes('*98') ||
                    diversionLower.includes('*97') ||
                    diversionLower.includes('voicemail') ||
                    diversionLower.includes('mailbox')) {
                    isVoicemail = true;
                    voicemailInfo = `Diversion: ${diversion}`;
                }
            }

            // Método 4: Verificar headers personalizados de Asterisk
            const asteriskHeaders = [
                'X-Asterisk-Voicemail',
                'X-Asterisk-Mailbox',
                'X-Asterisk-VM-Context'
            ];

            for (const headerName of asteriskHeaders) {
                let headerValue = null;
                if (response.hasHeader && response.hasHeader(headerName)) {
                    headerValue = response.getHeader(headerName);
                } else if (response.message && response.message.headers) {
                    const header = response.message.headers[headerName];
                    if (header) {
                        headerValue = Array.isArray(header) ? header[0].raw : header;
                    }
                }

                if (headerValue) {
                    isVoicemail = true;
                    voicemailInfo = `${headerName}: ${headerValue}`;
                    break;
                }
            }

            // Método 5: Verificar el número llamado (extensiones comunes de buzón)
            const calledNumber = this.currentNumber || '';
            const commonVoicemailExtensions = ['*98', '*97', '*99', '98', '97', '99', '*850', '*851'];
            if (commonVoicemailExtensions.includes(calledNumber) && !isVoicemail) {
                isVoicemail = true;
                voicemailInfo = `Extensión de buzón detectada: ${calledNumber}`;
            }

            // Método 6: Verificar en el To header (algunos servidores indican buzón en el To)
            let toHeader = null;
            if (response.hasHeader && response.hasHeader('To')) {
                toHeader = response.getHeader('To');
            } else if (response.message && response.message.headers) {
                const toHeaderObj = response.message.headers['To'];
                if (toHeaderObj) {
                    toHeader = Array.isArray(toHeaderObj) ? toHeaderObj[0].raw : toHeaderObj;
                }
            }

            if (toHeader && !isVoicemail) {
                const toHeaderLower = String(toHeader).toLowerCase();
                if (toHeaderLower.includes('voicemail') ||
                    toHeaderLower.includes('mailbox') ||
                    toHeaderLower.includes('buzon') ||
                    toHeaderLower.includes('vm@')) {
                    isVoicemail = true;
                    voicemailInfo = `To header indica buzón: ${toHeader}`;
                }
            }

            const statusCode = this._getSipStatusCode(response);
            const hasSdp = this._hasSdpBody(response);

            // Método 7: 183 con SDP sin timbrar previo (teléfono apagado / fuera de servicio)
            if (!isVoicemail && statusCode === 183 && hasSdp && !this.hasRung) {
                isVoicemail = true;
                voicemailInfo = '183 Session Progress con SDP sin 180 Ringing previo';
            }

            // Método 8: 183 con SDP después de timbrar (patrón común en buzón móvil Colombia)
            if (!isVoicemail && statusCode === 183 && hasSdp && this.hasRung) {
                isVoicemail = true;
                voicemailInfo = '183 Session Progress con SDP tras timbrar (posible buzón de voz)';
            }

            // Método 9: 200 OK tras 183 con SDP (conexión al buzón cuando el operador no envía headers)
            if (!isVoicemail && statusCode === 200 && this.received183WithSdp && this.hasRung) {
                isVoicemail = true;
                voicemailInfo = '200 OK tras 183 con SDP (conexión a buzón móvil)';
            }

            // Si se detectó buzón de voz
            if (isVoicemail) {
                this.voicemailDetected = true;

                const isImmediateVoicemail = !this.hasRung && !this.ringingDetected;
                const voicemailType = isImmediateVoicemail ? 'INMEDIATO' : 'DESPUÉS DE TIMBRAR';
                let voicemailTitle = isImmediateVoicemail
                    ? 'Teléfono apagado o fuera de servicio'
                    : 'No contestó - redirigido a buzón';
                let voicemailMessage = isImmediateVoicemail
                    ? 'La llamada fue al buzón sin timbrar. El teléfono puede estar apagado o fuera de cobertura.'
                    : 'El teléfono timbró y la llamada fue al buzón de voz. Puede dejar un mensaje o colgar.';

                if (!isImmediateVoicemail) {
                    this._stopRingback();
                }

                console.log('%c📬 [BUZÓN DE VOZ DETECTADO] Tipo: ' + voicemailType, 'background: #ff9800; color: white; font-weight: bold; padding: 5px 10px; border-radius: 5px; font-size: 14px;');
                console.log('%c   📋 Motivo: ' + voicemailInfo, 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');
                console.log('%c   📞 Número llamado: ' + (this.currentNumber || 'N/A'), 'background: #ffc107; color: black; padding: 3px 8px; border-radius: 3px; font-size: 12px;');

                if (this.config.debug_mode) {
                    console.log('   📋 hasRung:', this.hasRung);
                    console.log('   📋 ringingDetected:', this.ringingDetected);
                    console.log('   📋 received183WithSdp:', this.received183WithSdp);
                }

                this._playVoicemailAlert();
                this._showVoicemailNotification(voicemailTitle, voicemailMessage, isImmediateVoicemail);
            } else if (this.config.debug_mode) {
                console.log('📞 [Buzón de Voz] No detectado en esta respuesta');
            }

        } catch (error) {
            if (this.config.debug_mode) {
                console.warn('⚠️ [Buzón de Voz] Error al detectar buzón de voz:', error);
            }
        }
    }

    _showVoicemailNotification(title = null, message = null, isImmediate = false) {
        const displayTitle = title || 'Buzón de Voz Detectado';
        const displayMessage = message || 'La llamada ha sido redirigida al buzón de voz.';
        const accentColor = isImmediate ? '#dc3545' : '#ff9800';
        let notif = document.getElementById('voicemail-notification');

        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'voicemail-notification';
            notif.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, ${accentColor}, #f57c00);
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                min-width: 300px;
                animation: slideInRight 0.3s ease-out;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(notif);

            // Agregar animación CSS si no existe
            if (!document.getElementById('voicemail-notification-style')) {
                const style = document.createElement('style');
                style.id = 'voicemail-notification-style';
                style.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        notif.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 700; margin-bottom: 5px;">
                        <i class="fas fa-voicemail"></i> ${displayTitle}
                    </div>
                    <div style="font-size: 13px; opacity: 0.9;">
                        ${displayMessage}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
                        Puedes dejar un mensaje o colgar.
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.webrtcSoftphone?.continueVoicemailCall()" 
                            style="background: white; color: #ff9800; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        <i class="fas fa-microphone"></i> Continuar
                    </button>
                    <button onclick="window.webrtcSoftphone?.hangup()" 
                            style="background: #dc3545; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                        <i class="fas fa-phone-slash"></i> Colgar
                    </button>
                </div>
            </div>
        `;

        // Asegurar que esté visible
        notif.style.display = 'block';
        notif.style.visibility = 'visible';
        notif.style.opacity = '1';
        notif.style.zIndex = '99999';

        // Auto-ocultar después de 10 segundos si el usuario no interactúa
        setTimeout(() => {
            if (notif && document.body.contains(notif)) {
                notif.style.opacity = '0.7';
            }
        }, 10000);
    }

    _hideVoicemailNotification() {
        const notif = document.getElementById('voicemail-notification');
        if (notif) {
            notif.style.display = 'none';
        }
    }

    continueVoicemailCall() {
        // Continuar con la llamada al buzón de voz
        this._hideVoicemailNotification();
        if (this.config.debug_mode) {
            console.log('📞 [Buzón de Voz] Usuario decidió continuar con el buzón de voz');
        }
    }

    /* -------------------------------------------------------------
     * Utilidades
     * ------------------------------------------------------------- */
    _getIceServers() {
        // PRIORIDAD: Si estamos en red local (según la configuración), no usar STUN
        // Esto evita problemas de NAT hairpinning y mejora el rendimiento (evita audio entrecortado)
        // Verificamos esto PRIMERO para anular cualquier servidor STUN configurado si es local
        if (this.config.is_local_network === true) {
            if (this.config.debug_mode) {
                console.log('📡 [WebRTC] Modo LAN detectado (Prioridad Alta): Sin STUN (conexión directa)');
            }
            return []; // Array vacío = sin STUN, conexión directa
        }

        const normalizarIceUrl = (url) => {
            const value = String(url || '').trim();
            if (!value) return '';
            if (/^(stun|turn|turns):/i.test(value)) return value;
            return `stun:${value}`;
        };

        const normalizarIceServer = (server) => {
            if (typeof server === 'string') {
                const url = normalizarIceUrl(server);
                return url ? { urls: url } : null;
            }
            if (!server || typeof server !== 'object') return null;

            const normalized = Object.assign({}, server);
            if (Array.isArray(server.urls)) {
                normalized.urls = server.urls.map(normalizarIceUrl).filter(Boolean);
                return normalized.urls.length ? normalized : null;
            }

            const url = normalizarIceUrl(server.urls);
            if (!url) return null;
            normalized.urls = url;
            return normalized;
        };

        // Si hay servidores ICE configurados explícitamente y NO es local, usarlos
        if (this.config.iceServers && Array.isArray(this.config.iceServers) && this.config.iceServers.length) {
            const iceServers = this.config.iceServers.map(normalizarIceServer).filter(Boolean);
            if (this.config.debug_mode) {
                console.log('📡 [WebRTC] ICE servers normalizados:', iceServers);
            }
            return iceServers;
        }

        // Modo WAN: Usar STUN para atravesar NAT
        if (this.config.stun_server) {
            return [{ urls: normalizarIceUrl(this.config.stun_server) }];
        }

        // Fallback: STUN público de Google
        if (this.config.debug_mode) {
            console.log('📡 [WebRTC] Modo WAN: Usando STUN público');
        }
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
    _patchUriClone(uri) {
        if (!uri || typeof uri !== 'object') return uri;
        if (typeof uri.clone === 'function') return uri;
        const raw = uri.toString();
        uri.clone = () => SIP.UserAgent.makeURI(raw) || uri;
        return uri;
    }
    _extractCaller(inv) {
        try {
            const uri = inv.remoteIdentity?.uri;
            if (uri?.user) return uri.user;
            const h = inv.request?.headers?.From;
            const m = h && h.match(/sip:(\d+)@/);
            if (m && m[1]) return m[1];
        } catch (_) { }
        return null;
    }
    _showError(msg) {
        console.error('❌ Softphone:', msg);
        if (this.config.debug_mode) alert(msg);
    }

    // Stream silencioso cuando no hay micrófono disponible
    _createSilentAudioStream() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        const source = ctx.createBufferSource();
        source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); // silencio
        source.loop = true;
        source.connect(dest);
        source.start();
        return dest.stream;
    }
}

if (typeof window !== 'undefined') {
    window.WebRTCSoftphone = WebRTCSoftphone;
    window.webrtcSoftphone = null; // Se asignará cuando se instancie

    // Exponer métodos globalmente para que estén disponibles desde onclick
    // Estos métodos se asignarán cuando se cree la instancia
}
