class Song {
    /**
     * Song
     * 
     * @param { String } id - Unique song id.
     * @param { String } name - Song name.
     * @param { String } artist - Song artist.
     * @param { String } fileName - Name of the audio file.
     * @param { SongMetadata } metadata - Additional information about the song.
     */
    constructor(id, name, artist, fileName, metadata) {
        this.id = id;
        this.name = name;
        this.artist = artist;
        this.fileName = fileName;
        this.metadata = metadata;
    }

    /**
     * Deserialize a regular object into a Song object.
     * 
     * @param { Object } obj - Object to use.
     * @returns { Song }
     */
    static deserialize(obj) {
        return Object.create(Song.prototype, Object.getOwnPropertyDescriptors(obj))
    }
}