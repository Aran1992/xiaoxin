import Config from "../config";
import NetworkMgr from "./NetworkMgr";
import Utils from "./Utils";
import OnlineMgr from "./OnlineMgr";
import EventMgr from "./EventMgr";
import TimeMgr from "./TimeMgr";
import GameUtils from "./GameUtils";
import RunOption from "../../run-option";

class DataMgr_ {
    constructor() {
        this.conditionTable = {
            //需消费 #### 数量的金币
            1: () => false,
            //需消费 #### 数量的钻石
            2: () => false,
            //需要解锁地图 ####
            3: id => !DataMgr.isEndlessSceneLocked(id),
            //需要总里程达到 ####
            4: value => DataMgr.get(DataMgr.distance, 0) >= value,
            //需要最远里程达到过 ####
            5: value => DataMgr.get(DataMgr.distanceRecord, 0) >= value,
            //需要积分达到过 ####
            6: value => DataMgr.get(DataMgr.totalScore, 0) > value,
            //需要总里程排名达到过第 #### 名
            7: value => this.data.totalMileageBoardBestRanking !== 0 && this.data.totalMileageBoardBestRanking <= value,
            //需要最远里程排名达到过第 #### 名
            8: value => this.data.farestMileageBoardBestRanking !== 0 && this.data.farestMileageBoardBestRanking <= value,
            //需要积分排名达到过第 #### 名
            9: value => this.data.scoreBoardBestRanking !== 0 && this.data.scoreBoardBestRanking <= value,
            //需要进行 #### 次排名竞赛
            10: value => DataMgr.get(DataMgr.mapGameTimes, 0) >= value,
            //需要达到 ### 等级
            11: value => DataMgr.getPlayerLevel().level >= value,
            //闯通 ### 关卡
            12: (map, level) => !DataMgr.isPlayGameLevelFirstTime(map - 1, level - 1),
            //闯关模式星星总数达到 ###
            13: value => DataMgr.getGameLevelStarTotalCount() >= value,
        };
    }

    setData(data) {
        this.data = data;
    }

    init(dataTable, periodIdx, createTime) {
        this.dataTable = dataTable;
        // if (localStorage["mydata"]) {
        //     this.dataTable = JSON.parse(localStorage["mydata"]);
        // } else {
        //     this.dataTable = {};
        // }
        if (typeof this.dataTable[DataMgr.coin] !== "number") {
            this.dataTable[DataMgr.coin] = 0;
        }
        this.createTime = new Date(createTime);

        if (DataMgr.get(DataMgr.periodIdx) !== periodIdx) {
            this.resetRankData(periodIdx);
        }

        setInterval(() => {
            if (new Date().getTime() > DataMgr.get(DataMgr.nextRankRefreshTime)) {
                this.resetRankData();
            }
        }, 1000);

        if (DataMgr.get(DataMgr.ownedBikeList, []).length === 0) {
            DataMgr.set(DataMgr.ownedBikeList, [0]);
        }
        let bikeLevelMap = DataMgr.get(DataMgr.bikeLevelMap, {});
        DataMgr.get(DataMgr.ownedBikeList, []).forEach(id => {
            if (bikeLevelMap[id] === undefined) {
                bikeLevelMap[id] = 0;
            }
        });
        DataMgr.set(DataMgr.bikeLevelMap, bikeLevelMap);
        if (DataMgr.get(DataMgr.selectedBike) === undefined) {
            DataMgr.set(DataMgr.selectedBike, 0);
        }
        if (DataMgr.get(DataMgr.nextFreeDrawTime) === undefined) {
            DataMgr.set(DataMgr.nextFreeDrawTime, 0);
        }
        if (DataMgr.get(DataMgr.currentMapScene) === undefined) {
            DataMgr.set(DataMgr.currentMapScene, Math.floor(Math.random() * Config.mapList.length));
        }
        if (DataMgr.get(DataMgr.selectedEndlessScene) === undefined) {
            DataMgr.set(DataMgr.selectedEndlessScene, Math.floor(Math.random() * Config.endlessMode.sceneList.length));
        }
        if (DataMgr.get(DataMgr.homeData) === undefined) {
            DataMgr.set(DataMgr.homeData, {
                bgID: 1,
                floorID: 1,
                spoilsList: [],
                petsList: [],
                unlocked: {
                    backgrounds: [],
                    floors: [],
                    spoils: [],
                    pets: [],
                }
            });
        }
        if (DataMgr.get(DataMgr.preparationDataMap) === undefined) {
            this.refreshPreparationRewards(DataMgr.preparationDataMap);
        }
        if (DataMgr.get(DataMgr.preparationDataEndless) === undefined) {
            this.refreshPreparationRewards(DataMgr.preparationDataEndless);
        }
        if (DataMgr.get(DataMgr.preparationDataGameLevel) === undefined) {
            this.refreshPreparationRewards(DataMgr.preparationDataGameLevel);
        }
        if (DataMgr.get(DataMgr.showedGuide) === undefined) {
            DataMgr.set(DataMgr.showedGuide, []);
        }

        OnlineMgr.start();
        TimeMgr.init();
    }

