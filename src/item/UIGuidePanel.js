import {Container, Graphics} from "../libs/pixi-wrapper";
import SceneHelper from "../mgr/SceneHelper";
import UIHelper from "../ui/UIHelper";
import Animation from "../ui/Animation";
import Config from "../config";

export default class UIGuidePanel {
    constructor(guideData, mgr, parent) {
        this.mgr = mgr;
        const scene = App.getScene(guideData.scene);
        const panel = new Container();
        SceneHelper.createSceneByData(scene.getGuidePanelData(guideData.panel), panel, true);
        parent.addChild(panel);
        if (guideData.showMask) {
            this.guideMask = new Graphics()
                .beginFill(0x000000, 0.5)
                .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
                .endFill();
            panel.addChildAt(this.guideMask, 0);
        }
        if (guideData.showUtilClick === "guidePanel") {
            UIHelper.onClick(panel, this.onClickGuidePanel.bind(this), true);
            UIHelper.controlClick((button) => button === panel);
        } else if (guideData.showUtilClick !== "") {
            const controlID = guideData.showUtilClick;
            if (controlID !== undefined) {
                const targetButton = scene.ui[controlID];
                if (targetButton) {
                    if (this.guideMask) {
                        this.guideMask.clear();
                        this.guideMask.beginFill(0x000000, 0.5);
                        this.guideMask.drawRect(0, 0, App.sceneWidth, App.sceneHeight);
                        this.guideMask.beginHole();
                        const bounds = targetButton.getBounds();
                        const {x, y} = App.trans2GlobalPosition(bounds);
                        this.guideMask.drawRoundedRect(x, y, bounds.width, bounds.height, Math.min(bounds.width, bounds.height) * Config.guideRectCornerRadius);
                        this.guideMask.endHole();
                        this.guideMask.endFill();
                    }
                    UIHelper.controlClick((button) => targetButton === button, this.onClickGuidePanel.bind(this));
                } else {
                    alert(`引导界面不存在要点击的控件：${controlID}`);
                }
            }
        }
        const remainTime = guideData.showDuration;
        if (remainTime) {
            this.timer = setTimeout(this.onTimeout.bind(this), remainTime * 1000);
        }
        this.guidePanel = panel;
        const animation = scene.getAnimationConfig("normal");
        if (animation) {
            this.playAnimation(animation);
        }
    }

    destroy() {
        UIHelper.freeClick();
        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.animation) {
            this.animation.stop();
            delete this.animation;
        }
        this.guidePanel.destroy();
    }

    playAnimation(animation) {
        this.animation = new Animation(this.getChildByID.bind(this), animation, () => this.playAnimation(animation));
    }

    getChildByID(id) {
        return this.guidePanel.uiWithID[id];
    }

    onClickGuidePanel() {
        this.mgr.destroyUIGuidePanel();
    }

    onTimeout() {
        this.onClickGuidePanel();
    }
}
