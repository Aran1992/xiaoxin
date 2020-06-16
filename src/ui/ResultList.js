import List from "./List";

export default class ResultList {
    constructor(root) {
        this.resultList = new List({
            root: root,
            updateItemFunc: this.updateResultItem.bind(this),
            isStatic: true,
        });
    }

    update(dataList) {
        this.dataList = dataList;
        this.resultList.reset(this.dataList.length);
    }

    updateResultItem(item, index) {
        const config = this.dataList[index];
        let finalValue = config.originValue * config.multiple;
        if (config.doubleReward) {
            finalValue *= 2;
        }
        item.children[0].text = `${App.getText(config.name)}\t${config.originValue}`;
        item.children[1].text = `x${config.multiple}${config.doubleReward ? " x2" : ""}->`;
        item.children[2].text = `${App.getText(config.name)}\t${Math.floor(finalValue)}`;
    }
}