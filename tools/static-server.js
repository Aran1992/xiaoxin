const express = require("express");
const staticServer = express();

staticServer.use(express.static(".."));

const port = 8080;
staticServer.listen(port, () => {
    console.log(`访问 //localhost:${port}`);
});
