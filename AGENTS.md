# Contexto del proyecto

- `index.ts` inicia `src/cli.ts`; `src/weather.ts` encapsula las dos APIs de Open-Meteo y `src/storage.ts` guarda ciudades, default y unidad. El menú del README está en español y usa las opciones 1–5, 8 y 9.
- La búsqueda toma el primer resultado de Geocoding API y pide confirmación antes de guardarlo; Forecast API recibe sus coordenadas y la unidad seleccionada.
- La primera ciudad se convierte en default; eliminar la default selecciona la primera restante o deja `null` si la lista queda vacía.

## Comandos desde la raíz

- Instalar dependencias: `bun install --frozen-lockfile` (el lockfile es `bun.lock`). El `bun init` del README es para inicializar, no para preparar este repositorio existente.
- Ejecutar: `bun run start`. Verificar: `bun run typecheck` y `bun test`; ejecutar con Bun no sustituye la comprobación de tipos.
- Prueba enfocada: `bun test src/weather.test.ts`. Las pruebas simulan la red y usan archivos temporales; no requieren servicios externos.
- Compilar: `bun run build` genera `dist/weather` (`dist/weather.exe` en Windows) para la plataforma actual. No hay configuración de lint, formato ni CI.

## Persistencia

- La configuración vive en `~/.weather-cli/settings.json`, no junto al código o ejecutable. `WEATHER_CLI_CONFIG` permite cambiarla; úsala para verificaciones manuales sin tocar datos reales.
- Una configuración inválida impide el arranque sin sobrescribir el archivo. El CLI actualiza su estado solo después de guardar correctamente.

## Configuración relevante

- TypeScript usa `module: Preserve`, resolución `bundler`, tipos de Bun y `noEmit`: `tsc` no genera el ejecutable que plantea el README.
- Además de `strict`, está activo `noUncheckedIndexedAccess`: los accesos a arrays o diccionarios pueden devolver `undefined`.
