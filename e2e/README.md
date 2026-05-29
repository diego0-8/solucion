# Pruebas E2E con Playwright

## Requisitos

- Node.js 18+
- Base de datos con al menos un asesor y clientes en una base asignada al asesor

## Instalación

En la raíz del proyecto:

```bash
npm install
npx playwright install chromium
```

## Configuración

- **URL base:** por defecto `http://localhost/BancoW`. Para cambiar: `BASE_URL=http://tu-url npm run test`
- **Credenciales asesor:** variables de entorno `ASESOR_USUARIO` y `ASESOR_CONTRASENA`. Por defecto: `prueba1` / `Inicio2018`.
- **Cédulas:** el array `CEDULAS_PRUEBA` en `e2e/asesor-gestion.spec.js` debe contener 50 cédulas que existan y a las que el asesor tenga acceso. Con los datos de `banco12.sql` se repiten las 10 cédulas 5 veces.

## Ejecutar pruebas

```bash
# Todas las pruebas E2E
npm run test

# Solo el flujo asesor (50 iteraciones)
npm run test:e2e

# Con navegador visible
npm run test:headed
```

## Prueba principal

**asesor-gestion.spec.js** repite 50 veces:

1. Login en `login.php` (usuario y contraseña).
2. Clic en "Buscar Cliente" en el navbar.
3. Escribir una cédula del array de prueba y buscar.
4. Entrar al perfil del primer resultado.
5. En iteraciones impares: abrir "Agregar más información", añadir un nuevo teléfono y guardar.
6. Rellenar una nueva gestión: canal "Llamada saliente", Nivel 1 y 2, observaciones.
7. Clic en "Guardar Gestión".
8. Verificar que aparece un mensaje de éxito (alert o texto en página).

Al finalizar cada iteración se vuelve al dashboard para la siguiente búsqueda.
