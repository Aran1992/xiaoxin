import EventMgr from "./EventMgr";

export default class GameTimer {
    constructor(callback, timeout) {
        this.eventTable = {
            "GameStart": this.onGameStart.bind(this),
            "GameStop": this.onGameStop.bind(this),
            "GamePause": this.onGamePause.bind(this),
            "GameResume": this.onGameResume.bind(this),
        };
        for (let event in this.eventTable) {
            if (this.eventTable.hasOwnProperty(event)) {
                EventMgr.registerEvent(event, this.eventTable[event]);
            }
        }
        this.appStatus = 1;
        this.gameStatus = 1;
        this.callback = callback;
        this.timeout = timeout;
        this.setTimeout();
    }

    setTimeout() {
        this.start = new Date().getTime();
        this.timer = setTimeout(this.onTimeout.bind(this), this.timeout);
    }

    clearTimeout() {
        clearTimeout(this.timer);
        delete this.timer;
        this.unregisterEventTable();
    }

    unregisterEventTable() {
        for (let event in this.eventTable) {
            if (this.eventTable.hasOwnProperty(event)) {
                EventMgr.unregisterEvent(event, this.eventTable[event]);
            }
        }
    }

    onTimeout() {
        this.unregisterEventTable();
        this.callback();
    }

    onGameStop() {
        this.appStatus = 0;
        this.onPause();
    }

    onGameStart() {
        this.appStatus = 1;
        this.onResume();
    }

    onGamePause() {
        this.gameStatus = 0;
        this.onPause();
    }

    onGameResume() {
        this.gameStatus = 1;
        this.onResume();
    }

    onPause() {
        if (!this.appStatus || !this.gameStatus) {
            if (this.timer !== undefined) {
                const end = new Date().getTime();
                clearTimeout(this.timer);
                delete this.timer;
                this.timeout -= end - this.start;
            }
        }
    }

    onResume() {
        if (this.appStatus && this.gameStatus) {
            if (this.timer === undefined) {
                this.setTimeout();
            }
        }
    }
}
