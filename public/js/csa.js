$(document).ready(function() {
	$("#liveRecordLink").click(function(event){
	   $("#collapseContent").toggle('slow', function(){
		  
	   });
	});
	initialize();
});

var app = angular.module('myApp', []);

app.controller('customersCtrl', function($scope, $http,$window) {
	
  $scope.supportAgent="";
  $scope.dateCategory="";
  $scope.myData;
  
  $scope.img = 'microphone.svg';
  $scope.recordClass = "recordBtn";
  $scope.recording = false;
  $scope.content = 'Yet to Start Audio Recording....';
  
  $scope.recordAudio = function(){
     if(!$scope.recording){
	   $scope.img = 'stop.svg';
	   $scope.recordClass = "recordStopBtn";
	   $scope.recording = true;
	   $scope.content = "Recording is in Progress....";
	 }else{
	   $scope.img = 'microphone.svg';
	   $scope.recordClass = "recordBtn";
	   $scope.recording = false;
	   $scope.content = "Recording is Stopped.";
	 }
  	 
  }
    
  $http.get("/supportAgents").then(function (response) {
      $scope.supportAgentList = response.data.data;
     // $scope.supportAgentList.push({'SUPPORT_ID': 'All', 'SUPPORT_NAME':'All'});
      console.log($scope.supportAgentList);
  });
  
  $scope.viewChart = function(supportName) {
  	console.log(supportName);
      $window.showSupportReport(supportName);
  };
  
  $scope.playAudio = function(audioUrl) {
  	console.log('playAudio');
    var audio = new Audio();
    audio.src = '/download/' + audioUrl;
    audio.play();
  	/*$http.get('/download/' + audioUrl).then(function(response) {
  		console.log('response received');
  		var mediaSourceURL = URL.createObjectURL(response);
        var audio = new Audio();
        audio.src = response;
        audio.play();
  	});*/
  };
  
  $scope.analyzeData = function(supportId, filename){
  	
  	   var foundObject = _.findWhere($scope.myData[supportId], {AUDIO_URL: filename});
		  if(foundObject){
		       	 foundObject.SENTIMENT = 'InProgress'; 
				 foundObject.SENTIMENT_SCORE= 'InProgress';
				 //foundObject.ANGER='InProgress';
		   }
  	    	   
  	      $http.get("/analyze/"+filename).then(function (response) {
  	            foundObject.SENTIMENT =  response.data.sentiment.docSentiment.type; 
				foundObject.SENTIMENT_SCORE= response.data.sentiment.docSentiment.score; 
				//foundObject.ANGER= response.data.emotion.docEmotions.anger; 
				// $window.insertReports();
		   });
  }
  
  //Loading grid data
   $http.get("/conversations").then(function (response) {
       $scope.myData = response.data;
	   console.log($scope.myData);
   });
  $scope.recordCount = true;
  $scope.submit = function(){
  	  var inputParams = {};
	  inputParams.supportAgent = $scope.supportAgent;
	  inputParams.dateCategory = $scope.dateCategory;
	  inputParams.startDate = $scope.startDate;
	  inputParams.endDate = $scope.endDate;
	  
	  console.log("inputParams="+ JSON.stringify(inputParams));
	  
	  $http.post("/search", inputParams).success(function(data, status) {
	  	    console.log('SEARCH RESULTS :' + data);
            
            if(data.length==0){
            	$scope.recordCount = false;
            }
            $scope.myData = data;
            console.log($scope.myData);
        })
	  
	  
	  }
  
  $scope.disableCustom = true; 
  
  $scope.controlCustomDate = function(){
    if($scope.dateCategory==="custom"){
   	     $scope.disableCustom = false;
    }
    else{
    	 $scope.disableCustom = true; 
	}	
  }
  
  
});


app.directive("datepicker", function () {
        return {
            restrict: "A",
            require: "ngModel",
            link: function (scope, elem, attrs, ngModelCtrl) {
                var updateModel = function (dateText) {
                    // call $apply to bring stuff to angular model
                    scope.$apply(function () {
                        ngModelCtrl.$setViewValue(dateText);
                    });
                };

                var options = {
                    dateFormat: "dd/mm/yy",
                    // handle jquery date change
                    onSelect: function (dateText) {
                        updateModel(dateText);
                    }
                };

                // jqueryfy the element
                $(elem).datepicker(options);
            }
        }
    });
    
var sentimentGauge;
			
function createGauge(name, label)
{
	var config = 
	{
		size: 120,
		label: label,
		min: -1,
		max: 1,
		minorTicks: 5,
        greenZones: [{ from: 0, to: 1 }],
        redZones: [{ from: -1, to: 0 }]
	}
	
	sentimentGauge = new Gauge(name, config);
	sentimentGauge.render();
    sentimentGauge.redraw(0); // Set default to 0
    
    console.log(sentimentGauge);
}

function updateGauge(value)
{				
    sentimentGauge.redraw(value);
	//console.log(sentimentGauge);
}

function initialize()
{
	createGauge("sentimentGaugeContainer", "Sentiment");
	updateGauge(0);
}