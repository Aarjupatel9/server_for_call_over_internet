const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
var bodyParser = require("body-parser");
var urlencodedparser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.json({ limit: "2000kb" }));
app.use(bodyParser.urlencoded({ limit: "2000kb", extended: true }));

var counter = 0;
const port = 10101;

const encrypt = require("./module/vigenere_enc.js");
const decrypt = require("./module/vigenere_dec.js");
app.get("/test", (req, res) => {
  res.send({ status: true });
});
//firebase
var FCM = require("fcm-node");
var serverKey =
  "AAAAM_Qp1Z0:APA91bEg8qxFWl_mEYgubKpYtPvWwb3K8GyEA5OHGo4SxlNzs8h6CM9i-4rJrfota__EagS20sdhAFRzGs3J4OBJ8HaWNllTRuvZfyWRSxOqMZBIyxRSmFph3wC4dim0xgQK9PsEDZxx";
var fcm = new FCM(serverKey);

//socket par
var http = require("http").Server(app);
var io = require("socket.io")(http);

var user_connection_tmp1 = [];

var user_connection_fast = [];
var user_connection = [];
var user_connection_counter = 0;
var user_connection_counter_limit = 100;

function check_user_id(userEmailId) {
  for (var i = 0; i < user_connection.length; i++) {
    if (user_connection_fast[i] == userEmailId) {
      return 1;
    }
  }
  return 0;
}

io.on("connection", function (socket) {
  // When a new client connects, pipe the audio stream to their speaker

  console.log("request arrive");
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

  socket.on("make_call", function (call_from, call_to, call_type) {
    if (!check_user_id(call_from)) {
      socket.join(call_from); // We are using room of socket io
      user_connection_tmp1[0] = call_from;
      user_connection_tmp1[1] = Date.now();
      user_connection_tmp1[2] = call_to;
      user_connection_tmp1[3] = call_type;

      user_connection[user_connection_counter] = user_connection_tmp1;
      user_connection_fast[user_connection_counter] = call_from;
      setTimeout(() => {
        user_connection[user_connection_counter] = 0;
        user_connection_fast[user_connection_counter] = 0;
        socket.leave(call_from);
      }, 30000);
      user_connection_counter++;

      console.log("connecting new user userEmailId : ", call_from);
      sendPushNotification(call_from, call_to, call_type)
        .then((result) => {
          console.log("push notification is sent");
          const tOb = [call_from, 1]; ///[usrerEmailId , status] ///
          io.sockets.in(call_from).emit("joinAcknowledgement", tOb); //send to owner 1
        })
        .catch((error) => {
          console.log("push notification is not sent");
          const tOb = [call_from, 0]; ///[usrerEmailId , status] ///
          io.sockets.in(call_from).emit("joinAcknowledgement", tOb); //send to owner 1
        });
    }
  });

  socket.on(
    "call_ring_call_to_side_acknowledgement",
    function (call_from, call_to, call_type, call_ring_status) {
      io.sockets
        .in(call_from)
        .emit(
          "call_ringing_contact_side_event",
          call_from,
          call_to,
          call_type,
          call_ring_status
        );
    }
  );

  socket.on("join", function (call_from, call_to, call_type) {
    console.log("in join : ", call_from, call_to);
    if (check_user_id(call_from)) {
      socket.join(call_to);
      console.log("join || call_to  join room , ", call_to);

      io.sockets
        .in(call_to)
        .emit("joinAcknowledgement", call_from, call_to, call_type, 1); //send to call_to 1 is status
      io.sockets
        .in(call_from)
        .emit("Call_pick_up_acknowledgement", call_from, call_to, call_type, 1); //send to call_from 1 is status
    } else {
      console.log("join || owner disconnect");
    }
  });

  socket.on("destroyCall", function (req_from, call_from, call_to, call_type) {
    console.log("destroyCall || req_from : ", req_from);

    io.sockets
      .in(call_from)
      .emit("SelfDestroyCallBroadcastEvent", call_from, call_to, call_type); //send to owner 0
    io.sockets
      .in(call_to)
      .emit("SelfDestroyCallBroadcastEvent", call_from, call_to, call_type); //send to owner 0

    socket.leave(call_from);
    socket.leave(call_to);
    console.log(
      "on destroyCall request from : " + call_from + " || owner is : " + call_to
    );
  });

  socket.on("leave", function (userEmailId) {
    console.log(
      "Disconnect_socket_connection Request come with userEmailId: ",
      userEmailId
    );
    socket.leave(userEmailId);
  });

  socket.on("massege_reach_at_join_time", function (data) {
    console.log("data in massege_reach_at_join_time is : ", data);
  });
  socket.on("CallRingingContactSide", function (call_from, call_to, call_type) {
    io.sockets
      .in(call_from)
      .emit("CallRingingContactSide", call_from, call_to, call_type);
  });

  socket.on(
    "audio_data",
    function (call_from, call_to, call_type, data, data_from, data_to) {
      // Write the received audio data to the audio stream

      // Broadcast the audio data to all other connected clients

      var target = call_from;

      if (data_from == 1) {
        target = call_to;
      }
      io.sockets
        .in(target)
        .emit(
          "audio_data",
          call_from,
          call_to,
          call_type,
          data,
          data_from,
          data_to
        );
    }
  );
});

function sendPushNotification(call_from, call_to) {
  return new Promise(function (resolve, reject) {
    con.query(
      "select * from `login_info` Where `email`='" + call_to + "'",
      function (err, result) {
        if (err) {
          console.log(err);
        } else {
          console.log("result in f@sendPushNotification : ", result);
          if (result.length > 0) {
            const registrationToken = result[0].tokenFCM;
            var message = {
              to: registrationToken,
              data: {
                call_from: call_from,
                call_to: call_to,
                call_type: "1",
              },
            };
            fcm.send(message, function (err, response) {
              if (err) {
                console.log("Something has gone wrong!" + err);
                console.log("Respponse:! " + response);
                reject(0);
              } else {
                console.log("Successfully sent with response: ", response);
                resolve(1);
              }
            });
          } else {
            reject(2);
          }
        }
      }
    );
  });
}
http.listen(port, function () {
  console.log("Server-socket listening at port %d", port);
});
