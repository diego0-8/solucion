<?php
/**
 * Configuración de Asterisk/Issabel para WebRTC Softphone
 * Optimizada para conexiones SEGURAS (WSS) vía puerto 8089
 * 
 * CONFIGURACIÓN:
 * - Puerto 8089: Puerto seguro estándar de Asterisk/Issabel (WSS)
 * - Protocolo WSS: Conexión segura WebSocket sobre SSL/TLS
 * 
 * REQUISITOS:
 * 1. El servidor debe tener certificado SSL válido para WSS
 * 2. El puerto 8089 debe estar abierto y escuchando en el servidor
 * 3. La ruta /ws debe estar configurada en http.conf del servidor
 */

// =====================================================================
// CONFIGURACIÓN DEL SERVIDOR
// =====================================================================

// Dominio o IP del PBX
define('ASTERISK_WSS_SERVER', 'pbx.tysbpo.com');
define('ASTERISK_SIP_DOMAIN', 'pbx.tysbpo.com');

// Puerto WebSocket Seguro (WSS) - 8089 (Puerto seguro estándar de Asterisk/Issabel)
// NOTA: Puerto 8089 es el puerto seguro (WSS) estándar de Asterisk/Issabel
// Este puerto requiere conexión segura (wss://) con certificado SSL válido
define('ASTERISK_WSS_PORT', '8089');

// Ruta del WebSocket (Estándar en Issabel/Asterisk es /ws)
define('ASTERISK_WSS_PATH', '/ws');

// Servidores STUN. El navegador exige el esquema stun: en RTCPeerConnection.
define('ASTERISK_STUN_SERVER', 'stun:stun.alphacron.de:3478');

// Modo Debug 
define('ASTERISK_DEBUG_MODE', true);

/**
 * Retorna la configuración de WebRTC como array para el Frontend
 * La URL completa del WebSocket se construye aquí
 */
function getWebRTCConfig()
{
    // Construir la URL completa usando wss:// (WebSocket Seguro) para puerto 8089
    // El puerto 8089 es el puerto seguro estándar que requiere WSS
    $wssUrl = 'wss://' . ASTERISK_WSS_SERVER . ':' . ASTERISK_WSS_PORT . ASTERISK_WSS_PATH;

    return [
        'wss_server' => $wssUrl,
        'sip_domain' => ASTERISK_SIP_DOMAIN,
        'wss_port' => ASTERISK_WSS_PORT,
        'wss_path' => ASTERISK_WSS_PATH,
        'iceServers' => [
            ['urls' => ASTERISK_STUN_SERVER]
        ],
        'debug_mode' => ASTERISK_DEBUG_MODE,
        'trace_sip' => true
    ];
}
?>