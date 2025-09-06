const audio = new Audio();

const modal = new Modal("mainModal");

async function updateStashList() {
    const stashes = await window.electronAPI.getStashes();

    const listEl = document.querySelector(".stashList .stashes");
    listEl.innerHTML = "";

    for (const stash of stashes) {
        const el = document.createElement("div");
        el.className = "stash";
        el.id = `stash${stash.id}`;
        el.setAttribute("data-id", stash.id);

        el.innerHTML = `
            <h3>${stash.name ?? "Unknown"}</h3>
            <!-- <p>17 Songs • 1h 39m</p> -->
            <p>${stash.songs?.length ?? 0} Song${stash.songs?.length === 1 ? "" : "s"} • N/A</p>
        `;

        el.addEventListener("click", () => {
            loadStash(stash, el);
        });

        // TODO: Double click stash to start playing it - would require loading songs before this, so perhaps reconsider how song data is loaded and can be for all.
        // el.addEventListener("dblclick", () => {
        //     console.log(mainQueue.getCurrent(), mainQueue.getSize());
        // });

        listEl.appendChild(el);

        // Do not add context menu for main - .
        if (stash.isMain) continue;

        // Setup right click context menu using tippy.js.
        const menu = tippy(el, {
            content: `
            <div class="context-menu">
                <div class="menu-item delete">Delete</div>
            </div>
            `,
            placement: 'right-start',
            trigger: 'manual',
            interactive: true,
            arrow: false,
            offset: [0, 0],
            theme: "light",
            allowHTML: true,
            onMount: (instance) => {
                const deleteBtn = instance.popper.querySelector(".menu-item.delete");
                deleteBtn.onclick = async() => {
                    // TODO: Improve the confirm prompt.
                    const del = confirm(`Are you sure you want to delete '${stash.name}'?`);
                    if (!del) return;

                    await window.electronAPI.deleteStash(stash.id);
                    updateStashList();
                }
            }
        });

        el.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            menu.setProps({
                getReferenceClientRect: () => ({
                    width: 0,
                    height: 0,
                    top: e.clientY,
                    bottom: e.clientY,
                    left: e.clientX,
                    right: e.clientX,
                }),
            });

            menu.show();
        });
    }
}
updateStashList();

function deselectAllStashes() {
    for (const stash of document.querySelectorAll(".stashList .stashes .stash")) {
        stash.classList.remove("selected");
    }
}

/**
 * Map song ids to the objects.
 * 
 * @param { Stash } stash - Stash with song ids.
 * @param { Song[] } allSongs - Array of all songs.
 * @returns { Song[] }
 */
function mapSongsToStash(stash, allSongs) {
    const songs = [];

    for (const songId of stash.songs) {
        const find = allSongs.find(s => s.id === songId);
        if (!find) continue;

        songs.push(find);
    }

    return songs;
}

let selectedStash = null;
let selectedStashId = null;

