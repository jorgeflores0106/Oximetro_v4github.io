// --- Configuración MQTT ---
const BROKER_HOST = '9c0ce76eea69492fbf46416f509663ee.s1.eu.hivemq.cloud';
const BROKER_PORT = 8884;
const CLIENT_ID = 'ClienteWeb_123'; // ID de cliente personalizado
const USERNAME = 'Luis0106';
const PASSWORD = 'Luis12345'; // reemplaza con tu contraseña real
const KEEP_ALIVE_INTERVAL = 60;

const TOPIC_OXYGEN = 'health/monitor/oxygen';
const TOPIC_PULSE = 'health/monitor/pulse';

// Elementos de UI
const statusDisplay = document.getElementById('status-display');
const oxygenValue = document.getElementById('oxygen-value');
const pulseValue = document.getElementById('pulse-value');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');

let client = null;
let isConnected = false;

// --- Funciones de UI ---
function updateStatus(status, isError = false) {
    statusDisplay.textContent = status;
    statusDisplay.className = 'p-2 text-sm font-medium rounded-lg text-center ';

    if (isConnected) {
        statusDisplay.classList.add('bg-green-100', 'text-green-700');
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
    } else if (isError) {
        statusDisplay.classList.add('bg-red-200', 'text-red-800');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    } else {
        statusDisplay.classList.add('bg-yellow-100', 'text-yellow-700');
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
    }
}

function showMessage(message, type = 'info') {
    const tempBox = document.createElement('div');
    tempBox.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-lg text-white font-semibold z-50 transition-opacity duration-300`;
    
    if (type === 'error') tempBox.classList.add('bg-red-600');
    else if (type === 'success') tempBox.classList.add('bg-green-600');
    else tempBox.classList.add('bg-blue-600');

    tempBox.textContent = message;
    document.body.appendChild(tempBox);

    setTimeout(() => {
        tempBox.style.opacity = '0';
        setTimeout(() => tempBox.remove(), 300);
    }, 3000);
}

// --- Callbacks MQTT ---
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        isConnected = false;
        updateStatus("Conexión perdida: " + responseObject.errorMessage, true);
        showMessage("Conexión perdida. Intentar reconectar.", 'error');
    }
}

function onMessageArrived(message) {
    try {
        const value = parseFloat(message.payloadString.trim());
        if (isNaN(value)) return;

        if (message.destinationName === TOPIC_OXYGEN) {
            oxygenValue.textContent = value.toFixed(1);
            const card = oxygenValue.closest('.data-card');
            if (value < 90) {
                card.classList.remove('border-green-500');
                card.classList.add('border-yellow-500');
            } else {
                card.classList.remove('border-yellow-500');
                card.classList.add('border-green-500');
            }
        } else if (message.destinationName === TOPIC_PULSE) {
            pulseValue.textContent = Math.round(value);
            const card = pulseValue.closest('.data-card');
            if (value > 100 || value < 50) {
                card.classList.remove('border-red-500');
                card.classList.add('border-yellow-500');
            } else {
                card.classList.remove('border-yellow-500');
                card.classList.add('border-red-500');
            }
        }
    } catch (e) {
        console.error("Error al procesar el mensaje MQTT:", e);
    }
}

function onConnect() {
    isConnected = true;
    updateStatus("Conectado a wss://" + BROKER_HOST + ":" + BROKER_PORT);
    showMessage("¡Conexión MQTT exitosa! Suscribiendo a tópicos.", 'success');
    client.subscribe(TOPIC_OXYGEN);
    client.subscribe(TOPIC_PULSE);
}

// --- Funciones de Conexión ---
function connectToMqtt() {
    if (client && client.isConnected()) {
        showMessage("Ya estás conectado.");
        return;
    }

    updateStatus("Intentando conectar a " + BROKER_HOST + "...");

    try {
        client = new Paho.MQTT.Client(BROKER_HOST, BROKER_PORT, "/mqtt", CLIENT_ID);
        client.onConnectionLost = onConnectionLost;
        client.onMessageArrived = onMessageArrived;

        const options = {
            useSSL: true,
            timeout: 5,
            userName: USERNAME,
            password: PASSWORD,
            keepAliveInterval: KEEP_ALIVE_INTERVAL,
            onSuccess: onConnect,
            onFailure: (message) => {
                isConnected = false;
                updateStatus("Fallo en la conexión: " + message.errorMessage, true);
                showMessage("Error de conexión MQTT. Revisa la consola.", 'error');
            }
        };
        client.connect(options);
    } catch (e) {
        isConnected = false;
        updateStatus("Error de cliente: " + e.message, true);
        showMessage("Error grave en el cliente MQTT.", 'error');
        console.error("Error en connectToMqtt:", e);
    }
}

function disconnectFromMqtt() {
    if (client && client.isConnected()) {
        client.disconnect();
        isConnected = false;
        updateStatus("Desconectado");
        oxygenValue.textContent = '--';
        pulseValue.textContent = '--';
        showMessage("Desconexión exitosa.", 'info');
    } else {
        updateStatus("Desconectado");
    }
}

// --- Eventos ---
connectBtn.addEventListener('click', connectToMqtt);
disconnectBtn.addEventListener('click', disconnectFromMqtt);
