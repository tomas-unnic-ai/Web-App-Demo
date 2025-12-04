# Deploy en Vercel - Solución de Problemas

## Cómo Verificar si las Funciones Serverless se Detectan Correctamente

1. **Accede al Dashboard de Vercel:**
   - Ve a [vercel.com](https://vercel.com) e inicia sesión
   - Selecciona tu proyecto

2. **Ve a la Configuración del Proyecto:**
   - En la barra superior, haz clic en **"Settings"**
   - En el menú lateral izquierdo, busca y haz clic en **"Functions"**

3. **Verifica las Funciones:**
   - Deberías ver una lista de funciones serverless detectadas
   - Busca `api/config.js` y `api/retell/token.js`
   - Si aparecen, las funciones se están detectando correctamente
   - Si NO aparecen, Vercel no está detectando las funciones

4. **Alternativa: Ver en el Deploy:**
   - Ve a la pestaña **"Deployments"** en la barra superior
   - Haz clic en el último deploy
   - En la sección **"Functions"** deberías ver las funciones detectadas

## Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

Este error ocurre cuando `/api/config` devuelve HTML en lugar de JSON. Esto puede pasar por dos razones:

### 1. Probando Localmente

Si estás probando localmente, **debes usar `vercel dev`** para que las funciones serverless funcionen:

```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Ejecutar en modo desarrollo
vercel dev
```

Las funciones serverless **NO funcionan** si usas:
- `python -m http.server`
- `npx serve`
- Abrir `index.html` directamente en el navegador
- Cualquier servidor estático simple

### 2. Configuración de vercel.json

El archivo `vercel.json` está configurado para:
- Permitir que las funciones serverless en `api/` funcionen automáticamente
- Hacer rewrite de todas las demás rutas a `index.html` para el routing del frontend

Si el problema persiste en producción, verifica:
1. Que las funciones estén en `api/config.js` y `api/retell/token.js`
2. Que las variables de entorno estén configuradas en Vercel:
   - `RETELL_API_KEY`
   - `RETELL_AGENT_ID`

## Estructura Correcta

```
/
├── api/
│   ├── config.js          # GET /api/config
│   └── retell/
│       └── token.js       # POST /api/retell/token
├── index.html
├── app.js
├── styles.css
└── vercel.json
```

