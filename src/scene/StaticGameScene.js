import Config from "../config";
import GameScene from "./GameScene";
import {resources, Sprite} from "../libs/pixi-wrapper";
import Utils from "../mgr/Utils";
import GameUtils from "../mgr/GameUtils";
import DataMgr from "../mgr/DataMgr";
import MatchRacetrack from "../ui/MatchRacetrack";

export default class StaticGameScene extends GameScene {
    onCreate() {
        super.onCreate();
        this.ui.matchRacetrack.visible = true;
        this.matchRacetrack = new MatchRacetrack(this.ui.matchRacetrack);
        this.enemyCount = 0;
    }

    initEnvironment() {
        this.bikeCommonVelocity = this.mapConfig.bikeVelocity || Config.bikeVelocity;
        this.gravity = this.mapConfig.gravity || Config.gravity;
        this.jumpForce = this.mapConfig.jumpForce || Config.jumpForce;
        this.bgTextureList = this.mapConfig.texture.bg;
        this.sideTexture = this.mapConfig.texture.side;
        this.topTexture = this.mapConfig.texture.top;
        this.sideTexture2 = this.mapConfig.texture.side2;
        this.topTexture2 = this.mapConfig.texture.top2;
        this.horizontalParallaxDepth = this.mapConfig.horizontalParallaxDepth;
        this.verticalParallaxDepth = this.mapConfig.verticalParallaxDepth;
        this.bgY = this.mapConfig.bgY || Config.bgY;
        this.bgmPath = this.mapConfig.bgmPath || Config.defaultBgmPath;
        this.bgScale = this.mapConfig.bgScale || Config.defaultBgScale;
    }

    getResPathList() {
        return super.getResPathList()
            .concat(this.mapConfig.texture.bg)
            .concat([
                this.mapConfig.texture.side,
                this.mapConfig.texture.top,
                this.mapConfig.texture.side2,
                this.mapConfig.texture.top2,
                this.mapScenePath,
            ]);
    }

    initGameContent() {
        let pathList = this.getRoadPathList();

        let lastPath = Utils.getLast(pathList);
        this.finalPoint = {
            x: (lastPath[lastPath.length - 6] + lastPath[lastPath.length - 4]) / 2,
            y: (lastPath[lastPath.length - 5] + lastPath[lastPath.length - 3]) / 2,
        };
        this.finalPointPhysicX = GameUtils.renderPos2PhysicsPos(this.finalPoint).x;

        this.createMap();

        this.createFinalFlag();

        this.enemyList = [];
        let pp = GameUtils.renderPos2PhysicsPos({x: pathList[0][2] + Config.bikeLeftMargin, y: pathList[0][3]});
        pp.x += Config.bikeRadius;
        pp.y += Config.bikeRadius;
        this.bikeStarPos = pp;
        this.createBike(pp);
        this.createRacetrackPlayer();
    }

    getRoadPathList() {
        let json = resources[this.mapScenePath].data;
        return json.child
            .filter(data => data.label.split("//").find(str => str === "Road"))
            .map(data => {
                let path = data.props.points.split(",").map((intStr, i) => {
                    let value = parseInt(intStr);
                    if (i % 2 === 0) {
                        value += data.props.x;
                    } else {
                        value += data.props.y;
                    }
                    return value;
                });
                let maxY = path[1];
                for (let i = 1; i < path.length; i += 2) {
                    if (path[i] > maxY) {
                        maxY = path[i];
                    }
                }
                let bottomY = maxY + App.sceneHeight / 3 * 2;
                path = [path[0], bottomY].concat(path);
                path = path.concat([path[path.length - 2], bottomY]);
                return path;
            });
    }

    createMap() {
        let json = resources[this.mapScenePath].data;
        json.child.forEach(data => {
            data.animations = json.animations;
            this.createPart(data);
        });
        this.roadList.sort((a, b) => a.getLeftBorderX() - b.getLeftBorderX());
    }

    createFinalFlag() {
        let sprite = new Sprite(resources[Config.finalFlagImagePath].texture);
        sprite.anchor.set(0.5, 1);
        sprite.scale.set(0.5, 0.5);
        sprite.position.set(this.finalPoint.x, this.finalPoint.y);
        this.underBikeContianer.addChild(sprite);
    }

    createRacetrackPlayer() {
        this.matchRacetrack.create(this.enemyCount);
        this.bikeStartX = this.bikeBody.getPosition().x;
        this.totalDistance = (this.finalPoint.x - this.bikeSprite.x) * Config.pixel2meter;
    }

    updateRacetrackPlayer() {
        this.matchRacetrack.update(this.calcRacetrackPlayerRate(this.bikeBody), this.enemyList.map(enemy => this.calcRacetrackPlayerRate(enemy.bikeBody)));
    }

    calcRacetrackPlayerRate(body) {
        let distance = body.getPosition().x - this.bikeStartX;
        if (distance > this.totalDistance) {
            distance = this.totalDistance;
        }
        return distance / this.totalDistance;
    }

    play() {
        super.play();
        this.updateRacetrackPlayer();
    }

    isPlayerInScreen(player) {
        return player.bikeOutterContainer.x < Config.designWidth - this.cameraContainer.x;
    }

    settle() {
        this.stopSounds();
        this.pauseGame();
        let distance = this.distance * GameUtils.getBikeConfig("distancePercent");
        if (this.doubleReward) {
            distance *= 2;
        }
        distance = Math.floor(distance);
        DataMgr.add(DataMgr.distance, distance);
        DataMgr.add(DataMgr.rankDistance, distance);
    }
}
