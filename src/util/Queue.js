class Queue {
    #songs = [];
    #currentIndex = 0;
    // There's not really a benefit to using a separate size - should probably just use the array one.
    #size = 0;

    /**
     * Import array of songs into the queue.
     * 
     * @param  { ...Song } songs - Songs.
     */
    import(...songs) {
        this.empty();

        for (const song of songs) {
            this.add(song);
        }
    }

    /**
     * Export songs ids from the queue.
     * 
     * @returns { Song[] }
     */
    export() {
        return [...this.#songs];
    }

    /**
     * Empties the queue.
     */
    empty() {
        this.#songs.length = 0;
        this.#size = 0;
    }

    /**
     * Add a song to the queue.
     * 
     * @param { Song } song - Song object to add.
     */
    add(song) {
        this.#songs.push(song);
        this.#size++;
    }

    /**
     * Set the position/song in the queue.
     * 
     * @param { Song } song - Song to go to the position of.
     */
    setPosition(song) {
        const songIndex = this.#songs.findIndex(s => s.id === song.id);
        if (songIndex > -1) this.#currentIndex = songIndex;
    }

    /**
     * Get the next song.
     * 
     * @returns { Song }
     */
    getNext() {
        const nextIndex = (this.#currentIndex + 1)%this.#size;
        return this.#songs[nextIndex];
    }

    /**
     * Get the current song.
     * 
     * @returns { Song }
     */
    getCurrent() {
        return this.#songs[this.#currentIndex];
    }

    /**
     * Progress to the next song in the queue.
     */
    next() {
        this.#currentIndex = (this.#currentIndex + 1)%this.#size;
    }

    /**
     * Go back to the previous song in the queue.
     */
    previous() {
        if (this.#currentIndex === 0) this.#currentIndex = this.#size;
        this.#currentIndex -= 1;
    }

    /**
     * Get the size/length of the queue.
     * 
     * @returns { Number }
     */
    getSize() {
        return this.#size;
    }

    /**
     * Is the current song the final song in the queue?
     * 
     * @returns { Boolean }
     */
    isFinalSong() {
        return this.#currentIndex === (this.#size-1);
    }
}