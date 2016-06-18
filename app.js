/*jshint node:true*/

var express = require('express');
var multer  = require('multer');
var request = require('request');
var ibmdb   = require ('ibm_db');
var db      = require('./routes/db');
var callERS = require('./callERS.js');
var async = require('async');

var moment = require('moment');
var _= require('lodash');
var vcapServices = require('vcap_services'),
    extend       = require('util')._extend,
    watson       = require('watson-developer-cloud'),
    bodyParser   = require('body-parser');

// Variable definitions ---------------------------------------------------------------------------
var USER = "Prasad_A01@infosys.com"
var CONTAINER = "AudioFiles"

// Retrieve the environment variables provided by Bluemix (Cloud Foundry)
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
var serviceInfo = JSON.parse(process.env.VCAP_SERVICES || '{}');

// VCAP_APPLICATION will provide information about this application when deployed.
// VCAP_SERVICES will be exposed as a JSON object with each bound service as a member:
/*
{
  "objectstorage": [
    {
      "name": "object-storage",
      "label": "objectstorage",
      "plan": "free",
      "credentials": {
        "auth_uri": "https://swift.ng.bluemix.net/auth/abc123",
        "global_account_auth_uri": "https://swift.ng.bluemix.net/global_auth/abc123",
        "username": "abc123",
        "password": "abc123"
      }
    }
  ]
}
*/

console.log("--- VCAP_SERVICES object: ");
console.log(serviceInfo);

/*console.log("--- VCAP_APPLICATION object: ");
console.log(appInfo);*/

console.log("--- Object Storage service credentials: ");
if (Object.keys(serviceInfo).length > 0) {
  console.log(serviceInfo['Object-Storage'][0]['credentials']);
}

// To hold state.
var cache = {};
var auth = null;
var app = express();

//app.use(express.bodyParser());
//app.use(express.methodOverride());
app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));

// Configure file upload handling using multer
app.use(multer({ dest: './uploads/',
    rename: function (fieldname, filename) {
        return filename;
    },
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
        if (!auth) setAppVars();
        var userInfo = cache[USER];
        var resHandler = function(error, response, body) {};
        var buff = new Buffer(file.buffer, 'binary');
        uploadFileToSwift(USER, CONTAINER, file.originalname, buff.toString('base64'), resHandler);
    },
    inMemory: true
}));

// Set up static file handling
//app.use(express.bodyParser());
//app.use(express.methodOverride());
app.use(app.router);
app.use(express.errorHandler());
app.use(express.static(__dirname + '/public')); 
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); 
app.engine('html', require('ejs').renderFile);
//app.enable('trust proxy');
//app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
//app.use(bodyParser.json({ limit: '1mb' }));

// For local development, replace username and password
var config = extend({
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: '<username>',
  password: '<password>'
}, vcapServices.getCredentials('speech_to_text'));

var authService = watson.authorization(config);

// Get token using your credentials
app.post('/api/token', function(req, res, next) {
  authService.getToken({url: config.url}, function(err, token) {
    if (err)
      next(err);
    else
      res.send(token);
  });
});


// Use the IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application
var host = (process.env.VCAP_APP_HOST || 'localhost');

// Use the port on the DEA for communication with the application
var port = (process.env.VCAP_APP_PORT || 3000);

// Start server
app.listen(port, host);
console.log('Node Object Storage app started on port ' + port);

// ------------------------------------------------------------------------------------------------


// Utility methods --------------------------------------------------------------------------------
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var setAppVars = function() {
    console.log('setAppVars');
    var credentials = serviceInfo['Object-Storage'][0]['credentials'];
    console.log("set_app_vars - auth_uri: " + credentials['auth_url']);
    console.log("set_app_vars - userid: " + credentials['username']);
    console.log("set_app_vars - password: " + credentials['password']);
    auth = {
        "auth_uri": credentials['auth_url'],
        "username" : credentials['username'],
        "userId": credentials['userId'],
        "password" : credentials['password'],
        "projectId" : credentials['projectId']
    };
    auth["secret"] = "Basic " + Buffer(auth.username + ":" + auth.password).toString("base64");
    console.log("set_app_vars - auth: " + JSON.stringify(auth, null, 2));
    
};

