const fs = require("node:fs");
const path = require("node:path");
const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

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
                fs.promises.writeFile(dir, "", "utf-8");
                continue;
            }

            fs.promises.mkdir(dir, {recursive: true});
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
 * @param { String } url - Video url.
 * @returns { YoutubeVideoInfo }
 */
async function getYoutubeVideoInfo(url) {
    const videoInfo = await ytdl.getInfo(url);

    const title = videoInfo.videoDetails.title;
    const author = videoInfo.videoDetails.author;
    const id = videoInfo.videoDetails.videoId;
    const length = videoInfo.videoDetails.lengthSeconds;
    const description = videoInfo.videoDetails.description

    return {
        title, author, id, length, description
    };
}

/**
 * Downloads a youtube video as mp3.
 * 
 * @param { String } url - Video url.
 * @param { String } fileName - File name to save as.
 * @param { String? } outpath - Path to save file to.
 * @param { Function? } onProgress - Callback for progress updates.
 */
async function downloadYoutubeVideo(url, fileName, outpath = "", onProgress) {
    return new Promise(resolve => {
        const outputFile = path.join(outpath, `${fileName}.mp3`);
        const tempFile = path.join(outpath, `temp_${fileName}.mp3`);
        
        // Download video and audion and log progress.
        ytdl(url, { quality: "highestaudio", filter: "audioonly" })
        .pipe(fs.createWriteStream(tempFile))
        .on('finish', () => {
            const startTime = new Date();
    
            ffmpeg(tempFile)
            .output(outputFile)
            .on('progress', (progress) => {
                const percent = Math.floor(progress.percent);
                const timemark = progress.timemark;
    
                // Estimate the remaining time using the elapsed time and percentage per progress mark.
                const elapsedTime = Date.now() - startTime;
                const timePerPercentProgress = (elapsedTime / progress.percent);
                const remainingPercent = 100 - percent;
    
                const remainingSeconds = (timePerPercentProgress * remainingPercent)/1000;
    
                console.log(`Progress: ${percent}% - Time: ${timemark} - Remaining: ${remainingSeconds.toFixed(2)}s`);
                onProgress?.({percent, elapsedTime, remainingPercent, remainingSeconds});
            })
            .on('end', () => {
                fs.unlinkSync(tempFile);
                resolve(outputFile);
            })
            .run();
        });
    });
}

module.exports = {
    readAndParseJson,
    createRequiredFolders,
    getYoutubeVideoInfo,
    downloadYoutubeVideo
};