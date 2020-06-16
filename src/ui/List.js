import {Container, Graphics, Rectangle} from "../libs/pixi-wrapper";
import UIHelper from "./UIHelper";
import Config from "../config";

export default class List {
    constructor({root, initItemFunc, updateItemFunc, count, isStatic, isHorizontal, onScroll}) {
        this.itemTable = {};
        this.cacheItemList = [];

        this.root = root;
        this.root.hitArea = new Rectangle(0, 0, this.root.mywidth, this.root.myheight);

        this.container = this.root.addChild(new Container());

        this.item = root.children[0];
        this.item.visible = false;
        this.initItem = initItemFunc;
        this.updateItem = updateItemFunc;
        this.onScroll = onScroll || (() => 0);

        this.createMask();

        if (!isStatic) {
            this.bindListener();
        }

        this.initDirectionRelatedVariable(isHorizontal);

        this.countPerLine = Math.ceil(this.lineLength / this.itemLineLength);
        this.maxOffset = 0;
        count = count || 0;
        this.setItemCount(count);

        this.update();
    }

    initDirectionRelatedVariable(isHorizontal) {
        this.isHorizontal = isHorizontal;
        if (isHorizontal) {
            this.lineLength = this.root.myheight;
            this.viewLength = this.root.mywidth;
            this.itemLineLength = this.item.myheight;
            this.itemLength = this.item.mywidth;
            this.moveAxis = "x";
        } else {
            this.lineLength = this.root.mywidth;
            this.viewLength = this.root.myheight;
            this.itemLineLength = this.item.mywidth;
            this.itemLength = this.item.myheight;
            this.moveAxis = "y";
        }
    }

    getItemPosition(index) {
        if (this.isHorizontal) {
            let column = Math.floor(index / this.countPerLine),
                row = index % this.countPerLine;
            return [
                column * this.itemLength,
                row * this.itemLineLength
            ];
        } else {
            let column = index % this.countPerLine,
                row = Math.floor(index / this.countPerLine);
            return [
                column * this.itemLineLength,
                row * this.itemLength
            ];
        }
    }

    createMask() {
        let {x, y} = this.root.getGlobalPosition();
        this.root.mask = new Graphics()
            .beginFill()
            .drawRect(x, y, this.root.mywidth, this.root.myheight)
            .endFill();
    }

    createItem() {
        let item = this.cacheItemList.pop();
        if (item === undefined) {
            item = UIHelper.uiClone(this.item, undefined, this.container);
            this.container.addChild(item);
            if (this.initItem) {
                this.initItem(item);
            }
        }
        return item;
    }

    bindListener() {
        this.root.buttonMode = true;
        this.root.interactive = true;
        this.root.on("pointerdown", this.onTouchStart.bind(this));
        this.root.on("pointermove", this.onTouchMove.bind(this));
        this.root.on("pointerup", this.onTouchEnd.bind(this));
        this.root.on("pointerupoutside", this.onTouchEnd.bind(this));
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
            this.update();
            this.onScroll();
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
                this.update();
                lastTime = curTime;
                this.onScroll();
            };
            handler();
        }
    }

    calcStartAndEnd(offset, itemLength, viewLength) {
        let startLine = Math.floor(offset / itemLength);
        let endLine = Math.floor((offset + viewLength) / itemLength);
        if (startLine < 0) {
            startLine = 0;
        }
        let maxLine = Math.ceil(this.itemCount / this.countPerLine);
        if (endLine > maxLine - 1) {
            endLine = maxLine - 1;
        }
        let start = startLine * this.countPerLine;
        let end = (endLine + 1) * this.countPerLine - 1;
        if (end >= this.itemCount) {
            end = this.itemCount - 1;
        }
        return {start, end};
    }

    update() {
        let {start, end} = this.calcStartAndEnd(-this.container[this.moveAxis], this.itemLength, this.viewLength);
        for (let index in this.itemTable) {
            if (this.itemTable.hasOwnProperty(index)) {
                if (index < start || index > end) {
                    this.itemTable[index].visible = false;
                    this.cacheItemList.push(this.itemTable[index]);
                    delete this.itemTable[index];
                }
            }
        }
        for (let index = start; index <= end; index++) {
            if (this.itemTable[index] === undefined) {
                let item = this.createItem();
                this.itemTable[index] = item;
                item.position.set(...this.getItemPosition(index));
                item.visible = true;
                this.updateItem(item, index);
            }
        }
    }

    refresh() {
        for (let index in this.itemTable) {
            if (this.itemTable.hasOwnProperty(index)) {
                this.updateItem(this.itemTable[index], parseInt(index));
            }
        }
    }

    reset(count) {
        count = count === undefined ? this.itemCount : count;
        this.container[this.moveAxis] = 0;
        this.setItemCount(count);
        for (let index in this.itemTable) {
            if (this.itemTable.hasOwnProperty(index)) {
                this.itemTable[index].visible = false;
                this.cacheItemList.push(this.itemTable[index]);
                delete this.itemTable[index];
            }
        }
        this.update();
    }

    getIndex() {
        return -Math.floor(this.container[this.moveAxis] / this.itemLength);
    }

    setIndex(index) {
        this.container[this.moveAxis] = -this.itemLength * index;
        this.update();
    }

    getItemCount() {
        return this.itemCount;
    }

    setItemCount(count) {
        this.itemCount = count;
        this.minOffset = this.viewLength - Math.ceil(this.itemCount / this.countPerLine) * this.itemLength;
        if (this.minOffset > this.maxOffset) {
            this.minOffset = 0;
        }
    }

    getViewLineCount() {
        return Math.floor(this.viewLength / this.itemLength);
    }

    updateItems(updateFunc) {
        for (let index in this.itemTable) {
            if (this.itemTable.hasOwnProperty(index)) {
                updateFunc(this.itemTable[index], parseInt(index));
            }
        }
    }

    isAbleScrollLeft() {
        return this.container[this.moveAxis] < this.maxOffset;
    }

    isAbleScrollRight() {
        return this.container[this.moveAxis] > this.minOffset;
    }
}