var reportingVars = {};

function setReportingVars() {
	var credentials = serviceInfo['erservice'][0]['credentials'];
	reportingVars.reportingUri = credentials['url'];
	reportingVars.reportingUserId = credentials['userid'];
	reportingVars.reportingPassword = credentials['password'];
	credentials = serviceInfo['cloudantNoSQLDB'][0]['credentials'];
	reportingVars.bundleUri = credentials['url'];
}

setReportingVars();

//set up the proxy to the reporting service
var ersConnection = new callERS(reportingVars.reportingUri, reportingVars.reportingUserId, reportingVars.reportingPassword, reportingVars.bundleUri);
ersConnection.connect();

// Any request to application (other than for index) is handled with this routing call
app.use(function(req, res, next){

	if(req.path.indexOf("ers/v1") !== -1){
		ersConnection.execute(req , res);
	}
	else{
		next();
	}
});

function jsonResponse(res, json) {
    console.log('jsonResponse');
    console.log(JSON.stringify(json, null, 2));
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end(JSON.stringify(json, null, 2));
}

var getToken = function(userid, callback) {
    console.log('getToken');
    if (!auth) setAppVars(); 
    var reqOptions = {
        url: auth.auth_uri + '/v3/auth/tokens',
        // headers: {'accept': 'application/json', 'Authorization': auth.secret},
        timeout: 100000,
        method: 'POST',
        json: true,
        body: {
            "auth": {
                "identity": {
                    "methods": [
                        "password"
                    ],
                    "password": {
                        "user": {
                            "id": auth.userId,
                            "password": auth.password
                        }
                    }
                },
                "scope": {
                    "project": {
                        "id": auth.projectId
                    }
                }
            }
        }
    };
    console.log(JSON.stringify(reqOptions, null, 2));
    request(reqOptions, callback);
}

var saveTokenResponseToCache = function(userid, token, url) {
    console.log('saveTokenResponseToCache');
    var body = {"userid": userid, "token": token, "url": url};
    cache[userid] = body;
    return body;
}

// ------------------------------------------------------------------------------------------------


// Functions that call the Bluemix Object Storage service API -------------------------------------
var createContainer = function(userid, containername, callback) {
    console.log('createContainer');
    var userInfo = cache[userid];
    console.log(userid);
    console.log(userInfo);
    console.log(containername);
    var reqOptions = {
        url: userInfo['url'] + "/" + containername,
        headers: {'accept': 'application/json', 'X-Auth-Token': userInfo['token']},
        timeout: 100000,
        method: 'PUT'
    };
    request(reqOptions, callback);
}

var listContainer = function(userid, containername, callback) {
    console.log('listContainer');
    var userInfo = cache[userid];
    console.log(userid);
    console.log(userInfo);
    console.log(containername);
    var reqOptions = {
        url: userInfo['url'] + "/" + containername,
        headers: {'accept': 'application/json', 'X-Auth-Token': userInfo['token']},
        timeout: 100000,
        method: 'GET'
    };
    request(reqOptions, callback);
}

var uploadFileToSwift = function(userid, containername, objname, objdata, callback) {
    console.log('uploadFileToSwift');
    var userInfo = cache[userid];
    console.log(userid);
    console.log(userInfo);
    console.log(containername);
    var reqOptions = {
        url: userInfo['url'] + "/" + containername + "/" + objname,
        headers: {'accept': 'application/json', 'X-Auth-Token': userInfo['token']},
        timeout: 100000,
        body: objdata,
        method: 'PUT'
    };
    request(reqOptions, callback);
}

