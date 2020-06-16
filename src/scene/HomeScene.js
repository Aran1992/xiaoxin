import Config from "../config";
import Scene from "./Scene";
import Radio from "../ui/Radio";
import List from "../ui/List";
import {Container, Graphics, Rectangle, Sprite, Texture} from "../libs/pixi-wrapper";
import GameUtils from "../mgr/GameUtils";
import Utils from "../mgr/Utils";
import DataMgr from "../mgr/DataMgr";
import EventMgr from "../mgr/EventMgr";

const BACKGROUNDS = 0;
const FLOORS = 1;
const SPOILS = 2;
const PETS = 3;

function randomPos() {
    let x = Math.random() * Config.home.homeWidth;
    let y = Config.home.floorStartY + Math.random() * (Config.home.homeHeight - Config.home.floorStartY);
    return {x, y};
}

function get(v, dv) {
    return v === undefined ? dv : v;
}

export default class HomeScene extends Scene {
    static onClickReturnButton() {
        App.hideScene("HomeScene");
        App.showScene("MainScene");
    }

    static onClickReturnRankButton() {
        App.hideScene("HomeScene");
        App.showScene("RankScene");
    }

    static initRadioButton(button, info) {
        for (let i = 1; i <= 4; i++) {
            button.ui[`tab${i}Image`].visible = info === i;
        }
    }

    static onClickHomeHelpButton() {
        App.showScene("HelpHomeScene");
    }

    onCreate() {
        this.onClick(this.ui.returnBtn, HomeScene.onClickReturnButton);
        this.onClick(this.ui.hideUIBtn, this.onClickHideUIButton.bind(this));
        this.onClick(this.ui.showUIBtn, this.onClickShowUIButton.bind(this));
        this.onClick(this.ui.startRemoveItemModeBtn, this.onClickStartRemoveItemModeButton.bind(this));
        this.onClick(this.ui.endRemoveItemModeBtn, this.onClickEndRemoveItemModeButton.bind(this));
        this.onClick(this.ui.removeAllItemBtn, this.onClickRemoveAllItemButton.bind(this));
        this.onClick(this.ui.lastBtn, () => this.onClickToggleButton(-1));
        this.onClick(this.ui.nextBtn, () => this.onClickToggleButton(1));
        this.onClick(this.ui.commonItemBtn, this.onClickCommonItemBtn.bind(this));
        this.onClick(this.ui.lockedItemBtn, this.onClickLockedItemBtn.bind(this));
        this.onClick(this.ui.returnRankBtn, HomeScene.onClickReturnRankButton);
        this.onClick(this.ui.homeHelpButton, HomeScene.onClickHomeHelpButton);
        EventMgr.registerEvent("RefreshRankData", this.onRefreshRankData.bind(this));
        EventMgr.registerEvent("GameStop", this.onGameStop.bind(this));
        EventMgr.registerEvent("UpdatePoint", this.updatePoint.bind(this));

        this.ui.showUIBtn.visible = false;
        this.ui.endRemoveItemModeBtn.visible = false;
        this.ui.removeAllItemBtn.visible = false;

        this.radio = new Radio({
            root: this.ui.radio,
            initItemFunc: HomeScene.initRadioButton,
            clickButtonFunc: this.onClickRadio.bind(this),
            infoList: [1, 2, 3, 4]
        });

        this.itemList = new List({
            root: this.ui.itemList,
            initItemFunc: this.initListItem.bind(this),
            updateItemFunc: this.updateListItem.bind(this),
            count: 0,
            isHorizontal: true,
            isStatic: true,
        });

        this.homeContainer = this.ui.homeContainer;
        this.homeContainerPos = App.getGlobalPosition(this.homeContainer);
        this.homeContainerMask = new Graphics()
            .beginFill()
            .drawRect(
                this.homeContainer.getGlobalPosition().x,
                this.homeContainer.getGlobalPosition().y,
                this.homeContainer.mywidth,
                this.homeContainer.myheight
            )
            .endFill();
        this.homeContainer.mask = this.homeContainerMask;
        this.homeInnerContainer = this.homeContainer.addChild(new Container());
        this.bgSprite = this.homeInnerContainer.addChild(new Sprite());
        this.floorSprite = this.homeInnerContainer.addChild(new Sprite());
        this.floorSprite.position.set(0, Config.home.floorStartY);
        this.itemContainer = this.homeInnerContainer.addChild(new Container());

        this.homeMinX = this.homeContainer.mywidth - Config.home.homeWidth;
        this.homeMaxX = 0;
        this.homeMinY = this.homeContainer.myheight - Config.home.homeHeight;
        this.homeMaxY = 0;

        this.moveX = 0;
        this.moveY = 0;

        this.homeContainer.buttonMode = true;
        this.homeContainer.interactive = true;
        this.homeContainer.hitArea = new Rectangle(0, 0, this.homeContainer.mywidth, this.homeContainer.myheight);
        this.homeContainer.on("pointerdown", this.onTouchHomeStart.bind(this));
        this.on("pointermove", this.onTouchMove.bind(this));
        this.on("pointerup", this.onTouchEnd.bind(this));
        this.on("pointerupoutside", this.onTouchEnd.bind(this));

        App.ticker.add(this.gameLoop.bind(this));
    }

