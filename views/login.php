<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>BancoW - Iniciar Sesión</title>
    <link rel="stylesheet" href="assets/css/login.css">
</head>
<body class="login-page">
    <div class="login-layout">
        <div class="login-card">
            <!-- Lado izquierdo: logo T&S en burbuja + imagen personas -->
            <div class="visual-side">
                <div class="welcome-bubble">
                    <img src="img/tys-Photoroom.png" alt="T&S Company" class="welcome-bubble-img">
                </div>
                <img src="img/personas_banco_w.png" alt="personas" class="visual-logo">
            </div>

            <!-- Lado derecho: formulario -->
            <div class="form-side">
                <img src="img/logo-Banco.png" alt="BancoW" class="form-logo">

                <?php if (isset($error)): ?>
                    <div class="login-alert">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="index.php?action=login">
                    <div class="field-group">
                        <label class="field-label" for="usuario">Usuario</label>
                        <input type="text"
                               id="usuario"
                               name="usuario"
                               class="field-input"
                               placeholder="Usuario o correo"
                               required
                               value="<?php echo htmlspecialchars($_POST['usuario'] ?? ''); ?>"
                               autocomplete="username">
                    </div>

                    <div class="field-group">
                        <label class="field-label" for="contrasena">Contraseña</label>
                        <input type="password"
                               id="contrasena"
                               name="contrasena"
                               class="field-input"
                               placeholder="Contraseña"
                               required
                               autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn-signin">Iniciar sesión</button>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
