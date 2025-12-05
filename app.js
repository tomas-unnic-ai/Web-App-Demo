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
        // Verificar que RetellWebClient esté disponible
        if (typeof RetellWebClient === 'undefined') {
            console.error('❌ RetellWebClient is not defined. Check if the SDK is loaded correctly.');
            updateStatus('SDK not loaded', 'error');
            return;
        }
        
        retellWebClient = new RetellWebClient();
        
        // Verificar que la instancia se creó correctamente
        if (!retellWebClient) {
            console.error('❌ Failed to create RetellWebClient instance');
            updateStatus('Failed to initialize client', 'error');
            return;
        }
        
        setupRetellEventListeners();
        console.log('✅ Retell Web Client initialized');
        
        // Debug: mostrar métodos disponibles
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(retellWebClient));
        console.log('RetellWebClient instance:', retellWebClient);
        console.log('Available methods:', methods);
        console.log('Has startCall:', typeof retellWebClient.startCall === 'function');
        console.log('Has startConversation:', typeof retellWebClient.startConversation === 'function');
        
        if (retellWebClient.liveClient) {
            console.log('liveClient methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(retellWebClient.liveClient)));
        }
    } catch (error) {
        console.error('❌ Error initializing Retell:', error);
        console.error('Error stack:', error.stack);
        updateStatus('Initialization error: ' + error.message, 'error');
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

    // Escuchar ambos eventos por compatibilidad con diferentes versiones del SDK
    retellWebClient.on("call_started", () => {
        console.log('Call started');
        updateStatus('Connected. Start speaking...', 'active');
    });

    retellWebClient.on("conversationStarted", () => {
        console.log('Conversation started - WebSocket connection established');
        console.log('SDK stream status:', retellWebClient.stream ? 'Active' : 'Not detected');
        updateStatus('Connected. Start speaking...', 'active');
        
        // Cuando la conversación se inicia, el SDK debería tener su propio stream
        // Podemos cerrar el stream temporal si existe
        // Esto se manejará en handleStart después de que startConversation complete
    });

    retellWebClient.on("call_ended", (data) => {
        console.log('Call ended:', data);
        updateStatus('Call ended');
        appState.isActive = false;
        updateUI('inactive');
        hideTranscript();
    });

    retellWebClient.on("conversationEnded", (data) => {
        console.log('Conversation ended:', data);
        console.log('End reason code:', data?.code);
        console.log('End reason:', data?.reason);
        
        // El código 1005 indica que el WebSocket se cerró sin un frame de cierre apropiado
        // Esto puede indicar un problema de autenticación o conexión
        if (data?.code === 1005) {
            console.error('WebSocket closed with code 1005 - connection closed improperly');
            console.error('This usually means the access token is invalid or the connection failed to establish');
        }
        
        updateStatus('Call ended');
        appState.isActive = false;
        updateUI('inactive');
        hideTranscript();
    });

    retellWebClient.on("disconnect", () => {
        console.log('Disconnect event');
        // No terminar la conversación automáticamente en disconnect
        // Puede ser una desconexión temporal
    });

    retellWebClient.on("reconnect", () => {
        console.log('Reconnect event');
        updateStatus('Reconnected', 'active');
    });

    retellWebClient.on("error", (error) => {
        console.error('Retell error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        updateStatus('Error: ' + (error.message || JSON.stringify(error)), 'error');
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
        console.error('retellWebClient is null or undefined');
        updateStatus('Client not ready. Please refresh the page.', 'error');
        return;
    }

    // Verificar que retellWebClient es una instancia válida
    if (typeof retellWebClient !== 'object') {
        console.error('retellWebClient is not an object:', typeof retellWebClient);
        updateStatus('Client initialization error', 'error');
        return;
    }

    // Verificar qué métodos están disponibles
    const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(retellWebClient));
    console.log('Available methods on retellWebClient:', availableMethods);
    
    // También verificar métodos en la instancia misma (no solo en el prototipo)
    const instanceMethods = Object.getOwnPropertyNames(retellWebClient);
    console.log('Instance properties:', instanceMethods);
    
    // Verificar si startCall o startConversation están disponibles
    const hasStartCall = typeof retellWebClient.startCall === 'function';
    const hasStartConversation = typeof retellWebClient.startConversation === 'function';
    
    console.log('hasStartCall:', hasStartCall);
    console.log('hasStartConversation:', hasStartConversation);
    console.log('retellWebClient type:', typeof retellWebClient);
    console.log('retellWebClient constructor:', retellWebClient.constructor?.name);
    
    if (!hasStartCall && !hasStartConversation) {
        console.error('Error: Neither startCall nor startConversation method available');
        console.error('Available methods:', availableMethods);
        console.error('Instance properties:', instanceMethods);
        console.error('Full retellWebClient object:', retellWebClient);
        updateStatus('Error: Start method not available. Check console for details.', 'error');
        return;
    }

    // Solicitar permisos del micrófono ANTES de obtener el token
    // Esto asegura que el usuario se una inmediatamente cuando se obtiene el token
    // NOTA: No cerramos el stream aquí, el SDK lo manejará internamente
    let micStream = null;
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        console.log('Microphone permission granted, stream active');
    } catch (error) {
        console.error('Error getting microphone permission:', error);
        updateStatus('Error: Permisos de micrófono denegados', 'error');
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
        
        if (!tokenData.call_id) {
            throw new Error('No call_id received');
        }

        if (!tokenData.access_token) {
            throw new Error('No access_token received');
        }

        console.log('Token received, starting conversation with call_id:', tokenData.call_id);
        console.log('Access token length:', tokenData.access_token?.length || 0);

        // IMPORTANTE: Llamar a startCall INMEDIATAMENTE después de obtener el token
        // El access_token expira en 30 segundos si no se usa
        // Según la documentación oficial: https://docs.retellai.com/deploy/web-call
        const callParams = {
            accessToken: tokenData.access_token, // CRÍTICO: El token de acceso es necesario para autenticarse
            sampleRate: 24000 // Frecuencia de muestreo estándar para Retell
        };
        
        console.log('Starting call with params:', {
            accessToken: callParams.accessToken ? '***' + callParams.accessToken.slice(-10) : 'MISSING',
            sampleRate: callParams.sampleRate
        });
        
        // Según la documentación oficial: https://docs.retellai.com/deploy/web-call
        // El método correcto es startCall() con accessToken
        if (typeof retellWebClient.startCall === 'function') {
            console.log('✅ Using startCall() method (official documentation)');
            await retellWebClient.startCall(callParams);
            console.log('✅ startCall() completed successfully');
        } else if (typeof retellWebClient.startConversation === 'function') {
            // Fallback para versiones antiguas del SDK
            console.error('⚠️ WARNING: Using outdated SDK version with startConversation()');
            console.error('⚠️ Please update to the latest SDK version that includes startCall()');
            console.error('⚠️ Current SDK version may not be compatible with the latest Retell API');
            
            // Intentar usar startConversation con solo accessToken (como startCall)
            const conversationParams = {
                accessToken: tokenData.access_token,
                sampleRate: 24000
            };
            
            console.log('Attempting startConversation with accessToken only (fallback):', {
                accessToken: conversationParams.accessToken ? '***' + conversationParams.accessToken.slice(-10) : 'MISSING',
                sampleRate: conversationParams.sampleRate
            });
            
            await retellWebClient.startConversation(conversationParams);
            console.log('⚠️ startConversation completed (using outdated SDK)');
        } else {
            throw new Error('No start method available. SDK may not be loaded correctly. Please refresh the page.');
        }

        // El SDK ahora manejará el stream de audio
        // El SDK creará su propio stream cuando llame a startConversation
        // Cerrar el stream temporal después de un breve delay para dar tiempo al SDK
        if (micStream) {
            // El SDK necesita crear su propio stream, así que cerramos el temporal
            // después de darle tiempo para que establezca la conexión WebSocket
            setTimeout(() => {
                // Verificar si el SDK tiene su propio stream activo
                const sdkHasStream = retellWebClient && retellWebClient.stream && retellWebClient.stream.active;
                
                if (sdkHasStream) {
                    console.log('✅ SDK has its own active stream, closing temporary stream');
                    micStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Temporary stream track stopped:', track.kind);
                    });
                } else {
                    console.log('⚠️ SDK stream not detected, but closing temporary stream anyway');
                    console.log('SDK should create its own stream internally');
                    // Cerrar el stream temporal - el SDK debería crear el suyo
                    micStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Temporary stream track stopped:', track.kind);
                    });
                }
            }, 500); // Reducir el tiempo - el SDK debería crear su stream rápidamente
        }

        updateStatus('Listening...', 'active');

    } catch (error) {
        console.error('Error starting call:', error);
        updateStatus('Error: ' + error.message, 'error');
        appState.isActive = false;
        updateUI('inactive');
        // Cerrar el stream si hay un error
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
        }
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
            // Intentar usar stopCall primero, si no está disponible usar stopConversation
            if (typeof retellWebClient.stopCall === 'function') {
                retellWebClient.stopCall();
            } else if (typeof retellWebClient.stopConversation === 'function') {
                retellWebClient.stopConversation();
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