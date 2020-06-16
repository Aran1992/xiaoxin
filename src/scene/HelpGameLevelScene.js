import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";

export default class HelpGameLevelScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
    }

    onShow(closeCallback) {
        this.closeCallback = closeCallback;
    }

    onClickReturnButton() {
        App.hideScene("HelpGameLevelScene");
        this.closeCallback && this.closeCallback();
    }
}

HelpGameLevelScene.sceneFilePath = "myLaya/laya/pages/View/HelpGameLevelScene.scene.json";
