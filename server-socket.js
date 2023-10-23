const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
var bodyParser = require("body-parser");

var urlencodedparser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.json({ limit: "2000kb" }));
app.use(bodyParser.urlencoded({ limit: "2000kb", extended: true }));


var http = require("http").Server(app);
var io = require("socket.io")(http);

const port = 10101;
function serverStart() {
    http.listen(port, function () {
        console.log("Server-socket listening at port %d", port);
    });
}
serverStart();



io.on("connection", function (socket) {

    console.log("Client connected:", socket.id);
    socket.on("connect", (socket) => {
        console.log("connected , ", socket.socket_id);
    })

    socket.on("init", function () {
      console.log("event init || start");
    });
  
    socket.on("cameraFeed", function (imageBytes, desiredWidth, desiredHeight) {
      console.log(
        "event cameraFeed ||   desiredWidth*desiredHeight ",
        desiredWidth,
        "*",
        desiredHeight
      );
    });
});

app.get("/", (req, res) => {
    res.send({ Status: 1 });
})