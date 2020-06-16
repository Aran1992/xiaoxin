import TWEEN from "@tweenjs/tween.js";
import Utils from "../mgr/Utils";

const supportCommonKeys = [
    "x",
    "y",
    "alpha",
    "width",
    "height",
];

function setObjKeyValue(obj, key, value) {
    if (key === "scaleX") {
        obj.scale.x = value;
    } else if (key === "scaleY") {
        obj.scale.y = value;
    } else if (key === "rotation") {
        obj.rotation = Utils.angle2radius(value);
    } else if (supportCommonKeys.indexOf(key) !== -1) {
        obj[key] = value;
    } else {
        console.error(`动画解析功能暂时不支持属性：${key}，如果需要的话，请和程序进行沟通`);
    }
}

function getObjKeyValue(obj, key) {
    if (key === "scaleX") {
        return obj.scale.x;
    } else if (key === "scaleY") {
        return obj.scale.y;
    } else if (key === "rotation") {
        return Utils.radius2angle(obj.rotation);
    } else if (supportCommonKeys.indexOf(key) !== -1) {
        return obj[key];
    } else {
        console.error(`动画解析功能暂时不支持属性：${key}，如果需要的话，请和程序进行沟通`);
    }
}

function getEasing(tweenMethod) {
    if (tweenMethod === "linearNone") {
        return TWEEN.Easing.Linear.None;
    } else {
        console.error(`动画解析功能暂时不支持缓动：${tweenMethod}，如果需要的话，请和程序进行沟通`);
    }
}

class Frame {
    constructor(obj, key, value, duration, easing, callback) {
        this.obj = obj;
        this.key = key;
        this.callback = callback;
        this.updateObject = {[key]: getObjKeyValue(obj, key)};
        this.tween = new TWEEN.Tween(this.updateObject)
            .to({[key]: value}, duration)
            .easing(getEasing(easing))
            .onUpdate(this.onUpdate.bind(this))
            .onComplete(this.onComplete.bind(this))
            .start(performance.now());
    }

    onUpdate() {
        setObjKeyValue(this.obj, this.key, this.updateObject[this.key]);
    }

    onComplete() {
        this.stop();
        this.callback();
    }

    stop() {
        this.tween.stop();
    }
}

class Frames {
    constructor(obj, key, frames, callback) {
        this.obj = obj;
        this.key = key;
        this.frames = frames;
        this.callback = callback;
        this.index = 0;
        this.lastFrameIndex = 0;
        if (this.frames[0].index === 0) {
            this.obj[this.key] = this.frames[0].value;
            this.index++;
        }
        if (this.frames[this.index]) {
            this.playFrame();
        } else {
            requestAnimationFrame(() => {
                this.completed = true;
                this.callback();
            });
        }
    }

    onFrameEnded() {
        this.index++;
        if (this.frames[this.index]) {
            this.playFrame();
        } else {
            this.completed = true;
            this.callback();
        }
    }

    playFrame() {
        const frame = this.frames[this.index];
        const duration = (frame.index - this.lastFrameIndex) * 1000 / 24;
        this.lastFrameIndex = frame.index;
        this.frame = new Frame(this.obj, this.key, frame.value, duration, frame.tweenMethod, this.onFrameEnded.bind(this));
    }

    stop() {
        if (this.frame) {
            this.frame.stop();
        }
    }
}

export default class Animation {
    constructor(getChildByID, config, callback) {
        this.callback = callback || (() => 0);
        this.animationTable = {};
        config.nodes.forEach(node => {
            this.animationTable[node.target] = {};
            const obj = getChildByID(node.target);
            if (obj) {
                for (const key in node.keyframes) {
                    if (node.keyframes.hasOwnProperty(key)) {
                        const frames = node.keyframes[key];
                        this.animationTable[node.target][key] = new Frames(obj, key, frames, this.onFramesEnded.bind(this));
                    }
                }
            }
        });
    }

    onFramesEnded() {
        if (this.checkIsAllCompleted()) {
            this.callback();
        }
    }

    checkIsAllCompleted() {
        for (const node in this.animationTable) {
            if (this.animationTable.hasOwnProperty(node)) {
                const keyframes = this.animationTable[node];
                for (const type in keyframes) {
                    if (keyframes.hasOwnProperty(type)) {
                        if (!keyframes[type].completed) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    stop() {
        for (const node in this.animationTable) {
            if (this.animationTable.hasOwnProperty(node)) {
                const keyframes = this.animationTable[node];
                for (const type in keyframes) {
                    if (keyframes.hasOwnProperty(type)) {
                        if (!keyframes[type].completed) {
                            keyframes[type].stop();
                        }
                    }
                }
            }
        }
    }
}
