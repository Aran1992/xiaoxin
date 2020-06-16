import Config from "../config";
import RunOption from "../../run-option";
import Utils from "../mgr/Utils";
import GameUtils from "../mgr/GameUtils";
import MusicMgr from "../mgr/MusicMgr";
import DataMgr from "../mgr/DataMgr";
import Scene from "./Scene";
import {Circle, Vec2, World} from "../libs/planck-wrapper";
import {
    AnimatedSprite,
    Container,
    Emitter,
    Graphics,
    Rectangle,
    resources,
    Sprite,
    Text,
    TextStyle,
    Texture
} from "../libs/pixi-wrapper";

import Road from "../item/Road";
import Item from "../item/Item";
import SmallFireWall from "../item/SmallFireWall";
import BigFireWall from "../item/BigFireWall";
import GroundStab from "../item/GroundStab";
import UpDownPlatform from "../item/UpDownPlatform";
import Road2 from "../item/Road2";
import DeadLine from "../item/DeadLine";
import RollingStone from "../item/RollingStone";
import FireBall from "../item/FireBall";
import EatableItem from "../item/EatableItem";
import EventMgr from "../mgr/EventMgr";
import BananaPeel from "../item/BananaPeel";
import BikeEffect from "../item/BikeEffect";
import Value from "../item/Value";
import BaseEffect from "../item/BaseEffect";
import SceneHelper from "../mgr/SceneHelper";
import Bird from "../item/Bird";
import Cloud from "../item/Cloud";
import Spring from "../item/Spring";
import Scroll from "../ui/Scroll";
import TWEEN from "@tweenjs/tween.js";
import BulletTimeLineMgr from "../mgr/BulletTimeLineMgr";
import GuideMgr from "../mgr/GuideMgr";
import UIHelper from "../ui/UIHelper";

function getValue(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    } else {
        return value;
    }
}

function handleDisplayObjectWithData(displayObject, data) {
    displayObject.position.set(getValue(data.props.x, 0), getValue(data.props.y, 0));
    displayObject.anchor.set(getValue(data.props.anchorX, 0), getValue(data.props.anchorY, 0));
    displayObject.scale.set(getValue(data.props.scaleX, 1), getValue(data.props.scaleY, 1));
    displayObject.rotation = Utils.angle2radius(getValue(data.props.rotation, 0));
}

export default class GameScene extends Scene {
    onCreate() {
        this.initContactHandleTable();
        this.initEffectTable();

        this.registerEvent("Restart", this.onRestart);
        this.registerEvent("Reborn", this.onReborn);
        this.registerEvent("AteItem", this.onAteItem);
        this.registerEvent("UseItem", this.onUseItem);

        this.keyDownHandler = this.onKeydown.bind(this);
        window.addEventListener("keydown", this.keyDownHandler);

        this.gameContainer = new Container();
        this.addChildAt(this.gameContainer, 0);
        let scale = App.sceneHeight / Config.designHeight;
        this.gameContainer.scale.set(scale, scale);
        this.gameContainer.x = (App.sceneWidth - scale * Config.designWidth) / 2;
        this.gameContainer.interactive = true;
        this.gameContainer.buttonMode = true;
        this.gameContainer.on("pointerdown", this.onClickGameContainer.bind(this));
        this.gameContainer.on("pointermove", this.onPointerMove.bind(this));
        this.gameContainer.on("pointerup", this.onPointerUp.bind(this));
        this.gameContainer.on("pointerupoutside", this.onPointerUp.bind(this));

        if (RunOption.debug) {
            let scale = 0.5;
            this.gameContainer.scale.set(scale, scale);
            this.gameContainer.position.set(this.gameContainer.x + Config.designWidth * (1 - scale) / 2,
                Config.designHeight * (1 - scale) / 2);
        }

        this.cameraContainer = new Container();
        if (Config.enableCameraAutoZoom) {
            this.autoZoomContainer = new Container();
            this.gameContainer.addChild(this.autoZoomContainer);
            this.autoZoomContainer.addChild(this.cameraContainer);
        } else {
            this.gameContainer.addChild(this.cameraContainer);
        }

        this.createBottomMask();

        if (RunOption.showFPS) {
            this.createFPSText();
        }

        this.ui.skipBtn.visible = false;
        this.ui.pauseButton.visible = false;
        this.ui.surrenderButton.visible = false;
        this.ui.starPanel.visible = false;
        this.ui.coinPanel.visible = false;
        this.ui.expPanel.visible = false;
        this.ui.velocityState.visible = false;
        this.ui.rewardProgressPanel.visible = false;
        this.onClick(this.ui.confirmButton, this.onClickConfirmButton.bind(this));
        this.ui.rebornPanel.visible = false;
        this.portableItemButtonList = [1, 2].map(i => this.ui[`portableItemButton${i}`]);
        this.portableItemButtonList.forEach((button, i) => {
            let child = button.getChildAt(1);
            button.hitArea = new Rectangle(child.x, child.y, child.mywidth, child.myheight);
            button.removeChildAt(1);
            this.onClick(button, () => this.onClickPortableItem(i));
        });

        this.gameStatus = "end";
        this.animationList = [];
        this.pauseGame();
        App.ticker.add(this.gameLoop.bind(this));

        this.ui.matchRacetrack.visible = false;
        this.ui.nextPlayerInfo.visible = false;

        this.ui.itemUseHistoryPanel.removeChildren();

        this.stepDuration = 1 / Config.fps / Config.stepTimesEachFrame;
        this.stepSpeed = 1;

        if (this.ui.enterBulletTime) {
            this.onClick(this.ui.enterBulletTime, this.enterBulletTime.bind(this));
        }
        if (this.ui.leaveBulletTime) {
            this.onClick(this.ui.leaveBulletTime, this.leaveBulletTime.bind(this));
        }

        this.initBulletTime();
        this.guideMgr = new GuideMgr(this, this.ui.guidePanelContainer);

        for (let i = 0; i < Config.starCount; i++) {
            const star = this.ui[`star${i}`].children[0];
            star.anchor.set(0.5, 0.5);
            star.position.set(star.x + star.width / 2, star.y + star.height / 2);
        }

        this.warningTable = {};
    }

    onShow() {
        App.getScene("MainScene").curPlayerLevel = DataMgr.getPlayerLevel().level;
        App.getScene("MainScene").gameLevelFirstWin = false;

        this.guideMgr.clear();
        this.guideMgr.setControlAll(false);

        this.doubleReward = false;
        this.rebornTimes = 0;
        this.ui.blockSightSprite.visible = false;

        clearTimeout(this.deadCompleteTimer);

        this.distance = 0;
        this.ui.diamondText.text = 0;
        this.updateCoin(0);
        this.updateStar(0);
        this.updateExp(0);

        this.setContactFatalEdge(false);

        this.dragBackPos = undefined;
        this.startDragBikeBack = undefined;
        this.startAdjustBikeHeight = undefined;
        this.startY = undefined;
        this.startFloat = undefined;
        this.bikeFloatFrame = undefined;

        this.cameraContainer.removeChildren();
        this.cameraContainer.position.set(0, 0);

        this.roadList = [];
        this.itemList = [];
        this.showList = [];

        this.portableItemButtonList.forEach(button => {
            if (button.children.length === 2) {
                button.removeChildAt(1);
            }
            button.randoming = false;
            button.destroying = false;
        });
        this.ui.sealMask.visible = false;

        if (Config.enableCameraAutoZoom) {
            this.autoZoomContainer.scale.set(1, 1);
            this.autoZoomContainer.position.set(0, 0);
        }

        this.effectRemainFrame = {};

        if (this.itemUseHistoryDisappearTimer) {
            this.itemUseHistoryDisappearTimer.forEach(timer => clearTimeout(timer));
        }
        this.itemUseHistoryDisappearTimer = [];
        this.ui.itemUseHistoryPanel.removeChildren();

        this.targetCameraPos = undefined;

        this.playerName = DataMgr.getPlayerName();

        this.initEnvironment();

        if (this.rewardType) {
            this.rewards = DataMgr.get(this.rewardType);
        }

        App.showScene("LoadingScene", this.getBikeID());
        App.loadResources(this.getResPathList(), () => {
            App.getScene("LoadingScene").goToPercent(100, () => {
                this.onLoadedGameRes();
            });
        }, (percent) => {
            App.getScene("LoadingScene").goToPercent(percent);
        }, Config.minLoadingTime * 1000);

        this.clearWarning();

        this.ui.addExtraScoreLabel.x = -1000;
        this.ui.addExtraScoreLabel.alpha = 1;
        if (this.addExtraScoreAnimation) {
            this.addExtraScoreAnimation.stop();
            delete this.addExtraScoreAnimation;
        }

        this.contactRoadList = [];
        this.contactRoad2List = [];
        this.contactUpdownPlatformList = [];
    }

    getBikeID() {
        let id;
        if (this.rewards[2].received) {
            id = this.rewards[2].bike;
        } else {
            id = DataMgr.get(DataMgr.selectedBike, 0);
        }
        return id;
    }

    onHide() {
        this.stopSounds();
    }

    onDestroy() {
        this.stopSounds();
        window.removeEventListener("keydown", this.keyDownHandler);
        super.onDestroy();
    }

    stopSounds() {
        if (this.bubbleFloatSound) {
            MusicMgr.stopLoopSound(this.bubbleFloatSound);
            this.bubbleFloatSound = undefined;
        }
    }

    getResPathList() {
        let effectResPathList = [];
        let resNameList = [
            "imagePath",
            "userUsedEffectPath",
            "bearerSufferedEffectPath",
            "bearerBuffEffectPath",
            "buffIconImagePath",
            "useSound",
            "sufferSound",
        ];
        for (let effect in Config.effect) {
            if (Config.effect.hasOwnProperty(effect)) {
                let data = Config.effect[effect];
                resNameList.forEach(resName => data[resName] && effectResPathList.push(data[resName]));
            }
        }
        let soundPathList = [];
        for (let itemType in Config.item) {
            if (Config.item.hasOwnProperty(itemType)) {
                if (Config.item[itemType].appearSoundPath) {
                    soundPathList.push(Config.item[itemType].appearSoundPath);
                }
                if (Config.item[itemType].table) {
                    const table = Config.item[itemType].table;
                    for (const key in table) {
                        if (table.hasOwnProperty(key)) {
                            const item = table[key];
                            if (item.appearSoundPath && item.appearSoundPath.length > 0) {
                                soundPathList.push(item.appearSoundPath);
                            }
                            if (item.animationJsonPath && item.animationJsonPath.length > 0) {
                                effectResPathList.push(item.animationJsonPath);
                            }
                            if (item.animations) {
                                for (const animation in item.animations) {
                                    if (item.animations.hasOwnProperty(animation)) {
                                        effectResPathList.push(item.animations[animation].path);
                                    }
                                }
                            }
                            if (item.bulletTimeAnimation && item.bulletTimeAnimation.animationJsonPath && item.bulletTimeAnimation.animationJsonPath.length > 0) {
                                effectResPathList.push(item.bulletTimeAnimation.animationJsonPath);
                            }
                        }
                    }
                }
            }
        }
        const id = this.getBikeID();
        const config = Config.bikeList.find(bike => bike.id === id);
        const bca = config.bikeCommonAnimation || Config.bikeCommonAnimation;
        const bjas = Utils.values(config.bikeJumpingAnimation || Config.bikeJumpingAnimation).map(item => item.atlasPath);
        const bsa = config.bikeSprintAnimation || Config.bikeSprintAnimation;
        const bspa = config.bikeSpringAnimation ? config.bikeSpringAnimation.path : Config.bikeSpringAnimation.path;
        const pe = [];
        Utils.values(Config.playerEffect).forEach(config => {
            if (config.length) {
                config.forEach(config => pe.push(config.animationJsonPath));
            } else {
                pe.push(config.animationJsonPath);
            }
        });
        return [
            Config.finalFlagImagePath,
            Config.goldCoinAniJson,
            Config.fireWallAniJson,
            Config.effect.BananaPeel.peelPrefabPath,
            Config.startImagePath.ui,
            this.bgmPath,
            bca,
            bsa,
            bspa,
            Config.bulletTime.filmImagePath,
            Config.bulletTime.lineAnimationPath,
            Config.warningAnimation.warnSpritePath,
        ]
            .concat(soundPathList)
            .concat(Utils.values(Config.item.bird.table).map(data => data.animationJsonPath))
            .concat(Utils.values(Config.item.Cloud.table).map(data => data.animationJsonPath))
            .concat(Utils.values(Config.soundPath))
            .concat(Utils.values(Config.sceneItemImagePath))
            .concat(Utils.values(Config.emitterPath))
            .concat(Utils.values(Config.imagePath))
            .concat(effectResPathList)
            .concat(pe)
            .concat(bjas);
    }

