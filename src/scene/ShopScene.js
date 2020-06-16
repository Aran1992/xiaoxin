import List from "../ui/List";
import Scene from "./Scene";
import {resources, Texture} from "../libs/pixi-wrapper";
import Config from "../config";
import DataMgr from "../mgr/DataMgr";
import Radio from "../ui/Radio";
import Utils from "../mgr/Utils";
import OnlineMgr from "../mgr/OnlineMgr";
import EventMgr from "../mgr/EventMgr";
import GameUtils from "../mgr/GameUtils";

export default class ShopScene extends Scene {
    onCreate() {
        this.onClick(this.ui.returnButton, this.onClickReturnButton.bind(this));
        this.selectedMapID = DataMgr.get(DataMgr.selectedEndlessScene, 0);
        this.panelList = [
            {
                panel: this.ui.diamondPanel,
                init: this.initDiamondPanel.bind(this),
                show: this.showDiamondPanel.bind(this),
            },
            {
                panel: this.ui.goldPanel,
                init: this.initGoldPanel.bind(this),
                show: this.showGoldPanel.bind(this),
            },
        ];
        this.panelList.forEach(panelMgr => panelMgr.panel.visible = false);
        this.infoList = [1, 2];
        this.radio = new Radio({
            root: this.ui.tab,
            initItemFunc: this.initRadioButton.bind(this),
            clickButtonFunc: this.onClickRadio.bind(this),
            infoList: this.infoList,
            buttonDistance: 208
        });
        EventMgr.registerEvent("RefreshRankData", this.onRefreshRankData.bind(this));
        EventMgr.registerEvent("UpdatePoint", this.updatePoint.bind(this));
    }

    onShow(tab) {
        this.updatePoint();
        this.onRefreshRankData();
        this.onClickRadio(this.radio.selectedIndex);
        if (tab && this.infoList.indexOf(tab) !== -1) {
            this.radio.select(this.infoList.indexOf(tab));
        }
    }

    onClickReturnButton() {
        App.hideScene("ShopScene");
        App.showScene("MainScene");
    }

    initRadioButton(button, info) {
        for (let i = 1; i <= 2; i++) {
            button.ui[`tab${i}Image`].visible = i === info;
        }
    }

    onClickRadio(selectedIndex, lastIndex) {
        if (lastIndex !== undefined) {
            this.panelList[lastIndex].panel.visible = false;
        }
        let panelMgr = this.panelList[selectedIndex];
        panelMgr.panel.visible = true;
        if (!panelMgr.hasInit) {
            panelMgr.init();
            panelMgr.hasInit = true;
        }
        panelMgr.show();
    }

    initGoldPanel() {
        this.goldList = new List({
            root: this.ui.goldList,
            initItemFunc: this.initGoldItem.bind(this),
            updateItemFunc: this.updateGoldItem.bind(this),
            count: Config.rewardGoldList.length,
        });
    }

    initGoldItem(item) {
        this.onClick(item.ui.advertButton, this.onClickCoinAdvertButton.bind(this));
    }

    updateGoldItem(item, index) {
        clearInterval(item.timer);
        item.ui.itemIcon.children[0].texture = Texture.from(`myLaya/laya/assets/images/money-icon/MainMenuItemCourseNum0${index + 1}.png`);
        item.ui.onlineText.visible = false;
        item.ui.buyText.visible = false;
        item.ui.advertButton.visible = false;
        item.ui.advertButton.index = index;
        item.ui.advertButton.rewardCoin = Config.rewardGoldList[index].rewardCoin;
        item.ui.dsc.text = `${App.getText("Coin")} ${Config.rewardGoldList[index].rewardCoin}`;
        let countdown = (Config.rewardGoldList[index].onlineMinutes * 60 - OnlineMgr.getOnlineTime()) * 1000;
        if (DataMgr.get(DataMgr.receivedCoinList, []).indexOf(index) !== -1) {
            item.ui.buyText.visible = true;
        } else if (countdown <= 0) {
            item.ui.advertButton.visible = true;
        } else {
            item.ui.onlineText.visible = true;
            item.ui.onlineText.text = App.getText("OnlineSay", {time: Utils.getCDTimeStringWithoutHour(countdown)});
            item.timer = setInterval(() => {
                let countdown = (Config.rewardGoldList[index].onlineMinutes * 60 - OnlineMgr.getOnlineTime()) * 1000;
                item.ui.onlineText.text = App.getText("OnlineSay", {time: Utils.getCDTimeStringWithoutHour(countdown)});
                if (countdown <= 0) {
                    item.ui.onlineText.visible = false;
                    item.ui.advertButton.visible = true;
                    clearInterval(item.timer);
                }
            }, 1000);
        }
    }

