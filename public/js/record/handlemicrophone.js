/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global $ */

function handleMicrophone(token, model, mic, context, callback) {

  /*if (model.indexOf('Narrowband') > -1) {
    var err = new Error('Microphone transcription cannot accomodate narrowband models, '+
      'please select another');
    callback(err, null);
    return false;
  }*/

  $.publish('clearscreen');

  // Test out websocket
  var baseString = '';
  var baseJSON = '';

  $.subscribe('showjson', function() {
    var $resultsJSON = $('#resultsJSON');
    $resultsJSON.empty();
    $resultsJSON.append(baseJSON);
  });

  var options = {};
  options.token = token;
  options.message = {
    'action': 'start',
    'content-type': 'audio/l16;rate=16000',
    'interim_results': true,
    'continuous': true,
    'word_confidence': true,
    'timestamps': true,
    'max_alternatives': 3,
    'inactivity_timeout': 600
  };
  options.model = model;
  
  var uploadFile = function(supportId, supportName, blob) {
    var uploadAudioRequest = new XMLHttpRequest();
    var filename = supportName + "-" + (new Date()).getTime() + ".wav";
    var form = new FormData();
    form.append("blob",blob, filename);
    var url = "/uploadAudio/" + supportId + "/" + supportName + "/" + filename;
    uploadAudioRequest.open('POST', url, true);
	
    uploadAudioRequest.onreadystatechange = function() {
      if (uploadAudioRequest.readyState === 4) {
        if (uploadAudioRequest.status === 200) {
          //$("body").removeClass("loading");
          var response = uploadAudioRequest.responseText;
           
          // callback(response);
          console.log(response);
          location.reload();
        } else {
          console.log('Error occured');
          location.reload();
        }
      }
    };
    uploadAudioRequest.send(form);	
  };
  
  var determineSentiment = function(inputtext) {
    var sentimentRequest = new XMLHttpRequest();
    /*var form = new FormData();
    form.append("blob",blob, filename);*/
    var url = "/analyse/sentiment";
    sentimentRequest.open('POST', url, true);
	
    sentimentRequest.onreadystatechange = function() {
      if (sentimentRequest.readyState === 4) {
        if (sentimentRequest.status === 200) {
          //$("body").removeClass("loading");
          var response = JSON.parse(sentimentRequest.responseText);
           
          // callback(response);
          console.log(response);
          if(response.sentiment.docSentiment.score) updateGauge(response.sentiment.docSentiment.score);
          // location.reload();
        } else {
          console.log('Error occured');
          // location.reload();
        }
      }
    };
    sentimentRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    sentimentRequest.send("text=" + inputtext);	
  };  

  function onOpen(socket) {
    console.log('Mic socket: opened');
    callback(null, socket);
  }

  function onListening(socket) {

    mic.onAudio = function(blob) {
      if (socket.readyState < 2) {
        socket.send(blob);
      }
    };
  
    mic.onStopRecording = function(blob) {
      //start the processing spinner
      $("body").addClass("loading");
      uploadFile(context.supportId, context.supportName, blob);
    };
  }

  function onMessage(msg) {
    if (msg.results) {
      baseString = showResult(msg, baseString, model);
      // baseJSON = display.showJSON(msg, baseJSON);
      console.log(baseString);
      if(baseString) determineSentiment(baseString);
    }
  }

  function onError() {
    console.log('Mic socket err: ', err);
  }

  function onClose(evt) {
    console.log('Mic socket close: ', evt);
  }

  initSocket(options, onOpen, onListening, onMessage, onError, onClose);
};