import {Container, Graphics} from "../libs/pixi-wrapper";
import SceneHelper from "../mgr/SceneHelper";
import GameUtils from "../mgr/GameUtils";
import UIHelper from "../ui/UIHelper";
import Animation from "../ui/Animation";
import Config from "../config";
import DataMgr from "../mgr/DataMgr";

export default class GuidePanel {
    constructor(mgr, gameMgr, panelContainer, data) {
        this.mgr = mgr;
        this.gameMgr = gameMgr;
        this.panelContainer = panelContainer;
        this.data = data;
        this.guidePanel = this.createGuidePanel(data);
        this.playAnimation(data.animations);
    }

    destroy() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
        }
        UIHelper.freeClick();
        if (this.animation) {
            this.animation.stop();
            delete this.animation;
        }
        this.guidePanel.destroy();
    }

    createGuidePanel(data) {
        const panel = new Container();
        SceneHelper.createSceneByData(data, panel, true);
        this.panelContainer.addChild(panel);
        if (GameUtils.getItemProp(data, "蒙版") === "1") {
            this.guideMask = new Graphics()
                .beginFill(0x000000, 0.5)
                .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
                .endFill();
            panel.addChildAt(this.guideMask, 0);
        }
        const showDuration = parseInt(GameUtils.getItemProp(data, "显示时间"));
        if (showDuration) {
            this.showTimer = setTimeout(() => {
                this.onClickGuidePanel();
            }, showDuration * 1000);
        }
        if (GameUtils.getItemProp(data, "暂停直到用户点击") === "1") {
            this.gameMgr.pauseGame();
            UIHelper.onClick(panel, this.onClickGuidePanel.bind(this), true);
            UIHelper.controlClick((button) => button === panel);
        } else if (GameUtils.getItemProp(data, "暂停直到用户跳跃") === "1") {
            this.gameMgr.pauseGame();
            UIHelper.controlClick((button) => {
                if (this.gameMgr.gameContainer === button) {
                    this.onClickGuidePanel();
                    return true;
                }
            });
        } else if (GameUtils.getItemProp(data, "暂停直到用户使用道具") === "1"
            || GameUtils.getItemProp(data, "暂停直到用户使用道具") === "2") {
            this.gameMgr.pauseGame();
            this.guidePanelItemIndex = parseInt(GameUtils.getItemProp(data, "暂停直到用户使用道具"));
            if (this.guideMask) {
                this.guideMask.clear();
                this.guideMask.beginFill(0x000000, 0.5);
                this.guideMask.drawRect(0, 0, App.sceneWidth, App.sceneHeight);
                this.guideMask.beginHole();
                const targetButton = this.gameMgr.ui[`portableItemButton${this.guidePanelItemIndex}`];
                const bounds = targetButton.getBounds();
                const {x, y} = App.trans2GlobalPosition(bounds);
                this.guideMask.drawRoundedRect(x, y, bounds.width, bounds.height, Math.min(bounds.width, bounds.height) * Config.guideRectCornerRadius);
                this.guideMask.endHole();
                this.guideMask.endFill();
                UIHelper.controlClick((button) => targetButton === button, this.onClickGuidePanel.bind(this));
            }
        } else if (GameUtils.getItemProp(data, "暂停直到用户使用子弹时间") === "1") {
            this.gameMgr.pauseGame();
            if (this.guideMask) {
                this.guideMask.clear();
                this.guideMask.beginFill(0x000000, 0.5);
                this.guideMask.drawRect(0, 0, App.sceneWidth, App.sceneHeight);
                this.guideMask.beginHole();
                const targetButton = this.gameMgr.ui.bulletTimeBtn;
                const bounds = targetButton.getBounds();
                const {x, y} = App.trans2GlobalPosition(bounds);
                this.guideMask.drawRoundedRect(x, y, bounds.width, bounds.height, Math.min(bounds.width, bounds.height) * Config.guideRectCornerRadius);
                this.guideMask.endHole();
                this.guideMask.endFill();
                UIHelper.controlClick((button) => targetButton === button, this.onClickGuidePanel.bind(this));
            }
        }
        return panel;
    }

    playAnimation(animations) {
        if (animations) {
            const animation = animations.find(animation => animation.name === "normal");
            if (animation) {
                this.animation = new Animation(this.getChildByID.bind(this), animation, () => this.playAnimation(animations));
            }
        }
    }

    getChildByID(id) {
        return this.guidePanel.uiWithID[id];
    }

    onClickGuidePanel() {
        const guideName = GameUtils.getItemProp(this.data, "引导名称");
        if (guideName) {
            DataMgr.completeGuide(guideName);
        }
        this.gameMgr.resumeGame();
        this.mgr.destroyGuidePanel();
    }
}
