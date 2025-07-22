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
 * 
 * @param { HTMLAudioElement } audio - Audio element.
 */
function initAudioFunctions(audio) {
    const playBtn = document.querySelector(".audioPlayerBar .play");

    audio.ontimeupdate = (event) => {
        const controlsEl = document.querySelector(".audioPlayerBar .controls");
        const progressBar = document.querySelector(".audioPlayerBar .progress input[type=range]");

        const seconds = audio.currentTime;
        const duration = audio.duration;
        const progress = (seconds / duration) * 100;

        console.log(seconds, duration, `${progress.toFixed(2)}%`);
        
        progressBar.value = progress;
    };

    audio.onplay = () => {
        playBtn.setAttribute("data-state", "playing");
        playBtn.innerHTML = `<i class="fa fa-pause"></i>`;
    }

    audio.onpause = () => {
        playBtn.innerHTML = `<i class="fa fa-play"></i>`;
        playBtn.setAttribute("data-state", "paused");
    }

    const volumeEl = document.querySelector(".audioPlayerBar .volume input");
    volumeEl.oninput = () => {
        const volume = volumeEl.value/100;

        localStorage.setItem("volume", volume);
        audio.volume = volume
    }
    volumeEl.value = (localStorage.getItem("volume") ?? 0.5) * 100;

    playBtn.onclick = () => {
        if (playBtn.getAttribute("data-state") === "paused") {
            audio.play();
            return;
        }

        audio.pause();
    }
}