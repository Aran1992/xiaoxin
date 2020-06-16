import {Graphics} from "../libs/pixi-wrapper";
import EventMgr from "../mgr/EventMgr";
import Config from "../config";
import Scene from "./Scene";
import DataMgr from "../mgr/DataMgr";
import MusicMgr from "../mgr/MusicMgr";
import TWEEN from "@tweenjs/tween.js";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";

export default class GameLevelResultScene extends Scene {
    static onClickRestartButton() {
        App.getScene("LevelGameScene").settle();
        App.hideScene("GameLevelResultScene");
        EventMgr.dispatchEvent("Restart");
    }

    onClickMainButton() {
        App.hideScene("GameLevelResultScene");
        App.getScene("LevelGameScene").pauseGame();
        App.getScene("LevelGameScene").settle();
        App.destroyScene("LevelGameScene");
        App.showScene("MainScene");
        this.onClose();
    }

    onClickAdvertDoubleButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.args.gameScene.doubleReward = true;
                window.TDGA && TDGA.onEvent("广告闯关模式双倍");
                App.showMask(this.onClickMask.bind(this));
                this.playDoubleAnimation(() => this.onClickMask());
            }
        });
    }

    onClickMask() {
        App.hideMask();

        this.animations.forEach(animation => animation.stop());
        this.animations = [];

        for (let i = 0; i < Config.starCount; i++) {
            let star = this.ui[`star${i}`];
            star.visible = i < this.args.gameScene.star;
            this.recoverAnimationObject(star);
        }

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
    }

    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.mainButton, this.onClickMainButton.bind(this));
        this.onClick(this.ui.restartButton, GameLevelResultScene.onClickRestartButton);
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
        for (let i = 0; i < Config.starCount; i++) {
            this.initAnimationObject(this.ui[`star${i}`]);
        }

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

        for (let i = 0; i < Config.starCount; i++) {
            this.ui[`star${i}`].visible = false;
        }

        this.firstGotAllStars = this.args.gameScene.star === Config.starCount
            && DataMgr.getGameLevelStarCount(this.args.gameScene.mapIndex, this.args.gameScene.levelIndex) !== Config.starCount;

        App.getScene("LevelGameScene").stopSounds();
        MusicMgr.pauseBGM();
        MusicMgr.playSound(Config.soundPath.throughFlag);

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

        this.playStarsAnimation(this.args.gameScene.star, () => {
            this.playNumberAnimation(() => {
                this.onClickMask();
            });
        });
    }

    playStarsAnimation(starCount, callback) {
        for (let i = 0; i < Config.starCount; i++) {
            this.ui[`star${i}`].visible = false;
        }
        this.starIndex = 0;
        const loop = () => {
            if (this.starIndex < starCount) {
                const star = this.ui[`star${this.starIndex}`];
                star.visible = true;
                this.playStarAnimation(star, Config.resolveAnimation.starAnimation, () => {
                    this.starIndex++;
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

    onClose() {
        if (this.firstGotAllStars) {
            this.showFirstPrize();
        } else {
            App.getScene("MainScene").onGameEnded();
        }
    }

    showFirstPrize() {
        const reward = Config.gameLevelMode.mapList[this.args.gameScene.mapIndex].rewardList[this.args.gameScene.levelIndex];
        let commonPrizeList = [];
        if (reward.coin) {
            commonPrizeList.push({rewardCoin: reward.coin});
        }
        if (reward.diamond) {
            commonPrizeList.push({rewardDiamond: reward.diamond});
        }
        if (reward.exp) {
            commonPrizeList.push({rewardExp: reward.exp});
        }
        this.showCommonPrize(commonPrizeList, () => {
            this.showBikePrize(reward.bike, () => {
                App.getScene("MainScene").onGameEnded();
            });
        });
    }

    showCommonPrize(prizeList, callback) {
        if (prizeList.length === 0) {
            callback && callback();
        } else {
            App.showScene("PrizeScene", prizeList, callback);
        }
    }

    showBikePrize(bike, callback) {
        if (bike === undefined) {
            callback && callback();
        } else {
            let {levelUp, highestLevel} = DataMgr.plusBike(bike);
            App.showScene("BikeDetailScene", bike, levelUp, highestLevel, callback);
        }
    }
}

GameLevelResultScene.sceneFilePath = "myLaya/laya/pages/View/GameLevelResultScene.scene.json";
