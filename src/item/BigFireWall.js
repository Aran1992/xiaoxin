import AniItem from "./AniItem";
import {Texture} from "../libs/pixi-wrapper";
import Config from "../config";

export default class BigFireWall extends AniItem {
    initAni() {
        let frames = [];
        for (let i = 1; i <= 4; i++) {
            frames.push(Texture.fromFrame(`firewallx4_0${i}.png`));
        }
        this.frames = frames;
        this.animationSpeed = 0.25;
        this.bodyWidth = Config.item.bigFireWall.bodyWidth;
        this.bodyHeight = Config.item.bigFireWall.bodyHeight;
    }
}