    showGoldPanel() {
        this.goldList.refresh();
    }

    onClickCoinAdvertButton(button) {
        window.PlatformHelper.showAd(success => {
            if (success) {
                App.showScene("PrizeScene", [{rewardCoin: button.rewardCoin}]);
                let list = DataMgr.get(DataMgr.receivedCoinList, []);
                list.push(button.index);
                DataMgr.set(DataMgr.receivedCoinList, list);
                this.goldList.refresh();
                window.TDGA && TDGA.onEvent("广告金币");
                EventMgr.dispatchEvent("UpdatePoint");
            }
        });
    }

    initDiamondPanel() {
        this.diamondList = new List({
            root: this.ui.diamondList,
            initItemFunc: this.initDiamondItem.bind(this),
            updateItemFunc: this.updateDiamondItem.bind(this),
            count: Config.rewardDiamondList.length,
        });
    }

    initDiamondItem(item) {
        this.onClick(item.ui.advertButton, this.onClickDiamondAdvertButton.bind(this));
    }

    updateDiamondItem(item, index) {
        clearInterval(item.timer);
        item.ui.itemIcon.children[0].texture = Texture.from(`myLaya/laya/assets/images/money-icon/MainMenuItemCourseNum0${index + 1}.png`);
        item.ui.onlineText.visible = false;
        item.ui.buyText.visible = false;
        item.ui.advertButton.visible = false;
        item.ui.advertButton.index = index;
        item.ui.advertButton.rewardDiamond = Config.rewardDiamondList[index].rewardDiamond;
        item.ui.dsc.text = `${App.getText("Diamond")} ${Config.rewardDiamondList[index].rewardDiamond}`;
        let countdown = (Config.rewardDiamondList[index].onlineMinutes * 60 - OnlineMgr.getOnlineTime()) * 1000;
        if (DataMgr.get(DataMgr.receivedDiamondList, []).indexOf(index) !== -1) {
            item.ui.buyText.visible = true;
        } else if (countdown <= 0) {
            item.ui.advertButton.visible = true;
        } else {
            item.ui.onlineText.visible = true;
            item.ui.onlineText.text = App.getText("OnlineSay", {time: Utils.getCDTimeStringWithoutHour(countdown)});
            item.timer = setInterval(() => {
                let countdown = (Config.rewardGoldList[index].onlineMinutes * 60 - OnlineMgr.getOnlineTime()) * 1000;
                item.ui.onlineText.text = App.getText("OnlineSay", {time: Utils.getCDTimeStringWithoutHour(countdown)});
                if (countdown <= 0) {
                    item.ui.onlineText.visible = false;
                    item.ui.advertButton.visible = true;
                    clearInterval(item.timer);
                }
            }, 1000);
        }
    }

    showDiamondPanel() {
        this.diamondList.refresh();
    }

    onClickDiamondAdvertButton(button) {
        window.PlatformHelper.showAd(success => {
            if (success) {
                App.showScene("PrizeScene", [{rewardDiamond: button.rewardDiamond}]);
                let list = DataMgr.get(DataMgr.receivedDiamondList, []);
                list.push(button.index);
                DataMgr.set(DataMgr.receivedDiamondList, list);
                this.diamondList.refresh();
                window.TDGA && TDGA.onEvent("广告钻石");
                EventMgr.dispatchEvent("UpdatePoint");
            }
        });
    }

    initMapPanel() {
        this.mapList = new List({
            root: this.ui.mapList,
            initItemFunc: this.initMapItem.bind(this),
            updateItemFunc: this.updateMapItem.bind(this),
            count: Config.endlessMode.sceneList.length,
        });
    }

