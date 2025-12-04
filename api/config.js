export default function handler(req, res) {
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Obtener Agent ID desde variables de entorno
    const agentId = process.env.RETELL_AGENT_ID || '';

    res.json({
        retellConfig: {
            agentId: agentId
        }
    });
}

