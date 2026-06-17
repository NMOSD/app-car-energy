# App Car Energy

PWA móvil para registrar cargas de coches eléctricos y generar reportes.

## Funcionalidades

- Registrar estaciones de carga: nombre, ubicación, coste mensual y método de precio (fijo/variable).
- Registrar sesiones de carga con nivel inicial, nivel final y fecha.
- Guardar datos locales en el navegador para uso offline.
- Generar reportes por rango de fecha y estación.
- Exportar reportes como TXT o JSON.
- Guardar reportes descargados para recuperar desde la app.
- Servicio worker con actualización automática cada 5 minutos.

## Recomendaciones de exportación

- PDF: recomendable para distribución profesional y archivo.
- Email: compartir texto o PDF directamente con la información de la sesión.
- JSON: guardar una copia que pueda importarse o procesarse en otra herramienta.

## Puntos importantes

- Incluir siempre la versión visible en la UI.
- Usar un protocolo de actualización para obligar al navegador a buscar la última versión.
- Actualizar cada 5 minutos y forzar recarga si hay nueva versión.
- Hacer commits por cada mejora.
- Mantener sincronía entre PC, servidor y Git.
- Probar mejoras en localhost antes de producción.
- Mejorar solo las partes necesarias, no sustituir todo el código.

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
