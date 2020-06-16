import Scene from "./Scene";
import {Graphics, Rectangle, Texture} from "../libs/pixi-wrapper";
import Config from "../config";
import BikeSprite from "../item/BikeSprite";

export default class InfoScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.hitArea = new Rectangle(0, 0, App.sceneWidth, App.sceneHeight);
        this.onClick(this, this.onClickReturnButton.bind(this), true);

        this.bikeSprite = new BikeSprite(this.ui.bikePanel, 0);
    }

    onShow(data) {
        this.parent.setChildIndex(this, this.parent.children.length - 1);
        if (data.bike !== undefined) {
            this.ui.bikePanel.visible = true;
            this.ui.itemIcon.visible = false;
            this.bikeSprite.setBikeID(data.bike);
            this.bikeSprite.play();
            const config = Config.bikeList.find(bike => bike.id === data.bike);
            this.ui.itemName.text = App.getText(config.name);
            this.ui.itemDsc.text = App.getText(config.dsc);
        } else {
            this.ui.bikePanel.visible = false;
            this.ui.itemIcon.visible = true;
            this.ui.itemIcon.children[0].texture = Texture.from(Config.effect[data.effect].imagePath);
            const config = Config.effect[data.effect];
            this.ui.itemName.text = App.getText(config.name);
            this.ui.itemDsc.text = App.getText(config.dsc);
        }
    }

    onClickReturnButton() {
        App.hideScene("InfoScene");
    }
}

InfoScene.sceneFilePath = "myLaya/laya/pages/View/InfoScene.scene.json";
