import Config from "../config";
import Scene from "./Scene";
import Utils from "../mgr/Utils";
import DataMgr from "../mgr/DataMgr";
import BikeSprite from "../item/BikeSprite";
import MusicMgr from "../mgr/MusicMgr";
import EventMgr from "../mgr/EventMgr";

export default class DrawScene extends Scene {
    onCreate() {
        EventMgr.registerEvent("RefreshRankData", this.onRefreshRankData.bind(this));
        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
        this.onClick(this.ui.bikeButton, this.onClickBikeButton.bind(this));
        this.onClick(this.ui.drawButton, this.onClickDrawButton.bind(this));
        this.onClick(this.ui.advertButton, this.onClickAdvertButton.bind(this));
        this.onTick();
        this.timer = setInterval(this.onTick.bind(this), 1000);
        this.ui.costDiamondText.text = Config.diamondDrawCost;
    }

    onShow() {
        this.onTick();
        this.ui.distanceText.text = `${Math.floor(DataMgr.get(DataMgr.rankDistance, 0))}m`;
        this.ui.totalScoreText.text = DataMgr.get(DataMgr.rankTotalScore, 0);
        this.onRefreshRankData();
    }

    onHide() {
        if (this.drawSound) {
            MusicMgr.stopLoopSound(this.drawSound);
            this.drawSound = undefined;
        }
    }

    onRefreshRankData() {
        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);
        this.ui.coinText.text = DataMgr.get(DataMgr.coin, 0);
    }

    onClickReturnButton() {
        App.hideScene("DrawScene");
        App.showScene("MainScene");
    }

    onClickBikeButton() {
        App.hideScene("DrawScene");
        App.showScene("BikeScene");
    }

    onClickDrawButton() {
        if (this.ui.costDiamondPanel.visible) {
            let diamond = DataMgr.get(DataMgr.diamond, 0);
            if (diamond >= Config.diamondDrawCost) {
                this.draw();
            } else {
                App.showNotice(App.getText("DiamondIsNotEnough"));
            }
        } else {
            this.draw();
        }
    }

    onClickAdvertButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.draw();
                window.TDGA && TDGA.onEvent("广告扭蛋");
            }
        });
    }

    onTick() {
        this.ui.drawButton.visible = false;
        this.ui.advertButton.visible = false;
        this.ui.costDiamondPanel.visible = false;
        let cur = new Date();
        let freeTime = DataMgr.get(DataMgr.nextFreeDrawTime);
        if (cur >= freeTime) {
            this.ui.drawTimeText.text = App.getText("Free");
            this.ui.costDiamondPanel.visible = false;
            this.ui.drawButton.visible = true;
        } else if (DataMgr.get(DataMgr.drawAdvertTimes, 0) < Config.advertDrawBikeTime) {
            this.ui.advertButton.visible = true;
            this.ui.drawTimeText.text = Utils.getCDTimeString(freeTime - cur);
        } else {
            this.ui.drawTimeText.text = Utils.getCDTimeString(freeTime - cur);
            this.ui.drawButton.visible = true;
            this.ui.costDiamondPanel.visible = true;
        }
    }

    draw() {
        window.TDGA && TDGA.onEvent("扭蛋");
        this.playDrawAnimation1();
    }

    playDrawAnimation1() {
        this.drawAnimation = this.playAnimation("special_draw", this.onAnimation1Ended.bind(this), {onClickMask: this.onClickMask.bind(this)});
    }

    onAnimation1Ended() {
        this.playDrawAnimation2();
        this.openPrizeScene();
    }

    openPrizeScene() {
        if (this.ui.costDiamondPanel.visible) {
            let diamond = DataMgr.get(DataMgr.diamond, 0);
            diamond -= Config.diamondDrawCost;
            DataMgr.set(DataMgr.diamond, diamond);
            this.ui.diamondText.text = diamond;
        } else if (this.ui.advertButton.visible === true) {
            DataMgr.set(DataMgr.drawAdvertTimes, DataMgr.get(DataMgr.drawAdvertTimes, 0) + 1);
        } else {
            let nextTime = (new Date()).getTime() + Config.freeDrawInterval * 1000;
            DataMgr.set(DataMgr.nextFreeDrawTime, nextTime);
            EventMgr.dispatchEvent("UpdatePoint");
        }
        let index = Utils.randomWithWeight(Config.drawWeightList.map(item => item.weight));
        let reward = DataMgr.hasDrawed() ? Config.drawWeightList[index] : {type: "bike", id: Config.firstDrawBikeID};
        switch (reward.type) {
            case "bike": {
                const id = reward.id;
                let {levelUp, highestLevel} = DataMgr.plusBike(id);
                App.showScene("BikeDetailScene", id, levelUp, highestLevel);
                break;
            }
            case "coin": {
                App.showScene("PrizeScene", [{rewardCoin: reward.number}]);
                break;
            }
            case "diamond": {
                App.showScene("PrizeScene", [{rewardDiamond: reward.number}]);
                break;
            }
        }
        DataMgr.markDrawed();
        this.onTick();
    }

    playDrawAnimation2() {
        this.drawAnimation = this.playAnimation("recover_special_draw");
    }

    onClickMask() {
        App.hideMask();
        this.drawAnimation.stop();
        this.recoverDrawAnimation();
        this.openPrizeScene();
    }

    recoverDrawAnimation() {
        this.playAnimation("recover_special_draw");
    }
}

DrawScene.sceneFilePath = "myLaya/laya/pages/View/DrawScene.scene.json";
DrawScene.resPathList = BikeSprite.resPathList.concat(Utils.values(Config.drawScene.res));
