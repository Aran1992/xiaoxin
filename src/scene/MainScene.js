import Scene from "./Scene";
import DataMgr from "../mgr/DataMgr";
import Config from "../config";
import {resources, Texture} from "../libs/pixi-wrapper";
import MusicMgr from "../mgr/MusicMgr";
import BikeSprite from "../item/BikeSprite";
import EventMgr from "../mgr/EventMgr";
import Utils from "../mgr/Utils";
import OnlineMgr from "../mgr/OnlineMgr";
import GameUtils from "../mgr/GameUtils";
import LockableButton from "../ui/LockableButton";
import RunOption from "../../run-option";
import Progress from "../ui/Progress";
import UIGuideMgr from "../mgr/UIGuideMgr";

export default class MainScene extends Scene {
    onCreate() {
        this.lockableButtons = [
            "shopButton",
            "homeButton",
            "rankButton",
            "drawButton",
            "signButton",
            "giftButton",
            "mapModeButton",
            "endlessModeButton",
            "bikeButton",
        ];
        this.lockableButtons.forEach(button => new LockableButton({
            button: this.ui[button],
            system: button,
            handler: this[`onClick${Utils.formatName(button)}`].bind(this),
        }));
        this.onClick(this.ui.gamelevelModeButton, this.onClickGamelevelModeButton.bind(this));
        this.onClick(this.ui.systemButton, this.onClickSystemButton.bind(this));
        this.onClick(this.ui.addDiamondButton, this.onClickAddDiamondButton.bind(this));
        this.onClick(this.ui.addCoinButton, this.onClickAddCoinButton.bind(this));
        this.onClick(this.ui.endlessHelpButton, this.onClickEndlessHelpButton.bind(this));
        this.onClick(this.ui.mapHelpButton, this.onClickMapHelpButton.bind(this));
        this.onClick(this.ui.gamelevelHelpButton, this.onClickGamelevelHelpButton.bind(this));
        this.onClick(this.ui.lastLevelButton, this.onClickLastLevelButton.bind(this));
        this.onClick(this.ui.nextLevelButton, this.onClickNextLevelButton.bind(this));
        for (let i = 1; i <= 5; i++) {
            const button = this.ui[`glBtn${i}`];
            button.index = i - 1;
            this.onClick(button, this.onClickGameLevel.bind(this));
        }
        this.selectedLevel = 0;
        this.ui.signButton.visible = OnlineMgr.hasSignReward();
        if (window.PlatformHelper.canLogout) {
            this.onClick(this.ui.userImage, this.onClickUserImage.bind(this));
        }
        EventMgr.registerEvent("RefreshRankData", this.onRefreshRankData.bind(this));
        EventMgr.registerEvent("UnlockSystem", this.onUnlockSystem.bind(this));
        EventMgr.registerEvent("UpdatePoint", this.updatePoint.bind(this));

        this.bikeSprite = new BikeSprite(this.ui.bikeSpritePanel);
        this.bikeSprite.setAnimationSpeed(Config.mainScene.bikeSprite.animationSpeed);

        this.waitShowNotice = [];

        this.gameLevel = 0;

        this.mode = "GameLevel";
        this.refreshMode();

        this.initGift();

        this.expProgress = new Progress(this.ui.expProgress);
    }

