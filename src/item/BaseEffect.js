import {resources, Sprite} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";

function get(v, d) {
    return v === undefined ? d : v;
}

export default class BaseEffect {
    constructor(effectPath, animationEndCallback, gameMgr) {
        this.gameMgr = gameMgr;
        this.animationEndCallback = animationEndCallback;

        let effectData = resources[effectPath].data;
        let index = effectData.child.findIndex(child => child.label !== "Bike");
        let data = effectData.child[index];
        let sprite = new Sprite();
        sprite.scale.set(get(data.props.scaleX, 1), get(data.props.scaleY, 1));
        sprite.alpha = get(data.props.alpha, 1);
        sprite.visible = get(data.props.visible, true);
        sprite.position.set(get(data.props.x, 0), get(data.props.y, 0));

        switch (data.type) {
            case "Sprite": {
                sprite.texture = resources[`myLaya/laya/assets/${data.props.texture}`].texture;
                break;
            }
            case "Animation": {
                sprite.textures = GameUtils.getFrames(`myLaya/laya/assets/${data.props.source}`, data.props.autoAnimation);
                sprite.textureIndex = 0;
                sprite.texture = sprite.textures[sprite.textureIndex];
                sprite.interval = get(data.props.interval, 1);
                break;
            }
        }

        this.sprite = sprite;
        this.index = index;
    }

    update() {
        if (this.sprite.textures) {
            this.sprite.textureIndex += this.gameMgr.stepSpeed;
            let index = Math.floor(this.sprite.textureIndex / this.sprite.interval);
            if (this.sprite.textures[index] === undefined) {
                this.sprite.textureIndex = 0;
                index = 0;
                if (this.animationEndCallback) {
                    this.animationEndCallback();
                }
            }
            this.sprite.texture = this.sprite.textures[index];
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}
