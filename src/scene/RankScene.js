import Scene from "./Scene";
import Radio from "../ui/Radio";
import List from "../ui/List";
import NetworkMgr from "../mgr/NetworkMgr";
import Utils from "../mgr/Utils";
import {Texture} from "../libs/pixi-wrapper";
import DataMgr from "../mgr/DataMgr";

let TOTAL_DISTANCE = 1;
let FARTHEST_DISTANCE = 2;
let SCORE = 3;
let typeList = [TOTAL_DISTANCE, FARTHEST_DISTANCE, SCORE];
let CURRENT = 1;
let HISTORY = 2;
let rangeList = [CURRENT, HISTORY];

export default class RankScene extends Scene {
    static onClickReturnButton() {
        App.hideScene("RankScene");
        App.showScene("MainScene");
    }

    static initTypeRadioButton(button, info) {
        typeList.forEach(type => button.ui[type].visible = info === type);
    }

    static initRangeRadioButton(button, info) {
        rangeList.forEach(type => button.ui[type].visible = info === type);
    }

    onCreate() {
        this.onClick(this.ui.returnButton, RankScene.onClickReturnButton);

        this.list = new List({
            root: this.ui.list,
            initItemFunc: this.initListItem.bind(this),
            updateItemFunc: this.updateListItem.bind(this),
            count: 0,
        });

        this.typeRadio = new Radio({
            root: this.ui.typeRadio,
            initItemFunc: RankScene.initTypeRadioButton,
            clickButtonFunc: this.onClickTypeRadio.bind(this),
            infoList: typeList
        });

        this.rangeRadio = new Radio({
            root: this.ui.rangeRadio,
            initItemFunc: RankScene.initRangeRadioButton,
            clickButtonFunc: this.onClickRangeRadio.bind(this),
            infoList: rangeList
        });
    }

    onShow() {
        this.reset();
    }

    initListItem(item) {
        // this.onClick(item, this.onClickItem.bind(this));
    }

    updateListItem(item, index) {
        let data = this.data[index];
        item.ui.userNameText.text = "--";
        typeList.forEach(type => item.ui[type].visible = this.type === type);
        item.ui.value.text = data.value;
        item.ui.playerRank.text = index + 1;
        item.index = index;
        let username = data.username;
        item.username = username;
        NetworkMgr.requestLoadSocialData(username, (data) => {
            if (item.username === username) {
                const info = JSON.parse(data.response);
                item.ui.userNameText.text = info.playername;
                item.ui.userImage.children[0].texture = Texture.from(info.headurl);
                if (info.exp === undefined) {
                    item.ui.levelText.visible = false;
                } else {
                    item.ui.levelText.visible = true;
                    item.ui.levelText.text = App.getText("LevelDsc",{level:DataMgr.getPlayerLevel(info.exp).level});
                }
            }
        });
    }

    onClickTypeRadio(selectedIndex) {
        this.type = typeList[selectedIndex];
        if (this.rangeRadio) {
            this.reset();
        }
    }

    onClickRangeRadio(selectedIndex) {
        this.range = rangeList[selectedIndex];
        this.reset();
    }

    reset() {
        let map = {
            [TOTAL_DISTANCE]: "/board/get_total_mileage_board",
            [FARTHEST_DISTANCE]: "/board/get_farest_mileage_board",
            [SCORE]: "/board/get_score_board",
        };
        clearInterval(this.refreshTimeInterval);
        this.ui.resetTimeText.text = App.getText("RequestingRankData");
        let key = map[this.type];
        if (this.range === HISTORY) {
            key += "_history";
        }
        NetworkMgr.requestGetRank(key, this.onRequestData.bind(this));
    }

    onRequestData(data, nextRefreshTime) {
        this.data = data;
        this.list.reset(this.data.length);
        let index = this.data.findIndex(item => item.username === localStorage.username);
        this.ui.myValue.text = index === -1 ? App.getText("NotListed") : (index + 1);
        clearInterval(this.refreshTimeInterval);
        let time = nextRefreshTime - new Date().getTime();
        this.ui.resetTimeText.text = App.getText("RestartAfterTime", {time: Utils.getCDTimeString(time)});
        this.refreshTimeInterval = setInterval(() => {
            let time = nextRefreshTime - new Date().getTime();
            if (time > 0) {
                this.ui.resetTimeText.text = App.getText("RestartAfterTime", {time: Utils.getCDTimeString(time)});
            } else {
                this.reset();
            }
        }, 1000);
    }

    onClickItem(item) {
        NetworkMgr.requestLoadSocialData(this.data[item.index].username, (data) => {
            try {
                let homeData = JSON.parse(data.response).home;
                App.hideScene("RankScene");
                App.showScene("HomeScene", homeData, false);
            } catch (e) {
                App.showNotice(App.getText("NetworkBusy"));
            }
        });
    }
}

RankScene.sceneFilePath = "myLaya/laya/pages/View/RankScene.scene.json";
