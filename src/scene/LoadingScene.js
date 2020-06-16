import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";
import BikeSprite from "../item/BikeSprite";
import Utils from "../mgr/Utils";
import Config from "../config";

export default class LoadingScene extends Scene {
    onCreate() {
        this.curPercent = 0;
        this.goToPercent(0);
        this.bikeSprite = new BikeSprite(this);
    }

    onShow(bikeID) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);
        this.goToPercent(0);
        this.timer = requestAnimationFrame(this.onAnimationFrame.bind(this));
        this.bikeSprite.setBikeID(bikeID);
        this.bikeSprite.play();
        this.ui.tipText.text = App.getText(`Tip${Math.floor(Utils.randomInRange(1, Config.tipCount + 1))}`);
    }

    onHide() {
        cancelAnimationFrame(this.timer);
        this.bikeSprite.stop();
    }

    goToPercent(percent, callback) {
        this.targetPercent = percent;
        this.targetCallback = callback;
    }

    setPercent(percent) {
        this.ui.percentText.text = `${Math.floor(percent)}%`;
        let graphics = new Graphics();
        graphics.beginFill();
        let pos = this.ui.percentImage.getGlobalPosition();
        let width = this.ui.percentImage.width * percent / 100;
        graphics.drawRect(
            pos.x,
            pos.y,
            width,
            this.ui.percentImage.height
        );
        graphics.endFill();
        this.ui.percentImage.mask = graphics;
        this.bikeSprite.setPosition(pos.x + width - (App.realWidth - App.sceneWidth) / 2, pos.y);
    }

    onAnimationFrame() {
        this.curPercent++;
        if (this.curPercent > this.targetPercent) {
            this.curPercent = this.targetPercent;
            if (this.targetCallback) {
                this.targetCallback();
                this.targetCallback = undefined;
            }
        }
        this.setPercent(this.curPercent);
        this.timer = requestAnimationFrame(this.onAnimationFrame.bind(this));
    }
}

LoadingScene.sceneFilePath = "myLaya/laya/pages/View/LoadingScene.scene.json";
