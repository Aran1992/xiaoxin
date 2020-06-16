import Utils from "./Utils";

const eventTable = {};

export default class EventMgr {
    static registerEvent(event, handler) {
        if (eventTable[event] === undefined) {
            eventTable[event] = [];
        }
        eventTable[event].push(handler);
    }

    static unregisterEvent(event, handler) {
        if (eventTable[event]) {
            Utils.removeItemFromArray(eventTable[event], handler);
        }
    }

    static dispatchEvent(event, ...args) {
        if (eventTable[event]) {
            eventTable[event].forEach(handler => handler(...args));
        }
    }
}
