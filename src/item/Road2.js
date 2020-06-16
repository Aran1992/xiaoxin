import {Container, Graphics, resources, TilingSprite} from "../libs/pixi-wrapper";
import Utils from "../mgr/Utils";
import {Edge, Vec2} from "../libs/planck-wrapper";
import Config from "../config";

export default class Road2 {
    constructor(parent, world, path, sideImagePath, topImagePath) {
        this.parent = parent;
        this.world = world;

        this.config = {
            path,
            sideImagePath,
            topImagePath,
            roadHeight: Config.designHeight
        };

        this.container = undefined;
        this.body = undefined;

        this.onCreate();
    }

    destroy() {
        this.container.destroy();
        this.world.destroyBody(this.body);
    }

    onCreate() {
        this.container = this.parent.addChild(new Container());

        let rect = Utils.getPathRect(this.config.path);

        this.rightBorderX = rect.x + rect.width;
        this.leftBorderX = rect.x;
        this.lowestTopY = this.config.path.reduce((max, y, i) => {
            if (i % 2 === 1) {
                if (max === undefined) {
                    return y;
                } else {
                    return y > max ? y : max;
                }
            }
            return max;
        }, this.config.path[1]);
        this.highestTopPoint = this.config.path.reduce((minPoint, y, i) => {
            if (i % 2 === 1 && y < minPoint.y) {
                return {x: this.config.path[i - 1], y: this.config.path[i]};
            }
            return minPoint;
        }, {x: this.config.path[0], y: this.config.path[1]});
        this.leftTopPoint = {x: this.config.path[0], y: this.config.path[1]};

        let pathInRoad = this.config.path.map((p, i) => i % 2 === 0 ? p - rect.x : p - rect.y);

        this.createSide(rect.width);

        this.createTop(pathInRoad);

        this.createMask(pathInRoad);

        this.container.cacheAsBitmap = true;

        this.container.position.set(rect.x, rect.y);

        this.createBody();
    }

    createSide(width) {
        let texture = resources[this.config.sideImagePath].texture;
        this.container.addChild(new TilingSprite(texture, width, this.config.roadHeight));
    }

    createTop(path) {
        let texture = resources[this.config.topImagePath].texture;
        for (let i = 0; i < path.length - 2; i += 2) {
            let sp = {x: path[i], y: path[i + 1]};
            let ep = {x: path[i + 2], y: path[i + 3]};
            let width = Utils.calcPointDistance(sp, ep);
            let sprite = this.container.addChild(new TilingSprite(texture, width, texture.height));
            sprite.position.set(sp.x, sp.y);
            sprite.rotation = Utils.calcRadians(sp, ep);
        }
    }

    createMask(path) {
        path = path.concat([
            path[path.length - 2], this.config.roadHeight,
            0, this.config.roadHeight
        ]);
        let graphics = new Graphics();
        graphics.beginFill();
        graphics.drawPolygon(path);
        graphics.endFill();
        this.container.mask = graphics;
    }

    createBody() {
        this.body = this.world.createBody();
        this.body.setUserData({type: "Road2", obj: this});
        let path = this.config.path.map((value, i) => {
            if (i % 2 === 1) {
                value = Config.designHeight - value;
            }
            return value * Config.pixel2meter;
        });
        for (let i = 0; i < path.length - 2; i += 2) {
            let p1 = Vec2(path[i], path[i + 1]);
            let p2 = Vec2(path[i + 2], path[i + 3]);
            this.body.createFixture(Edge(p1, p2), {density: 0, friction: 1,})
                .setUserData({resetJumpStatus: true, p1, p2});
        }
    }

    getRightBorderX() {
        return this.rightBorderX;
    }

    getLeftBorderX() {
        return this.leftBorderX;
    }

    getLowestTopY() {
        return this.lowestTopY;
    }

    getHighestTopPoint() {
        return this.highestTopPoint;
    }

    getLeftTopPoint() {
        return {x: this.leftTopPoint.x, y: this.leftTopPoint.y};
    }

    getTopPosInTargetX(x) {
        let path = this.config.path;
        for (let i = 0; i <= path.length - 4; i += 2) {
            let sp = {x: path[i], y: path[i + 1]};
            let ep = {x: path[i + 2], y: path[i + 3]};
            if (x >= sp.x && x < ep.x) {
                let radius = Utils.calcRadians(sp, ep);
                return {
                    x: sp.x + (x - sp.x),
                    y: sp.y + (x - sp.x) * Math.tan(radius),
                };
            }
        }
    }
}