    onRefreshRankData() {
        this.ui.distanceText.text = `${Math.floor(DataMgr.get(DataMgr.rankDistance, 0))}m`;
        this.ui.totalScoreText.text = DataMgr.get(DataMgr.rankTotalScore, 0);
        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);
        this.ui.coinText.text = DataMgr.get(DataMgr.coin, 0);
    }

    onShow({bgID, floorID, spoilsList, petsList}, isSelf = true) {
        if (!DataMgr.get(DataMgr.hasShowHomeHelpScene, false)) {
            App.showScene("HelpHomeScene");
            DataMgr.set(DataMgr.hasShowHomeHelpScene, true);
        }
        this.selectedBgID = bgID;
        this.bgIndex = Config.home.backgrounds.findIndex(item => item.id === bgID);
        let bgConfig = Config.home.backgrounds[this.bgIndex];
        this.bgSprite.texture = Texture.from(bgConfig.path);
        let bgScale = bgConfig.itemScale || Config.home.defaultSceneItemScale;
        this.bgSprite.scale.set(bgScale, bgScale);

        this.selectedFloorID = floorID;
        this.floorIndex = Config.home.floors.findIndex(item => item.id === floorID);
        let floorConfig = Config.home.floors[this.floorIndex];
        this.floorSprite.texture = Texture.from(floorConfig.path);
        let floorScale = floorConfig.itemScale || Config.home.defaultSceneItemScale;
        this.floorSprite.scale.set(floorScale, floorScale);

        this.itemContainer.removeChildren();

        spoilsList.forEach(([itemID, id, x, y]) => this.createSpoils(itemID, id, x, y));

        petsList.forEach(id => this.createPet(id));

        this.sortItems();

        if (isSelf) {
            this.refreshPlayerBasicInfo();
            this.radio.select(BACKGROUNDS);
            this.onClickShowUIButton();
        } else {
            this.onClickHideUIButton();
        }
        this.ui.uiContainer.visible = isSelf;
        this.ui.showUIBtn.visible = false;
        this.ui.returnRankBtn.visible = !isSelf;
        this.updatePoint();
    }

    refreshPlayerBasicInfo() {
        this.ui.distanceText.text = `${Math.floor(DataMgr.get(DataMgr.rankDistance, 0))}m`;
        this.ui.diamondText.text = DataMgr.get(DataMgr.diamond, 0);
        this.ui.coinText.text = DataMgr.get(DataMgr.coin, 0);
        this.ui.totalScoreText.text = DataMgr.get(DataMgr.rankTotalScore, 0);
        this.ui.addtionText.text = [
            {text: "Coin", config: "coinPercent"},
            {text: "Distance", config: "distancePercent"},
            {text: "Score", config: "scorePercent"},
            {text: "Exp", config: "expPercent"},
        ]
            .filter(item => GameUtils.getHomeConfig(item.config) !== 0)
            .map(item => `${App.getText(item.text)}: ${Math.floor(GameUtils.getHomeConfig(item.config) * 100)}%`)
            .join("\n");
    }

    createSpoils(itemID, id, x, y) {
        let config = Config.home.spoils.find(item => item.id === id);
        let sprite = Sprite.from(config.path);
        sprite.itemID = itemID;
        sprite.anchor.set(0.5, 1);
        let scale = config.itemScale || Config.home.defaultSceneItemScale;
        sprite.scale.set(scale, scale);
        this.itemContainer.addChild(sprite);
        sprite.position.set(x, y);
        let removeItemBtn = sprite.addChild(Sprite.from(Config.home.removeItemButtonImagePath));
        removeItemBtn.anchor.set(0.5, 0.5);
        removeItemBtn.visible = this.ui.endRemoveItemModeBtn.visible;
        this.onClick(removeItemBtn, this.onClickRemoveItemBtn.bind(this));
        sprite.removeItemBtn = removeItemBtn;
    }

    createPet(id, pos = randomPos()) {
        let outerContainer = this.itemContainer.addChild(new Container());
        let config = Config.home.pets.find(item => item.id === id);
        let innerSprite = outerContainer.addChild(Sprite.from(config.path));
        outerContainer.position.set(pos.x, pos.y);
        innerSprite.anchor.set(0.5, 1);
        let scale = config.itemScale || Config.home.defaultSceneItemScale;
        innerSprite.scale.set(scale, scale);
        let removeItemBtn = outerContainer.addChild(Sprite.from(Config.home.removeItemButtonImagePath));
        removeItemBtn.visible = this.ui.endRemoveItemModeBtn.visible;
        removeItemBtn.anchor.set(0.5, 0.5);
        this.onClick(removeItemBtn, this.onClickRemoveItemBtn.bind(this));
        outerContainer.removeItemBtn = removeItemBtn;
        outerContainer.itemConfig = config;
        let targetPos = randomPos();
        let frame = 0;
        let interval = get(config.petsJumpInterval, Config.home.defaultPetsJumpInterval) * Config.fps;
        outerContainer.onEachFrame = () => {
            let {x, y, final} = GameUtils.moveToTargetPos(
                outerContainer.position,
                targetPos,
                get(config.petsVelocity, Config.home.defaultPetsVelocity)
            );
            outerContainer.position.set(x, y);
            frame++;
            innerSprite.rotation = Utils.angle2radius((Math.floor(frame / interval) % 2 === 0 ? 1 : -1) * get(config.petsJumpRotation, Config.home.defaultPetsJumpRotation));
            if (final) {
                targetPos = randomPos();
            }
        };
    }

    onClickHideUIButton() {
        this.ui.uiContainer.visible = false;
        this.ui.showUIBtn.visible = true;
        this.homeContainer.position.set(0, 0);
        this.homeContainer.mask = undefined;
        this.homeMinX = App.sceneWidth - Config.home.homeWidth;
        this.homeMinY = App.sceneHeight - Config.home.homeHeight;
        this.homeInnerContainer.position.set(0, 0);
    }

    onClickShowUIButton() {
        this.ui.uiContainer.visible = true;
        this.ui.showUIBtn.visible = false;
        this.homeContainer.position.set(this.homeContainerPos.x, this.homeContainerPos.y);
        this.homeContainer.mask = this.homeContainerMask;
        this.homeMinX = this.homeContainer.mywidth - Config.home.homeWidth;
        this.homeMinY = this.homeContainer.myheight - Config.home.homeHeight;
    }

    onClickToggleButton(offset) {
        switch (this.radio.selectedIndex) {
            case BACKGROUNDS: {
                let index = this.bgIndex + offset;
                if (index < 0) {
                    index = Config.home.backgrounds.length - 1;
                } else if (index >= Config.home.backgrounds.length) {
                    index = 0;
                }
                let config = Config.home.backgrounds[index];
                this.bgIndex = index;
                this.bgSprite.texture = Texture.from(config.path);
                let scale = config.itemScale || Config.home.defaultSceneItemScale;
                this.bgSprite.scale.set(scale, scale);
                this.ui.selectItemName.text = App.getText("Backgrounds") + config.id;
                const isLocked = DataMgr.isHomeItemLocked(this.getSelectedType(), config.id);
                this.ui.commonItemBtn.visible = !isLocked && config.id !== this.selectedBgID;
                this.ui.selectedItemBtn.visible = !isLocked && config.id === this.selectedBgID;
                this.ui.lockedItemBtn.visible = isLocked;
                GameUtils.showRedPoint(this.ui.lockedItemBtn, isLocked && DataMgr.isHomeItemUnlockable("backgrounds", config.id));
                break;
            }
            case FLOORS: {
                let index = this.floorIndex + offset;
                if (index < 0) {
                    index = Config.home.floors.length - 1;
                } else if (index >= Config.home.floors.length) {
                    index = 0;
                }
                let config = Config.home.floors[index];
                this.floorIndex = index;
                this.floorSprite.texture = Texture.from(config.path);
                let scale = config.itemScale || Config.home.defaultSceneItemScale;
                this.floorSprite.scale.set(scale, scale);
                this.ui.selectItemName.text = App.getText("Floors") + config.id;
                const isLocked = DataMgr.isHomeItemLocked(this.getSelectedType(), config.id);
                this.ui.commonItemBtn.visible = !isLocked && config.id !== this.selectedFloorID;
                this.ui.selectedItemBtn.visible = !isLocked && config.id === this.selectedFloorID;
                this.ui.lockedItemBtn.visible = isLocked;
                GameUtils.showRedPoint(this.ui.lockedItemBtn, isLocked && DataMgr.isHomeItemUnlockable("floors", config.id));
                break;
            }
            case SPOILS:
            case PETS: {
                let viewLineCount = this.itemList.getViewLineCount();
                let itemCount = this.itemList.getItemCount();
                let index = this.itemList.getIndex() + viewLineCount * offset;
                if (index < 0) {
                    let pages = Math.ceil(itemCount / viewLineCount);
                    index = (pages - 1) * viewLineCount;
                } else if (index >= itemCount) {
                    index = 0;
                }
                this.itemList.setIndex(index);
                break;
            }
        }
    }

    onClickCommonItemBtn() {
        switch (this.radio.selectedIndex) {
            case BACKGROUNDS: {
                this.selectedBgID = Config.home.backgrounds[this.bgIndex].id;
                let data = DataMgr.get(DataMgr.homeData);
                data.bgID = this.selectedBgID;
                DataMgr.set(DataMgr.homeData, data);
                this.ui.commonItemBtn.visible = false;
                this.ui.selectedItemBtn.visible = true;
                break;
            }
            case FLOORS: {
                this.selectedFloorID = Config.home.floors[this.floorIndex].id;
                let data = DataMgr.get(DataMgr.homeData);
                data.floorID = this.selectedFloorID;
                DataMgr.set(DataMgr.homeData, data);
                this.ui.commonItemBtn.visible = false;
                this.ui.selectedItemBtn.visible = true;
                break;
            }
        }
    }

    onClickLockedItemBtn() {
        let id;
        if (this.getSelectedType() === "backgrounds") {
            id = Config.home.backgrounds[this.bgIndex].id;
        } else {
            id = Config.home.floors[this.floorIndex].id;
        }
        this.showLockedInfo(this.getSelectedType(), id);
    }

    onClickRadio(selectedIndex, lastIndex) {
        switch (lastIndex) {
            case BACKGROUNDS: {
                this.ui.selectItemPanel.visible = false;
                this.bgIndex = Config.home.backgrounds.findIndex(item => item.id === this.selectedBgID);
                let config = Config.home.backgrounds[this.bgIndex];
                this.bgSprite.texture = Texture.from(config.path);
                let scale = config.itemScale || Config.home.defaultSceneItemScale;
                this.bgSprite.scale.set(scale, scale);
                break;
            }
            case FLOORS: {
                this.ui.selectItemPanel.visible = false;
                this.floorIndex = Config.home.floors.findIndex(item => item.id === this.selectedFloorID);
                let config = Config.home.floors[this.floorIndex];
                this.floorSprite.texture = Texture.from(config.path);
                let scale = config.itemScale || Config.home.defaultSceneItemScale;
                this.floorSprite.scale.set(scale, scale);
                break;
            }
            case SPOILS:
            case PETS: {
                this.ui.itemList.visible = false;
                break;
            }
            default : {
                this.ui.itemList.visible = false;
                this.ui.selectItemPanel.visible = false;
            }
        }
        switch (selectedIndex) {
            case BACKGROUNDS: {
                this.ui.selectItemPanel.visible = true;
                let config = Config.home.backgrounds.find(item => item.id === this.selectedBgID);
                this.ui.selectItemName.text = config && App.getText("Backgrounds") + config.id;
                this.ui.commonItemBtn.visible = false;
                this.ui.selectedItemBtn.visible = true;
                this.ui.lockedItemBtn.visible = false;
                break;
            }
            case FLOORS: {
                this.ui.selectItemPanel.visible = true;
                let config = Config.home.floors.find(item => item.id === this.selectedFloorID);
                this.ui.selectItemName.text = config && App.getText("Floors") + config.id;
                this.ui.commonItemBtn.visible = false;
                this.ui.selectedItemBtn.visible = true;
                this.ui.lockedItemBtn.visible = false;
                break;
            }
            case SPOILS: {
                this.ui.itemList.visible = true;
                this.itemList.reset(Config.home.spoils.length);
                break;
            }
            case PETS: {
                this.ui.itemList.visible = true;
                this.itemList.reset(Config.home.pets.length);
                break;
            }
        }
    }

    initListItem(item) {
        let sprite = item.ui.icon.children[0];
        sprite.anchor.set(0.5, 0.5);
        sprite.position.set(item.ui.icon.mywidth / 2, item.ui.icon.myheight / 2);

        item.buttonMode = true;
        item.interactive = true;
        item.on("pointerdown", (...args) => this.onTouchItemStart(item, ...args));
    }

    updateListItem(item, index) {
        let type = this.getSelectedType();
        let config = Config.home[type][index];
        let sprite = item.ui.icon.children[0];
        sprite.texture = Texture.from(config.path);
        let scale = config.iconScale || Config.home.defaultIconItemScale;
        item.ui.icon.children[0].scale.set(scale, scale);
        item.itemConfig = config;
        let locked = DataMgr.isHomeItemLocked(type, config.id);
        GameUtils.greySprite(sprite, locked);
        item.ui.lockedImage.visible = locked;
        GameUtils.showRedPoint(item, locked && DataMgr.isHomeItemUnlockable(type, config.id));
    }

    onTouchHomeStart(event) {
        this.touching = true;
        this.lastTouchPosition = {x: event.data.global.x, y: event.data.global.y};
    }

    onTouchItemStart(item, event) {
        if (DataMgr.isHomeItemLocked(this.getSelectedType(), item.itemConfig.id)) {
            this.showLockedInfo(this.getSelectedType(), item.itemConfig.id);
        } else {
            let sprite = this.addChild(new Sprite());
            sprite.texture = Texture.from(item.itemConfig.path);
            sprite.anchor.set(0.5, 1);
            let {x, y} = App.trans2GlobalPosition(event.data.global);
            sprite.position.set(x, y);
            let scale = item.itemConfig.itemScale || Config.home.defaultSceneItemScale;
            sprite.scale.set(scale, scale);
            this.touchingSprite = sprite;
            this.touchingItemID = item.itemConfig.id;
        }
    }

    onTouchMove(event) {
        let {x: tx, y: ty} = App.trans2GlobalPosition(event.data.global);
        if (this.touching) {
            let moveX = tx - this.lastTouchPosition.x;
            let newX = this.homeInnerContainer.x + moveX;
            if (newX >= this.homeMinX && newX < this.homeMaxX) {
                this.homeInnerContainer.x = newX;
            }
            let moveY = ty - this.lastTouchPosition.y;
            let newY = this.homeInnerContainer.y + moveY;
            if (newY >= this.homeMinY && newY < this.homeMaxY) {
                this.homeInnerContainer.y = newY;
            }
            this.lastTouchPosition.x = tx;
            this.lastTouchPosition.y = ty;
        } else if (this.touchingSprite) {
            this.touchingSprite.position.set(tx, ty);
            if (tx < this.homeContainer.x + Config.home.edgeMoveOffset.x
                && tx > this.homeContainer.x) {
                this.moveX = Config.home.edgeMoveVelocity.x;
            } else if (tx > this.homeContainer.x + this.homeContainer.mywidth - Config.home.edgeMoveOffset.x
                && tx < this.homeContainer.x + this.homeContainer.mywidth) {
                this.moveX = -Config.home.edgeMoveVelocity.x;
            } else {
                this.moveX = 0;
            }
            if (ty < this.homeContainer.y + Config.home.edgeMoveOffset.y
                && ty > this.homeContainer.y) {
                this.moveY = Config.home.edgeMoveVelocity.y;
            } else if (ty > this.homeContainer.y + this.homeContainer.myheight - Config.home.edgeMoveOffset.y
                && ty < this.homeContainer.y + this.homeContainer.myheight) {
                this.moveY = -Config.home.edgeMoveVelocity.y;
            } else {
                this.moveY = 0;
            }
        }
    }

    onTouchEnd(event) {
        if (this.touching) {
            this.touching = false;
        } else if (this.touchingSprite) {
            this.touchingSprite.destroy();
            this.touchingSprite = undefined;
            let data = DataMgr.get(DataMgr.homeData);
            if (this.radio.selectedIndex === SPOILS) {
                if (data.spoilsList.length >= Config.home.spoilsMaxCount) {
                    return App.showNotice(App.getText("骑士大人，战力品摆放已经超过总上限${count}个了哟！", {count: Config.home.spoilsMaxCount}));
                }
            } else if (this.radio.selectedIndex === PETS) {
                if (data.petsList.length >= Config.home.petsMaxCount) {
                    return App.showNotice(App.getText("骑士大人，宠物摆放已经超过总上限${count}个了哟！", {count: Config.home.petsMaxCount}));
                } else if (data.petsList.filter(id => id === this.touchingItemID).length >= Config.home.petsOfTheSameKindMaxCount) {
                    return App.showNotice(App.getText("骑士大人，这个宠物最多只能放出${count}个哟！", {count: Config.home.petsOfTheSameKindMaxCount}));
                }
            }
            let pos = this.homeContainer.getGlobalPosition();
            let rect = {
                x: pos.x,
                y: pos.y + Config.home.floorStartY,
                width: this.homeContainer.mywidth,
                height: this.homeContainer.myheight - Config.home.floorStartY
            };
            if (Utils.isPointInRect(event.data.global, rect)) {
                let x = event.data.global.x - pos.x - this.homeInnerContainer.x;
                let y = event.data.global.y - pos.y - this.homeInnerContainer.y;
                if (this.radio.selectedIndex === SPOILS) {
                    const itemID = data.spoilsList.length + 1;
                    this.createSpoils(itemID, this.touchingItemID, x, y);
                    data.spoilsList.push([itemID, this.touchingItemID, x, y]);
                } else {
                    this.createPet(this.touchingItemID, {x, y});
                    data.petsList.push(this.touchingItemID);
                }
                this.sortItems();
                DataMgr.set(DataMgr.homeData, data);
            }
        }
        this.moveX = 0;
        this.moveY = 0;
    }

    onClickStartRemoveItemModeButton() {
        this.itemContainer.children.forEach(child => child.removeItemBtn.visible = true);
        this.ui.startRemoveItemModeBtn.visible = false;
        this.ui.endRemoveItemModeBtn.visible = true;
        this.ui.removeAllItemBtn.visible = true;
    }

    onClickEndRemoveItemModeButton() {
        this.itemContainer.children.forEach(child => child.removeItemBtn.visible = false);
        this.ui.startRemoveItemModeBtn.visible = true;
        this.ui.endRemoveItemModeBtn.visible = false;
        this.ui.removeAllItemBtn.visible = false;
    }

    onClickRemoveItemBtn(button) {
        App.showScene("TipScene", {
            tip: App.getText("ConfirmDeleteHomeItem"),
            confirmCallback: () => {
                let item = button.parent;
                let data = DataMgr.get(DataMgr.homeData);
                if (item.onEachFrame !== undefined) {
                    Utils.removeItemFromArray(data.petsList, item.itemConfig.id);
                } else {
                    let index = data.spoilsList.findIndex(spoils => spoils[0] === item.itemID);
                    if (index !== -1) {
                        data.spoilsList.splice(index, 1);
                    }
                }
                DataMgr.set(DataMgr.homeData, data);
                item.destroy();
            },
            cancelCallback: () => {
            }
        });
    }

    onClickRemoveAllItemButton() {
        App.showScene("TipScene", {
            tip: App.getText("ConfirmDeleteAllHomeItem"),
            confirmCallback: () => {
                App.showScene("TipScene", {
                    tip: App.getText("ConfirmDeleteAllHomeItemAgain"),
                    confirmCallback: () => {
                        this.itemContainer.removeChildren();
                        let data = DataMgr.get(DataMgr.homeData);
                        data.spoilsList = [];
                        data.petsList = [];
                        DataMgr.set(DataMgr.homeData, data);
                    },
                    cancelCallback: () => {
                    }
                });
            },
            cancelCallback: () => {
            }
        });
    }

    sortItems() {
        this.itemContainer.children.sort((a, b) => {
            let diff = a.y - b.y;
            if (diff === 0) {
                diff = a.x - b.x;
            }
            return diff;
        });
    }

    gameLoop() {
        this.itemContainer.children.forEach(item => item.onEachFrame && item.onEachFrame());
        this.sortItems();
        let newX = this.homeInnerContainer.x + this.moveX;
        if (newX >= this.homeMinX && newX < this.homeMaxX) {
            this.homeInnerContainer.x = newX;
        }
        let newY = this.homeInnerContainer.y + this.moveY;
        if (newY >= this.homeMinY && newY < this.homeMaxY) {
            this.homeInnerContainer.y = newY;
        }
    }

    getUnlockConditions(type, id, ignoreCost) {
        let config = Config.home[type].find(item => item.id === id);
        if (config.unlockConditions) {
            let conditions = config.unlockConditions;
            if (ignoreCost) {
                conditions = conditions.filter(list => [Config.conditionsEnum.costCoin, Config.conditionsEnum.costDiamond].indexOf(list[0]) === -1);
            }
            return conditions.map(([id, ...args]) => {
                if (id === Config.conditionsEnum.unlockMap) {
                    let config = Config.endlessMode.sceneList[args[0]];
                    let mapName = config.name ? App.getText(config.name) : App.getText("Map") + config.id;
                    return App.getText(Config.conditions[id], [mapName]);
                } else {
                    return App.getText(Config.conditions[id], args);
                }
            });
        } else {
            return [];
        }
    }

    getUnlockRewards(type, id) {
        let config = Config.home[type].find(item => item.id === id);
        if (config.unlockRewards) {
            return [
                {text: "Coin", config: "coinPercent"},
                {text: "Distance", config: "distancePercent"},
                {text: "Score", config: "scorePercent"},
                {text: "Exp", config: "expPercent"},
            ]
                .filter(item => config.unlockRewards[item.config] !== 0)
                .map(item => `${App.getText(item.text)}: ${Math.floor(config.unlockRewards[item.config] * 100)}%`);
        } else {
            return [];
        }
    }

    getUnlockCosts(type, id) {
        let config = Config.home[type].find(item => item.id === id);
        if (config.unlockConditions) {
            return config.unlockConditions
                .filter(list => list[0] === Config.conditionsEnum.costCoin || list[0] === Config.conditionsEnum.costDiamond)
                .map(([id, ...args]) => App.getText(Config.conditions[id], args));
        } else {
            return [];
        }
    }

    showLockedInfo(type, id) {
        if (DataMgr.isHomeItemSatisfiedCostCondition(type, id)) {
            let conditions = this.getUnlockConditions(type, id, true);
            App.showTip(
                `${App.getText("ItemIsAbleToUnlock")}

${conditions.length !== 0 ? App.getText("UnlockConditions") + "\n" + conditions.join("\n") + "\n" : ""}
${App.getText("UnlockRewards")}
${this.getUnlockRewards(type, id).join("\n")}

${App.getText("Would you like to cost the following items to unlock this item?")}
${this.getUnlockCosts(type, id).join("\n")}`,
                () => {
                    let coin = DataMgr.get(DataMgr.coin, 0);
                    let diamond = DataMgr.get(DataMgr.diamond, 0);
                    let config = Config.home[type].find(item => item.id === id);
                    let conditions = config.unlockConditions;
                    let coinCondition = conditions.find(list => list[0] === Config.conditionsEnum.costCoin);
                    let costCoin = coinCondition ? coinCondition[1] : 0;
                    let diamondCondition = conditions.find(list => list[0] === Config.conditionsEnum.costDiamond);
                    let costDiamond = diamondCondition ? diamondCondition[1] : 0;
                    if (coin < costCoin || diamond < costDiamond) {
                        App.showNotice(App.getText("Cost is not enough!"));
                    } else {
                        DataMgr.set(DataMgr.coin, coin - costCoin);
                        DataMgr.set(DataMgr.diamond, diamond - costDiamond);
                        let data = DataMgr.get(DataMgr.homeData);
                        data.unlocked[type].push(id);
                        DataMgr.set(DataMgr.homeData, data);
                        this.refreshPlayerBasicInfo();
                        this.refreshCurItemInfo();
                        config.unlockInfo && App.showScene("NewContentScene", config.unlockInfo);
                        EventMgr.dispatchEvent("UpdatePoint");
                    }
                },
                () => {
                }
            );
        } else {
            App.showTip(
                `${App.getText("This item is locked.")}
                
${App.getText("UnlockConditions")}
${this.getUnlockConditions(type, id).join("\n")}

${App.getText("UnlockRewards")}
${this.getUnlockRewards(type, id).join("\n")}`,
                () => {
                },
                () => {
                },
                true
            );
        }
    }

    getSelectedType() {
        return Config.home.types[this.radio.selectedIndex];
    }

    refreshCurItemInfo() {
        switch (this.radio.selectedIndex) {
            case BACKGROUNDS: {
                let config = Config.home.backgrounds[this.bgIndex];
                this.ui.commonItemBtn.visible = config.id !== this.selectedBgID;
                this.ui.selectedItemBtn.visible = config.id === this.selectedBgID;
                this.ui.lockedItemBtn.visible = false;
                break;
            }
            case FLOORS: {
                let config = Config.home.floors[this.floorIndex];
                this.ui.commonItemBtn.visible = config.id !== this.selectedFloorID;
                this.ui.selectedItemBtn.visible = config.id === this.selectedFloorID;
                this.ui.lockedItemBtn.visible = false;
                break;
            }
            case SPOILS:
            case PETS: {
                this.itemList.refresh();
                break;
            }
        }
    }

    onGameStop() {
        if (this.touchingSprite) {
            this.touchingSprite.destroy();
            this.touchingSprite = undefined;
        }
    }

    updatePoint() {
        this.radio.buttonList.forEach((button, index) => {
            GameUtils.showRedPoint(button, DataMgr.hasHomeSubTypeReceivableItem(Config.home.types[index]));
        });
    }
}

HomeScene.sceneFilePath = "myLaya/laya/pages/View/HomeScene.scene.json";
