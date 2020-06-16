import Config from "../config";
import GameScene from "./GameScene";
import {AnimatedSprite, Graphics, resources, Texture} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";
import {Vec2} from "../libs/planck-wrapper";
import DataMgr from "../mgr/DataMgr";
import Progress from "../ui/Progress";
import TWEEN from "@tweenjs/tween.js";

export default class EndlessGameScene extends GameScene {
    onCreate() {
        super.onCreate();
        this.rewardType = DataMgr.preparationDataEndless;
        this.registerEvent("Continue", this.onContinue.bind(this));
        this.ui.coinPanel.visible = true;
        this.ui.expPanel.visible = true;
        this.ui.pauseButton.visible = true;
        this.ui.velocityState.visible = true;
        this.ui.rewardProgressPanel.visible = true;
        this.rewardProgress = new Progress(this.ui.rewardProgress, this.ui.rewardProgressRate);
        this.rewardProgress.setMax(Config.endlessMode.rewardRoad.maxValue);
        this.onClick(this.ui.pauseButton, this.onClickPauseButton.bind(this));
    }

    onShow(sceneIndex) {
        this.rewardRoads = Utils.clone(Config.endlessMode.rewardRoad.roadPath);
        this.inRewardRoad = false;
        this.rewardProgress.setValue(0);
        this.sceneIndex = sceneIndex;
        this.sceneConfig = Config.endlessMode.sceneList[sceneIndex];
        // 没有配置的话 就用默认配置
        if (this.sceneConfig.roadSectionList.length === 0) {
            this.sceneConfig.roadSectionList = Config.endlessMode.default.roadSectionList;
        }
        if (this.sceneConfig.infiniteRoadSectionList.length === 0) {
            this.sceneConfig.infiniteRoadSectionList = Config.endlessMode.default.infiniteRoadSectionList;
        }
        this.nextDistanceIndex = 0;
        let config = this.sceneConfig.distanceNotice;
        this.nextNoticeDistance = config && config[this.nextDistanceIndex];
        super.onShow();
        window.TDGA && TDGA.onEvent("无尽模式");
    }

    initEnvironment() {
        this.bikeCommonVelocity = this.sceneConfig.bikeVelocity || Config.bikeVelocity;
        this.gravity = this.sceneConfig.gravity || Config.gravity;
        this.jumpForce = this.sceneConfig.jumpForce || Config.jumpForce;
        this.bgTextureList = this.sceneConfig.texture.bg;
        this.sideTexture = this.sceneConfig.texture.side;
        this.topTexture = this.sceneConfig.texture.top;
        this.sideTexture2 = this.sceneConfig.texture.side2;
        this.topTexture2 = this.sceneConfig.texture.top2;
        this.horizontalParallaxDepth = this.sceneConfig.horizontalParallaxDepth;
        this.verticalParallaxDepth = this.sceneConfig.verticalParallaxDepth;
        this.bgY = this.sceneConfig.bgY || Config.bgY;
        this.bgmPath = this.sceneConfig.bgmPath || Config.defaultBgmPath;
        this.bgScale = this.sceneConfig.bgScale || Config.defaultBgScale;
        this.itemRandomTable = this.sceneConfig.itemRandomTable || Config.defaultItemRandomTable;
    }

    getResPathList() {
        this.sceneFilePathList = [];
        [this.sceneConfig.roadSectionList, this.sceneConfig.infiniteRoadSectionList]
            .forEach(rsList => {
                let pathList = rsList.reduce((list, diff) => {
                    diff.list.forEach(roadSectionID => {
                        let roadSection = Config.roadSections[roadSectionID];
                        roadSection.forEach(name =>
                            list.push(`${Config.endlessMode.baseScenePath}${name}.scene.json`));
                    });
                    return list;
                }, []);
                this.sceneFilePathList = this.sceneFilePathList.concat(pathList);
            });
        return super.getResPathList()
            .concat(this.sceneConfig.texture.bg)
            .concat([
                this.sceneConfig.texture.side,
                this.sceneConfig.texture.top,
                this.sceneConfig.texture.side2,
                this.sceneConfig.texture.top2,
            ])
            .concat(Config.endlessMode.rewardRoad.roadPath)
            .concat(this.sceneFilePathList)
            .concat(Config.gameScene.velocityStateImgList.map(({imgPath}) => imgPath));
    }

    onRestart() {
        this.onShow(this.sceneIndex);
    }