    showMapPanel() {
        this.mapList.refresh();
    }

    initMapItem(item) {
        this.onClick(item, this.onClickMapItem.bind(this), true);
        item.root = item.children[0];
        item.backgroundImage = item.root.children[1].children[0];
        item.commonImage = item.root.children[2];
        item.unlockButton = item.root.children[3];
        this.onClick(item.unlockButton, this.onClickUnlockButton.bind(this));
        item.unlockCostText = item.unlockButton.children[2];
        item.selectedImage = item.root.children[4];
        item.lockedImage = item.root.children[5];
        item.unlockCondition = item.root.children[6];
        item.unlockConditionText = item.unlockCondition.children[0];
        item.mapDescription = item.root.children[7];
        item.mapDescriptionText = item.mapDescription.children[0];
    }

    updateMapItem(item, index) {
        let config = Config.endlessMode.sceneList[index];
        let path = config.texture.shopCover;
        item.backgroundImage.texture = resources[path].texture;
        item.mapDescriptionText.text = config.name ? App.getText(config.name) : (App.getText("Map") + config.id);
        let locked = DataMgr.isEndlessSceneLocked(config.id);
        GameUtils.greySprite(item.backgroundImage, locked);
        if (locked) {
            item.commonImage.visible = false;
            item.selectedImage.visible = false;
            item.lockedImage.visible = true;
            item.unlockButton.visible = true;
            item.unlockCostText.text = config.unlockCostDiamond;
            item.unlockCondition.visible = true;
            item.unlockConditionText.text = App.getText("TotalDistanceReach", {distance: config.unlockDistance});
            item.interactive = false;
            item.unlockButton.id = config.id;
        } else {
            item.commonImage.visible = config.id !== this.selectedMapID;
            item.selectedImage.visible = config.id === this.selectedMapID;
            item.lockedImage.visible = false;
            item.unlockButton.visible = false;
            item.unlockCondition.visible = false;
            item.interactive = true;
            item.id = config.id;
        }
    }

    onClickMapItem(item) {
        this.selectedMapID = item.id;
        DataMgr.set(DataMgr.selectedEndlessScene, this.selectedMapID);
        this.mapList.refresh();
    }

    onClickUnlockButton(button) {
        let config = Config.endlessMode.sceneList.find(item => item.id === button.id);
        let diamond = DataMgr.get(DataMgr.diamond, 0);
        if (diamond >= config.unlockCostDiamond) {
            diamond -= config.unlockCostDiamond;
            DataMgr.set(DataMgr.diamond, diamond);
            this.ui.diamondText.text = diamond;
            let list = DataMgr.get(DataMgr.unlockEndlessSceneIDList, []);
            list.push(config.id);
            DataMgr.set(DataMgr.unlockEndlessSceneIDList, list);
            this.mapList.refresh();
            config.unlockInfo && App.showScene("NewContentScene", config.unlockInfo);
        } else {
            App.showNotice(App.getText("DiamondIsNotEnough"));
        }
    }

    onRefreshRankData() {
        this.ui.distanceText.text = `${Math.floor(DataMgr.get(DataMgr.rankDistance, 0))}m`;
        this.ui.totalScoreText.text = DataMgr.get(DataMgr.rankTotalScore, 0);
        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);
        this.ui.coinText.text = DataMgr.get(DataMgr.coin, 0);
    }

    updatePoint() {
        this.radio.buttonList.forEach((button, index) => {
            let visible;
            if (index === 1) {
                visible = DataMgr.hasShopReceivableCoin();
            } else {
                visible = DataMgr.hasShopReceivableDiamond();
            }
            GameUtils.showRedPoint(button, visible);
        });
    }
}

ShopScene.sceneFilePath = "myLaya/laya/pages/View/ShopScene.scene.json";
ShopScene.resPathList = Config.endlessMode.sceneList.map(scene => scene.texture.shopCover)
    .concat(Config.moneyList.map(item => item.imagePath))
    .concat(Config.presentList.map(item => item.imagePath));
