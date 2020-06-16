import Scene from "./Scene";
import {Graphics, Sprite, Texture} from "../libs/pixi-wrapper";
import DataMgr from "../mgr/DataMgr";
import Config from "../config";
import BikeSprite from "../item/BikeSprite";
import RunOption from "../../run-option";
import UIHelper from "../ui/UIHelper";

export default class PreparationScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
        for (let i = 1; i <= 3; i++) {
            this.onClick(this.ui[`advertButton${i}`], () => {
                this.onClickAdvertButton(i);
            });
            this.onClick(this.ui[`item${i}`], () => {
                this.onClickItem(i);
            });
        }
        this.onClick(this.ui.startButton, this.onClickStartButton.bind(this));
        this.bikeSprite = new BikeSprite(this.ui.itemIcon3, 0);
        for (let i = 0; i < 2; i++) {
            const item = this.ui[`firstTimeReward${i}`];
            UIHelper.initUIRoot(item);
            item.ui.itemIcon = item.ui.itemIcon.addChild(new Sprite());
            item.ui.itemIcon.anchor.set(0.5, 0.5);
            item.ui.bikeSprite = new BikeSprite(item.ui.bikeSpritePanel);
        }
        this.onClick(this.ui.mapAdButton, this.onClickMapAdButton.bind(this));
    }

    onShow(mode) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);
        this.mode = mode;
        this.ui.endlessModeImage.visible = false;
        this.ui.mapModeImage.visible = false;
        this.ui.gameLevelTitle.visible = false;
        this.ui.coinPanel.visible = false;
        this.ui.firstTimePanel.visible = false;
        this.ui.mapAdButton.visible = false;
        this.ui.startButton.visible = true;
        if (this.mode === "Map") {
            this.ui.mapModeImage.visible = true;
            this.ui.coinPanel.visible = true;
            this.ui.costCoinText.text = DataMgr.getRankModeCostCoin();
            this.rewardType = DataMgr.preparationDataMap;
            const hasAd = DataMgr.get(DataMgr.mapModeWatchedAdTimes, 0) > 0;
            this.ui.mapAdButton.visible = !hasAd;
            this.ui.startButton.visible = hasAd;
        } else if (this.mode === "GameLevel") {
            this.ui.gameLevelTitle.visible = true;
            const gameLevelScene = App.getScene("GameLevelScene");
            this.ui.gameLevelTitle.text = App.getText(Config.gameLevelMode.mapList[gameLevelScene.gameLevel].dsc);
            this.rewardType = DataMgr.preparationDataGameLevel;
            this.updateGameLevelInfo();
        } else if (this.mode === "Endless") {
            this.ui.endlessModeImage.visible = true;
            this.rewardType = DataMgr.preparationDataEndless;
        }
        this.rewards = DataMgr.get(this.rewardType);

        this.ui.itemIcon1.children[0].texture = Texture.from(Config.effect[this.rewards[0].effect].imagePath);
        this.ui.itemIcon2.children[0].texture = Texture.from(Config.effect[this.rewards[1].effect].imagePath);
        this.bikeSprite.setBikeID(this.rewards[2].bike);
        this.bikeSprite.play();
        for (let i = 1; i <= 3; i++) {
            if (this.rewards[i - 1].received) {
                this.ui[`receivedText${i}`].visible = true;
                this.ui[`advertButton${i}`].visible = false;
            } else {
                this.ui[`receivedText${i}`].visible = false;
                this.ui[`advertButton${i}`].visible = true;
            }
        }
    }

    onClickReturnButton() {
        App.hideScene("PreparationScene");
    }

    onClickAdvertButton(index) {
        window.PlatformHelper.showAd(success => {
            if (success) {
                this.rewards[index - 1].received = true;
                DataMgr.set(this.rewardType, this.rewards);
                if (this.mode === "Map") {
                    if (index === 3) {
                        window.TDGA && TDGA.onEvent("广告竞技模式自行车");
                    } else {
                        window.TDGA && TDGA.onEvent("广告竞技模式道具");
                    }
                } else if (this.mode === "Endless") {
                    if (index === 3) {
                        window.TDGA && TDGA.onEvent("广告无尽模式自行车");
                    } else {
                        window.TDGA && TDGA.onEvent("广告无尽模式道具");
                    }
                } else if (this.mode === "GameLevel") {
                    if (index === 3) {
                        window.TDGA && TDGA.onEvent("广告闯关模式自行车");
                    } else {
                        window.TDGA && TDGA.onEvent("广告闯关模式道具");
                    }
                }
                this.onShow(this.mode);
            }
        });
    }

    onClickStartButton() {
        if (this.mode === "Map") {
            let coin = DataMgr.get(DataMgr.coin, 0);
            let costCoin = DataMgr.getRankModeCostCoin();
            if (coin >= costCoin) {
                let func = () => {
                    DataMgr.set(DataMgr.coin, coin - costCoin);
                    DataMgr.set(DataMgr.rankCostLevel, DataMgr.get(DataMgr.rankCostLevel, 0) + 1);
                    App.hideScene("MainScene");
                    App.hideScene("PreparationScene");
                    if (RunOption.fixedMapID === undefined || RunOption.fixedMapID === -1) {
                        App.showScene("MapGameScene", DataMgr.get(DataMgr.currentMapScene));
                    } else {
                        App.showScene("MapGameScene", RunOption.fixedMapID);
                    }
                };
                if (DataMgr.get(DataMgr.mapGameTimes, 0) === 0) {
                    App.showScene("HelpMatchScene", func);
                } else {
                    func();
                }
            } else {
                App.showNotice(App.getText("Gold Coin is not enough!"));
            }
        } else if (this.mode === "Endless") {
            App.hideScene("MainScene");
            App.hideScene("PreparationScene");
            App.showScene("EndlessGameScene", DataMgr.get(DataMgr.selectedEndlessScene, 0));
        } else if (this.mode === "GameLevel") {
            App.hideScene("MainScene");
            App.hideScene("PreparationScene");
            const gameLevelScene = App.getScene("GameLevelScene");
            App.showScene("LevelGameScene", gameLevelScene.gameLevel, gameLevelScene.selectedLevel);
        }
    }

    onClickMapAdButton() {
        window.PlatformHelper.showAd(success => {
            if (success) {
                DataMgr.add(DataMgr.mapModeWatchedAdTimes, 1);
                this.show(this.mode);
            }
        });
    }

    updateGameLevelInfo() {
        const gameLevelScene = App.getScene("GameLevelScene");
        if (DataMgr.getGameLevelStarCount(gameLevelScene.gameLevel, gameLevelScene.selectedLevel) !== Config.starCount) {
            this.ui.firstTimePanel.visible = true;
            const rewardTable = Config.gameLevelMode.mapList[gameLevelScene.gameLevel].rewardList[gameLevelScene.selectedLevel];
            const typeList = ["coin", "diamond", "exp", "bike"];
            let rewardIndex = 0;
            for (let typeIndex = 0; typeIndex < typeList.length; typeIndex++) {
                const type = typeList[typeIndex];
                const reward = rewardTable[type];
                if (reward) {
                    const item = this.ui[`firstTimeReward${rewardIndex}`];
                    if (item) {
                        item.ui.itemIcon.visible = false;
                        item.ui.numberText.visible = false;
                        item.ui.bikeSpritePanel.visible = false;
                        switch (type) {
                            case "coin": {
                                item.ui.itemIcon.visible = true;
                                item.ui.itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-coin.png");
                                item.ui.numberText.visible = true;
                                item.ui.numberText.text = reward;
                                break;
                            }
                            case "diamond": {
                                item.ui.itemIcon.visible = true;
                                item.ui.itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-diamond.png");
                                item.ui.numberText.visible = true;
                                item.ui.numberText.text = reward;
                                break;
                            }
                            case "exp": {
                                item.ui.itemIcon.visible = true;
                                item.ui.itemIcon.texture = Texture.from("myLaya/laya/assets/images/icon-exp.png");
                                item.ui.numberText.visible = true;
                                item.ui.numberText.text = reward;
                                break;
                            }
                            case "bike": {
                                item.ui.bikeSpritePanel.visible = true;
                                item.ui.bikeSprite.setBikeID(reward);
                                item.ui.bikeSprite.play();
                                break;
                            }
                        }
                    }
                    rewardIndex++;
                }
            }
        } else {
            this.ui.firstTimePanel.visible = false;
        }
    }

    onClickItem(i) {
        App.showScene("InfoScene", this.rewards[i - 1]);
    }
}

PreparationScene.sceneFilePath = "myLaya/laya/pages/View/PreparationScene.scene.json";
