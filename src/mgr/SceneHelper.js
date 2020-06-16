import Config from "../config";
import {
    Container,
    Graphics,
    NineSlicePlane,
    resources,
    Sprite,
    Text,
    TextInput,
    TextStyle,
    Texture
} from "../libs/pixi-wrapper";
import ScrollView from "../ui/ScrollView";
import ImageText from "../ui/ImageText";

function getValue(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    } else {
        return value;
    }
}

function createSceneByData(sceneData, sceneContainer, clickThrough) {
    sceneContainer.mywidth = App.sceneWidth;
    sceneContainer.myheight = App.sceneHeight;
    sceneContainer.interactive = !clickThrough;
    sceneContainer.ui = {};
    sceneContainer.uiWithID = {};
    let callbackList = [];
    sceneData.child.forEach(child => {
        if (!child.label.startsWith("Guide")) {
            sceneContainer.addChild(createSceneChild(child, sceneContainer, sceneContainer.ui, sceneContainer.uiWithID, callbackList));
        }
    });
    callbackList.forEach(callback => callback());
}

function createScene(path, sceneContainer) {
    let sceneData = resources[path].data;
    return createSceneByData(sceneData, sceneContainer);
}

function createSceneChild(child, parent, root, idRoot, callbackList) {
    let data = child.props;
    let item;
    switch (child.type) {
        case "Panel": {
            item = createPanel(child, parent);
            break;
        }
        case "Image": {
            item = createImage(child, parent);
            break;
        }
        case "Label": {
            item = createLabel(child, parent);
            break;
        }
        case "TextInput": {
            item = createTextInput(child, parent);
            break;
        }
        default: {
            throw `不支持的场景元素类型：${child.type}`;
        }
    }
    if (data.var !== undefined) {
        root[data.var] = item;
        item.var = data.var;
    }
    if (child.compId !== undefined) {
        idRoot[child.compId] = item;
    }
    if (data.name) {
        item.uiname = data.name;
    }
    if (data.runtime) {
        item.clickSoundPath = data.runtime.replace("../", "myLaya/");
    }
    child.child.forEach(child => item.addChild(createSceneChild(child, item, root, idRoot, callbackList)));
    if (data.layoutEnabled !== undefined) {
        callbackList.push((() => {
            item.scrollView = new ScrollView({root: item, isHorizontal: data.layoutEnabled});
        }));
    }
    return item;
}

function createPanel(child, parent) {
    let baseInfo = getPanelBaseInfo(child, parent, {width: 100, height: 100});

    let panel = new Container();

    panel.mywidth = baseInfo.width;
    panel.myheight = baseInfo.height;

    panel.x = baseInfo.x;
    panel.y = baseInfo.y;

    panel.scale.set(baseInfo.scaleX, baseInfo.scaleY);

    panel.rotation = baseInfo.rotation;

    panel.alpha = baseInfo.alpha;

    panel.visible = baseInfo.visible;

    return panel;
}

function createImage(child, parent) {
    let data = child.props;
    let sprite;
    if (data.sizeGrid) {
        sprite = createScale9Image(child, parent);
    } else {
        sprite = createCommonImage(child, parent);
    }
    sprite.rotation = getValue(data.rotation, 0) / 180 * Math.PI;
    sprite.alpha = getValue(data.alpha, 1);
    sprite.visible = getValue(data.visible, true);
    return sprite;
}

