import Config from "../config";
import DataMgr from "./DataMgr";
import Utils from "./Utils";
import RunOption from "../../run-option";

const RANK_LIST = [
    "/board/get_total_mileage_board",
    "/board/get_farest_mileage_board",
    "/board/get_score_board",
    "/board/get_total_mileage_board_history",
    "/board/get_farest_mileage_board_history",
    "/board/get_score_board_history",
];

class NetworkMgr_ {
    request(url, method, formData, successCallback, failedCallback, hideTip) {
        successCallback = successCallback || (() => {
        });
        failedCallback = failedCallback || (() => {
        });
        if (RunOption.singlePlayerMode) {
            return successCallback({key: "0", response: {}});
        }
        let request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    let data;
                    try {
                        data = JSON.parse(request.responseText);
                    } catch (e) {
                        data = {key: "0", response: {}};
                    }
                    if (data.response && data.response.sessionId) {
                        this.sessionId = data.response.sessionId;
                    }
                    if (data.key === "0") {
                        successCallback(data);
                    } else {
                        if (!hideTip) {
                            App.showNotice(data.message);
                        }
                        failedCallback(data);
                    }
                } else {
                    if (!hideTip) {
                        App.showTip(App.getText("NetworkBusy"));
                    }
                    if (failedCallback) {
                        failedCallback({message: "Network request failed"});
                    }
                }
            }
        };
        if (method === "GET") {
            if (formData && this.sessionId !== undefined) {
                formData["sessionId"] = this.sessionId;
            }
            let list = [];
            for (let name in formData) {
                if (formData.hasOwnProperty(name)) {
                    list.push(`${encodeURIComponent(name)}=${encodeURIComponent(formData[name])}`);
                }
            }
            if (list.length) {
                url += "?" + list.join("&");
            }
            request.open(method, url);
            request.send(formData);
        } else if (method === "POST") {
            if (formData && this.sessionId !== undefined) {
                formData.append("sessionId", this.sessionId);
            }
            request.open(method, url);
            request.send(formData);
        }
    }

    requestRegister(username, password, successCallback, failedCallback) {
        let formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        this.request(Config.serverUrl + "/user/register", "POST", formData, successCallback, failedCallback);
    }

    requestLogin(username, password, playername, headurl = Config.defaultEnemyHeadImagePath, successCallback, failedCallback, hideTip) {
        let formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        this.request(Config.serverUrl + "/user/login", "POST", formData, () => {
            localStorage.username = username;
            localStorage.password = password;
            this.requestLoadData((...args) => {
                DataMgr.set(DataMgr.playername, playername);
                DataMgr.set(DataMgr.headurl, headurl);
                this.requestSaveSocialData({playername, headurl});
                successCallback(...args);
                window.TDGA && TDGA.Account({
                    accountId: username,
                    accountType: 1,
                    accountName: username,
                });
            }, failedCallback);
        }, failedCallback, hideTip);
    }

    requestLoadData(scb, fcb) {
        this.request(Config.serverUrl + "/player/load_data", "GET", {}, (data) => {
            this.request(Config.serverUrl + "/board/get_farest_mileage_board", "GET", {}, ({response}) => {
                if (data.response.data) {
                    DataMgr.init(JSON.parse(data.response.data), response.periodIdx, data.response.createTime);
                } else {
                    DataMgr.init({}, response.periodIdx);
                }
                DataMgr.setData(data.response);
                scb(data);
            });
        }, fcb);
    }

    requestSaveData(dataTable) {
        let formData = new FormData();
        formData.append("data", JSON.stringify(dataTable));
        this.request(Config.serverUrl + "/player/save_data", "POST", formData);
    }

    requestUpdateTotalMileage(value, scb, fcb) {
        let formData = new FormData();
        formData.append("value", value);
        this.request(Config.serverUrl + "/board/update_total_mileage", "POST", formData, scb, fcb);
    }

    requestUpdateFarthestMileage(value, scb, fcb) {
        let formData = new FormData();
        formData.append("value", value);
        this.request(Config.serverUrl + "/board/update_farest_mileage", "POST", formData, scb, fcb);
    }

    requestUpdateScore(value, scb, fcb) {
        let formData = new FormData();
        formData.append("value", value);
        this.request(Config.serverUrl + "/board/update_score", "POST", formData, scb, fcb);
    }

    requestSaveSocialData({home = DataMgr.get(DataMgr.homeData), playername = DataMgr.get(DataMgr.playername), headurl = DataMgr.get(DataMgr.headurl), exp = DataMgr.get(DataMgr.exp)}, scb, fcb) {
        let formData = new FormData();
        let data = {home, playername, headurl, exp};
        formData.append("data", JSON.stringify(data));
        this.request(Config.serverUrl + "/player/save_social_data", "POST", formData, scb, fcb);
    }

    requestLoadSocialData(name, scb, fcb) {
        this.request(Config.serverUrl + "/player/load_social_data", "GET", {name: name}, scb, fcb);
    }

    requestGetRank(key, scb, fcb) {
        this.request(Config.serverUrl + key, "GET", {}, (data) => {
            let cur = new Date().getTime();
            let start = Config.rankStartTime.getTime();
            let interval = Config.rankRefreshInterval * 1000;
            let nextRefreshTime = start + Math.ceil((cur - start) / interval) * interval;
            let boards;
            if (data.response) {
                if (data.response.boards) {
                    boards = data.response.boards;
                } else {
                    boards = [];
                }
            } else {
                boards = [];
            }
            scb(boards, nextRefreshTime);
        }, fcb);
    }

    requestRandomPlayerInfo(count, successCallback) {
        let completeCount = 0;
        let uidList = [];
        RANK_LIST.forEach(rank => {
            this.requestGetRank(rank, boards => {
                uidList = uidList.concat(boards.map(board => board.username));
                completeCount++;
                if (completeCount === RANK_LIST.length) {
                    uidList = Array.from(new Set(uidList));
                    uidList = uidList.filter(uid => uid !== localStorage.username);
                    uidList = Utils.randomChooseMulti(uidList, count);
                    completeCount = 0;
                    let infoList = [];
                    if (uidList.length) {
                        uidList.forEach(uid => this.requestLoadSocialData(uid, (data) => {
                            data = JSON.parse(data.response);
                            let playername = data.playername;
                            let headurl = data.headurl;
                            infoList.push({playername, headurl});
                            completeCount++;
                            if (completeCount === uidList.length) {
                                successCallback(infoList);
                            }
                        }));
                    } else {
                        successCallback(infoList);
                    }
                }
            });
        });
    }
}

const NetworkMgr = new NetworkMgr_();

export default NetworkMgr;
