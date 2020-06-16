import {Sprite} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import {Polygon, Vec2} from "../libs/planck-wrapper";
import Utils from "../mgr/Utils";

export default class GroundStab {
    constructor(parent, world, config, gameMgr) {
        this.gameMgr = gameMgr;
        this.parent = parent;
        this.world = world;

        this.frames = GameUtils.getFrames(Config.sceneItemImagePath.groundStab);
        this.frameIndex = -1;

        this.sprite = this.parent.addChild(new Sprite());
        this.sprite.anchor.set(config.props.anchorX, config.props.anchorY);
        this.sprite.scale.set(config.props.scaleX, config.props.scaleY);
        this.sprite.position.set(config.props.x, config.props.y);
        this.sprite.rotation = config.props.rotation === undefined ? 0 : Utils.angle2radius(config.props.rotation);

        this.body = this.world.createBody();
        this.body.setUserData(this);
        this.body.setPosition(GameUtils.renderPos2PhysicsPos(this.sprite.position));
        this.body.setAngle(-this.sprite.rotation);

        this.update();

        if (GameUtils.isItemType(config, "Static")) {
            this.frameIndex = (Config.item.groundStab.staticFrame) / Config.item.groundStab.animationSpeed - 1;
            this.update();
            this.update = undefined;
        }
    }

    update() {
        let oldFrameIndex = Math.floor(this.frameIndex * Config.item.groundStab.animationSpeed);
        this.frameIndex += this.gameMgr.stepSpeed;
        let newFrameIndex = Math.floor(this.frameIndex * Config.item.groundStab.animationSpeed);
        if (oldFrameIndex !== newFrameIndex) {
            if (this.frames[newFrameIndex] === undefined) {
                this.frameIndex = 0;
                newFrameIndex = 0;
            }
            this.sprite.texture = this.frames[newFrameIndex];
            if (this.fixture) {
                this.body.destroyFixture(this.fixture);
            }
            let width = this.sprite.texture.width * this.sprite.scale.x * Config.pixel2meter;
            let height = this.sprite.texture.height * this.sprite.scale.y * Config.pixel2meter;
            if (width !== 0 && height !== 0) {
                let shape = Polygon([
                    Vec2(-width / 2, 0),
                    Vec2(width / 2, 0),
                    Vec2(0, height),
                ]);
                this.fixture = this.body.createFixture(shape);
                this.fixture.setUserData({isFatal: true});
            }
        }
    }

    onPreSolve() {
    }

    onBeginContact() {
    }

    destroy() {
        this.sprite.destroy();
        this.world.destroyBody(this.body);
    }
}

