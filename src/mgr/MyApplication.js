import Config from "../config";
import {
    AnimatedSprite,
    Application,
    Container,
    Graphics,
    loader,
    Rectangle,
    resources,
    Text,
    TextStyle,
    Texture
} from "../libs/pixi-wrapper";
import MapGameScene from "../scene/MapGameScene";
import EndlessGameScene from "../scene/EndlessGameScene";
import LevelGameScene from "../scene/LevelGameScene";
import GameOverScene from "../scene/GameOverScene";
import PauseScene from "../scene/PauseScene";
import MainScene from "../scene/MainScene";
import ShopScene from "../scene/ShopScene";
import DrawScene from "../scene/DrawScene";
import BikeScene from "../scene/BikeScene";
import TipScene from "../scene/TipScene";
import GameResultScene from "../scene/GameResultScene";
import SystemScene from "../scene/SystemScene";
import HomeScene from "../scene/HomeScene";
import UIHelper from "../ui/UIHelper";
import RankScene from "../scene/RankScene";
import RegisterScene from "../scene/RegisterScene";
import LoginScene from "../scene/LoginScene";
import MusicMgr from "./MusicMgr";
import PreparationScene from "../scene/PreparationScene";
import GiftScene from "../scene/GiftScene";
import PrizeScene from "../scene/PrizeScene";
import SignScene from "../scene/SignScene";
import HelpHomeScene from "../scene/HelpHomeScene";
import LoadingScene from "../scene/LoadingScene";
import HelpEndlessScene from "../scene/HelpEndlessScene";
import HelpMatchScene from "../scene/HelpMatchScene";
import EventMgr from "./EventMgr";
import NewContentScene from "../scene/NewContentScene";
import BikeDetailScene from "../scene/BikeDetailScene";
import GameLevelFailedScene from "../scene/GameLevelFailedScene";
import GameLevelResultScene from "../scene/GameLevelResultScene";
import HelpGameLevelScene from "../scene/HelpGameLevelScene";
import GameLevelScene from "../scene/GameLevelScene";
import TWEEN from "@tweenjs/tween.js";
import GuideGameScene from "../scene/GuideGameScene";
import LevelUpScene from "../scene/LevelUpScene";
import GameOverRebornScene from "../scene/GameOverRebornScene";
import InfoScene from "../scene/InfoScene";
import GameLevelRebornScene from "../scene/GameLevelRebornScene";
import Utils from "./Utils";

