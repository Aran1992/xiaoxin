export default class Value {
    constructor(basicValue = 0, rate = 1, basicValueRate = 1) {
        this.basicValue = basicValue;
        this.rate = rate;
        this.basicValueRate = basicValueRate;
        this.calcFinalValue();
    }

    setBasicValue(value) {
        this.basicValue = value;
        return this.calcFinalValue();
    }

    setBasicValueRate(rate) {
        this.basicValueRate = rate;
        return this.calcFinalValue();
    }

    getBasicValueRate() {
        return this.basicValueRate;
    }

    increaseValueByRate(rate) {
        this.rate += rate;
        return this.calcFinalValue();
    }

    calcFinalValue() {
        this.value = this.basicValue * this.basicValueRate * this.rate;
        return this.value;
    }
}
