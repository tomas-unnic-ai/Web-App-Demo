// Importar el SDK de Retell
import { RetellWebClient } from "retell-client-js-sdk";

// Instancia global de Retell Web Client
let retellWebClient = null;

// Configuración de Retell (se obtiene del backend)
const RETELL_CONFIG = {
    apiKey: null,
    agentId: null
};

// Estado de la aplicación
const appState = {
    isActive: false,
    currentSessionId: null
};

// Elementos del DOM
const elements = {
    micButton: document.getElementById('micButton'),
    statusText: document.getElementById('statusText'),
    transcriptWindow: document.getElementById('transcript-window')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    await loadConfigFromBackend();
});

// Cargar configuración desde el backend
async function loadConfigFromBackend() {
    try {
        const backendUrl = window.BACKEND_URL || '';
        const configUrl = backendUrl ? `${backendUrl}/api/config` : '/api/config';
        
        const response = await fetch(configUrl);
        
        if (!response.ok) {
            throw new Error(`Error loading config: ${response.status}`);
        }
        
        const config = await response.json();
        
        if (config.retellConfig) {
            RETELL_CONFIG.apiKey = config.retellConfig.apiKey;
            RETELL_CONFIG.agentId = config.retellConfig.agentId;
            
            console.log('✅ Config loaded from backend');
            initializeRetellWebClient();
        } else {
            console.warn('⚠️ No Retell config found');
            updateStatus('Configuration error', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error loading config:', error);
        updateStatus('Backend not available', 'error');
    }
}

// Inicializar Retell Web Client
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

// Configurar event listeners de Retell
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

// Event Listeners
function initializeEventListeners() {
    elements.micButton.addEventListener('click', toggleCall);
}

// Alternar llamada
async function toggleCall() {
    if (appState.isActive) {
        handleStop();
    } else {
        await handleStart();
    }
}

// Iniciar llamada
async function handleStart() {
    if (appState.isActive) return;

    if (!RETELL_CONFIG.apiKey || !RETELL_CONFIG.agentId) {
        updateStatus('Not configured', 'error');
        return;
    }

    if (!retellWebClient) {
        updateStatus('Client not ready', 'error');
        return;
    }

    appState.isActive = true;
    appState.currentSessionId = generateSessionId();
    
    updateUI('active');
    updateStatus('Connecting...', 'active');

    try {
        const backendUrl = window.BACKEND_URL || '';
        const tokenUrl = backendUrl ? `${backendUrl}/api/retell/token` : '/api/retell/token';
        
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

        await retellWebClient.startCall({
            accessToken: tokenData.access_token
        });

        updateStatus('Listening...', 'active');

    } catch (error) {
        console.error('Error starting call:', error);
        updateStatus('Error: ' + error.message, 'error');
        appState.isActive = false;
        updateUI('inactive');
    }
}

// Detener llamada
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

// UI Updates
function updateUI(status) {
    if (status === 'active') {
        elements.micButton.classList.add('active');
    } else {
        elements.micButton.classList.remove('active');
    }
}

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

function showTranscript(text) {
    if (elements.transcriptWindow) {
        elements.transcriptWindow.textContent = text;
        elements.transcriptWindow.classList.add('visible');
    }
}

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

// Utilities
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
