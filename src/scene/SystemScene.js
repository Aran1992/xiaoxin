import Scene from "./Scene";
import DataMgr from "../mgr/DataMgr";
import MusicMgr from "../mgr/MusicMgr";

export default class SystemScene extends Scene {
    onCreate() {
        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));

        this.onClick(this.ui.bgmButton, this.onClickBGMButton.bind(this));
        this.onClick(this.ui.soundButton, this.onClickSoundButton.bind(this));
    }

    onShow() {
        this.ui.bgmOnImage.visible = DataMgr.get(DataMgr.bgmOn, true);
        this.ui.bgmOffImage.visible = !DataMgr.get(DataMgr.bgmOn, true);
        this.ui.soundOnImage.visible = DataMgr.get(DataMgr.soundOn, true);
        this.ui.soundOffImage.visible = !DataMgr.get(DataMgr.soundOn, true);
    }

    onClickReturnButton() {
        App.hideScene("SystemScene");
        App.showScene("MainScene");
    }

    onClickBGMButton() {
        DataMgr.set(DataMgr.bgmOn, !DataMgr.get(DataMgr.bgmOn, true));
        this.ui.bgmOnImage.visible = DataMgr.get(DataMgr.bgmOn, true);
        this.ui.bgmOffImage.visible = !DataMgr.get(DataMgr.bgmOn, true);
        MusicMgr.muteBGM(!DataMgr.get(DataMgr.bgmOn, true));
    }

    onClickSoundButton() {
        DataMgr.set(DataMgr.soundOn, !DataMgr.get(DataMgr.soundOn, true));
        this.ui.soundOnImage.visible = DataMgr.get(DataMgr.soundOn, true);
        this.ui.soundOffImage.visible = !DataMgr.get(DataMgr.soundOn, true);
        MusicMgr.muteSound(!DataMgr.get(DataMgr.soundOn, true));
    }
}

SystemScene.sceneFilePath = "myLaya/laya/pages/View/SystemScene.scene.json";