export default class MyApplication extends Application {
    constructor(args) {
        super(args);

        window.App = this;

        this.realWidth = args.width;

        let wwhRatio = args.width / args.height;
        let dwhRatio = Config.designWidth / Config.designHeight;
        if (Config.designWidth < Config.designHeight) {
            if (wwhRatio >= dwhRatio) {
                this.sceneWidth = Config.designWidth;
                this.sceneHeight = Config.designHeight;
            } else {
                this.sceneWidth = Config.designWidth;
                this.sceneHeight = Config.designWidth / args.width * args.height;
            }
        } else {
            if (wwhRatio >= dwhRatio) {
                this.sceneHeight = Config.designHeight;
                this.sceneWidth = Config.designHeight / args.height * args.width;
            } else {
                this.sceneWidth = Config.designWidth;
                this.sceneHeight = Config.designHeight;
            }
        }

        this.root = this.stage.addChild(new Container());
        let x = (args.width - this.sceneWidth) / 2;
        let y = (args.height - this.sceneHeight) / 2;
        this.root.mask = new Graphics()
            .beginFill()
            .drawRect(x, y, this.sceneWidth, this.sceneHeight)
            .endFill();
        this.root.position.set(x, y);

        this.scenesContainer = new Container();
        this.root.addChild(this.scenesContainer);

        this.uiGuidePanelContainer = this.root.addChild(new Container());

        this.maskShowCount = 0;
        this.mask = this.root.addChild(new Container());
        this.mask.hitArea = new Rectangle(0, 0, this.sceneWidth, this.sceneHeight);
        this.mask.visible = false;
        UIHelper.onClick(this.mask, () => this.clickMaskCallback && this.clickMaskCallback(), true);

        this.createLoadScene();

        this.sceneNameClassMap = {
            "MainScene": MainScene,
            "MapGameScene": MapGameScene,
            "EndlessGameScene": EndlessGameScene,
            "LevelGameScene": LevelGameScene,
            "GuideGameScene": GuideGameScene,
            "LevelUpScene": LevelUpScene,
            "GameOverScene": GameOverScene,
            "PauseScene": PauseScene,
            "HomeScene": HomeScene,
            "ShopScene": ShopScene,
            "DrawScene": DrawScene,
            "BikeScene": BikeScene,
            "TipScene": TipScene,
            "GameResultScene": GameResultScene,
            "SystemScene": SystemScene,
            "RankScene": RankScene,
            "RegisterScene": RegisterScene,
            "LoginScene": LoginScene,
            "PreparationScene": PreparationScene,
            "GiftScene": GiftScene,
            "PrizeScene": PrizeScene,
            "SignScene": SignScene,
            "HelpHomeScene": HelpHomeScene,
            "LoadingScene": LoadingScene,
            "HelpEndlessScene": HelpEndlessScene,
            "HelpMatchScene": HelpMatchScene,
            "HelpGameLevelScene": HelpGameLevelScene,
            "NewContentScene": NewContentScene,
            "BikeDetailScene": BikeDetailScene,
            "GameLevelFailedScene": GameLevelFailedScene,
            "GameLevelResultScene": GameLevelResultScene,
            "GameLevelScene": GameLevelScene,
            "GameOverRebornScene": GameOverRebornScene,
            "InfoScene": InfoScene,
            "GameLevelRebornScene": GameLevelRebornScene,
        };

        this.sceneTable = {};

        this.listenGameRunStatus();

        this.waitLoadList = [];

        this.ticker.add(this.onTick.bind(this));

        this.sceneShowCallbackTable = {};
    }

    showScene(sceneName, ...args) {
        if (this.sceneTable[sceneName] === undefined) {
            let sceneClass = this.sceneNameClassMap[sceneName];
            this.sceneTable[sceneName] = new sceneClass();
            this.scenesContainer.addChild(this.sceneTable[sceneName]);
            this.sceneTable[sceneName].create(sceneName, () => {
                this.sceneTable[sceneName].show(...args);
            });
        } else {
            this.sceneTable[sceneName].show(...args);
        }
    }

    hideScene(sceneName) {
        if (this.sceneTable[sceneName]) {
            this.sceneTable[sceneName].hide();
        }
    }

    getScene(sceneName) {
        return this.sceneTable[sceneName];
    }

    destroyScene(sceneName) {
        if (this.sceneTable[sceneName]) {
            this.sceneTable[sceneName].destroy();
            this.sceneTable[sceneName] = undefined;
        }
    }

    hasLoadResource(path) {
        if (resources[path] !== undefined && resources[path].isComplete) {
            return true;
        }
        return MusicMgr.hasLoadedAudio(path);
    }

