import {resources, Sprite} from "../libs/pixi-wrapper";
import Config from "../config";
import {Box} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";

export default class DeadLine {
    constructor(parent, world, config) {
        this.parent = parent;
        this.world = world;

        this.config = {
            imagePath: `myLaya/laya/assets/${config.props.skin}`,
            scaleX: config.props.scaleX === undefined ? 1 : config.props.scaleX,
            scaleY: config.props.scaleY === undefined ? 1 : config.props.scaleY,
            rotation: config.props.rotation === undefined ? 0 : Utils.angle2radius(config.props.rotation),
            x: config.props.x,
            y: config.props.y,
        };

        this.sprite = undefined;
        this.body = undefined;

        this.onCreate();
    }

    destroy() {
        this.sprite.destroy();
        this.world.destroyBody(this.body);
    }

    onCreate() {
        this.sprite = this.parent.addChild(new Sprite());
        let texture = resources[this.config.imagePath].texture;
        this.sprite.texture = texture;
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale.set(this.config.scaleX, this.config.scaleY);
        this.sprite.position.set(this.config.x, this.config.y);
        this.sprite.rotation = this.config.rotation;

        this.body = this.world.createBody();
        let hw = texture.width / 2 * Config.pixel2meter * this.config.scaleX;
        let hh = texture.height / 2 * Config.pixel2meter * this.config.scaleY;
        let fixture = this.body.createFixture(Box(hw, hh));
        fixture.setUserData({isFatal: true});
        let pp = GameUtils.renderPos2PhysicsPos(this.sprite.position);
        this.body.setPosition(pp);
        this.body.setAngle(-this.config.rotation);
    }
}
