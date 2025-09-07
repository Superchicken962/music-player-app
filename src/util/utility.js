/**
 * Get the appropriate suffix for a given number (i.e. rd for 3).
 * 
 * @param { Number } num - Number to get suffix of.
 * @returns { String } Suffix
 */
function getNumberSuffix(num) {
    let j = num % 10;
    let k = num % 100;

    if (j === 1 && k !== 11) {
        return "st";
    }

    if (j === 2 && k !== 12) {
        return "nd";
    }

    if (j === 3 && k !== 13) {
        return "rd";
    }

    return "th";
}

/**
 * Audio options from initAudioFunctions.
 * @typedef { Object } InitAudioFunctionOptions
 * @property { Function } togglePause - Toggle pause on the song.
 */

const mainQueue = new Queue();

const currentlyPlaying = { stashId: null, songId: null, lyrics: null };

const isCurrentlyPlaying = (stashId, songId) => {
    return currentlyPlaying.stashId === stashId && currentlyPlaying.songId === songId;
}

function updateSongInfo(audio) {
    window.electronAPI.updateSongInfo({...mainQueue.getCurrent(), duration: audio.duration, currentTime: audio.currentTime});   
}

/**
 * 
 * @param { HTMLAudioElement } audio - Audio element.
 * @returns { InitAudioFunctionOptions }
 */
function initAudioFunctions(audio) {
    const playBtn = document.querySelector(".audioPlayerBar .play");
    const nextBtn = document.querySelector(".audioPlayerBar .next");
    const prevBtn = document.querySelector(".audioPlayerBar .previous");
    const progressBar = document.querySelector(".audioPlayerBar .progress input[type=range]");
    const elapsedTime = document.querySelector(".audioPlayerBar .progress .time.elapsed");
    const totalTime = document.querySelector(".audioPlayerBar .progress .time.duration");

    let timeI = 0;
    audio.ontimeupdate = (event) => {
        const controlsEl = document.querySelector(".audioPlayerBar .controls");

        const seconds = audio.currentTime;
        const duration = audio.duration;
        const progress = (seconds / duration) * 100;

        elapsedTime.textContent = `${Math.floor(seconds/60)}:${("0"+Math.floor(seconds)%60).slice(-2)}`;
        if (duration) {
            totalTime.textContent = `${Math.floor(duration/60)}:${("0"+Math.floor(duration)%60).slice(-2)}`;
        }
        
        progressBar.value = progress;

        updateLyricsProgress(audio, currentlyPlaying.lyrics);

        // Essentially update rich presence every ~10 seconds.
        if (timeI === 0) {
            updateSongInfo(audio);
        }

        timeI = (timeI+1)%30;
    };

    // Handle progress bar.
    progressBar.oninput = (e) => {
        // Calculate the position to go to in the song based on the percent inputted on the range.
        const targetPercent = e.target.value/100;
        const newTime = audio.duration * targetPercent;

        audio.currentTime = newTime;
    }

    // Handle skipping to previous and next song.
    nextBtn.onclick = () => {
        nextSong(audio);
        audio.play();
    }

    prevBtn.onclick = () => {
        // Technically go to the previous song by going back twice, then next.
        mainQueue.previous();
        mainQueue.previous();

        nextSong(audio);
        audio.play();
    }

    // Handle playing, pausing and ending.
    audio.onplay = () => {
        playBtn.setAttribute("data-state", "playing");
        playBtn.innerHTML = `<i class="fa fa-pause"></i>`;
        updateSongInfo(audio);
    }

    audio.onpause = () => {
        playBtn.innerHTML = `<i class="fa fa-play"></i>`;
        playBtn.setAttribute("data-state", "paused");

        window.electronAPI.updateSongInfo(null);
    }

    audio.onended = () => {
        const isLast = mainQueue.isFinalSong();

        nextSong(audio);
        
        // TODO: If repeat is enabled, autoplay.
        if (isLast) return;

        audio.play();
    }

    // Handle volume.
    const volumeEl = document.querySelector(".audioPlayerBar .volume input");
    volumeEl.oninput = () => {
        const volume = volumeEl.value/100;

        localStorage.setItem("volume", volume);
        audio.volume = volume
    }
    volumeEl.value = (localStorage.getItem("volume") ?? 0.5) * 100;

    const togglePause = () => {
        if (!currentlyPlaying.songId) return;

        if (playBtn.getAttribute("data-state") === "paused") {
            audio.play();
            return;
        }

        audio.pause();
    }

    playBtn.onclick = togglePause;

    return {
        togglePause
    };
}