    onRestart() {
        if (this.emitter) {
            this.emitter.destroy();
            this.emitter = undefined;
        }
        this.enemyList.forEach(enemy => enemy.destroy());
        this.itemList.forEach(item => item.destroy && item.destroy());
        this.onShow();
    }

    onReborn() {
        this.startDragBikeBack = true;
        this.rebornDragVelocity = Utils.calcPointDistance(this.bikeBody.getPosition(), this.dragBackPos) / Config.rebornDragDuration / Config.fps;
        this.bikeBubbleSprite.visible = true;
        this.bikeBody.setStatic();
        this.bikeBody.setAngle(0);
        this.bikeSelfContainer.rotation = 0;
        this.resumeGame();
    }

    onLoadedGameRes() {
        App.hideScene("LoadingScene");

        this.resetBulletTime();

        this.world = new World({gravity: Vec2(0, this.gravity)});

        this.world.on("begin-contact", this.onBeginContact.bind(this));
        this.world.on("end-contact", this.onEndContact.bind(this));
        this.world.on("pre-solve", this.onPreSolve.bind(this));

        this.createBg();

        this.closeViewContainer = this.cameraContainer.addChild(new Container());
        this.road2Container = this.closeViewContainer.addChild(new Container());
        if (RunOption.showDeadLine) {
            this.deadLine = this.road2Container.addChild(new Graphics());
            this.deadLine.beginFill();
            this.deadLine.lineStyle(4, 0xff0000, 1);
            this.deadLine.moveTo(0, 0);
            this.deadLine.lineTo(Config.designWidth, 0);
            this.deadLine.endFill();
        }
        this.underBikeContianer = this.closeViewContainer.addChild(new Container());
        this.bikeContainer = this.closeViewContainer.addChild(new Container());

        this.emitter = new Emitter(
            this.bikeContainer,
            [Texture.from(Config.imagePath.bikeParticle)],
            resources[Config.emitterPath.bike].data
        );
        this.emitter.emit = false;

        if (RunOption.debug) {
            let graphics = new Graphics();
            this.gameContainer.addChild(graphics);
            graphics.lineStyle(10, 0xffd900, 1);
            graphics.moveTo(0, 0);
            graphics.lineTo(Config.designWidth, 0);
            graphics.lineTo(Config.designWidth, Config.designHeight);
            graphics.lineTo(0, Config.designHeight);
            graphics.lineTo(0, 0);
        }

        this.initGameContent();

        this.adjustInitCameraBg();

        if (this.rewards) {
            for (let i = 0; i < 2; i++) {
                if (this.rewards[i].received) {
                    let texture = Texture.from(Config.effect[this.rewards[i].effect].imagePath);
                    this.showPortableItem(this.rewards[i].effect, texture);
                }
            }
        }

        this.gameStatus = "play";
        this.resumeGame();

        MusicMgr.pauseBGM();
    }

    initContactHandleTable() {
        this.chtable = {
            player: {
                is: (fixture) => {
                    return fixture.getBody() === this.bikeBody;
                },
                preSolve: (contact, anotherFixture,) => {
                    if (this.gameStatus === "end") {
                        return contact.setEnabled(false);
                    }
                    if (this.chtable.enemy.is(anotherFixture)) {
                        contact.setEnabled(false);
                    } else if (this.chtable.road2.is(anotherFixture)) {
                        let {p1, p2} = anotherFixture.getUserData();
                        if (Utils.getDistanceFromPointToLine(this.bikeBody.getPosition(), p1, p2) < Config.bikeRadius - Config.pixel2meter) {
                            contact.setEnabled(false);
                            anotherFixture.getBody().getUserData().obj.isPlayerInside = true;
                        }
                    }
                    let ud = anotherFixture.getBody().getUserData();
                    if (this.isInvincible() && [SmallFireWall, BigFireWall].some(ins => ud instanceof ins)) {
                        contact.setEnabled(false);
                    }
                },
                beginContact(contact, anotherFixture,) {
                    let item = anotherFixture.getBody().getUserData();
                    if (item.type === "Road") {
                        this.contactRoadList.push(anotherFixture);
                    } else if (item.type === "Road2") {
                        this.contactRoad2List.push(anotherFixture);
                    } else if (item instanceof UpDownPlatform) {
                        this.contactUpdownPlatformList.push(anotherFixture);
                    }
                    if (item && item instanceof BananaPeel && item.thrower === this) {
                        return;
                    }
                    if (item && item instanceof Bird) {
                        return;
                    }
                    if (item && item instanceof Cloud) {
                        if (!this.isInvincible()) {
                            this.setContactFatalEdge(true);
                        }
                        return;
                    }
                    let ud = anotherFixture.getUserData();
                    if (this.chtable.road.is(anotherFixture) || (ud && ud.resetJumpStatus)) {
                        this.resetJumpStatus();
                    }
                    if (this.chtable.obstacle.is(anotherFixture)) {
                        if (!this.isInvincible()) {
                            this.setContactFatalEdge(true);
                        }
                    } else {
                        let ud = anotherFixture.getUserData();
                        if (ud && ud.isFatal) {
                            if (!this.isInvincible()) {
                                this.setContactFatalEdge(true);
                            }
                            ud = anotherFixture.getBody().getUserData();
                            if (ud && ud.thrower) {
                                EventMgr.dispatchEvent("UseItem", ud.thrower, this, "BananaPeel");
                            }
                        }
                    }
                },
            },
            enemy: {
                is: (fixture) => {
                    let ud = fixture.getBody().getUserData();
                    if (ud) {
                        return this.enemyList.find(enemy => enemy === ud);
                    }
                },
                preSolve: (contact, anotherFixture, selfFixture) => {
                    selfFixture.getBody().getUserData().onPreSolve(contact, anotherFixture, selfFixture);
                },
                beginContact(contact, anotherFixture, selfFixture) {
                    selfFixture.getBody().getUserData().onBeginContact(contact, anotherFixture, selfFixture);
                }
            },
            road: {
                is: (fixture) => {
                    let ud = fixture.getBody().getUserData();
                    if (ud) {
                        return ud.type === "Road";
                    }
                },
            },
            road2: {
                is: (fixture) => {
                    let ud = fixture.getBody().getUserData();
                    if (ud) {
                        return ud.type === "Road2";
                    }
                },
            },
            obstacle: {
                is: (fixture) => {
                    let ud = fixture.getBody().getUserData();
                    if (ud) {
                        return ["BigFireWall", "SmallFireWall"].find(type => type === ud.type);
                    }
                }
            },
            editorItem: {
                is: (fixture) => {
                    return this.itemList.indexOf(fixture.getBody().getUserData()) !== -1;
                },
                preSolve(contact, anotherFixture, selfFixture) {
                    let ud = selfFixture.getBody().getUserData();
                    ud.onPreSolve && ud.onPreSolve(contact, anotherFixture, selfFixture);
                },
                beginContact(contact, anotherFixture, selfFixture) {
                    let ud = selfFixture.getBody().getUserData();
                    ud.onBeginContact && ud.onBeginContact(contact, anotherFixture, selfFixture);
                }
            }
        };
    }