    set(key, value) {
        this.dataTable[key] = value;
        // localStorage["mydata"] = JSON.stringify(this.dataTable);
        clearTimeout(this.timer);
        this.timer = setTimeout(() => NetworkMgr.requestSaveData(this.dataTable), 100);
        if (key === DataMgr.unlockAllEndlessScene
            || key === DataMgr.unlockEndlessSceneIDList
            || key === DataMgr.distance) {
            this.checkConditions(Config.conditionsEnum.unlockMap);
        }
        if (key === DataMgr.distance) {
            this.checkConditions(Config.conditionsEnum.distance);
        }
        if (key === DataMgr.distanceRecord) {
            this.checkConditions(Config.conditionsEnum.distanceRecord);
        }
        if (key === DataMgr.totalScore) {
            this.checkConditions(Config.conditionsEnum.totalScore);
        }
        if (key === DataMgr.mapGameTimes) {
            this.checkConditions(Config.conditionsEnum.mapGameTimes);
        }
        if (key === DataMgr.exp) {
            this.checkConditions(Config.conditionsEnum.level);
            NetworkMgr.requestSaveSocialData({exp: value});
        }
        if (key === DataMgr.gameLevelData) {
            this.checkConditions(Config.conditionsEnum.gameLevel);
            this.checkConditions(Config.conditionsEnum.gameLevelStar);
        }
        if (key === DataMgr.homeData) {
            NetworkMgr.requestSaveSocialData({home: value});
        }
        if (key === DataMgr.rankDistance && value !== 0) {
            NetworkMgr.requestUpdateTotalMileage(value);
        }
        if (key === DataMgr.rankDistanceRecord && value !== 0) {
            NetworkMgr.requestUpdateFarthestMileage(value);
        }
        if (key === DataMgr.rankTotalScore && value !== 0) {
            NetworkMgr.requestUpdateScore(value);
        }
    }

    add(key, addValue) {
        let value = this.get(key, 0) + addValue;
        this.set(key, value);
        return value;
    }

    get(key, defaultValue) {
        let value = this.dataTable[key];
        if (value === undefined) {
            value = defaultValue;
        }
        return value;
    }

    isHomeItemLocked(type, id) {
        let unlockConditions = Config.home[type].find(item => item.id === id).unlockConditions;
        if (unlockConditions
            && unlockConditions.length !== 0
            && DataMgr.get(DataMgr.homeData).unlocked[type].indexOf(id) === -1) {
            return true;
        }
    }

    isHomeItemSatisfiedCostCondition(type, id) {
        let unlockConditions = Config.home[type].find(item => item.id === id).unlockConditions;
        if (!unlockConditions
            .filter(condition => [Config.conditionsEnum.costCoin, Config.conditionsEnum.costDiamond].indexOf(condition[0]) === -1)
            .some(condition => !this.checkCondition(...condition))) {
            return true;
        }
    }

    isHomeItemUnlockable(type, id) {
        let unlockConditions = Config.home[type].find(item => item.id === id).unlockConditions;
        return this.checkConditionsUnlockable(unlockConditions);
    }

    checkCondition(id, ...args) {
        return this.conditionTable[id](...args);
    }

