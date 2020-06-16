import Scene from "./Scene";
import Config from "../config";
import List from "../ui/List";
import {Sprite, Texture} from "../libs/pixi-wrapper";
import BikeSprite from "../item/BikeSprite";
import OnlineMgr from "../mgr/OnlineMgr";
import DataMgr from "../mgr/DataMgr";
import EventMgr from "../mgr/EventMgr";

export default class SignScene extends Scene {
    onCreate() {
        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
        this.onClick(this.ui.advertButton, this.onClickAdvertButton.bind(this));

        this.list = new List({
            root: this.ui.list,
            initItemFunc: this.initItem.bind(this),
            updateItemFunc: this.updateItem.bind(this),
            count: Config.signRewardList.length - 1,
            isStatic: true,
        });

        this.initItem7();
    }

    onShow() {
        this.ui.advertButton.visible = OnlineMgr.hasReceivableSignReward();
        this.list.refresh();
        this.updateItem7();
    }

    initItem(item) {
        item.ui.itemIcon = item.ui.itemIcon.addChild(new Sprite());
        item.ui.itemIcon.anchor.set(0.5, 0.5);
        item.ui.bikeSprite = new BikeSprite(item.ui.bikeSpritePanel);
    }

    updateItem(item, index) {
        let reward = Config.signRewardList[index];
        item.ui.title.text = App.getText(`day${index + 1}`);
        item.ui.itemIcon.visible = false;
        item.ui.numberText.visible = false;
        item.ui.bikeSpritePanel.visible = false;
        if (reward.coin) {
            item.ui.itemIcon.visible = true;
            item.ui.itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-coin.png");
            item.ui.numberText.visible = true;
            item.ui.numberText.text = reward.coin;
        } else if (reward.diamond) {
            item.ui.itemIcon.visible = true;
            item.ui.itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-diamond.png");
            item.ui.numberText.visible = true;
            item.ui.numberText.text = reward.diamond;
        } else if (reward.bike) {
            item.ui.bikeSpritePanel.visible = true;
            item.ui.bikeSprite.setBikeID(reward.bike);
            item.ui.bikeSprite.play();
        }
        item.ui.receivedImage.visible = false;
        item.ui.lostImage.visible = false;
        if (OnlineMgr.isSignRewardReceived(index)) {
            item.ui.receivedImage.visible = true;
        } else if (!OnlineMgr.isSignRewardReceivable(index)) {
            item.ui.lostImage.visible = true;
        }
    }

    initItem7() {
        this.ui.bikeSprite = new BikeSprite(this.ui.bikeSpritePanel);
        this.ui.bikeSprite.setBikeID(Config.signRewardList[6].bike);
        this.ui.bikeSprite.play();
        this.ui.coinNumberText.text = Config.signRewardList[6].coin;
        this.ui.diamondNumberText.text = Config.signRewardList[6].diamond;
    }

    updateItem7() {
        this.ui.receivedImage.visible = false;
        this.ui.lostImage.visible = false;
        if (OnlineMgr.isSignRewardReceived(6)) {
            this.ui.receivedImage.visible = true;
        } else if (!OnlineMgr.isSignRewardReceivable(6)) {
            this.ui.lostImage.visible = true;
        }
    }

    onClickReturnButton() {
        App.hideScene("SignScene");
    }

    onClickAdvertButton() {
        let index = DataMgr.get(DataMgr.receivedSignReward, -1) + 1;
        let reward = Config.signRewardList[index];
        if (reward) {
            window.PlatformHelper.showAd(success => {
                if (success) {
                    let list = [];
                    if (reward.coin) {
                        list.push({rewardCoin: reward.coin});
                    }
                    if (reward.diamond) {
                        list.push({rewardDiamond: reward.diamond});
                    }
                    if (reward.bike) {
                        list.push({rewardBike: reward.bike});
                    }
                    App.showScene("PrizeScene", list);
                    DataMgr.set(DataMgr.receivedSignReward, index);
                    if (!OnlineMgr.hasSignReward()) {
                        App.hideScene("SignScene");
                        App.getScene("MainScene").hideSignScene();
                    }
                    this.onShow();
                    window.TDGA && TDGA.onEvent("广告签到", {day: index + 1});
                    EventMgr.dispatchEvent("UpdatePoint");
                }
            });
        } else {
            App.showNotice("已经没有签到奖励可以领取了");
        }
    }
}

SignScene.sceneFilePath = "myLaya/laya/pages/View/SignScene.scene.json";