    onRefreshRankData() {
        this.ui.distanceText.text = `${Math.floor(DataMgr.get(DataMgr.rankDistance, 0))}m`;
        this.ui.totalScoreText.text = DataMgr.get(DataMgr.rankTotalScore, 0);
        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);
        this.ui.coinText.text = DataMgr.get(DataMgr.coin, 0);
        const {level, curExp, totalExp} = DataMgr.getPlayerLevel();
        this.ui.levelText.text = App.getText("LevelDsc", {level});
        this.expProgress.setMax(totalExp);
        this.expProgress.setValue(curExp);
        this.ui.expRate.text = `${curExp}/${totalExp}`;
        [
            "distance",
            "coin",
            "exp",
            "score",
        ].forEach(type => {
            this.ui[`${type}PercentText`].text = `x${Math.floor(GameUtils.getBikeConfig(`${type}Percent`) * 100)}%`;
        });
        this.ui.bulletMaxValueAddText.text = DataMgr.getBulletTimeMaxValue();
    }

    onShow() {
        this.onRefreshRankData();

        this.refreshMode(true);

        MusicMgr.playBGM(Config.mainBgmPath);

        this.bikeSprite.setBikeID(DataMgr.get(DataMgr.selectedBike, 0));
        this.bikeSprite.setPosition(-this.bikeSprite.getWidth() / 2, 0);
        this.bikeSprite.play();
        this.bikeSprite.setPositionX(0);
        this.onUpdate();

        this.ui.userImage.children[0].texture = Texture.from(DataMgr.get(DataMgr.headurl, Config.defaultEnemyHeadImagePath));
        this.ui.userNameText.text = DataMgr.getPlayerName();

        window.PlatformHelper.closeLogoScene();

        this.refreshLockStatus();
        this.updatePoint();

        if ((RunOption.forceShowBeginnerGuide === 0 && !DataMgr.get(DataMgr.throughGuide, false))
            || RunOption.forceShowBeginnerGuide === 1) {
            App.showScene("GuideGameScene");
        } else {
            if (!DataMgr.hasCompletedFirstGameGuide()) {
                this.showFirstGameGuide();
            }
        }
    }

    onHide() {
        this.bikeSprite.stop();
        cancelAnimationFrame(this.animationFrame);
    }

    onUpdate() {
        let x = this.bikeSprite.getPositionX() + Config.mainScene.bikeSprite.velocityX;
        this.bikeSprite.setPositionX(x);
        if (this.bikeSprite.getLeftBorderX() >= App.sceneWidth) {
            this.bikeSprite.setPositionX(-this.bikeSprite.getWidth() / 2);
        }
        this.animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
    }

    onClickMapModeButton() {
        this.mode = "Map";
        this.refreshMode();
        App.showScene("PreparationScene", this.mode);
    }

    refreshMapMode() {
        let index = DataMgr.get(DataMgr.currentMapScene);
        let path = Config.mapList[index].texture.mainCover;
        this.ui.sceneImage.children[0].texture = resources[path].texture;
    }

    onClickEndlessModeButton() {
        this.mode = "Endless";
        this.refreshMode();

        if (DataMgr.get(DataMgr.unlockSystems, []).indexOf("preparationScene") === -1) {
            let func = () => {
                App.hideScene("MainScene");
                App.hideScene("PreparationScene");
                App.showScene("EndlessGameScene", DataMgr.get(DataMgr.selectedEndlessScene, 0));
            };
            if (DataMgr.get(DataMgr.endlessGameTimes, 0) === 0) {
                App.showScene("HelpEndlessScene", func);
            } else {
                func();
            }
        } else {
            App.showScene("PreparationScene", this.mode);
        }
    }

    refreshEndlessMode() {
        let index = DataMgr.get(DataMgr.selectedEndlessScene, 0);
        let path = Config.endlessMode.sceneList[index].texture.mainCover;
        this.ui.sceneImage.children[0].texture = resources[path].texture;
    }

    onClickHomeButton() {
        App.hideScene("MainScene");
        App.showScene("HomeScene", DataMgr.get(DataMgr.homeData), true);
    }

    onClickShopButton() {
        App.hideScene("MainScene");
        App.showScene("ShopScene");
    }

    onClickDrawButton() {
        App.hideScene("MainScene");
        App.showScene("DrawScene");
    }

    onClickBikeButton() {
        App.hideScene("MainScene");
        App.showScene("BikeScene");
    }

    onClickSystemButton() {
        App.hideScene("MainScene");
        App.showScene("SystemScene");
    }

    onClickRankButton() {
        App.hideScene("MainScene");
        App.showScene("RankScene");
    }

    onClickUserImage() {
        App.showTip(App.getText("Do you want log out?"), () => {
            delete localStorage.username;
            delete localStorage.password;
            const url = window.parent.location.href;
            window.parent.location.href = url.replace("autoRegister=1", "");
        });
    }

    initGift() {
        this.updateGiftState();
        setInterval(() => {
            this.updateGiftState();
        }, 1000);
    }

    updateGiftState() {
        let remainTime = OnlineMgr.getGiftRemainTime();
        if (remainTime) {
            this.ui.giftTimeText.visible = true;
            this.ui.giftTimeText.text = Utils.getCDTimeStringWithoutHour(remainTime * 1000);
            GameUtils.showRedPoint(this.ui.giftButton, false);
        } else {
            this.ui.giftTimeText.visible = false;
            GameUtils.showRedPoint(this.ui.giftButton, true && !GameUtils.isSystemLocked("giftButton"));
        }
    }

    onClickGiftButton() {
        if (!OnlineMgr.hasGift()) {
            App.showNotice(App.getText("ThereIsNoGiftToday"));
        } else if (OnlineMgr.getGiftRemainTime() === 0) {
            App.showScene("GiftScene");
        } else {
            App.showNotice(App.getText("领取礼包的时间还没到"));
        }
    }

    onClickSignButton() {
        App.showScene("SignScene");
    }

    hideSignScene() {
        this.ui.signButton.visible = false;
    }

    onClickAddDiamondButton() {
        App.hideScene("MainScene");
        App.showScene("ShopScene", 1);
    }

    onClickAddCoinButton() {
        App.hideScene("MainScene");
        App.showScene("ShopScene", 2);
    }

    onClickEndlessHelpButton() {
        App.showScene("HelpEndlessScene");
    }

    onClickMapHelpButton() {
        App.showScene("HelpMatchScene");
    }

    onClickGamelevelHelpButton() {
        App.showScene("HelpGameLevelScene");
    }

    refreshLockStatus() {
        let unlock = DataMgr.get(DataMgr.unlockSystems, []).indexOf("shopButton") !== -1;
        this.ui.addCoinButton.visible = unlock;
        this.ui.addDiamondButton.visible = unlock;
    }

    onUnlockSystem(lockInfo) {
        this.refreshLockStatus();
        this.waitShowNotice.push(lockInfo);
    }

    showUnlockNotice(unlockSystem) {
        App.showScene("NewContentScene", unlockSystem, () => {
            this.checkWaitShowNotice(unlockSystem);
        });
    }

    checkWaitShowNotice(unlockSystem) {
        if (this.waitShowNotice.length) {
            this.showUnlockNotice(this.waitShowNotice.shift());
        } else {
            this.showNextGameLevel(unlockSystem);
        }
    }

    onClickGamelevelModeButton() {
        this.mode = "GameLevel";
        this.refreshMode();
        App.showScene("GameLevelScene");
    }

    onClickLastLevelButton() {
        this.gameLevel--;
        if (this.gameLevel < 0) {
            this.gameLevel = 0;
        }
        this.refreshMode();
    }

    onClickNextLevelButton() {
        this.gameLevel++;
        const max = Config.gameLevelMode.mapList.length - 1;
        if (this.gameLevel > max) {
            this.gameLevel = max;
        }
        this.refreshMode();
    }

    refreshGameLevelMode(onlyStatus) {
        if (onlyStatus) {
            this.selectedLevel = this.selectedLevel || 0;
        } else {
            this.selectedLevel = 0;
        }
        this.refreshGameLevelSelectedState();
        const glConfig = Config.gameLevelMode.mapList[this.gameLevel];
        this.ui.sceneImage.children[0].texture = resources[glConfig.mainCover].texture;
        const total = DataMgr.getGameLevelStarTotalCount();
        const needed = glConfig.starCountUnlockNeeded;
        const locked = DataMgr.isGameLevelMapLocked(this.gameLevel);
        this.ui.totalStarCount.text = total;
        this.ui.gameLevelMapDsc.text = App.getText(glConfig.dsc);
        this.ui.gameLevelLocked.visible = locked;
        this.ui.glUnlockStarCount.text = needed;
        GameUtils.greySprite(this.ui.sceneImage.children[0], locked);
        this.ui.lastLevelButton.visible = this.gameLevel > 0;
        this.ui.nextLevelButton.visible = this.gameLevel < Config.gameLevelMode.mapList.length - 1;
    }

    refreshGameLevelSelectedState() {
        for (let i = 1; i <= 5; i++) {
            const count = DataMgr.getGameLevelStarCount(this.gameLevel, i - 1);
            const isLocked = DataMgr.isGameLevelLocked(this.gameLevel, i - 1);
            const btn = this.ui[`glBtn${i}`];
            if (isLocked) {
                btn.children[0].texture = Texture.from(Config.imagePath.lockedLevel);
                btn.interactive = false;
            } else if (i - 1 === this.selectedLevel) {
                btn.children[0].texture = Texture.from(Config.imagePath.selectedLevel);
                btn.interactive = true;
            } else {
                btn.children[0].texture = Texture.from(Config.imagePath.enabledLevel);
                btn.interactive = true;
            }
            const nameLabel = GameUtils.findChildByName(btn, "nameLabel");
            nameLabel.text = `${this.gameLevel + 1}-${i}`;
            for (let j = 1; j <= 3; j++) {
                const star = GameUtils.findChildByName(btn, j + "");
                star.visible = count >= j;
            }
        }
    }

    onClickGameLevel(button) {
        this.selectedLevel = button.index;
        this.refreshGameLevelSelectedState();
        App.showScene("PreparationScene", this.mode);
    }

    refreshMode(onlyStatus) {
        this.ui.gameLevelPanel.visible = this.mode === "GameLevel";
        GameUtils.greySprite(this.ui.sceneImage.children[0], false);
        switch (this.mode) {
            case "Map":
                this.refreshMapMode();
                break;
            case "GameLevel":
                this.refreshGameLevelMode(onlyStatus);
                break;
            case "Endless":
                this.refreshEndlessMode();
                break;
        }
    }

    updatePoint() {
        [
            ["signButton", () => OnlineMgr.hasReceivableSignReward()],
            ["shopButton", () => DataMgr.hasShopReceivableCoin() || DataMgr.hasShopReceivableDiamond()],
            ["homeButton", () => DataMgr.hasHomeReceivableItem()],
            ["drawButton", () => DataMgr.isDrawAble()],
            ["bikeButton", () => !GameUtils.isSystemLocked("upgradePanelButton") && DataMgr.hasBikeUpgradable()],
        ].forEach(([name, check]) => GameUtils.showRedPoint(this.ui[name],
            check() && (this.lockableButtons.indexOf(name) === -1 || !GameUtils.isSystemLocked(name))));
    }

    onGameEnded() {
        const newLevel = DataMgr.getPlayerLevel().level;
        if (this.curPlayerLevel < newLevel) {
            this.curPlayerLevel++;
            this.showLevelUp(newLevel);
        } else {
            this.checkWaitShowNotice();
        }
    }

    showLevelUp(newLevel) {
        const reward = Config.levelUpReward[this.curPlayerLevel - 2];
        if (reward) {
            App.showScene("LevelUpScene", this.curPlayerLevel, () => {
                if (reward.bike) {
                    let {levelUp, highestLevel} = DataMgr.plusBike(reward.bike);
                    App.showScene("BikeDetailScene", reward.bike, levelUp, highestLevel, () => {
                        this.onGameEnded(newLevel);
                    });
                } else {
                    this.onGameEnded(newLevel);
                }
            });
        } else {
            this.onGameEnded(newLevel);
        }
    }

    showNextGameLevel(unlockSystem) {
        const scene = App.getScene("GameLevelScene");
        if (scene) {
            if (unlockSystem) {
                for (let key in Config.UIGuide) {
                    if (Config.UIGuide.hasOwnProperty(key)) {
                        const config = Config.UIGuide[key];
                        if (config.startInUnlockSystem === unlockSystem) {
                            new UIGuideMgr(key);
                            break;
                        }
                    }
                }
                scene.show();
            } else {
                scene.onGameEnded(this.gameLevelFirstWin);
            }
        }
    }

    showFirstGameGuide() {
        for (let key in Config.UIGuide) {
            if (Config.UIGuide.hasOwnProperty(key)) {
                const config = Config.UIGuide[key];
                if (config.startInFirstTimeShowMainScene) {
                    new UIGuideMgr(key);
                    break;
                }
            }
        }
    }
}

MainScene.sceneFilePath = "myLaya/laya/pages/View/MainScene.scene.json";
MainScene.resPathList = Config.mapList.map(scene => scene.texture.mainCover)
    .concat(Config.endlessMode.sceneList.map(scene => scene.texture.mainCover))
    .concat(BikeSprite.resPathList)
    .concat([Config.mainBgmPath]);