var downloadFileFromSwift = function(userid, containername, objname, callback) {
    console.log('downloadFileFromSwift');
    var userInfo = cache[userid];
    console.log(userid);
    console.log(userInfo);
    console.log(containername);
    console.log(objname);
    var reqOptions = {
        url: userInfo['url'] + "/" + containername + "/" + objname,
        headers: {'accept': 'application/json', 'X-Auth-Token': userInfo['token']},
        timeout: 100000,
        method: 'GET'
    };
    request(reqOptions, callback);
}

var deleteFileFromSwift = function(userid, containername, objname, callback) {
    console.log('deleteFileFromSwift');
    var userInfo = cache[userid];
    console.log("Deleting " + objname + " from " + userid + "/" + containername);
    console.log(userid);
    console.log(userInfo);
    console.log(containername);
    var reqOptions = {
        url: userInfo['url'] + "/" + containername + "/" + objname,
        headers: {'accept': 'application/json', 'X-Auth-Token': userInfo['token']},
        timeout: 100000,
        method: 'DELETE'
    };
    request(reqOptions, callback);
}

var renderIndex = function(res, containerListingJSON) {
    console.log('renderIndex');
    console.log(containerListingJSON);
    var fileList = JSON.parse(containerListingJSON);
    console.log(fileList);
    containerFiles = fileList.map(function(val) {
        return val.name
    });
    res.render('pages/main.html', { containerFiles: containerFiles });
}

// ------------------------------------------------------------------------------------------------


// URL mappings to the Bluemix Object Storage service functions above  ----------------------------

// Main entry point to the app
app.get('/', function(req, res) {
    console.log('/');

    if (Object.keys(serviceInfo).length > 0) {

      getToken(USER, function(error, response, body) {
        var url;
        for(var i=0; i< body.token.catalog.length; i++) {
            if(body.token.catalog[i].name == 'swift') {
                for(var j=0; j< body.token.catalog[i].endpoints.length; j++) {
                    if(body.token.catalog[i].endpoints[j].interface == 'public') {
                        url = body.token.catalog[i].endpoints[j].url;
                        break;
                    }
                }
                break;
            }
        }
        console.log("++++++url+++++" + url);

        if (!error) {
          saveTokenResponseToCache(USER, response.headers['x-subject-token'], url);

          createContainer(USER, CONTAINER, function(error, response, body) {

            if (!error) {
              console.log('Finished creating container');

              listContainer(USER, CONTAINER, function(error, response, body) {

                if (!error) {
                  console.log('Finished listing container');
                  if(req.query.index) renderIndex(res, body);
                  else res.render('pages/home.ejs');
                } else {
                  res.end('Issue listing a container');
                }
              });

            } else {
              res.end('Issue creating a container');
            }
          });

        } else {
          res.end('Issue getting a token');
        }
      });

    } else {
      res.render('pages/no-object-storage.html');
    }

});

app.get('/conversations', db.getConversations, function(req, res) {
	console.log("DB DATA : " + req.conversations);
	if(req.conversations){
		var groupByDetails = _.groupBy(req.conversations, function(n) {
         return n.SUPPORT_ID;
      });
	}
	console.log('MODIFIED GROUP BY DATA : '+ groupByDetails);
	res.send(groupByDetails);
	
});

app.get('/supportAgents', db.getSupportAgents, function(req, res) {
	
	var supportAgents = {};
	supportAgents.data  = req.supportAgents;
	res.send(supportAgents);
	console.log(supportAgents);
	
});

app.post('/search', db.getSearchInfo, function(req, res) {
	  	  
	  if(req.searchResults){
		var groupBySearchDetails = _.groupBy(req.searchResults, function(n) {
         return n.SUPPORT_ID;
      });
	}
	console.log('MODIFIED SEARCH GROUP BY DATA : '+ groupBySearchDetails);
	res.send(groupBySearchDetails);
	 
	
});

app.get('/viewChart/:supportId', function(req, res){
	  console.log('view chart support id : ' + req.params.supportId);
	  res.render('pages/viewchart.ejs',{supportId: req.params.supportId});
	});