async function loadStash(stash, el) {
    selectedStash = el;
    selectedStashId = stash.id;

    const lyricsPage = document.querySelector(".lyricsDisplay");
    const stashEl = document.querySelector(".stashDisplay");
    const title = stashEl.querySelector(".title");
    const desc = stashEl.querySelector(".description");
    const songsEl = stashEl.querySelector(".songs");
    songsEl.className = "songs";

    const mainTitle = document.querySelector(".mainTitle");
    mainTitle.classList.add("hidden");
    stashEl.classList.remove("hidden");
    hideLyricsPage();

    deselectAllStashes();
    el.classList.add("selected");

    // TODO: Add loading indicator.

    const songsData = await window.electronAPI.getSongs();
    const allSongs = Object.values(songsData).map(song => Song.deserialize(song));

    title.textContent = stash.name;
    if (!stash.isMain) title.innerHTML += ` <a class="button inline editStashBtn"><i class="fa fa-pencil"></i></a>`;
    desc.innerHTML = `
        ${stash.description}<br><br>
        <a class="button solid inline addSongBtn">${stash.isMain ? "Import Song" : "Add Song"}</a>
    `;

    desc.querySelector(".addSongBtn").addEventListener("click", () => {
        if (stash.isMain) {
            showImportPage();
            return;
        }

        initAddSongsModal(modal, stash, async() => {
            // Update the stash list, then click the stash again to reload it with the new songs. 
            await updateStashList();
            reloadStash(stash.id);
        });
    });

    document.querySelector(".editStashBtn")?.addEventListener("click", () => {
        initEditStashModal(modal, stash, async() => {
            const values = modal.getValues();
            if (!values.stashName) {
                modal.setElementText(".output", "You must provide a name for the stash!");
                return;
            }

            await window.electronAPI.editStash(selectedStashId, values.stashName, values.stashDesc);
            await updateStashList();
            reloadStash(selectedStashId);

            modal.hide();
        });
    });

    songsEl.innerHTML = "";

    // Map each song id in the stash to the correct song to get info.
    const stashSongs = mapSongsToStash(stash, allSongs);

    if (stashSongs.length === 0) {
        songsEl.innerHTML = `
        
        `;
        return;
    }

    stashSongs.forEach((song, i) => {
        const el = document.createElement("div");
        el.className = "song";
        el.id = song.id;
        el.setAttribute("data-id", song.id);
        el.role = "button";

        // Check if this song is the one playing - if so, highlight it.
        if (isCurrentlyPlaying(stash.id, song.id)) {
            el.classList.add("playing");
        }

        el.innerHTML = `
            <p>
                <span class="position">${i+1}</span>
                <span class="name">${song.name}</span>
                <span class="artist">${song.artist}</span>
            </p>
        `;

        el.addEventListener("dblclick", async() => {
            deselectPlayingSongs();

            const playing = await playSong(song);
            if (!playing) {
                // TODO: Display error on playing song.
                return;
            }
            
            setPlayingSong(stash.id, song);

            mainQueue.import(...stashSongs);
            mainQueue.setPosition(song);

            updateSongInfo(audio);

            el.className = "song playing";
        });

        songsEl.appendChild(el);
    });
}

function reloadStash(stashId) {
    const stashEl = document.querySelector(`.stashes .stash#stash${stashId}`);
    stashEl?.click();
}

/**
 * @param { Song } song 
 * @return { Promise<Boolean> } is the song playing now?
 */
async function playSong(song) {
    // TODO: Perhaps check with another audio before switching the src, so the current song doesn't end if invalid?
    // And/or check beforehand and disable songs without valid paths.

    // TODO: Add queues.
    try {
        audio.src = song.path;
        await audio.play();
    } catch (error) {
        console.log(`Unable to play song '${song.name}'!`);
        return false; 
    }

    audio.volume = localStorage.getItem("volume") ?? 0.05;
    loadLyrics(song);
    return true;
}

const audioOptions = initAudioFunctions(audio);

/* Manage creating stashes */

async function createStash() {
    const stashes = await window.electronAPI.getStashes();
    const newStash = new Stash(stashes.length, `My ${stashes.length}${getNumberSuffix(stashes.length)} Stash`, "No description");

    await window.electronAPI.newStash(newStash);
    updateStashList();

    // loadStash(newStash);
}

const lyricsBtn = document.querySelector(".controls .lyrics");
lyricsBtn.addEventListener("click", toggleLyricsPage);
const lyricsPageEl = document.querySelector(".lyricsDisplay");

function showLyricsPage() {
    const stashEl = document.querySelector(".stashDisplay");
    lyricsPageEl.classList.remove("hidden");
    stashEl.classList.add("hidden");
    lyricsBtn.classList.add("selected");
}
function hideLyricsPage() {
    const stashEl = document.querySelector(".stashDisplay");
    lyricsBtn.classList.remove("selected");
    lyricsPageEl.classList.add("hidden");
    stashEl.classList.remove("hidden");
}
function toggleLyricsPage() {
    const showPage = lyricsPageEl.classList.contains("hidden");

    if (showPage) {
        showLyricsPage();
        return;
    }

    hideLyricsPage();
}

const createStashBtn = document.querySelector(".createStashBtn");
createStashBtn.addEventListener("click", createStash);

registerKeyBinds({
    " ": (e) => {
        // Do not toggle pause if currently typing into an input.
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        audioOptions.togglePause();
    },
    "ctrl-r": (e) => {
        // Uncomment to prevent reloading - perhaps only use outside of development.
        // e.preventDefault();
    }
});