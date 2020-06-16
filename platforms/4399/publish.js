const utils = require("../../tools/utils");
const fs = require("fs");
const webpack = require("webpack");
const config = require("./webpack.config");
const i18n = require("../../tools/i18n").i18n;
const language = require("./publish.config").language;
const pack = require("../../tools/pack").pack;
const archiver = require("archiver");

function removeDir() {
    utils.deleteAll("./publish");
}

function createDir() {
    fs.mkdirSync("./publish");
}

function createCode(callback) {
    webpack(config, callback);
}

function createLanguageText() {
    i18n(language, "../../i18n.csv", "./dist/i18n.json");
}

function createSceneJSON() {
    pack("../../myLaya/laya");
}

function copyRes() {
    [
        "images",
        "myLaya/laya/pages",
        "myLaya/laya/assets/animations",
        "myLaya/laya/assets/images",
        "myLaya/laya/assets/prefabs",
        "myLaya/laya/assets/sounds",
    ].forEach(file => utils.copy(`../../${file}`, `./publish/${file}`));
    utils.copy("./dist", "./publish/dist");
    utils.copy("./index.html", "./publish/index.html");
}

function createZip() {
    let zipPath = "./publish.zip";

    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    let archive = archiver("zip", {zlib: {level: 9}});

    let output = fs.createWriteStream(zipPath);

    output.on("close", function () {
        console.log(archive.pointer() + " total bytes");
        console.log("archiver has been finalized and the output file descriptor has closed.");
    });

    output.on("end", function () {
        console.log("Data has been drained");
    });

    archive.on("warning", function (err) {
        if (err.code === "ENOENT") {
            // log warning
            console.warn(err);
        } else {
            // throw error
            throw err;
        }
    });

    archive.on("error", function (err) {
        throw err;
    });

    archive.pipe(output);

    archive.directory("./publish", false);

    archive.finalize();
}

removeDir();
createDir();
createCode(() => {
    createLanguageText();
    createSceneJSON();
    copyRes();
    createZip();
});
