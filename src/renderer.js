async function updateStashList() {
    const stashes = await window.electronAPI.getStashes();

    const listEl = document.querySelector(".stashList .stashes");
    listEl.innerHTML = "";

    for (const stash of stashes) {
        const el = document.createElement("div");
        el.className = "stash";

        el.innerHTML = `
            <h3>${stash.name ?? "Unknown"}</h3>
            <p>17 Songs • 1h 39m</p>
        `;

        el.addEventListener("click", () => {
            loadStash(stash, el);
        });

        listEl.appendChild(el);
    }
}
updateStashList();

function deselectAllStashes() {
    for (const stash of document.querySelectorAll(".stashList .stashes .stash")) {
        stash.classList.remove("selected");
    }
}

async function loadStash(stash, el) {
    const stashEl = document.querySelector(".stashDisplay");
    const title = stashEl.querySelector(".title");
    const desc = stashEl.querySelector(".description");
    const songsEl = stashEl.querySelector(".songs");

    const mainTitle = document.querySelector(".mainTitle");
    mainTitle.classList.add("hidden");
    stashEl.classList.remove("hidden");

    deselectAllStashes();
    el.classList.add("selected");

    // TODO: Add loading indicator.

    const songs = await window.electronAPI.getSongs();
    console.log(songs);

    title.textContent = stash.name;
    desc.textContent = stash.description;
}