    initGameContent() {
        this.createPart({
            label: "Road",
            props: {
                points: [0, Config.designHeight / 2, Config.startRoadLength, Config.designHeight / 2].join(","),
                x: 0,
                y: 0,
            }
        });

        this.mapWidth = Config.startRoadLength;
        this.offsetX = Config.startRoadLength;
        this.offsetY = Config.designHeight / 2;

        this.createBike(GameUtils.renderPos2PhysicsPos({
            x: Config.designWidth / 2,
            y: Config.designHeight / 2 - Config.bikeRadius * Config.meter2pixel
        }));

        this.enemyList = [];

        this.diffIndex = -1;
        this.roadSectionList = this.sceneConfig.roadSectionList;
        this.preparePartList();
        this.createSpeedUpNotice();
    }

    createRoadSection(json, offsetX, offsetY) {
        json.child.forEach(data => {
            data.props.x += offsetX;
            data.props.y += offsetY;
            data.animations = json.animations;
            this.createPart(data);
        });
        this.roadList.sort((a, b) => a.getLeftBorderX() - b.getLeftBorderX());
    }

    dynamicCreateRoad() {
        if (this.mapWidth <= -this.cameraContainer.x + Config.designWidth) {
            if (this.partList.length === 0) {
                this.preparePartList();
            }
            let item = this.partList.pop();
            this.createRoadSection(item, this.offsetX, this.offsetY);
            this.mapWidth += item.props.width;
            this.offsetX += item.props.width;
            this.offsetY += item.props.height;
        }
    }

