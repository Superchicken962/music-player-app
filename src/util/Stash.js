class Stash {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.songs = [];
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