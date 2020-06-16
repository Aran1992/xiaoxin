const fs = require("fs");
const path = require("path");

const deleteAll = (path) => {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(file => {
            let curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) {
                deleteAll(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

const writeFileSync = (filepath, data) => {
    try {
        fs.mkdirSync(path.dirname(filepath), {recursive: true});
    } catch (e) {
        console.log(e);
    } finally {
        fs.writeFileSync(filepath, data);
    }
};

const copy_ = (src, dist, exceptList) => {
    const exceptFileEnds = [".scene", ".prefab"];
    if (exceptList && exceptList.some(file => file === src)) {
        return;
    }
    if (fs.lstatSync(src).isFile()) {
        if (!exceptFileEnds.some(ends => src.endsWith(ends))) {
            writeFileSync(dist, fs.readFileSync(src));
        }
    } else {
        fs.mkdirSync(dist, {recursive: true});
        fs.readdirSync(src).forEach(file => copy_(path.join(src, file), path.join(dist, file), exceptList));
    }
};

const copy = (src, dist, exceptList) => {
    src = path.resolve(src);
    dist = path.resolve(dist);
    exceptList = exceptList && exceptList.map(file => path.resolve(file));
    copy_(src, dist, exceptList);
};

const list = [
    "selectedBox",
    "selecteID",
    "searchKey",
    "nodeParent",
    "maxID",
    "isOpen",
    "isDirectory",
    "isAniNode",
    "hasChild",
    "id",
    "functions",
];

const filterSceneData = (data) => {
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (list.indexOf(key) !== -1) {
                delete data[key];
            } else if (typeof data[key] === "object") {
                data[key] = filterSceneData(data[key]);
            }
        }
    }
    return data;
};

exports.deleteAll = deleteAll;
exports.writeFileSync = writeFileSync;
exports.copy = copy;
exports.filterSceneData = filterSceneData;
