import Scene from "./Scene";
import {Graphics, Sprite} from "../libs/pixi-wrapper";
import Config from "../config";

export default class NewContentScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
    }

    onShow(system, closeCallback) {
        const info = Config.lockSystems[system];
        this.closeCallback = closeCallback;

        this.parent.setChildIndex(this, this.parent.children.length - 1);

        this.ui.title.text = App.getText(info.title);
        this.ui.image.removeChildren();
        let sprite = Sprite.from(info.image);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(info.imageScale, info.imageScale);
        this.ui.image.addChild(sprite);
        this.ui.dsc.text = App.getText(info.dsc);
    }

    onClickReturnButton() {
        App.hideScene("NewContentScene");
        this.closeCallback && this.closeCallback();
    }
}

NewContentScene.sceneFilePath = "myLaya/laya/pages/View/NewContentScene.scene.json";