/**
 * Set the song that is being currently played.
 */
function setPlayingSong(stashId, song) {
    currentlyPlaying.stashId = stashId;
    currentlyPlaying.songId = song.id;

    const nameEl = document.querySelector(".audioPlayerBar .song .text .name");
    const artistEl = document.querySelector(".audioPlayerBar .song .text .artist");

    nameEl.textContent = reduceString(song.name, 18);
    artistEl.textContent = reduceString(song.artist, 18);

    nameEl.title = song.name;
    artistEl.title = song.artist;

    const songEl = document.querySelector(`.song[data-id='${song.id}']`);
    if (songEl) songEl.className = "song playing";
}

/**
 * Get the next song in the queue.
 * 
 * @param { HTMLAudioElement } audio
 * @returns { Boolean } Was the previous song the last one in the queue? 
 */
function nextSong(audio) {
    const wasLast = mainQueue.isFinalSong();
    const nextSong = mainQueue.getNext();

    audio.currentTime = 0;
    audio.src = nextSong.path;

    deselectPlayingSongs();
    setPlayingSong(currentlyPlaying.stashId, nextSong);

    mainQueue.next()
    loadLyrics(nextSong);

    return wasLast;
}

/**
 * Checks if a given string exceeds a given length, and splits it and adds an ellipsis if it does.
 * 
 * @param { String } str - String to split. 
 * @param { Number? } maxLength - Max length to allow for string (def. 20). 
 * @returns { String } New string 
 */
function reduceString(str, maxLength = 20) {
    if (str.length < maxLength) {
        return str;
    }

    return str.slice(0, maxLength) + "...";
}

function deselectPlayingSongs() {
    for (const song of document.querySelectorAll(".song.playing")) {
        song.classList.remove("playing");
    }
}

let keyBindsListener = null;
let existingKeyBinds = {};

/**
 * Register new key binds to functions.
 * 
 * @param { Object } binds - Keybinds.
 * @param { Boolean } ignoreCase - Ignores case sensitivity, i.e. The same value is used for keys k and K if true (Use lowercase in keys).
 */
function registerKeyBinds(binds, ignoreCase = true) {
    if (keyBindsListener) document.removeEventListener("keydown", keyBindsListener);

    // Add new binds (or replace) to the existing binds.
    for (const [key,val] of Object.entries(binds)) {
        existingKeyBinds[key] = val;
    }

    keyBindsListener = (e) => {
        let key = (ignoreCase) ? e.key.toLowerCase() : e.key;
        
        // Append shift/ctrl if they are held when pressing.
        if (e.shiftKey && key !== "shift") {
            key = `shift-${key}`;
        }
        if (e.ctrlKey && key !== "control") {
            key = `ctrl-${key}`;
        }

        if (typeof existingKeyBinds[key] === "function") {
            existingKeyBinds[key](e);
        }
    };

    document.addEventListener("keydown", keyBindsListener);
}

/**
 * Unregisters a keybind listener given the key.
 * 
 * @param { String } key - Keybind to unregister.
 */
function unregisterKeyBind(key) {
    delete existingKeyBinds[key];
}

/**
 * @param { Modal } modal 
 */
