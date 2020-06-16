import {resources, Sprite} from "../libs/pixi-wrapper";
import Config from "../config";

export default class MatchRacetrack {
    constructor(root) {
        this.root = root;
    }

    create(enemyCount) {
        this.enemyCount = enemyCount;

        for (let i = this.root.children.length - 1; i >= 1; i--) {
            this.root.removeChildAt(i);
        }

        this.racetrackPlayer = this.root.addChild(new Sprite(resources[Config.imagePath.racetrackPlayer].texture));
        this.racetrackPlayer.anchor.set(0.5, 0);
        this.racetrackPlayer.position.set(Config.racetrack.startX, Config.racetrack.startY);

        this.racetrackEnemies = [];
        for (let index = 0; index < this.enemyCount; index++) {
            let image = this.root.addChildAt(new Sprite(resources[Config.imagePath.racetrackEnemy].texture), 1);
            image.anchor.set(0.5, 0);
            image.position.set(Config.racetrack.startX, Config.racetrack.startY - (index + 1) * Config.racetrack.playerYInterval);
            this.racetrackEnemies.push(image);
        }
    }

    update(playerRate, enemyRateList) {
        this.racetrackPlayer.x = playerRate * Config.racetrack.totalLength + Config.racetrack.startX;

        this.racetrackEnemies.forEach((image, index) => image.x = enemyRateList[index] * Config.racetrack.totalLength + Config.racetrack.startX);
    }
}
