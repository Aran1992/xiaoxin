import {AnimatedSprite, Graphics, Sprite} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import {Box, Vec2} from "../libs/planck-wrapper";
import RunOption from "../../run-option";
import Config from "../config";
import MusicMgr from "../mgr/MusicMgr";

export default class Spring {
    constructor(gameMgr, container, world, config) {
        this.itemType = "Spring";
        this.gameMgr = gameMgr;
        this.container = container;
        this.world = world;
        this.config = config;
        const id = GameUtils.getItemProp(config, "ID") || "default";
        this.itemConfig = Config.item[this.itemType].table[id];
        this.createSprite();
    }

    // this.willDestroyed如果设置为true
    // 那么gamemgr会自动在下一次update的时候调用该对象的destroy方法并且一处这个对象的索引
    // 该对象如果被判断消失在画面左侧时 该对象也会被销毁
    destroy() {
        this.sprite.destroy();
        if (this.body) {
            this.world.destroyBody(this.body);
        }
        if (this.playerEndedTimer !== undefined) {
            clearTimeout(this.playerEndedTimer);
        }
    }

    update() {
        if (this.body === undefined) {
            if (this.gameMgr.isItemXEnterView(this)) {
                this.scaleFrame = 0;
                this.createBody();
                if (this.itemConfig.appearSoundPath && this.itemConfig.appearSoundPath.length > 0) {
                    MusicMgr.playSound(this.itemConfig.appearSoundPath, undefined, this.gameMgr.stepSpeed);
                }
            }
        } else {
            if (this.itemConfig.scaleRange) {
                this.scaleFrame += this.gameMgr.stepSpeed;
                const totalFrame = this.itemConfig.scaleDuration / 1000 * Config.fps * 2;
                const rate = this.scaleFrame / totalFrame;
                let percent = rate - Math.floor(rate);
                let scale;
                if (percent < 0.5) {
                    scale = this.itemConfig.scaleRange[0] + (this.itemConfig.scaleRange[1] - this.itemConfig.scaleRange[0]) * percent * 2;
                } else {
                    scale = this.itemConfig.scaleRange[0] + (this.itemConfig.scaleRange[1] - this.itemConfig.scaleRange[0]) * (1 - percent) * 2;
                }
                this.sprite.scale.set(scale, scale);
            }
        }
    }

    onBeginContact(contact, anotherFixture) {
        const anotherBody = anotherFixture.getBody();
        const another = anotherBody.getUserData();
        if (this.gameMgr.isBike(another)) {
            another.resetJumpStatus();
            if (another.spring) {
                another.spring(this.itemConfig.contactBikeVelocity);
                if (Config.soundPath.spring) {
                    MusicMgr.playSound(Config.soundPath.spring, undefined, this.gameMgr.stepSpeed);
                }
            } else {
                anotherBody.setLinearVelocity(Vec2(anotherBody.getLinearVelocity().x, this.itemConfig.contactBikeVelocity));
            }
            another.addBulletTime && another.addBulletTime(this.itemConfig.bulletTimeValueTrampled);
            this.playAnimation("ing");
            this.animation.loop = false;
            this.animation.onComplete = this.onIngAnimationComplete.bind(this);
        }
    }

    getLeftBorderX() {
        return this.sprite.x + this.animation.x - this.animation.texture.width * this.animation.scale.x * this.animation.anchor.x;
    }

    getRightBorderX() {
        return this.sprite.x + this.animation.x + this.animation.texture.width * this.animation.scale.x * (1 - this.animation.anchor.x);
    }

    createSprite() {
        this.sprite = new Sprite();
        this.container.addChild(this.sprite);
        this.sprite.part = this;
        this.playAnimation("common");
        this.sprite.position.set(this.config.props.x, this.config.props.y);
    }

    createBody() {
        this.body = this.world.createBody();
        this.body.setUserData(this);
        const pp = GameUtils.renderPos2PhysicsPos(this.sprite);
        this.body.setPosition(pp);
        const halfWidth = this.itemConfig.bodyWidth / 2 * Config.pixel2meter;
        const halfHeight = this.itemConfig.bodyHeight / 2 * Config.pixel2meter;
        this.body.createFixture({shape: Box(halfWidth, halfHeight), isSensor: true});

        if (RunOption.showCollider) {
            const graphics = new Graphics();
            graphics.beginFill();
            const width = halfWidth * 2 * Config.meter2pixel;
            const height = halfHeight * 2 * Config.meter2pixel;
            graphics.drawRect(-width / 2, -height / 2, width, height);
            graphics.endFill();
            this.sprite.addChild(graphics);
        }
    }

    playAnimation(name) {
        if (this.animation) {
            this.animation.destroy();
        }
        const animation = this.itemConfig.animations[name];
        const frames = GameUtils.getFrames(animation.path, animation.name);
        this.animation = new AnimatedSprite(frames);
        this.sprite.addChild(this.animation);
        this.animation.anchor.set(0.5, 0.5);
        this.animation.scale.set(this.config.props.scaleX, this.config.props.scaleY);
        this.animation.position.set(...animation.pos);
        this.animation.animationSpeed = animation.speed;
        this.animation.play();
    }

    onIngAnimationComplete() {
        // 在animation的onComplete回调中改变动画似乎无法生效，所以延迟执行
        this.playerEndedTimer = setTimeout(this.onPlayEndedTimeout.bind(this), 0);
    }

    onPlayEndedTimeout() {
        delete this.playerEndedTimer;
        this.playAnimation("ended");
    }
}
