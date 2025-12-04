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
    conversationHistory: [],
    currentSessionId: null,
    retellWebClient: null // Instancia de Retell Web Client
};

// Elementos del DOM
const elements = {
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    conversationLog: document.getElementById('conversationLog'),
    clearButton: document.getElementById('clearButton'),
    transcriptWindow: document.getElementById('transcript-window')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    
    // Cargar configuración desde el backend
    await loadConfigFromBackend();
});

// Cargar configuración desde el backend
async function loadConfigFromBackend() {
    try {
        // Obtener la URL base del backend (mismo origen o configurada)
        const backendUrl = window.BACKEND_URL || '';
        const configUrl = backendUrl ? `${backendUrl}/api/config` : '/api/config';
        
        const response = await fetch(configUrl);
        
        if (!response.ok) {
            throw new Error(`Error al cargar configuración: ${response.status}`);
        }
        
        const config = await response.json();
        
        // Configurar Retell desde el backend
        if (config.retellConfig) {
            RETELL_CONFIG.apiKey = config.retellConfig.apiKey;
            RETELL_CONFIG.agentId = config.retellConfig.agentId;
            
            console.log('✅ Configuración de Retell cargada desde el backend');
            
            // Inicializar Retell Web Client (sin access token aún)
            initializeRetellWebClient();
        } else {
            console.warn('⚠️ No se encontró configuración de Retell en el backend');
        }
        
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        addSystemMessage('⚠️ No se pudo cargar la configuración del backend. Verifica que el servidor esté corriendo.');
    }
}

// El SDK ya está importado, no necesitamos esperar

// Inicializar Retell Web Client
function initializeRetellWebClient() {
    try {
        // Crear una nueva instancia de RetellWebClient
        retellWebClient = new RetellWebClient();
        
        // Configurar los event listeners
        setupRetellEventListeners();
        
        console.log('✅ Retell Web Client inicializado');
    } catch (error) {
        console.error('❌ Error al inicializar Retell Web Client:', error);
        addSystemMessage('❌ Error al inicializar Retell: ' + error.message);
    }
}

// Configurar los event listeners de Retell
function setupRetellEventListeners() {
    if (!retellWebClient) return;

    // Listener para actualizaciones de transcripción
    retellWebClient.on("update", (update) => {
        // Log completo del objeto update para debug
        console.log('Update recibido:', update);
        
        // Intentar obtener la transcripción de diferentes campos posibles
        const transcript = update.transcript || update.transcription || update.text || '';
        
        // Actualizar la UI con la transcripción en tiempo real
        if (elements.transcriptWindow && transcript) {
            elements.transcriptWindow.innerText = transcript;
        }

        // También mostrar mensajes individuales en el log de conversación
        if (update.role && update.content) {
            if (update.role === 'agent' || update.role === 'assistant') {
                addAssistantMessage(update.content);
            } else if (update.role === 'user') {
                addUserMessage(update.content);
            }
        }
    });

    // Listener para transcripción del agente
    retellWebClient.on("agent_start_talking", () => {
        console.log('🤖 Agente está hablando');
        if (elements.transcriptWindow) {
            elements.transcriptWindow.innerText = '🤖 Asistente hablando...';
        }
    });

    retellWebClient.on("agent_stop_talking", () => {
        console.log('🤖 Agente dejó de hablar');
    });

    // Listener para transcripción del usuario
    retellWebClient.on("user_start_talking", () => {
        console.log('👤 Usuario está hablando');
        if (elements.transcriptWindow) {
            elements.transcriptWindow.innerText = '👤 Escuchando...';
        }
    });

    retellWebClient.on("user_stop_talking", () => {
        console.log('👤 Usuario dejó de hablar');
    });

    // Listener para cuando inicia la llamada
    retellWebClient.on("call_started", () => {
        console.log('✅ Llamada iniciada');
        addSystemMessage('✅ Llamada conectada');
        if (elements.transcriptWindow) {
            elements.transcriptWindow.style.display = 'block';
            elements.transcriptWindow.innerText = 'Conectado. Habla para comenzar...';
        }
    });

    // Listener para cuando termina la llamada
    retellWebClient.on("call_ended", () => {
        console.log('📴 Llamada finalizada');
        addSystemMessage('📴 Llamada finalizada');
    });

    // Listener para errores
    retellWebClient.on("error", (error) => {
        console.error('Error en Retell Web Client:', error);
        addSystemMessage('❌ Error en Retell: ' + (error.message || JSON.stringify(error)));
    });

    // Listener para audio (debug)
    retellWebClient.on("audio", (audio) => {
        // Audio recibido del agente
        console.log('Audio recibido');
    });
}

// Event Listeners
function initializeEventListeners() {
    elements.startButton.addEventListener('click', handleStart);
    elements.stopButton.addEventListener('click', handleStop);
    elements.clearButton.addEventListener('click', clearConversation);
}

