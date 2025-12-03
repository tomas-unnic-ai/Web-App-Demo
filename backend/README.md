# 🚀 Backend - Web App Demo

Backend simple para manejar las peticiones a las APIs de forma segura, sin exponer las API keys en el frontend.

## 📋 Requisitos

- Node.js 18+ (con soporte para ES modules)
- npm o yarn

## 🛠️ Instalación

1. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

3. **Editar `.env` con tus credenciales:**
   ```env
   PORT=3000
   AI_API_URL=https://tu-api-backend.com/chat
   AI_API_KEY=tu-api-key-aqui
   RETELL_API_KEY=tu-retell-api-key-aqui
   RETELL_AGENT_ID=tu-retell-agent-id-aqui
   ```

## 🚀 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📡 Endpoints

### `GET /api/config`
Obtiene la configuración para el frontend (sin exponer las API keys).

**Respuesta:**
```json
{
  "apiUrl": "http://localhost:3000/api/chat",
  "retellConfig": {
    "apiKey": "...",
    "agentId": "..."
  }
}
```

### `POST /api/chat`
Endpoint para enviar mensajes a la API de IA.

**Body:**
```json
{
  "message": "Hola",
  "conversation_history": [
    {
      "role": "user",
      "content": "Mensaje anterior"
    }
  ],
  "session_id": "session_123",
  "is_initial": false
}
```

**Respuesta:**
```json
{
  "response": "Respuesta del asistente"
}
```

### `POST /api/retell/init`
Inicializa una llamada de Retell (opcional).

### `GET /api/health`
Health check del servidor.

## 🔒 Seguridad

- ✅ Las API keys están en variables de entorno (nunca en el código)
- ✅ El frontend no tiene acceso directo a las API keys
- ✅ CORS configurado para permitir peticiones del frontend
- ✅ Todas las peticiones pasan por el backend

## ⚙️ Configuración

### Variables de Entorno

- `PORT`: Puerto del servidor (default: 3000)
- `AI_API_URL`: URL de tu API de IA
- `AI_API_KEY`: API key de tu proveedor de IA
- `RETELL_API_KEY`: API key de Retell
- `RETELL_AGENT_ID`: ID del agente de Retell

### Personalizar la Petición a la API de IA

Edita la función en `server.js` (línea ~40) para ajustar el formato de la petición según tu proveedor:

```javascript
const response = await fetch(API_CONFIG.aiApiUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.aiApiKey}`,
        // Agrega más headers según necesites
    },
    body: JSON.stringify({
        // Ajusta el formato según tu API
        model: 'gpt-4',
        messages: [...]
    })
});
```

## 🐛 Solución de Problemas

### Error: "API no configurada"
- Verifica que las variables de entorno estén en el archivo `.env`
- Asegúrate de que el archivo `.env` esté en la carpeta `backend/`

### Error de CORS
- El backend ya tiene CORS configurado
- Si necesitas restringir orígenes, edita `server.js`:
  ```javascript
  app.use(cors({
    origin: 'https://tu-dominio.com'
  }));
  ```

### El frontend no puede conectar
- Verifica que el backend esté corriendo
- Verifica la URL en el frontend (debe apuntar a `http://localhost:3000` en desarrollo)

## 📝 Notas

- El backend también sirve los archivos estáticos del frontend
- En producción, considera usar un servidor web (Nginx) para servir archivos estáticos
- Las API keys nunca se exponen al frontend

