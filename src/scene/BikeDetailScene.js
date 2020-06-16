import Scene from "./Scene";
import {Graphics, resources} from "../libs/pixi-wrapper";
import BikeSprite from "../item/BikeSprite";
import Config from "../config";
import DataMgr from "../mgr/DataMgr";
import Utils from "../mgr/Utils";
import GameUtils from "../mgr/GameUtils";

export default class BikeDetailScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));

        let detailPanel = this.ui.bikeSpritePanel;
        this.bikeSprite = new BikeSprite(detailPanel);
        this.bikeSprite.setPosition(detailPanel.mywidth / 2, Config.drawScene.bikeSprite.y);
    }

    onShow(id, levelUp, highestLevel, closeCallback) {
        this.closeCallback = closeCallback;

        this.parent.setChildIndex(this, this.parent.children.length - 1);

        this.bikeSprite.setBikeID(id);
        this.bikeSprite.play();

        this.ui.unlockIcon.visible = !levelUp;
        this.ui.levelUpIcon.visible = levelUp;

        let config = Config.bikeList.find(item => item.id === id);

        this.ui.bikeNameText.text = App.getText(config.name);
        this.ui.bikeDscText.text = App.getText(config.dsc);
        const vLevel = DataMgr.getBikeVelocityLevel(id);
        this.ui.velocityLevelIcon.children[0].texture = resources[Config.levelIconTable[vLevel]].texture;
        const jLevel = DataMgr.getBikeJumpLevel(id);
        this.ui.jumpLevelIcon.children[0].texture = resources[Config.levelIconTable[jLevel]].texture;
        for (let i = 0; i < 3; i++) {
            this.ui[`specialIcon${i}`].visible = i < config.quality;
        }
        const level = DataMgr.get(DataMgr.bikeLevelMap, {})[id];
        this.ui.levelText.text = level + 1;
        [
            "distance",
            "exp",
            "coin",
            "score",
        ].forEach(type => this.setPercentText(type, levelUp, id, level));
    }

    setPercentText(type, levelUp, id, level) {
        let str;
        if (levelUp) {
            str = `${Math.floor(GameUtils.getBikeConfig(`${type}Percent`, id, level - 1,) * 100)}% > ${Math.floor(GameUtils.getBikeConfig(`${type}Percent`, id, level,) * 100)}%`;
        } else {
            str = `${Math.floor(GameUtils.getBikeConfig(`${type}Percent`, id, level,) * 100)}%`;
        }
        this.ui[`${type}PercentText`].text = str;
    }

    onClickReturnButton() {
        this.onClose();
        this.bikeSprite.stop();
        App.hideScene("BikeDetailScene");
    }

    onClose() {
        if (this.closeCallback) {
            this.closeCallback();
        }
    }
}

BikeDetailScene.sceneFilePath = "myLaya/laya/pages/View/BikeDetailScene.scene.json";
BikeDetailScene.resPathList = Utils.values(Config.levelIconTable);
