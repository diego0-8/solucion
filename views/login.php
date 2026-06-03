<?php require_once __DIR__ . '/../config.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php include __DIR__ . '/partials/favicon.php'; ?>
    <title>Soluciona - Iniciar sesión</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="assets/css/login.css">
</head>
<body class="login-page">
    <div class="login-layout">
        <div class="visual-side">
            <svg class="visual-curve" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
                <path class="visual-curve-shadow" d="M0,0 C55,180 35,420 90,500 C35,580 55,820 0,1000 L95,1000 L95,0 Z"/>
                <path class="visual-curve-main" d="M0,0 C48,160 32,400 85,500 C32,600 48,840 0,1000 L88,1000 L88,0 Z"/>
            </svg>
            <div class="visual-content">
                <img src="img/tys-Photoroom.png" alt="T&amp;S Company" class="visual-brand-logo">
                <h1 class="visual-title">Soluciona</h1>
                <p class="visual-subtitle">Gestión de relaciones con el cliente</p>
                <p class="visual-description">Bienvenido de nuevo. Ingrese sus credenciales para acceder al sistema.</p>
            </div>
        </div>

        <div class="form-side">
            <div class="form-container">
                <h2 class="form-title">Iniciar sesión en Soluciona</h2>

                <?php if (isset($error)): ?>
                    <div class="login-alert" role="alert">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="index.php?action=login" class="login-form">
                    <div class="field-group">
                        <label class="sr-only" for="usuario">Usuario</label>
                        <div class="input-wrap">
                            <i class="fa-solid fa-envelope input-icon" aria-hidden="true"></i>
                            <input type="text"
                                   id="usuario"
                                   name="usuario"
                                   class="field-input"
                                   placeholder="Usuario o correo"
                                   required
                                   value="<?php echo htmlspecialchars($_POST['usuario'] ?? ''); ?>"
                                   autocomplete="username">
                        </div>
                    </div>

                    <div class="field-group">
                        <label class="sr-only" for="contrasena">Contraseña</label>
                        <div class="input-wrap">
                            <i class="fa-solid fa-lock input-icon" aria-hidden="true"></i>
                            <input type="password"
                                   id="contrasena"
                                   name="contrasena"
                                   class="field-input"
                                   placeholder="Contraseña"
                                   required
                                   autocomplete="current-password">
                        </div>
                    </div>

                    <button type="submit" class="btn-signin">Iniciar sesión</button>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
