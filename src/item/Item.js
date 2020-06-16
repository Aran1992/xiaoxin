import Config from "../config";
import GameUtils from "../mgr/GameUtils";
import {Box, Circle, Polygon} from "../libs/planck-wrapper";
import {Graphics, resources, Sprite} from "../libs/pixi-wrapper";

export default class Item {
    constructor(config, world, gameMgr) {
        this.gameMgr = gameMgr;
        this.config = config;
        this.world = world;
        this.create();
        this.sprite.part = this;
    }

    create() {
        switch (this.config.type) {
            case "Circle": {
                this.sprite = new Graphics();
                let color = GameUtils.hexString2Int(this.config.props.fillColor);
                this.sprite.beginFill(color).drawCircle(0, 0, this.config.props.radius).endFill();
                this.sprite.position.set(this.config.props.x, this.config.props.y);

                let body = this.world.createBody();
                this.body = body;
                body.createFixture(Circle(this.config.props.radius * Config.pixel2meter), {
                    density: 0,
                    friction: 1,
                });
                body.setPosition(GameUtils.renderPos2PhysicsPos(this.config.props));
                body.setUserData({type: GameUtils.getItemType(this.config), sprite: this.sprite});
                break;
            }
            case "Poly": {
                this.sprite = new Graphics();
                let color = GameUtils.hexString2Int(this.config.props.fillColor);
                let path = GameUtils.pointsStr2path(this.config.props.points);
                this.sprite.beginFill(color).drawPolygon(path).endFill();
                this.sprite.position.set(this.config.props.x, this.config.props.y);

                let body = this.world.createBody();
                this.body = body;
                let vertices = GameUtils.path2vertices(path.map(p => p * Config.pixel2meter));
                body.createFixture(Polygon(vertices), {density: 0, friction: 1,});
                body.setPosition(GameUtils.renderPos2PhysicsPos(this.config.props));
                body.setUserData({type: GameUtils.getItemType(this.config), sprite: this.sprite});
                break;
            }
            case "Sprite": {
                let texture = resources[this.config.props.texture].texture;
                this.sprite = new Sprite(texture);
                this.sprite.position.set(this.config.props.x, this.config.props.y);

                if (this.config.props.scaleX !== undefined) {
                    this.sprite.scale.x = this.config.props.scaleX;
                }
                if (this.config.props.scaleY !== undefined) {
                    this.sprite.scale.y = this.config.props.scaleY;
                }

                let body = this.world.createBody();
                this.body = body;
                let width = texture.width / 2 * this.sprite.scale.x * Config.pixel2meter;
                let height = texture.height / 2 * this.sprite.scale.y * Config.pixel2meter;
                body.createFixture(Box(width, height), {density: 0, friction: 1,});
                body.setPosition(GameUtils.renderPos2PhysicsPos(this.config.props));
                this.type = GameUtils.getItemType(this.config);
                body.setUserData(this);
                break;
            }
        }
    }

    getRightBorderX() {
        return this.sprite.position.x - (this.sprite.anchor.x * this.sprite.width) + this.sprite.width;
    }

    getLeftBorderX() {
        return this.sprite.position.x - (this.sprite.anchor.x * this.sprite.width);
    }

    destroy() {
        this.world.destroyBody(this.body);
        this.sprite.destroy();
    }
}
