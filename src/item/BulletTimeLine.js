import {AnimatedSprite} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import Config from "../config";
import TWEEN from "@tweenjs/tween.js";

export default class BulletTimeLine {
    constructor(container, x, y) {
        this.container = container;
        this.sprite = new AnimatedSprite(GameUtils.getFrames(Config.bulletTime.lineAnimationPath));
        this.sprite.anchor.set(0, 0.5);
        this.sprite.position.set(x, y);
        this.sprite.animationSpeed = Config.bulletTime.lineAnimationSpeed;
        this.sprite.play();
        this.container.addChild(this.sprite);
        console.log("create");
    }

    destroy() {
        console.log("destroy");
        if (this.animation) {
            this.animation.stop();
            delete this.animation;
        }
        this.sprite.destroy();
    }

    playAppearAnimation() {
        if (this.animation) {
            this.animation.stop();
            delete this.animation;
        }
        this.sprite.alpha = 0;
        this.animation = new TWEEN.Tween(this.sprite)
            .to({alpha: 1}, Config.bulletTime.filmImageAppearDuration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                delete this.animation;
            })
            .start(performance.now());
    }

    playDisappearAnimation(callback) {
        if (this.animation) {
            this.animation.stop();
            delete this.animation;
        }
        this.sprite.alpha = 1;
        this.animation = new TWEEN.Tween(this.sprite)
            .to({alpha: 0}, Config.bulletTime.filmImageAppearDuration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                delete this.animation;
                callback && callback();
            })
            .start(performance.now());
    }

    update() {
        this.sprite.x += -1;
    }

    isPlayingAnimation() {
        return this.animation !== undefined;
    }

    getRightBorderX() {
        return this.sprite.x + this.sprite.width;
    }
}
