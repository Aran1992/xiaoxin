import EventMgr from "../mgr/EventMgr";
import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";
import DataMgr from "../mgr/DataMgr";
import Config from "../config";
import TWEEN from "@tweenjs/tween.js";
import Utils from "../mgr/Utils";

export default class GameLevelRebornScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.advertRebornButton, this.onClickAdvertRebornButton.bind(this));
        this.onClick(this.ui.diamondRebornButton, this.onClickDiamondRebornButton.bind(this));
        this.onClick(this.ui.leaveButton, this.onClickLeaveButton.bind(this));

        this.ui.diamondRebornCostText.text = Config.diamondRebornCost;

        this.typeList = [
            "distance",
            "exp",
            "coin",
        ].map(type => ({
            type: type,
            doubleIcon: this.ui[`${type}DoubleIcon`],
            percentText: this.ui[`${type}PercentText`],
            valueText: this.ui[`${type}ValueText`],
        }));

        this.animations = [];
    }

    onShow(args) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);

        this.args = args;

        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);

        this.typeList.forEach(data => {
            data.valueText.text = 0;
        });

        App.showMask(this.onClickMask.bind(this));

        this.playNumberAnimation(() => this.onClickMask());
    }

    playNumberAnimation(callback) {
        const obj = {percent: 0};
        const animation = new TWEEN.Tween(obj)
            .to({percent: 1}, Config.resolveAnimation.numberAnimation.duration)
            .onUpdate(() => {
                this.typeList.forEach(data => {
                    const originValue = this.args.gameScene[data.type];
                    data.valueText.text = Math.floor(originValue * obj.percent);
                });
            })
            .onComplete(() => {
                Utils.removeItemFromArray(this.animations, animation);
                callback && callback();
            })
            .start(performance.now());
        this.animations.push(animation);
    }

    onClickMask() {
        App.hideMask();

        this.animations.forEach(animation => animation.stop());
        this.animations = [];

        this.typeList.forEach(data => {
            data.valueText.text = Math.floor(this.args.gameScene[data.type]);
        });
    }

    onClickDiamondRebornButton() {
        let diamond = DataMgr.get(DataMgr.diamond, 0);
        if (diamond >= Config.diamondRebornCost) {
            diamond -= Config.diamondRebornCost;
            DataMgr.set(DataMgr.diamond, diamond);
            this.reborn();
        } else {
            App.showNotice(App.getText("DiamondIsNotEnough"));
        }
    }

    onClickAdvertRebornButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.reborn();
                window.TDGA && TDGA.onEvent("广告闯关模式复活");
            }
        });
    }

    onClickLeaveButton() {
        App.hideScene("GameLevelRebornScene");
        App.showScene("GameLevelFailedScene", this.args);
    }

    reborn() {
        this.args.gameScene.rebornTimes++;
        App.hideScene("GameLevelRebornScene");
        EventMgr.dispatchEvent("Reborn");
        window.TDGA && TDGA.onEvent("闯关模式复活");
    }
}

GameLevelRebornScene.sceneFilePath = "myLaya/laya/pages/View/GameLevelRebornScene.scene.json";
