import Config from "../config";
import {Container, Graphics, resources, Sprite, Texture, TilingSprite} from "../libs/pixi-wrapper";
import {Edge, Vec2} from "../libs/planck-wrapper";
import Utils from "../mgr/Utils";

export default class Road {
    constructor(world, path, sideTexturePath, topTexturePath) {
        this.originPath = [];
        for (let i = 0; i < path.length; i++) {
            this.originPath.push(path[i]);
        }
        this.leftTopPoint = {x: path[0], y: path[1]};
        this.lowestTopY = path.reduce((max, y, i) => {
            if (i % 2 === 1) {
                if (max === undefined) {
                    return y;
                } else {
                    return y > max ? y : max;
                }
            }
            return max;
        }, path[1]);
        this.highestTopPoint = path.reduce((minPoint, y, i) => {
            if (i % 2 === 1 && y < minPoint.y) {
                return {x: path[i - 1], y: path[i]};
            }
            return minPoint;
        }, {x: path[0], y: path[1]});

        let maxY = path[1];
        for (let i = 1; i < path.length; i += 2) {
            if (path[i] > maxY) {
                maxY = path[i];
            }
        }
        let bottomY = maxY + App.sceneHeight / 3 * 2;
        path = [path[0], bottomY]
            .concat(path)
            .concat([path[path.length - 2], bottomY]);

        this.world = world;
        this.sprite = new Container();
        this.sprite.part = this;
        let rect = Utils.getPathRect(path);
        this.rect = rect;
        let pathInRoad = path.map((p, i) => i % 2 === 0 ? p - rect.x : p - rect.y);
        this.createSide(sideTexturePath, rect.width, rect.height);
        this.createTop(topTexturePath, pathInRoad);
        this.createEdgeMask(pathInRoad);
        this.createClipMask(pathInRoad);
        this.sprite.cacheAsBitmap = true;
        this.sprite.position.set(rect.x, rect.y);
        this.createPhysicsBody(world, path);
    }

    static isFatalEdge(sp, ep) {
        let x, y;
        if (sp.y > ep.y) {
            y = sp.y - ep.y;
            x = sp.x - ep.x;
        } else {
            y = ep.y - sp.y;
            x = ep.x - sp.x;
        }
        let angle = Math.atan(y / x);
        return Config.fatalEdgeAngleRange[0] <= angle && angle <= Config.fatalEdgeAngleRange[1];
    }

    createSide(texturePath, width, height) {
        let texture = resources[texturePath].texture;
        let sprite = new TilingSprite(texture, width, height);
        this.sprite.addChild(sprite);
    }

    createTop(texturePath, path) {
        let texture = resources[texturePath].texture;
        for (let i = 2; i < path.length - 4; i += 2) {
            let sp = {x: path[i], y: path[i + 1]};
            let ep = {x: path[i + 2], y: path[i + 3]};
            let width = Utils.calcPointDistance(sp, ep);
            let sprite = new TilingSprite(texture, width, texture.height);
            this.sprite.addChild(sprite);
            sprite.position.set(sp.x, sp.y);
            sprite.rotation = Utils.calcRadians(sp, ep);
        }
    }

    createEdgeMask(path) {
        let edgeList = [
            {
                sp: {x: path[0], y: path[1]},
                ep: {x: path[2], y: path[3]},
            },
            {
                sp: {x: path[path.length - 4], y: path[path.length - 3]},
                ep: {x: path[path.length - 2], y: path[path.length - 1]},
            },
        ];
        edgeList.forEach(({sp, ep}) => {
            let edgeWidth = Math.abs(sp.y - ep.y);
            let canvas = Utils.createLinearGradientMask(edgeWidth, Config.edgeHeight, Config.edgeColorStop);
            let texture = Texture.from(canvas);
            let sprite = new Sprite(texture);
            this.sprite.addChild(sprite);
            sprite.position.set(sp.x, sp.y);
            sprite.rotation = Utils.calcRadians(sp, ep);
        });
    }

    createClipMask(path) {
        let graphics = new Graphics();
        graphics.beginFill();
        graphics.drawPolygon(path);
        graphics.endFill();
        this.sprite.mask = graphics;
    }

    createPhysicsBody(world, path) {
        let pathInPhysics = path.map((value, i) => {
            if (i % 2 === 1) {
                value = Config.designHeight - value;
            }
            return value * Config.pixel2meter;
        });

        let body = world.createBody();
        this.body = body;
        body.setUserData({type: "Road", obj: this});
        for (let i = 0; i <= pathInPhysics.length - 4; i += 2) {
            let sp = {
                    x: pathInPhysics[i],
                    y: pathInPhysics[i + 1]
                },
                ep = {
                    x: pathInPhysics[i + 2],
                    y: pathInPhysics[i + 3]
                };
            let fd = {density: 0, friction: 1,};
            if (i === pathInPhysics.length - 4) {
                body.createFixture(Edge(Vec2(sp.x, sp.y), Vec2(ep.x, ep.y)), fd).setUserData({isCliff: true});
            } else if (Road.isFatalEdge(sp, ep)) {
                let roadLength = Utils.calcPointDistance(sp, ep);
                if (roadLength <= Config.roadFatalMinLength) {
                    body.createFixture(Edge(Vec2(sp.x, sp.y), Vec2(ep.x, ep.y)), fd);
                } else {
                    let radians = Utils.calcRadians(ep, sp);
                    let mp = {
                        x: ep.x + Math.cos(radians) * Config.roadFatalMinLength,
                        y: ep.y + Math.sin(radians) * Config.roadFatalMinLength,
                    };
                    body.createFixture(Edge(Vec2(sp.x, sp.y), Vec2(mp.x, mp.y)), fd).setUserData({isFatal: true});
                    body.createFixture(Edge(Vec2(mp.x, mp.y), Vec2(ep.x, ep.y)), fd);
                }
            } else {
                body.createFixture(Edge(Vec2(sp.x, sp.y), Vec2(ep.x, ep.y)), fd);
            }
        }
    }

    getRightBorderX() {
        return this.rect.x + this.rect.width;
    }

    getLeftBorderX() {
        return this.rect.x;
    }

    getBottomBorderX() {
        return this.rect.y + this.rect.height;
    }

    getTopBorderY() {
        return this.rect.y;
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
        let path = this.originPath;
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

    destroy() {
        this.world.destroyBody(this.body);
        this.sprite.destroy();
    }
}
