import Scene from "./Scene";
import {Graphics, Sprite, Texture} from "../libs/pixi-wrapper";
import UIHelper from "../ui/UIHelper";
import DataMgr from "../mgr/DataMgr";
import EventMgr from "../mgr/EventMgr";
import BikeSprite from "../item/BikeSprite";

export default class PrizeScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
        this.list = [];
        for (let i = 0; i < 3; i++) {
            let item = UIHelper.uiClone(this.ui.item, undefined, this.ui.list);
            this.ui.list.addChild(item);
            this.list.push(item);
        }
        this.ui.item.visible = false;
        this.list.forEach(item => {
            item.itemIcon = item.ui.itemIcon.addChild(new Sprite());
            item.itemIcon.anchor.set(0.5, 0.5);
            item.numberText = item.ui.numberText;
            item.bikePanel = item.ui.bikePanel;
            item.bikeSprite = new BikeSprite(item.bikePanel);
            this.onClick(item, () => this.onClickItem(item), true);
        });
    }

    onShow(rewards, closeCallback) {
        this.closeCallback = closeCallback;

        this.parent.setChildIndex(this, this.parent.children.length - 1);

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
            if (reward.rewardCoin) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-coin.png");
                numberText.text = reward.rewardCoin;
                item.info = {coin: 1};
            } else if (reward.rewardDiamond) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-diamond.png");
                numberText.text = reward.rewardDiamond;
                item.info = {diamond: 1};
            } else if (reward.rewardExp) {
                itemIcon.visible = true;
                numberText.visible = true;
                itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-exp.png");
                numberText.text = reward.rewardExp;
                item.info = {exp: 1};
            } else if (reward.rewardBike) {
                item.bikePanel.visible = true;
                item.bikeSprite.setBikeID(reward.rewardBike);
                item.bikeSprite.play();
                item.info = {bike: reward.rewardBike};
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
    }

    onClickReturnButton() {
        this.onClose();
        App.hideScene("PrizeScene");
    }

    onClose() {
        if (this.closeCallback) {
            this.closeCallback();
        }
    }

    onClickItem(item) {
        App.showScene("InfoScene", item.info);
    }
}

PrizeScene.sceneFilePath = "myLaya/laya/pages/View/PrizeScene.scene.json";
