import AniItem from "./AniItem";
import {Texture} from "../libs/pixi-wrapper";
import Config from "../config";

export default class SmallFireWall extends AniItem {
    initAni() {
        let frames = [];
        for (let i = 1; i <= 4; i++) {
            frames.push(Texture.fromFrame(`firewallx4B_0${i}.png`));
        }
        this.frames = frames;
        this.animationSpeed = 0.25;
        this.bodyWidth = Config.item.smallFireWall.bodyWidth;
        this.bodyHeight = Config.item.smallFireWall.bodyHeight;
    }
}
