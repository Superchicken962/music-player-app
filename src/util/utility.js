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

const currentlyPlaying = { stashId: null, songId: null };

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

    nameEl.textContent = reduceString(song.name, 22);
    artistEl.textContent = reduceString(song.artist, 22);

    const songEl = document.querySelector(`.song[data-id='${song.id}']`);
    songEl.className = "song playing";
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

    mainQueue.next();

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
/**
 * Register key binds to functions.
 * 
 * @param { Object } binds - Keybinds.
 * @param { Boolean } ignoreCase - Ignores case sensitivity, i.e. The same value is used for keys k and K if true (Use lowercase in keys).
 */
function registerKeyBinds(binds, ignoreCase = true) {
    if (keyBindsListener) document.removeEventListener("keydown", keyBindsListener);

    keyBindsListener = (e) => {
        const key = (ignoreCase) ? e.key.toLowerCase() : e.key;

        if (typeof binds[key] === "function") {
            binds[key](e);
        }
    };

    document.addEventListener("keydown", keyBindsListener);
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
    `;

    const cancelBtn = element.querySelector(".button.cancel");
    cancelBtn.addEventListener("click", showImportPage);

    // TODO: Add download progress.

    const downloadBtn = element.querySelector(".button.download");
    downloadBtn.addEventListener("click", async() => {
        cancelBtn.classList.add("disabled");
        downloadBtn.classList.add("disabled");

        const fields = harvestInputs(element);

        const path = await window.electronAPI.downloadYoutubeAudio(values.url, videoInfo.id);
        const newSong = new Song(videoInfo.id, fields["songTitle"], fields["songArtist"], path, {});

        await window.electronAPI.newSong(newSong);

        element.innerHTML = `
            Download complete!
        `;

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