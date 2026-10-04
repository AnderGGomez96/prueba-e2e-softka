# Prueba E2E — Flujo de compra en OpenCart

Las conclusiones de la prueba están en [conclusiones.md](conclusiones.md).

## Reto técnico

Prueba funcional automatizada (E2E) del flujo de compra en http://opencart.abstracta.us/ que cubre:

1. Agregar dos productos al carrito.
2. Visualizar el carrito.
3. Completar el checkout como invitado (Guest Checkout).
4. Finalizar la compra hasta la confirmación "Your order has been placed!".

Implementada con Playwright + TypeScript, patrón Screenplay y self-healing de locators.

## Instalación y uso

Requisitos: Node.js 22 o superior y npm.

```bash
npm install
copy .env.example .env          # Windows (Linux/macOS: cp .env.example .env)
npx playwright install --with-deps
npx playwright test
```

La suite corre en Chromium, Firefox y WebKit (proyectos `*-guest`) contra `E2E_BASE_URL`, definido en `.env`.

## Reportes y grabaciones

La ejecución genera reporte HTML, video y traza por prueba (activados por defecto):

- Reporte HTML: `npx playwright show-report` (abre `playwright-report/`; cada prueba incluye su video y su traza adjuntos).
- Videos: `test-results/**/videos/*.webm`.
- Trazas: `npx playwright show-trace test-results/**/trace.zip`.

## Self-healing (opcional)

El healer resuelve cada locator con una cadena de candidatos. Si todos fallan, consulta la caché y, como último recurso, un motor de IA. Sin API key configurada, el nivel de IA queda deshabilitado y la suite usa solo la cadena.

Para activarlo, completa el motor y su credencial en `.env`:

- `HEAL_ENGINE=chat` con `HEAL_LLM_API_KEY`, o
- `HEAL_ENGINE=systemone` con `HEAL_JEV_API_KEY`.

Para verlo en acción: cambia a propósito un candidato en `src/locators/home.locators.ts`, corre `npx playwright test` y revisa el reporte. La curación queda anotada en el test, el evento en `.healing/` y un parche en `patches/`.
