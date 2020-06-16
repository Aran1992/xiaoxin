import {TilingSprite} from "../libs/pixi-wrapper";
import Config from "../config";

export default class MovingBackground {
    constructor(bg, parent) {
        this.bg = new TilingSprite(bg.children[0].texture, App.sceneWidth, App.sceneHeight);
        parent.addChildAt(this.bg, 0);
        bg.visible = false;
    }

    stop() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            delete this.frameId;
        }
    }

    start() {
        const loop = () => {
            this.bg.tilePosition.x += Config.movingBackground.x;
            this.bg.tilePosition.y += Config.movingBackground.y;
            this.frameId = requestAnimationFrame(loop);
        };
        loop();
    }
}
