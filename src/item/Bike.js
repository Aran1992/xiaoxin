import {Container, Emitter, resources, Sprite, Text, TextStyle, Texture} from "../libs/pixi-wrapper";
import Config from "../config";
import {Circle, Vec2} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";
import RunOption from "../../run-option";
import EventMgr from "../mgr/EventMgr";
import BananaPeel from "./BananaPeel";
import BikeEffect from "./BikeEffect";
import Value from "./Value";
import GroundStab from "./GroundStab";
import SmallFireWall from "./SmallFireWall";
import BigFireWall from "./BigFireWall";
import Bird from "./Bird";
import Cloud from "./Cloud";

export default class Bike {
    constructor(gameScene, parent, world, id, config) {
        this.gameScene = gameScene;
        this.parent = parent;
        this.world = world;
        this.id = id;
        this.config = config;

        this.bikeBody = undefined;

        this.velocity = new Value(this.config.commonVelocity);
        this.jumpForce = new Value(this.config.jumpForce);

        this.frames = config.frames;
        this.frameIndex = 0;

        this.setContactFatalEdge(false);

        this.jumping = false;
        this.jumpCount = 0;

        this.isDead = false;
        this.dragBackPos = {x: 0, y: 0};
        this.deadCompleteTimer = 0;

        this.startDragBikeBack = false;
        this.adjustHeight = undefined;
        this.startAdjustHeight = false;

        this.startFloat = false;

        this.portableItemList = [];
        this.effectRemainFrame = {};
        this.initEffectTable();

        this.playername = this.config.playername;
        this.headurl = this.config.headurl;

        this.onCreate();
    }