// Upload a file. Uses the multer middleware.
app.post('/upload', function(req, res) {
    console.log('/upload');
    res.render('pages/upload-success.html');
});

// Upload a file. Uses the multer middleware.
app.post('/uploadaudio/:supportid/:supportname/:filename', db.addConversation, function(req, res) {
    console.log('/upload');
    console.log(req.params.supportid);
    console.log(req.params.supportname);
    console.log(req.params.filename);
    if(req.success) res.send({success: true});
    else res.send({success: false});
});

// Download or display a given file.
app.get('/download/:objname', function(req, res) {
    console.log('/download/:objname');
    var resHandler = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var buff = new Buffer(body, 'base64')
            var data = buff.toString('binary');

            var contentType = "audio/wav";
            
            console.log("Downloading a " + contentType);
            var filename = 'attachment; filename="' + req.params.objname + '"';
            res.set({"Content-Disposition": filename});            
            res.writeHead(200, {"Content-Type": contentType});
            res.end(data, 'binary');
        } else {
            res.render('pages/download-failure.html', { fileName: req.params.objname });
        }
    };
    downloadFileFromSwift(USER, CONTAINER, req.params.objname, resHandler);
});

var speechToText = function(objdata, callback) {

    var credentials = serviceInfo['speech_to_text'][0]['credentials'];
    console.log("set_app_vars - auth_uri: " + credentials['url']);
    console.log("set_app_vars - userid: " + credentials['username']);
    console.log("set_app_vars - password: " + credentials['password']);
    var baseUrl = credentials['url'];
    var username = credentials['username'];
    var password = credentials['password'];

    var authorization = "Basic " + Buffer(username + ":" + password).toString("base64");
    console.log("set_app_vars - authorization: -analyze " + authorization);
    console.log(objdata);

    var reqOptions = {
        url: baseUrl + "/v1/recognize?continuous=true",
        headers: {'accept': 'application/json', 'Authorization': authorization, 'Content-Type': 'audio/wav', 'Transfer-Encoding': 'chunked'},
        timeout: 100000,
        body: objdata,
        method: 'POST'
    };
    request(reqOptions, callback);
};


var sentimentAnalysis = function (inputtext,callback){
    var credentials = serviceInfo['alchemy_api'][0]['credentials'];
    console.log("set_app_vars - sentiment analysis url: " + credentials['url']);
    console.log("set_app_vars - sentiment analysis apikey: " + credentials['apikey']);
  
    var baseUrl = credentials['url'];
    var apikey = credentials['apikey'];
    console.log('text---->' +inputtext);

	var tasks = [];
	var analysisResponse = {};
	
	tasks.push(function(callback1) {
	    var body = 'apikey='+apikey+'&text='+inputtext+'&outputMode=json';
	
		var reqOptions = {
	        url: baseUrl + "/text/TextGetTextSentiment",
	        headers: {'accept': 'application/json','Content-Type': 'application/x-www-form-urlencoded'},
	        timeout: 100000,
	        body: body,
	        method: 'POST'
	    };
	    request (reqOptions, function(error,response,body) {
	        console.log("in sentiment analysis response");
	        if (!error) {
	          console.log(response.statusCode);
	          console.log(body);
	          analysisResponse.sentiment = JSON.parse(body);
	          callback1();
	        } else {
	          console.log(error);
	          res.render('pages/download-failure.html', { fileName: req.params.filename });
	        }	    	
	    });		
	});
	
	/*tasks.push(function(callback2) {
	    var body = 'apikey='+apikey+'&text='+inputtext+'&outputMode=json';
	
		var reqOptions = {
	        url: baseUrl + "/text/TextGetEmotion",
	        headers: {'accept': 'application/json','Content-Type': 'application/x-www-form-urlencoded'},
	        timeout: 100000,
	        body: body,
	        method: 'POST'
	    };
	    request (reqOptions, function(error,response,body) {
	        console.log("in emotion analysis response");
	        if (!error) {
	          console.log(response.statusCode);
	          console.log(body);
	          analysisResponse.emotion = JSON.parse(body);
	          callback2();
	        } else {
	          console.log(error);
	          res.render('pages/download-failure.html', { fileName: req.params.filename });
	        }	    	
	    });		
	});*/
	
	async.parallel(tasks, function() {
		console.log(JSON.stringify(analysisResponse));
		callback(analysisResponse);
	});

};

