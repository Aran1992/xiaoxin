import DataMgr from "./DataMgr";
import Config from "../config";

class TimeMgr_ {
    init() {
        this.timer = setInterval(this.check.bind(this), 1000);
        this.check();
    }

    check() {
        const cur = this.getCurrentTime();
        const next = DataMgr.get(DataMgr.rankCostNextRefreshTime, 0);
        if (cur >= next) {
            const start = Config.rankMode.costInfo.resetStartTime;
            const cycle = Config.rankMode.costInfo.resetCycle;
            const times = Math.floor((cur - start) / cycle) + 1;
            let next = start + times * cycle;
            DataMgr.set(DataMgr.rankCostNextRefreshTime, next);
            DataMgr.set(DataMgr.rankCostLevel, 0);
        }
    }

    getCurrentTime() {
        return new Date().getTime();
    }
}

const TimeMgr = new TimeMgr_();
export default TimeMgr;