async function initAddSongsModal(modal, stash, onSave) {
    const songsData = await window.electronAPI.getSongs();
    const allSongs = Object.values(songsData).map(song => Song.deserialize(song));
    
    // Filter songs to be only ones that are not in the stash already.
    const nonStashSongs = allSongs.filter(song => !stash.songs.includes(song.id));

    modal.setHTML(`
        <h2>Add Songs to ${stash.name}</h2>

        <p>Remove songs by right clicking them in the stash.</p>

        <div class="songsList">
            ${nonStashSongs.length === 0 ? `Looks like you have all the possible songs in your stash already!` : ""}

            ${nonStashSongs.map(song => `
                <div class="song" data-id="${song.id}">
                    <span class="artist">${song.artist}</span>
                    <span class="name">${song.name}</span>
                </div>
            `).join("")}
        </div>

        <a class="button solid inline cancel">Cancel</a>
        <a class="button solid inline save">Save</a>
    `);

    const songsToAdd = [];

    // Handle each song being clicked.
    modal.setListenerOnElements(".songsList .song", "click", (e, el) => {
        const songId = el.getAttribute("data-id");
        if (!songId) return;

        // If song has already been selected, deselect it.
        if (songsToAdd.includes(songId)) {
            songsToAdd.splice(songsToAdd.indexOf(songId), 1);
            el.classList.remove("selected");
            return;
        }

        songsToAdd.push(songId);
        el.classList.add("selected");
    });

    // Handle "cancel" being clicked.
    modal.setListenerOnElements(".button.cancel", "click", () => {
        modal.hide();
    });

    // Handle "save" being clicked.
    modal.setListenerOnElements(".button.save", "click", async() => {
        await window.electronAPI.addSongsToStash(stash.id, songsToAdd);
        modal.hide();

        onSave?.();
    });

    modal.show();
}
function showImportPage() {
    const display = document.querySelector(".stashDisplay");

    display.querySelector(".title").textContent = "Import Songs";
    display.querySelector(".description").textContent = "Import from file system, or download songs from YouTube.";
    const songs = display.querySelector(".songs");
    songs.classList.add("importSongs");

    const currentlySelected = (localStorage.getItem("importSectionSelected") ?? "local");

    songs.innerHTML = `
        <div class="sectionSelect">
            <a class="${(currentlySelected==="local") ? "selected" : ""}" data-value="local">Local Import</a>
            <a class="${(currentlySelected==="local") ? "" : "selected"}" data-value="download">YouTube Download</a>
        </div>

        <div class="section local hidden" data-for="local">
            <input class="fileInput" type="file" accept=".mp3" name="file"/>

            <input id="localImportMoveFile" type="checkbox" name="localImportMoveFile"/>
            <label for="localImportMoveFile">Move file to app directory</label>

            <br><br>

            <a class="button inline solid import">Import</a>
        </div>

        <div class="section download hidden" data-for="download">
            <h4>Download from YouTube</h4>

            <input name="url" type="url" placeholder="YouTube URL..."/>

            <a class="button inline solid download">Go</a>
        </div>
    `;

    // Handle selecting sections.
    const selectSection = (val) => {
        addClassToAll(".songs .section", "hidden");
        removeClassFromAll(`.songs .section[data-for=${val}]`, "hidden");
    }

    selectSection(currentlySelected);

    for (const select of songs.querySelectorAll(".sectionSelect a")) {
        select.onclick = () => {
            removeClassFromAll(".songs .sectionSelect a", "selected");
            select.classList.add("selected");
            localStorage.setItem("importSectionSelected", select.getAttribute("data-value"));

            selectSection(select.getAttribute("data-value"));
        }
    }

    // Handle importing both locally, and downloading youtube.

    const downloadBtn = songs.querySelector(".button.download");
    downloadBtn.addEventListener("click", (e) => {
        downloadButtonClick(e, songs.querySelector(".section.download"));
    });
}