function createCommonImage(child, parent) {
    let data = child.props;
    let texture, width, height;
    if (data.skin !== undefined) {
        let path = `myLaya/laya/assets/${data.skin}`;
        texture = Texture.from(path);
        width = texture ? getValue(data.width, texture.width) : 0;
        height = texture ? getValue(data.height, texture.height) : 0;
    } else {
        width = getValue(data.width, 0);
        height = getValue(data.height, 0);
    }
    let scaleX = getValue(data.scaleX, 1);
    let scaleY = getValue(data.scaleY, 1);
    let x = getValue(data.x, 0);
    let y = getValue(data.y, 0);

    if (data.left !== undefined && data.right !== undefined) {
        x = data.left;
        width = parent.mywidth - data.left - data.right;
    } else if (data.left !== undefined) {
        x = data.left;
    } else if (data.right !== undefined) {
        x = parent.mywidth - data.right - width * scaleX;
    } else if (data.centerX !== undefined) {
        x = parent.mywidth / 2 + data.centerX - width * scaleX / 2;
    }

    if (data.top !== undefined && data.bottom !== undefined) {
        y = data.top;
        height = parent.myheight - data.top - data.bottom;
    } else if (data.top !== undefined) {
        y = data.top;
    } else if (data.bottom !== undefined) {
        y = parent.myheight - data.bottom - height * scaleY;
    } else if (data.centerY !== undefined) {
        y = parent.myheight / 2 + data.centerY - height * scaleY / 2;
    }

    let container = new Container();

    let sprite = new Sprite();
    sprite.texture = texture;
    sprite.width = width;
    sprite.height = height;

    container.addChild(sprite);

    container.mywidth = width;
    container.myheight = height;
    container.scale.set(scaleX, scaleY);
    container.position.set(x, y);

    return container;
}

function createScale9Image(child, parent) {
    let data = child.props;
    let [top, right, bottom, left] = data.sizeGrid.split(",").map(str => parseInt(str));
    let texture, width, height, sprite;
    if (data.skin === undefined) {
        width = data.width || 0;
        height = data.height || 0;
        sprite = new Sprite();
    } else {
        let path = `myLaya/laya/assets/${data.skin}`;
        texture = Texture.from(path);
        width = getValue(data.width, texture.width);
        height = getValue(data.height, texture.height);
        sprite = new NineSlicePlane(texture, left, top, right, bottom);
    }
    let x = getValue(data.x, 0);
    let y = getValue(data.y, 0);

    if (data.left !== undefined && data.right !== undefined) {
        x = data.left;
        width = parent.mywidth - data.left - data.right;
    } else if (data.left !== undefined) {
        x = data.left;
    } else if (data.right !== undefined) {
        x = parent.mywidth - data.right - width;
    } else if (data.centerX !== undefined) {
        x = parent.mywidth / 2 + data.centerX - width / 2;
    }

    if (data.top !== undefined && data.bottom !== undefined) {
        y = data.top;
        height = parent.myheight - data.top - data.bottom;
    } else if (data.top !== undefined) {
        y = data.top;
    } else if (data.bottom !== undefined) {
        y = parent.myheight - data.bottom - height;
    } else if (data.centerY !== undefined) {
        y = parent.myheight / 2 + data.centerY - height / 2;
    }

    sprite.width = width;
    sprite.height = height;
    sprite.mywidth = width;
    sprite.myheight = height;
    sprite.x = x;
    sprite.y = y;
    return sprite;
}

function createImageText(child, parent) {
    let data = child.props;
    return new ImageText(data, parent);
}

function createLabel(child, parent) {
    let data = child.props;

    if (Config.imageText[data.font]) {
        return createImageText(child, parent);
    }

    let x = getValue(data.x, 0);
    let y = getValue(data.y, 0);

    let anchorX = getValue(data.anchorX, 0);
    let anchorY = getValue(data.anchorY, 0);

    let scaleX = getValue(data.scaleX, 1);
    let scaleY = getValue(data.scaleY, 1);

    let rotation = getValue(data.rotation, 0) / 180 * Math.PI;

    let alpha = getValue(data.alpha, 1);

    let visible = getValue(data.visible, 1);

    if (data.left !== undefined && data.right !== undefined) {
        anchorX = 0;
        x = data.left;
    } else if (data.left !== undefined) {
        anchorX = 0;
        x = data.left;
    } else if (data.right !== undefined) {
        anchorX = 1;
        x = parent.mywidth - data.right;
    } else if (data.centerX !== undefined) {
        anchorX = 0.5;
        x = parent.mywidth / 2 + data.centerX;
    }

    if (data.top !== undefined && data.bottom !== undefined) {
        anchorY = 0;
        y = data.top;
    } else if (data.top !== undefined) {
        anchorY = 0;
        y = data.top;
    } else if (data.bottom !== undefined) {
        anchorY = 1;
        y = parent.myheight - data.bottom;
    } else if (data.centerY !== undefined) {
        anchorY = 0.5;
        y = parent.myheight / 2 + data.centerY;
    }

    let text = createTextFromData(data);

    text.anchor.set(anchorX, anchorY);

    text.x = x;
    text.y = y;

    text.scale.set(scaleX, scaleY);

    text.rotation = rotation;

    text.alpha = alpha;

    text.visible = visible;

    return text;
}

