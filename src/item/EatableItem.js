import EditorItem from "./EditorItem";
import {Box, Vec2} from "../libs/planck-wrapper";
import Config from "../config";
import GameUtils from "../mgr/GameUtils";
import EventMgr from "../mgr/EventMgr";
import Utils from "../mgr/Utils";
import MusicMgr from "../mgr/MusicMgr";
import TWEEN from "@tweenjs/tween.js";

export default class EatableItem extends EditorItem {
    constructor(gameMgr, parent, world, config, chainData) {
        super("EatableItem", gameMgr, parent, world, config);

        this.isHelpful = this.config.portable ? true : Config.effect[this.config.effect].isHelpful;
        if (chainData) {
            this.chainData = chainData;
            this.chainData.count++;
            this.chainData.value += this.config.value;
        }

        this.onCreate();
    }

    createBody() {
        this.body = this.world.createKinematicBody();
        this.body.setUserData(this);
        let sd = {};
        let texture = this.sprite.texture;
        let hw = texture.width / 2 * Config.pixel2meter * this.sprite.scale.x;
        let hh = texture.height / 2 * Config.pixel2meter * this.sprite.scale.y;
        sd.shape = Box(hw, hh);
        sd.isSensor = true;
        this.body.createFixture(sd).setUserData({isDanger: !this.isHelpful});
        const pp = GameUtils.renderPos2PhysicsPos(this.sprite.position);
        this.body.setPosition(pp);
        this.body.setAngle(-this.sprite.rotation);
        this.baseY = pp.y;
        this.frame = 0;
    }

    onBeginContact(contact, anotherFixture) {
        if (this.config.portable) {
            if (this.gameMgr.chtable.player.is(anotherFixture)) {
                if (this.sprite.visible && !this.animation) {
                    MusicMgr.playSound(Config.soundPath.eatRandomItem, undefined, this.gameMgr.stepSpeed);
                    if (this.config.effect === "Random") {
                        EventMgr.dispatchEvent("AteItem", "Random");
                    } else {
                        EventMgr.dispatchEvent("AteItem", "PortableItem", this.config.effect, this.sprite.texture, this.config);
                    }
                    this.playEatAnimation();
                }
            } else if (this.gameMgr.chtable.enemy.is(anotherFixture)) {
                let enemy = anotherFixture.getBody().getUserData();
                if (enemy.selfFixture === anotherFixture) {
                    if (this.config.effect === "Random") {
                        enemy.onAteItem("PortableItem", this.gameMgr.randomEffect(enemy));
                    } else {
                        enemy.onAteItem("PortableItem", this.config.effect);
                    }
                }
            }
        } else {
            if (this.gameMgr.chtable.player.is(anotherFixture)) {
                if (this.sprite.visible && !this.animation) {
                    EventMgr.dispatchEvent("AteItem", this.config.effect, undefined, undefined, this.config);
                    if (this.chainData) {
                        this.chainData.count--;
                        if (this.chainData.count === 0) {
                            this.gameMgr.addExtraScore(this.config.effect, this.chainData.value);
                        }
                    }
                    this.playEatAnimation();
                }
            } else if (this.gameMgr.chtable.enemy.is(anotherFixture)) {
                if (anotherFixture.getBody().getUserData().selfFixture === anotherFixture) {
                    anotherFixture.getBody().getUserData().onAteItem(this.config.effect);
                }
            }
        }
    }

    playEatAnimation() {
        this.animation = new TWEEN.Tween(this.sprite)
            .to({
                y: this.sprite.y - Config.eatItemAnimation.yOffset,
                alpha: 0
            }, Config.eatItemAnimation.duration / this.gameMgr.stepSpeed)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.sprite.visible = false;
                delete this.animation;
                if (this.gameMgr.enemyList.length === 0) {
                    this.willDestroyed = true;
                }
            })
            .start(performance.now());
    }

    update() {
        if (this.body === undefined) {
            if (this.gameMgr.isItemXEnterView(this)) {
                this.createBody();
            }
        }
        if (this.body) {
            if (this.isAttracted) {
                this.moveToPlayer();
            } else if (this.gameMgr.isItemXInView(this)) {
                ["Magnet", "Sprint"].some(key => {
                    if (this.gameMgr.hasEffect(key) && this.config[`attractedBy${key}`]) {
                        this.isAttracted = true;
                        this.body.setDynamic();
                        this.moveToPlayer();
                        return true;
                    }
                });
            }
            if (!this.isAttracted) {
                this.body.setLinearVelocity(Vec2(this.config.forwardVelocity || 0, 0));
                if (this.config.isMoveUpDown) {
                    this.frame += this.config.upDownStep * this.gameMgr.stepSpeed;
                    const y = this.baseY + Math.sin(this.frame) * this.config.upDownCoefficient;
                    this.body.setPosition(Vec2(this.body.getPosition().x, y));
                }
            }
            if (!this.animation) {
                super.update();
            }
        }
    }

    moveToPlayer() {
        if (this.animation) {
            return;
        }
        if (this.gameMgr.gameStatus === "play") {
            let radius = Utils.calcRadians(this.body.getPosition(), this.gameMgr.bikeBody.getPosition());
            let velocity = Config.effect.Magnet.velocity * Config.pixel2meter;
            let vx = velocity * Math.cos(radius);
            let vy = velocity * Math.sin(radius);
            this.body.setLinearVelocity(Vec2(vx, vy));
        } else {
            this.body.setLinearVelocity(Vec2(0, 0));
        }
    }

    destroy() {
        if (this.animation) {
            this.animation.stop();
        }
        super.destroy();
    }
}