async function downloadButtonClick(event, element) {
    const values = harvestInputs(element);
    
    try {
        const s = new URL(values.url);
    } catch (error) {
        // TODO: Show error/warning to page.
        console.warn("Invalid url!");
        return;
    }
    
    const onProgress = (data) => {
        console.log("progress", data);
    }

    const onComplete = (file) => {
        console.log("done", file);
    }

    // Disable the button so it  can't be clicked again.
    event.target.classList.add("disabled");
    element.innerHTML = `
        <p>Loading YouTube Video...</p>
    `;

    const videoInfo = await window.electronAPI.getYoutubeVideoInfo(values.url);
    console.log(videoInfo);

    element.innerHTML = `
        <div class="downloadInfo">
            <p>
                ${videoInfo.author?.name}<br>
                ${videoInfo.title}<br>
                ${videoInfo.length}s
            </p>

            <div class="block">
                <input id="songArtist" name="songArtist" value="${videoInfo.author?.name}"/>
                <label for="songArtist">Artist</label>

                <br>

                <input id="songTitle" name="songTitle" value="${videoInfo.title}"/>
                <label for="songTitle">Song Name</label>
            </div>

            <a class="button inline solid cancel">Cancel</a>
            <a class="button inline solid download">Download</a>
        </div>

        <div class="progress">
            <div class="progressBar">
                <div class="bar"></div>
            </div>
            <p class="text">0%</p>
            <p class="message"></p>
        </div>
    `;

    const cancelBtn = element.querySelector(".button.cancel");
    cancelBtn.addEventListener("click", showImportPage);

    const progressBar = element.querySelector(".progressBar .bar");
    const progressText = element.querySelector(".progress .text");
    const progressMessage = element.querySelector(".progress .message");

    // Listen for download progress - show it on page.
    window.electronAPI.listenFor("YTDownloadProgress", (data) => {
        progressBar.style.width = `${data.percent}%`;
        progressText.textContent = `${data.percent}%`;

        console.log("Progress!", data);
    });

    const downloadBtn = element.querySelector(".button.download");
    downloadBtn.addEventListener("click", async() => {
        cancelBtn.classList.add("disabled");
        downloadBtn.classList.add("disabled");

        const fields = harvestInputs(element);

        const path = await window.electronAPI.downloadYoutubeAudio(values.url, videoInfo.id);
        const newSong = new Song(videoInfo.id, fields["songTitle"], fields["songArtist"], path, {});

        await window.electronAPI.newSong(newSong);

        // element.innerHTML = `
        //     Download complete!
        // `;

        progressBar.style.width = "100%";
        progressText.textContent = "100%";
        progressMessage.textContent = "Download complete!";

        element.querySelector(".downloadInfo")?.classList?.add("hidden");

        updateStashList();
    });
}

/**
 * Removes a class from all elements in query selector.
 *
 * @param { String } selector - Selector to use.
 * @param { String } className - Class to remove.
 */
function removeClassFromAll(selector, className) {
    document.querySelectorAll(selector).forEach(e => e.classList.remove(className));
}
/**
 * Adds a class to all elements in query selector.
 *
 * @param { String } selector - Selector to use.
 * @param { String } className - Class to add.
 */
function addClassToAll(selector, className) {
    document.querySelectorAll(selector).forEach(e => e.classList.add(className));
}

/**
 * Harvest inputs and the values from a given container.
 * 
 * @param { HTMLElement } container - Container of inputs.
 * @returns { Object } Key/val pairs from inputs.
 */
function harvestInputs(container) {
    const vals = {};
    
    for (const inp of container.querySelectorAll("input")) {
        if (!inp.name) continue;

        vals[inp.name] = inp.value;
    }

    return vals;
}

/**
 * Initiates a modal for editing a stash.
 * 
 * @param { Modal } modal
 * @param { Stash } stash 
 */
