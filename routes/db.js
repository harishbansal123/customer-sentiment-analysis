// var ibmdb = require('ibm_db');
var moment = require('moment');

var serviceInfo = JSON.parse(process.env.VCAP_SERVICES || '{}');

var getConnectionString = function() {
  var credentials = serviceInfo['dashDB'][1]['credentials'];

  console.log("Dash db: " + credentials['db']);
  console.log("username: " + credentials['username']);
  console.log("password: " + credentials['password']);
  console.log("hostname: " + credentials['hostname']);
  console.log("port: " + credentials['port']);

  return "DRIVER={DB2};DATABASE=" + credentials['db'] + ";HOSTNAME=" + credentials['hostname'] + ";UID=" + credentials['username'] + ";PWD=" + credentials['password'] + ";PORT=" + credentials['port'] + ";PROTOCOL=TCPIP";
}

exports.getConversations = function(req, res, next) {
  ibmdb.open(getConnectionString(), function(err, conn) {
    if (err) return console.log(err);

    conn.query('SELECT SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME, SENTIMENT, SENTIMENT_SCORE, ANGER, JOY FROM DASH101569.SENTIMENTDATA ORDER BY SUPPORT_ID, DATETIME', function (err, rows) {
      if (err) console.log(err);
      else console.log(rows);

      conn.close(function () {
        console.log('Getting conversations Done');
        console.log(rows);
        //res.send(rows);
        req.conversations = rows;
        next();
      });
    });
  });
}

exports.getSearchInfo = function(req, res, next) {
  ibmdb.open(getConnectionString(), function(err, conn) {
    if (err) return console.log(err);
    if(req.body.supportAgent)
    var supportAgent =  req.body.supportAgent.SUPPORT_ID;
    
    var dateCategory =  req.body.dateCategory;
    var condition=" WHERE";
       
    
     if(supportAgent==="All" || supportAgent=="" || supportAgent==undefined)
    	 condition += " 1=1";
     else
       	 condition += " SUPPORT_ID="+ supportAgent; 

     if(dateCategory && dateCategory !=='All'){
	    	
	     if(dateCategory ==='Today'){
	    	var currentDate = moment(new Date()).format("YYYY-MM-DD");
	    	condition += " AND DATETIME LIKE '" + currentDate + "%'";
	    	
	    }else if(dateCategory==='custom'){
	    	    if(req.body.startDate){
	    	     var startDateDetails = req.body.startDate.split('/');
	    	     var day = startDateDetails[0];
	    	     var month=startDateDetails[1];
	    	     var year = startDateDetails[2];
	    		 var newStartDate =  year + "-" + month + "-" + day + ' 00:00:00';
			    }
	
	           if(req.body.endDate){
	    	     var endDateDetails = req.body.endDate.split('/');
	    	     var day = endDateDetails[0];
	    	     var month=endDateDetails[1];
	    	     var year = endDateDetails[2];
	    		 var newEndDate =  year + "-" + month + "-" + day + ' 23:59:59';
			    }
	    
			 condition += " AND DATETIME BETWEEN  '" + newStartDate + "' AND '" + newEndDate + "'";
	    }
   }

    
    var qry = 'SELECT SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME, SENTIMENT, SENTIMENT_SCORE, ANGER, JOY FROM DASH101569.SENTIMENTDATA ' + condition + ' ORDER BY SUPPORT_ID, DATETIME';
    console.log("SEARCH QUERY : " + qry);
    
    conn.query(qry, function (err, rows) {
      if (err) console.log(err);
      else console.log(rows);
      
       console.log('DB Search functionality Done');

      conn.close(function () {
      
        //res.send(rows);
        req.searchResults = rows;
        next();
      });
    });
  });
}

exports.getSupportAgents = function(req, res, next) {
  ibmdb.open(getConnectionString(), function(err, conn) {
    if (err) return console.log(err);

    conn.query('SELECT SUPPORT_ID, SUPPORT_NAME FROM DASH101569.SENTIMENTDATA GROUP BY SUPPORT_ID, SUPPORT_NAME order by support_name', function (err, rows) {
      if (err) console.log(err);
      else console.log(rows);

      conn.close(function () {
        console.log('done');
        //res.send(rows);
        req.supportAgents = rows;
        next();
      });
    });
  });
}

exports.addConversation = function(req, res, next) {
  ibmdb.open(getConnectionString(), function(err, conn) {
    if (err) {
      console.log(err);
      req.error = err;
      next();
    }

    conn.prepare('INSERT INTO DASH101569.SENTIMENTDATA(SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME) values(?, ?, ?, now())', function (err, stmt) {
      if (err) {
        console.log(err);
      req.error = err;
      conn.closeSync();
      next();
      } else {
        stmt.execute([req.params.supportid, req.params.supportname, req.params.filename], function(err, result) {
        if(err) {
          console.log(err);
        req.error = err;
        conn.closeSync();
        next();
        } else {
          req.success = true;
          req.result = result;
          conn.closeSync();
          next();
        }
        });
      }
    });
  });
}