    onCreate() {
        this.bikeOutterContainer = this.parent.addChildAt(new Container(), 0);

        this.bikeSelfContainer = this.bikeOutterContainer.addChild(new Container());
        this.bikeSelfContainer.scale.set(Config.bikeScale, Config.bikeScale);

        this.underBikeContainer = this.bikeSelfContainer.addChild(new Container());
        this.bikeSprite = this.bikeSelfContainer.addChild(new Sprite());
        this.bikeSprite.anchor.set(0.5, 0.5);
        this.upBikeContainer = this.bikeSelfContainer.addChild(new Container());

        this.bikeAnimSprite = this.bikeSprite.addChild(new Sprite());
        this.bikeAnimSprite.anchor.set(0.5, 0.5);
        this.bikeAnimSprite.texture = this.frames[this.frameIndex];
        this.bikeAnimSprite.position.set(...this.config.animPos);

        let config = Config.bikeList.find(bike => bike.id === this.id);

        if (config.imagePath) {
            let decorateSprite = this.bikeSprite.addChild(new Sprite());
            decorateSprite.texture = Texture.from(config.imagePath);
            decorateSprite.anchor.set(...config.anchor);
            decorateSprite.scale.set(...config.scale);
            decorateSprite.position.set(...config.position);
        }

        this.bikeBubbleSprite = this.bikeSprite.addChild(new Sprite());
        this.bikeBubbleSprite.texture = resources[Config.imagePath.bubble].texture;
        this.bikeBubbleSprite.anchor.set(0.5, 0.5);
        this.bikeBubbleSprite.scale.set(1 / Config.bikeScale, 1 / Config.bikeScale);
        this.bikeBubbleSprite.visible = false;

        this.bikeRankText = this.bikeOutterContainer.addChild(new Text(this.getName(), new TextStyle(Config.bike.enemyNameText.style)));
        this.bikeRankText.anchor.set(0.5, 1);
        this.bikeRankText.position.set(0, Config.bike.enemyNameText.positionY);

        this.bikeHeadImage = this.bikeOutterContainer.addChild(Sprite.from(this.headurl));
        this.bikeHeadImage.width = Config.bike.enemyHeadImage.width;
        this.bikeHeadImage.height = Config.bike.enemyHeadImage.height;
        this.bikeHeadImage.anchor.set(0.5, 1);
        this.bikeHeadImage.position.set(0, Config.bike.enemyHeadImage.positionY);

        this.bikeBody = this.world.createDynamicBody();
        let density = Config.bikeDensity * (config.densityPercent || Config.bikeDensity);
        this.selfFixture = this.bikeBody.createFixture(Circle(Config.bikeRadius), {density: density, friction: 1});
        this.bikeBody.setUserData(this);
        if (config.velocityPercent) {
            this.velocity.setBasicValue(this.config.commonVelocity * config.velocityPercent);
        }
        this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, 0));

        this.aiSensor = this.bikeBody.createFixture({shape: Circle(Config.bikeRadius * 5), isSensor: true});

        let vy = this.jumpForce.value / this.bikeBody.getMass() / Config.fps;
        let jumpRadius = this.calcJumpRadius(this.velocity.value, vy, this.world.getGravity().y);
        this.eatItemSensor = this.bikeBody.createFixture({shape: Circle(jumpRadius), isSensor: true});
        // todo 当跳跃力之类的东西发生变化的时候 也需要修改探测圈的范围

        this.stateText = this.bikeSprite.addChild(new Text("", new TextStyle({
            fill: "white",
            fontSize: 50,
        })));

        this.effectList = [];
        this.durationEffectTable = {};

        this.emitter = new Emitter(
            this.parent,
            [Texture.from(Config.imagePath.bikeParticle)],
            resources[Config.emitterPath.bike].data
        );
        this.emitter.emit = false;

        this.buffIconContainer = this.bikeOutterContainer.addChild(new Container());
        this.buffIconContainer.y = Config.buff.containerY;
        this.buffIconTable = {};
    }

    destroy() {
        this.resetJumpStatus();
        this.world.destroyBody(this.bikeBody);
        this.bikeOutterContainer.destroy();
        this.emitter.destroy();
        clearTimeout(this.deadCompleteTimer);
    }

    getHead() {
        return this.headurl;
    }

    getName() {
        return this.playername;
    }

    setPhysicalPosition(pp) {
        this.bikeBody.setPosition(pp);
        let rp = GameUtils.physicsPos2renderPos(pp);
        this.bikeOutterContainer.position.set(rp);
    }

    onPreSolve(contact, anotherFixture, selfFixture) {
        if (this.isDead) {
            return contact.setEnabled(false);
        }
        if (selfFixture === this.selfFixture) {
            if (this.gameScene.chtable.player.is(anotherFixture)
                || this.gameScene.chtable.enemy.is(anotherFixture)) {
                contact.setEnabled(false);
            } else if (this.gameScene.chtable.road2.is(anotherFixture)) {
                let {p1, p2} = anotherFixture.getUserData();
                if (Utils.getDistanceFromPointToLine(this.bikeBody.getPosition(), p1, p2) < Config.bikeRadius - Config.pixel2meter) {
                    contact.setEnabled(false);
                }
            }
            let ud = anotherFixture.getUserData();
            if (this.isInvincible() && [GroundStab, SmallFireWall, BigFireWall].some(ins => ud instanceof ins)) {
                contact.setEnabled(false);
            }
        }
    }

    onBeginContact(contact, anotherFixture, selfFixture) {
        if (selfFixture === this.aiSensor) {
            let ud = anotherFixture.getUserData();
            if ((ud && (ud.isFatal || ud.isCliff || ud.isDanger))
                || this.gameScene.chtable.obstacle.is(anotherFixture)) {
                this.isGoToJump = true;
            }
        } else if (selfFixture === this.eatItemSensor) {
            let ud = anotherFixture.getBody().getUserData();
            if ((ud && ud.isHelpful)) {
                this.isGoToJump = true;
            }
        } else {
            let item = anotherFixture.getBody().getUserData();
            if (item && item instanceof Bird) {
                return;
            }
            if (item && item instanceof Cloud) {
                if (!this.isInvincible()) {
                    this.setContactFatalEdge(true);
                }
                return;
            }
            if (item && item instanceof BananaPeel && item.thrower === this) {
                return;
            }
            let ud = anotherFixture.getUserData();
            if (this.gameScene.chtable.road.is(anotherFixture) || (ud && ud.resetJumpStatus)) {
                this.resetJumpStatus();
            }
            if (this.gameScene.chtable.obstacle.is(anotherFixture)) {
                this.setContactFatalEdge(true);
            } else {
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
        }
    }

    update() {
        if (this.eatEffect) {
            this.startEffect(this.eatEffect);
            delete this.eatEffect;
        }
        this.frameIndex += this.gameScene.stepSpeed;
        if (this.frameIndex >= this.frames.length) {
            this.frameIndex = 0;
        }
        this.bikeAnimSprite.texture = this.frames[Math.floor(this.frameIndex)];
        let pp = this.bikeBody.getPosition();
        let rp = GameUtils.physicsPos2renderPos(pp);
        this.bikeOutterContainer.x = rp.x;
        this.bikeOutterContainer.y = rp.y;
        if (!this.isDead && !this.jumping) {
            let velocity = this.bikeBody.getLinearVelocity();
            if (Config.bikeRotateByMoveDirection) {
                this.bikeSelfContainer.rotation = -Math.atan(velocity.y / velocity.x);
            }
        }
        if (Utils.calcPointDistance(this.bikeBody.getPosition(), this.gameScene.bikeBody.getPosition()) < Config.bikeRadius * 2) {
            this.bikeOutterContainer.alpha = Config.enemy.contactPlayerAlpha;
        } else {
            this.bikeOutterContainer.alpha = 1;
        }
        this.emitter.updateOwnerPos(this.bikeOutterContainer.x, this.bikeOutterContainer.y);
        this.emitter.update(1 / Config.fps);
    }

    afterUpdate() {
        if (!this.completeGame && this.isDead === false && this.isContactFatalEdge) {
            this.bikeBody.setLinearVelocity(Vec2(0, 0));
            this.bikeBody.setAngularVelocity(Config.bikeGameOverAngularVelocity);
            this.bikeBody.applyLinearImpulse(Vec2(-100, 200), this.bikeBody.getPosition());
            this.onDead();
            return;
        }

        if (!this.completeGame && this.isDead === false) {
            let bikePhysicsPos = this.bikeBody.getPosition();
            let lowestRoadTopY = this.gameScene.findLowestRoadTopY(this.bikeOutterContainer.x);
            if (bikePhysicsPos.y < GameUtils.renderY2PhysicsY(lowestRoadTopY) - Config.bikeGameOverOffsetHeight) {
                this.onDead();
                return;
            }
        }

        if (this.startReborn) {
            this.startDragBikeBack = true;
            this.rebornDragVelocity = Utils.calcPointDistance(this.bikeBody.getPosition(), this.dragBackPos) / Config.rebornDragDuration / Config.fps;
            this.bikeBubbleSprite.visible = true;
            this.bikeBody.setStatic();
            this.bikeBody.setAngle(0);
            this.bikeSelfContainer.rotation = 0;
            this.startReborn = false;
        }

        if (this.startDragBikeBack) {
            this.dragBikeBack();
            return;
        }

        if (this.startAdjustHeight) {
            this.adjustBikeHeight();
            return;
        }

        if (this.startFloat) {
            this.floatBike();
        }

        if (!this.completeGame
            && this.gameScene.finalPoint
            && this.bikeBody.getPosition().x > GameUtils.renderPos2PhysicsPos(this.gameScene.finalPoint).x) {
            this.completeGame = true;
        }

        if (this.isDead === false) {
            this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, this.bikeBody.getLinearVelocity().y));
        }

        if (this.isDead === false && (this.isGoToJump || this.hasEffect("SpiderWeb"))) {
            if (this.hasEffect("SpiderWeb")) {
                if (this.spiderWebBreakIntervalFrame <= 0) {
                    this.isGoToJump = true;
                    this.spiderWebBreakIntervalFrame = Config.enemy.spiderWebBreakIntervalFrame;
                } else {
                    this.spiderWebBreakIntervalFrame--;
                }
            } else {
                this.isGoToJump = true;
            }
        }

        if (this.isDead === false && !this.isGoToJump && this.bikeBody.getLinearVelocity().y < 0 && !this.hasRoadUnderBike()) {
            this.isGoToJump = true;
        }

        if (this.isDead === false && this.isGoToJump) {
            this.jump();
        }
        this.isGoToJump = false;

        this.updateEffect();
        this.jumpExtraCountdown--;
        this.updateBuffIcon();
        this.effectList.forEach(effect => effect.update());
        for (let type in this.durationEffectTable) {
            if (this.durationEffectTable.hasOwnProperty(type)) {
                this.durationEffectTable[type].update();
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

        if (this.portableItemList.length !== 0 && !this.isDead && !this.hasEffect("Seal")) {
            let effect = this.portableItemList.pop();
            let config = Config.effect[effect];
            if (effect === "BananaPeel") {
                this.gameScene.throwBananaPeel(this);
            } else {
                if (config.isHelpful) {
                    this.onAteItem(effect);
                } else {
                    let others = this.gameScene.enemyList
                        .filter(item => item !== this)
                        .concat(this.gameScene);
                    let targets;
                    switch (config.targetType) {
                        case 1: {
                            let target = this.gameScene.getFormerOne(this);
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
                        EventMgr.dispatchEvent("UseItem", this, {getName: () => "Air"}, effect);
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
                }, this.gameScene);
                this.effectList.push(effect);
            }
        }
    }

    onDead() {
        this.isDead = true;
        let pos = this.bikeBody.getPosition();
        this.dragBackPos = {x: pos.x, y: pos.y};
        this.deadCompleteTimer = setTimeout(this.onDeadCompleted.bind(this), Config.bike.deadCompleteTime);
        this.resetBikeStatus();
    }

    onDeadCompleted() {
        this.startReborn = true;
    }

    dragBikeBack() {
        let velocity = this.rebornDragVelocity;
        let targetPos = this.dragBackPos;
        let curPos = this.bikeBody.getPosition();
        let radius = Utils.calcRadians(curPos, targetPos);
        let moveX = velocity * Math.cos(radius);
        let moveY = velocity * Math.sin(radius);
        let {value: x, final: fx} = Utils.successive(curPos.x, targetPos.x, moveX);
        let {value: y, final: fy} = Utils.successive(curPos.y, targetPos.y, moveY);
        let newPos = Vec2(x, y);
        this.bikeBody.setPosition(newPos);
        if (fx && fy) {
            this.startDragBikeBack = false;
            this.startAdjustHeight = true;
            let rp = this.gameScene.findAdjustHeight(this.bikeOutterContainer.x);
            rp.y += Utils.randomInRange(...Config.bikeAdjustHeightOffset);
            let pos = GameUtils.renderPos2PhysicsPos(rp);
            this.floatTargetPosX = pos.x;
            this.adjustHeight = pos.y + Config.bikeRadius;
        }
    }

    adjustBikeHeight() {
        let curPos = this.bikeBody.getPosition();
        let moveY;
        if (curPos.y < this.adjustHeight) {
            if (curPos.y + Config.bike.adjustHeightVelocity > this.adjustHeight) {
                moveY = this.adjustHeight - curPos.y;
            } else {
                moveY = Config.bike.adjustHeightVelocity;
            }
        } else if (curPos.y > this.adjustHeight) {
            if (curPos.y - Config.bike.adjustHeightVelocity < this.adjustHeight) {
                moveY = this.adjustHeight - curPos.y;
            } else {
                moveY = -Config.bike.adjustHeightVelocity;
            }
        }
        let pos = Vec2(curPos.x, curPos.y + moveY);
        this.bikeBody.setPosition(pos);
        if (this.bikeBody.getPosition().y === this.adjustHeight) {
            this.startAdjustHeight = false;
            this.startFloat = true;
            this.bikeBody.setDynamic();
            this.bikeFloatFrame = Config.rebornFloatFrame;
        }
    }

    floatBike() {
        this.bikeFloatFrame--;
        if (this.bikeFloatFrame === 0 || this.bikeBody.getPosition().x >= this.floatTargetPosX) {
            this.startFloat = false;
            this.bikeBubbleSprite.visible = false;
            this.setContactFatalEdge(false);
            this.jumping = false;
            this.jumpCount = 0;
            this.isDead = false;
        } else {
            this.bikeBody.applyForceToCenter(Vec2(0, -this.gameScene.gravity * this.bikeBody.getMass()));
            this.bikeBody.setLinearVelocity(Vec2(Config.rebornFloatVelocity, 0));
        }
    }

    jump() {
        if (this.hasEffect("SpiderWeb")) {
            this.bikeBody.applyLinearImpulse(Vec2(0, Config.effect.SpiderWeb.jumpForce), this.bikeBody.getPosition());
            this.spiderWebRemainBreakTimes -= this.gameScene.stepSpeed;
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
        } else if (this.jumpCount < Config.jumpCommonMaxCount
            || this.jumpExtraCountdown > 0) {
            let velocity = this.bikeBody.getLinearVelocity();
            this.bikeBody.setLinearVelocity(Vec2(velocity.x, 0));
            this.bikeBody.applyLinearImpulse(Vec2(0, this.jumpForce.value), this.bikeBody.getPosition());
            this.jumping = true;
            this.jumpCount++;
            this.jumpExtraCountdown = Config.bikeJumpExtraCountdown[this.jumpCount - Config.jumpCommonMaxCount];
            this.bikeSelfContainer.rotation = Utils.angle2radius(Config.bikeJumpingRotation);
            switch (this.jumpCount) {
                case 1:
                    break;
                case 2:
                    this.emitter.playOnce();
                    break;
                default:
                    this.emitter.playOnce();
            }
        }
    }

    resetJumpStatus() {
        this.jumping = false;
        this.jumpCount = 0;
    }

    onAteItem(type, effect) {
        switch (type) {
            case "PortableItem": {
                this.portableItemList.push(effect);
                break;
            }
            case "GoldCoin":
            case "Star":
            case "Exp": {
                break;
            }
            case "Thunder": {
                if (!this.isInvincible()) {
                    this.setContactFatalEdge(true);
                }
                this.gameScene.addEffect(this, Config.effect.Thunder.bearerSufferedEffectPath);
                break;
            }
            default: {
                const effectConfig = Config.effect[type];
                if (this.isInvincible() && effectConfig && !effectConfig.isHelpful) {
                    return;
                }
                this.eatEffect = type;
            }
        }
    }

    startEffect(type) {
        if (this.isDead) {
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
                this.durationEffectTable[type] = new BikeEffect(this, config.bearerBuffEffectPath, undefined, this.gameScene);
            }
            if (config.bearerSufferedEffectPath) {
                let effect = new BikeEffect(this, config.bearerSufferedEffectPath, () => {
                    effect.destroy();
                    Utils.removeItemFromArray(this.effectList, effect);
                }, this.gameScene);
                this.effectList.push(effect);
            }
            if (config.buffIconImagePath) {
                this.addBuffIcon(type);
            }
        }
        this.effectRemainFrame[type] = Config.effect[type].duration * Config.fps;
    }

    updateEffect() {
        for (let type in this.effectRemainFrame) {
            if (this.effectRemainFrame.hasOwnProperty(type)) {
                this.effectRemainFrame[type] -= this.gameScene.stepSpeed;
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
                }
            } else {
                if (this.effectTable[type] && this.effectTable[type].update) {
                    this.effectTable[type].update();
                }
            }
        }
    }

    initEffectTable() {
        this.effectTable = {
            Decelerate: {
                start: () => {
                    this.velocity.increaseValueByRate(Config.effect.Decelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
                end: () => {
                    this.velocity.increaseValueByRate(-Config.effect.Decelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
            },
            Accelerate: {
                start: () => {
                    this.velocity.increaseValueByRate(Config.effect.Accelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
                end: () => {
                    this.velocity.increaseValueByRate(-Config.effect.Accelerate.rate);
                    this.bikeBody.setLinearVelocity(Vec2(this.velocity.value, this.bikeBody.getLinearVelocity().y));
                },
            },
            WeakenJump: {
                start: () => {
                    this.jumpForce.increaseValueByRate(Config.effect.WeakenJump.rate);
                },
                end: () => {
                    this.jumpForce.increaseValueByRate(-Config.effect.WeakenJump.rate);
                },
            },
            SpiderWeb: {
                start: () => {
                    this.spiderWebRemainBreakTimes = Config.effect.SpiderWeb.breakTimes;
                    this.spiderWebBreakIntervalFrame = 0;
                },
                cover: () => {
                    this.spiderWebRemainBreakTimes = Config.effect.SpiderWeb.breakTimes;
                },
                end: () => {
                    this.spiderWebRemainBreakTimes = 0;
                },
            },
            PowerJump: {
                start: () => {
                    this.jumpForce.increaseValueByRate(Config.effect.PowerJump.rate);
                },
                end: () => {
                    this.jumpForce.increaseValueByRate(-Config.effect.PowerJump.rate);
                },
            },
            Invincible: {
                start: () => {
                    this.setBikeScale(Config.effect.Invincible.scale);
                    this.removeAllEffects(true);
                },
                end: () => {
                    this.setBikeScale(1);
                    this.bikeSprite.alpha = 1;
                },
                update: () => {
                    const light = Math.floor(this.effectRemainFrame.Invincible / Config.effect.Invincible.twinkleInterval) % 2 === 0;
                    this.bikeSprite.alpha = light ? 1 : Config.effect.Invincible.twinkleAlpha;
                },
            },
        };
    }

    setBikeScale(scale) {
        // todo 同时修改ai探测器？
        let id = this.id;
        let config = Config.bikeList.find(config => config.id === id);
        let density = Config.bikeDensity * (config.densityPercent || Config.bikeDensity) / scale / scale;
        let radius = Config.bikeRadius * scale;
        this.bikeSprite.scale.set(scale, scale);
        if (this.selfFixture) {
            this.bikeBody.destroyFixture(this.selfFixture);
        }
        this.selfFixture = this.bikeBody.createFixture(Circle(radius), {density: density, friction: 1});
    }

    calcJumpRadius(vx, vy, a) {
        let t = vy / a;
        let x = vx * t;
        let y = vy * t / 2;
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    resetBikeStatus() {
        this.jumpCount = 0;
        this.jumping = false;

        this.setContactFatalEdge(false);

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

    hasEffect(type) {
        return this.effectRemainFrame[type] !== undefined;
    }

    getBikePhysicalPosition() {
        return this.bikeBody.getPosition();
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
            sprite.texture = Texture.from(Config.effect[type].buffIconImagePath);
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
                if (this.effectRemainFrame[type] > 0) {
                    this.buffIconTable[type].getChildAt(0).text = Math.ceil(this.effectRemainFrame[type] / Config.fps);
                } else {
                    this.buffIconTable[type].getChildAt(0).text = "";
                }
            }
        }
    }

    hasRoadUnderBike() {
        let list = this.gameScene.roadList;
        let length = list.length;
        let bikeX = this.bikeOutterContainer.x;
        let bikeY = this.bikeOutterContainer.y;
        for (let i = 0; i < length; i++) {
            let item = list[i];
            if (item.getLeftBorderX() <= bikeX) {
                if (item.getRightBorderX() > bikeX && item.getLowestTopY() >= bikeY) {
                    return true;
                }
            } else {
                return false;
            }
        }
        return false;
    }

    setContactFatalEdge(flag) {
        if (!this.startFloat) {
            this.isContactFatalEdge = flag;
        }
    }

    isInvincible() {
        return this.hasEffect("Invincible") || this.hasEffect("Sprint");
    }
}
