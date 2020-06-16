import BaseEffect from "./BaseEffect";

export default class BikeEffect extends BaseEffect {
    constructor(bike, effectPath, animationEndCallback, gameMgr) {
        super(effectPath, animationEndCallback, gameMgr);
        bike.addBikeChild(this.sprite, this.index);
    }
}
