import GameUtils from "../mgr/GameUtils";
import UIHelper from "./UIHelper";
import EventMgr from "../mgr/EventMgr";

export default class LockableButton {
    constructor({button, system, handler}) {
        this.button = button;
        this.system = system;
        this.handler = handler;
        this.refreshLockStatus();
        UIHelper.onClick(this.button, this.onClick.bind(this));
        this.unlockSystemHandler = this.onUnlockSystem.bind(this);
        EventMgr.registerEvent("UnlockSystem", this.unlockSystemHandler);
    }

    onUnlockSystem() {
        this.refreshLockStatus();
    }

    onClick() {
        if (GameUtils.isSystemLocked(this.system)) {
            App.showTip(GameUtils.getLockNotice(this.system), undefined, undefined, true);
        } else {
            this.handler();
        }
    }

    refreshLockStatus() {
        let lock = GameUtils.isSystemLocked(this.system);
        for (let i = 0; i < this.button.children.length; i++) {
            const child = this.button.children[i];
            if (child.uiname !== "lockedImage") {
                GameUtils.greySprite(child, lock);
            }
        }
        GameUtils.findChildByName(this.button, "lockedImage").visible = lock;
    }

    destroy() {
        EventMgr.unregisterEvent("UnlockSystem", this.unlockSystemHandler);
    }
}
