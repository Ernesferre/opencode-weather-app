## Weather CLI APP

El objetivo de esta aplicación es que creemos una aplicación de consola que pida que ingresemos la ciudad, Al final, generaremos un binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.

## Stack

- Bun.js
- OpenMeteo

## Estructura del proyecto

- `src/index.ts`: punto de entrada y arranque del CLI.
- `src/actions/`: acciones de ciudades, clima, pronóstico y ajustes.
- `src/presentation/`: menú, entrada y salida de consola.
- `src/storage/`: gestión de ciudades y persistencia de configuración en un único JSON.
- `src/types/`: tipos y contratos compartidos.
- `src/api/`: geocodificación y consultas meteorológicas de Open-Meteo.
- `src/utils/`: formatos, constantes y colores.
- `tests/`: pruebas unitarias y de integración.

## Ejemplo de petición http:

1. Paso 1: Geocoding API.
2. Paso 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Inicializar proyecto

```bash
bun init
```

Este paso es solo para crear un proyecto nuevo. Para ejecutar este repositorio:

```bash
bun install --frozen-lockfile
bun run start
```

### Uso y datos guardados

- La opción 3 busca el primer resultado de Open-Meteo, muestra el país y las coordenadas y pide confirmación antes de agregarlo. Después muestra su temperatura actual.
- La primera ciudad agregada se convierte en default. La opción 5 permite cambiarla.
- Al eliminar la ciudad default, se selecciona la primera restante; si no quedan ciudades, no hay default.
- La opción 8 permite elegir °C o °F. Se conservan ciudades, default y unidad entre ejecuciones.
- La opción 6 permite seleccionar una ciudad guardada y ver el pronóstico de 7 días, incluyendo hoy en la zona horaria de la ciudad: estado del cielo, temperaturas mínima y máxima y probabilidad máxima diaria de precipitación. Usa la unidad configurada y no modifica los datos guardados. Puedes cancelar con 0.
- Los datos se guardan en `~/.weather-cli/settings.json` (en Windows, dentro de tu carpeta de usuario). Puedes cambiar la ruta con la variable `WEATHER_CLI_CONFIG`.
- Las consultas requieren conexión a internet. Si el archivo de configuración está corrupto, se muestra su ruta y la aplicación sale sin sobrescribirlo.

### Verificar y generar el ejecutable

```bash
bun run typecheck
bun test
bun run build
```

Las pruebas están en `tests/` y usan respuestas simuladas y archivos temporales; no requieren internet ni modifican tus ciudades guardadas.
`bun run check` ejecuta la comprobación de tipos y toda la suite. `bun run test:coverage` muestra la cobertura.
`bun run build` ejecuta primero `check`: si falla la comprobación de tipos o alguna prueba, termina con error sin compilar ni reemplazar el ejecutable anterior. Usa este comando para generar la aplicación, no `bun build` directamente.
La suite también comprueba este bloqueo y el caso exitoso en un proyecto temporal aislado.
El ejecutable se genera en `dist/weather` (en Windows, `dist/weather.exe`) para el sistema y arquitectura actuales. No necesita Bun instalado para ejecutarse.

En PowerShell:

```powershell
.\dist\weather.exe
```

### Ejemplo del menú
Esta es la apariencia que deseamos crear

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  6. Pronóstico de 7 días
  8. Ajustes (°C)
  9. Salir
════════════════════════════════════════
  Selecciona una opción: 5
```
