export default async function handler(req, res) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { agent_id, session_id } = req.body;

        const apiKey = process.env.RETELL_API_KEY;
        const agentId = agent_id || process.env.RETELL_AGENT_ID;

        if (!apiKey || !agentId) {
            return res.status(500).json({
                error: 'Retell no configurado. Verifica las variables de entorno RETELL_API_KEY y RETELL_AGENT_ID.'
            });
        }

        // Llamar a la API de Retell para crear una llamada web
        const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId
            })
        });

        if (!retellResponse.ok) {
            const errorData = await retellResponse.json().catch(() => ({ message: 'Error desconocido' }));
            return res.status(retellResponse.status).json({
                error: `Error ${retellResponse.status}: ${errorData.message || retellResponse.statusText}`
            });
        }

        const retellData = await retellResponse.json();
        
        res.json({
            access_token: retellData.access_token,
            call_id: retellData.call_id
        });

    } catch (error) {
        console.error('Error en /api/retell/token:', error);
        res.status(500).json({
            error: 'Error al obtener token de acceso de Retell',
            message: error.message
        });
    }
}

