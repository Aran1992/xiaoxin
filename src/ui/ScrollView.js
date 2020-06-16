import Config from "../config";
import {Graphics, Rectangle} from "../libs/pixi-wrapper";

export default class ScrollView {
    constructor({root, isHorizontal}) {
        this.root = root;
        this.root.hitArea = new Rectangle(0, 0, this.root.mywidth, this.root.myheight);

        this.container = this.root.getChildAt(0);

        this.createMask();

        this.initDirectionRelatedVariable(isHorizontal);

        this.maxOffset = 0;

        this.bindListener();
    }

    onTouchStart(event) {
        this.touching = true;
        this.lastTouchOffset = event.data.global[this.moveAxis];
        cancelAnimationFrame(this.recoverAnimationID);
    }

    onTouchMove(event) {
        if (this.touching) {
            let curTouchOffset = event.data.global[this.moveAxis];
            let moveOffset = curTouchOffset - this.lastTouchOffset;
            this.lastTouchOffset = curTouchOffset;
            let newOffset = this.container[this.moveAxis] + moveOffset;
            if (newOffset > this.maxOffset || newOffset < this.minOffset) {
                newOffset = this.container[this.moveAxis] + moveOffset / Config.listResistance;
            }
            this.container[this.moveAxis] = newOffset;
        }
    }

    onTouchEnd() {
        this.touching = false;
        if (this.container[this.moveAxis] > this.maxOffset || this.container[this.moveAxis] < this.minOffset) {
            let totalTime = 250;
            let lastTime = (new Date()).getTime();
            let totalMove = (this.container[this.moveAxis] > this.maxOffset ? this.maxOffset : this.minOffset) - this.container[this.moveAxis];
            let handler = () => {
                let curTime = (new Date()).getTime();
                if (this.container[this.moveAxis] > this.minOffset) {
                    this.container[this.moveAxis] += (curTime - lastTime) / totalTime * totalMove;
                    if (this.container[this.moveAxis] <= this.maxOffset) {
                        this.container[this.moveAxis] = this.maxOffset;
                    } else {
                        this.recoverAnimationID = requestAnimationFrame(handler);
                    }
                } else if (this.container[this.moveAxis] < this.maxOffset) {
                    this.container[this.moveAxis] += (curTime - lastTime) / totalTime * totalMove;
                    if (this.container[this.moveAxis] >= this.minOffset) {
                        this.container[this.moveAxis] = this.minOffset;
                    } else {
                        this.recoverAnimationID = requestAnimationFrame(handler);
                    }
                }
                lastTime = curTime;
            };
            handler();
        }
    }

    createMask() {
        let {x, y} = this.root.getGlobalPosition();
        this.root.mask = new Graphics()
            .beginFill()
            .drawRect(x, y, this.root.mywidth, this.root.myheight)
            .endFill();
    }

    initDirectionRelatedVariable(isHorizontal) {
        this.isHorizontal = isHorizontal;
        if (isHorizontal) {
            this.moveAxis = "x";
            this.minOffset = this.root.mywidth - this.container.mywidth;
        } else {
            this.moveAxis = "y";
            this.minOffset = this.root.myheight - this.container.myheight;
        }
    }

    bindListener() {
        this.root.buttonMode = true;
        this.root.interactive = true;
        this.root.on("pointerdown", this.onTouchStart.bind(this));
        this.root.on("pointermove", this.onTouchMove.bind(this));
        this.root.on("pointerup", this.onTouchEnd.bind(this));
        this.root.on("pointerupoutside", this.onTouchEnd.bind(this));
    }

}