function initEditStashModal(modal, stash, onSave) {
    modal.setHTML(`
        <h2>Editing Stash</h2>

        <input class="textInput stashName" name="stashName" value="${stash.name}" placeholder="Name..."/>
        <textarea class="textInput stashDesc" name="stashDesc" placeholder="Description...">${stash.description == "No description" ? "" : stash.description}</textarea>

        <p class="output"></p>

        <a class="button solid inline cancel">Cancel</a>
        <a class="button solid inline save">Save</a>
    `)
    modal.show();

    modal.setListenerOnElements(".button", "click", (e, el) => {
        if (el.classList.contains("cancel")) {
            modal.hide();
            return;
        }

        onSave?.();
    });
}

/**
 * Allow use of gaps in lyrics?
 */
const USE_LYRIC_GAPS = true;
const USE_SMOOTH_SCROLL = true;

let useAutoScroll = true;
let ignoringFromAutoScroll = false;

// Object for edited lyrics data to be placed.
let editedLyrics = {};

async function loadLyrics(song) {
    const lyricsEl = document.querySelector(".lyricsDisplay .lyrics");
    const title = document.querySelector(".lyricsDisplay .title");
    const editBtn = document.querySelector(".editLyricsBtn");
    const saveBtn = document.querySelector(".saveLyricsBtn");
    
    const lyrics = await window.electronAPI.getLyrics(song.id);

    if (!lyrics) {
        lyricsEl.innerHTML = `
            No Lyrics For This Song!<br>
            Create some <a href="#">here</a>
        `;
        lyricsBtn.classList.add("none");
        lyricsEl.classList.add("none");
        editBtn.classList.add("hidden");
        currentlyPlaying.lyrics = null;
        lyricsEl.style.backgroundColor = `transparent`;
        return;
    }

    editBtn.classList.remove("hidden");
    lyricsBtn.classList.remove("none");
    lyricsEl.classList.remove("none");
    // TODO: Show lyrics and initiate events and audio sync stuff.
    lyricsEl.innerHTML = `
        <div class="lines"></div>
    `;
    currentlyPlaying.lyrics = lyrics;
    lyricsEl.style.backgroundColor = `rgba(${lyrics.colour ?? "255, 165, 0"}, 0.2)`;

    // Toggle lyric edit mode when this button is clicked.
    editBtn.onclick = () => {
        editedLyrics = {};

        // Disable edit mode.
        if (lyricEditMode) {
            editBtn.classList.remove("active");
            saveBtn.classList.add("hidden");
            lyricEditMode = false;
            updateEditLyricsNote();

            // Unregister the save keybind so it does not work when not in edit mode.
            unregisterKeyBind("ctrl-s");
            return;
        }

        // Enable edit mode.
        editBtn.classList.add("active");
        saveBtn.classList.remove("hidden");
        lyricEditMode = true;
        useAutoScroll = false;
        updateEditLyricsNote();

        const save = () => {
            saveEditedLyrics(song.id);
        }

        saveBtn.onclick = save;

        // Add keybind to save.
        registerKeyBinds({
            "ctrl-s": save                
        });
    }

    useAutoScroll = true;
}

let lyricEditMode = false;

