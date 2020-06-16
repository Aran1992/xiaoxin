const xlsx = require("xlsx");
const fs = require("fs");
const utils = require("./utils");
exports.i18n = (language, input, output) => {
    let buf = fs.readFileSync(input);
    let wb = xlsx.read(buf, {type: "buffer"});
    let sheet = wb.Sheets.Sheet1;
    let column;
    for (let code = 65; ; code++) {
        column = String.fromCharCode(code);
        if (sheet[`${column}2`] && sheet[`${column}2`].v === language) {
            break;
        }
    }
    let table = {};
    for (let row = 3, id = sheet[`A${row}`]; id; row++, id = sheet[`A${row}`]) {
        if (table[id.v]) {
            console.log(`存在复数个ID为${id.v}的条目`);
            continue;
        }
        table[id.v] = sheet[`${column}${row}`].v;
    }
    utils.writeFileSync(output, JSON.stringify(table));
    console.log("i18n generate success");
};
