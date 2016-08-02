var mysql = require('mysql');
var moment = require('moment');

var serviceInfo = JSON.parse(process.env.VCAP_SERVICES || '{}');

var getConnectionParams = function() {
  return {
    host: process.env.MYSQL_SERVICE_HOST,
    user: 'sentimentuser',
    password: 'password',
    database: 'sentimentdb'
  };
}

exports.getConversations = function(req, res, next) {
  var conn = mysql.createConnection(getConnectionParams());
  conn.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }

    console.log('connected as id ' + conn.threadId);

    conn.query('SELECT SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME, SENTIMENT, SENTIMENT_SCORE, ANGER, JOY FROM sentimentdata ORDER BY SUPPORT_ID, DATETIME', function (err, rows) {
      if (err) {
        console.log(err);
        conn.end();
        return;
      }
      else console.log(rows);

      conn.end(function () {
        console.log('Getting conversations Done');
        // console.log(rows);
        // res.send(rows);
        req.conversations = rows;
        next();
      });
    });
  });
}

exports.getSearchInfo = function(req, res, next) {
  var conn = mysql.createConnection(getConnectionParams());
  conn.connect(function(err) {
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

    var qry = 'SELECT SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME, SENTIMENT, SENTIMENT_SCORE, ANGER, JOY FROM sentimentdata ' + condition + ' ORDER BY SUPPORT_ID, DATETIME';
    console.log("SEARCH QUERY : " + qry);

    conn.query(qry, function (err, rows) {
      if (err) { 
        console.log(err);
        conn.end();
        return;
      }
      else console.log(rows);
      
      console.log('DB Search functionality Done');

      conn.end(function () {
      
        //res.send(rows);
        req.searchResults = rows;
        next();
      });
    });
  });
}

exports.getSupportAgents = function(req, res, next) {
  var conn = mysql.createConnection(getConnectionParams());
  conn.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }

    console.log('connected as id ' + conn.threadId);

    conn.query('SELECT SUPPORT_ID, SUPPORT_NAME FROM sentimentdata GROUP BY SUPPORT_ID, SUPPORT_NAME order by support_name', function (err, rows) {
      if (err) {
        console.log(err);
        conn.end();
        return;
      }
      else console.log(rows);

      conn.end(function () {
        console.log('done');
        //res.send(rows);
        req.supportAgents = rows;
        next();
      });
    });
  });
}

exports.addConversation = function(req, res, next) {
  var conn = mysql.createConnection(getConnectionParams());
  conn.connect(function(err) {    
    if (err) {
      console.log(err);
      req.error = err;
      next();
    }

    conn.query('INSERT INTO sentimentdata(SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME) values(?, ?, ?, now())', [req.params.supportid, req.params.supportname, req.params.filename], function (err, result) {
      if (err) {
        console.log(err);
        conn.end();
        return;
      }
      else console.log(result);

      conn.end(function () {
        console.log('done');
        req.success = true;
        req.result = result;
        next();
      });
    });

    /**conn.prepare('INSERT INTO DASH101569.SENTIMENTDATA(SUPPORT_ID, SUPPORT_NAME, AUDIO_URL, DATETIME) values(?, ?, ?, now())', function (err, stmt) {
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
    });**/
  });
}