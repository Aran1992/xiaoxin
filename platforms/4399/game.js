import {main} from "../../src/main";
import NetworkMgr from "../../src/mgr/NetworkMgr";
import * as md5 from "md5";
import MusicMgr from "../../src/mgr/MusicMgr";
import DataMgr from "../../src/mgr/DataMgr";

window.PlatformHelper = {
    canLogout: false,
    showAd: callback => {
        window.H5API.callPlayAd(data => {
            if (data.canPlayAd) {
                window.H5API.playAd(data => {
                    switch (data.code) {
                        case 10000: {
                            MusicMgr.muteBGM(true);
                            break;
                        }
                        case 10001: {
                            if (DataMgr.get(DataMgr.bgmOn, true)) {
                                MusicMgr.muteBGM(false);
                            }
                            callback(true);
                            break;
                        }
                        case 10010: {
                            if (DataMgr.get(DataMgr.bgmOn, true)) {
                                MusicMgr.muteBGM(false);
                            }
                            callback(false);
                            break;
                        }
                    }
                });
            } else {
                callback(true);
            }
        });
    },
    closeLogoScene() {
        if (window.logoScene && window.logoScene.parentNode) {
            setTimeout(() => {
                window.logoScene.parentNode.removeChild(window.logoScene);
            }, 2);
        }
    }
};

const CALLBACK_KEY = "76ba21a51fd85f4de9bad17007956751";

function getArgs(url) {
    let args = {};
    url.split("?")[1].split("&").forEach(item => {
        let list = item.split("=");
        args[list[0]] = decodeURIComponent(list[1]);
    });
    return args;
}

function isLoginRight({gameId, time, userId, userName, sign}) {
    return md5(`gameId=${gameId}time=${time}userId=${userId}userName=${userName}${CALLBACK_KEY}`) === sign;
}

let args = getArgs(window.location.href);
if (isLoginRight(args)) {
    main(() => {
        let username = `4399-${args.userId}`;
        let playername = args.userName;
        let headurl = window.H5API.getUserAvatar(args.userId);
        let success = () => {
            App.showScene("MainScene");
        };
        NetworkMgr.requestLogin(username, username, playername, headurl,
            success,
            () => {
                NetworkMgr.requestRegister(username, username, () => {
                    NetworkMgr.requestLogin(username, username, playername, headurl,
                        success, undefined, true);
                });
            },
            true);
    });
}
