import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";
import DataMgr from "../mgr/DataMgr";
import Config from "../config";
import GameUtils from "../mgr/GameUtils";
import TWEEN from "@tweenjs/tween.js";
import Utils from "../mgr/Utils";

export default class GameOverScene extends Scene {
    static onClickMainButton() {
        App.getScene("EndlessGameScene").settle();
        App.hideScene("GameOverScene");
        App.destroyScene("EndlessGameScene");
        App.showScene("MainScene");
        App.getScene("MainScene").onGameEnded();
    }

    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.mainButton, GameOverScene.onClickMainButton);
        this.onClick(this.ui.advertDoubleButton, this.onClickAdvertDoubleButton.bind(this));

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

        this.typeList.forEach(data => this.initAnimationObject(data.doubleIcon));
        this.initAnimationObject(this.ui.hasDoubleRewardText);
        this.initAnimationObject(this.ui.newRecordIcon);

        this.animations = [];
    }

    initAnimationObject(obj) {
        obj = obj.children[0];
        obj.originScale = obj.scale.x;
        obj.anchor.set(0.5, 0.5);
        obj.position.set(obj.x + obj.width / 2, obj.y + obj.height / 2);
    }

    recoverAnimationObject(obj) {
        obj = obj.children[0];
        obj.alpha = 1;
        obj.scale.set(obj.originScale, obj.originScale);
    }

    onShow(args) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);

        this.args = args;

        this.distanceRecord = DataMgr.get(DataMgr.distanceRecord, 0);
        this.ui.distanceRecordText.text = this.distanceRecord;

        this.typeList.forEach(data => {
            data.doubleIcon.visible = false;
            const percent = GameUtils.getBikeConfig(`${data.type}Percent`);
            if (percent > 1) {
                data.percentText.visible = true;
                data.percentText.text = `+${Math.floor(percent * 100)}%`;
            } else {
                data.percentText.visible = false;
            }
            data.valueText.text = 0;
        });

        this.ui.advertDoubleButton.visible = true;
        this.ui.hasDoubleRewardText.visible = false;

        this.ui.newRecordIcon.visible = false;

        App.showMask(this.onClickMask.bind(this));

        this.playNumberAnimation(() => this.onResolveAnimationEnded());
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

    playDoubleAnimation(callback) {
        this.ui.advertDoubleButton.visible = false;
        this.typeList.forEach(data => data.doubleIcon.visible = false);
        let index = 0;
        const loop = () => {
            if (index < this.typeList.length) {
                const icon = this.typeList[index].doubleIcon;
                icon.visible = true;
                this.playStarAnimation(icon, Config.resolveAnimation.doubleIconAnimation, () => {
                    this.playAdvertNumberAnimation(index, () => {
                        index++;
                        loop();
                    });
                });
            } else if (index === this.typeList.length) {
                this.ui.hasDoubleRewardText.visible = true;
                this.playStarAnimation(this.ui.hasDoubleRewardText, Config.resolveAnimation.getIconAnimation, () => {
                    index++;
                    loop();
                });
            } else {
                callback && callback();
            }
        };
        loop();
    }

    playStarAnimation(target, animationConfig, callback) {
        target = target.children[0];
        const os = target.originScale;
        const s = os * animationConfig.startScale;
        const a = animationConfig.startAlpha;
        target.scale.set(s, s);
        target.alpha = a;
        const obj = {scale: s, alpha: a};
        const animation = new TWEEN.Tween(obj)
            .to({scale: os, alpha: 1}, animationConfig.duration)
            .easing(TWEEN.Easing.Bounce.Out)
            .onUpdate(() => {
                target.scale.set(obj.scale, obj.scale);
                target.alpha = obj.alpha;
            })
            .onComplete(() => {
                Utils.removeItemFromArray(this.animations, animation);
                callback && callback();
            })
            .start(performance.now());
        this.animations.push(animation);
    }

    playAdvertNumberAnimation(index, callback) {
        const obj = {percent: 1};
        const animation = new TWEEN.Tween(obj)
            .to({percent: 2}, Config.resolveAnimation.numberAnimation.duration)
            .onUpdate(() => {
                const data = this.typeList[index];
                const originValue = this.args.gameScene[data.type];
                const typePercent = GameUtils.getBikeConfig(`${data.type}Percent`);
                data.valueText.text = Math.floor(originValue * typePercent * obj.percent);
            })
            .onComplete(() => {
                Utils.removeItemFromArray(this.animations, animation);
                callback && callback();
            })
            .start(performance.now());
        this.animations.push(animation);
    }

    onClickAdvertDoubleButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.args.gameScene.doubleReward = true;
                window.TDGA && TDGA.onEvent("广告无尽模式双倍");
                App.showMask(this.onClickMask.bind(this));
                this.playDoubleAnimation(() => this.onResolveAnimationEnded());
            }
        });
    }

    onResolveAnimationEnded() {
        if (this.getDistance() > this.distanceRecord && !this.ui.newRecordIcon.visible) {
            this.ui.newRecordIcon.visible = true;
            this.playStarAnimation(this.ui.newRecordIcon, Config.resolveAnimation.newRecordAnimation, () => {
                this.onClickMask();
            });
        } else {
            this.onClickMask();
        }
    }

    onClickMask() {
        App.hideMask();

        this.animations.forEach(animation => animation.stop());
        this.animations = [];

        this.typeList.forEach(data => {
            const originValue = this.args.gameScene[data.type];
            const typePercent = GameUtils.getBikeConfig(`${data.type}Percent`);
            let value = Math.floor(originValue * typePercent);
            if (this.args.gameScene.doubleReward) {
                value *= 2;
            }
            data.valueText.text = value;
            data.doubleIcon.visible = this.args.gameScene.doubleReward;
            this.recoverAnimationObject(data.doubleIcon);
        });

        if (this.args.gameScene.doubleReward) {
            this.ui.advertDoubleButton.visible = false;
            this.ui.hasDoubleRewardText.visible = true;
        } else {
            this.ui.advertDoubleButton.visible = true;
            this.ui.hasDoubleRewardText.visible = false;
        }
        this.recoverAnimationObject(this.ui.hasDoubleRewardText);

        const value = this.getDistance();
        if (value > this.distanceRecord) {
            this.ui.newRecordIcon.visible = true;
            DataMgr.set(DataMgr.distanceRecord, value);
        }
        this.recoverAnimationObject(this.ui.newRecordIcon);
    }

    getDistance() {
        const originValue = this.args.gameScene.distance;
        const typePercent = GameUtils.getBikeConfig("distancePercent");
        let value = Math.floor(originValue * typePercent);
        if (this.args.gameScene.doubleReward) {
            value *= 2;
        }
        return value;
    }
}

GameOverScene.sceneFilePath = "myLaya/laya/pages/View/GameOverScene.scene.json";
