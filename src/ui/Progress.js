export default class Progress {
    constructor(progress, text) {
        this.progress = progress;
        this.text = text;
        this.max = 1;
        this.value = 0;
        this.fixedPartWidth = this.progress.leftWidth + this.progress.rightWidth;
        this.changePartWidth = this.progress.texture.width - this.fixedPartWidth;
        this.update();
    }

    setMax(max) {
        this.max = max;
        this.update();
    }

    setValue(value) {
        if (value > this.max) {
            value = this.max;
        }
        this.value = value;
        this.update();
    }

    update() {
        const percent = this.value / this.max;
        this.progress.width = percent * this.changePartWidth + this.fixedPartWidth;
        if (this.text) {
            this.text.text = `${Math.floor(percent * 100)}%`;
        }
    }

    isFull() {
        return this.value === this.max;
    }
}
