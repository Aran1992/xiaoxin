import Scene from "./Scene";
import {Graphics, Sprite, Texture} from "../libs/pixi-wrapper";
import UIHelper from "../ui/UIHelper";
import BikeSprite from "../item/BikeSprite";
import DataMgr from "../mgr/DataMgr";
import EventMgr from "../mgr/EventMgr";
import Config from "../config";

export default class LevelUpScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));

        this.list = [];
        this.list.push(this.ui.item);
        for (let i = 0; i < 2; i++) {
            let item = UIHelper.clone(this.ui.item);
            this.ui.list.addChild(item);
            this.list.push(item);
        }
        this.list.forEach(item => {
            item.itemIcon = item.children[0].children[1].children[1].addChild(new Sprite());
            item.itemIcon.anchor.set(0.5, 0.5);
            item.numberText = item.children[0].children[1].children[2];
            item.bikePanel = item.children[0].children[1].children[3];
            item.bikeSprite = new BikeSprite(item.bikePanel);
        });
    }

    onShow(newLevel, closeCallback) {
        this.closeCallback = closeCallback;

        this.parent.setChildIndex(this, this.parent.children.length - 1);

        const reward = Config.levelUpReward[newLevel - 2];
        let rewards = [];
        if (reward.coin) {
            rewards.push({rewardCoin: reward.coin});
        }
        if (reward.diamond) {
            rewards.push({rewardDiamond: reward.diamond});
        }
        if (reward.exp) {
            rewards.push({rewardExp: reward.exp});
        }

        const bulletTimeMaxValueDiff = Config.bulletTime.maxValue[newLevel - 1] - Config.bulletTime.maxValue[newLevel - 2];
        if (bulletTimeMaxValueDiff > 0) {
            rewards.push({rewardBulletTimeMaxValue: bulletTimeMaxValueDiff});
        }

        rewards.forEach(reward => {
            if (reward.rewardCoin) {
                DataMgr.add(DataMgr.coin, reward.rewardCoin);
            } else if (reward.rewardDiamond) {
                DataMgr.add(DataMgr.diamond, reward.rewardDiamond);
            } else if (reward.rewardExp) {
                DataMgr.add(DataMgr.exp, reward.rewardExp);
            } else if (reward.rewardBike) {
                let {levelUp, highestLevel} = DataMgr.plusBike(reward.rewardBike);
                App.showScene("BikeDetailScene", reward.rewardBike, levelUp, highestLevel);
            }
        });

        EventMgr.dispatchEvent("RefreshRankData");

        this.list.forEach(item => {
            item.itemIcon.visible = false;
            item.numberText.visible = false;
            item.bikePanel.visible = false;
            item.visible = false;
        });
        rewards.forEach((reward, i) => {
            let item = this.list[i];
            item.visible = true;
            let itemIcon = item.itemIcon;
            let numberText = item.numberText;
            itemIcon.scale.set(1, 1);
            if (reward.rewardCoin) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-coin.png");
                numberText.text = reward.rewardCoin;
            } else if (reward.rewardDiamond) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-diamond.png");
                numberText.text = reward.rewardDiamond;
            } else if (reward.rewardExp) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-exp.png");
                numberText.text = reward.rewardExp;
            } else if (reward.rewardBulletTimeMaxValue) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/bullet-time-slot.png");
                itemIcon.scale.set(Config.levelUpScene.bulletTimeMaxValueAddIcon.scale, Config.levelUpScene.bulletTimeMaxValueAddIcon.scale,);
                numberText.text = reward.rewardBulletTimeMaxValue;
            } else if (reward.rewardBike) {
                item.bikePanel.visible = true;
                item.bikeSprite.setBikeID(reward.rewardBike);
                item.bikeSprite.play();
            }
        });
        let itemWidth = this.list[0].mywidth;
        switch (rewards.length) {
            case 1: {
                this.list[0].x = this.ui.list.mywidth / 2 - itemWidth / 2;
                break;
            }
            case 2: {
                this.list[0].x = this.ui.list.mywidth / 3 - itemWidth / 2;
                this.list[1].x = this.ui.list.mywidth / 3 * 2 - itemWidth / 2;
                break;
            }
            case 3: {
                this.list.forEach((item, i) => {
                    item.x = itemWidth / 2 + i * itemWidth - itemWidth / 2;
                });
                break;
            }
        }

        this.ui.levelText.text = newLevel;
    }

    onClickReturnButton() {
        App.hideScene("LevelUpScene");
        this.closeCallback && this.closeCallback();
    }
}

LevelUpScene.sceneFilePath = "myLaya/laya/pages/View/LevelUpScene.scene.json";
