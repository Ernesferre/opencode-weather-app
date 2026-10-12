# Revisión Weather CLI

- [x] **Colores:** cyan (menú), amarillo (temp), verde/rojo (ok/error); sin colores al redirigir la salida o definir `NO_COLOR`.
- [ ] **AGENTS.md:** dice que `index.ts` es stub, pero la app ya funciona — hay que actualizarlo.
- [ ] **Ciudades:** geocoding solo trae 1 resultado; nombres ambiguos pueden fallar.
- [ ] **Tests:** no existen; conviene al menos probar storage y las APIs con mocks.
- [ ] **Binario:** compila bien; revisar que `./weather` guarde datos en `~/.config/weather-cli/`.
- [ ] **Escalabilidad:** ¿qué tan fácil será expandir con nuevas funcionalidades?
- [ ] **Carga:** ¿hay estado de carga en las tareas asíncronas?
- [ ] **7 day forecast:** agregar la posibilidad de obtener el pronostico del clima para los proximos 7 dias.
