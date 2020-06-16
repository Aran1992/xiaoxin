import Config from "../config";
import Utils from "./Utils";
import BulletTimeLine from "../item/BulletTimeLine";

export default class BulletTimeLineMgr {
    constructor(gameMgr) {
        this.gameMgr = gameMgr;
        this.config = Config.bulletTime.line;
        this.bulletTimeLine = [];
        this.baseY = App.sceneHeight / (this.config.maxCountInScreen + 1);
    }

    clear() {
        this.bulletTimeLine.forEach(line => line && line.destroy());
        this.bulletTimeLine = [];
    }

    destroy() {
        this.clear();
    }

    enterBulletTime() {
        this.bulletTimeLine.forEach(line => line && line.destroy());
        this.bulletTimeLine = [];
        const indexList = Utils.intList(this.config.minCountInScreen - 1, this.config.maxCountInScreen - 1);
        const count = Utils.randomIntInRange(this.config.minCountInScreen, this.config.maxCountInScreen);
        const selectedIndexList = Utils.randomChooseMulti(indexList, count);
        for (let index = 0; index < this.config.maxCountInScreen; index++) {
            if (selectedIndexList.indexOf(index) !== -1) {
                this.createLine(index, App.sceneWidth * Math.random()).playAppearAnimation();
            } else {
                this.bulletTimeLine[index] = undefined;
            }
        }
    }

    leaveBulletTime() {
        this.bulletTimeLine.forEach(line => line && line.playDisappearAnimation(this.onDisappearAnimationEnded.bind(this)));
    }

    onDisappearAnimationEnded() {
        if (!this.bulletTimeLine.some(line => line && line.isPlayingAnimation())) {
            this.bulletTimeLine.forEach(line => line && line.destroy());
            this.bulletTimeLine = [];
        }
    }

    update() {
        this.bulletTimeLine.forEach(line => line && line.update());
        let count = 0;
        let uncreateIndexList = [];
        // 将超出范围的line移除
        for (let i = 0; i < this.bulletTimeLine.length; i++) {
            const line = this.bulletTimeLine[i];
            if (line) {
                // 检测右边界 是否已经超出了视野的左侧
                if (this.gameMgr.isItemOutSideOfViewLeft(line)) {
                    line.destroy();
                    delete this.bulletTimeLine[i];
                } else {
                    count++;
                    uncreateIndexList.push(i);
                }
            } else {
                uncreateIndexList.push(i);
            }
        }

        let selected = [];
        // 如果小于最小数量 那么就必须创建一定数量的来补充
        if (count < this.config.minCountInScreen) {
            count = this.config.minCountInScreen - count;
            selected = Utils.randomChooseMulti(uncreateIndexList, count);
        }
        for (let index = 0; index < this.bulletTimeLine.length; index++) {
            if (this.bulletTimeLine[index] === undefined) {
                if (selected.indexOf(index) !== -1
                    || Math.random() <= this.config.createLineRatePerFrame) {
                    this.createLine(index, App.sceneWidth);
                }
            }
        }
    }

    createLine(index, x) {
        let y = (index + 1) * this.baseY
            + this.config.randomOffset * 2 * Math.random() - this.config.randomOffset;
        x += -this.gameMgr.cameraContainer.x;
        y += -this.gameMgr.cameraContainer.y;
        this.bulletTimeLine[index] = new BulletTimeLine(this.gameMgr.underBikeContianer, x, y);
        return this.bulletTimeLine[index];
    }
}
