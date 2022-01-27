(function () {
  var statusObj = {
    value: "stop",
    getStatus: function () {
      return this.value;
    },
    setStatus: function (newStatus) {
      this.value = newStatus;
    },
  };

  var curruntActivetab = null;
  var recordingTabId = null;
  var socketConnectionUrl = "http://localhost:3000";

  chrome.tabs.onActivated.addListener(function (tab) {
    curruntActivetab = tab.tabId;

    // if (tab.tabId != recordingTabId && statusObj.getStatus() == "start") {
    //   statusObj.setStatus("pause");
    //   //mediaRecorder?.pause();
    // } else if (
    //   /*
    //   tab.tabId == recordingTabId &&
    //   statusObj.getStatus() == "pause"
    // ) {
    //   statusObj.setStatus("start");
    //   mediaRecorder.resume();
    // }
  });

  chrome.tabs.onRemoved.addListener(function (tab) {
    if (recordingTabId == tab) {
      statusObj.setStatus("stop");
    }
  });

  chrome.browserAction.onClicked.addListener(function (request) {
    updateRecorderStatus(statusObj.getStatus());
    if (statusObj.getStatus() == "stop") {
      statusObj.setStatus("stop");
    } else if (statusObj.getStatus() == "start") {
      recordingTabId = curruntActivetab;
      startRecording();
    }
  });

  function startRecording() {
    chrome.tabs.getSelected(null, function (tab) {
      var constraints = {
        audio: false,
        video: true,
        videoConstraints: {
          mandatory: {
            chromeMediaSource: "tab",
            maxWidth: 1280,
            maxHeight: 720,
            // maxFrameRate: 15,
            // minAspectRatio: 1.77,
            // googLeakyBucket: true,
            // googTemporalLayeredScreencast: true,
          },
        },
      };
      chrome.tabCapture.capture(constraints, handleCapture);
    });
  }

  function handleCapture(MediaStream) {
    var recordedChunks = [];
    var socket = io(socketConnectionUrl, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socket.binaryType = "arraybuffer";
    var id = new Date().getTime();
    socket.emit("action", `{"status":"start","fileName":"${id}"}`);
    var mediaRecorder = new MediaRecorder(MediaStream, {
      mimeType: "video/webm",
    });
    mediaRecorder.start(1000);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data) {
        recordedChunks.push(event.data);
      }
    };

    var sendRecordingInterval = setInterval(function () {
      console.log("interval", recordedChunks);

      if (recordedChunks.length > 0) {
        var tempChunks = [...recordedChunks];
        // clear recordedChunks array
        recordedChunks = [];
        //Convert blob object to array buffer.
        blobToArrayBufferConverter(tempChunks, function (arrBuffer) {
          // send array buffer to server
          socket.emit("message", arrBuffer);
        });
      }
    }, 2000);

    var checkRecorderStatus = setInterval(function () {
      if (statusObj.getStatus() == "stop") {
        clearInterval(checkRecorderStatus);
        MediaStream.getVideoTracks()[0].stop();
        mediaRecorder.stop();
        clearInterval(sendRecordingInterval);
        if (recordedChunks.length > 0) {
          blobToArrayBufferConverter(recordedChunks, function (arrBuffer) {
            socket.emit("message", arrBuffer);
          });
          recordedChunks = [];
          socket.disconnect();
        }
      }
    }, 100);
  }

  function blobToArrayBufferConverter(blobChunks, callback) {
    var blob = new Blob(blobChunks, { type: "video/webm" });
    var fileReader = new FileReader();
    fileReader.readAsArrayBuffer(blob);
    fileReader.onload = function (progressEvent) {
      callback(this.result);
    };
  }

  function updateRecorderStatus(curStatus) {
    if (curStatus == "stop") {
      statusObj.setStatus("start");
    } else if (curStatus == "start") {
      statusObj.setStatus("stop");
    }
  }
})();

// // chrome.action.onClicked.addListener((tab) => {
// //   console.log(tab);
// // });
// const socket = io("http://localhost:3000");
// console.log(socket);
// chrome.tabs.onActivated.addListener((test) => {
//   //chrome.tabs.getSelected(null, function (tab) {
//   chrome.tabCapture.capture(
//     {
//       video: true,
//       audio: false,
//     },
//     (stream) => {
//       if (stream) {
//         console.log(stream);
//         const recorder = new MediaRecorder(stream);
//         recorder.ondataavailable = (e) => {
//           console.log(e.data);
//         };
//         recorder.start();
//       }
//     }
//   );
//   //});
// });

// function handleCapture(stream) {
//   console.log("content captured");
//   console.log("backround.js stream: ", stream);
//   alert(stream);

//   // localStream = stream; // used by RTCPeerConnection addStream();
//   // initialize(); // start signalling and peer connection process
// }

// async function captureCurrentTab(activeInfo) {
//   console.log(1111);
//   // chrome.tabs.captureVisibleTab(activeInfo.windowId, {}, (data) => {
//   //   console.log(data);
//   // });
//   // chrome.tabs.query({ active: true }, function (tab) {
//   //   console.log(tab);

//   //   // chrome.tabCapture.capture(
//   //   //   {
//   //   //     audio: true,
//   //   //     video: false,
//   //   //   },
//   //   //   handleCapture
//   //   // );
//   // });
// }

// // async function main() {
// //   console.log(chrome);

// //   chrome.tabs.query({ active: true }, function (tab) {
// //     console.log(tab);
// //   });
// // }

// // main();

// // function captureCurrentTab(event) {
// //   console.log(event);
// // }

// // chrome.browserAction.onClick.addListener(captureCurrentTab);
