# Contexto del proyecto

- El README describe la aplicación deseada, no su estado actual: `index.ts` solo imprime `Hello via Bun!`. Aún no hay menú, peticiones a Open-Meteo ni persistencia de ciudades o ajustes.
- El flujo previsto de Open-Meteo está en el README: resolver la ciudad con Geocoding API y usar sus coordenadas en Forecast API. El menú de referencia está en español y usa las opciones 1–5, 8 y 9.

## Comandos desde la raíz

- Instalar dependencias: `bun install --frozen-lockfile` (el lockfile es `bun.lock`). El `bun init` del README es para inicializar, no para preparar este repositorio existente.
- Ejecutar el punto de entrada: `bun run index.ts`; no hay scripts en `package.json`.
- Verificar tipos con el compilador instalado: `bunx --no-install tsc --noEmit`. Ejecutar con Bun no sustituye esta comprobación.
- No hay pruebas ni configuración de lint, formato, CI o compilación de binarios todavía; no asumir que existen comandos para ellas.

## Configuración relevante

- TypeScript usa `module: Preserve`, resolución `bundler`, tipos de Bun y `noEmit`: `tsc` no genera el ejecutable que plantea el README.
- Además de `strict`, está activo `noUncheckedIndexedAccess`: los accesos a arrays o diccionarios pueden devolver `undefined`.
