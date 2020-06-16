import {main} from "./src/main";
import NetworkMgr from "./src/mgr/NetworkMgr";

window.PlatformHelper = {
    canLogout: true,
    showAd: callback => {
        callback(true);
    },
    closeLogoScene() {
        if (window.logoScene && window.logoScene.parentNode) {
            window.logoScene.hidden = true;
        }
    }
};

function callback() {
    let username = localStorage.username;
    let password = localStorage.password;
    // 还要等待登录完成再显示
    if (username && password) {
        NetworkMgr.requestLogin(username, password, username, undefined, () => {
            App.showScene("MainScene");
        }, () => {
            App.showScene("LoginScene");
        });
    } else {
        App.showScene("LoginScene");
    }
}

main(() => {
    if (window.parent.location.href.indexOf("autoRegister=1") !== -1 && localStorage.username === undefined) {
        const id = new Date().getTime();
        NetworkMgr.requestRegister(id, id, () => {
            localStorage.username = id;
            localStorage.password = id;
            callback();
        });
    } else {
        callback();
    }
});
