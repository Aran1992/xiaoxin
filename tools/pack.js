const fs = require("fs");
const path = require("path");
const utils = require("./utils");

const handle = (root) => {
    const files = fs.readdirSync(root);
    files.forEach(file => {
        let filepath = path.join(root, file);
        if (fs.lstatSync(filepath).isFile()) {
            if (filepath.endsWith(".scene") || filepath.endsWith(".prefab")) {
                let data = fs.readFileSync(filepath, "utf8")
                    .replace(/\.prefab/g, ".prefab.json")
                    .replace(/\.scene/g, ".scene.json");
                fs.writeFileSync(filepath + ".json", JSON.stringify(utils.filterSceneData(JSON.parse(data))));
            }
        } else {
            handle(filepath);
        }
    });
};

exports.pack = (root) => {
    handle(root);
    console.log("pack success");
};
