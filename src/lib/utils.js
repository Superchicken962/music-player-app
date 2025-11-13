const fs = require("node:fs");
const path = require("node:path");
const ffmpeg = require("fluent-ffmpeg");
const { Innertube, UniversalCache } = require("youtubei.js");

/**
 * Create/get innertube instance - with cache.
 * 
 * @returns { Promise<Innertube> }
 */
async function getInnertube() {
    const innertube = await Innertube.create({ cache: new UniversalCache(true, "../.cache") });
    return innertube;
}

/**
 * Read and parse a json file at the given location.
 * 
 * @param { String } filepath - Path to file.
 * @param { Object } defaultValue - Value to return if reading/parsing fails.
 * @returns { Promise<Object> } Json object - empty if invalid.
 */
async function readAndParseJson(filepath, defaultValue = {}) {
    if (!fs.existsSync(filepath)) return defaultValue;

    const content = await fs.promises.readFile(filepath, "utf-8");

    try {
        return JSON.parse(content);
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Ensures all required folders/files exist, and creates them if they do not.
 * 
 * @param { String } appPath - Root path of directory to search from.
 * @param { String[] } folders - Array of folders/files to ensure exist.
 */
async function createRequiredFolders(appPath, folders) {
    // Check if folders exist, and create if they do not.
    for (const folder of folders) {
        let dir = path.join(appPath, folder);

        if (!fs.existsSync(dir)) {
            // If "folder" is a file, write to file instead of creating directory.
            if (folder.includes(".")) {
                fs.promises.writeFile(dir, "", { encoding: "utf-8" });
                continue;
            }

            await fs.promises.mkdir(dir, {recursive: true});
        }
    }
}

/**
 * @typedef { Object } YoutubeVideoInfo
 * @property { String } id - Video id.
 * @property { String } title - Video title.
 * @property { String } description - Video description.
 * @property { String } author - Video author/channel.
 * @property { Number } length - Video length (seconds).
 */

/**
 * Get basic information of a youtube video.
 * 
 * @param { String } vidId - Video id.
 * @returns { YoutubeVideoInfo }
 */
async function getYoutubeVideoInfo(vidId) {
    const innertube = await getInnertube();
    const videoInfo = await innertube.getBasicInfo(vidId);

    const title = videoInfo.basic_info.title;
    const author = videoInfo.basic_info.channel;
    const id = videoInfo.basic_info.id;
    const length = videoInfo.basic_info.duration;
    const description = videoInfo.basic_info.short_description;

    const getFormats = (type) => {
        return videoInfo.streaming_data.adaptive_formats
            .filter(f => f.mime_type.includes(type))
            .map(f => {
                return {
                    quality: f.quality_label ?? f.audio_quality,
                    mimeType: f.mime_type.split(";")[0],
                    itag: f.itag,
                    bitrate: `${Math.round(f.bitrate / 1000)} kbps`,
                    qualityName: capitaliseWord(f.audio_quality?.split("AUDIO_QUALITY_")?.[1])
                }
            });
    }

    // Won't need video formats now - but if we ever want to show video playback, this will come in handy.
    // const videoFormats = getFormats("video");
    const audioFormats = getFormats("audio");

    return {
        title, author, id, length, description, audioFormats
    };
}

/**
 * Downloads a youtube video as mp3.
 * 
 * @param { String } url - Video url.
 * @param { String } fileName - File name to save as.
 * @param { String? } outpath - Path to save file to.
 * @param { Function? } onProgress - Callback for progress updates.
 * @param { String | Number } quality - Default = best.
 */
async function downloadYoutubeVideo(videoId, fileName, outpath = "", onProgress, quality = "best") {
    return new Promise((resolve, reject) => {
        const outputFile = path.join(outpath, `${fileName}.mp3`);
        const tempFile = path.join(outpath, `temp_${fileName}.mp3`);

        // Download video and audion and log progress.
        // ytdl(url, { quality: "highestaudio", filter: "audioonly" })
        // .on("error", (e) => {
        //     reject(e);
        // })
        // .pipe(fs.createWriteStream(tempFile))
        // .on('finish', () => {
        //     const startTime = new Date();
    
        //     ffmpeg(tempFile)
        //     .output(outputFile)
        //     .on('progress', (progress) => {
        //         const percent = Math.floor(progress.percent);
        //         const timemark = progress.timemark;
    
        //         // Estimate the remaining time using the elapsed time and percentage per progress mark.
        //         const elapsedTime = Date.now() - startTime;
        //         const timePerPercentProgress = (elapsedTime / progress.percent);
        //         const remainingPercent = 100 - percent;
    
        //         const remainingSeconds = (timePerPercentProgress * remainingPercent)/1000;
    
        //         console.log(`Progress: ${percent}% - Time: ${timemark} - Remaining: ${remainingSeconds.toFixed(2)}s`);
        //         onProgress?.({percent, elapsedTime, remainingPercent, remainingSeconds});
        //     })
        //     .on('end', () => {
        //         fs.unlinkSync(tempFile);
        //         resolve(outputFile);
        //     })
        //     .on("error", (e) => {
        //         reject(e);
        //     })
        //     .run();
        // });
    });
}

/**
 * Call this function when the audio time is updated / progressed - updates saved information about song.
 */
function audioTimeUpdate(e, data) {
    console.log(data);
}

/**
 * Creates a string id based on the current timestamp, and a random number.
 * 
 * @returns { String }
 */
function generateRandomTimestampId() {
    const date = new Date().valueOf().toString(36);
    const random = Math.random().toString(36).substring(2);

    return date + random;
}

/**
 * Capitalises the first letter of word.
 * 
 * @param { String } word
 * @returns { String } Capitalised word.
 */
function capitaliseWord(word) {
    return word.charAt(0).toUpperCase() + word.toLowerCase().slice(1);
}

module.exports = {
    readAndParseJson,
    createRequiredFolders,
    getYoutubeVideoInfo,
    downloadYoutubeVideo,
    audioTimeUpdate,
    generateRandomTimestampId,
    capitaliseWord
};