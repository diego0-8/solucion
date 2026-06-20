<?php
require_once __DIR__ . '/../config.php';
$fecha_min_volver_llamar = (new DateTimeImmutable('now', new DateTimeZone('America/Bogota')))->format('Y-m-d');
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Gestionar Cliente - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link rel="stylesheet" href="assets/css/common.css">
    <link rel="stylesheet" href="assets/css/admin-dashboard.css">
    <link rel="stylesheet" href="assets/css/coordinador-dashboard.css">
    <link rel="stylesheet" href="assets/css/asesor_gestionar.css">
</head>

<body data-user-id="<?php echo $_SESSION['usuario_id'] ?? ''; ?>">

    <?php
    // Incluir navbar compartido
    $action = 'asesor_gestionar';
    include __DIR__ . '/Navbar.php';
    ?>

    <div class="gestion-container container-fluid">

        <!-- Contenido principal en tres columnas (Bootstrap grid) -->
        <div class="row g-3">

            <!-- COLUMNA 1: INFORMACIÓN DEL CLIENTE Y CONTRATOS -->
            <div class="col-12 col-md-4 columna-uno">
                <!-- Información del Cliente -->
                <div class="seccion-info-cliente">
                    <h3><i class="fas fa-user"></i> Información del Cliente</h3>
                    <div class="cliente-detalles">
                        <div class="cliente-datos-lista">
                            <div class="cliente-dato">
                                <span class="dato-label"><i class="fas fa-id-card"></i> Cédula:</span>
                                <span id="cliente-cedula">Cargando...</span>
                            </div>
                            <div class="cliente-dato">
                                <span class="dato-label"><i class="fas fa-user"></i> Nombre:</span>
                                <span id="cliente-nombre-completo">Cargando...</span>
                            </div>
                            <div class="cliente-dato">
                                <span class="dato-label"><i class="fas fa-map-marker-alt"></i> Ciudad:</span>
                                <span id="cliente-ciudad">-</span>
                            </div>
                            <div class="cliente-dato" id="cliente-email-container" style="display: none;">
                                <span class="dato-label"><i class="fas fa-envelope"></i> Correo:</span>
                                <span id="cliente-email">-</span>
                            </div>
                            <div class="cliente-dato cliente-dato-telefonos">
                                <div class="telefonos-cliente" id="telefonos-cliente">
                                    <span>Cargando...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Obligaciones -->
                <div class="seccion-contratos">
                    <h3 id="contratos-titulo"><i class="fas fa-file-invoice-dollar"></i> Obligaciones</h3>
                    <div id="obligaciones-totales" class="obligaciones-totales" style="display: none;">
                        <div class="total-linea">
                            <span class="total-label">Saldo capital (suma)</span>
                            <span id="obligaciones-sum-total" class="total-valor">$0</span>
                        </div>
                        <div class="total-linea">
                            <span class="total-label">Total obligación (suma)</span>
                            <span id="obligaciones-sum-total-pagar" class="total-valor">$0</span>
                        </div>
                    </div>
                    <div class="contratos-container" id="contratos-container">
                        <div class="cargando-contratos">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Cargando obligaciones...</p>
                        </div>
                    </div>
                </div>

                <!-- Botón agregar información -->
                <button class="btn-agregar-info">
                    <i class="fas fa-plus"></i> Agregar más información
                </button>

            </div>

            <!-- COLUMNA 2: ÁRBOL DE TIPIFICACIÓN -->
            <div class="col-12 col-md-4 columna-dos">
                <div class="seccion-tipificacion">
                    <h3><i class="fas fa-sitemap"></i> Perfilación del cliente</h3>
                    <div class="tipificacion-form">
                        <div class="form-group">
                            <label><i class="fas fa-phone-alt"></i> Canal de Contacto:</label>
                            <select id="canal-contacto">
                                <option value="">Selecciona una opción</option>
                                <option value="llamada_saliente">Llamada saliente</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                                <option value="recibir_llamada">Recibir llamada</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-file-invoice"></i> Obligación a Gestionar: <small
                                    style="color: #666;">(Opcional - Si no selecciona ninguna, se guardará como
                                    "Ninguna")</small></label>
                            <select id="contrato-gestionar">
                                <option value="">Selecciona una factura (opcional)</option>
                                <option value="ninguna">Ninguna (Cliente no quiso pagar ninguna)</option>
                                <!-- Las facturas se cargarán dinámicamente -->
                            </select>
                            <div id="acuerdo-todas-obligaciones-subseleccion-wrap" style="display: none; margin-top: 12px; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px; background: #fafbfc;">
                                <label style="display: block; font-weight: 600; margin-bottom: 6px;"><i class="fas fa-check-double"></i> Obligaciones a incluir en esta gestión</label>
                                <p style="margin: 0 0 8px; font-size: 12px; color: #666;">Con <strong>ACUERDO DE PAGO</strong>, <strong>Todas las obligaciones</strong> y <strong>3 o más</strong> obligaciones: desmarque las que no desee gestionar. Deben quedar <strong>al menos 2</strong> marcadas para guardar.</p>
                                <p style="margin: 0 0 8px; font-size: 12px;">
                                    <a href="#" id="acuerdo-subseleccion-marcar-todas" style="margin-right: 12px;">Marcar todas</a>
                                    <a href="#" id="acuerdo-subseleccion-desmarcar-todas">Desmarcar todas</a>
                                </p>
                                <div id="acuerdo-todas-obligaciones-checkboxes" style="display: flex; flex-direction: column; gap: 8px;"></div>
                            </div>
                        </div>
                        <div class="form-group" id="nivel1-container" style="display: none;">
                            <label><i class="fas fa-tag"></i> Nivel 1 - Clasificación:</label>
                            <select id="tipo-contacto-nivel1">
                                <option value="">Primero selecciona el Canal de Contacto</option>
                            </select>
                        </div>
                        <!-- Nivel 2 - Visible solo si hay selección en Nivel 1 (tipificación termina aquí) -->
                        <div class="form-group" id="nivel2-container" style="display: none;">
                            <label><i class="fas fa-tag"></i> Nivel 2 - Clasificación:</label>
                            <select id="tipo-contacto-nivel2">
                                <option value="">Primero selecciona el Nivel 1</option>
                            </select>
                        </div>
                        <div class="form-group" id="campos-volver-llamar-programacion" style="display: none;">
                            <label><i class="fas fa-clock"></i> Volver a llamar — fecha y hora</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                                <label style="margin: 0;">Fecha:</label>
                                <input type="date" id="volver-llamar-fecha" min="<?php echo htmlspecialchars($fecha_min_volver_llamar, ENT_QUOTES, 'UTF-8'); ?>" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <label style="margin: 0;">Hora:</label>
                                <input type="time" id="volver-llamar-hora" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #666;">Solo puede elegir hoy o una fecha futura; la hora debe ser posterior al momento actual (hora Colombia).</p>
                        </div>
                        <!-- Campos para ACUERDO DE PAGO (general): Cuota, Cuota actual, Fecha de pago -->
                        <div class="form-group" id="campos-fecha-valor" style="display: none;">
                            <label><i class="fas fa-money-bill-wave"></i> Datos del acuerdo (pesos):</label>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 110px; margin: 0;">Cuota:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                        <input type="text" id="cuota-pago" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 110px; margin: 0;">Cuota actual:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                        <input type="text" id="cuota-actual" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 110px; margin: 0;">Fecha de pago:</label>
                                    <input type="date" id="fecha-pago" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" min="">
                                </div>
                            </div>
                            <p class="texto-ayuda-acuerdo" style="margin: 8px 0 0; font-size: 12px; color: #666;">Debe seleccionar un <strong>Número de obligación</strong> (Obligación a gestionar) arriba.</p>
                        </div>
                        
                        <div id="acuerdo-formulario-unico-wrap">
                        <!-- Campos específicos para ACUERDO PAGO TOTAL -->
                        <div class="form-group" id="campos-acuerdo-pago-total" style="display: none;">
                            <label><i class="fas fa-handshake"></i> Datos del acuerdo de pago total:</label>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Saldo a pagar:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                        <input type="text" id="saldo-a-pagar" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Descuento Aplicado:</label>
                                    <div style="flex: 1; display: flex; gap: 8px;">
                                        <div style="position: relative; flex: 1;">
                                            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                            <input type="text" id="descuento-monto" placeholder="Monto" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                        </div>
                                        <span style="align-self: center; color: #666;">o</span>
                                        <div style="position: relative; flex: 1;">
                                            <input type="text" id="descuento-porcentaje" placeholder="%" style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #ddd; border-radius: 4px; text-align: right;" inputmode="numeric">
                                            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600; pointer-events: none;">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Total a Pagar:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #28a745; font-weight: 700;">$</span>
                                        <input type="text" id="total-a-pagar-acuerdo" placeholder="0" readonly style="width: 100%; padding: 8px 8px 8px 30px; border: 2px solid #28a745; border-radius: 4px; background: #f8f9fa; font-weight: 600; color: #28a745;">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Fecha Límite:</label>
                                    <input type="date" id="fecha-limite-acuerdo" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" min="">
                                </div>
                            </div>
                            <p class="texto-ayuda-acuerdo-total" style="margin: 8px 0 0; font-size: 12px; color: #666;">Pago único en corto plazo. El total se calcula automáticamente aplicando el descuento.</p>
                        </div>
                        
                        <!-- Cuotas manuales para ACUERDO A LARGO PLAZO -->
                        <div class="form-group" id="campos-acuerdo-largo-plazo" style="display: none;">
                            <label><i class="fas fa-list-ol"></i> Acuerdo a largo plazo por cuotas</label>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 160px; margin: 0;">Monto a financiar:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                        <input type="text" id="simulador-monto" placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 160px; margin: 0;">Número de cuotas:</label>
                                    <select id="simulador-num-cuotas" style="flex: 1; max-width: 180px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <?php for ($i = 1; $i <= 10; $i++) : ?>
                                        <option value="<?= $i ?>"<?= $i === 2 ? ' selected' : '' ?>><?= $i ?></option>
                                        <?php endfor; ?>
                                    </select>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 160px; margin: 0;">Valor primera cuota:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #28a745; font-weight: 700;">$</span>
                                        <input type="text" id="simulador-valor-cuota" readonly placeholder="0" style="width: 100%; padding: 8px 8px 8px 30px; border: 2px solid #28a745; border-radius: 4px; background: #f8f9fa; font-weight: 600; color: #28a745;">
                                    </div>
                                </div>
                                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #495057;">
                                    <i class="fas fa-pen-to-square" aria-hidden="true"></i> Detalle por cuota (valor y fecha)
                                </p>
                                <p style="margin: 0 0 8px; font-size: 12px; color: #666;">
                                    Al cambiar <strong>Número de cuotas</strong> se muestran automáticamente tantos bloques como cuotas elija (de 1 a 10). Complete el valor en pesos y la fecha de cada una.
                                </p>
                                <div id="acuerdo-cuotas-detalle"
                                    style="display: flex; flex-direction: column; gap: 10px;"
                                    role="region"
                                    aria-live="polite"
                                    aria-label="Campos de valor y fecha según número de cuotas"></div>
                            </div>
                            <p class="texto-ayuda-largo-plazo" style="margin: 8px 0 0; font-size: 12px; color: #666;">Debe seleccionar un <strong>Número de obligación</strong> arriba. Cada cuota debe tener valor y fecha de pago.</p>
                        </div>
                        
                        <!-- Flujo de aprobación para ACUERDO APROBADO POR COMITÉ -->
                        <div class="form-group" id="campos-acuerdo-aprobado-comite" style="display: none;">
                            <label><i class="fas fa-clipboard-check"></i> Acuerdo Aprobado por Comité</label>
                            <p style="margin: 0 0 12px 0; font-size: 12px; color: #666;">Esta opción implica una excepción a la regla.</p>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Monto propuesto:</label>
                                    <div style="position: relative; flex: 1;">
                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">$</span>
                                        <input type="text" id="acuerdo-comite-monto-propuesto" placeholder="Valor que el cliente puede pagar" style="width: 100%; padding: 8px 8px 8px 30px; border: 1px solid #ddd; border-radius: 4px;" inputmode="numeric">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="min-width: 140px; margin: 0;">Estado de aprobación:</label>
                                    <select id="acuerdo-comite-estado" style="flex: 1; max-width: 220px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="pendiente">Pendiente</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="rechazado">Rechazado</option>
                                    </select>
                                </div>
                            </div>
                            <p class="texto-ayuda-comite" style="margin: 8px 0 0; font-size: 12px; color: #666;">Flujo de aprobación. Debe seleccionar un <strong>Número de obligación</strong> arriba.</p>
                        </div>
                        </div><!-- #acuerdo-formulario-unico-wrap -->

                        <div class="form-group" id="acuerdos-multi-obligacion-wrap" style="display: none;">
                            <label><i class="fas fa-layer-group"></i> Acuerdo por obligación</label>
                            <p style="margin: 0 0 10px; font-size: 12px; color: #666;">
                                Con <strong>varias obligaciones</strong> y nivel 2 <strong>ACUERDO PAGO TOTAL</strong>, <strong>ACUERDO A LARGO PLAZO</strong> o <strong>ACUERDO APROBADO COMITÉ</strong>: un bloque por obligación según el selector y, si aplica, la subselección de obligaciones arriba. El árbol de tipificación (canal y niveles) es único.
                            </p>
                            <div id="acuerdos-multi-obligacion" style="display: flex; flex-direction: column; gap: 14px;"></div>
                        </div>
                        
                    </div>
                </div>

                <!-- Observaciones y Comentarios -->
                <div class="seccion-observaciones">
                    <h3><i class="fas fa-comment-dots"></i> Observaciones y Comentarios</h3>
                    <p class="instrucciones">Documente las interacciones y seguimientos pertinentes</p>
                    <div class="observaciones-detalladas">
                        <label>Observaciones Detalladas:</label>
                        <textarea id="observaciones-texto" rows="10"
                            placeholder="Describe detalladamente el resultado de la gestión, acuerdos, próximos pasos, objeciones del cliente, etc."></textarea>
                    </div>
                </div>
            </div>

            <!-- COLUMNA 3: SOFTPHONE Y CANALES -->
            <div class="col-12 col-md-4 columna-tres">
                <!-- Softphone WebRTC - Solo visible para asesores con extensión -->
                <?php
                // Obtener datos del usuario desde la base de datos para verificar extensión
                require_once __DIR__ . '/../models/Usuario.php';
                $usuario_model = new Usuario();

                // Intentar obtener el usuario de múltiples formas
                $usuario_data = false;
                $identificador_usado = '';

                // Método 1: Por cédula desde sesión
                if (!empty($_SESSION['usuario_cedula'])) {
                    $identificador_usado = $_SESSION['usuario_cedula'];
                    $usuario_data = $usuario_model->obtenerPorCedula($identificador_usado);
                    if ($usuario_data && defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
                        error_log("DEBUG Softphone - Usuario encontrado por usuario_cedula: " . $identificador_usado);
                    }
                }

                // Método 2: Por usuario_id (que también es la cédula según AuthController)
                if (!$usuario_data && !empty($_SESSION['usuario_id'])) {
                    $identificador_usado = $_SESSION['usuario_id'];
                    $usuario_data = $usuario_model->obtenerPorCedula($identificador_usado);
                    if ($usuario_data && defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
                        error_log("DEBUG Softphone - Usuario encontrado por usuario_id: " . $identificador_usado);
                    }
                }

                // DEBUG: Verificar datos obtenidos
                if (defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
                    error_log("DEBUG Softphone - Variables de sesión:");
                    error_log("  - usuario_cedula: " . ($_SESSION['usuario_cedula'] ?? 'NO DEFINIDA'));
                    error_log("  - usuario_id: " . ($_SESSION['usuario_id'] ?? 'NO DEFINIDA'));
                    error_log("  - usuario_rol: " . ($_SESSION['usuario_rol'] ?? 'NO DEFINIDO'));

                    if ($usuario_data) {
                        error_log("DEBUG Softphone - Usuario encontrado:");
                        error_log("  - Cédula: " . ($usuario_data['cedula'] ?? 'NO DEFINIDA'));
                        error_log("  - Extension: " . ($usuario_data['extension_telefono'] ?? $usuario_data['extension'] ?? 'NO DEFINIDA'));
                        error_log("  - Clave Extension: " . (!empty($usuario_data['clave_extension'] ?? '') ? 'DEFINIDA (' . strlen($usuario_data['clave_extension']) . ' caracteres)' : 'VACIA'));
                        error_log("  - SIP Password (legacy): " . (!empty($usuario_data['sip_password'] ?? '') ? 'DEFINIDA (' . strlen($usuario_data['sip_password']) . ' caracteres)' : 'VACIA'));
                    } else {
                        error_log("DEBUG Softphone - ERROR: Usuario NO encontrado");
                        error_log("  - Intentó con: " . ($identificador_usado ?: 'NINGUNO'));
                    }
                }

                // Verificar que el usuario sea asesor Y tenga extensión y clave SIP asignadas
                // Prioridad: extension_telefono y clave_extension (nuevos campos), luego extension y sip_password (legacy)
                $extension_telefono = is_array($usuario_data) ? ($usuario_data['extension_telefono'] ?? $usuario_data['extension'] ?? '') : '';
                $clave_extension = is_array($usuario_data) ? ($usuario_data['clave_extension'] ?? $usuario_data['sip_password'] ?? '') : '';
                
                $mostrar_softphone = (
                    isset($_SESSION['usuario_rol']) &&
                    $_SESSION['usuario_rol'] === 'asesor' &&
                    $usuario_data &&
                    !empty($extension_telefono) &&
                    !empty($clave_extension)
                );

                // DEBUG: Verificar resultado de mostrar_softphone
                if (defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
                    error_log("DEBUG Softphone - Mostrar softphone: " . ($mostrar_softphone ? 'SI' : 'NO'));
                    error_log("DEBUG Softphone - Rol: " . ($_SESSION['usuario_rol'] ?? 'NO DEFINIDO'));
                }

                if ($mostrar_softphone):
                    ?>
                    <div class="seccion-softphone-wrapper" style="margin-bottom: 20px;">
                        <div id="webrtc-softphone" class="webrtc-softphone-panel inline"></div>
                    </div>
                <?php endif; ?>

                <!-- Canales de Comunicación -->
                <div class="seccion-canales">
                    <h3><i class="fas fa-broadcast-tower"></i> Canales de Comunicación Autorizados</h3>
                    <p class="instrucciones">Seleccione los canales autorizados por la empresa para futuras
                        comunicaciones</p>
                    <div class="canales-lista">
                        <div class="canal-item">
                            <input type="checkbox" id="canal-llamada">
                            <label for="canal-llamada">
                                <i class="fas fa-phone"></i>
                                Llamada Telefónica
                            </label>
                        </div>
                        <div class="canal-item">
                            <input type="checkbox" id="canal-whatsapp">
                            <label for="canal-whatsapp">
                                <i class="fab fa-whatsapp"></i>
                                WhatsApp
                            </label>
                        </div>
                        <div class="canal-item">
                            <input type="checkbox" id="canal-email">
                            <label for="canal-email">
                                <i class="fas fa-envelope"></i>
                                Correo Electrónico
                            </label>
                        </div>
                        <div class="canal-item">
                            <input type="checkbox" id="canal-sms">
                            <label for="canal-sms">
                                <i class="fas fa-sms"></i>
                                SMS
                            </label>
                        </div>
                        <div class="canal-item">
                            <input type="checkbox" id="canal-correo">
                            <label for="canal-correo">
                                <i class="fas fa-mail-bulk"></i>
                                Correo Físico
                            </label>
                        </div>
                        <div class="canal-item">
                            <input type="checkbox" id="canal-mensajeria">
                            <label for="canal-mensajeria">
                                <i class="fas fa-comments"></i>
                                Mensajería por Aplicaciones
                            </label>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Botones de acción principales -->
        <div class="action-buttons" id="action-buttons-container"
            style="display: flex; gap: 15px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <!-- Botones de acción (siempre visibles; Siguiente cliente solo si hay tarea y clientes pendientes) -->
            <div id="botones-iniciales" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <button class="btn-action btn-primary" onclick="guardarGestion()">
                    <i class="fas fa-save"></i> Guardar Gestión
                </button>
                <button class="btn-action btn-primary" id="btn-siguiente-cliente" onclick="irSiguienteCliente()"
                    style="display: none;" title="Ir al siguiente cliente de la tarea">
                    <i class="fas fa-arrow-right"></i> Siguiente cliente
                </button>
                <button class="btn-action btn-secondary" onclick="volverTareas()">
                    <i class="fas fa-tasks"></i> Volver a Tareas
                </button>
                <button class="btn-action btn-success" onclick="irDashboard()">
                    <i class="fas fa-home"></i> Ir al Dashboard
                </button>
            </div>
        </div>

        <!-- Historial de gestiones (ancho completo) -->
        <div class="seccion-historial-full">
            <h3><i class="fas fa-history"></i> Historial de Gestiones</h3>
            <div id="historial-container">
                <div class="historial-vacio">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando historial...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Tiempo de Sesión -->
    <div id="modal-tiempo-sesion"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center;">
        <div
            style="background: white; padding: 30px; border-radius: 15px; min-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #00c0e1;">
                    <i class="fas fa-clock"></i> Tiempo de Sesión
                </h3>
                <button onclick="toggleTiempoModal()"
                    style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <span style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Hora Actual</span>
                    <span id="reloj-activo" style="font-size: 20px; font-weight: 700; color: #00c0e1;">--:-- --</span>
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <span style="display: block; margin-bottom: 5px; color: #666; font-size: 13px;">Tiempo de
                        Sesión</span>
                    <span id="tiempo-sesion" style="font-size: 20px; font-weight: 700; color: #28a745;">00:00:00</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="btn-pausa" onclick="iniciarPausaBreak()"
                        style="padding: 12px; background: #ffc107; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-coffee"></i> Break
                    </button>
                    <button id="btn-almuerzo" onclick="iniciarPausaAlmuerzo()"
                        style="padding: 12px; background: #fd7e14; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-utensils"></i> Almuerzo
                    </button>
                    <button id="btn-bano" onclick="iniciarPausaBano()"
                        style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-toilet"></i> Baño
                    </button>
                    <button id="btn-mantenimiento" onclick="iniciarPausaMantenimiento()"
                        style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-tools"></i> Mantenimiento
                    </button>
                    <button id="btn-pausa-activa" onclick="iniciarPausaActiva()"
                        style="padding: 12px; background: #20c997; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-running"></i> Pausa Activa
                    </button>
                    <button id="btn-actividad-extra" onclick="iniciarActividadExtra()"
                        style="padding: 12px; background: #6610f2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-stopwatch"></i> Actividad Extra
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Pausa (cuando está en pausa) -->
    <div id="modal-pausa"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
            <i class="fas fa-clock" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">En Pausa</h3>
            <p style="margin: 0 0 20px 0; color: #666;" id="tipo-pausa-texto">Break de 30 minutos</p>
            <div style="font-size: 32px; font-weight: 700; color: #00c0e1; margin-bottom: 20px;">
                <span class="tiempo-pausa">30:00</span>
            </div>
            <button onclick="mostrarModalVerificacion()" class="btn btn-primary"
                style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-play"></i> Continuar Trabajo
            </button>
        </div>
    </div>

    <!-- Modal de Verificación de Contraseña -->
    <div id="modal-verificacion-contrasena"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10002; justify-content: center; align-items: center;">
        <div
            style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <i class="fas fa-lock" style="font-size: 48px; color: #00c0e1; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">Verificación de Contraseña</h3>
            <p style="margin: 0 0 20px 0; color: #666;">Ingrese su contraseña para reanudar la sesión</p>

            <div style="margin-bottom: 20px; text-align: left;">
                <label for="input-contrasena-verificacion"
                    style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">Contraseña:</label>
                <input type="password" id="input-contrasena-verificacion" placeholder="Ingrese su contraseña"
                    style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                    onkeypress="if(event.key === 'Enter') verificarContrasena();">
            </div>

            <div id="mensaje-error-verificacion"
                style="display: none; background: #f8d7da; color: #721c24; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px;">
                Contraseña incorrecta. Intentos restantes: <span id="intentos-restantes">3</span>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="verificarContrasena()" class="btn btn-primary"
                    style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Verificar
                </button>
                <button onclick="cerrarModalVerificacion()" class="btn btn-secondary"
                    style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal de Actividad Extra (cronómetro) -->
    <div id="modal-actividad-extra"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; justify-content: center; align-items: center;">
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
            <i class="fas fa-stopwatch" style="font-size: 48px; color: #6610f2; margin-bottom: 20px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333;">Actividad Extra</h3>
            <p style="margin: 0 0 20px 0; color: #666;">En progreso...</p>
            <div style="font-size: 32px; font-weight: 700; color: #00c0e1; margin-bottom: 20px;">
                <span id="tiempo-actividad-extra">00:00:00</span>
            </div>
            <button onclick="finalizarActividadExtra()" class="btn btn-primary"
                style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-stop"></i> Finalizar Actividad
            </button>
        </div>
    </div>

    <!-- Modal de Búsqueda de Cliente -->
    <div id="modal-busqueda-cliente"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10003; justify-content: center; align-items: center;">
        <div
            style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #00c0e1;">
                    <i class="fas fa-search"></i> Buscar Cliente
                </h3>
                <button onclick="cerrarModalBusqueda()"
                    style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label for="busqueda-cliente-input"
                    style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">CC o Celular:</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="busqueda-cliente-input" placeholder="Ingrese CC o celular..."
                        style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                        onkeypress="if(event.key === 'Enter') buscarClienteDesdeModal();">
                    <button onclick="buscarClienteDesdeModal()"
                        style="padding: 12px 20px; background: #00c0e1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>

            <!-- Resultados de búsqueda -->
            <div id="resultados-busqueda-cliente"
                style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px; background: #f8f9fa;">
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-search"></i>
                    <p>Ingrese CC o celular para buscar</p>
                </div>
            </div>
        </div>
    </div>

    <?php
    // Cache busting para asegurar que el navegador cargue los JS actualizados
    $v_nav = @filemtime(__DIR__ . '/../assets/js/navbar-busqueda-cliente.js') ?: (defined('APP_VERSION') ? APP_VERSION : time());
    $v_gestionar = @filemtime(__DIR__ . '/../assets/js/asesor-gestionar.js') ?: (defined('APP_VERSION') ? APP_VERSION : time());
    $v_tiempos = @filemtime(__DIR__ . '/../assets/js/asesor-tiempos.js') ?: (defined('APP_VERSION') ? APP_VERSION : time());
    $v_hybrid = @filemtime(__DIR__ . '/../assets/js/hybrid-updater.js') ?: (defined('APP_VERSION') ? APP_VERSION : time());
    ?>
    <script src="assets/js/navbar-busqueda-cliente.js?v=<?php echo urlencode((string)$v_nav); ?>"></script>
    <script src="assets/js/asesor-gestionar.js?v=<?php echo urlencode((string)$v_gestionar); ?>"></script>
    <script src="assets/js/asesor-tiempos.js?v=<?php echo urlencode((string)$v_tiempos); ?>"></script>
    <script src="assets/js/hybrid-updater.js?v=<?php echo urlencode((string)$v_hybrid); ?>"></script>
    <script src="assets/js/header-recordatorios-asesor.js?v=<?php echo urlencode((string) APP_VERSION); ?>"></script>

    <script>
        // Función para abrir/cerrar modal de tiempo
        function toggleTiempoModal() {
            const modalTiempo = document.getElementById('modal-tiempo-sesion');
            const modalPausa = document.getElementById('modal-pausa');

            // Si está en pausa, mostrar el modal de pausa en vez del de tiempo
            if (window.asesorTiemposGlobal && window.asesorTiemposGlobal.estaPausado) {
                if (modalPausa) {
                    modalPausa.style.display = 'flex';
                }
                // No abrir el modal de tiempo si está en pausa
                return;
            }

            // Si no está en pausa, mostrar el modal de tiempo normal
            if (modalTiempo) {
                modalTiempo.style.display = modalTiempo.style.display === 'none' ? 'flex' : 'none';
            }
        }

        // Funciones globales para los botones de pausa
        function iniciarPausaBreak() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('break');
            }
        }

        function iniciarPausaAlmuerzo() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('almuerzo');
            }
        }

        function finalizarPausa() {
            if (window.asesorTiempos) {
                window.asesorTiempos.finalizarPausa();
            }
        }

        // Variables para la verificación de contraseña
        let intentosVerificacion = 3;

        function mostrarModalVerificacion() {
            const modal = document.getElementById('modal-verificacion-contrasena');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('input-contrasena-verificacion').value = '';
                document.getElementById('mensaje-error-verificacion').style.display = 'none';
                intentosVerificacion = 3;
                document.getElementById('intentos-restantes').textContent = '3';
            }
        }

        function cerrarModalVerificacion() {
            const modal = document.getElementById('modal-verificacion-contrasena');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        async function verificarContrasena() {
            const contrasena = document.getElementById('input-contrasena-verificacion').value;
            const mensajeError = document.getElementById('mensaje-error-verificacion');
            const intentosRestantes = document.getElementById('intentos-restantes');

            if (!contrasena) {
                alert('Por favor ingrese su contraseña');
                return;
            }

            try {
                const response = await fetch('index.php?action=verificar_contrasena', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contrasena: contrasena
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Contraseña correcta, cerrar modal de verificación
                    cerrarModalVerificacion();

                    // Finalizar la pausa
                    if (window.asesorTiempos) {
                        window.asesorTiempos.finalizarPausa();
                    }

                    intentosVerificacion = 3;
                } else {
                    // Contraseña incorrecta
                    intentosVerificacion--;

                    if (intentosVerificacion > 0) {
                        mensajeError.style.display = 'block';
                        intentosRestantes.textContent = intentosVerificacion;
                        document.getElementById('input-contrasena-verificacion').value = '';
                    } else {
                        alert('Demasiados intentos fallidos. La cuenta será bloqueada temporalmente por seguridad.');
                        window.location.href = 'index.php?action=logout';
                    }
                }
            } catch (error) {
                console.error('Error al verificar contraseña:', error);
                alert('Error al verificar la contraseña. Por favor intente nuevamente.');
            }
        }

        function iniciarPausaBano() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('bano');
            }
        }

        function iniciarPausaMantenimiento() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('mantenimiento');
            }
        }

        function iniciarPausaActiva() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarPausa('pausa_activa');
            }
        }

        function iniciarActividadExtra() {
            if (window.asesorTiempos) {
                window.asesorTiempos.iniciarActividadExtra();
            }
        }

        function finalizarActividadExtra() {
            if (window.asesorTiempos) {
                window.asesorTiempos.finalizarActividadExtra();
            }
        }

        // Después de guardar: solo mostrar botón "Siguiente cliente" si tiene tarea y le faltan clientes por gestionar
        function mostrarBotonesDespuesGuardar() {
            console.log('[SiguienteCliente] mostrarBotonesDespuesGuardar() llamado');
            setTimeout(verificarSiguienteCliente, 200);
        }

        function puedeCambiarCliente() {
            const canalContactoEl = document.getElementById('canal-contacto');
            const canalContactoValor = canalContactoEl ? String(canalContactoEl.value || '').trim() : '';
            if (!canalContactoValor) {
                return true;
            }
            if (window.gestionGuardadaCorrectamente !== true) {
                alert('Debe guardar correctamente la gestión actual antes de cambiar de cliente.');
                return false;
            }
            if (typeof window.bloquearCambioClientePorGestionPendiente === 'function' &&
                window.bloquearCambioClientePorGestionPendiente()) {
                alert('Cambió el número de contacto y hay datos de perfilación diligenciados. Debe guardar la gestión antes de cambiar de cliente.');
                return false;
            }
            return true;
        }

        window.testReglasCambioCliente = function() {
            const resultados = [];
            const canal = document.getElementById('canal-contacto');
            const telefono = document.getElementById('telefono-select');
            const observaciones = document.getElementById('observaciones-texto');
            if (!canal || !telefono || !observaciones) {
                console.error('[TEST] No se encontraron elementos requeridos para la prueba.');
                return [];
            }

            const estadoOriginal = {
                canal: canal.value,
                telefono: telefono.value,
                observaciones: observaciones.value,
                gestionGuardada: window.gestionGuardadaCorrectamente,
                ultimoNumero: window.ultimaGestionGuardadaNumeroContacto
            };

            const registrar = function(nombre, esperado) {
                const obtenido = puedeCambiarCliente();
                const ok = obtenido === esperado;
                resultados.push({ nombre, esperado, obtenido, ok });
                console.log(`[TEST] ${ok ? 'OK' : 'FAIL'} - ${nombre} | esperado=${esperado} obtenido=${obtenido}`);
            };

            // Caso 1: canal sin seleccionar -> SI debe dejar cambiar
            canal.value = '';
            window.gestionGuardadaCorrectamente = false;
            window.ultimaGestionGuardadaNumeroContacto = '';
            registrar('Canal vacio permite cambio', true);

            // Caso 2: canal seleccionado y no guardado -> NO debe dejar cambiar
            canal.value = 'whatsapp';
            window.gestionGuardadaCorrectamente = false;
            registrar('Canal seleccionado sin guardar bloquea cambio', false);

            // Caso 3: guardado, cambio de telefono, con perfilacion -> NO debe dejar cambiar
            window.gestionGuardadaCorrectamente = true;
            window.ultimaGestionGuardadaNumeroContacto = '3001112233';
            telefono.value = '3009998877';
            observaciones.value = 'Perfilacion pendiente de guardado';
            registrar('Cambio telefono con perfilacion pendiente bloquea', false);

            // Caso 4: guardado, mismo telefono -> SI debe dejar cambiar
            telefono.value = '3001112233';
            registrar('Mismo telefono despues de guardar permite', true);

            // Restaurar estado original
            canal.value = estadoOriginal.canal;
            telefono.value = estadoOriginal.telefono;
            observaciones.value = estadoOriginal.observaciones;
            window.gestionGuardadaCorrectamente = estadoOriginal.gestionGuardada;
            window.ultimaGestionGuardadaNumeroContacto = estadoOriginal.ultimoNumero;

            return resultados;
        };

        async function verificarSiguienteCliente() {
            const btn = document.getElementById('btn-siguiente-cliente');
            if (!btn) return;
            if (window.gestionGuardadaCorrectamente !== true) {
                btn.style.display = 'none';
                return;
            }
            const params = new URLSearchParams(window.location.search);
            const clienteId = params.get('cliente_id') || (typeof window.clienteId !== 'undefined' ? window.clienteId : '');
            if (!clienteId) {
                btn.style.display = 'none';
                return;
            }
            try {
                const url = 'index.php?action=obtener_siguiente_cliente&cliente_id=' + encodeURIComponent(clienteId);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    credentials: 'same-origin',
                    cache: 'no-store'
                });
                const raw = await response.text();
                let data = {};
                try {
                    data = JSON.parse(raw);
                } catch (e) {
                    console.warn('[SiguienteCliente] respuesta no JSON:', raw.substring(0, 250));
                    btn.style.display = 'none';
                    return;
                }

                const idSiguiente = data.cliente && (data.cliente.ID_CLIENTE ?? data.cliente.id_cliente);
                console.log('[SiguienteCliente] respuesta:', data, 'idSiguiente=', idSiguiente, 'clienteActual=', clienteId);

                if (data.success && data.cliente && idSiguiente && String(idSiguiente) !== String(clienteId)) {
                    btn.style.display = 'inline-flex';
                    btn.style.visibility = 'visible';
                    btn.title = 'Siguiente: ' + (data.cliente['NOMBRE CONTRATANTE'] || data.cliente.nombre || '');
                } else {
                    btn.style.display = 'none';
                }
            } catch (error) {
                console.error('[SiguienteCliente] error al verificar:', error);
                btn.style.display = 'none';
            }
        }

        async function irSiguienteCliente() {
            if (!puedeCambiarCliente()) {
                return;
            }
            const params = new URLSearchParams(window.location.search);
            const clienteIdActual = params.get('cliente_id') || (typeof window.clienteId !== 'undefined' ? window.clienteId : '');
            try {
                const url = 'index.php?action=obtener_siguiente_cliente' + (clienteIdActual ? '&cliente_id=' + encodeURIComponent(clienteIdActual) : '');
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                const idSiguiente = data.cliente && (data.cliente.ID_CLIENTE ?? data.cliente.id_cliente);
                if (data.success && data.cliente && idSiguiente) {
                    window.location.href = 'index.php?action=asesor_gestionar&cliente_id=' + idSiguiente;
                } else {
                    alert('No hay más clientes pendientes por gestionar');
                }
            } catch (error) {
                console.error('Error al obtener siguiente cliente:', error);
                alert('Error al obtener el siguiente cliente');
            }
        }

        function mostrarBusquedaCliente() {
            const modal = document.getElementById('modal-busqueda-cliente');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('busqueda-cliente-input').value = '';
                document.getElementById('resultados-busqueda-cliente').innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <i class="fas fa-search"></i>
                        <p>Ingrese CC o celular para buscar</p>
                    </div>
                `;
            }
        }

        function cerrarModalBusqueda() {
            const modal = document.getElementById('modal-busqueda-cliente');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        async function buscarClienteDesdeModal() {
            const termino = document.getElementById('busqueda-cliente-input').value.trim();
            const resultadosDiv = document.getElementById('resultados-busqueda-cliente');

            if (!termino) {
                alert('Por favor ingrese CC o celular');
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
                const response = await fetch('index.php?action=buscar_cliente_asesor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        termino: termino,
                        criterio: 'mixto'
                    })
                });

                const data = await response.json();

                if (data.success && data.clientes && data.clientes.length > 0) {
                    let html = '';
                    data.clientes.forEach(comercio => {
                        const comercioId = comercio.ID_COMERCIO || comercio.id || comercio.ID_CLIENTE;
                        const nombreCliente = comercio.nombre || comercio['NOMBRE CONTRATANTE'] || comercio.NOMBRE_CLIENTE || 'N/A';
                        const cc = comercio.cc || comercio.IDENTIFICACION || 'N/A';
                        const celular = comercio.CEL || comercio['TEL 1'] || comercio.cel || 'N/A';

                        html += `
                            <div style="padding: 15px; border-bottom: 1px solid #dee2e6; cursor: pointer;" 
                                 onclick="gestionarClienteDesdeModal('${comercioId}')">
                                <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                    ${nombreCliente}
                                </div>
                                <div style="font-size: 13px; color: #666;">
                                    <div>CC: ${cc}</div>
                                    <div>Celular: ${celular}</div>
                                </div>
                            </div>
                        `;
                    });
                    resultadosDiv.innerHTML = html;
                } else {
                    resultadosDiv.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: #dc3545;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>No se encontraron clientes</p>
                            <small>Verifique el CC o celular ingresado</small>
                        </div>
                    `;
                }

            } catch (error) {
                console.error('Error al buscar cliente:', error);
                resultadosDiv.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al buscar cliente</p>
                        <small>Intente nuevamente</small>
                    </div>
                `;
            }
        }

        function gestionarClienteDesdeModal(clienteId) {
            if (!puedeCambiarCliente()) {
                return;
            }
            cerrarModalBusqueda();
            // Redirigir a la vista de gestión (recarga la página)
            window.location.href = `index.php?action=asesor_gestionar&cliente_id=${clienteId}`;
        }

        function volverClientes() {
            window.location.href = 'index.php?action=asesor_dashboard#tab-clientes';
        }

        if (typeof window.gestionarClienteNavbar === 'function') {
            const gestionarClienteNavbarOriginal = window.gestionarClienteNavbar;
            window.gestionarClienteNavbar = function(clienteId) {
                if (!puedeCambiarCliente()) {
                    return;
                }
                gestionarClienteNavbarOriginal(clienteId);
            };
        }

        // Función global para ser llamada desde asesor-gestionar.js después de guardar
        window.mostrarBotonesDespuesGuardar = mostrarBotonesDespuesGuardar;
    </script>

    <!-- WebRTC Softphone Integration -->
    <?php
    if ($mostrar_softphone):
        $config_path = __DIR__ . '/../config/asterisk.php';
        if (file_exists($config_path)) {
            if (function_exists('opcache_invalidate')) {
                opcache_invalidate($config_path, true);
            }
            require_once $config_path;
        } else {
            error_log('[SOFTPHONE ERROR] No se encontró config/asterisk.php');
            $mostrar_softphone = false;
        }

        if ($mostrar_softphone && (!defined('ASTERISK_SIP_DOMAIN') || !defined('ASTERISK_WSS_SERVER'))) {
            error_log('[SOFTPHONE ERROR] Constantes Asterisk no definidas en config/asterisk.php');
            $mostrar_softphone = false;
        }

        if ($mostrar_softphone):
        $webrtc_config = getWebRTCConfig();

        if (defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
            error_log('[SOFTPHONE DEBUG] Configuración obtenida:');
            error_log('  - sip_domain: ' . ($webrtc_config['sip_domain'] ?? 'NO DEFINIDO'));
            error_log('  - wss_server: ' . ($webrtc_config['wss_server'] ?? 'NO DEFINIDO'));
        }

        $extension = is_array($usuario_data)
            ? ($usuario_data['extension_telefono'] ?? $usuario_data['extension'] ?? $_SESSION['usuario_extension'] ?? '')
            : ($_SESSION['usuario_extension'] ?? '');
        $sip_password = is_array($usuario_data)
            ? ($usuario_data['clave_extension'] ?? $usuario_data['sip_password'] ?? $_SESSION['usuario_sip_password'] ?? '')
            : ($_SESSION['usuario_sip_password'] ?? '');
        $sip_password = trim($sip_password);

        $is_local_network = empty($webrtc_config['iceServers']) ||
                           (is_array($webrtc_config['iceServers']) && count($webrtc_config['iceServers']) === 0);

        if (defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
            error_log('[SOFTPHONE DEBUG] Estado de credenciales SIP: ' . (!empty($sip_password) ? 'DEFINIDA' : 'VACIA'));
        }
        ?>
        <link rel="stylesheet" href="assets/css/softphone-web.css">
        <script src="https://cdn.jsdelivr.net/npm/sip.js@0.21.2/dist/sip.min.js"></script>
        <script src="assets/js/softphone-web.js"></script>
        <script>
            // Configuración del softphone
            <?php
            if (defined('ASTERISK_DEBUG_MODE') && ASTERISK_DEBUG_MODE) {
                error_log('[SOFTPHONE DEBUG] ASTERISK_SIP_DOMAIN definido: ' . (defined('ASTERISK_SIP_DOMAIN') ? ASTERISK_SIP_DOMAIN : 'NO DEFINIDO'));
                error_log('[SOFTPHONE DEBUG] webrtc_config[sip_domain]: ' . ($webrtc_config['sip_domain'] ?? 'NO DEFINIDO'));
                error_log('[SOFTPHONE DEBUG] webrtc_config[wss_server]: ' . ($webrtc_config['wss_server'] ?? 'NO DEFINIDO'));
            }
            ?>
            const webrtcConfig = {
                wss_server: '<?php echo $webrtc_config['wss_server']; ?>',
                sip_domain: '<?php echo $webrtc_config['sip_domain']; ?>',
                extension: '<?php echo htmlspecialchars($extension, ENT_QUOTES, 'UTF-8'); ?>',
                password: '<?php echo addslashes($sip_password); ?>', // Usar addslashes en lugar de htmlspecialchars para contraseñas
                display_name: '<?php echo htmlspecialchars($_SESSION['usuario_nombre'] ?? 'Asesor', ENT_QUOTES, 'UTF-8'); ?>',
                preferredRtpPort: <?php echo (int) ($webrtc_config['preferred_rtp_port'] ?? 10000); ?>,
                iceServers: <?php
                $iceServers = $webrtc_config['iceServers'] ?? [];
                if (!is_array($iceServers) || empty($iceServers)) {
                    $iceServers = [];
                }
                echo json_encode($iceServers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                ?>,
                is_local_network: <?php echo $is_local_network ? 'true' : 'false'; ?>,
                debug_mode: <?php echo $webrtc_config['debug_mode'] ? 'true' : 'false'; ?>
            };

            if (webrtcConfig.debug_mode) {
                console.log('[WebRTC Softphone] Configuracion inicial:', {
                    extension_definida: !!(webrtcConfig.extension && webrtcConfig.extension.trim() !== ''),
                    password_definida: !!(webrtcConfig.password && webrtcConfig.password.trim() !== ''),
                    wss_server: webrtcConfig.wss_server || 'VACIO',
                    sip_domain: webrtcConfig.sip_domain || 'VACIO',
                    debug_mode: webrtcConfig.debug_mode
                });
            }

            // Verificar que los valores críticos no estén vacíos
            if (!webrtcConfig.extension || webrtcConfig.extension.trim() === '') {
                console.error('❌ [ERROR CRÍTICO] La extensión está vacía. Verifica la base de datos.');
            }
            if (!webrtcConfig.password || webrtcConfig.password.trim() === '') {
                console.error('❌ [ERROR CRÍTICO] La contraseña SIP está vacía. Verifica la base de datos.');
            }
            if (!webrtcConfig.wss_server || webrtcConfig.wss_server.trim() === '') {
                console.error('❌ [ERROR CRÍTICO] El servidor WSS está vacío. Verifica config/asterisk.php');
            }
            if (!webrtcConfig.sip_domain || webrtcConfig.sip_domain.trim() === '') {
                console.error('❌ [ERROR CRÍTICO] El dominio SIP está vacío. Verifica config/asterisk.php');
            }

            // Esperar a que TANTO SIP.js COMO softphone-web.js estén cargados
            function inicializarSoftphoneConVerificacion() {
                let intentos = 0;
                const maxIntentos = 100;

                const intervalo = setInterval(function () {
                    intentos++;

                    // Verificar que TODO esté listo
                    const sipjsListo = typeof SIP !== 'undefined' &&
                        typeof SIP.UserAgent !== 'undefined';

                    const softphoneListo = typeof WebRTCSoftphone !== 'undefined';

                    if (sipjsListo && softphoneListo) {
                        clearInterval(intervalo);
                        console.log('✅ Todos los componentes listos, inicializando softphone...');

                        try {
                            // Verificar que el contenedor existe
                            const container = document.getElementById('webrtc-softphone');
                            if (!container) {
                                console.warn('⚠️ [WebRTC Softphone] Contenedor del softphone no encontrado. El usuario puede no tener extensión asignada.');
                                return;
                            }

                            // Verificar configuración antes de inicializar
                            console.log('🔄 [WebRTC Softphone] Inicializando softphone...');
                            console.log('📝 [WebRTC Softphone] Verificando configuración:', {
                                extension: webrtcConfig.extension || 'VACIA',
                                password: webrtcConfig.password ? 'DEFINIDA' : 'VACIA',
                                wss_server: webrtcConfig.wss_server,
                                sip_domain: webrtcConfig.sip_domain,
                                debug_mode: webrtcConfig.debug_mode
                            });

                            // Validar que la extensión y password no estén vacías
                            if (!webrtcConfig.extension || webrtcConfig.extension.trim() === '') {
                                console.error('❌ [WebRTC Softphone] Error: Extension está vacía');
                                alert('Error: La extensión SIP no está configurada. Contacta al administrador.');
                                return;
                            }

                            if (!webrtcConfig.password || webrtcConfig.password.trim() === '') {
                                console.error('❌ [WebRTC Softphone] Error: Password está vacía');
                                alert('Error: La contraseña SIP no está configurada. Contacta al administrador.');
                                return;
                            }

                            window.webrtcSoftphone = new WebRTCSoftphone(webrtcConfig);
                            console.log('✅ [WebRTC Softphone] Softphone WebRTC inicializado correctamente');
                            console.log('📞 [WebRTC Softphone] Extensión:', webrtcConfig.extension);

                            // Función para verificar estado (útil para debugging)
                            window.verificarEstadoSoftphone = function () {
                                if (window.webrtcSoftphone) {
                                    console.log('📊 [WebRTC Softphone] Estado actual:', {
                                        extension: window.webrtcSoftphone.config.extension,
                                        sip_domain: window.webrtcSoftphone.config.sip_domain,
                                        wss_server: window.webrtcSoftphone.config.wss_server,
                                        isRegistered: window.webrtcSoftphone.isRegistered,
                                        isConnected: window.webrtcSoftphone.isConnected,
                                        status: window.webrtcSoftphone.status,
                                        transportState: window.webrtcSoftphone.userAgent?.transport?.state,
                                        registrationState: window.webrtcSoftphone.userAgent?.registration?.state
                                    });
                                } else {
                                    console.warn('⚠️ [WebRTC Softphone] El softphone no está inicializado');
                                }
                            };

                            console.log('💡 [WebRTC Softphone] Tip: Ejecuta verificarEstadoSoftphone() en la consola para ver el estado actual');

                        } catch (error) {
                            console.error('❌ [WebRTC Softphone] Error al inicializar softphone:', error);
                            console.error('❌ [WebRTC Softphone] Stack:', error.stack);
                            if (webrtcConfig.debug_mode) {
                                alert('Error al inicializar el softphone: ' + error.message);
                            }
                        }

                    } else {
                        if (intentos % 10 === 0) {
                            console.log(`⏳ Esperando componentes... (${intentos}/${maxIntentos})`);
                            console.log('  SIP.js listo:', sipjsListo);
                            console.log('  WebRTCSoftphone listo:', softphoneListo);
                        }

                        if (intentos >= maxIntentos) {
                            clearInterval(intervalo);
                            console.error('❌ Timeout esperando componentes del softphone');
                            if (webrtcConfig.debug_mode) {
                                alert('El softphone no se pudo inicializar. Por favor, recarga la página.');
                            }
                        }
                    }
                }, 100);
            }

            // Iniciar cuando el DOM esté listo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', inicializarSoftphoneConVerificacion);
            } else {
                inicializarSoftphoneConVerificacion();
            }

            // Función global para llamar desde click-to-call
            function llamarDesdeWebRTC(numero) {
                if (typeof window.webrtcSoftphone !== 'undefined' &&
                    window.webrtcSoftphone !== null &&
                    window.webrtcSoftphone.callNumber) {
                    window.webrtcSoftphone.callNumber(numero);
                } else {
                    console.warn('Softphone no disponible. Por favor, espera a que se inicialice.');
                }
            }
        </script>
    <?php
        endif;
    endif;
    ?>

</body>

</html>