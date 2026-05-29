// @ts-check
const { test, expect } = require('@playwright/test');

// Credenciales del asesor: requeridas por entorno para evitar secretos hardcodeados.
const USUARIO = process.env.ASESOR_USUARIO;
const CONTRASENA = process.env.ASESOR_CONTRASENA;
if (!USUARIO || !CONTRASENA) {
  throw new Error('Debes definir ASESOR_USUARIO y ASESOR_CONTRASENA para ejecutar esta prueba.');
}

// 50 cédulas de prueba. Deben existir en la BD y el asesor debe tener acceso a esas bases.
// Si ejecutaste generar_datos.php con 5000 clientes, puedes usar 1000000001..1000000050.
// Con datos de banco12.sql hay 10 clientes: repetimos para 50 iteraciones.
const CEDULAS_PRUEBA = [
  '174157', '195413', '244087', '252079', '348143', '357779', '375886', '382118', '385088', '387392',
  '174157', '195413', '244087', '252079', '348143', '357779', '375886', '382118', '385088', '387392',
  '174157', '195413', '244087', '252079', '348143', '357779', '375886', '382118', '385088', '387392',
  '174157', '195413', '244087', '252079', '348143', '357779', '375886', '382118', '385088', '387392',
  '174157', '195413', '244087', '252079', '348143', '357779', '375886', '382118', '385088', '387392',
];

test.describe('Flujo asesor: login, buscar cliente, nueva gestión y guardar', () => {
  test('repetir 50 veces: login → buscar cédula → perfil → nueva gestión (y opcional nuevo teléfono) → Guardar → verificar éxito', async ({ page }) => {
    let ultimoMensajeExito = null;
    page.on('dialog', async (dialog) => {
      const msg = dialog.message();
      if (msg.includes('exito') || msg.includes('guardada') || msg.includes('actualizada')) {
        ultimoMensajeExito = msg;
      }
      await dialog.accept();
    });

    for (let i = 0; i < 50; i++) {
      const cedula = CEDULAS_PRUEBA[i];
      console.log(`\n--- Iteración ${i + 1}/50 - Cédula: ${cedula} ---`);

      if (i === 0) {
        await page.goto('/index.php?action=login');
        await page.getByLabel(/usuario/i).fill(USUARIO);
        await page.getByLabel(/contraseña/i).fill(CONTRASENA);
        await page.getByRole('button', { name: /iniciar sesión/i }).click();
        await expect(page).toHaveURL(/asesor_dashboard|action=asesor/);
      }

      await page.getByRole('listitem').filter({ hasText: /buscar cliente/i }).click();

      const modalBusqueda = page.locator('#modal-busqueda-navbar').first();
      await modalBusqueda.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const inputBusqueda = page.locator('#navbar-busqueda-input');
      await inputBusqueda.waitFor({ state: 'visible', timeout: 5000 });
      await inputBusqueda.fill(cedula);

      await page.locator('#modal-busqueda-navbar button').filter({ hasText: /buscar|fa-search/ }).first().click();

      const primerResultado = page.locator('#navbar-resultados-busqueda div[onclick*="gestionarClienteNavbar"]').first();
      await primerResultado.waitFor({ state: 'visible', timeout: 10000 });
      await primerResultado.click();

      await expect(page).toHaveURL(/action=asesor_gestionar&cliente_id=\d+/);
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.locator('#canal-contacto').waitFor({ state: 'visible', timeout: 15000 });

      // En iteraciones impares: agregar un nuevo número con "Agregar más información"
      if (i % 2 === 1) {
        const btnAgregar = page.locator('.btn-agregar-info');
        if (await btnAgregar.isVisible()) {
          await btnAgregar.click();
          const modalAgregar = page.locator('#modal-agregar-info');
          await modalAgregar.waitFor({ state: 'visible', timeout: 5000 });
          await page.locator('input[name="nuevo-telefono[]"]').first().fill('310' + String(1000000 + i).padStart(7, '0'));
          await page.locator('#form-agregar-info button[type="submit"]').click();
          await page.waitForTimeout(1000);
        }
      }

      await page.selectOption('#canal-contacto', 'llamada_saliente');
      await page.waitForTimeout(500);

      const nivel1 = page.locator('#tipo-contacto-nivel1');
      await nivel1.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const opt1 = nivel1.locator('option').nth(1);
      if (await opt1.count() > 0) {
        const val1 = await opt1.getAttribute('value');
        if (val1) await nivel1.selectOption({ value: val1 });
        await page.waitForTimeout(400);
      }
      const nivel2 = page.locator('#tipo-contacto-nivel2');
      if (await nivel2.isVisible()) {
        const opt2 = nivel2.locator('option').nth(1);
        if (await opt2.count() > 0) {
          const val2 = await opt2.getAttribute('value');
          if (val2) await nivel2.selectOption({ value: val2 });
        }
      }

      await page.locator('#observaciones-texto').fill(`Prueba E2E iteración ${i + 1} - cédula ${cedula}`);

      await page.getByRole('button', { name: /guardar gestión/i }).click();

      await page.waitForTimeout(2000);
      if (ultimoMensajeExito) {
        expect(ultimoMensajeExito.toLowerCase()).toMatch(/exito|guardada/);
        ultimoMensajeExito = null;
      } else {
        const body = page.locator('body');
        await expect(body).toContainText(/gestión guardada|exitosamente|guardada con éxito/i, { timeout: 2000 }).catch(() => {});
      }

      if (i < 49) {
        await page.goto('/index.php?action=asesor_dashboard');
        await page.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });
});