// Manejo de inicio
async function handleStart() {
    if (appState.isActive) {
        return;
    }

    // Verificar que Retell esté configurado
    if (!RETELL_CONFIG.apiKey || !RETELL_CONFIG.agentId) {
        addSystemMessage('❌ Error: Retell no está configurado. Por favor, verifica que el backend esté corriendo y configurado.');
        return;
    }

    // Verificar que Retell Web Client esté inicializado
    if (!retellWebClient) {
        addSystemMessage('❌ Error: Retell Web Client no está inicializado.');
        return;
    }

    // Iniciar sesión
    appState.isActive = true;
    appState.currentSessionId = generateSessionId();
    
    updateUI('active');
    addSystemMessage('🔄 Obteniendo token de acceso...');

    try {
        // Obtener el access token del backend (Create Web Call API)
        const backendUrl = window.BACKEND_URL || '';
        const tokenUrl = backendUrl ? `${backendUrl}/api/retell/token` : '/api/retell/token';
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: appState.currentSessionId,
                agent_id: RETELL_CONFIG.agentId
            })
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || 'Error al obtener token de acceso');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error('No se recibió el token de acceso');
        }

        // Mostrar la ventana de transcripción
        if (elements.transcriptWindow) {
            elements.transcriptWindow.style.display = 'block';
            elements.transcriptWindow.innerText = 'Conectando...';
        }

        // Iniciar la llamada con el access token
        await retellWebClient.startCall({
            accessToken: accessToken
        });

        addSystemMessage('✅ Llamada iniciada');
        appState.retellWebClient = retellWebClient;

    } catch (error) {
        console.error('Error al iniciar la llamada:', error);
        addSystemMessage('❌ Error al iniciar la llamada: ' + error.message);
        appState.isActive = false;
        updateUI('inactive');
    }
}

// Manejo de detener
function handleStop() {
    if (!appState.isActive) {
        return;
    }

    appState.isActive = false;
    appState.currentSessionId = null;
    
    updateUI('inactive');
    addSystemMessage('⏹️ Sesión detenida');
    
    // Limpiar y ocultar transcripción en tiempo real
    stopRetellWebClient();
}

// Actualizar UI
function updateUI(status) {
    switch(status) {
        case 'active':
            elements.startButton.style.display = 'none';
            elements.stopButton.style.display = 'flex';
            break;
        case 'inactive':
            elements.startButton.style.display = 'flex';
            elements.stopButton.style.display = 'none';
            break;
    }
}

// Agregar mensaje a la conversación
function addMessage(sender, content, isSystem = false) {
    const message = {
        sender,
        content,
        timestamp: new Date(),
        isSystem
    };
    
    appState.conversationHistory.push(message);
    renderMessage(message);
}

// Agregar mensaje del sistema
function addSystemMessage(content) {
    addMessage('system', content, true);
}

// Agregar mensaje del usuario
function addUserMessage(content) {
    addMessage('user', content);
}

// Agregar mensaje del asistente
function addAssistantMessage(content) {
    addMessage('assistant', content);
}

// Renderizar mensaje en el log
function renderMessage(message) {
    // Remover mensaje de bienvenida si existe
    const welcomeMsg = elements.conversationLog.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender}`;
    
    if (message.isSystem) {
        messageDiv.innerHTML = `
            <div class="message-content" style="text-align: center; color: #6b7280; font-style: italic;">
                ${message.content}
            </div>
        `;
    } else {
        const time = formatTime(message.timestamp);
        messageDiv.innerHTML = `
            <div class="message-header">${message.sender === 'user' ? '👤 Tú' : '🤖 Asistente'}</div>
            <div class="message-content">${escapeHtml(message.content)}</div>
            <div class="message-time">${time}</div>
        `;
    }
    
    elements.conversationLog.appendChild(messageDiv);
    elements.conversationLog.scrollTop = elements.conversationLog.scrollHeight;
}

// Retell maneja toda la conversación, no necesitamos funciones separadas para obtener respuestas
// Las respuestas vendrán a través de los eventos de Retell Web Client

// Retell maneja la escucha activa, no necesitamos funciones de simulación


// Detener Retell Web Client
function stopRetellWebClient() {
    // Detener la llamada de Retell si está activa
    if (retellWebClient) {
        try {
            // Retell Web Client tiene un método stopCall para terminar la llamada
            if (typeof retellWebClient.stopCall === 'function') {
                retellWebClient.stopCall();
            }
        } catch (error) {
            console.error('Error al detener Retell:', error);
        }
    }

    // Ocultar la ventana de transcripción
    if (elements.transcriptWindow) {
        elements.transcriptWindow.style.display = 'none';
        elements.transcriptWindow.innerText = '';
    }
}

// Limpiar conversación
function clearConversation() {
    if (confirm('¿Estás seguro de que quieres limpiar la conversación?')) {
        appState.conversationHistory = [];
        elements.conversationLog.innerHTML = `
            <div class="welcome-message">
                <p>👋 Conversación limpiada. Haz clic en "Empezar" para comenzar de nuevo.</p>
            </div>
            <div id="transcript-window" class="transcript-live" style="display: none;"></div>
        `;
        // Reasignar el elemento después de limpiar
        elements.transcriptWindow = document.getElementById('transcript-window');
    }
}

// Utilidades
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(date) {
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