    onPreSolve(contact) {
        let fa = contact.getFixtureA();
        let fb = contact.getFixtureB();
        for (let type in this.chtable) {
            if (this.chtable.hasOwnProperty(type)) {
                let item = this.chtable[type];
                if (item.is(fa)) {
                    if (item.preSolve) {
                        this.callByScene(item.preSolve, contact, fb, fa);
                    }
                    for (let type2 in this.chtable) {
                        if (this.chtable.hasOwnProperty(type2)) {
                            let item2 = this.chtable[type2];
                            if (item2.is(fb)) {
                                if (item2.preSolve) {
                                    this.callByScene(item2.preSolve, contact, fa, fb);
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    onBeginContact(contact) {
        let fa = contact.getFixtureA();
        let fb = contact.getFixtureB();
        for (let type in this.chtable) {
            if (this.chtable.hasOwnProperty(type)) {
                let item = this.chtable[type];
                if (item.is(fa)) {
                    if (item.beginContact) {
                        this.callByScene(item.beginContact, contact, fb, fa);
                    }
                    for (let type2 in this.chtable) {
                        if (this.chtable.hasOwnProperty(type2)) {
                            let item2 = this.chtable[type2];
                            if (item2.is(fb)) {
                                if (item2.beginContact) {
                                    this.callByScene(item2.beginContact, contact, fa, fb);
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    onEndContact(contact) {
        let another, anotherFixture;
        let bike = this.getBikeFromFixture(contact.getFixtureA());
        if (bike) {
            anotherFixture = contact.getFixtureB();
            another = anotherFixture.getBody().getUserData();
        } else {
            bike = this.getBikeFromFixture(contact.getFixtureB());
            if (bike) {
                anotherFixture = contact.getFixtureA();
                another = anotherFixture.getBody().getUserData();
            }
        }
        if (bike && another) {
            if (another.type === "Road") {
                Utils.removeItemFromArray(this.contactRoadList, anotherFixture);
            } else if (another.type === "Road2") {
                Utils.removeItemFromArray(this.contactRoad2List, anotherFixture);
            } else if (another instanceof UpDownPlatform) {
                Utils.removeItemFromArray(this.contactUpdownPlatformList, anotherFixture);
            }
        }
    }

    getBikeFromFixture(fixture) {
        const obj = fixture.getBody().getUserData();
        if (obj instanceof GameScene) {
            return obj;
        }
    }

    callByScene(handle, ...args) {
        handle.bind(this)(...args);
    }

    onClickGameContainer(event) {
        if (!UIHelper.getClickPredicate()(this.gameContainer)) {
            return;
        }
        if (this.gameStatus === "play") {
            // 无敌冲刺期间不能操作
            if (this.hasEffect("Sprint")) {
                return;
            }
            if (this.startFloat) {
                this.startFloat = false;
                this.bikeBubbleSprite.visible = false;
                this.stopSounds();
                MusicMgr.playSound(Config.soundPath.bubbleDestroy);
            } else if (this.hasEffect("SpiderWeb")) {
                this.bikeBody.applyLinearImpulse(Vec2(0, Config.effect.SpiderWeb.jumpForce), this.bikeBody.getPosition());
                this.spiderWebRemainBreakTimes--;
                if (this.spiderWebRemainBreakTimes <= 0) {
                    delete this.effectRemainFrame.SpiderWeb;
                    if (this.effectTable.SpiderWeb.end) {
                        this.effectTable.SpiderWeb.end();
                    }
                    if (this.durationEffectTable.SpiderWeb) {
                        this.durationEffectTable.SpiderWeb.destroy();
                        delete this.durationEffectTable.SpiderWeb;
                    }
                    this.removeBuffIcon("SpiderWeb");
                }
            } else if (this.hasEffect("UnlimitedJump")
                || this.jumpCount < Config.jumpCommonMaxCount
                || this.jumpExtraCountdown > 0) {
                let velocity = this.bikeBody.getLinearVelocity();
                this.bikeBody.setLinearVelocity(Vec2(velocity.x, 0));
                this.bikeBody.applyLinearImpulse(Vec2(0, this.player.jumpForce.value), this.bikeBody.getPosition());
                this.jumping = true;
                this.isSpring = false;
                this.isJacking = false;
                this.jumpCount++;
                this.jumpExtraCountdown = this.bikeJumpExtraCountdown[this.jumpCount - Config.jumpCommonMaxCount];
                switch (this.jumpCount) {
                    case 1:
                        MusicMgr.playSound(Config.soundPath.firstJump, undefined, this.stepSpeed);
                        break;
                    case 2:
                        MusicMgr.playSound(Config.soundPath.secondJump, undefined, this.stepSpeed);
                        this.emitter.playOnce();
                        break;
                    default:
                        MusicMgr.playSound(Config.soundPath.extraJump, undefined, this.stepSpeed);
                        this.emitter.playOnce();
                }
                const jumpAnimation = this.getBikeJumpAnimation(this.jumpCount);
                if (jumpAnimation) {
                    this.jumpingAnimationFrames = GameUtils.getFrames(jumpAnimation.atlasPath, jumpAnimation.animationName);
                    this.jumpingAnimationIndex = 0;
                    this.jumpingAnimationInterval = jumpAnimation.interval;
                    this.bikeAnimSprite.position.set(...(jumpAnimation.pos || Config.bikeCommonAnimationPos));
                } else {
                    this.bikeSelfContainer.rotation = Utils.angle2radius(Config.bikeJumpingRotation);
                    this.jumpingAnimationFrames = undefined;
                    this.jumpingAnimationIndex = undefined;
                }
                const config = this.jumpCount === 1 ? Config.playerEffect.ground : Config.playerEffect.air;
                this.playPlayerEffect(config);
            }
        } else if (this.gameStatus === "end" && this.startAdjustBikeHeight) {
            this.startY = event.data.global.y;
        }
    }

    playPlayerEffect(config, target) {
        const sprite = new AnimatedSprite(GameUtils.getFrames(config.animationJsonPath, config.animationName));
        sprite.animationSpeed = config.animationSpeed * this.stepSpeed;
        sprite.onComplete = () => {
            Utils.removeItemFromArray(this.animationList, sprite);
            sprite.destroy();
        };
        sprite.loop = !!config.loop;
        sprite.play();
        if (target) {
            sprite.position.set(target.x + config.animationPos[0], target.y + config.animationPos[1]);
            this.underBikeContianer.addChild(sprite);
        } else if (config.followPlayer) {
            sprite.position.set(config.animationPos[0], config.animationPos[1]);
            this.bikeOutterContainer.addChild(sprite);
        } else {
            sprite.position.set(this.bikeOutterContainer.x + config.animationPos[0],
                this.bikeOutterContainer.y + config.animationPos[1]);
            this.underBikeContianer.addChild(sprite);
        }
        this.animationList.push(sprite);
        return sprite;
    }

    onKeydown(event) {
        switch (event.code) {
            case "ArrowUp": {
                this.onClickGameContainer();
                break;
            }
            case "Space": {
                if (this.gameStatus === "play") {
                    this.gameStatus = "end";
                    this.pauseGame();
                } else if (this.gameStatus === "end") {
                    this.gameStatus = "play";
                    this.resumeGame();
                }
                break;
            }
            case "ArrowLeft": {
                this.enterBulletTime();
                break;
            }
            case "ArrowRight": {
                this.leaveBulletTime();
                break;
            }
            case "ArrowDown": {
                this.playLightAnimation();
                break;
            }
        }
    }

    onAteItem(type, effect, texture, itemConfig) {
        switch (type) {
            case "Random": {
                let effect = this.randomEffect(this);
                let texture = resources[Config.effect[effect].imagePath || Config.defaultItemImagePath].texture;
                const button = this.portableItemButtonList.find(button => button.children.length < 2 && !button.randoming);
                if (button) {
                    button.randoming = true;
                    this.playRandomItemAnimation(button, () => {
                        button.randoming = false;
                        this.showPortableItem(effect, texture);
                    });
                }
                break;
            }
            case "PortableItem": {
                this.showPortableItem(effect, texture);
                break;
            }
            case "GoldCoin": {
                this.updateCoin(this.coin + itemConfig.value);
                MusicMgr.playSound(Config.soundPath.eatGoldCoin, undefined, this.stepSpeed);
                break;
            }
            case "Star": {
                this.updateStar(this.star + 1);
                MusicMgr.playSound(Config.soundPath.eatStar, undefined, this.stepSpeed);
                break;
            }
            case "Exp": {
                this.updateExp(this.exp + itemConfig.value);
                MusicMgr.playSound(Config.soundPath.eatExp, undefined, this.stepSpeed);
                break;
            }
            case "Thunder": {
                if (!this.isInvincible()) {
                    this.setContactFatalEdge(true);
                }
                MusicMgr.playSound(Config.effect.Thunder.sufferSound, undefined, this.stepSpeed);
                this.addEffect(this, Config.effect.Thunder.bearerSufferedEffectPath);
                break;
            }
            default: {
                const effectConfig = Config.effect[type];
                if (this.isInvincible() && effectConfig && !effectConfig.isHelpful) {
                    return;
                }
                this.eatEffect = itemConfig || {effect: type};
            }
        }
        if (itemConfig) {
            if (itemConfig.bulletTimeValue) {
                this.addBulletTime(itemConfig.bulletTimeValue);
            }
            if (this.addRewardProgressValue && itemConfig.rewardProgressValue) {
                this.addRewardProgressValue(itemConfig.rewardProgressValue);
            }
        }
    }

    createBottomMask() {
        let canvas = Utils.createLinearGradientMask(Config.designWidth, Config.maskHeight, Config.maskColorStop);
        let texture = Texture.from(canvas);
        let sprite = new Sprite(texture);
        sprite.anchor.set(0, 1);
        sprite.position.set(0, Config.designHeight);
        this.gameContainer.addChild(sprite);
    }

    createFPSText() {
        this.addChild(new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, 120, 50,)
            .endFill());
        let style = new TextStyle({
            fill: "white",
        });
        this.fpsText = new Text("FPS:0", style);
        this.fpsText.anchor.set(0, 0);
        this.addChild(this.fpsText);
    }

    createBg() {
        this.bgList = [];
        this.bgTextureList.forEach((texturePath, bgIndex) => {
            let container = new Container();
            this.cameraContainer.addChild(container);
            let texture = resources[texturePath].texture;
            let color = Utils.getTexturePointColor(texture, texture.width - 1, texture.height - 1);
            let bg = {container};
            let scale = this.bgScale[bgIndex];
            for (let i = 0; i < 2; i++) {
                let sprite = new Sprite(texture);
                container.addChild(sprite);
                sprite.scale.set(scale, scale);
                sprite.position.set(i * texture.width * scale, this.bgY[bgIndex]);
                bg[i === 0 ? "before" : "after"] = sprite;
                if (bgIndex === this.bgTextureList.length - 1) {
                    let graphics = new Graphics();
                    graphics.beginFill(color);
                    graphics.drawRect(0, 0, texture.width, Config.bgOffsetHeight);
                    graphics.endFill();
                    sprite.addChild(graphics);
                    graphics.position.set(0, texture.height);
                } else {
                    let graphics = new Graphics();
                    graphics.beginFill(color);
                    graphics.drawRect(0, 0, texture.width, Config.designHeight);
                    graphics.endFill();
                    sprite.addChild(graphics);
                    graphics.position.set(0, texture.height);
                }
            }
            this.bgList.push(bg);
        });
    }

    createPart(data, chainData) {
        let type = GameUtils.getItemType(data);
        switch (type) {
            case "Road": {
                let path = data.props.points.split(",").map((intStr, i) => {
                    let value = parseInt(intStr);
                    if (i % 2 === 0) {
                        value += data.props.x;
                    } else {
                        value += data.props.y;
                    }
                    return value;
                });
                let road = new Road(this.world, path, this.sideTexture, this.topTexture,);
                this.roadList.push(road);
                this.underBikeContianer.addChild(road.sprite);
                break;
            }
            case "Road2": {
                let path = data.props.points.split(",").map((intStr, i) => {
                    let value = parseInt(intStr);
                    if (i % 2 === 0) {
                        value += data.props.x;
                    } else {
                        value += data.props.y;
                    }
                    return value;
                });
                let road2 = new Road2(this.road2Container, this.world, path, this.sideTexture2, this.topTexture2);
                this.roadList.push(road2);
                break;
            }
            case "BigFireWall": {
                let item = new BigFireWall(data, this.world, this);
                this.underBikeContianer.addChild(item.sprite);
                this.itemList.push(item);
                break;
            }
            case "SmallFireWall": {
                let item = new SmallFireWall(data, this.world, this);
                this.underBikeContianer.addChild(item.sprite);
                this.itemList.push(item);
                break;
            }
            case "BlackBird": {
                this.itemList.push(new Bird(this, this.underBikeContianer, this.world, data));
                break;
            }
            case "Cloud": {
                this.itemList.push(new Cloud(this, this.underBikeContianer, this.world, data));
                break;
            }
            case "Spring": {
                this.itemList.push(new Spring(this, this.underBikeContianer, this.world, data));
                break;
            }
            case "GroundStab": {
                let item = new GroundStab(this.underBikeContianer, this.world, data, this);
                this.itemList.push(item);
                break;
            }
            // todo 弄一个比较智能的创建方式
            case "UpDownPlatform": {
                let item = new UpDownPlatform(this, this.underBikeContianer, this.world, data);
                this.itemList.push(item);
                this.roadList.push(item);
                break;
            }
            case "DeadLine": {
                let item = new DeadLine(this.underBikeContianer, this.world, data);
                this.itemList.push(item);
                break;
            }
            case "RollingStone": {
                this.itemList.push(new RollingStone(this, this.underBikeContianer, this.world, data));
                break;
            }
            case "FireBall": {
                let item = new FireBall(this, this.underBikeContianer, this.world, data);
                this.itemList.push(item);
                break;
            }
            case "EatableItem": {
                this.itemList.push(new EatableItem(this, this.underBikeContianer, this.world, data, chainData));
                break;
            }
            case "Sprite": {
                const sprite = Sprite.from(`myLaya/laya/assets/${data.props.skin}`);
                this.underBikeContianer.addChild(sprite);
                handleDisplayObjectWithData(sprite, data);
                this.showList.push(sprite);
                break;
            }
            case "Text": {
                const text = SceneHelper.createTextFromData(data.props);
                this.underBikeContianer.addChild(text);
                handleDisplayObjectWithData(text, data);
                this.showList.push(text);
                break;
            }
            case "Guide": {
                this.guideMgr.push(data);
                break;
            }
            case "Chain": {
                let chainData = {
                    count: 0,
                    value: 0
                };
                data.child.forEach(child => {
                    child.props.x += data.props.x;
                    child.props.y += data.props.y;
                    child.animations = data.animations;
                    this.createPart(child, chainData);
                });
                break;
            }
            default : {
                let item = new Item(data, this.world);
                this.underBikeContianer.addChild(item.sprite);
                break;
            }
        }
    }

    createBike(pp) {
        let rp = GameUtils.physicsPos2renderPos(pp);

        this.bikeOutterContainer = this.bikeContainer.addChild(new Container());
        this.bikeOutterContainer.position.set(rp.x, rp.y);

        if (RunOption.showCollider) {
            const graphics = new Graphics();
            graphics.beginFill();
            graphics.drawCircle(0, 0, Config.bikeRadius * Config.meter2pixel);
            graphics.endFill();
            this.bikeOutterContainer.addChild(graphics);
        }

        this.bikeSelfContainer = this.bikeOutterContainer.addChild(new Container());
        this.bikeSelfContainer.scale.set(Config.bikeScale, Config.bikeScale);

        this.underBikeContainer = this.bikeSelfContainer.addChild(new Container());
        this.bikeSprite = this.bikeSelfContainer.addChild(new Sprite());
        this.bikeSprite.anchor.set(0.5, 0.5);
        this.upBikeContainer = this.bikeSelfContainer.addChild(new Container());

        this.bikeAnimSprite = this.bikeSprite.addChild(new Sprite());
        this.bikeAnimSprite.anchor.set(0.5, 0.5);

        let id = this.getBikeID();
        let config = Config.bikeList.find(config => config.id === id);

        if (config.imagePath) {
            this.bikeDecorateSprite = Sprite.from(config.imagePath);
            this.bikeSprite.addChild(this.bikeDecorateSprite);
            this.bikeDecorateSprite.anchor.set(...config.anchor);
            this.bikeDecorateSprite.scale.set(...config.scale);
            this.bikeDecorateSprite.position.set(...config.position);
        }

        this.player = {};
        this.player.velocity = new Value();
        this.player.jumpForce = new Value(this.jumpForce);
        if (config.velocityPercent) {
            this.player.velocity.setBasicValue(this.bikeCommonVelocity * config.velocityPercent);
        }
        let density = Config.bikeDensity * (config.densityPercent || Config.bikeDensity);

        let bubbleTexture = resources[Config.imagePath.bubble].texture;
        this.bikeBubbleSprite = this.bikeOutterContainer.addChild(new Sprite(bubbleTexture));
        this.bikeBubbleSprite.anchor.set(0.5, 0.5);
        this.bikeBubbleSprite.visible = false;

        let arrowTexture = resources[Config.imagePath.rebornArrow].texture;

        this.bikeArrowSprite1 = this.bikeOutterContainer.addChild(new Sprite(arrowTexture));
        this.bikeArrowSprite1.position.set(0, -bubbleTexture.height / 2);

        this.bikeArrowSprite2 = this.bikeOutterContainer.addChild(new Sprite(arrowTexture));
        this.bikeArrowSprite2.rotation = Math.PI;
        this.bikeArrowSprite2.position.set(0, bubbleTexture.height / 2);

        this.bikeArrowList = [this.bikeArrowSprite1, this.bikeArrowSprite2];
        this.bikeArrowList.forEach(sprite => {
            sprite.anchor.set(0.5, 1);
            sprite.visible = false;
        });

        this.bikeBody = this.world.createDynamicBody();
        this.bikeBody.setUserData(this);
        this.bikeFixture = this.bikeBody.createFixture(Circle(Config.bikeRadius), {density: density, friction: 1,});
        this.bikeBody.setPosition(pp);
        this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, 0));

        this.bikeJumpExtraCountdown = config.bikeJumpExtraCountdown || Config.bikeJumpExtraCountdown;

        this.resetBikeStatus();

        if (RunOption.showBikeState) {
            this.stateText = this.bikeSprite.addChild(new Text("", new TextStyle({
                fill: "white",
                fontSize: 50,
            })));
        }

        this.effectList = [];
        this.durationEffectTable = {};
        this.animationList = [];

        this.buffIconContainer = this.bikeOutterContainer.addChild(new Container());
        this.buffIconContainer.y = Config.buff.containerY;
        this.buffIconTable = {};

        const animation = Config.playerEffect.follow;
        this.followAnimation = new AnimatedSprite(GameUtils.getFrames(animation.animationJsonPath, animation.animationName));
        this.followAnimation.position.set(...animation.animationPos);
        this.followAnimation.animationSpeed = animation.animationSpeed * this.stepSpeed;
        this.followAnimation.loop = true;
        this.followAnimation.play();
        this.bikeOutterContainer.addChild(this.followAnimation);
        this.animationList.push(this.followAnimation);

        this.bulletEffectList = Config.playerEffect.bulletTime.map(config => this.playPlayerEffect(config));
        this.bulletEffectList.forEach(a => a.visible = false);
    }

    resetBikeStatus() {
        this.resetJumpStatus();

        this.setContactFatalEdge(false);

        const {frames, pos} = this.getBikeCommonAnimation();
        this.bikeFrames = frames;
        this.bikeFrame = 0;
        this.bikeAnimSprite.texture = this.bikeFrames[this.bikeFrame];
        this.bikeAnimSprite.position.set(...pos);

        this.bikeAccSprite = this.bikeContainer.addChild(new Sprite());
        this.bikeAccSprite.anchor.set(0.5, 1);
        this.bikeAccSprite.visible = false;

        this.removeAllEffects();
    }

    removeAllEffects(onlyHarmful) {
        for (let type in this.effectRemainFrame) {
            if (this.effectRemainFrame.hasOwnProperty(type) && (onlyHarmful ? !Config.effect[type].isHelpful : true)) {
                delete this.effectRemainFrame[type];
                if (this.effectTable[type] && this.effectTable[type].end) {
                    this.effectTable[type].end();
                }
                this.removeBuffIcon(type);
            }
        }
        for (let type in this.durationEffectTable) {
            if (this.durationEffectTable.hasOwnProperty(type) && (onlyHarmful ? !Config.effect[type].isHelpful : true)) {
                this.durationEffectTable[type].destroy();
                delete this.durationEffectTable[type];
            }
        }
    }

    gameLoop(delta) {
        this.gameLoopFunc(delta);
    }

    play() {
        if (this.willEnterScene) {
            this.enterRewardRoad();
            this.willEnterScene = false;
        }

        if (this.eatEffect) {
            this.startEffect(this.eatEffect.effect, this.eatEffect.fixedDuration);
            delete this.eatEffect;
        }

        if (this.fpsText) {
            this.fpsText.text = `FPS：${Math.floor(App.ticker.FPS)}`;
        }

        let oldX = this.bikeBody.getPosition().x;

        const times = Config.stepTimesEachFrame * this.stepSpeed;
        for (let i = 0; i < times; i++) {
            this.world.step(this.stepDuration);
        }

        let velocity = this.bikeBody.getLinearVelocity();
        let bikePhysicsPos = this.bikeBody.getPosition();

        this.syncBikeSprite(velocity, bikePhysicsPos);

        for (let i = 0; i < this.itemList.length; i++) {
            let item = this.itemList[i];
            if (item.willDestroyed) {
                this.removeItem(item);
                i--;
            } else {
                item.update && item.update();
                let itemType = item.itemType;
                if (!item.itemShowed && this.isItemXEnterView(item)) {
                    item.itemShowed = true;
                    if (Config.item[itemType] && Config.item[itemType].appearSoundPath) {
                        MusicMgr.playSound(Config.item[itemType].appearSoundPath, undefined, this.stepSpeed);
                    }
                }
            }
        }

        if (this.syncEnemySprite) {
            this.syncEnemySprite();
        }

        this.judgeGameLose(velocity, bikePhysicsPos);

        this.judgeGameWin(bikePhysicsPos);

        if (this.startDragBikeBack) {
            this.dragBikeBack();
        }

        if (RunOption.cameraFollowEnemy && this.enemyList[0]) {
            this.targetCameraPos = this.enemyList[0].bikeBody.getPosition();
        }
        this.moveCamera();

        this.scrollBg();

        if (this.dynamicCreateRoad) {
            this.cleanPartOutOfView();
            this.dynamicCreateRoad();
            this.showDistance();
        }

        this.keepBikeMove(velocity);

        if (this.keepEnemyMove) {
            this.keepEnemyMove();
        }

        this.updateEffect();
        this.updateLittleInvincible();
        this.jumpExtraCountdown -= this.stepSpeed;
        this.updateBuffIcon();
        this.effectList.forEach(effect => effect.update());
        for (let type in this.durationEffectTable) {
            if (this.durationEffectTable.hasOwnProperty(type)) {
                this.durationEffectTable[type].update();
            }
        }

        if (Config.enableCameraAutoZoom) {
            this.autoZoomCamera();
        }

        if (this.bikeOutterContainer) {
            this.emitter.updateOwnerPos(this.bikeOutterContainer.x, this.bikeOutterContainer.y);
            this.emitter.update(1 / Config.fps);
        }

        if (this.gameStatus === "play") {
            let newX = this.bikeBody.getPosition().x;
            this.distance += (newX - oldX) * Config.meter2distance;
            this.ui.distanceText.text = Math.floor(this.distance) + "m";
            if (this.distance > this.nextBulletDistanceIndex * Config.bulletTime.addValueDistance) {
                this.addBulletTime(Config.bulletTime.addValuePerDistance);
                this.nextBulletDistanceIndex++;
            }
        }

        if (RunOption.showBikeState) {
            this.stateText.text = "";
            for (let type in this.effectRemainFrame) {
                if (this.effectRemainFrame.hasOwnProperty(type)) {
                    if (this.effectRemainFrame[type] > 0) {
                        this.stateText.text += `${type}:${Math.ceil(this.effectRemainFrame[type] / Config.fps)}\n`;
                    } else {
                        this.stateText.text += `${type}\n`;
                    }
                }
            }
        }

        if (this.gaSprite) {
            this.onGuideAnimation();
        }

        if (this.stepSpeed !== 1) {
            this.reduceBulletTimeValue();
            this.bulletTimeFilms.forEach(film => film.onFrame());
            this.bulletTimeLineMgr.update();
        }

        this.guideMgr.update();
        this.updateWarning();
    }

    pause() {
    }

    updateCoin(score) {
        this.coin = score;
        this.ui.coinText.text = this.coin;
    }

    updateStar(star) {
        this.star = star;
        for (let i = 0; i < Config.starCount; i++) {
            this.ui[`star${i}`].visible = i < this.star;
        }
        let target = this.ui[`star${this.star - 1}`];
        if (target) {
            target = target.children[0];
            const s = Config.getStarAnimation.startScale;
            const a = Config.getStarAnimation.startAlpha;
            target.scale.set(s, s);
            target.alpha = a;
            const obj = {scale: s, alpha: a};
            // todo 过程管理
            new TWEEN.Tween(obj)
                .to({scale: 1, alpha: 1}, Config.getStarAnimation.duration)
                .easing(TWEEN.Easing.Bounce.Out)
                .onUpdate(() => {
                    target.scale.set(obj.scale, obj.scale);
                    target.alpha = obj.alpha;
                })
                .start(performance.now());
        }
    }

    updateExp(exp) {
        this.exp = exp;
        this.ui.expText.text = this.exp;
    }

    syncBikeSprite(velocity, bikePhysicsPos) {
        if (this.followAnimation) {
            this.followAnimation.visible = this.contactRoadList.length !== 0
                || this.contactRoad2List.some(fixture => !fixture.getBody().getUserData().obj.isPlayerInside)
                || this.contactUpdownPlatformList.some(fixture => this.bikeBody.getPosition().y > fixture.getBody().getPosition().y);
        }
        this.contactRoad2List.forEach(fixture => fixture.getBody().getUserData().obj.isPlayerInside = false);

        let bikeRenderPos = GameUtils.physicsPos2renderPos(bikePhysicsPos);
        this.bikeOutterContainer.position.set(bikeRenderPos.x, bikeRenderPos.y);
        if (this.gameStatus === "end") {
            this.bikeSelfContainer.rotation = this.bikeBody.getAngle();
            this.bikeAccSprite.visible = false;
        } else {
            if (this.startFloat) {
                this.bikeAccSprite.visible = true;
                this.bikeAccSprite.texture = resources[Config.startImagePath.ui].textures[`cd-${Math.ceil(this.bikeFloatFrame / Config.fps)}.png`];
                this.bikeAccSprite.position.set(this.bikeOutterContainer.x, this.bikeOutterContainer.y - this.bikeSelfContainer.height / 2);
            } else {
                this.bikeAccSprite.visible = false;
            }
            if (this.jumping) {
                this.bikeSelfContainer.rotation = Utils.angle2radius(Config.bikeJumpingRotation);
                if (this.jumpingAnimationFrames) {
                    this.jumpingAnimationIndex += this.stepSpeed;
                    let frameIndex = Math.floor(this.jumpingAnimationIndex / this.jumpingAnimationInterval);
                    let frame = this.jumpingAnimationFrames[frameIndex];
                    if (frame === undefined) {
                        frame = this.jumpingAnimationFrames[this.jumpingAnimationFrames.length - 1];
                    }
                    this.bikeAnimSprite.texture = frame;
                }
            } else if (this.isSpring) {
                const animationConfig = Config.bikeList.find(bike => bike.id === this.getBikeID()).bikeSpringAnimation || Config.bikeSpringAnimation;
                const frames = GameUtils.getFrames(animationConfig.path, animationConfig.name);
                this.bikeFrame += this.stepSpeed;
                const gameFrameEachAnimationFrame = 1 / animationConfig.speed;
                const frame = Math.floor(this.bikeFrame / gameFrameEachAnimationFrame);
                this.bikeAnimSprite.texture = frames[frame] || Utils.getLast(frames);
                this.bikeAnimSprite.position.set(...animationConfig.pos);
            } else if (this.isJacking) {
            } else {
                if (Config.bikeRotateByMoveDirection) {
                    this.bikeSelfContainer.rotation = -Math.atan(velocity.y / velocity.x);
                }
                this.bikeFrame += this.stepSpeed;
                if (this.hasEffect("Sprint")) {
                    const {frames, pos} = this.getBikeSprintAnimation();
                    if (this.bikeFrame >= frames.length) {
                        this.bikeFrame = 0;
                    }
                    this.bikeAnimSprite.texture = frames[Math.floor(this.bikeFrame)];
                    this.bikeAnimSprite.position.set(...pos);
                } else {
                    let cv = this.bikeBody.getLinearVelocity().x;
                    let bv = Config.bikeBasicVelocity;
                    let framesEachFrame = Config.framesForChangeImageInBasicVelocity / (cv / bv);
                    this.bikeFrame = this.bikeFrame % (this.bikeFrames.length * framesEachFrame);
                    let frame = Math.floor(this.bikeFrame / framesEachFrame);
                    this.bikeAnimSprite.texture = this.bikeFrames[frame];
                    if (this.bikeFrames[frame] === undefined) {
                        this.bikeAnimSprite.texture = this.bikeFrames[0];
                    }
                    this.bikeAnimSprite.position.set(...this.getBikeCommonAnimation().pos);
                }
            }
        }
    }

    judgeGameLose(velocity, bikePhysicsPos) {
        let lowestRoadTopY = this.findLowestRoadTopY(-this.cameraContainer.x);
        if (this.deadLine) {
            this.deadLine.position.set(
                -this.cameraContainer.x,
                lowestRoadTopY + Config.bikeGameOverOffsetHeight * Config.meter2pixel
            );
        }
        if (this.gameStatus === "play") {
            if (bikePhysicsPos.y < GameUtils.renderY2PhysicsY(lowestRoadTopY) - Config.bikeGameOverOffsetHeight) {
                this.onDead();
            }
        }
        if (this.gameStatus === "play" && this.isContactFatalEdge) {
            this.bikeBody.setLinearVelocity(Vec2(0, 0));
            this.bikeBody.setAngularVelocity(Config.bikeGameOverAngularVelocity);
            this.bikeBody.applyLinearImpulse(Vec2(-100, 200), this.bikeBody.getPosition());
            this.onDead();
        }
    }

    judgeGameWin(bikePhysicsPos) {
        if (this.gameStatus === "play"
            && this.finalPoint
            && bikePhysicsPos.x > GameUtils.renderPos2PhysicsPos(this.finalPoint).x) {
            this.gameWin();
        }
    }

    moveCamera() {
        if (this.gameStatus === "play" || this.startAdjustBikeHeight || this.targetCameraPos) {
            let pos = this.targetCameraPos ? GameUtils.physicsPos2renderPos(this.targetCameraPos) : this.bikeOutterContainer;

            let oldCameraX = this.cameraContainer.x;
            let oldCameraY = this.cameraContainer.y;

            this.cameraContainer.x = Config.bikeLeftMargin - pos.x;

            if (!Config.forbidenCameraVerticalMove) {
                let bikeY = this.cameraContainer.y + pos.y;
                if (bikeY < Config.bikeCameraMinY) {
                    this.cameraContainer.y = Config.bikeCameraMinY - pos.y;
                } else if (bikeY > Config.bikeCameraMaxY) {
                    this.cameraContainer.y = Config.bikeCameraMaxY - pos.y;
                }
            }

            let cameraMoveX = this.cameraContainer.x - oldCameraX;
            let cameraMoveY = this.cameraContainer.y - oldCameraY;

            let lastIndex = this.bgList.length - 1;
            let lastBg = this.bgList[lastIndex];
            let bgY = this.bgY[lastIndex];
            let scale = this.bgScale[lastIndex];
            let bgOriginHeight = lastBg.before.height + (lastBg.before.children[0] ? lastBg.before.children[0].height : 0);
            let bgHeight = bgY + bgOriginHeight * scale;
            let vpd = this.verticalParallaxDepth[lastIndex] === undefined ? 1 : this.verticalParallaxDepth[lastIndex];
            if (lastBg.container.y + bgHeight - vpd * cameraMoveY < Config.designHeight - this.cameraContainer.y
                || lastBg.container.y + Config.bgMinHeightInView - vpd * cameraMoveY > Config.designHeight - this.cameraContainer.y) {
                this.bgList.forEach((bg, index) => {
                    let hpd = this.horizontalParallaxDepth[index] === undefined ? 1 : this.horizontalParallaxDepth[index];
                    bg.container.position.x -= cameraMoveX * hpd;
                    bg.container.position.y -= cameraMoveY;
                });
            } else {
                this.bgList.forEach((bg, index) => {
                    let hpd = this.horizontalParallaxDepth[index] === undefined ? 1 : this.horizontalParallaxDepth[index];
                    let vpd = this.verticalParallaxDepth[index] === undefined ? 1 : this.verticalParallaxDepth[index];
                    bg.container.position.x -= cameraMoveX * hpd;
                    bg.container.position.y -= cameraMoveY * vpd;
                });
            }
        }
    }

    findLowestRoadTopY(viewLeft) {
        let list = this.roadList;
        let viewRight = viewLeft + Config.designWidth;
        let lowestRoadTopY;
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            if (item.getRightBorderX() > viewLeft) {
                lowestRoadTopY = item.getLowestTopY();
                for (i++; i < list.length; i++) {
                    item = list[i];
                    if (item.getLeftBorderX() >= viewRight) {
                        break;
                    } else {
                        let y = item.getLowestTopY();
                        if (y > lowestRoadTopY) {
                            lowestRoadTopY = y;
                        }
                    }
                }
                break;
            }
        }
        return lowestRoadTopY;
    }

    findRoadHighestY(viewLeft) {
        let list = this.roadList;
        let viewRight = viewLeft + Config.designWidth;
        let highestPoint;
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            if (item.getRightBorderX() > viewLeft) {
                highestPoint = item.getHighestTopPoint();
                for (i++; i < list.length; i++) {
                    item = list[i];
                    if (item.getLeftBorderX() >= viewRight) {
                        break;
                    } else {
                        let point = item.getHighestTopPoint();
                        if (point.y < highestPoint.y) {
                            highestPoint = point;
                        }
                    }
                }
                break;
            }
        }
        return {highestY: highestPoint.y, distance: Config.designWidth};
    }

    findAdjustHeight(viewLeft) {
        let list = this.roadList;
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            if (item.getRightBorderX() > viewLeft) {
                if (item.getLeftBorderX() <= viewLeft) {
                    return item.getTopPosInTargetX(viewLeft);
                } else {
                    return item.getLeftTopPoint();
                }
            }
        }
    }

    scrollBg() {
        this.bgList.forEach((item, index) => {
            if (item.container.x + item.before.x + item.before.width * this.bgScale[index] < -this.cameraContainer.x) {
                item.before.x = item.after.x + item.after.width * this.bgScale[index];
                let temp = item.before;
                item.before = item.after;
                item.after = temp;
            }
        });
    }

    keepBikeMove(velocity) {
        if (this.gameStatus === "play") {
            if (this.hasEffect("Sprint")) {
                const {highestY, distance} = this.findRoadHighestY(this.bikeOutterContainer.x);
                const angle = Math.atan((this.bikeOutterContainer.y - (highestY - Config.bikeSprintRadius * Config.meter2pixel)) / distance);
                let v = Config.effect.Sprint.velocity * Config.pixel2meter;
                const vy = Math.tan(angle) * v;
                this.bikeBody.setLinearVelocity(Vec2(v, vy));
            } else if (this.startFloat) {
                if (this.bikeFloatFrame === 0) {
                    this.startFloat = false;
                    this.stopSounds();
                    MusicMgr.playSound(Config.soundPath.bubbleDestroy);
                    this.bikeBubbleSprite.visible = false;
                } else {
                    this.bikeFloatFrame--;
                }
                this.bikeBody.applyForceToCenter(Vec2(0, -this.gravity * this.bikeBody.getMass()));
                this.bikeBody.setLinearVelocity(Vec2(Config.rebornFloatVelocity, 0));
            } else {
                this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, velocity.y));
            }
        }
    }

    initGameContent() {

    }

    initEnvironment() {

    }

    autoZoomCamera() {
        if (this.gameStatus === "play") {
            let baseX = Config.bikeLeftMargin;
            let baseY = Config.designHeight / 2;
            let stepScale = Config.cameraAutoZoomScaleSpeed;
            let vx = this.bikeBody.getLinearVelocity().x;
            let targetScale = vx === this.player.velocity.basicValue ? Config.cameraAutoZoomCommonScale : 1;
            let curScale = this.autoZoomContainer.scale.x;
            let diff = targetScale - curScale;
            let scale;
            if (diff < 0) {
                scale = curScale - stepScale;
                if (scale < targetScale) {
                    scale = targetScale;
                }
            } else if (diff === 0) {
                scale = curScale;
            } else {
                scale = curScale + stepScale;
                if (scale > targetScale) {
                    scale = targetScale;
                }
            }
            this.autoZoomContainer.scale.set(scale, scale);
            this.autoZoomContainer.position.set(baseX - baseX * scale, baseY - baseY * scale);
        }
    }

    adjustInitCameraBg() {
        this.cameraContainer.x = Config.bikeLeftMargin - this.bikeOutterContainer.x;

        let bikeY = this.cameraContainer.y + this.bikeOutterContainer.y;
        if (bikeY < Config.bikeCameraMinY) {
            this.cameraContainer.y = Config.bikeCameraMinY - this.bikeOutterContainer.y;
        } else if (bikeY > Config.bikeCameraMaxY) {
            this.cameraContainer.y = Config.bikeCameraMaxY - this.bikeOutterContainer.y;
        }

        this.bgList.forEach((bg) => {
            bg.container.position.x = -this.cameraContainer.y;
            bg.container.position.y = -this.cameraContainer.y;
        });
    }

    onClickPortableItem(i) {
        if (this.gameStatus === "play") {
            let button = this.portableItemButtonList[i];
            if (button.children.length === 2 && !button.randoming && !button.destroying) {
                if (this.hasEffect("Seal")) {
                    return App.showNotice("Your item are sealed now.");
                }
                let effect = button.children[1].effect;
                let config = Config.effect[effect];
                if (effect === "BananaPeel") {
                    this.throwBananaPeel(this);
                } else {
                    if (config.isHelpful) {
                        this.onAteItem(effect);
                    } else {
                        let others = this.enemyList;
                        let targets;
                        switch (config.targetType) {
                            case 1: {
                                let target = this.getFormerOne(this);
                                if (target) {
                                    targets = [target];
                                } else {
                                    targets = [];
                                }
                                break;
                            }
                            case 2: {
                                targets = others;
                                break;
                            }
                            case 0:
                            default: {
                                targets = [Utils.randomChoose(others)];
                            }
                        }
                        if (targets.length === 0) {
                            EventMgr.dispatchEvent("UseItem", this, {getName: () => App.getText("Air")}, effect);
                        } else {
                            targets.forEach(other => {
                                other.onAteItem(effect);
                                EventMgr.dispatchEvent("UseItem", this, other, effect);
                            });
                        }
                    }
                }
                if (config.userUsedEffectPath) {
                    let effect = new BikeEffect(this, config.userUsedEffectPath, () => {
                        Utils.removeItemFromArray(this.effectList, effect);
                        effect.destroy();
                    }, this);
                    this.effectList.push(effect);
                }
                if (config.useSound) {
                    MusicMgr.playSound(config.useSound, undefined, this.stepSpeed);
                }

                button.destroying = true;
                const target = button.children[1];
                const obj = {alpha: 1, scale: 1};
                // todo 过程管理
                new TWEEN.Tween(obj)
                    .to({alpha: 0, scale: Config.useItemAnimation.scale}, Config.useItemAnimation.duration)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onUpdate(() => {
                        target.alpha = obj.alpha;
                        target.scale.set(obj.scale, obj.scale);
                    })
                    .onComplete(() => {
                        target.destroy();
                        button.destroying = false;
                    })
                    .start(performance.now());
            }
        }
    }

    showPortableItem(effect, texture) {
        this.portableItemButtonList.some(button => {
            if (button.children.length === 1) {
                let sprite = new Sprite(texture);
                button.addChild(sprite);
                sprite.anchor.set(0.5, 0.5);
                sprite.position.set(button.mywidth / 2, button.myheight / 2);
                sprite.effect = effect;
                return true;
            }
        });
    }

    onDead() {
        this.leaveInvincible();
        this.leaveBulletTime();
        MusicMgr.playSound(Config.soundPath.die);
        this.gameStatus = "end";
        let pos = this.bikeBody.getPosition();
        let rp = this.findAdjustHeight(this.bikeOutterContainer.x);
        let pp = GameUtils.renderPos2PhysicsPos(rp);
        this.dragBackPos = {x: pos.x, y: pp.y + Config.bikeRadius - Config.rebornPosOffsetHeight * Config.pixel2meter};
        this.deadPos = {x: pos.x, y: pos.y};
        this.targetCameraPos = {x: pos.x, y: pos.y};
        this.moveCameraVelocity = {
            x: (this.dragBackPos.x - this.targetCameraPos.x) / Config.rebornDragDuration / Config.fps,
            y: (this.dragBackPos.y - this.targetCameraPos.y) / Config.rebornDragDuration / Config.fps
        };
        this.removeAllEffects();
    }

    dragBikeBack() {
        let {x, y, final} = GameUtils.moveToTargetPos(
            this.bikeBody.getPosition(),
            this.dragBackPos,
            this.rebornDragVelocity
        );
        this.bikeBody.setPosition(Vec2(x, y));
        this.targetCameraPos.x += this.moveCameraVelocity.x;
        this.targetCameraPos.y += this.moveCameraVelocity.y;
        if (final) {
            this.onDragBackEnded();
        }
    }

    onDragBackEnded() {
        this.targetCameraPos = undefined;
        this.startDragBikeBack = false;
        this.startAdjustBikeHeight = true;
        this.bikeArrowList.forEach(sprite => sprite.visible = true);
        this.ui.rebornPanel.visible = true;
    }

    onPointerMove(event) {
        if (this.startAdjustBikeHeight && this.startY !== undefined) {
            let moveY = event.data.global.y - this.startY;
            this.startY = event.data.global.y;
            let curPos = this.bikeBody.getPosition();
            let newY = this.bikeOutterContainer.y + moveY;
            let rect = {
                x: -this.cameraContainer.x,
                y: GameUtils.physicsPos2renderPos(this.dragBackPos).y - Config.designHeight - Config.rebornPosOffsetHeight,
                width: Config.designWidth,
                height: Config.designHeight
            };
            if (Utils.isPointInRect({x: -this.cameraContainer.x, y: newY}, rect)) {
                this.bikeBody.setPosition(Vec2(curPos.x, curPos.y + -moveY * Config.pixel2meter));
            }
        }
    }

    onPointerUp() {
        if (this.startAdjustBikeHeight && this.startY !== undefined) {
            this.startY = undefined;
        }
    }

    onClickConfirmButton() {
        this.ui.rebornPanel.visible = false;
        this.startAdjustBikeHeight = false;
        this.gameStatus = "play";
        this.bikeBody.setDynamic();
        this.resetBikeStatus();
        this.startFloat = true;
        this.bikeArrowList.forEach(sprite => sprite.visible = false);
        this.bikeFloatFrame = Config.rebornFloatFrame;
        MusicMgr.playSound(Config.soundPath.rebornButton);
        this.stopSounds();
        this.bubbleFloatSound = MusicMgr.playLoopSound(Config.soundPath.bubbleFloat);
    }

    settle() {
        let coin = this.coin * GameUtils.getBikeConfig("coinPercent");
        let distance = this.distance * GameUtils.getBikeConfig("distancePercent");
        if (this.doubleReward) {
            coin *= 2;
            distance *= 2;
        }
        distance = Math.floor(distance);
        DataMgr.add(DataMgr.coin, Math.floor(coin));
        let newDistance = DataMgr.add(DataMgr.distance, distance);
        Config.endlessMode.sceneList.forEach(item => {
            if (newDistance >= item.unlockDistance) {
                let list = DataMgr.get(DataMgr.unlockEndlessSceneIDList, []);
                if (list.indexOf(item.id) === -1) {
                    list.push(item.id);
                    DataMgr.set(DataMgr.unlockEndlessSceneIDList, list);
                    item.unlockInfo && EventMgr.dispatchEvent("UnlockSystem", item.unlockInfo);
                }
            }
        });
        DataMgr.add(DataMgr.rankDistance, distance);
        DataMgr.refreshPreparationRewards(this.rewardType);
        this.pauseGame();
    }

    isItemOutSideOfViewLeft(item) {
        if (item.getRightBorderX) {
            return item.getRightBorderX() < -this.cameraContainer.x;
        }
    }

    isXEnterView(x) {
        return x < -this.cameraContainer.x + Config.designWidth;
    }

    isItemXEnterView(item) {
        if (item.getLeftBorderX) {
            return this.isXEnterView(item.getLeftBorderX());
        }
    }

    isItemXInView(item) {
        return item.getLeftBorderX() < -this.cameraContainer.x + Config.designWidth && item.getRightBorderX() > -this.cameraContainer.x;
    }

    resetJumpStatus() {
        this.jumping = false;
        this.isSpring = false;
        this.isJacking = false;
        this.jumpCount = 0;
    }

    startEffect(type, fixedDuration) {
        if (this.gameStatus === "end") {
            return;
        }
        if (this.effectRemainFrame[type]) {
            if (this.effectTable[type] && this.effectTable[type].cover) {
                this.effectTable[type].cover();
            }
        } else {
            if (this.effectTable[type] && this.effectTable[type].start) {
                this.effectTable[type].start();
            }
            let config = Config.effect[type];
            if (config.bearerBuffEffectPath) {
                this.durationEffectTable[type] = new BikeEffect(this, config.bearerBuffEffectPath, undefined, this);
            }
            if (config.bearerSufferedEffectPath) {
                let effect = new BikeEffect(this, config.bearerSufferedEffectPath, () => {
                    effect.destroy();
                    Utils.removeItemFromArray(this.effectList, effect);
                }, this);
                this.effectList.push(effect);
            }
            if (config.buffIconImagePath) {
                this.addBuffIcon(type);
            }
            if (config.sufferSound) {
                MusicMgr.playSound(config.sufferSound, undefined, this.stepSpeed);
            }
        }
        const duration = fixedDuration || DataMgr.getEffectDuration(this.getBikeID(), type, this.onlyBaseDuration);
        this.effectRemainFrame[type] = duration * Config.fps;
    }

    updateEffect() {
        for (let type in this.effectRemainFrame) {
            if (this.effectRemainFrame.hasOwnProperty(type)) {
                this.effectRemainFrame[type] -= this.stepSpeed;
                if (this.effectRemainFrame[type] <= 0) {
                    delete this.effectRemainFrame[type];
                    if (this.effectTable[type] && this.effectTable[type].end) {
                        this.effectTable[type].end();
                    }
                    this.removeBuffIcon(type);
                    if (this.durationEffectTable[type]) {
                        this.durationEffectTable[type].destroy();
                        delete this.durationEffectTable[type];
                    }
                } else {
                    if (this.effectTable[type] && this.effectTable[type].update) {
                        this.effectTable[type].update();
                    }
                }
            }
        }
    }

    initEffectTable() {
        this.effectTable = {
            Decelerate: {
                start: () => {
                    this.player.velocity.increaseValueByRate(Config.effect.Decelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
                end: () => {
                    this.player.velocity.increaseValueByRate(-Config.effect.Decelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
            },
            Accelerate: {
                start: () => {
                    this.player.velocity.increaseValueByRate(Config.effect.Accelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
                end: () => {
                    this.player.velocity.increaseValueByRate(-Config.effect.Accelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.player.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
            },
            WeakenJump: {
                start: () => {
                    this.player.jumpForce.increaseValueByRate(Config.effect.WeakenJump.rate);
                },
                end: () => {
                    this.player.jumpForce.increaseValueByRate(-Config.effect.WeakenJump.rate);
                },
            },
            PowerJump: {
                start: () => {
                    this.player.jumpForce.increaseValueByRate(Config.effect.PowerJump.rate);
                },
                end: () => {
                    this.player.jumpForce.increaseValueByRate(-Config.effect.PowerJump.rate);
                },
            },
            BlockSight: {
                start: () => {
                    this.ui.blockSightSprite.visible = true;
                },
                end: () => {
                    this.ui.blockSightSprite.visible = false;
                },
            },
            SpiderWeb: {
                start: () => {
                    this.spiderWebRemainBreakTimes = Config.effect.SpiderWeb.breakTimes;
                },
                cover: () => {
                    this.spiderWebRemainBreakTimes = Config.effect.SpiderWeb.breakTimes;
                },
                end: () => {
                    this.spiderWebRemainBreakTimes = 0;
                },
            },
            Seal: {
                start: () => {
                    this.ui.sealMask.visible = true;
                },
                end: () => {
                    this.ui.sealMask.visible = false;
                },
            },
            Invincible: {
                start: () => {
                    this.leaveInvincible();
                    this.setBikeScale(Config.effect.Invincible.scale);
                    this.removeAllEffects(true);
                },
                end: () => {
                    this.setBikeScale(1);
                    this.bikeSprite.alpha = 1;
                    this.enterInvincible(Config.effect.Invincible.endInvincibleDuration);
                },
                update: () => {
                    const light = Math.floor(this.effectRemainFrame.Invincible / Config.effect.Invincible.twinkleInterval) % 2 === 0;
                    this.bikeSprite.alpha = light ? 1 : Config.effect.Invincible.twinkleAlpha;
                },
            },
            Sprint: {
                start: () => {
                    this.leaveInvincible();
                    this.removeAllEffects(true);
                    this.setBikeScale(2, true);
                    this.bikeBody.setKinematic();
                    this.resetJumpStatus();
                    this.bikeFrame = -1;
                },
                end: () => {
                    this.setBikeScale(1, true);
                    this.bikeBody.setDynamic();
                    this.bikeFrame = -1;
                    this.enterInvincible(Config.effect.Sprint.endInvincibleDuration);
                }
            },
        };
    }

    setBikeScale(scale, onlyChangeFixture) {
        let id = this.getBikeID();
        let config = Config.bikeList.find(config => config.id === id);
        let density = Config.bikeDensity * (config.densityPercent || Config.bikeDensity) / scale / scale;
        let radius = Config.bikeRadius * scale;
        if (!onlyChangeFixture) {
            this.bikeSprite.scale.set(scale, scale);
        }
        if (this.bikeFixture) {
            this.bikeBody.destroyFixture(this.bikeFixture);
        }
        this.bikeFixture = this.bikeBody.createFixture(Circle(radius), {density: density, friction: 1});
    }

    hasEffect(type) {
        return this.effectRemainFrame[type] !== undefined;
    }

    removeItem(item) {
        let index = this.itemList.indexOf(item);
        if (index !== -1) {
            item.destroy();
            this.itemList.splice(index, 1);
        }
    }

    onUseItem(user, receiver, effect) {
        let itemHeight = Config.itemUseHistory.lineHeight;
        let info = this.createUseItemInfo(user, receiver, effect);
        info.y = this.ui.itemUseHistoryPanel.children.length * itemHeight;
        this.ui.itemUseHistoryPanel.addChild(info);
        this.itemUseHistoryDisappearTimer.push(setTimeout(() => {
            this.ui.itemUseHistoryPanel.removeChildAt(0);
            for (let i = 0; i < this.ui.itemUseHistoryPanel.children.length; i++) {
                let child = this.ui.itemUseHistoryPanel.children[0];
                child.y = i * itemHeight;
            }
        }, Config.itemUseHistory.duration * 1000));
    }

    getName() {
        return this.playerName;
    }

    getFormerOne(player) {
        let players = [this].concat(this.enemyList);
        players.sort((a, b) => b.getBikePhysicalPosition().x - a.getBikePhysicalPosition().x);
        return players[players.indexOf(player) - 1];
    }

    getBikePhysicalPosition() {
        return this.bikeBody.getPosition();
    }

    getRank(player) {
        let players = [this].concat(this.enemyList);
        players.sort((a, b) => b.getBikePhysicalPosition().x - a.getBikePhysicalPosition().x);
        return players.indexOf(player) + 1;
    }

    throwBananaPeel(thrower) {
        this.itemList.push(new BananaPeel(this, this.underBikeContianer, this.world, thrower));
    }

    isPlayer() {
        return true;
    }

    addBikeChild(displayObject, index) {
        if (index === 0) {
            this.underBikeContainer.addChild(displayObject);
        } else {
            this.upBikeContainer.addChild(displayObject);
        }
        return displayObject;
    }

    addBuffIcon(type) {
        if (Config.effect[type].buffIconImagePath && this.buffIconTable[type] === undefined) {
            let sprite = this.buffIconContainer.addChild(new Sprite());
            sprite.anchor.set(0.5, 0);
            sprite.texture = resources[Config.effect[type].buffIconImagePath].texture;
            sprite.scale.set(Config.buff.iconScale, Config.buff.iconScale);
            let seconds = Math.ceil(this.effectRemainFrame[type] / Config.fps);
            let text = sprite.addChild(new Text(seconds, new TextStyle(Config.buff.text)));
            text.anchor.set(0.5, 0.5);
            text.position.set(...Config.buff.textPosition);
            this.buffIconTable[type] = sprite;
            this.sortBuffIcon();
        }
    }

    removeBuffIcon(type) {
        if (this.buffIconTable[type]) {
            this.buffIconTable[type].destroy();
            delete this.buffIconTable[type];
            this.sortBuffIcon();
        }
    }

    sortBuffIcon() {
        let index = -1;
        Utils.keys(Config.effect).forEach(type => {
            if (this.buffIconTable[type]) {
                index++;
                this.buffIconTable[type].x = index * Config.buff.iconInterval;
            }
        });
        this.buffIconContainer.x = -index * Config.buff.iconInterval / 2;
    }

    updateBuffIcon() {
        for (let type in this.buffIconTable) {
            if (this.buffIconTable.hasOwnProperty(type)) {
                if (this.effectRemainFrame[type] === Infinity) {
                    this.buffIconTable[type].getChildAt(0).text = "";
                } else {
                    this.buffIconTable[type].getChildAt(0).text = Math.ceil(this.effectRemainFrame[type] / Config.fps);
                }
            }
        }
    }

    pauseGame() {
        this.gameLoopFunc = this.pause.bind(this);
        this.animationList.forEach(a => a.stop());
    }

    resumeGame() {
        this.gameLoopFunc = this.play.bind(this);
        this.animationList.forEach(a => a.play());
    }

    getSpriteGameBounds(sprite) {
        // todo 不知道有没有更严谨的算法
        let bounds = sprite.getBounds();
        let {scaleX, scaleY} = this.getParentScale(sprite);
        ["x", "width"].forEach(key => bounds[key] /= scaleX);
        ["y", "height"].forEach(key => bounds[key] /= scaleY);
        bounds.x -= this.cameraContainer.x;
        bounds.y -= this.cameraContainer.y;
        return bounds;
    }

    getParentScale(item) {
        let scaleX = 1, scaleY = 1;
        while (item.parent) {
            scaleX *= item.parent.scale.x;
            scaleY *= item.parent.scale.y;
            item = item.parent;
        }
        return {scaleX, scaleY};
    }

    getHead() {
        return Config.defaultEnemyHeadImagePath;
    }

    getPlayerRankList() {
        let players = [this].concat(this.enemyList);
        players.sort((a, b) => b.getBikePhysicalPosition().x - a.getBikePhysicalPosition().x);
        return players;
    }

    setContactFatalEdge(flag) {
        if (!this.startFloat) {
            this.isContactFatalEdge = flag;
        }
    }

    addEffect(bike, path) {
        let effectContainer = this.bikeContainer.addChild(new Container());
        effectContainer.position.set(bike.bikeOutterContainer.x, bike.bikeOutterContainer.y);
        let effect = new BaseEffect(path, () => {
            effect.destroy();
            effectContainer.destroy();
            Utils.removeItemFromArray(this.effectList, effect);
        }, this);
        effectContainer.addChild(effect.sprite);
        this.effectList.push(effect);
    }

    createUseItemInfo(user, sufferer, effect) {
        let container = new Container();
        let lastX = 0;
        let createText = (string, color) => {
            let text = new Text(string, new TextStyle({
                fill: color,
                fontSize: Config.itemUseHistory.fontSize,
                stroke: Config.itemUseHistory.stroke,
                strokeThickness: Config.itemUseHistory.strokeThickness,
            }));
            text.anchor.set(0, 0.5);
            text.x = lastX;
            container.addChild(text);
            lastX += text.width + Config.itemUseHistory.partSpace;
        };
        createText(`【${user.getName()}】`, user === this ? Config.itemUseHistory.selfNameColor : Config.itemUseHistory.enemyNameColor);
        createText(App.getText("对"), Config.itemUseHistory.commonTextColor);
        createText(`【${sufferer.getName()}】`, sufferer === this ? Config.itemUseHistory.selfNameColor : Config.itemUseHistory.enemyNameColor);
        createText(App.getText("使用了"), Config.itemUseHistory.commonTextColor);
        let icon = container.addChild(Sprite.from(Config.effect[effect].imagePath));
        icon.anchor.set(0, 0.5);
        icon.scale.set(Config.itemUseHistory.iconSale, Config.itemUseHistory.iconSale);
        icon.x = lastX;
        return container;
    }

    showGuideAnimation() {
        this.gaSprite = this.addChild(new Sprite());
        this.gaSprite.anchor.set(0.5, 0.5);
        this.gaSprite.x = App.sceneWidth / 2;
        this.gaStep = -1;
        this.gaSpriteTextureList = [
            Config.imagePath.start3,
            Config.imagePath.start2,
            Config.imagePath.start1,
        ];
        this.startAction();
    }

    startAction() {
        this.guideActionList = [
            () => this.actionCallback(() => {
                this.ui.guidePanel.visible = true;
                App.showMask();
            }),
            () => this.actionMove(),
            () => this.actionCallback(() => MusicMgr.playSound(Config.soundPath.guideCountDown)),
            () => this.actionDelay(),
            () => this.actionMove(),
            () => this.actionCallback(() => MusicMgr.playSound(Config.soundPath.guideCountDown)),
            () => this.actionDelay(),
            () => this.actionMove(),
            () => this.actionCallback(() => MusicMgr.playSound(Config.soundPath.guideCountDown)),
            () => this.actionDelay(),
            () => this.actionScale(),
            () => this.actionCallback(() => MusicMgr.playSound(Config.soundPath.guideStartGo, () => {
                MusicMgr.playBGM(this.bgmPath, true);
            })),
            () => this.actionDelay(),
            () => this.actionFadeout(),
            () => this.actionCallback(() => {
                this.gaSprite.destroy();
                this.gaSprite = undefined;
                this.ui.guidePanel.visible = false;
                App.hideMask();
            }),
        ];
        this.onActionEnded();
    }

    onGuideAnimation() {
        switch (this.action) {
            case "move": {
                this.onMoveAction();
                break;
            }
            case "scale": {
                this.onScaleAction();
                break;
            }
            case "delay": {
                this.onDelayAction();
                break;
            }
            case "fadeout": {
                this.onFadeoutAction();
                break;
            }
        }
    }

    onMoveAction() {
        this.gaSprite.y += this.gaVelocity;
        if (this.gaSprite.y >= App.sceneHeight / 2) {
            this.onActionEnded();
        }
    }

    onScaleAction() {
        this.gaSprite.scale.x -= this.gaVelocity;
        this.gaSprite.scale.y -= this.gaVelocity;
        if (this.gaSprite.scale.x <= 1) {
            this.onActionEnded();
        }
    }

    onDelayAction() {
        this.delay++;
        if (this.delay > Config.guideAction.delayFrame) {
            this.onActionEnded();
        }
    }

    onFadeoutAction() {
        this.gaSprite.alpha -= this.gaVelocity;
        if (this.gaSprite.alpha <= 0) {
            this.onActionEnded();
        }
    }

    onActionEnded() {
        let action = this.guideActionList.shift();
        if (action) {
            action();
        }
    }

    actionMove() {
        this.action = "move";
        this.gaStep++;
        this.gaSprite.texture = Texture.from(this.gaSpriteTextureList[this.gaStep]);
        this.gaSprite.y = -this.gaSprite.height / 2;
        this.gaVelocity = App.sceneHeight / 2 / (Config.fps - Config.guideAction.delayFrame);
    }

    actionScale() {
        this.action = "scale";
        this.gaSprite.texture = Texture.from(Config.imagePath.startGo);
        this.gaSprite.scale.set(Config.guideAction.startScale, Config.guideAction.startScale);
        this.gaVelocity = (Config.guideAction.startScale - 1) / (Config.fps - Config.guideAction.delayFrame);
    }

    actionFadeout() {
        this.action = "fadeout";
        this.gaVelocity = 1 / (Config.fps - Config.guideAction.delayFrame);
    }

    actionDelay() {
        this.action = "delay";
        this.delay = 0;
    }

    actionCallback(handler) {
        handler();
        this.onActionEnded();
    }

    isInvincible() {
        return this.hasEffect("Invincible") || this.hasEffect("Sprint") || this.littleInvincible;
    }

    isBike(gameObject) {
        return gameObject === this || this.enemyList.indexOf(gameObject) !== -1;
    }

    getBikeCommonAnimation() {
        const id = this.getBikeID();
        const config = Config.bikeList.find(bike => bike.id === id);
        return {
            frames: GameUtils.getFrames(config.bikeCommonAnimation || Config.bikeCommonAnimation, "bike"),
            pos: config.bikeCommonAnimationPos || Config.bikeCommonAnimationPos
        };
    }

    getBikeSprintAnimation() {
        const id = this.getBikeID();
        const config = Config.bikeList.find(bike => bike.id === id);
        return {
            frames: GameUtils.getFrames(config.bikeSprintAnimation || Config.bikeSprintAnimation, "sprint"),
            pos: config.bikeSprintAnimationPos || Config.bikeSprintAnimationPos
        };
    }

    getBikeJumpAnimation(jumpCount) {
        const id = this.getBikeID();
        const config = Config.bikeList.find(bike => bike.id === id);
        const jumpAnimations = config.bikeJumpingAnimation || Config.bikeJumpingAnimation;
        let jumpAnimation = jumpAnimations[jumpCount];
        if (jumpAnimation === undefined) {
            let lastKey;
            for (let count in jumpAnimations) {
                lastKey = count;
            }
            if (lastKey && jumpCount > lastKey) {
                jumpAnimation = jumpAnimations[lastKey];
            }
        }
        return jumpAnimation;
    }

    initBulletTime() {
        this.createBulletTimeFullEffect();
        this.onClick(this.ui.bulletTimeBtn, this.onClickBulletTimeBtn.bind(this), true);
        this.bulletTimeMask = new Graphics();
        this.ui.bulletTimeEnough.mask = this.bulletTimeMask;
        this.ui.bulletTimeLack.mask = this.bulletTimeMask;
        this.updateBulletTime(0);
        this.createBulletTimeFilm();
        this.bulletTimeLineMgr = new BulletTimeLineMgr(this);
    }

    createBulletTimeFilm() {
        this.bulletTimeFilms = [];
        for (let i = 0; i < 2; i++) {
            const film = new Scroll(Config.bulletTime.filmImagePath, App.sceneWidth, Config.bulletTime.filmImageMoveVelocity);
            this.bulletTimeFilms.push(film);
            this.addChildAt(film.container, 2);
        }
        this.bulletTimeFilms[0].container.y = -this.bulletTimeFilms[0].before.height;
        this.bulletTimeFilms[1].container.y = App.sceneHeight;
    }

    createBulletTimeFullEffect() {
        const texture1 = Texture.from("myLaya/laya/assets/images/bullet-time-full-effect-1.png");
        const texture2 = Texture.from("myLaya/laya/assets/images/bullet-time-full-effect-2.png");
        this.bulletTimeFullEffect = new AnimatedSprite([texture1, texture2]);
        this.bulletTimeFullEffect.anchor.set(0.5, 0.5);
        this.bulletTimeFullEffect.position.set(102, 28);
        this.ui.bulletTimeBtn.addChild(this.bulletTimeFullEffect);
        this.bulletTimeFullEffect.play();
    }

    onClickBulletTimeBtn() {
        if (this.stepSpeed === 1) {
            if (this.bulletTime >= Config.bulletTime.usableMinValue) {
                this.updateBulletTime(this.bulletTime - Config.bulletTime.startUpCostValue);
                this.enterBulletTime();
            }
        } else {
            this.leaveBulletTime();
            this.enterInvincible(Config.bulletTime.endInvincibleDuration);
        }
    }

    getPlayerLevel() {
        return DataMgr.getPlayerLevel().level;
    }

    updateBulletTime(time) {
        const maxValue = DataMgr.getBulletTimeMaxValue(this.getPlayerLevel());
        if (time >= maxValue) {
            time = maxValue;
        } else if (time < 0) {
            time = 0;
        }
        if (time === this.bulletTime) {
            return;
        }
        this.bulletTime = time;
        if (this.bulletTime >= Config.bulletTime.usableMinValue) {
            this.ui.bulletTimeLack.visible = false;
            this.ui.bulletTimeEnough.visible = true;
        } else {
            this.ui.bulletTimeEnough.visible = false;
            this.ui.bulletTimeLack.visible = true;
        }
        const scale = this.ui.bulletTimeBtn.scale.x;
        this.bulletTimeMask.clear();
        this.bulletTimeMask.lineStyle(40 * scale);
        const bounds = this.ui.bulletTimeBtn.getBounds();
        const percent = this.bulletTime / maxValue;
        const base = Math.PI / 2 * 3;
        this.bulletTimeMask.arc(
            198 / 2 * scale + bounds.x,
            204 / 2 * scale + bounds.y,
            70 * scale,
            base - Math.PI * 2 * percent,
            base
        );
        this.ui.bulletTimeValue.text = Math.floor(this.bulletTime);
        this.bulletTimeFullEffect.visible = percent === 1;
    }

    reduceBulletTimeValue() {
        this.updateBulletTime(this.bulletTime - Config.bulletTime.reduceValuePerSecond / Config.fps);
        if (this.bulletTime <= 0) {
            this.leaveBulletTime();
            this.enterInvincible(Config.bulletTime.endInvincibleDuration);
        }
    }

    resetBulletTime() {
        this.bulletTimeFilms.forEach((film, index) => {
            if (index === 0) {
                film.container.y = -film.before.height;
            } else {
                film.container.y = App.sceneHeight;
            }
        });
        this.nextBulletDistanceIndex = 1;
        this.updateBulletTime(0);
    }

    addBulletTime(value) {
        if (value) {
            if (this.stepSpeed === 1 || Config.bulletTime.addValueInBulletTime) {
                this.updateBulletTime(this.bulletTime + value);
            }
        }
    }

    enterBulletTime() {
        if (this.stepSpeed !== 1) {
            return;
        }
        // todo 速度应该是剔除了 加速减速道具
        const velocity = this.player.velocity.basicValue;
        let percent = Config.bulletTimeTargetVelocity / velocity;
        let base = 1 / Config.stepTimesEachFrame;
        if (percent > 1) {
            percent = 1;
        } else if (percent < base) {
            percent = base;
        } else {
            percent = Math.floor(percent / base) * base;
        }
        this.stepSpeed = percent;
        if (MusicMgr.bgmSource) {
            MusicMgr.bgmSource.playbackRate.value = this.stepSpeed;
        }
        this.itemList.forEach(item => item.changeSpeed && item.changeSpeed(this.stepSpeed));
        this.playBulletTimeFilm(true);
        this.bulletTimeLineMgr.enterBulletTime();
        this.animationList.forEach(animation => {
            animation.animationSpeed *= this.stepSpeed;
        });
        this.bulletEffectList.forEach(effect => effect.visible = true);
    }

    leaveBulletTime() {
        if (this.stepSpeed === 1) {
            return;
        }
        this.animationList.forEach(animation => {
            animation.animationSpeed /= this.stepSpeed;
        });
        this.stepSpeed = 1;
        if (MusicMgr.bgmSource) {
            MusicMgr.bgmSource.playbackRate.value = this.stepSpeed;
        }
        this.itemList.forEach(item => item.changeSpeed && item.changeSpeed(this.stepSpeed));
        this.playBulletTimeFilm(false);
        this.bulletTimeLineMgr.leaveBulletTime();
        this.bulletEffectList.forEach(effect => effect.visible = false);
    }

    playBulletTimeFilm(enter) {
        if (this.filmAnimation) {
            this.filmAnimation.stop();
        }
        let start, end;
        if (enter) {
            start = 0;
            end = this.bulletTimeFilms[0].before.height;
        } else {
            end = 0;
            start = this.bulletTimeFilms[0].before.height;
        }
        this.bulletTimeFilms.forEach((film, index) => {
            if (index === 0) {
                film.container.y = -film.before.height + start;
            } else {
                film.container.y = App.sceneHeight - start;
            }
        });
        const obj = {y: start};
        this.filmAnimation = new TWEEN.Tween(obj)
            .to({y: end}, Config.bulletTime.filmImageAppearDuration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.bulletTimeFilms.forEach((film, index) => {
                    if (index === 0) {
                        film.container.y = -film.before.height + obj.y;
                    } else {
                        film.container.y = App.sceneHeight - obj.y;
                    }
                });
            })
            .start(performance.now());
    }

    spring(velocity) {
        this.resetJumpStatus();
        this.isSpring = true;
        this.bikeFrame = 0;
        this.bikeBody.setLinearVelocity(Vec2(this.bikeBody.getLinearVelocity().x, velocity));
    }

    jack(velocity) {
        this.resetJumpStatus();
        this.isJacking = true;
        this.bikeFrame = 0;
        this.bikeBody.setLinearVelocity(Vec2(this.bikeBody.getLinearVelocity().x, velocity));
    }

    playRandomItemAnimation(button, callback) {
        let textures = [];
        for (let i = 0; i < Config.randomItemAnimation.times; i++) {
            const list = Utils.keys(this.getItemRandomTableList(this))
                .map(effect => Texture.from(Config.effect[effect].imagePath));
            textures = textures.concat(Utils.randomList(list));
        }
        const sprite = new AnimatedSprite(textures);
        button.addChild(sprite);
        sprite.anchor.set(0.5, 0.5);
        sprite.position.set(button.mywidth / 2, button.myheight / 2);
        sprite.animationSpeed = Config.randomItemAnimation.speed;
        sprite.loop = false;
        sprite.play();
        sprite.onComplete = () => {
            sprite.destroy();
            callback();
        };
    }

    randomEffect(player) {
        let itemRandomTable = this.getItemRandomTableList(player);
        let weights = [];
        let effects = [];
        for (let effect in itemRandomTable) {
            if (itemRandomTable.hasOwnProperty(effect)) {
                weights.push(itemRandomTable[effect]);
                effects.push(effect);
            }
        }
        return effects[Utils.randomWithWeight(weights)];
    }

    enterInvincible(duration) {
        if (this.isInvincible()) {
            return;
        }
        this.littleInvincible = {
            remainFrames: duration * Config.fps,
        };
    }

    leaveInvincible() {
        delete this.littleInvincible;
        this.bikeSprite.alpha = 1;
    }

    updateLittleInvincible() {
        if (this.littleInvincible) {
            this.littleInvincible.remainFrames -= this.stepSpeed;
            if (this.littleInvincible.remainFrames <= 0) {
                this.leaveInvincible();
            } else {
                const light = Math.floor(this.littleInvincible.remainFrames / Config.effect.Invincible.twinkleInterval) % 2 === 0;
                this.bikeSprite.alpha = light ? 1 : Config.effect.Invincible.twinkleAlpha;
            }
        }
    }

    showWarning(item) {
        const itemY = item.y;
        if (this.warningTable[itemY] === undefined) {
            const sprite = Sprite.from(Config.warningAnimation.warnSpritePath);
            sprite.anchor.set(1, 0.5);
            const sceneY = this.itemY2sceneY(itemY);
            sprite.position.set(App.sceneWidth, sceneY);
            this.addChildAt(sprite, 1);
            this.warningTable[itemY] = {
                sprite,
                item,
            };
            MusicMgr.playSound(Config.soundPath.warning, undefined, this.stepSpeed);
        }
    }

    updateWarning() {
        for (let y in this.warningTable) {
            if (this.warningTable.hasOwnProperty(y)) {
                const warning = this.warningTable[y];
                if (this.isXEnterView(warning.item.x - Config.warningAnimation.disWarningDistance)) {
                    warning.sprite.destroy();
                    delete this.warningTable[y];
                }
            }
        }
    }

    clearWarning() {
        for (let y in this.warningTable) {
            if (this.warningTable.hasOwnProperty(y)) {
                const warning = this.warningTable[y];
                warning.sprite.destroy();
                delete this.warningTable[y];
            }
        }
    }

    itemY2sceneY(itemY) {
        return itemY + this.cameraContainer.y;
    }

    addExtraScore(type, value) {
        switch (type) {
            case "GoldCoin": {
                this.updateCoin(this.coin + value);
                this.playAddExtraScore(App.getText("ExtraCoin", {value}));
                break;
            }
            case "Exp": {
                this.updateExp(this.exp + value);
                this.playAddExtraScore(App.getText("ExtraExp", {value}));
                break;
            }
        }
    }

    playAddExtraScore(text) {
        // todo 过程管理
        if (this.addExtraScoreAnimation) {
            this.addExtraScoreAnimation.stop();
            delete this.addExtraScoreAnimation;
        }
        this.ui.addExtraScoreLabel.x = Config.addExtraScoreAnimation.startMoveX;
        this.ui.addExtraScoreLabel.alpha = 1;
        this.ui.addExtraScoreLabel.text = text;
        this.addExtraScoreAnimation = new TWEEN.Tween(this.ui.addExtraScoreLabel)
            .to({x: Config.addExtraScoreAnimation.endMoveX}, Config.addExtraScoreAnimation.appearDuration)
            .onComplete(() => {
                this.addExtraScoreAnimation = new TWEEN.Tween(this.ui.addExtraScoreLabel)
                    .delay(Config.addExtraScoreAnimation.showDuration)
                    .to({alpha: 0}, Config.addExtraScoreAnimation.disappearAnimation)
                    .onComplete(() => {
                        delete this.addExtraScoreAnimation;
                    })
                    .start(performance.now());
            })
            .start(performance.now());
    }
}

GameScene.sceneFilePath = "myLaya/laya/pages/View/GameScene.scene.json";
