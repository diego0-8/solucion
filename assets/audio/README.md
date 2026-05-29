# Archivos de Audio para el Softphone

Esta carpeta contiene los archivos de audio usados por el softphone WebRTC (`assets/js/softphone-web.js`).

## Uso en el softphone

| Archivo | Uso |
|---------|-----|
| **ringtone.mp3** | Tono de llamada entrante (en loop). |
| **ringback.mp3** | Tono de espera (ringback) mientras suena la llamada saliente (en loop). |
| **edd call.mp3** | Sonido al colgar la llamada. |
| **DTMF_0.mp3** … **DTMF_9.mp3**, **DTMF_star.mp3**, **DTMF_pound.mp3** | Tonos DTMF al marcar cada dígito en el teclado. |
| **blip_click.mp3** | Sonido de tecla al marcar un dígito en el dialpad. |
| **blip1.mp3** | Sonido al borrar un dígito (botón eliminar). |
| **silkyalert.mp3** | Alerta cuando se detecta buzón de voz. |
| **2up2.mp3** | Sonido cuando la llamada se conecta (una vez por llamada). |
| **ring.mp3** | Reservado (alternativa a ringtone; no usado por defecto). |

## Formatos alternativos

En la carpeta pueden existir versiones **.wav** y **.ogg** de algunos archivos. El softphone usa por defecto los **.mp3** para máxima compatibilidad. Los .ogg están disponibles para navegadores que los prefieran; los .wav son opcionales (mayor tamaño).

## Requisitos

- **ringtone.mp3** y **ringback.mp3** son obligatorios para el comportamiento básico del softphone.
- El resto son opcionales: si falta un archivo, esa acción no reproducirá sonido pero el softphone seguirá funcionando.

## Ruta base

El softphone resuelve la ruta de los audios con `_getAudioBaseUrl()`, de modo que funcione desde cualquier vista del proyecto (p. ej. `index.php?action=asesor_gestionar`).

## Recomendaciones

- Duración de tonos en loop (ringtone, ringback): 2–4 segundos.
- Calidad: 128 kbps es suficiente para tonos.
- Los formatos .mp3 son los recomendados para compatibilidad.
