var app = angular.module('myApp', []);

app.controller('customersCtrl', function($scope, $http,$window) {
	
  $scope.supportAgent="All";
  $scope.dateCategory="All";
  $scope.myData;
    
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
		   }
  	    	   
  	      $http.get("/analyze/"+filename).then(function (response) {
  	            foundObject.SENTIMENT =  response.data.docSentiment.type; 
				foundObject.SENTIMENT_SCORE= response.data.docSentiment.score; 
				$window.insertReports();
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
	  
	  console.log("inputParams="+inputParams);
	  
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

