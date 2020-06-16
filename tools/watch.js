const fs = require("fs");
const path = require("path");
const utils = require("./utils");
const i18n = require("./i18n").i18n;
const pack = require("./pack").pack;
const root = "..";
const sceneFileRoot = "../myLaya";

pack(sceneFileRoot);

eval(fs.readFileSync("../publish.config.js", "utf8"));
i18n(global.publishConfig.language, "../i18n.csv", "../dist/i18n.json");

fs.watch(root, {recursive: true}, (event, filename) => {
    console.log(event, filename);
    if (filename && event === "change") {
        if (filename.endsWith(".scene") || filename.endsWith(".prefab")) {
            let filepath = path.join(root, filename);
            fs.readFile(filepath, "utf8", (err, data) => {
                if (err) {
                    return console.log(`file:${filepath} change read err`, err);
                }
                data = data
                    .replace(/\.prefab/g, ".prefab.json")
                    .replace(/\.scene/g, ".scene.json");
                fs.writeFileSync(filepath + ".json", JSON.stringify(utils.filterSceneData(JSON.parse(data))));
            });
        } else if (filename.endsWith("i18n.csv") || filename === "publish.config.js") {
            try {
                eval(fs.readFileSync("../publish.config.js", "utf8"));
                i18n(global.publishConfig.language, "../i18n.csv", "../dist/i18n.json");
            } catch (e) {
                console.log(e);
            }
        }
    }
});
