let updatedAlready = false;

const logElement = document.querySelector("#serverLogs");
const portInput = document.querySelector("#serverPort");

portInput.addEventListener("input", (ev) => {
    localStorage.setItem("serverPort", parseInt(ev.target.value));
});

const startBtn = document.querySelector("#serverStartBtn");
const stopBtn = document.querySelector("#serverStopBtn");
const clearLogsBtn = document.querySelector("#clearLogsBtn");
startBtn.addEventListener("click", () => {
    window.electronAPI.startServer(portInput.value);
});
stopBtn.addEventListener("click", window.electronAPI.stopServer);
clearLogsBtn.addEventListener("click", () => {
    window.electronAPI.clearServerLogs();
    logElement.textContent = "";
    updateValues();
});

async function updateValues(serverInfo) {
    portInput.value = (localStorage.getItem("serverPort") ?? 3000);

    if (!serverInfo) {
        serverInfo = await window.electronAPI.getServerInfo();
    }

    if (serverInfo.running) {
        stopBtn.removeAttribute("disabled");
        startBtn.setAttribute("disabled", true);
        portInput.setAttribute("disabled", true);
    } else {
        startBtn.removeAttribute("disabled");
        stopBtn.setAttribute("disabled", true);
        portInput.removeAttribute("disabled");
    }

    // For the first update, show previous logs.
    if (!updatedAlready) {
        const logs = await window.electronAPI.getServerLogs();
        logs.forEach(appendLog);
    }

    // Disable clear log button if there are no logs.
    if (logElement.value.length > 0) {
        clearLogsBtn.removeAttribute("disabled");
    } else {
        clearLogsBtn.setAttribute("disabled", true);
    }

    updatedAlready = true;
}
updateValues();

// Handle showing logs from server.
window.electronAPI.listenFor("server:log", appendLog);

function appendLog(log) {
    const date = new Date(log.date);
    logElement.textContent += `[${date.toLocaleTimeString()}] ${log.content}\n`;
    
    // Auto scroll to bottom on new log.
    logElement.scrollTop = logElement.scrollHeight;
}

window.electronAPI.listenFor("server:statusChange", (ev, info) => {
    updateValues(info);
});