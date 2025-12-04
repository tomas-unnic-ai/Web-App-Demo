// Importar el SDK de Retell
import { RetellWebClient } from "retell-client-js-sdk";

// Instancia global del cliente web de Retell
let retellWebClient = null;

// Configuración pública (solo Agent ID)
const RETELL_CONFIG = {
    agentId: null
};

// Estado de la aplicación: gestión de la llamada actual
const appState = {
    isActive: false,
    currentSessionId: null
};

// Referencias a elementos del DOM
const elements = {
    micButton: document.getElementById('micButton'),
    statusText: document.getElementById('statusText'),
    transcriptWindow: document.getElementById('transcript-window')
};

// Inicialización de la aplicación al cargar el documento
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    await loadConfigFromBackend();
});

// Cargar Agent ID desde el backend mediante una ruta relativa
async function loadConfigFromBackend() {
    try {
        const configUrl = '/api/config'; 

        const response = await fetch(configUrl);
        
        if (!response.ok) {
            throw new Error(`Error loading config: ${response.status}`);
        }
        
        const config = await response.json();
        
        if (config.retellConfig && config.retellConfig.agentId) {
            RETELL_CONFIG.agentId = config.retellConfig.agentId;
            
            console.log('✅ Config loaded from backend (Agent ID only)');
            initializeRetellWebClient();
        } else {
            console.warn('⚠️ No Retell agentId found in config');
            updateStatus('Configuration error', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error loading config:', error);
        updateStatus('Backend not available', 'error');
    }
}

// Inicializar el cliente web de Retell
function initializeRetellWebClient() {
    try {
        retellWebClient = new RetellWebClient();
        setupRetellEventListeners();
        console.log('✅ Retell Web Client initialized');
    } catch (error) {
        console.error('❌ Error initializing Retell:', error);
        updateStatus('Initialization error', 'error');
    }
}

// Configurar los listeners de eventos del cliente Retell (transcripción, estados)
function setupRetellEventListeners() {
    if (!retellWebClient) return;

    retellWebClient.on("update", (update) => {
        console.log('Update:', update);
        const transcript = update.transcript || update.transcription || update.text || '';
        if (transcript) {
            showTranscript(transcript);
        }
    });

    retellWebClient.on("agent_start_talking", () => {
        console.log('Agent talking');
        updateStatus('Agent speaking...', 'active');
    });

    retellWebClient.on("agent_stop_talking", () => {
        if (appState.isActive) {
            updateStatus('Listening...', 'active');
        }
    });

    retellWebClient.on("user_start_talking", () => {
        console.log('User talking');
        updateStatus('You are speaking...', 'active');
    });

    retellWebClient.on("user_stop_talking", () => {
        if (appState.isActive) {
            updateStatus('Processing...', 'active');
        }
    });

    retellWebClient.on("call_started", () => {
        console.log('Call started');
        updateStatus('Connected. Start speaking...', 'active');
    });

    retellWebClient.on("call_ended", () => {
        console.log('Call ended');
        updateStatus('Call ended');
        appState.isActive = false;
        updateUI('inactive');
        hideTranscript();
    });

    retellWebClient.on("error", (error) => {
        console.error('Retell error:', error);
        updateStatus('Error: ' + (error.message || 'Unknown'), 'error');
        appState.isActive = false;
        updateUI('inactive');
    });
}

// Event Listeners del DOM
function initializeEventListeners() {
    elements.micButton.addEventListener('click', toggleCall);
}

// Alternar entre iniciar y detener la llamada
async function toggleCall() {
    if (appState.isActive) {
        handleStop();
    } else {
        await handleStart();
    }
}

// Iniciar llamada: solicita token al backend y establece la conexión
async function handleStart() {
    if (appState.isActive) return;

    if (!RETELL_CONFIG.agentId) {
        updateStatus('Agent ID not configured', 'error');
        return;
    }

    if (!retellWebClient) {
        updateStatus('Client not ready', 'error');
        return;
    }

    // Verificar que el método startCall existe
    if (typeof retellWebClient.startCall !== 'function') {
        console.error('retellWebClient object:', retellWebClient);
        console.error('retellWebClient methods:', Object.getOwnPropertyNames(retellWebClient));
        console.error('retellWebClient prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(retellWebClient)));
        console.error('All methods (including inherited):', Object.getOwnPropertyNames(Object.getPrototypeOf(retellWebClient)).concat(Object.getOwnPropertyNames(retellWebClient)));
        console.error('Checking for start, startCall, connect, call methods...');
        console.error('start:', typeof retellWebClient.start);
        console.error('startCall:', typeof retellWebClient.startCall);
        console.error('connect:', typeof retellWebClient.connect);
        console.error('call:', typeof retellWebClient.call);
        updateStatus('Error: startCall method not available', 'error');
        return;
    }

    appState.isActive = true;
    appState.currentSessionId = generateSessionId();
    
    updateUI('active');
    updateStatus('Connecting...', 'active');

    try {
        const tokenUrl = '/api/retell/token'; 
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: appState.currentSessionId,
                agent_id: RETELL_CONFIG.agentId
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to get token');
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            throw new Error('No access token received');
        }

        // Inicia la conexión WebSocket con el token de acceso
        // Intentar diferentes métodos posibles
        if (typeof retellWebClient.startCall === 'function') {
            await retellWebClient.startCall({
                accessToken: tokenData.access_token
            });
        } else if (typeof retellWebClient.start === 'function') {
            await retellWebClient.start({
                accessToken: tokenData.access_token
            });
        } else if (retellWebClient.liveClient && typeof retellWebClient.liveClient.startCall === 'function') {
            await retellWebClient.liveClient.startCall({
                accessToken: tokenData.access_token
            });
        } else {
            throw new Error('No se encontró el método para iniciar la llamada. Métodos disponibles: ' + Object.getOwnPropertyNames(retellWebClient).join(', '));
        }

        updateStatus('Listening...', 'active');

    } catch (error) {
        console.error('Error starting call:', error);
        updateStatus('Error: ' + error.message, 'error');
        appState.isActive = false;
        updateUI('inactive');
    }
}

// Detener la llamada
function handleStop() {
    if (!appState.isActive) return;

    appState.isActive = false;
    appState.currentSessionId = null;
    
    updateUI('inactive');
    updateStatus('');
    hideTranscript();
    
    if (retellWebClient) {
        try {
            if (typeof retellWebClient.stopCall === 'function') {
                retellWebClient.stopCall();
            }
        } catch (error) {
            console.error('Error stopping call:', error);
        }
    }
}

// Actualizaciones de estado visual de la UI
function updateUI(status) {
    if (status === 'active') {
        elements.micButton.classList.add('active');
    } else {
        elements.micButton.classList.remove('active');
    }
}

// Actualizar el texto de estado en pantalla
function updateStatus(text, type = 'normal') {
    if (elements.statusText) {
        elements.statusText.textContent = text;
        elements.statusText.className = 'status-text';
        if (type === 'active') {
            elements.statusText.classList.add('active');
        } else if (type === 'error') {
            elements.statusText.classList.add('error');
        }
    }
}

// Mostrar transcripción
function showTranscript(text) {
    if (elements.transcriptWindow) {
        elements.transcriptWindow.textContent = text;
        elements.transcriptWindow.classList.add('visible');
    }
}

// Ocultar transcripción
function hideTranscript() {
    if (elements.transcriptWindow) {
        elements.transcriptWindow.classList.remove('visible');
        setTimeout(() => {
            if (elements.transcriptWindow) {
                elements.transcriptWindow.textContent = '';
            }
        }, 300);
    }
}

// Utilidad para generar un ID de sesión único
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}