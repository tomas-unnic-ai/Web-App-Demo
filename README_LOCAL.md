# Ejecutar el Proyecto Localmente

Este proyecto se puede ejecutar localmente de dos maneras:

## Opción 1: Usar Vercel CLI (Recomendado)

Esta opción simula el entorno de producción de Vercel y ejecuta las funciones serverless correctamente.

### Requisitos previos:

1. **Instalar Vercel CLI** (opcional, puedes usar npx):
   ```bash
   npm install -g vercel
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto con:
   ```
   RETELL_API_KEY=tu_api_key_aqui
   RETELL_AGENT_ID=tu_agent_id_aqui
   ```

### Ejecutar:

```bash
# Si tienes Vercel CLI instalado globalmente
npm run start

# O usando npx (sin instalación global)
npm run start:local

# O directamente
npx vercel dev
```

El servidor se iniciará en `http://localhost:3000` (o el puerto que Vercel asigne).

## Opción 2: Usar Vite (Solo Frontend)

Esta opción solo sirve el frontend. Las llamadas a `/api/*` fallarán a menos que configures un backend separado.

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:5173`.

**Nota**: Con esta opción, necesitarás configurar un proxy o servidor backend separado para las funciones API.

## Solución de Problemas

### Error: "vercel: command not found"
- Usa `npm run start:local` o `npx vercel dev` en su lugar

### Error: Variables de entorno no encontradas
- Asegúrate de tener un archivo `.env` en la raíz del proyecto
- Verifica que las variables `RETELL_API_KEY` y `RETELL_AGENT_ID` estén configuradas

### Error: Puerto ya en uso
- Vercel CLI te preguntará si quieres usar otro puerto
- O puedes especificar un puerto: `vercel dev -p 3001`

