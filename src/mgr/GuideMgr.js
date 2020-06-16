import EventMgr from "./EventMgr";
import Config from "../config";
import GuidePanel from "../item/GuidePanel";
import UIHelper from "../ui/UIHelper";
import GameUtils from "./GameUtils";
import DataMgr from "./DataMgr";

export default class GuideMgr {
    constructor(gameMgr, panelContainer) {
        this.gameMgr = gameMgr;
        this.panelContainer = panelContainer;
        this.guidePanelDataList = [];
        EventMgr.registerEvent("GameWin", this.onGameWin.bind(this));
    }

    clear() {
        this.setControlAll(false);
        this.guidePanelDataList = [];
        this.destroyGuidePanel();
    }

    setControlAll(controlAll) {
        this.controlAll = controlAll;
        if (this.controlAll) {
            UIHelper.controlClick(() => false);
        } else {
            UIHelper.freeClick();
        }
    }

    push(data) {
        this.guidePanelDataList.push(data);
    }

    update() {
        for (let i = 0; i < this.guidePanelDataList.length; i++) {
            const data = this.guidePanelDataList[i];
            if (this.gameMgr.bikeOutterContainer.x >= data.props.x + Config.bikeLeftMargin
                && (GameUtils.getItemProp(data, "只显示一次") !== "1"
                    || !DataMgr.hasCompletedGuide(GameUtils.getItemProp(data, "引导名称")))) {
                this.destroyGuidePanel();
                this.guidePanel = new GuidePanel(this, this.gameMgr, this.panelContainer, data);
                this.guidePanelDataList.splice(i, 1);
                break;
            }
        }
    }

    onGameWin() {
        this.destroyGuidePanel();
        this.setControlAll(false);
    }

    destroyGuidePanel() {
        if (this.guidePanel) {
            this.guidePanel.destroy();
            delete this.guidePanel;
        }
        this.setControlAll(this.controlAll);
    }
}
