import UIGuidePanel from "../item/UIGuidePanel";
import Config from "../config";
import DataMgr from "./DataMgr";

export default class UIGuideMgr {
    constructor(guideKey) {
        console.log("start guide", guideKey);
        this.guideKey = guideKey;
        this.config = Config.UIGuide[this.guideKey];
        this.index = 0;
        const data = this.config.guidePanelList[this.index];
        App.showMask();
        App.registerOnSceneShowOnTop(data.scene, () => {
            App.hideMask();
            this.uiGuidePanel = new UIGuidePanel(data, this, App.uiGuidePanelContainer);
        });
    }

    destroyUIGuidePanel() {
        this.uiGuidePanel.destroy();
        const lastData = this.config.guidePanelList[this.index];
        this.index++;
        const data = this.config.guidePanelList[this.index];
        if (data) {
            if (data.scene === lastData.scene) {
                this.uiGuidePanel = new UIGuidePanel(data, this, App.uiGuidePanelContainer);
            } else {
                App.showMask();
                App.registerOnSceneShowOnTop(data.scene, () => {
                    App.hideMask();
                    this.uiGuidePanel = new UIGuidePanel(data, this, App.uiGuidePanelContainer);
                });
            }
        } else {
            DataMgr.completeGuide(this.guideKey);
        }
    }
}