    checkConditions(conditionID) {
        for (let system in Config.lockSystems) {
            if (Config.lockSystems.hasOwnProperty(system)) {
                let [id, ...values] = Config.lockSystems[system].condition;
                if (id === conditionID && this.checkCondition(id, ...values)) {
                    let list = DataMgr.get(DataMgr.unlockSystems, []);
                    if (list.indexOf(system) === -1) {
                        list.push(system);
                        DataMgr.set(DataMgr.unlockSystems, list);
                        if (Config.lockSystems[system].title) {
                            EventMgr.dispatchEvent("UnlockSystem", system);
                        }
                    }
                }
            }
        }
        if (Config.home.types.some(type =>
            Config.home[type].some(item => {
                if (DataMgr.isHomeItemLocked(type, item.id)
                    && item.unlockConditions
                    && item.unlockConditions.find(([id]) => id === conditionID)) {
                    return this.isHomeItemUnlockable(type, item.id);
                }
            }))) {
            EventMgr.dispatchEvent("UpdatePoint");
        }
    }

    isEndlessSceneLocked(id) {
        return DataMgr.get(DataMgr.unlockAllEndlessScene, false) === false
            && DataMgr.get(DataMgr.unlockEndlessSceneIDList, []).indexOf(id) === -1
            && DataMgr.get(DataMgr.distance, 0)
            < Config.endlessMode.sceneList.find(item => item.id === id).unlockDistance;
    }

    resetRankData(periodIdx = DataMgr.get(DataMgr.periodIdx) + 1) {
        DataMgr.set(DataMgr.rankDistance, 0);
        DataMgr.set(DataMgr.rankDistanceRecord, 0);
        DataMgr.set(DataMgr.rankTotalScore, 0);
        DataMgr.set(DataMgr.periodIdx, periodIdx);
        let cur = new Date().getTime();
        let start = Config.rankStartTime.getTime();
        let interval = Config.rankRefreshInterval * 1000;
        let refreshTime = start + Math.ceil((cur - start) / interval) * interval;
        DataMgr.set(DataMgr.nextRankRefreshTime, refreshTime);
        NetworkMgr.request(Config.serverUrl + "/player/load_data", "GET", {}, (data) => {
            this.setData(data.response);
        });
    }

    getPlayerName() {
        return DataMgr.get(DataMgr.playername, "");
    }

    refreshPreparationRewards(key) {
        let l1, l2;
        if (key === DataMgr.preparationDataMap) {
            l1 = Config.preparationRandomEffectList.map;
            l2 = Config.preparationRandomBikeList.map;
        } else if (key === DataMgr.preparationDataGameLevel) {
            l1 = Config.preparationRandomEffectList.gameLevel;
            l2 = Config.preparationRandomBikeList.gameLevel;
        } else {
            l1 = Config.preparationRandomEffectList.endless;
            l2 = Config.preparationRandomBikeList.endless;
        }
        let effectList = Utils.randomChooseMulti(l1, 2);
        let bike = Utils.randomChoose(l2);
        DataMgr.set(key, [
            {effect: effectList[0]},
            {effect: effectList[1]},
            {bike: bike}
        ]);
    }

    plusBike(id) {
        let levelUp = false;
        let highestLevel = false;
        let ownedBikeList = DataMgr.get(DataMgr.ownedBikeList, []);
        let bikeLevelMap = DataMgr.get(DataMgr.bikeLevelMap, {});
        let config = Config.bikeList.find(item => item.id === id);
        if (ownedBikeList.indexOf(id) === -1) {
            ownedBikeList.push(id);
            DataMgr.set(DataMgr.ownedBikeList, ownedBikeList);
            bikeLevelMap[id] = 0;
            DataMgr.set(DataMgr.bikeLevelMap, bikeLevelMap);
        } else if ((config.coinPercent || Config.bike.coinPercent)[bikeLevelMap[id] + 1] !== undefined) {
            bikeLevelMap[id]++;
            DataMgr.set(DataMgr.bikeLevelMap, bikeLevelMap);
            levelUp = true;
            if ((config.coinPercent || Config.bike.coinPercent)[bikeLevelMap[id] + 1] === undefined) {
                highestLevel = true;
            }
        } else {
            highestLevel = true;
        }
        return {levelUp, highestLevel};
    }

    getGameLevelStarTotalCount() {
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        let star = 0;
        for (const map in table) {
            if (table.hasOwnProperty(map)) {
                for (const level in table[map]) {
                    if (table[map].hasOwnProperty(level)) {
                        star += table[map][level];
                    }
                }
            }
        }
        return star;
    }

