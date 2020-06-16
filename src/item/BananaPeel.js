import Config from "../config";
import {resources, Sprite} from "../libs/pixi-wrapper";
import {Box, Circle, Vec2} from "../libs/planck-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";
import MusicMgr from "../mgr/MusicMgr";

function get(v, d) {
    return v === undefined ? d : v;
}

function createPhysicalItem(parent, world, data) {
    let sprite = parent.addChild(new Sprite());
    sprite.anchor.set(0.5, 0.5);
    sprite.scale.set(get(data.props.scaleX, 1), get(data.props.scaleY, 1));
    sprite.rotation = get(data.props.rotation, 0);
    sprite.alpha = get(data.props.alpha, 1);
    sprite.visible = get(data.props.visible, true);
    switch (data.type) {
        case "Image": {
            if (data.props.skin) {
                sprite.texture = resources[`myLaya/laya/assets/${data.props.skin}`].texture;
            }
            sprite.position.set(get(data.props.x, 0), get(data.props.y, 0));
            break;
        }
        case "Animation": {
            if (data.props.source) {
                sprite.textures = GameUtils.getFrames(`myLaya/laya/assets/${data.props.source}`, data.props.autoAnimation);
                sprite.textureIndex = 0;
                sprite.texture = sprite.textures[sprite.textureIndex];
                sprite.interval = get(data.props.interval, 1);
                let ox = get(data.props.x, 0),
                    oy = get(data.props.y, 0);
                let sp = {x: 0, y: 0};
                let ep = {x: sprite.texture.width / 2 * sprite.scale.x, y: sprite.texture.height / 2 * sprite.scale.y};
                let radius = Utils.calcPointDistance(sp, ep);
                let radians = Utils.calcRadians(sp, ep);
                let x = ox + Math.cos(radians) * radius,
                    y = oy + Math.sin(radians) * radius;
                sprite.position.set(x, y);
            }
            break;
        }
    }

    let bodyConfig = data.child.find(child => child.type === "RigidBody");
    let body = world.createBody();
    switch (bodyConfig.props.type) {
        case "static": {
            body.setStatic();
            break;
        }
        case "kinematic": {
            body.setKinematic();
            break;
        }
        case "dynamic":
        default: {
            body.setDynamic();
            break;
        }
    }

    let fixture;
    data.child.forEach(collider => {
        switch (collider.type) {
            case "BoxCollider": {
                let coefficient = Config.pixel2meter / 2 * sprite.scale.x;
                let halfWidth = get(collider.props.width, 100) * coefficient;
                let halfHeight = get(collider.props.height, 100) * coefficient;
                fixture = body.createFixture({
                    shape: Box(halfWidth, halfHeight),
                    isSensor: get(collider.props.isSensor, false),
                    friction: 0,
                    density: 1,
                });
                break;
            }
            case "CircleCollider": {
                let radius = get(collider.props.radius, 50) * sprite.scale.x * Config.pixel2meter;
                fixture = body.createFixture({
                    shape: Circle(radius),
                    isSensor: get(collider.props.isSensor, false),
                    friction: 0,
                    density: 1,
                });
                break;
            }
        }
    });

    if (bodyConfig.props.linearVelocity) {
        body.setLinearVelocity(Vec2(...bodyConfig.props.linearVelocity));
    }

    if (bodyConfig.props.angularVelocity) {
        body.setAngularVelocity(bodyConfig.props.angularVelocity);
    }

    return {sprite, body, fixture};
}

export default class BananaPeel {
    constructor(gameMgr, parent, world, thrower) {
        this.gameMgr = gameMgr;
        this.parent = parent;
        this.world = world;
        this.thrower = thrower;

        let {sprite, body, fixture} = createPhysicalItem(parent, world, resources[Config.effect.BananaPeel.peelPrefabPath].data);

        this.sprite = sprite;
        this.sprite.part = this;
        this.body = body;
        this.body.setUserData(this);
        this.fixture = fixture;
        this.fixture.setUserData({isFatal: true});

        let bikePhysicalPosition = this.thrower.getBikePhysicalPosition();
        bikePhysicalPosition = Vec2(bikePhysicalPosition.x, bikePhysicalPosition.y + 1);
        this.body.setPosition(bikePhysicalPosition);
        let {x, y} = GameUtils.physicsPos2renderPos(bikePhysicalPosition);
        this.sprite.position.set(x, y);

        this.throwPhysicalY = bikePhysicalPosition.y;

        if (this.thrower === this.gameMgr) {
            this.sprite.alpha = 0.5;
        }
    }

    destroy() {
        this.sprite.destroy();
        this.world.destroyBody(this.body);
    }

    update() {
        if (this.contactPlayer) {
            return this.gameMgr.removeItem(this);
        }

        if (this.sprite.textures) {
            this.sprite.textureIndex += this.gameMgr.stepSpeed;
            let index = Math.floor(this.sprite.textureIndex / this.sprite.interval);
            if (this.sprite.textures[index] === undefined) {
                this.sprite.textureIndex = 0;
                index = 0;
            }
            this.sprite.texture = this.sprite.textures[index];
        }

        let physicalPosition = this.body.getPosition();
        let {x, y} = GameUtils.physicsPos2renderPos(physicalPosition);
        this.sprite.position.set(x, y);
        this.sprite.rotation = -this.body.getAngle();

        if (this.contactSomething || physicalPosition.y <= this.throwPhysicalY) {
            this.body.setStatic();
        }
    }

    onPreSolve() {
    }

    onBeginContact(contact, anotherFixture) {
        let ud = anotherFixture.getBody().getUserData();
        if (ud === this.thrower
            || anotherFixture.isSensor()) {
            return;
        }
        this.contactSomething = true;
        if (ud && ud.isPlayer && ud.isPlayer()) {
            this.contactPlayer = true;
            this.gameMgr.addEffect(ud, Config.effect.BananaPeel.bearerSufferedEffectPath);
            if (ud === this.gameMgr) {
                MusicMgr.playSound(Config.effect.BananaPeel.sufferSound, undefined, this.gameMgr.stepSpeed);
            }
        }
    }
}
