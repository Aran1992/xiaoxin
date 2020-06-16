import {Box, Vec2} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import EditorItem from "./EditorItem";

export default class UpDownPlatform extends EditorItem {
    constructor(gameMgr, parent, world, config) {
        super("upDownPlatform", gameMgr, parent, world, config);

        this.config.velocity *= Config.pixel2meter;

        this.onCreate();
    }

    onCreate() {
        super.onCreate();

        this.body = this.world.createKinematicBody();
        this.body.setUserData(this);
        let texture = this.sprite.texture;
        let hw = texture.width / 2 * Config.pixel2meter * this.config.scaleX;
        let hh = texture.height / 2 * Config.pixel2meter * this.config.scaleY;
        let fixture = this.body.createFixture(Box(hw, hh));
        fixture.setUserData({resetJumpStatus: true});
        let pp = GameUtils.renderPos2PhysicsPos(this.sprite.position);
        this.body.setPosition(pp);
        this.body.setAngle(-this.config.rotation);

        this.config.topY = this.sprite.y - this.config.topOffset;
        this.config.bottomY = this.sprite.y + this.config.bottomOffset;

        if (this.config.isStartUp) {
            this.body.setLinearVelocity(Vec2(0, this.config.velocity));
        } else {
            this.body.setLinearVelocity(Vec2(0, -this.config.velocity));
        }

        let bounds = this.gameMgr.getSpriteGameBounds(this.sprite);
        this.leftBorderX = bounds.x;
        this.rightBorderX = bounds.x + bounds.width;
        // 平台移动到最低点计算出来的bounds
        this.lowestTopY = bounds.y + bounds.height + this.config.bottomOffset;
        // 平台移动到最高点计算出来的bounds
        this.highestTopPoint = {x: this.leftBorderX, y: bounds.y - this.config.topOffset};
    }

    update() {
        super.update();

        let rp = this.sprite.position;
        if (rp.y <= this.config.topY) {
            this.body.setLinearVelocity(Vec2(0, -this.config.velocity));
        } else if (rp.y >= this.config.bottomY) {
            this.body.setLinearVelocity(Vec2(0, this.config.velocity));
        }
    }

    getLeftBorderX() {
        return this.leftBorderX;
    }

    getRightBorderX() {
        return this.rightBorderX;
    }

    getLowestTopY() {
        // todo 先简单返回最底部就好
        return this.lowestTopY;
    }

    getHighestTopPoint() {
        return this.highestTopPoint;
    }

    getTopPosInTargetX(x) {
        // todo 先简单返回最顶部就好
        return {x: x, y: this.highestTopPoint.y};
    }

    getLeftTopPoint() {
        // todo 先简单返回最顶部就好
        return {x: this.leftBorderX, y: this.highestTopPoint.y};
    }
}
