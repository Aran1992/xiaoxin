import {main} from "../../src/main";
import NetworkMgr from "../../src/mgr/NetworkMgr";

window.PlatformHelper = {
    canLogout: true,
    showAd: callback => {
        callback(true);
    },
    closeLogoScene() {
        if (window.logoScene && window.logoScene.parentNode) {
            window.logoScene.parentNode.removeChild(window.logoScene);
        }
    }
};

main(() => {
    let username = localStorage.username;
    let password = localStorage.password;
    if (username && password) {
        NetworkMgr.requestLogin(username, password, username, undefined, () => {
            localStorage.playername = username;
            App.showScene("MainScene");
        }, () => {
            App.showScene("LoginScene");
        });
    } else {
        App.showScene("LoginScene");
    }
});