    loadResources(resPathList, onLoadedCallback, onProgressCallback, minLoadTime = 0, count = 0) {
        if (loader.loading) {
            this.waitLoadList.push([resPathList, onLoadedCallback, onProgressCallback, minLoadTime, count]);
            return;
        }

        let loadNextRes = () => {
            const next = this.waitLoadList.shift();
            if (next) {
                this.loadResources(...next);
            }
        };

        let start = new Date().getTime();
        resPathList = Array.from(new Set(resPathList));
        resPathList = resPathList.filter(path => resources[path] === undefined && !MusicMgr.hasLoadedAudio(path));
        this.loadList = resPathList.map(path => [path, false]);
        if (onProgressCallback === undefined) {
            this.loadScene.visible = true;
        }
        this.updateLoadText();
        let commonResPathList = [];
        let audioResPathList = [];
        let isMusicLoaded = false;
        let isCommonLoaded = false;
        resPathList.forEach(path => {
            if (path) {
                if ([".mp3", ".ogg", ".m4a", ".wav",].some(end => path.endsWith(end))) {
                    audioResPathList.push(path);
                } else {
                    commonResPathList.push(path);
                }
            } else {
                console.log("path===undefined,resPathList=", resPathList);
            }
        });

        let onLoadedResource = () => {
            if (isMusicLoaded && isCommonLoaded) {
                this.onLoadEnded();
                let list = this.parsePrefabDependRes(commonResPathList);
                let end = new Date().getTime();
                let remain = minLoadTime - (end - start);
                if (list.length !== 0) {
                    this.loadResources(list, onLoadedCallback, onProgressCallback, remain, count + 1);
                } else {
                    if (remain <= 0) {
                        onLoadedCallback();
                        loadNextRes();
                    } else {
                        setTimeout(() => {
                            onProgressCallback(100);
                            onLoadedCallback();
                            loadNextRes();
                        }, remain);
                    }
                }
            }
        };

        MusicMgr.loadAudioRes(audioResPathList, () => {
            isMusicLoaded = true;
            onLoadedResource();
        });
        loader
            .add(commonResPathList)
            .on("progress", (loader, resource) => {
                if (isCommonLoaded) {
                    return;
                }
                let item = this.loadList.find(item => resource.url === item[0]);
                if (item) {
                    item[1] = true;
                    this.updateLoadText();
                }
                onProgressCallback && onProgressCallback(this.calcLoadProgress(count, this.loadList));
            })
            .load(() => {
                isCommonLoaded = true;
                onLoadedResource();
            });
    }

    parsePrefabDependRes(resPathList) {
        let handle = (list, data) => {
            if (data.props.skin) {
                list.push(`myLaya/laya/assets/${data.props.skin}`);
            }
            if (data.props.source) {
                list.push(`myLaya/laya/assets/${data.props.source}`);
            }
            if (data.props.texture) {
                list.push(`myLaya/laya/assets/${data.props.texture}`);
            }
            if (data.props.preset) {
                list.push(`myLaya/${data.props.preset}`);
            }
            if (data.props.runtime) {
                list.push(data.props.runtime.replace("../", "myLaya/"));
            }
            data.child.forEach(child => handle(list, child));
        };
        let list = [];
        resPathList.forEach(path => {
            if (path.endsWith(".scene.json") || path.endsWith(".prefab.json")) {
                handle(list, resources[path].data);
            }
        });
        return list;
    }

    createLoadScene() {
        this.loadScene = this.root.addChild(new Container());

        this.loadScene.addChild(
            new Graphics()
                .beginFill(0x000000, 0.5)
                .drawRect(0, 0, this.sceneWidth, this.sceneHeight)
                .endFill()
        );

        this.loadText = this.loadScene.addChild(new Text("", new TextStyle({
            fontSize: 50,
            fill: "white",
            wordWrap: true,
            wordWrapWidth: this.sceneWidth,
        })));
        this.loadText.anchor.set(0.5, 0);
        this.loadText.position.set(this.sceneWidth / 2, this.sceneHeight / 2 + 50);

        this.loadSprite = this.loadScene.addChild(new AnimatedSprite(Config.loadingImagePathList.map(path => Texture.from(path))));
        this.loadSprite.animationSpeed = 0.5;
        this.loadSprite.anchor.set(0.5, 0.5);
        this.loadSprite.position.set(this.sceneWidth / 2, this.sceneHeight / 2 - 50);
        this.loadSprite.play();
    }

    updateLoadText() {
        // this.loadText.text = this.loadList.map(item => `${item[0]}:${item[1] ? "loaded" : "loading"}`).join("\n");
        this.loadText.text = `${Math.floor(this.loadList.reduce((sum, item) => sum + (item[1] ? 1 : 0), 0) / this.loadList.length * 100)}%`;
    }

    calcLoadProgress(count, loadList) {
        let sum = 0;
        for (let i = 1; i <= count; i++) {
            sum += Math.pow(0.5, i);
        }
        const percent = loadList.reduce((sum, item) => sum + (item[1] ? 1 : 0), 0) / loadList.length;
        sum += Math.pow(0.5, count + 1) * percent;
        return sum * 100;
    }

