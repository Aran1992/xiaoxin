import {Container, Sprite} from "../libs/pixi-wrapper";
import Config from "../config";

export default class ImageText extends Sprite {
    constructor(data, parent) {
        super();
        this.data = data;
        this.fontFamily = this.data.font;
        this.config = Config.imageText[this.fontFamily];
        this._text = "";
        this.mycontainer = this.addChild(new Container());
        this.mycontainer.mywidth = 0;
        this.mycontainer.myheight = this.config.charHeight;
        this.updateHAlign("left");
        this.updateVAlign("top");

        if (data.left !== undefined) {
            this.setHAlign("left", data.left);
        } else if (data.right !== undefined) {
            this.setHAlign("right", parent.mywidth - data.right);
        } else if (data.centerX !== undefined) {
            this.setHAlign("center", parent.mywidth / 2);
        } else if (data.x !== undefined) {
            this.setHAlign("left", data.x);
        }

        if (data.top !== undefined) {
            this.setVAlign("top", data.top);
        } else if (data.bottom !== undefined) {
            this.setVAlign("bottom", parent.myheight - data.bottom);
        } else if (data.centerY !== undefined) {
            this.setVAlign("center", parent.myheight / 2);
        } else if (data.y !== undefined) {
            this.setVAlign("top", data.y);
        }

        if (data.scaleX !== undefined) {
            this.scale.x = data.scaleX;
        }

        if (data.scaleY !== undefined) {
            this.scale.y = data.scaleY;
        }

        this.text = data.text;
    }

    set text(text) {
        if (text === undefined || text === null) {
            text = "";
        }
        text = text.toString();
        if (this._text === text) {
            return;
        }
        this._text = text;
        this.mycontainer.removeChildren();
        const lines = this._text.split("\n");
        this.mycontainer.mywidth = 0;
        this.mycontainer.myheight = this.config.charHeight * lines.length;
        lines.forEach((line, lineIndex) => {
            const chars = line.split("");
            let lastX = 0;
            chars.forEach(char => {
                const path = this.config.charImgPathTable[char];
                if (path) {
                    let sprite = Sprite.from(path);
                    let charHeight = sprite.texture.height;
                    sprite.x = lastX;
                    lastX += sprite.width;
                    sprite.y = lineIndex * this.config.charHeight + this.config.charHeight - charHeight;
                    this.mycontainer.addChild(sprite);
                }
            });
            if (lastX > this.mycontainer.mywidth) {
                this.mycontainer.mywidth = lastX;
            }
        });
        this.updateHAlign(this.hAlign);
        this.updateVAlign(this.vAlign);
    }

    setHAlign(hAlign, x) {
        this.x = x;
        this.updateHAlign(hAlign);
    }

    setVAlign(vAlign, y) {
        this.y = y;
        this.updateVAlign(vAlign);
    }

    updateHAlign(hAlign) {
        this.hAlign = hAlign || this.hAlign;
        switch (this.hAlign) {
            case "left": {
                this.mycontainer.x = 0;
                break;
            }
            case "right": {
                this.mycontainer.x = -this.mycontainer.mywidth;
                break;
            }
            case "center": {
                this.mycontainer.x = -this.mycontainer.mywidth / 2;
            }
        }
    }

    updateVAlign(vAlign) {
        this.vAlign = vAlign || this.vAlign;
        switch (this.vAlign) {
            case "top": {
                this.mycontainer.y = 0;
                break;
            }
            case "bottom": {
                this.mycontainer.y = -this.mycontainer.myheight;
                break;
            }
            case "center": {
                this.mycontainer.y = -this.mycontainer.myheight / 2;
            }
        }
    }
}
