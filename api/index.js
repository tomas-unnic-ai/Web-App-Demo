import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Servir archivos estáticos del frontend

// Configuración de Retell
const RETELL_CONFIG = {
    apiKey: process.env.RETELL_API_KEY || '',
    agentId: process.env.RETELL_AGENT_ID || ''
};

// Endpoint para obtener la configuración del frontend
app.get('/api/config', (req, res) => {
    res.json({
        retellConfig: {
            agentId: RETELL_CONFIG.agentId
        }
    });
});

// Endpoint para obtener el access token (Create Web Call API)
app.post('/api/retell/token', async (req, res) => {
    try {
        const { session_id, agent_id } = req.body;

        if (!RETELL_CONFIG.apiKey || !RETELL_CONFIG.agentId) {
            return res.status(500).json({
                error: 'Retell no configurado. Verifica las variables de entorno RETELL_API_KEY y RETELL_AGENT_ID.'
            });
        }

        // Usar el agent_id del request o el configurado por defecto
        const agentId = agent_id || RETELL_CONFIG.agentId;

        // Llamar a la API de Retell para crear una llamada web y obtener el access token
        const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RETELL_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId,
                // Puedes agregar más parámetros según la documentación de Retell
                // metadata: { session_id: session_id }
            })
        });

        if (!retellResponse.ok) {
            const errorData = await retellResponse.json().catch(() => ({ message: 'Error desconocido' }));
            return res.status(retellResponse.status).json({
                error: `Error ${retellResponse.status}: ${errorData.message || retellResponse.statusText}`
            });
        }

        const retellData = await retellResponse.json();
        
        // Retornar el access token
        res.json({
            access_token: retellData.access_token,
            call_id: retellData.call_id
        });

    } catch (error) {
        console.error('Error en /api/retell/token:', error);
        res.status(500).json({
            error: 'Error al obtener token de acceso',
            message: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        retellConfigured: !!RETELL_CONFIG.apiKey && !!RETELL_CONFIG.agentId
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Configuración: http://localhost:${PORT}/api/config`);
    
    // Advertencia si falta configuración de Retell
    if (!RETELL_CONFIG.apiKey || !RETELL_CONFIG.agentId) {
        console.warn('⚠️  RETELL_API_KEY y RETELL_AGENT_ID no están configuradas');
    } else {
        console.log('✅ Retell configurado correctamente');
    }
});

