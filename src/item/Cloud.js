import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import {Box} from "../libs/planck-wrapper";
import {AnimatedSprite, Graphics, Sprite} from "../libs/pixi-wrapper";
import RunOption from "../../run-option";
import MusicMgr from "../mgr/MusicMgr";

export default class Cloud {
    constructor(gameMgr, container, world, config) {
        this.gameMgr = gameMgr;
        this.container = container;
        this.world = world;
        this.config = config;
        const id = GameUtils.getItemProp(config, "ID") || "default";
        this.itemConfig = Config.item.Cloud.table[id];

        this.type = GameUtils.getItemType(this.config);
        this.itemType = "Cloud";

        this.createSprite();
    }

    createSprite() {
        this.sprite = this.container.addChild(new Sprite());
        this.sprite.part = this;
        const frames = GameUtils.getFrames(this.itemConfig.animationJsonPath, this.itemConfig.animationName);
        this.animation = this.sprite.addChild(new AnimatedSprite(frames));
        this.animation.anchor.set(0.5, 0.5);
        const scaleX = this.config.props.scaleX;
        const scaleY = this.config.props.scaleY;
        this.animation.scale.set(scaleX, scaleY);
        this.animation.position.set(...this.itemConfig.animationPos);
        this.animation.animationSpeed = this.itemConfig.animationSpeed * this.gameMgr.stepSpeed;
        this.animation.play();
        const texture = this.animation.textures[0];
        const x = this.config.props.x + texture.width / 2 * scaleX;
        const y = this.config.props.y + texture.height / 2 * scaleY;
        this.sprite.position.set(x, y);
    }

    createBody() {
        this.body = this.world.createBody();
        this.body.setUserData(this);
        const pp = GameUtils.renderPos2PhysicsPos({x: this.sprite.x, y: this.sprite.y});
        this.body.setPosition(pp);
        const halfWidth = this.itemConfig.bodyWidth / 2 * Config.pixel2meter;
        const halfHeight = this.itemConfig.bodyHeight / 2 * Config.pixel2meter;
        this.body.createFixture(Box(halfWidth, halfHeight), {density: 1, friction: 1,});

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

    destroy() {
        if (this.body) {
            this.world.destroyBody(this.body);
        }
        this.sprite.destroy();
    }

    update() {
        if (this.body === undefined) {
            if (this.gameMgr.isItemXEnterView(this)) {
                this.createBody();
                if (this.itemConfig.appearSoundPath && this.itemConfig.appearSoundPath.length > 0) {
                    MusicMgr.playSound(this.itemConfig.appearSoundPath, undefined, this.gameMgr.stepSpeed);
                }
            }
        }
    }

    onPreSolve(contact, anotherFixture) {
        if (!this.gameMgr.isBike(anotherFixture.getBody().getUserData())) {
            contact.setEnabled(false);
        }
    }

    getLeftBorderX() {
        return this.sprite.x - this.animation.anchor.x * this.animation.width * this.animation.scale.x;
    }

    getRightBorderX() {
        return this.sprite.x + (1 - this.animation.anchor.x) * this.animation.width * this.animation.scale.x;
    }

    changeSpeed(speed) {
        this.animation.animationSpeed = this.itemConfig.animationSpeed * speed;
    }
}
