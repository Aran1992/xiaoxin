import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";
import EventMgr from "../mgr/EventMgr";

export default class PauseScene extends Scene {
    onClickContinueButton() {
        App.hideScene("PauseScene");
        EventMgr.dispatchEvent("Continue");
    }

    onClickMainButton() {
        App.showScene("TipScene", {
            tip: App.getText(this.args.clickMainTip),
            confirmCallback: () => {
                App.getScene(this.args.gameSceneName).settle();
                App.destroyScene(this.args.gameSceneName);
                App.hideScene("PauseScene");
                App.showScene("MainScene");
                App.getScene("MainScene").onGameEnded();
            },
            cancelCallback: () => {
            }
        });
    }

    onClickRestartButton() {
        App.showScene("TipScene", {
            tip: App.getText(this.args.clickRestartTip),
            confirmCallback: () => {
                App.getScene(this.args.gameSceneName).settle();
                App.hideScene("PauseScene");
                EventMgr.dispatchEvent("Restart");
            },
            cancelCallback: () => {
            }
        });
    }

    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.continueButton, this.onClickContinueButton.bind(this));
        this.onClick(this.ui.mainButton, this.onClickMainButton.bind(this));
        this.onClick(this.ui.restartButton, this.onClickRestartButton.bind(this));
    }

    onShow(args) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);
        this.args = args;
    }
}

PauseScene.sceneFilePath = "myLaya/laya/pages/View/PauseScene.scene.json";