    getGameLevelStarCount(map, level) {
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        return (table[map] && table[map][level]) || 0;
    }

    isGameLevelLocked(map, level) {
        if (RunOption.openAllLevel) {
            return false;
        }
        if (this.isGameLevelMapLocked(map)) {
            return true;
        }
        if (level === 0) {
            return false;
        }
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        return table[map] === undefined || table[map][level - 1] === undefined;
    }

    isGameLevelMapLocked(map) {
        if (map === 0) {
            return false;
        }
        const level = -1;
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        if (table[map] === undefined) {
            return true;
        }
        return !table[map][level];
    }

    hasEnoughStarUnlockGameLevelMap(map) {
        const glConfig = Config.gameLevelMode.mapList[map];
        const need = glConfig.starCountUnlockNeeded;
        const count = this.getGameLevelStarTotalCount();
        return count >= need;
    }

    unlockGameLevelMap(map) {
        const level = -1;
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        if (table[map] === undefined) {
            table[map] = {};
        }
        if (table[map][level] === undefined) {
            table[map][level] = 1;
        }
        DataMgr.set(DataMgr.gameLevelData, table);
    }

    setGameLevelStarCount(map, level, star) {
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        if (table[map] === undefined) {
            table[map] = {};
        }
        if (table[map][level] === undefined || table[map][level] < star) {
            table[map][level] = star;
        }
        DataMgr.set(DataMgr.gameLevelData, table);
    }

    isPlayGameLevelFirstTime(map, level) {
        const table = DataMgr.get(DataMgr.gameLevelData, {});
        return table[map] === undefined || table[map][level] === undefined;
    }

    isLatestMap(map) {
        return map === Config.gameLevelMode.mapList[map].length - 1;
    }

    isLatestLevelInMap(map, level) {
        return Config.gameLevelMode.mapList[map].levelList.length - 1 === level;
    }

    getPlayerLevel(exp) {
        exp = exp === undefined ? DataMgr.get(DataMgr.exp, 0) : exp;
        for (let i = 0; i < Config.playerLevelNeededExp.length; i++) {
            if (exp >= Config.playerLevelNeededExp[i]
                && (Config.playerLevelNeededExp[i + 1] === undefined || exp < Config.playerLevelNeededExp[i + 1])) {
                const level = i + 1;
                let totalExp, curExp;
                if (Config.playerLevelNeededExp[i + 1] === undefined) {
                    totalExp = curExp = Config.playerLevelNeededExp[i] - Config.playerLevelNeededExp[i - 1];
                } else {
                    totalExp = Config.playerLevelNeededExp[i + 1] - Config.playerLevelNeededExp[i];
                    curExp = exp - Config.playerLevelNeededExp[i];
                }
                return {level, totalExp, curExp};
            }
        }
    }

    getBikeUpgradeTimes(id) {
        const table = DataMgr.get(DataMgr.bikeUpgrade, {});
        const bike = table[id] || {};
        return bike.times || 0;
    }

    getBikeUpgradeItem(id, index) {
        const table = DataMgr.get(DataMgr.bikeUpgrade, {});
        const bike = table[id] || {};
        const cur = bike[index] || 0;
        return [cur, Config.upgradeBike.maxValue];
    }

    setBikeUpgradeItem(id, index, value) {
        const table = DataMgr.get(DataMgr.bikeUpgrade, {});
        const bike = table[id] || {};
        bike[index] = value;
        bike.times = bike.times || 0;
        bike.times++;
        table[id] = bike;
        DataMgr.set(DataMgr.bikeUpgrade, table);
    }

    upgradeBikeItem(id) {
        const upgradeAbleItems = Config.upgradeBike.items
            .map((item, index) => index)
            .filter((item, index) => {
                const [cur, max] = this.getBikeUpgradeItem(id, index);
                return cur < max;
            });
        const upgradeIndex = Utils.randomChoose(upgradeAbleItems);
        const [cur] = DataMgr.getBikeUpgradeItem(id, upgradeIndex);
        DataMgr.setBikeUpgradeItem(id, upgradeIndex, Math.floor((cur + Config.upgradeBike.addedValueEachTime) * 10) / 10);
        return upgradeIndex;
    }

