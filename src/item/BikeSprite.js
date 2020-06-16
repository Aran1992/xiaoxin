import Config from "../config";
import {AnimatedSprite, Container, Sprite, Texture} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";

export default class BikeSprite {
    constructor(parent, childIndex) {
        this.bikeSprite = new Container();
        if (childIndex !== undefined) {
            parent.addChildAt(this.bikeSprite, childIndex);
        } else {
            parent.addChild(this.bikeSprite);
        }
        this.decorateSprite = new Sprite();
        this.bikeSprite.addChild(this.decorateSprite);
        this.visible = true;
    }

    setBikeID(id) {
        this.config = Config.bikeList.find(bike => bike.id === id);
        this.animationPath = this.config.bikeCommonAnimation || Config.bikeCommonAnimation;
        this.updateDecorate();
        if (this.isAnimationLoaded()) {
            this.updateAnimation();
        } else {
            this.bikeSprite.visible = false;
            this.loadAnimation();
        }
    }

    isAnimationLoaded() {
        return App.hasLoadResource(this.animationPath);
    }

    loadAnimation() {
        App.loadResources([this.animationPath], this.onLoadedAnimation.bind(this), () => 0);
    }

    onLoadedAnimation() {
        this.updateAnimation();
    }

    updateAnimation() {
        // 有可能一开始设置成A 但是A的资源还没加载完成就又设置成B 这个时候A的资源加载回来的时候 其实是不想要显示的
        if (this.isAnimationLoaded()) {
            const textures = GameUtils.getFrames(this.animationPath, "bike");
            if (this.bikeAnimSprite) {
                this.bikeAnimSprite.destroy();
            }
            this.bikeAnimSprite = this.bikeSprite.addChildAt(new AnimatedSprite(textures), 0);
            this.bikeAnimSprite.anchor.set(0.5, 0.5);
            this.bikeAnimSprite.position.set(...(this.config.bikeCommonAnimationPos || Config.bikeCommonAnimationPos));
            if (this.animationSpeed !== undefined) {
                this.bikeAnimSprite.animationSpeed = this.animationSpeed;
            }
            if (this.playing) {
                this.bikeAnimSprite.play();
            }
            this.bikeSprite.visible = this.visible;
        }
    }

    updateDecorate() {
        if (this.config.imagePath && this.config.imagePath.length !== 0) {
            this.decorateSprite.texture = Texture.from(this.config.imagePath);
            this.decorateSprite.anchor.set(...this.config.anchor);
            this.decorateSprite.scale.set(...this.config.scale);
            this.decorateSprite.position.set(...this.config.position);
            this.decorateSprite.visible = true;
        } else {
            this.decorateSprite.visible = false;
        }
    }

    setPositionX(x) {
        this.bikeSprite.x = x;
    }

    getPositionX() {
        return this.bikeSprite.x;
    }

    getPositionY() {
        return this.bikeSprite.y;
    }

    getLeftBorderX() {
        return this.bikeSprite.x - this.getWidth() / 2;
    }

    setPosition(x, y) {
        this.bikeSprite.position.set(x, y);
    }

    getWidth() {
        return this.bikeAnimSprite ? this.bikeAnimSprite.width * Math.abs(this.bikeSprite.scale.x) : 0;
    }

    play() {
        if (this.bikeAnimSprite) {
            this.bikeAnimSprite.play();
        }
        this.playing = true;
    }

    stop() {
        if (this.bikeAnimSprite) {
            this.bikeAnimSprite.stop();
        }
        this.playing = false;
    }

    destroy() {
        this.bikeSprite.destroy();
    }

    setGray(gray) {
        GameUtils.greySprite(this.bikeSprite, gray);
    }

    reverse(reverse) {
        this.bikeSprite.scale.x = Math.abs(this.bikeSprite.scale.x) * (reverse ? -1 : 1);
    }

    setVisible(visible) {
        this.visible = visible;
        this.bikeSprite.visible = visible;
    }

    setScale(scale) {
        this.bikeSprite.scale.set(scale, scale);
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        if (this.bikeAnimSprite) {
            this.bikeAnimSprite.animationSpeed = speed;
        }
    }
}

BikeSprite.resPathList = [];