var saveSentimentDetailsToDB = function(sentiment,sentiment_score,audio_url,anger,joy){
    var credentials = serviceInfo['dashDB'][1]['credentials'];
    console.log("saveSentimentDetailsToDB - Dash db: " + credentials['db']);
    console.log("saveSentimentDetailsToDB - Dashdb username: " + credentials['username']);
    console.log("saveSentimentDetailsToDB - Dashdb password: " + credentials['password']);
    console.log("saveSentimentDetailsToDB - Dashdb hostname: " + credentials['hostname']);
    console.log("saveSentimentDetailsToDB - Dashdb port: " + credentials['port']);
    var db = credentials['db'];
    var username = credentials['username'];
    var password = credentials['password'];
    var hostname = credentials['hostname'];
    var port = credentials['port'];

    var connString = "DRIVER={DB2};DATABASE=" +db + ";UID=" + username + ";PWD=" +password + ";HOSTNAME=" +hostname + ";port=" +port;
    console.log(sentiment);
    console.log(sentiment_score);
    console.log(audio_url);
    
    sentiment_score = sentiment_score? sentiment_score: null;
    
    ibmdb.open(connString,function(err,conn){
	  	conn.prepare("UPDATE DASH101569.SENTIMENTDATA SET SENTIMENT = ?, SENTIMENT_SCORE = ?, ANGER = ?, JOY = ? WHERE AUDIO_URL = ?", function (err, stmt) {
	    if (err) {
	      //could not prepare for some reason 
	      console.log(err);
	      return conn.closeSync();
	    }
 
    	//Bind and Execute the statment asynchronously 
        stmt.execute([sentiment,sentiment_score,anger,joy,audio_url], function (err, result) {
           	if( err ) console.log(err);  
			else result.closeSync();
 
      		//Close the connection 
      		conn.close(function(err){});
        });
  	});

 });
 
};

app.post('/analyse/sentiment', function(req, res) {
	var inputtext = req.body.text;
    
    var sentimentAnalysisResHandler = function(analysisResponse){
      var sentiment = analysisResponse.sentiment.docSentiment.type;
      var sentiment_score = analysisResponse.sentiment.docSentiment.score;
      /*var anger = analysisResponse.emotion.docEmotions.anger;
      var joy = analysisResponse.emotion.docEmotions.joy;      */
      console.log(sentiment);
      console.log(sentiment_score);
      /*console.log(req.params.filename);
      saveSentimentDetailsToDB(sentiment,sentiment_score,req.params.filename,anger,joy);*/
      res.writeHead(200, {"Content-Type": 'application/json'});
      res.end(JSON.stringify(analysisResponse));
    };
    
    sentimentAnalysis(inputtext, sentimentAnalysisResHandler);
});



