import Scene from "./Scene";
import Config from "../config";
import {resources, Texture} from "../libs/pixi-wrapper";
import DataMgr from "../mgr/DataMgr";
import GameUtils from "../mgr/GameUtils";
import BikeSprite from "../item/BikeSprite";
import TWEEN from "@tweenjs/tween.js";

export default class GameLevelScene extends Scene {
    onCreate() {
        for (let i = 1; i <= 5; i++) {
            const button = this.ui[`glBtn${i}`];
            button.index = i - 1;
            this.onClick(button, this.onClickGameLevel.bind(this));
        }
        this.selectedLevel = 0;
        this.gameLevel = 0;
        this.onClick(this.ui.returnButton, this.onClickReturnButton);
        this.onClick(this.ui.lastLevelButton, this.onClickLastLevelButton.bind(this));
        this.onClick(this.ui.nextLevelButton, this.onClickNextLevelButton.bind(this));
        this.onClick(this.ui.gameLevelLocked, this.onClickGameLevelLocked.bind(this));
        this.bikeSprite = new BikeSprite(this.ui.gameLevelPanel);
        this.bikeSprite.setScale(Config.gameLevelScene.bikeSpriteScale);
    }

    onClickReturnButton() {
        App.hideScene("GameLevelScene");
        App.showScene("MainScene");
    }

    onShow() {
        this.bikeSprite.setBikeID(DataMgr.get(DataMgr.selectedBike, 0));
        this.bikeSprite.play();
        this.refreshGameLevelMode(true);
    }

    onClickLastLevelButton() {
        this.gameLevel--;
        if (this.gameLevel < 0) {
            this.gameLevel = 0;
        }
        this.refreshGameLevelMode();
    }

    onClickNextLevelButton() {
        this.gameLevel++;
        const max = Config.gameLevelMode.mapList.length - 1;
        if (this.gameLevel > max) {
            this.gameLevel = max;
        }
        this.refreshGameLevelMode();
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
        this.bikeSprite.setVisible(!locked);
        this.ui.totalStarCount.text = total;
        this.ui.gameLevelMapDsc.text = App.getText(glConfig.dsc);
        this.ui.gameLevelLocked.visible = locked;
        this.ui.glUnlockStarCount.text = needed;
        GameUtils.greySprite(this.ui.sceneImage.children[0], locked);
        this.ui.lastLevelButton.visible = this.gameLevel > 0;
        this.ui.nextLevelButton.visible = this.gameLevel < Config.gameLevelMode.mapList.length - 1;
        const pos = this.getSelectedLevelBtnPos();
        this.bikeSprite.setPosition(pos.x, pos.y);
    }

    refreshGameLevelSelectedState() {
        for (let i = 1; i <= 5; i++) {
            const count = DataMgr.getGameLevelStarCount(this.gameLevel, i - 1);
            const isLocked = DataMgr.isGameLevelLocked(this.gameLevel, i - 1);
            const btn = this.ui[`glBtn${i}`];
            this.setButtonState(btn, isLocked, i - 1 === this.selectedLevel);
            const nameLabel = GameUtils.findChildByName(btn, "nameLabel");
            nameLabel.text = `${this.gameLevel + 1}-${i}`;
            this.refreshLevelBtnStar(btn, count);
        }
    }

    setButtonState(btn, isLocked, selected) {
        if (isLocked) {
            btn.children[0].texture = Texture.from(Config.imagePath.lockedLevel);
            btn.interactive = false;
        } else if (selected) {
            btn.children[0].texture = Texture.from(Config.imagePath.selectedLevel);
            btn.interactive = true;
        } else {
            btn.children[0].texture = Texture.from(Config.imagePath.enabledLevel);
            btn.interactive = true;
        }
    }

    onClickGameLevel(button) {
        const reverse = this.selectedLevel > button.index;
        this.selectedLevel = button.index;
        this.playMove(reverse, () => {
            this.refreshGameLevelSelectedState();
            App.showScene("PreparationScene", "GameLevel");
        });
    }

    getSelectedLevelBtnPos() {
        const selectedLevelBtn = this.ui[`glBtn${this.selectedLevel + 1}`];
        return {
            x: selectedLevelBtn.x + Config.gameLevelScene.bikeSpriteOffsetX,
            y: selectedLevelBtn.y + Config.gameLevelScene.bikeSpriteOffsetY
        };
    }

    playMove(reverse, callback = () => 0) {
        this.bikeSprite.reverse(reverse);
        const obj = {x: this.bikeSprite.getPositionX(), y: this.bikeSprite.getPositionY()};
        let ended = false;
        App.showMask();
        const tween = new TWEEN.Tween(obj)
            .to(this.getSelectedLevelBtnPos(), 500)
            .onUpdate(() => {
                this.bikeSprite.setPosition(obj.x, obj.y);
            })
            .onComplete(() => {
                App.hideMask();
                ended = true;
                callback();
            })
            .start(performance.now());
        (function frame() {
            requestAnimationFrame((time) => {
                if (!ended) {
                    tween.update(time);
                    frame();
                }
            });
        }());
    }

    onClickGameLevelLocked() {
        if (DataMgr.hasEnoughStarUnlockGameLevelMap(this.gameLevel)) {
            App.showMask();
            // App.showNotice("此时播放一个解锁地图的动画");
            setTimeout(() => {
                DataMgr.unlockGameLevelMap(this.gameLevel);
                App.hideMask();
                this.refreshGameLevelMode();
            }, 100);
        } else {
            App.showNotice("没有足够的星星解锁该地图");
        }
    }

    onGameEnded(firstWin) {
        if (firstWin) {
            if (DataMgr.isLatestLevelInMap(this.gameLevel, this.selectedLevel)) {
                if (!DataMgr.isLatestMap(this.gameLevel)) {
                    this.play2nextMap();
                }
            } else {
                this.play2nextLevel();
            }
        } else {
            this.refreshGameLevelMode();
        }
    }

    play2nextLevel() {
        App.showMask();
        // App.showNotice("此时播放一个解锁关卡的动画");
        setTimeout(() => {
            App.hideMask();
            this.onClickGameLevel({index: this.selectedLevel + 1});
        }, 100);
    }

    play2nextMap() {
        App.showMask();
        this.onClickNextLevelButton();
        setTimeout(() => {
            App.hideMask();
            this.onClickGameLevelLocked();
        }, 500);
    }

    refreshLevelBtnStar(btn, count) {
        for (let j = 1; j <= 3; j++) {
            const star = GameUtils.findChildByName(btn, j + "");
            star.visible = count >= j;
        }
    }
}

GameLevelScene.sceneFilePath = "myLaya/laya/pages/View/GameLevelScene.scene.json";
