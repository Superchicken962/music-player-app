const { default: ElectronStore } = require("electron-store");

const schema = {
    "discordRPC.enabled": {
        type: "boolean",
        default: false
    }
};

const electronStore = new ElectronStore({ schema });

module.exports = electronStore;