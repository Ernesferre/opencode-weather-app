// Preload para reproducir la ejecución de las pruebas en una terminal con colores.
process.stdout.isTTY = true;
delete process.env.NO_COLOR;
process.env.TERM = "xterm";
