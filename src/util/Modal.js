class Modal {
    #element;

    constructor(id) {
        this.#element = document.createElement("div");
        this.#element.className = "modal hidden";
        this.#element.id = id;
        
        document.body.appendChild(this.#element);
    }

    show() {
        this.#element.classList.remove("hidden");
    }

    hide() {
        this.#element.classList.add("hidden");
    }

    setHTML(html) {
        this.#element.innerHTML = html;
    }

    /**
     * Sets an event listener onto an element in the modal if it is found.
     * 
     * @param { String } selector - Selector to query select.
     * @param { String } event - Event to listen for.
     * @param { (e: Event, el: HTMLElement) => {} } listener - Listener function.
     */
    setListenerOnElements(selector, event, listener) {
        const elements = this.#element.querySelectorAll(selector);

        for (const el of elements) {
            el.addEventListener(event, (e) => {
                listener(e, el);
            });
        }
    }

    /**
     * Sets text of an element in the modal, if found.
     * 
     * @param { String } selector 
     * @param { String } text 
     */
    setElementText(selector, text) {
        const el = document.querySelector(selector);
        if (!el) return;

        el.textContent = text;
    }

    /**
     * Get all name/value pairs from elements in the modal.
     * 
     * @returns { Object }
     */
    getValues() {
        const obj = {};

        for (const el of document.querySelectorAll("[name]")) {
            obj[el.name] = el.value;
        }

        return obj;
    }
}