    onLoadEnded() {
        this.loadScene.visible = false;
    }

    showMask(clickMaskCallback) {
        this.maskShowCount++;
        this.mask.visible = true;
        this.clickMaskCallback = clickMaskCallback;
    }

    hideMask() {
        if (this.maskShowCount > 0) {
            this.maskShowCount--;
        }
        if (this.maskShowCount === 0) {
            this.mask.visible = false;
        }
    }

    showNotice(notice) {
        let container = new Container();

        let margin = Config.notice.margin;

        let text = new Text(notice, new TextStyle({
            fill: Config.notice.fill,
            fontSize: Config.notice.fontSize,
            wordWrap: true,
            wordWrapWidth: App.sceneWidth * 0.8,
        }));
        text.position.set(margin / 2, margin / 2);

        let mask = new Graphics();
        mask.beginFill(Config.notice.backgroundColor, Config.notice.backgroundAlpha);
        mask.drawRect(0, 0, text.width + margin, text.height + margin);
        mask.endFill();

        container.addChild(mask);
        container.addChild(text);

        container.position.set(this.sceneWidth / 2 - text.width / 2, Config.notice.positionY);
        this.root.addChild(container);

        setTimeout(() => {
            let reduce = 1000 / 60 / Config.notice.fadeDuration;
            let handler = () => {
                container.alpha -= reduce;
                if (container.alpha < 0) {
                    container.destroy();
                } else {
                    requestAnimationFrame(handler);
                }
            };
            handler();
        }, Config.notice.duration);
    }

    showTip(tip, confirmCallback, cancelCallback, hideConfirmButton) {
        App.showScene("TipScene", {tip, confirmCallback, cancelCallback, hideConfirmButton});
    }

    getText(id, args) {
        let base = resources[Config.i18nPath].data[id] || id;
        if (args) {
            base = base.replace(/\$\{.*?\}/g, match => args[match.substring(2, match.length - 1)]);
        }
        return base;
    }

    getGlobalPosition(displayObject) {
        let {x, y} = displayObject.getGlobalPosition();
        return {
            x: x - this.root.x,
            y: y - this.root.y
        };
    }

    trans2GlobalPosition({x, y}) {
        return {
            x: x - this.root.x,
            y: y - this.root.y
        };
    }

    listenGameRunStatus() {
        function getHiddenProp() {
            let prefixes = ["webkit", "moz", "ms", "o"];
            if ("hidden" in document) return "hidden";
            for (let i = 0; i < prefixes.length; i++) {
                if ((prefixes[i] + "Hidden") in document)
                    return prefixes[i] + "Hidden";
            }
        }

        function getVisibilityState() {
            let prefixes = ["webkit", "moz", "ms", "o"];
            if ("visibilityState" in document) return "visibilityState";
            for (let i = 0; i < prefixes.length; i++) {
                if ((prefixes[i] + "VisibilityState") in document)
                    return prefixes[i] + "VisibilityState";
            }
        }

        let visProp = getHiddenProp();
        if (visProp) {
            let evtname = visProp.replace(/[H|h]idden/, "") + "visibilitychange";
            document.addEventListener(evtname, function () {
                if (document[getVisibilityState()] === "visible") {
                    EventMgr.dispatchEvent("GameStart");
                } else {
                    EventMgr.dispatchEvent("GameStop");
                }
            }, false);
        }
    }

    onTick() {
        TWEEN.update(performance.now());
    }

    registerOnSceneShowOnTop(sceneName, callback) {
        let cbList = this.sceneShowCallbackTable[sceneName];
        if (cbList === undefined) {
            cbList = [];
            this.sceneShowCallbackTable[sceneName] = cbList;
        }
        cbList.push(callback);
    }

    onSceneShowOnTop(sceneName) {
        if (this.sceneShowCallbackTable[sceneName]) {
            this.sceneShowCallbackTable[sceneName].forEach(callback => callback());
            this.sceneShowCallbackTable[sceneName] = [];
        }
    }
}