function updateLyricsProgress(audio, lyrics) {
    const lyricLines = document.querySelector(".lyricsDisplay .lyrics .lines");
    if (!lyrics?.lyrics) return;

    // Create lines if they do not already exist.
    if (lyricLines.querySelectorAll(".line").length === 0) {
        let i = 0;
        for (const lyric of lyrics?.lyrics) {
            const lyricEl = document.createElement("p");
            lyricEl.className = "line";
            lyricEl.id = `lyric${i}`;
            lyricEl.innerHTML = formatLyricText(lyric.text);
            lyricEl.setAttribute("data-at", lyric.at);
            lyricEl.setAttribute("data-position", i);

            if (lyric.includeGap && USE_LYRIC_GAPS) {
                lyricEl.classList.add("gap");
            }

            // When lyric line is clicked, go to that point in the song.
            lyricEl.onclick = () => {
                audio.currentTime = lyric.at;
                audio.play();
            }

            // TODO: For "edit" mode, this can set the current lyrics 'at' value.
            lyricEl.oncontextmenu = () => {
                if (!lyricEditMode) return;

                // If right clicked again, undo.
                if (editedLyrics[lyricEl.id]) {
                    delete editedLyrics[lyricEl.id];
                    lyricEl.classList.remove("editRecorded");
                    updateEditLyricsNote();
                    return;
                }

                editedLyrics[lyricEl.id] = {text: lyric.text, at: audio.currentTime, position: parseInt(lyricEl.getAttribute("data-position"))};
                updateEditLyricsNote();

                lyricEl.classList.add("editRecorded");
            }

            lyricLines.appendChild(lyricEl);
            i++;
        }

        // Disable auto scroll when user manually scrolls.
        lyricLines.addEventListener("scroll", () => {
            // Ignore non-user scroll.
            if (ignoringFromAutoScroll) {
                
                // If using smooth scroll, wait 0.3s before changing var, otherwise do not wait.
                let ms = USE_SMOOTH_SCROLL ? 300 : 0;

                setTimeout(() => {
                    ignoringFromAutoScroll = false;
                }, ms);
                return;
            }

            useAutoScroll = false;
        });

        return;
    }

    const existingLyrics = lyricLines.querySelectorAll(".line");
    for (const lyric of existingLyrics) {
        const atPoint = parseInt(lyric.getAttribute("data-at"));

        // If lyric has passed "at" time, then add classname to show that. Otherwise remove it.
        if (audio.currentTime >= atPoint) {
            lyric.classList.add("played");
            
            if (useAutoScroll) {
                // Set this to true to tell scroll listener that this was automatic, and to not disable autoscroll.
                ignoringFromAutoScroll = true;
                lyric.scrollIntoView({"block": "center", "behavior": USE_SMOOTH_SCROLL ? "smooth" : "instant" })
            }
        } else {
            lyric.classList.remove("played");
        }
    }
}

function updateEditLyricsNote() {
    const note = document.querySelector(".lyricsDisplay .note");
    let text = "";
    
    if (lyricEditMode) {
        text = `
            EDIT MODE<br><br>
            Right click lyrics to sync it to the current position in the song, right click again to undo selection.
            
            <!--<br><br>?? on lyrics to open a popup to edit the text.-->

            <br><br>To save, either click the floppy disk button, or press CTRL+S.
        `;
    }
    
    if (Object.values(editedLyrics).length === 0) {
        document.querySelectorAll(".lyricsDisplay .line").forEach(e => e.classList.remove("editRecorded"));
    }

    note.innerHTML = text;
}

/**
 * Formats lyric - essentially just converts any special characters.
 *
 * @param { String } lyric - Lyric to format.
 * @returns { String } Lyric.
 */
function formatLyricText(lyric) {
    lyric = lyric.replaceAll("%m", `<i class="fa-solid fa-music"></i>`);
    return lyric;
}

async function saveEditedLyrics(songId) {
    // Sort lyrics by position, then delete it as to not include it in save files.
    const lyrics = Object.values(editedLyrics)
        .sort((a,b) => a.position - b.position)
        .map(l => {
            delete l.position;

            return l;
        });

    await window.electronAPI.updateSongLyrics(songId, lyrics);

    showSmallMessage("Saved Lyrics!", 4000, "success", document.querySelector(".lyricsDisplay"));
}

function showSmallMessage(message, dismissAfter = 5000, type, parentContainer) {
    const el = document.createElement("div");
    el.className = "smallTopMsg";
    el.textContent = message;

    if (!parentContainer) parentContainer = document.body;
    parentContainer?.appendChild(el);

    if (type) {
        el.classList.add(type);
    }

    setTimeout(() => {
        el.remove();
    }, dismissAfter);
}