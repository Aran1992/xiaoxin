import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";

export default class HelpHomeScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
    }

    onClickReturnButton() {
        App.hideScene("HelpHomeScene");
    }
}

HelpHomeScene.sceneFilePath = "myLaya/laya/pages/View/HelpHomeScene.scene.json";
