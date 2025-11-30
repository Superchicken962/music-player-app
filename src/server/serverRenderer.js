const logElement = document.querySelector(".serverLogs");
const portInput = document.querySelector("#serverPort");

portInput.addEventListener("input", (ev) => {
    localStorage.setItem("serverPort", parseInt(ev.target.value));
});

const startBtn = document.querySelector("#serverStartBtn");
const stopBtn = document.querySelector("#serverStopBtn");
startBtn.addEventListener("click", window.electronAPI.startServer);
stopBtn.addEventListener("click", window.electronAPI.stopServer);

async function updateValues(serverInfo) {
    portInput.value = (localStorage.getItem("serverPort") ?? 3000);

    if (!serverInfo) {
        serverInfo = await window.electronAPI.getServerInfo();
    }

    if (serverInfo.running) {
        stopBtn.removeAttribute("disabled");
        startBtn.setAttribute("disabled", true);
    } else {
        startBtn.removeAttribute("disabled");
        stopBtn.setAttribute("disabled", true);
    }
}
updateValues();

// Handle showing logs from server.
window.electronAPI.listenFor("server:log", (ev) => {
    logElement.textContent += `\n[log]${JSON.stringify(ev)}`
});

window.electronAPI.listenFor("server:statusChange", (ev, info) => {
    updateValues(info);
});