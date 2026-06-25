// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Verifica que el buscador del modal "Clientes de la Base" NO borre la cédula
 * mientras el usuario escribe (regresión: mostrarClientesEnModal limpiaba el input).
 *
 * Requiere: COORD_USUARIO, COORD_CONTRASENA y opcionalmente COORD_BASE_ID (id numérico de una base con clientes).
 */
const USUARIO = process.env.COORD_USUARIO || process.env.COORDINADOR_USUARIO;
const CONTRASENA = process.env.COORD_CONTRASENA || process.env.COORDINADOR_CONTRASENA;
const BASE_ID = process.env.COORD_BASE_ID;

test.describe('Coord_gestion - modal Clientes de la Base', () => {
  test.skip(!USUARIO || !CONTRASENA, 'Defina COORD_USUARIO y COORD_CONTRASENA para ejecutar esta prueba.');

  test('el buscador conserva la cédula escrita tras la búsqueda en servidor', async ({ page }) => {
    await page.goto('/index.php?action=login');
    await page.getByLabel(/usuario/i).fill(USUARIO);
    await page.getByLabel(/contraseña/i).fill(CONTRASENA);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL(/coordinador/);

    await page.goto('/index.php?action=coordinador_gestion');
    await page.waitForLoadState('networkidle').catch(() => {});

    if (BASE_ID) {
      await page.evaluate(function(id) {
        if (typeof verClientesBase === 'function') {
          verClientesBase(Number(id), 'Base prueba E2E');
        }
      }, BASE_ID);
    } else {
      const btnVerClientes = page.locator('button[title="Ver Clientes"], button:has-text("Ver Clientes")').first();
      await btnVerClientes.waitFor({ state: 'visible', timeout: 15000 });
      await btnVerClientes.click();
    }

    const modal = page.locator('#modal-ver-clientes');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const input = page.locator('#modal-ver-clientes-busqueda');
    await input.waitFor({ state: 'visible' });

    await expect(page.locator('#modal-clientes-tbody tr')).not.toHaveText(/Cargando clientes/i, { timeout: 15000 });

    const cedulaPrueba = '1012345678';
    await input.fill(cedulaPrueba);

    await expect(input).toHaveValue(cedulaPrueba);

    // Esperar debounce de búsqueda en servidor (400ms) + respuesta
    await page.waitForTimeout(800);
    await expect(input).toHaveValue(cedulaPrueba);

    await page.waitForResponse(
      (resp) => resp.url().includes('obtener_clientes_base') && resp.url().includes('busqueda='),
      { timeout: 10000 }
    ).catch(() => {});

    await page.waitForTimeout(500);
    await expect(input).toHaveValue(cedulaPrueba);
  });
});
