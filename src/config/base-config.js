const Config = {
    stepTimesEachFrame: 10,
    bulletTimeTargetVelocity: 10,
    roadFatalMinLength: 0.5,
    listResistance: 2,
    resolution: 1,
    // 1像素等于多少米
    pixel2meter: 0.0625,
    // 1米等于多少像素
    meter2pixel: 16,
    // 自行车图集
    bikeCommonAnimation: "myLaya/laya/assets/animations/bike.json",
    // 自行车缩放比例
    bikeScale: 0.25,
    // 自行车物理半径
    bikeRadius: 0.734375,
    // 自行车超级无敌冲刺半径
    bikeSprintRadius: 1.5,
    // 自行车密度
    bikeDensity: 1,
    // 自行车跳跃的时候的旋转角度 顺时针旋转是正数
    bikeJumpingRotation: -30,
    // 自行车普通跳跃的次数
    jumpCommonMaxCount: 2,
    // 自行车每次额外跳跃距离上次跳跃的帧数限制
    // 比如说第一个数配置20，第二个数配置18，
    // 想要进行额外跳跃的话，那么在第二次跳跃之后，要在20帧之内进行，不然就错过时机了
    // 如果想要再继续额外跳跃的话，那么在这次之后的18帧之内进行，不然就错过时机了
    // 还想继续额外跳跃的话，如果没有配置第三项的话，就没办法跳跃了
    bikeJumpExtraCountdown: [20, 18, 16, 14, 12, 10],
    bikeLeftMargin: 150,
    bikeCameraMinY: 540,
    bikeCameraMaxY: 740,
    bikeGameOverAngularVelocity: 50,
    testbedSpeed: 1,
    fps: 60,
    maskHeight: 420,
    maskColorStop: [
        {offset: 0, opacity: 0},
        {offset: 0.25, opacity: 0.5},
        {offset: 0.75, opacity: 1},
        {offset: 1, opacity: 1},
    ],
    edgeHeight: 20,
    edgeColorStop: [
        {offset: 1, opacity: 0},
        {offset: 0, opacity: 0.75},
    ],
    // 自行车速度
    bikeVelocity: 20,
    // 重力
    gravity: -200,
    // 跳跃爆发力
    jumpForce: 5000,
    mapBasePath: "myLaya/laya/pages/Map/",
    finalFlagImagePath: "images/flag.png",
    // 自行车加速的帧数
    accFrame: 420,
    startScene: {
        endlessText: {
            fontSize: 50,
            fill: "red"
        },
        mapText: {
            fontSize: 50,
            fill: "green"
        },
    },
    gameOverScene: {
        msgText: {
            fontSize: 100,
            fill: "red"
        },
        buttonText: {
            fontSize: 50,
            fill: "white"
        },
    },
    fatalEdgeAngleRange: [Math.PI / 180 * 80, Math.PI / 180 * 100],
    goldCoinAniJson: "myLaya/laya/assets/animations/gold-coin-animation.json",
    accGemAniJson: "images/crystal-jet-animation.json",
    fireWallAniJson: "images/firewall-animation.json",
    birdAniJson: "images/bird-animation.json",
    // 视差背景系数：左右
    horizontalParallaxDepth: [0.75, 0.5, 0.25, 0],
    // 视差背景系数：上下
    verticalParallaxDepth: [0.75, 0.5, 0.25, 0],
    // 背景的Y轴位置
    bgY: [0, 280, 560],
    //代表自行车低于当前路面的最低点多少就算死亡
    bikeGameOverOffsetHeight: 30,
    bikeAdjustHeightOffset: [-250, -100],
    // 最上层背景的补边高度
    bgOffsetHeight: 360,
    // 是否开启镜头自动调距功能
    enableCameraAutoZoom: 1,
    // 镜头自动调整缩放系数
    cameraAutoZoomCoefficient: 0.5,
    // 默认背景音乐
    defaultBgmPath: "myLaya/laya/assets/sounds/SoundBGM002.mp3",
    // 主界面背景音乐
    mainBgmPath: "myLaya/laya/assets/sounds/SoundBGM002.mp3",
    defaultBgScale: [1, 1, 1,]
};

// 地图配置
Config.mapList = [
    {
        // scene文件的路径
        scenePath: "Test",
        // 地图所需的图片路径（看描述还是不明白是啥的话 可以直接打开对应的文件看看）
        texture: {
            // 侧边
            side: "images/TextureScorpiusRoad01SideSkin.png",
            // 底部
            top: "images/TextureScorpiusRoad01TopSkin.png",
            // 背景 有多少层背景就配置多少张
            bg: [
                "images/TextureScorpiusBackground01.png",
                "images/TextureScorpiusBackground02.png",
                "images/TextureScorpiusBackground03.png",
            ]
        },
        // 背景的Y轴位置
        bgY: [0, 280, 560],
        // 视差背景系数：左右
        horizontalParallaxDepth: [0.75, 0.5, 0.25, 0],
        // 视差背景系数：上下
        verticalParallaxDepth: [0.75, 0.5, 0.25, 0],
        // 自行车速度
        bikeVelocity: 20,
        // 重力
        gravity: -200,
        // 跳跃爆发力
        jumpForce: 5000,
    },
];