app.get('/analyze/:filename', function(req, res) {
    var sentimentAnalysisResHandler = function(analysisResponse){
      var sentiment = analysisResponse.sentiment.docSentiment.type;
      var sentiment_score = analysisResponse.sentiment.docSentiment.score;
      /*var anger = analysisResponse.emotion.docEmotions.anger;
      var joy = analysisResponse.emotion.docEmotions.joy;*/
      var anger = 0;
      var joy = 0;     
      console.log(sentiment);
      console.log(sentiment_score);
      console.log(req.params.filename);
      saveSentimentDetailsToDB(sentiment,sentiment_score,req.params.filename,anger,joy);
      res.writeHead(200, {"Content-Type": 'application/json'});
      res.end(JSON.stringify(analysisResponse));
    };

    var speechToTextResHandler = function(error, response, body) {
        console.log("in speechToTextResHandler");
        if (!error) {
            console.log(response.statusCode);
            var results = JSON.parse(body).results;
            var text = '';
            for(var i=0; i< results.length; i++) {
            	text = text + results[i].alternatives[0].transcript;
            }
            sentimentAnalysis(text, sentimentAnalysisResHandler);
        } else {
            console.log(error);
            res.render('pages/download-failure.html', { fileName: req.params.filename });
        }
    };    
    var objStorageResHandler = function(error, response, body) {
        console.log("in objStorageResHandler");
        if (!error) {
            var buff = new Buffer(body, 'base64')
            var data = buff.toString('binary');
            buff = new Buffer(data, 'binary');
            speechToText(buff, speechToTextResHandler);
        } else {
            console.log(error);
            res.render('pages/download-failure.html', { fileName: req.params.filename });
        }
    };   
    downloadFileFromSwift(USER, CONTAINER, req.params.filename, objStorageResHandler);
});
// Delete the given file.
app.get('/delete/:objname', function(req, res) {
    console.log('/delete/:objname');
    var resHandler = function(error, response, body) {
        if (!error && response.statusCode == 204) {
            res.render('pages/delete-success.html');
        } else {
            res.render('pages/delete-failure.html', { errorCode: response.statusCode, errorMsg: error });
        }
    };
    deleteFileFromSwift(USER, CONTAINER, req.params.objname, resHandler);
});

// Get the authorization token.
app.get('/gettoken/:userid', function(req, res) {
    console.log('/gettoken/:userid');
    var resHandler = function(error, response, res_body) {
        var body = {};
        if (!error && response.statusCode == 200) {
            body = saveTokenResponseToCache(req.params.userid, response.headers['x-auth-token'], response.headers['x-storage-url']);
        } else {
            body = {"error": error, "statusCode": response.statusCode};
        };
        jsonResponse(res, body);
    };
    getToken(req.params.userid, resHandler);
});

// Create a container.
app.get('/createcontainer/:userid/:containername', function(req, res) {
    console.log('/createcontainer/:userid/:containername');
    var resHandler = function(error, response, body) {
        if (!error && (response.statusCode == 201 || response.statusCode == 204)) {
          body = {result: 'Succeeded!'};
        } else {
          body = {result: 'Failed!'};
        }
        jsonResponse(res, body);
    };
    createContainer(req.params.userid, req.params.containername, resHandler);
});

// Write an object.
app.get('/writeobj/:userid/:containername/:objname', function(req, res) {
    console.log('/writeobj/:userid/:containername/:objname');
    var resHandler = function(error, response, body) {
        if (!error && response.statusCode == 201) {
            body = {result: 'Succeeded!'};
        } else {
            body = {result: 'Failed!'};
        }
        jsonResponse(res, body);
    };
    uploadFileToSwift(req.params.userid, req.params.containername, req.params.objname, "Some random data",  resHandler);
});

// Read an object.
app.get('/readobj/:userid/:containername/:objname', function(req, res) {
    console.log('/readobj/:userid/:containername/:objname');
    var resHandler = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            body = {result: 'Succeeded! ' + body +  ' - ' + response};
        } else {
            body = {result: 'Failed!'};
        }
        jsonResponse(res, body);
    };
    downloadFileFromSwift(req.params.userid, req.params.containername, req.params.objname,  resHandler);
});

// List the files in the container.
app.get('/listcontainer/:userid/:containername', function(req, res) {
    console.log('/listcontainer/:userid/:containername');
    var resHandler = function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var fileList = JSON.parse(body)
            body = {result: 'Succeeded! ' + fileList[0].name};
        } else {
            body = {result: 'Failed!'};
        }
        jsonResponse(res, body);
    };
    listContainer(req.params.userid, req.params.containername, resHandler);
});
	

// ------------------------------------------------------------------------------------------------