    getEffectDuration(bikeId, effect, onlyBaseDuration) {
        let base = Config.effect[effect].duration;
        if (!onlyBaseDuration) {
            const index = Config.upgradeBike.items.indexOf(effect);
            if (index !== -1) {
                const [cur] = DataMgr.getBikeUpgradeItem(bikeId, index);
                base += cur;
            }
        }
        return base;
    }

    getBikeUpgradeCost(id) {
        const upgradeTimes = DataMgr.getBikeUpgradeTimes(id);
        return Config.upgradeBike.costCoin[upgradeTimes] || Utils.getLast(Config.upgradeBike.costCoin);
    }

    getRankModeCostCoin() {
        let cost = Config.rankMode.costInfo.coin[DataMgr.get(DataMgr.rankCostLevel, 0)];
        if (cost === undefined) {
            return Utils.getLast(Config.rankMode.costInfo.coin);
        }
        return cost;
    }

    hasShopReceivableCoin() {
        return Config.rewardGoldList.some((r, i) => DataMgr.get(DataMgr.receivedCoinList, []).indexOf(i) === -1
            && OnlineMgr.getOnlineTime() >= r.onlineMinutes * 60);
    }

    hasShopReceivableDiamond() {
        return Config.rewardDiamondList.some((r, i) => DataMgr.get(DataMgr.receivedDiamondList, []).indexOf(i) === -1
            && OnlineMgr.getOnlineTime() >= r.onlineMinutes * 60);
    }

    hasHomeReceivableItem() {
        const homeData = DataMgr.get(DataMgr.homeData).unlocked;
        return Config.home.types.some(type =>
            Config.home[type].some(item => homeData[type].indexOf(item.id) === -1
                && this.isHomeItemUnlockable(type, item.id))
        );
    }

    hasHomeSubTypeReceivableItem(type) {
        const homeData = DataMgr.get(DataMgr.homeData).unlocked[type];
        return Config.home[type].some(item => homeData.indexOf(item.id) === -1
            && this.isHomeItemUnlockable(type, item.id));
    }

    checkConditionsUnlockable(unlockConditions) {
        if (!unlockConditions) {
            return false;
        }
        return !unlockConditions
            .some(condition => {
                if (condition[0] === Config.conditionsEnum.costCoin) {
                    return DataMgr.get(DataMgr.coin, 0) < condition[1];
                } else if (condition[0] === Config.conditionsEnum.costDiamond) {
                    return DataMgr.get(DataMgr.diamond, 0) < condition[1];
                } else {
                    return !this.checkCondition(...condition);
                }
            });
    }

    isDrawAble() {
        return new Date().getTime() >= DataMgr.get(DataMgr.nextFreeDrawTime)
            || DataMgr.get(DataMgr.drawAdvertTimes, 0) < Config.advertDrawBikeTime;
    }

    hasBikeUpgradable() {
        return DataMgr.get(DataMgr.ownedBikeList, []).some(id => this.isBikeUpgradable(id));
    }

    hasOwnedBike(id) {
        return DataMgr.get(DataMgr.unlockAllBike, false)
            || DataMgr.get(DataMgr.ownedBikeList, []).indexOf(id) !== -1;
    }

    isBikeUpgradable(id) {
        if (GameUtils.isSystemLocked("upgradePanelButton")) {
            return false;
        }
        if (!DataMgr.hasOwnedBike(id)) {
            return false;
        }
        const maxTimes = Utils.getLast(Config.upgradeBike.playerLevelLimitTimes);
        const playerLevel = DataMgr.getPlayerLevel().level;
        const curLevelTimes = Config.upgradeBike.playerLevelLimitTimes[playerLevel - 1];
        const upgradeTimes = DataMgr.getBikeUpgradeTimes(id);
        return upgradeTimes < (curLevelTimes === undefined ? maxTimes : curLevelTimes)
            && DataMgr.get(DataMgr.coin, 0) >= DataMgr.getBikeUpgradeCost(id);
    }

    getBulletTimeMaxValue(level) {
        if (level === undefined) {
            level = this.getPlayerLevel().level;
        }
        const list = Config.bulletTime.maxValue;
        const max = Utils.getLast(list);
        const cur = list[level - 1];
        return cur === undefined ? max : cur;
    }

