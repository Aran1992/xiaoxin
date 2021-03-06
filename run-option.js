const RunOption = {
    // 是否显示帧数信息
    showFPS: 0,
    // 为1就是调试模式 为0就是正常模式
    debug: 0,
    // 排名竞赛NPC是否出现（0就出现 为1就不出现）
    removeAllEnemy: 0,
    // 强制排名模式地图ID，如果为-1的话就是不进行强制，ID从0开始，对应Config.mapList顺序
    fixedMapID: -1,
    // 是否显示死亡线（1就显示 为0就不显示）
    showDeadLine: 0,
    // 是否显示自行车状态（1就显示 为0就不显示）
    showBikeState: 0,
    // 镜头跟随敌方自行车（1就跟随 为0就不跟随）
    cameraFollowEnemy: 0,
    // 是否解除所有系统的限制（1就解除 为0就限制）（测试用，设置这个之后类似的限制都不会有了）
    unlockAllSystem: 0,
    // 是否显示自行车碰撞体（1就显示 为0就不显示）
    showCollider: 0,
    // 是否启用单机模式（该模式下不需要连接服务器，每次游玩都相当于是从头开始）（1就启用 为0就不启用）
    singlePlayerMode: 0,
    // 是否开启所有关卡
    openAllLevel: 0,
    // 强制显示新手引导 0表现不进行控制，1表示每次都会显示，2表现每次都不会显示
    forceShowBeginnerGuide: 0,
    // 强制显示界面引导 0表现不进行控制，1表示每次都会显示，2表现每次都不会显示（主界面引导闯关模式）
    forceShowUIGuide: 0,
    // 强制显示的引导列表（同时只可以测试一条）
    forceShowUIGuideList: [],
//    forceShowUIGuideList: ["抽奖"],
//    forceShowUIGuideList: ["角色扮演"],
//    forceShowUIGuideList: ["无尽旅程"],
//    forceShowUIGuideList: ["签到"],
//    forceShowUIGuideList: ["排名竞赛"],
//    forceShowUIGuideList: ["礼包"],
//    forceShowUIGuideList: ["自行车能力"],
//    forceShowUIGuideList: ["福利"],
//    forceShowUIGuideList: ["排行"],
//    forceShowUIGuideList: ["无尽模式界面引导","排名模式界面引导"],
    // 填写要测试的解锁系统引导，一旦填写了，那么进到GameLevelScene的时候就会马上开始这个引导，还要记得吧unlockAllSystem也打开
    testUnlockSystemGuide: "",
//    testUnlockSystemGuide: "抽奖",
//    testUnlockSystemGuide: "角色扮演",
//    testUnlockSystemGuide: "无尽旅程",
//    testUnlockSystemGuide: "签到",
//    testUnlockSystemGuide: "排名竞赛",
//    testUnlockSystemGuide: "礼包",
//    testUnlockSystemGuide: "自行车能力",
//    testUnlockSystemGuide: "福利",
//    testUnlockSystemGuide: "排行",
};
export default RunOption;
