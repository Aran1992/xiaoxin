import {Container, NineSlicePlane, Sprite, Text} from "../libs/pixi-wrapper";
import Config from "../config";
import Utils from "../mgr/Utils";
import MusicMgr from "../mgr/MusicMgr";
import ImageText from "./ImageText";

let clickPredicate = () => true;

export default class UIHelper {
    static uiClone(displayObject, root, parent) {
        let displayObject_ = UIHelper.copy(displayObject, parent);
        if (root === undefined) {
            root = displayObject_;
            root.ui = {};
        }
        if (displayObject_.uiname) {
            root.ui[displayObject_.uiname] = displayObject_;
        }
        if (!(displayObject instanceof ImageText)) {
            displayObject.children.forEach(child => {
                displayObject_.addChild(UIHelper.uiClone(child, root, displayObject_));
            });
        }
        return displayObject_;
    }

    static initUIRoot(displayObject, root) {
        if (root === undefined) {
            root = displayObject;
            root.ui = {};
        }
        if (displayObject.uiname) {
            root.ui[displayObject.uiname] = displayObject;
        }
        displayObject.children.forEach(child => UIHelper.initUIRoot(child, root));
    }

    static clone(displayObject) {
        let displayObject_ = UIHelper.copy(displayObject);
        displayObject.children.forEach(child => {
            displayObject_.addChild(UIHelper.clone(child));
        });
        return displayObject_;
    }

    static copy(displayObject, parent) {
        let item;
        if (displayObject instanceof ImageText) {
            item = UIHelper.copyImageText(displayObject, parent);
        } else if (displayObject instanceof Text) {
            item = UIHelper.copyText(displayObject);
        } else if (displayObject instanceof Sprite) {
            item = UIHelper.copySprite(displayObject);
        } else if (displayObject instanceof NineSlicePlane) {
            item = UIHelper.copyNineSlicePlane(displayObject);
        } else if (displayObject instanceof Container) {
            item = UIHelper.copyContainer(displayObject);
        }
        if (displayObject.uiname) {
            item.uiname = displayObject.uiname;
        }
        if (displayObject.clickSoundPath) {
            item.clickSoundPath = displayObject.clickSoundPath;
        }
        return item;
    }

    static copyContainer(src) {
        let dst = new Container();
        dst.alpha = src.alpha;
        dst.buttonMode = src.buttonMode;
        dst.hitArea = src.hitArea;
        dst.interactive = src.interactive;
        dst.rotation = src.rotation;
        dst.scale.set(src.scale.x, src.scale.y);
        dst.visible = src.visible;
        dst.x = src.x;
        dst.y = src.y;
        dst.mywidth = src.mywidth;
        dst.myheight = src.myheight;
        return dst;
    }

    static copySprite(src) {
        let dst = new Sprite();
        dst.alpha = src.alpha;
        dst.anchor.set(src.anchor.x, src.anchor.y);
        dst.buttonMode = src.buttonMode;
        dst.interactive = src.interactive;
        dst.rotation = src.rotation;
        dst.scale.set(src.scale.x, src.scale.y);
        dst.texture = src.texture;
        dst.visible = src.visible;
        dst.x = src.x;
        dst.y = src.y;
        dst.mywidth = src.mywidth;
        dst.myheight = src.myheight;
        return dst;
    }

    static copyText(src) {
        let dst = new Text(src.text, src.style);
        dst.alpha = src.alpha;
        dst.anchor.set(src.anchor.x, src.anchor.y);
        dst.buttonMode = src.buttonMode;
        dst.interactive = src.interactive;
        dst.rotation = src.rotation;
        dst.scale.set(src.scale.x, src.scale.y);
        dst.visible = src.visible;
        dst.x = src.x;
        dst.y = src.y;
        dst.mywidth = src.mywidth;
        dst.myheight = src.myheight;
        return dst;
    }