    hasCompletedFirstGameGuide() {
        for (let key in Config.UIGuide) {
            if (Config.UIGuide.hasOwnProperty(key)) {
                const guide = Config.UIGuide[key];
                if (guide.startInFirstTimeShowMainScene) {
                    return DataMgr.hasCompletedGuide(key);
                }
            }
        }
    }

    hasCompletedGuide(guideKey) {
        if (RunOption.forceShowUIGuide === 0) {
            const data = DataMgr.get(DataMgr.showedGuide);
            return data.indexOf(guideKey) !== -1;
        } else if (RunOption.forceShowUIGuide === 1) {
            return false;
        } else if (RunOption.forceShowUIGuide === 2) {
            return true;
        }
    }

    completeGuide(guideKey) {
        const data = DataMgr.get(DataMgr.showedGuide);
        data.push(guideKey);
        DataMgr.set(DataMgr.showedGuide, data);
    }

    getBikeVelocityLevel(id) {
        const config = Config.bikeList.find(bike => bike.id === id);
        let level = 0;
        for (let i = 0; i < Config.bikeVelocityLevel.length; i++) {
            if (config.velocityPercent <= Config.bikeVelocityLevel[i]) {
                return level;
            } else {
                level++;
            }
        }
        return level;
    }

    getBikeJumpLevel(id) {
        const config = Config.bikeList.find(bike => bike.id === id);
        let level = 0;
        for (let i = 0; i < Config.bikeJumpLevel.length; i++) {
            if (config.densityPercent >= Config.bikeJumpLevel[i]) {
                return level;
            } else {
                level++;
            }
        }
        return level;
    }
}

const DataMgr = new DataMgr_();

DataMgr.selectedEndlessScene = "0";
// 整个游戏历史累计的里程
DataMgr.distance = "1";
DataMgr.diamond = "2";
DataMgr.coin = "3";
// 整个游戏历史累计的总分
DataMgr.totalScore = "4";
DataMgr.currentMapScene = "5";
DataMgr.selectedBike = "6";
DataMgr.ownedBikeList = "7";
DataMgr.nextFreeDrawTime = "8";
DataMgr.hasBuyPresentIDList = "9";
DataMgr.unlockAllBike = "10";
DataMgr.unlockAllEndlessScene = "11";
DataMgr.unlockEndlessSceneIDList = "12";
DataMgr.bgmOn = "13";
DataMgr.soundOn = "14";
// 整个游戏历史最好的单次最远距离
DataMgr.distanceRecord = "15";
DataMgr.bikeLevelMap = "16";
DataMgr.homeData = "17";
DataMgr.costCoin = "18";
DataMgr.costDiamond = "19";
DataMgr.nextRankRefreshTime = "20";
// 本次排行累计的里程
DataMgr.rankDistance = "21";
// 本次排行最好的单次最远距离
DataMgr.rankDistanceRecord = "22";
// 本次排行累计的总分
DataMgr.rankTotalScore = "23";
DataMgr.periodIdx = "24";
DataMgr.playername = "25";
DataMgr.headurl = "26";
DataMgr.preparationDataMap = "27";
DataMgr.preparationDataEndless = "28";
DataMgr.giftIndex = "29";
DataMgr.remainGiftOnlineMinutes = "30";
DataMgr.receivedCoinList = "31";
DataMgr.receivedDiamondList = "32";
DataMgr.nextResetTime = "33";
DataMgr.onlineTime = "34";
DataMgr.receivedSignReward = "35";
DataMgr.drawAdvertTimes = "36";
DataMgr.hasShowHomeHelpScene = "37";
DataMgr.mapGameTimes = "38";
DataMgr.unlockSystems = "39";
DataMgr.endlessGameTimes = "40";
DataMgr.preparationDataGameLevel = "41";
DataMgr.gameLevelData = "42";
DataMgr.exp = "43";
DataMgr.bikeUpgrade = "44";
DataMgr.rankCostLevel = "45";
DataMgr.rankCostNextRefreshTime = "46";
DataMgr.mapModeWatchedAdTimes = "47";
DataMgr.throughGuide = "48";
DataMgr.showedGuide = "49";

export default DataMgr;
