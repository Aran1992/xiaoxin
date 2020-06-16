import {Container, Sprite} from "../libs/pixi-wrapper";
import Config from "../config/base-config";

export default class Scroll {
    constructor(imagePath, viewWidth, moveVelocity) {
        this.viewWidth = viewWidth;
        this.moveVelocity = moveVelocity;
        this.container = new Container();
        this.before = this.createSprite(imagePath);
        this.before.x = 0;
        this.after = this.createSprite(imagePath);
        this.after.x = this.before.x + this.before.width;
    }

    createSprite(imagePath) {
        const sprite = Sprite.from(imagePath);
        sprite.anchor.set(0, 0);
        return this.container.addChild(sprite);
    }

    onFrame() {
        this.after.x -= this.moveVelocity / Config.fps;
        this.before.x -= this.moveVelocity / Config.fps;
        if (this.after.x + this.after.width <= this.viewWidth) {
            this.onExhaust();
        }
    }

    onExhaust() {
        this.before.position.x = this.after.position.x + this.after.width;
        const temp = this.before;
        this.before = this.after;
        this.after = temp;
    }
}
