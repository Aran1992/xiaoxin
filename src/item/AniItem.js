import Config from "../config";
import Item from "./Item";
import GameUtils from "../mgr/GameUtils";
import {AnimatedSprite} from "../libs/pixi-wrapper";
import {Box, Vec2} from "../libs/planck-wrapper";

export default class AniItem extends Item {
    create() {
        this.initAni();
        this.sprite = new AnimatedSprite(this.frames);
        this.sprite.position.set(this.config.props.x, this.config.props.y);
        this.sprite.scale.set(this.config.props.scaleX, this.config.props.scaleY);
        this.sprite.animationSpeed = this.animationSpeed * this.gameMgr.stepSpeed;
        this.sprite.play();

        let body = this.world.createBody();
        this.body = body;
        let texture = this.frames[0];
        let x = texture.width * this.config.props.scaleX / 2 * Config.pixel2meter;
        let y = -texture.height * this.config.props.scaleY / 2 * Config.pixel2meter;
        let halfWidth = this.bodyWidth * Config.pixel2meter / 2;
        let halfHeight = this.bodyHeight * Config.pixel2meter / 2;
        let shape = Box(halfWidth, halfHeight, Vec2(x, y));
        body.createFixture(shape, {density: 0, friction: 1,});
        body.setPosition(GameUtils.renderPos2PhysicsPos(this.config.props));
        this.type = GameUtils.getItemType(this.config);
        body.setUserData(this);
    }

    changeSpeed(speed) {
        this.sprite.animationSpeed = this.animationSpeed * speed;
    }
}
