class Stash {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.songs = [];
    }

    /**
     * Deserialize a regular object into a Stash object.
     * 
     * @param { Object } obj - Object to use.
     * @returns { Stash }
     */
    static deserialize(obj) {
        return Object.create(Stash.prototype, Object.getOwnPropertyDescriptors(obj))
    }
}