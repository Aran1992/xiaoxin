import UIHelper from "./UIHelper";

export default class Radio {
    constructor({root, initItemFunc, clickButtonFunc, infoList, buttonDistance}) {
        this.root = root;
        this.clickButtonFunc = clickButtonFunc;
        this.button = this.root.children[0];
        if (buttonDistance === undefined) {
            buttonDistance = this.button.mywidth;
        }
        this.buttonList = infoList.map((info, index) => {
            let button = UIHelper.uiClone(this.button, undefined, this.root);
            initItemFunc(button, info, index);
            this.root.addChild(button);
            button.x = index * buttonDistance;
            UIHelper.onClick(button, this.onClickButton.bind(this));
            return button;
        });
        this.button.visible = false;
        this.onClickButton(this.buttonList[0]);
    }

    onClickButton(button) {
        let oldIndex = this.selectedIndex;
        this.buttonList.forEach((button_, index) => {
            if (button === button_) {
                this.selectedIndex = index;
                button_.ui.common.visible = false;
                button_.ui.selected.visible = true;
            } else {
                button_.ui.common.visible = true;
                button_.ui.selected.visible = false;
            }
        });
        this.clickButtonFunc(this.selectedIndex, oldIndex);
    }

    select(index) {
        this.onClickButton(this.buttonList[index]);
    }
}
