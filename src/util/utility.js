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

/**
 * 
 * @param { HTMLAudioElement } audio - Audio element.
 * @returns { InitAudioFunctionOptions }
 */
function initAudioFunctions(audio) {
    const playBtn = document.querySelector(".audioPlayerBar .play");
    const progressBar = document.querySelector(".audioPlayerBar .progress input[type=range]");

    audio.ontimeupdate = (event) => {
        const controlsEl = document.querySelector(".audioPlayerBar .controls");

        const seconds = audio.currentTime;
        const duration = audio.duration;
        const progress = (seconds / duration) * 100;

        console.log(seconds, duration, `${progress.toFixed(2)}%`);
        
        progressBar.value = progress;
    };

    // Handle progress bar.
    progressBar.oninput = (e) => {
        // Calculate the position to go to in the song based on the percent inputted on the range.
        const targetPercent = e.target.value/100;
        const newTime = audio.duration * targetPercent;

        audio.currentTime = newTime;
    }

    // Handle playing, pausing and ending.
    audio.onplay = () => {
        playBtn.setAttribute("data-state", "playing");
        playBtn.innerHTML = `<i class="fa fa-pause"></i>`;
    }

    audio.onpause = () => {
        playBtn.innerHTML = `<i class="fa fa-play"></i>`;
        playBtn.setAttribute("data-state", "paused");
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

    const songEl = document.querySelector(`.song#${song.id}`);
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

    keyBindsListener = document.addEventListener("keydown", (e) => {
        const key = (ignoreCase) ? e.key.toLowerCase() : e.key;

        if (typeof binds[key] === "function") {
            binds[key](e);
        }
    });
}