Config.endlessMode = {
    baseScenePath: "myLaya/laya/pages/RoadSection/",
};

Config.endlessMode.sceneList = [
    {
        // 地图所需的图片路径（看描述还是不明白是啥的话 可以直接打开对应的文件看看）
        texture: {
            // 侧边
            side: "images/Aquarius/TextureAquariusRoad01SideSkin.png",
            // 底部
            top: "images/Aquarius/TextureAquariusRoad01TopSkin.png",
            // 背景 有多少层背景就配置多少张
            bg: [
                "images/Aquarius/TextureAquariusBackground01.png",
                "images/Aquarius/TextureAquariusBackground02.png",
                "images/Aquarius/TextureAquariusBackground03.png",
            ]
        },
        // 视差背景系数左右
        horizontalParallaxDepth: [0.9, 0.8, 0.5, 0],
        // 视差背景系数：上下
        verticalParallaxDepth: [1, 1, 0.8, 0],
        // 自行车速度（基础：20）
        bikeVelocity: 20,
        // 重力（基础：-200）
        gravity: -50,
        // 跳跃爆发力（基础：5000）
        jumpForce: 12800,
        roadSectionList: [
            [
                {
                    // scene文件的路径
                    scenePath: "Test/0/Test",
                },
                {
                    // scene文件的路径
                    scenePath: "Test/0/Test2",
                },
            ],
            [
                {
                    // scene文件的路径
                    scenePath: "Test/1/Test",
                },
                {
                    // scene文件的路径
                    scenePath: "Test/1/Test2",
                },
            ],
        ]
    },
];

// 是否开启镜头自动调距功能
Config.enableCameraAutoZoom = 1;
// 普通状态下镜头的缩放倍数
Config.cameraAutoZoomCommonScale = 2;
// 镜头缩放的速度 每帧变化的缩放大小
Config.cameraAutoZoomScaleSpeed = 0.01;

Config.imagePath = {
    bikeParticle: "images/particles/bike.png",
    itemAccGem: "images/item-acc.png",
    bubble: "images/bubble.png",
    racetrackPlayer: "myLaya/laya/assets/images/racetrack-player.png",
    racetrackEnemy: "myLaya/laya/assets/images/racetrack-npc.png",
    rebornArrow: "myLaya/laya/assets/images/UI_Respawn_ArrowS.png",
    start1: "myLaya/laya/assets/images/start-1.png",
    start2: "myLaya/laya/assets/images/start-2.png",
    start3: "myLaya/laya/assets/images/start-3.png",
    startGo: "myLaya/laya/assets/images/start-go.png",
    randomItem: "myLaya/laya/assets/animations/Random.json",
    rankText1: "myLaya/laya/assets/images/no-1.png",
    rankText2: "myLaya/laya/assets/images/no-2.png",
    rankText3: "myLaya/laya/assets/images/no-3.png",
    rankText4: "myLaya/laya/assets/images/no-4.png",
    speedUpNotice: "myLaya/laya/assets/animations/speed-up.json",
    lockedLevel: "myLaya/laya/assets/images/icon_mapbtn_lock.png",
    enabledLevel: "myLaya/laya/assets/images/icon_mapbtn.png",
    selectedLevel: "myLaya/laya/assets/images/icon_mapbtn_select.png",
};

Config.emitterPath = {
    bike: "images/particles/bike.json"
};

Config.startImagePath = {
    ui: "images/ui.json"
};

Config.bike = {
    density: 1,
    deadCompleteTime: 500,
    adjustHeightVelocity: 0.25,
};

Config.enemy = {
    count: 3,
    contactPlayerAlpha: 0.5
};

Config.sceneItemImagePath = {
    groundStab: "images/ground_stab.json",
};

Config.loadingImagePathList = [
    "images/loading/of_native_loader_progress_01.png",
    "images/loading/of_native_loader_progress_02.png",
    "images/loading/of_native_loader_progress_03.png",
    "images/loading/of_native_loader_progress_04.png",
    "images/loading/of_native_loader_progress_05.png",
    "images/loading/of_native_loader_progress_06.png",
    "images/loading/of_native_loader_progress_07.png",
    "images/loading/of_native_loader_progress_08.png",
    "images/loading/of_native_loader_progress_09.png",
    "images/loading/of_native_loader_progress_11.png",
    "images/loading/of_native_loader_progress_12.png",
];

Config.i18nPath = "dist/i18n.json";

Config.starCount = 3;

export default Config;
