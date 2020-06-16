import Scene from "./Scene";
import List from "../ui/List";
import Config from "../config";
import MusicMgr from "../mgr/MusicMgr";
import {Graphics} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import TWEEN from "@tweenjs/tween.js";
import Utils from "../mgr/Utils";

export default class GameResultScene extends Scene {
    static onClickMainButton() {
        App.hideScene("GameResultScene");
        App.getScene("MapGameScene").pauseGame();
        App.getScene("MapGameScene").settle();
        App.destroyScene("MapGameScene");
        App.showScene("MainScene");
        App.getScene("MainScene").onGameEnded();
    }

    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.mainButton, GameResultScene.onClickMainButton);
        this.onClick(this.ui.advertDoubleButton, this.onClickAdvertDoubleButton.bind(this));

        this.typeList = [
            "score",
            "distance",
        ].map(type => ({
            type: type,
            doubleIcon: this.ui[`${type}DoubleIcon`],
            percentText: this.ui[`${type}PercentText`],
            valueText: this.ui[`${type}ValueText`],
        }));

        this.typeList.forEach(data => this.initAnimationObject(data.doubleIcon));
        this.initAnimationObject(this.ui.hasDoubleRewardText);

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

        MusicMgr.pauseBGM();
        MusicMgr.playSound(Config.soundPath.throughFlag);

        this.args = args;

        App.getScene("MapGameScene").stopSounds();

        if (this.rankList === undefined) {
            this.rankList = new List({
                root: this.ui.rankList,
                updateItemFunc: this.updateRankItem.bind(this),
                count: Config.enemy.count + 1,
                isStatic: true,
            });
        } else {
            this.rankList.refresh();
        }

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
                    const originValue = data.type === "score" ? Config.rankScore[this.args.rank] : this.args.gameScene[data.type];
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

    updateRankItem(item, index) {
        for (let i = 0; i < Config.enemy.count + 1; i++) {
            const bg = item.ui[`bg${i}`];
            bg.visible = index === i;
        }
        item.ui.nameText.text = this.args.playerNameList[index];
        item.ui.scoreText.text = Config.rankScore[index] || 0;
    }

    onClickAdvertDoubleButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.args.gameScene.doubleReward = true;
                window.TDGA && TDGA.onEvent("广告竞技模式双倍");
                App.showMask(this.onClickMask.bind(this));
                this.playDoubleAnimation(() => this.onClickMask());
            }
        });
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
                const originValue = data.type === "score" ? Config.rankScore[this.args.rank] : this.args.gameScene[data.type];
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

    onClickMask() {
        App.hideMask();

        this.animations.forEach(animation => animation.stop());
        this.animations = [];

        this.typeList.forEach(data => {
            const originValue = data.type === "score" ? Config.rankScore[this.args.rank] : this.args.gameScene[data.type];
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
    }

}

GameResultScene.sceneFilePath = "myLaya/laya/pages/View/GameResultScene.scene.json";
