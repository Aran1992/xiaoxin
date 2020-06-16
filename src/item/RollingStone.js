import EditorItem from "./EditorItem";
import {Circle, Vec2} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import Utils from "../mgr/Utils";

export default class RollingStone extends EditorItem {
    constructor(gameMgr, parent, world, config) {
        super("rollingStone", gameMgr, parent, world, config);

        this.onCreate();
    }

    onCreate() {
        super.onCreate();

        this.leftBorderX = this.sprite.x - this.sprite.texture.width * this.sprite.scale.x / 2;
    }

    createBody() {
        this.body = this.world.createDynamicBody();
        this.body.setUserData(this);
        let radius = this.sprite.texture.width / 2 * this.sprite.scale.x * Config.pixel2meter;
        this.body.createFixture(Circle(radius), {density: 1, friction: 1})
            .setUserData({isDanger: true});
        let pp = GameUtils.renderPos2PhysicsPos(this.sprite.position);
        this.body.setPosition(pp);
        this.body.setAngle(-this.config.rotation);
        this.body.setAngularVelocity(this.config.angularVelocity);
    }

    update() {
        if (this.body === undefined) {
            if (this.gameMgr.isItemXEnterView(this)) {
                this.createBody();
            }
        } else {
            if (!this.isDead) {
                if (this.striked) {
                    const radians = Utils.calcRadians(this.striked.bikePos, this.body.getPosition());
                    const x = Math.cos(radians) * Config.item.rollingStone.strikedImpulse;
                    const y = Math.sin(radians) * Config.item.rollingStone.strikedImpulse;
                    this.body.applyLinearImpulse(Vec2(x, y), this.body.getPosition());
                    this.body.setAngularVelocity(Config.item.rollingStone.strikedAngularVelocity);
                    this.isDead = true;
                }
            }

            let pos = GameUtils.physicsPos2renderPos(this.body.getPosition());
            this.sprite.position.set(pos.x, pos.y);
            this.sprite.rotation = -this.body.getAngle();
        }
    }

    onPreSolve(contact) {
        if (this.isDead || this.striked) {
            contact.setEnabled(false);
        }
    }

    onBeginContact(contact, anotherFixture) {
        if (this.isDead) {
            return;
        }
        const anotherBody = anotherFixture.getBody();
        const another = anotherBody.getUserData();
        if (this.gameMgr.isBike(another)) {
            if (anotherBody.getPosition().y < this.body.getPosition().y) {
                if (another.isInvincible()) {
                    const {x, y} = anotherBody.getPosition();
                    this.striked = {bikePos: {x, y}};
                } else {
                    another.setContactFatalEdge(true);
                }
            } else {
                another.resetJumpStatus();
            }
        }
    }

    getLeftBorderX() {
        return this.leftBorderX;
    }
}
