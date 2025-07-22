const fs = require("node:fs");
const path = require("node:path");

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
                return fs.promises.writeFile(dir, "", "utf-8");
            }

            return fs.promises.mkdir(dir, {recursive: true});
        }
    }
}

module.exports = {
    readAndParseJson,
    createRequiredFolders,
};