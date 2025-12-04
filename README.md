# 📞 Web App - Asistente de IA por Teléfono

Una aplicación web moderna para realizar llamadas telefónicas a un asistente de inteligencia artificial con visualización de respuestas en tiempo real.

## 🚀 Características

- **Interfaz moderna y responsiva**: Diseño atractivo con gradientes y animaciones
- **Llamadas telefónicas simuladas**: Sistema de llamadas con estados visuales
- **Conversación en tiempo real**: Visualización de mensajes del usuario y del asistente
- **Integración con API externa**: Comunicación mediante HTTP con tu backend de IA
- **Historial de conversación**: Registro completo de todas las interacciones
- **Listo para integración**: Código preparado para conectar con APIs reales de IA

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (opcional, para desarrollo)

## 🛠️ Instalación y Uso

### Desarrollo Local

**Opción 1: Abrir directamente**

1. Abre el archivo `index.html` en tu navegador
2. ¡Listo! La aplicación debería funcionar

**Opción 2: Servidor local**

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (si tienes http-server instalado)
npx http-server

# Con PHP
php -S localhost:8000
```

Luego abre `http://localhost:8000` en tu navegador.

### 🌐 Despliegue Público

Para hacer tu aplicación pública y accesible desde internet, consulta la [Guía de Despliegue](DEPLOY.md) que incluye instrucciones para:

- **GitHub Pages** (gratis, fácil)
- **Netlify** (gratis, drag & drop)
- **Vercel** (gratis, muy rápido)
- **Firebase Hosting** (gratis)
- **Surge.sh** (gratis, súper simple)

**Inicio rápido con Netlify:**
1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta de tu proyecto
3. ¡Listo! Tu app estará pública en segundos

## 📖 Uso

1. **Haz clic en "Empezar"** para iniciar la sesión con el asistente
2. **Observa la conversación** en el panel de conversación
3. **Detener** cuando quieras finalizar la sesión
4. **Limpiar** la conversación cuando quieras empezar de nuevo

## 🔧 Configuración

### Configurar la URL de la API Externa

La aplicación está configurada para comunicarse con tu API externa mediante llamadas HTTP. La URL debe configurarse desde el backend antes de desplegar.

**Opción 1: Variable Global (Recomendado)**

En `index.html`, inyecta la URL desde tu backend:

```html
<head>
    <script>
        window.API_URL = 'https://tu-api-backend.com';
    </script>
</head>
```

Y en `app.js`, descomenta la línea 42:
```javascript
API_CONFIG.url = window.API_URL || '';
```

**Opción 2: Meta Tag**

En `index.html`:
```html
<meta name="api-url" content="https://tu-api-backend.com">
```

Y en `app.js`, descomenta la línea 45:
```javascript
API_CONFIG.url = document.querySelector('meta[name="api-url"]')?.content || '';
```

**Opción 3: Endpoint de Configuración**

Si tu backend puede servir la configuración, descomenta las líneas 48-50 en `app.js`.

### Formato de la Petición HTTP

La aplicación envía peticiones POST a tu API con el siguiente formato:

```json
{
    "message": "mensaje del usuario",
    "conversation_history": [
        {
            "role": "user",
            "content": "mensaje anterior del usuario"
        },
        {
            "role": "assistant",
            "content": "respuesta anterior del asistente"
        }
    ],
    "call_id": "call_1234567890_abc123",
    "is_initial": false
}
```

### Formato de Respuesta Esperado

Tu API debe responder con un JSON que contenga la respuesta del asistente. La aplicación busca la respuesta en estos campos (en orden):

- `response`
- `message`
- `text`
- `answer`

Si tu API usa un formato diferente, puedes ajustar la línea 257 en `app.js`:

```javascript
return data.tu_campo_personalizado;
```

### Personalizar Headers y Autenticación

Si tu API requiere headers adicionales o autenticación, edita la función `getAIResponseFromAPI` en `app.js` (línea ~230):

```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer tu-token-aqui',
    // Agrega más headers según necesites
}
```

### Integración con WebRTC para Llamadas Reales

Para implementar llamadas telefónicas reales, puedes usar:

- **Twilio**: API de telefonía en la nube
- **Vonage (Nexmo)**: Comunicaciones API
- **WebRTC**: Para llamadas peer-to-peer

## 🎨 Personalización

### Colores

Edita `styles.css` para cambiar los colores del tema:

```css
/* Gradiente principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Color del botón de llamar */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

### Personalizar el Endpoint

Por defecto, la aplicación usa el endpoint `/chat`. Para cambiarlo, edita la constante `API_CONFIG.endpoint` en `app.js` (línea ~4):

```javascript
const API_CONFIG = {
    url: localStorage.getItem('apiUrl') || '',
    endpoint: '/tu-endpoint-personalizado'
};
```

## 📁 Estructura del Proyecto

```
Web-App-Demo/
├── index.html          # Estructura HTML principal
├── styles.css          # Estilos y diseño
├── app.js              # Lógica de la aplicación
├── README.md           # Este archivo
├── DEPLOY.md           # Guía de despliegue público
├── API_EXAMPLE.md      # Ejemplos de integración con API
├── netlify.toml        # Configuración para Netlify
└── vercel.json         # Configuración para Vercel
```

## 🔒 Seguridad

⚠️ **Importante**: Nunca expongas tu API key directamente en el código JavaScript del cliente. Para producción:

1. Crea un backend (Node.js, Python, etc.)
2. Almacena las API keys en variables de entorno
3. Haz las llamadas a la API desde el backend
4. El frontend se comunica con tu backend

## 🚧 Próximas Mejoras

- [ ] Integración con reconocimiento de voz real (Web Speech API)
- [ ] Síntesis de voz para respuestas del asistente
- [ ] Integración con APIs de telefonía reales (Twilio, Vonage)
- [ ] Historial persistente en base de datos
- [ ] Múltiples conversaciones simultáneas
- [ ] Exportar conversaciones a PDF/Texto
- [ ] Reintentos automáticos en caso de error de conexión
- [ ] Indicador de estado de conexión con la API

## 📝 Licencia

Este proyecto es de código abierto y está disponible para uso personal y comercial.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📧 Soporte

Si tienes preguntas o problemas, por favor abre un issue en el repositorio.

---

¡Disfruta usando tu asistente de IA! 🎉