function generateBox(w, h) {
    const box = new Container();
    const g = new Graphics();
    g.beginFill(0xffffff);
    g.drawRect(0, 0, w, h);
    g.endFill();
    box.addChild(g);
    return box;
}

function createTextInput(child, parent) {
    let data = child.props;

    let width = getValue(data.width, 100);
    let height = getValue(data.height, 100);
    let fontSize = getValue(data.fontSize, 12);

    let inputStyle = {
        fontSize: `${fontSize}px`,
        padding: `${(height - fontSize) / 2}px`,
        width: `${width}px`,
        color: "#26272E"
    };

    let item = new TextInput({
        input: inputStyle,
        box: generateBox
    });

    item.placeholder = data.prompt;

    let x = 0, y = 0;

    if (data.centerX !== undefined) {
        x = parent.mywidth / 2 + data.centerX - width / 2;
    }

    if (data.centerY !== undefined) {
        y = parent.myheight / 2 + data.centerY - height / 2;
    }

    item.position.set(x, y);

    return item;
}

function getPanelBaseInfo(child, parent, defaultInfo) {
    let data = child.props;

    let x = getValue(data.x, 0);
    let y = getValue(data.y, 0);

    let width = getValue(data.width, defaultInfo.width);
    let height = getValue(data.height, defaultInfo.height);

    let anchorX = getValue(data.anchorX, 0);
    let anchorY = getValue(data.anchorY, 0);

    let scaleX = getValue(data.scaleX, 1);
    let scaleY = getValue(data.scaleY, 1);

    let rotation = getValue(data.rotation, 0) / 180 * Math.PI;

    let alpha = getValue(data.alpha, 1);

    let visible = getValue(data.visible, true);

    if (data.left !== undefined && data.right !== undefined) {
        x = data.left;
        width = parent.mywidth - data.left - data.right;
    } else if (data.left !== undefined) {
        x = data.left;
    } else if (data.right !== undefined) {
        x = parent.mywidth - data.right - width;
    } else if (data.centerX !== undefined) {
        x = parent.mywidth / 2 - width / 2 + data.centerX;
    }

    if (data.top !== undefined && data.bottom !== undefined) {
        y = data.top;
        height = parent.myheight - data.top - data.bottom;
    } else if (data.top !== undefined) {
        y = data.top;
    } else if (data.bottom !== undefined) {
        y = parent.myheight - data.bottom - height;
    } else if (data.centerY !== undefined) {
        y = parent.myheight / 2 - height / 2 + data.centerY;
    }

    return {
        x, y,
        width, height,
        anchorX, anchorY,
        scaleX, scaleY,
        rotation, alpha, visible
    };
}

function createTextFromData(data) {
    let textContent = getValue(data.text, "").replace(/\${.*?}/g, id => resources[Config.i18nPath].data[id.substring(2, id.length - 1)]);
    let fill = getValue(data.color, "black");
    let fontSize = getValue(data.fontSize, 10);
    let fontFamily = getValue(data.font);
    let width = getValue(data.width);
    let textStyle = {
        fill: fill,
        fontFamily: "arial",
        fontSize: fontSize,
        wordWrap: false,
        leading: getValue(data.leading, 0),
        padding: 5,
    };
    if (getValue(data.strokeColor) !== undefined) {
        textStyle.stroke = getValue(data.strokeColor);
    }
    if (getValue(data.stroke) !== undefined) {
        textStyle.strokeThickness = getValue(data.stroke);
    }
    if (fontFamily) {
        textStyle.fontFamily = fontFamily;
    }
    if (width !== undefined) {
        textStyle.wordWrap = true;
        textStyle.wordWrapWidth = width;
    }
    return new Text(textContent, new TextStyle(textStyle));
}

export default {createScene, createTextFromData, createSceneByData};

