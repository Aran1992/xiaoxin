const path = require("path");
module.exports = {
    entry: "./game.js",
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader",
                options: {
                    presets: ["@babel/preset-env"]
                }
            }
        }]
    },
    resolve: {
        extensions: ["*", ".js"]
    },
    output: {
        path: path.resolve("./dist"),
        filename: "bundle.js"
    },
    mode: "development"
};