    preparePartList() {
        if (this.roadSectionList[this.diffIndex + 1]) {
            this.diffIndex++;
        } else {
            this.diffIndex = 0;
            this.roadSectionList = this.sceneConfig.infiniteRoadSectionList;
        }
        let roadSection = this.roadSectionList[this.diffIndex];
        let rsListID = Utils.randomChoose(roadSection.list);
        let rsList = Config.roadSections[rsListID].map(name =>
            Utils.clone(resources[`${Config.endlessMode.baseScenePath}${name}.scene.json`].data));

        if (roadSection.velocity > this.player.velocity.getBasicValueRate()) {
            this.speedUpNotice.visible = true;
            this.speedUpNotice.gotoAndPlay(0);
        }
        this.player.velocity.setBasicValueRate(roadSection.velocity);
        this.onVelocityUpdate(roadSection.velocity);
        this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, this.bikeBody.getLinearVelocity().y));

        this.partList = [];
        let sumLength = 0;
        let roadSectionLength = roadSection.length;
        while (roadSectionLength > sumLength) {
            if (rsList.length === 0) {
                rsList = Config.roadSections[rsListID].map(name =>
                    Utils.clone(resources[`${Config.endlessMode.baseScenePath}${name}.scene.json`].data));
            }
            let index = Math.floor(Math.random() * rsList.length);
            let item = rsList.splice(index, 1)[0];
            this.partList.push(item);
            sumLength += item.props.width;
        }
    }

    onVelocityUpdate(newValue) {
        for (let i = 0; i < Config.gameScene.velocityStateImgList.length; i++) {
            const item = Config.gameScene.velocityStateImgList[i];
            if (newValue <= item.maxVelocity) {
                this.ui.velocityState.children[0].texture = Texture.from(item.imgPath);
                break;
            }
        }
    }

    showDistance() {
        if (this.distance >= this.nextNoticeDistance) {
            App.showNotice(App.getText("You have ridden ${distance} meters", {distance: this.nextNoticeDistance}));
            this.nextDistanceIndex++;
            this.nextNoticeDistance = this.sceneConfig.distanceNotice[this.nextDistanceIndex];
        }
    }

    cleanPartOutOfView() {
        this.underBikeContianer.children.forEach(({part}) => {
            if (part && part.getRightBorderX() < -this.cameraContainer.x) {
                part.destroy();
                [this.roadList, this.itemList].forEach(list => {
                    if (list.indexOf(part) !== -1) {
                        Utils.removeItemFromArray(list, part);
                    }
                });
            }
        });
    }

    onDead() {
        super.onDead();
        this.deadCompleteTimer = setTimeout(() => {
            this.pauseGame();
            App.showScene("GameOverRebornScene", {
                gameScene: this
            });
        }, Config.bike.deadCompleteTime);
    }

    onClickPauseButton() {
        if (this.gameStatus === "play") {
            this.pauseGame();
            this.gameStatus = "pause";
            App.showScene("PauseScene", {
                gameSceneName: "EndlessGameScene",
                clickMainTip: "Are you sure you want to quit the game?  The current game data will be saved automatically after exit.",
                clickRestartTip: "Are you sure to restart the game? The current game data will be saved automatically after exit."
            });
        } else if (this.gameStatus === "pause") {
            this.resumeGame();
            this.gameStatus = "play";
            App.hideScene("PauseScene");
        }
    }

    onContinue() {
        this.onClickPauseButton();
    }

    getItemRandomTableList() {
        return this.itemRandomTable;
    }

    onLoadedGameRes() {
        super.onLoadedGameRes();
        this.showGuideAnimation();
    }

    createSpeedUpNotice() {
        if (this.speedUpNotice) {
            return;
        }
        this.speedUpNotice = new AnimatedSprite(GameUtils.getFrames(Config.imagePath.speedUpNotice));
        this.speedUpNotice.loop = false;
        this.speedUpNotice.animationSpeed = Config.animationSpeed.speedUpNotice;
        this.speedUpNotice.onComplete = () => this.speedUpNotice.visible = false;
        this.speedUpNotice.anchor.set(0.5, 0.5);
        this.speedUpNotice.visible = false;
        this.ui.speedUpNotice.addChild(this.speedUpNotice);
    }

    settle() {
        super.settle();
        DataMgr.add(DataMgr.endlessGameTimes, 1);
        let exp = this.exp * GameUtils.getBikeConfig("expPercent");
        if (this.doubleReward) {
            exp *= 2;
        }
        DataMgr.add(DataMgr.exp, Math.floor(exp));
        let id = Math.floor(Math.random() * Config.endlessMode.sceneList.length);
        if (id === DataMgr.get(DataMgr.selectedEndlessScene)) {
            id = id + 1;
            if (Config.endlessMode.sceneList[id] === undefined) {
                id = 0;
            }
        }
        DataMgr.set(DataMgr.selectedEndlessScene, id);
    }

    enterRewardRoad() {
        this.playLightAnimation(() => {
            this.itemList.forEach(item => item.destroy());
            this.itemList = [];
            this.roadList.forEach(road => road.destroy());
            this.roadList = [];
            this.showList.forEach(sprite => sprite.destroy());
            this.showList = [];
            if (this.rewardRoads.length === 0) {
                this.rewardRoads = Utils.randomList(Utils.clone(Config.endlessMode.rewardRoad.roadPath));
            }
            const item = Utils.clone(resources[this.rewardRoads.pop()].data);
            this.offsetX = -this.cameraContainer.x;
            this.mapWidth = -this.cameraContainer.x;
            this.createRoadSection(item, this.offsetX, this.offsetY);
            this.mapWidth += item.props.width;
            this.offsetX += item.props.width;
            this.offsetY += item.props.height;
            this.rewardProgress.setValue(0);
            this.inRewardRoad = true;
            this.rewardRoadFinalX = this.mapWidth;
        });
    }

    addRewardProgressValue(rewardProgressValue) {
        if (this.inRewardRoad) {
            return;
        }
        this.rewardProgress.setValue(this.rewardProgress.value + rewardProgressValue);
        if (this.rewardProgress.isFull()) {
            this.willEnterScene = true;
        }
    }

    playLightAnimation(middleCallback) {
        const g = new Graphics();
        this.addChild(g);
        g.beginFill(0xffffff);
        g.drawRect(0, 0, App.sceneWidth, App.sceneHeight);
        g.endFill();
        g.alpha = 0;
        new TWEEN.Tween(g)
            .to({alpha: 1}, Config.endlessMode.rewardRoad.lightAnimationDuration / 2)
            .onComplete(() => {
                middleCallback && middleCallback();
                new TWEEN.Tween(g)
                    .to({alpha: 0}, Config.endlessMode.rewardRoad.lightAnimationDuration / 2)
                    .onComplete(() => {
                        g.destroy();
                    })
                    .start(performance.now());
            })
            .start(performance.now());
    }

    play() {
        super.play();
        if (this.inRewardRoad && this.bikeOutterContainer.x + Config.endlessMode.rewardRoad.endDistance >= this.rewardRoadFinalX) {
            this.playLightAnimation();
            this.inRewardRoad = false;
            this.enterInvincible(Config.endlessMode.rewardRoad.endInvincibleDuration);
        }
    }
}
