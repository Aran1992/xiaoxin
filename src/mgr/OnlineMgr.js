import DataMgr from "./DataMgr";
import Config from "../config";
import EventMgr from "./EventMgr";

class OnlineMgr_ {
    start() {
        this.startGiftCountDown();
        this.startResetRewardTimer();
        this.startOnlineTime();
    }

    restartGiftCountDown() {
        let giftIndex = DataMgr.get(DataMgr.giftIndex, 0);
        let gift = Config.giftList[giftIndex];
        if (gift) {
            DataMgr.set(DataMgr.remainGiftOnlineMinutes, gift.onlineMinutes);
            this.startGiftCountDown();
        }
    }

    startGiftCountDown() {
        let giftIndex = DataMgr.get(DataMgr.giftIndex, 0);
        let gift = Config.giftList[giftIndex];
        if (gift) {
            this.giftRemainTime = DataMgr.get(DataMgr.remainGiftOnlineMinutes, 0) * 60;
            if (this.giftRemainTime < 0) {
                this.giftRemainTime = 0;
            } else if (this.giftRemainTime > 0) {
                clearInterval(this.giftCountDownTimer);
                this.giftCountDownTimer = setInterval(() => {
                    this.giftRemainTime--;
                    let oldMinutes = DataMgr.get(DataMgr.remainGiftOnlineMinutes, 0);
                    let newMinutes = Math.ceil(this.giftRemainTime / 60);
                    if (oldMinutes !== newMinutes) {
                        DataMgr.set(DataMgr.remainGiftOnlineMinutes, newMinutes);
                    }
                    if (this.giftRemainTime <= 0) {
                        clearInterval(this.giftCountDownTimer);
                        DataMgr.set(DataMgr.remainGiftOnlineMinutes, 0);
                    }
                }, 1000);
            }
        }
    }

    getGiftRemainTime() {
        return this.giftRemainTime;
    }

    hasGift() {
        let giftIndex = DataMgr.get(DataMgr.giftIndex, 0);
        let gift = Config.giftList[giftIndex];
        return gift !== undefined;
    }

    startResetRewardTimer() {
        if (new Date().getTime() >= DataMgr.get(DataMgr.nextResetTime, 0)) {
            this.reset();
        }
        setInterval(() => {
            if (new Date().getTime() >= DataMgr.get(DataMgr.nextResetTime, 0)) {
                this.reset();
            }
        }, 1000);
    }

    setResetRewardHour() {
        let cur = new Date();
        cur.setSeconds(0);
        cur.setMinutes(0);
        cur.setMilliseconds(0);
        let resetRewardTime;
        if (cur.getHours() >= Config.resetRewardHour) {
            cur.setHours(Config.resetRewardHour);
            resetRewardTime = cur.getTime() + 24 * 60 * 60 * 1000;
        } else {
            cur.setHours(Config.resetRewardHour);
            resetRewardTime = cur.getTime();
        }
        DataMgr.set(DataMgr.nextResetTime, resetRewardTime);
    }

    reset() {
        this.setResetRewardHour();
        DataMgr.set(DataMgr.giftIndex, 0);
        DataMgr.set(DataMgr.remainGiftOnlineMinutes, Config.giftList[0].onlineMinutes);
        this.startGiftCountDown();
        DataMgr.set(DataMgr.receivedCoinList, []);
        DataMgr.set(DataMgr.receivedDiamondList, []);
        DataMgr.set(DataMgr.onlineTime, 0);
        DataMgr.set(DataMgr.drawAdvertTimes, 0);
        EventMgr.dispatchEvent("UpdatePoint");
    }

    getOnlineTime() {
        return this.onlineTime;
    }

    startOnlineTime() {
        this.onlineTime = DataMgr.get(DataMgr.onlineTime, 0);
        setInterval(() => {
            let oldMinutes = Math.floor(this.onlineTime / 60);
            this.onlineTime++;
            let newMinutes = Math.floor(this.onlineTime / 60);
            if (oldMinutes !== newMinutes) {
                DataMgr.set(DataMgr.onlineTime, this.onlineTime);
            }
        }, 1000);
    }

    isSignRewardReceived(index) {
        return index <= DataMgr.get(DataMgr.receivedSignReward, -1);
    }

    isSignRewardReceivable(index) {
        if (index === 0) {
            return true;
        }
        let createTime = new Date(DataMgr.createTime);
        createTime.setMilliseconds(0);
        createTime.setSeconds(0);
        createTime.setMinutes(0);
        createTime.setHours(0);
        let cur = new Date();
        cur.setMilliseconds(0);
        cur.setSeconds(0);
        cur.setMinutes(0);
        cur.setHours(0);
        let days = (cur - createTime) / 1000 / 60 / 60 / 24;
        return index <= days;
    }

    hasReceivableSignReward() {
        let index = DataMgr.get(DataMgr.receivedSignReward, -1) + 1;
        let reward = Config.signRewardList[index];
        return reward !== undefined && OnlineMgr.isSignRewardReceivable(index);
    }

    hasSignReward() {
        return Config.signRewardList[DataMgr.get(DataMgr.receivedSignReward, -1) + 1] !== undefined;
    }
}

const OnlineMgr = new OnlineMgr_();

export default OnlineMgr;
