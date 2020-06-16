import EditorItem from "./EditorItem";
import Config from "../config";
import {Box, Vec2} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";

export default class FireBall extends EditorItem {
    constructor(gameMgr, parent, world, config) {
        super("fireBall", gameMgr, parent, world, config);

        this.config.velocity *= Config.pixel2meter;

        this.onCreate();
    }

    onCreate() {
        super.onCreate();

        this.leftBorderX = this.sprite.x - this.sprite.texture.width * this.sprite.scale.x / 2;
    }

    createBody() {
        this.body = this.world.createKinematicBody();
        this.body.setUserData(this);
        let pp = GameUtils.renderPos2PhysicsPos(this.sprite.position);
        this.body.setPosition(pp);
        this.body.setAngle(-this.config.rotation);
        let sd = {};
        let texture = this.sprite.texture;
        let hw = texture.width / 2 * Config.pixel2meter * this.config.scaleX;
        let hh = texture.height / 2 * Config.pixel2meter * this.config.scaleY;
        sd.shape = Box(hw, hh);
        sd.isSensor = true;
        this.body.createFixture(sd).setUserData({isDanger: true});
        this.body.setLinearVelocity(Vec2(this.config.velocity, 0));
    }

    update() {
        if (Config.warningAnimation && !this.hasShowedWarning) {
            if (this.gameMgr.isXEnterView(this.getLeftBorderX() - Config.warningAnimation.warningDistance)) {
                this.showWarning();
            }
        } else if (this.body === undefined) {
            if (this.gameMgr.isItemXEnterView(this)) {
                this.createBody();
            }
        } else {
            if (!this.isDead) {
                if (this.striked) {
                    this.body.setDynamic();
                    const radians = Utils.calcRadians(this.striked.bikePos, this.body.getPosition());
                    const x = Math.cos(radians) * Config.item.fireBall.strikedImpulse;
                    const y = Math.sin(radians) * Config.item.fireBall.strikedImpulse;
                    this.body.applyLinearImpulse(Vec2(x, y), this.body.getPosition());
                    this.body.setAngularVelocity(Config.item.fireBall.strikedAngularVelocity);
                    this.isDead = true;
                }
            }

            let pos = GameUtils.physicsPos2renderPos(this.body.getPosition());
            this.sprite.position.set(pos.x, pos.y);
            this.sprite.rotation = -this.body.getAngle();
        }
    }

    onBeginContact(contact, anotherFixture) {
        if (this.isDead) {
            return;
        }
        const anotherBody = anotherFixture.getBody();
        const another = anotherBody.getUserData();
        if (this.gameMgr.isBike(another)) {
            if (another.isInvincible()) {
                const {x, y} = anotherBody.getPosition();
                this.striked = {bikePos: {x, y}};
            } else {
                another.setContactFatalEdge(true);
            }
        }
    }

    getLeftBorderX() {
        return this.leftBorderX;
    }

    showWarning() {
        this.hasShowedWarning = true;
        this.gameMgr.showWarning(this.sprite);
    }
}
