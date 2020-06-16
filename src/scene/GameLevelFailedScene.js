import Scene from "./Scene";
import MatchRacetrack from "../ui/MatchRacetrack";
import {Graphics} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import TWEEN from "@tweenjs/tween.js";
import Utils from "../mgr/Utils";

export default class GameLevelFailedScene extends Scene {
    static onClickMainButton() {
        App.hideScene("GameLevelFailedScene");
        App.getScene("LevelGameScene").pauseGame();
        App.getScene("LevelGameScene").settle();
        App.destroyScene("LevelGameScene");
        App.showScene("MainScene");
        App.getScene("MainScene").onGameEnded();
    }

    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.mainButton, GameLevelFailedScene.onClickMainButton);

        this.matchRacetrack = new MatchRacetrack(this.ui.matchRacetrack);

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

        this.matchRacetrack.create(0);
        this.matchRacetrack.update(this.args.playerRate);

        this.typeList.forEach(data => {
            const percent = GameUtils.getBikeConfig(`${data.type}Percent`);
            if (percent > 1) {
                data.percentText.visible = true;
                data.percentText.text = `+${Math.floor(percent * 100)}%`;
            } else {
                data.percentText.visible = false;
            }
            data.valueText.text = 0;
        });

        App.showMask(this.onClickMask.bind(this));

        this.playNumberAnimation(() => {
            this.onClickMask();
        });
    }

    playNumberAnimation(callback) {
        const obj = {percent: 0};
        const animation = new TWEEN.Tween(obj)
            .to({percent: 1}, Config.resolveAnimation.numberAnimation.duration)
            .onUpdate(() => {
                this.typeList.forEach(data => {
                    const originValue = this.args.gameScene[data.type];
                    const typePercent = GameUtils.getBikeConfig(`${data.type}Percent`);
                    data.valueText.text = Math.floor(originValue * typePercent * obj.percent);
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
            const originValue = this.args.gameScene[data.type];
            const typePercent = GameUtils.getBikeConfig(`${data.type}Percent`);
            data.valueText.text = Math.floor(originValue * typePercent);
        });
    }
}

GameLevelFailedScene.sceneFilePath = "myLaya/laya/pages/View/GameLevelFailedScene.scene.json";
