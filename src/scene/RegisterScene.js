import Scene from "./Scene";
import {Graphics} from "../libs/pixi-wrapper";
import NetworkMgr from "../mgr/NetworkMgr";

export default class RegisterScene extends Scene {
    onCreate() {
        let mask = new Graphics()
            .beginFill(0x000000, 0.5)
            .drawRect(0, 0, App.sceneWidth, App.sceneHeight)
            .endFill();
        this.addChildAt(mask, 0);

        this.onClick(this.ui.registerBtn, this.onRegisterBtn.bind(this));
        this.onClick(this.ui.backToLoginBtn, this.onBackToLoginBtn.bind(this));
    }

    onShow() {
        this.ui.usernameInput.text = "";
        this.ui.passwordInput.text = "";
    }

    onRegisterBtn() {
        let username = this.ui.usernameInput.text;
        let password = this.ui.passwordInput.text;
        if (username === "" || password === "") {
            return App.showNotice("Please enter Username and Password!");
        }
        NetworkMgr.requestRegister(username, password, () => {
            App.showNotice("Register success!");
            this.onBackToLoginBtn();
        });
    }

    onBackToLoginBtn() {
        App.hideScene("RegisterScene");
        App.showScene("LoginScene");
    }
}
RegisterScene.sceneFilePath = "myLaya/laya/pages/View/RegisterScene.scene.json";