    static copyImageText(src, parent) {
        const dst = new ImageText(src.data, parent);
        dst.alpha = src.alpha;
        dst.buttonMode = src.buttonMode;
        dst.interactive = src.interactive;
        dst.rotation = src.rotation;
        dst.visible = src.visible;
        dst.x = src.x;
        dst.y = src.y;
        dst.width = src.width;
        dst.height = src.height;
        dst.mywidth = src.mywidth;
        dst.myheight = src.myheight;
        return dst;
    }

    static copyNineSlicePlane(src) {
        let dst = new NineSlicePlane(src.texture, src.leftWidth, src.topHeight, src.rightWidth, src.bottomHeight);
        dst.alpha = src.alpha;
        dst.buttonMode = src.buttonMode;
        dst.interactive = src.interactive;
        dst.rotation = src.rotation;
        dst.visible = src.visible;
        dst.x = src.x;
        dst.y = src.y;
        dst.width = src.width;
        dst.height = src.height;
        dst.mywidth = src.mywidth;
        dst.myheight = src.myheight;
        return dst;
    }

    static onClick(button, handler, noScale, params = {}) {
        button.buttonMode = true;
        button.interactive = true;
        button.on("pointerdown", (event) => {
            if (!params.noControl && !clickPredicate(button)) {
                return;
            }
            button.clickPoint = {x: event.data.global.x, y: event.data.global.y};
            if (!noScale) {
                button.originScaleX = button.scale.x;
                button.originScaleY = button.scale.y;
                button.scale.set(button.originScaleX * Config.buttonClickScale, button.originScaleY * Config.buttonClickScale);
                let {moveX, moveY} = UIHelper.calcButtonMove(button);
                let x = button.x - moveX;
                let y = button.y - moveY;
                button.position.set(x, y);
            }
        });
        button.on("pointerup", (event) => {
            if (!params.noControl && !clickPredicate(button)) {
                return;
            }
            if (this.controlClickCallback) {
                this.controlClickCallback();
            }
            if (button.clickPoint) {
                if (!noScale) {
                    button.scale.set(button.originScaleX, button.originScaleY);
                    let {moveX, moveY} = UIHelper.calcButtonMove(button);
                    let x = button.x + moveX;
                    let y = button.y + moveY;
                    button.position.set(x, y);
                }
                if (Utils.isPointInRect(
                    {x: event.data.global.x, y: event.data.global.y},
                    {
                        x: button.clickPoint.x - Config.buttonClickOffset,
                        y: button.clickPoint.y - Config.buttonClickOffset,
                        width: Config.buttonClickOffset * 2,
                        height: Config.buttonClickOffset * 2,
                    })) {
                    handler(button, event);
                    if (button.clickSoundPath) {
                        MusicMgr.playSound(button.clickSoundPath);
                    }
                }
                button.clickPoint = undefined;
            }
        });
        button.on("pointerupoutside", () => {
            if (!params.noControl && !clickPredicate(button)) {
                return;
            }
            if (button.clickPoint) {
                button.clickPoint = undefined;
                if (!noScale) {
                    button.scale.set(button.originScaleX, button.originScaleY);
                    let {moveX, moveY} = UIHelper.calcButtonMove(button);
                    let x = button.x + moveX;
                    let y = button.y + moveY;
                    button.position.set(x, y);
                }
            }
        });
    }

    static controlClick(predicate, callback) {
        clickPredicate = predicate;
        this.controlClickCallback = callback;
    }

    static freeClick() {
        clickPredicate = () => true;
        delete this.controlClickCallback;
    }

    static getClickPredicate() {
        return clickPredicate;
    }

    static calcButtonMove(button) {
        let oldwidth = button.mywidth * button.originScaleX;
        let oldheight = button.myheight * button.originScaleY;
        let newwidth = oldwidth * Config.buttonClickScale;
        let newheight = oldheight * Config.buttonClickScale;
        let moveX = (newwidth - oldwidth) / 2;
        let moveY = (newheight - oldheight) / 2;
        return {moveX: moveX, moveY: moveY};
    }
}
