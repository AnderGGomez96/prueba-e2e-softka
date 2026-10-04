# Conclusiones

## De qué iba la prueba

Se debía automatizar una compra completa en OpenCart: meter dos productos al carrito, verlo, pagar como invitado y llegar hasta el "Your order has been placed!". Se adjunta el reporte con video y traza queda en `playwright-report/index.html`.

## Por qué me quedé con Playwright

El enunciado pedía Serenity BDD como opción deseable. Terminé seleccionando Playwright por tres razones.

Primero, la velocidad. Playwright habla directo con el navegador y espera solo lo que tiene que esperar. Serenity va sobre Selenium, que hace más viajes y necesita esperas a mano. En números: unos 290 ms por acción contra 536 ms, y suites hasta un 45 % más rápidas. En una corrida no se nota. En cien, sí.

Segundo, la evidencia. Playwright ya trae reporte HTML, video y Trace Viewer de fábrica. Nada que instalar.

Y tercero, la configuración. Chromium, Firefox y WebKit vienen incluidos, y con `projects` defines navegador, viewport o dispositivo en un par de líneas. En Serenity eso es más complejo.

Eso sí: no abandoné Screenplay. Es el patrón estrella de Serenity y lo mantuve. Actores con su habilidad `BrowseTheWeb`, tareas como `AddProductToCart` o `FormBilling`, preguntas como `Visible` o `Checked`, y los locators guardados como datos. El spec se lee como una historia; el framework hace el trabajo sucio.

## Self-healing

La idea es simple: que la suite no se caiga cuando la página cambie y es algo que ya venía trabajando en otros proyectos y quise incluirlo.

Funciona como una escalera. Primero prueba el locator principal; si falla, sus alternativas. Si ninguna funciona, mira una caché de curaciones viejas. Y si tampoco, ahí sí, despierta a la IA: le manda una foto de la página y le pide un locator nuevo.

Cada curación deja rastro: una anotación en el test, un evento en `.healing/`, un parche en `patches/` y el candidato guardado en caché. Para que no se emocione, tiene límites: cuántas curaciones por prueba y qué nivel mínimo de confianza acepta. Y si no hay API key, la IA se queda dormida y todo sigue funcionando con la cadena y la caché.

## Lo que me costó

El sitio es de terceros y a veces va lento. Los timeouts de fábrica se quedaban cortos, así que subí el de cada prueba a 90 segundos, el de cada candidato a 10, y dejé la suite en un solo worker para no saturarlo.

Después apareció el selector de región del checkout. Cambias el país y la lista se recarga por AJAX. Si alcanzabas a elegir la región antes de que llegara la respuesta, tu selección desaparecía. ¿El formulario? Inválido. Lo arreglé esperando la respuesta del servidor antes de tocar el select.



## Para cerrar

La prueba cubre el flujo completo y pasa en Chromium, Firefox y WebKit. Playwright me da velocidad y evidencia lista para mostrar, y Screenplay mantuvo el caso legible. El self-healing es un buen colchón para cuando el sitio cambie, pero con límites y ojo humano, porque la IA a veces se equivoca con mucha seguridad. ¿Lo más frágil? El sitio de terceros. 
