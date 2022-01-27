const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const fs = require("fs");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
var ss = require("socket.io-stream");

app.use(cors());

let fileName = "unk";
let streamData;

io.on("connection", (socket) => {
  console.log("a user connected");

  ss(socket).on("action", (stream, data) => {
    console.log("action", data);
    var recData = JSON.parse(data);
    if (recData.status == "start") {
      fileName = recData.fileName;
      //console.log("File created " + fileName);
      //create the file before start recording
      //fs.appendFile(`${fileName}.webm`, "", function (err) {});
      streamData = fs.createWriteStream(`${fileName}.webm`);
      stream.pipe(streamData);
    }
  });

  socket.on("message", (data) => {
    console.log("message", data);
    streamData.end(new Buffer(data));
    //fs.appendFile(`${fileName}.webm`, new Buffer(data), function (err) {});
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
