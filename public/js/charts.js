/* initReporting.js
 * The following file is referenced within the client side views
 * Contains AJAX calls necessary to communicate with server-side script 
 * to retrieve reports and add them to the markup. Code for this file is 
 * used from the sample application OnTrack provided by IBM
 */

var urlRoot = "/ers/v1/";
var xRunLocation = "";

/* load report styles css asynchronously */
(function(){
	var lnk = document.createElement("link");
	lnk.rel='stylesheet';
	lnk.type='text/css'; 
	lnk.href = urlRoot + '~/schemas/GlobalReportStyles_10.css';
	var h = document.getElementsByTagName("head");
	h[0].appendChild(lnk);
})();

// Delete any runinstances that may be open when closing the browser
window.onbeforeunload = function () {
	return deleteRunInstance();
};


function getXmlHttp() {
	if (window.XMLHttpRequest) {
		return new XMLHttpRequest();
	} else {
		return new ActiveXObject("Microsoft.XMLHTTP");
	}
}

function getReport(reportID, elementID, format) {
	
	// if runLocation non-empty, release it.
	deleteRunInstance();

	// Locate placeholder for the report
	var reportElement = document.getElementById(elementID);

	// While we load, show busy.gif
	reportElement.innerHTML = "<span style='text-align:center; margin-top:50px;'><img src='images/busy.gif'/></span>";

	// Construct the URL to retrieve the report from the server
	var reportUrl = urlRoot + "definitions/" + reportID + "/reports/" + format;               
	var report = getXmlHttp();
	report.open("GET", reportUrl, true);

	report.onreadystatechange = function() {
		if (report.readyState === 4) {
			
			if(format === "json") {
				handleJsonResponse(report.responseText, reportElement);
			} else {
				handleHtmlResponse(report.responseText, reportElement);
			}
	
			if (report.status === 200) {
				// report ran successfully, we are now done with the run instance
				xRunLocation = report.getResponseHeader("X-RunLocation");
			}
		}
	};
	report.send();
}

function handleJsonResponse(text, element) {
	var data = JSON.parse(text);
	var item = data.dataset.crosstab.rows[0];
	element.innerHTML = "<span style='font-size:24pt; color: #379ec4;'>&nbsp;" + item + " </span>";
}

function handleHtmlResponse(text, element) {
	element.innerHTML = text.replace(/\.\.\/\.\.\//g, urlRoot);
}

/**
* Always delete the run instance when you're "finished" with a report run.
* You are done if you don't need to run secondary requests on the instance,
* like "next page" or "run in PDF"
*/
function deleteRunInstance() {
	if (xRunLocation !== "") {
		var del = getXmlHttp();
		del.open("DELETE", xRunLocation, true);
		del.send();
		xRunLocation = "";
	}
}

function insertReports() {
	//getReport("e56d81d9298af2dcb68b8314c0ee1ed7", "insertReport", "phtml");
	getReport("e56d81d9298af2dcb68b8314c0ee1ed7", "insertReport", "phtml");
}



function showSupportReport(supportId){
	var reportID = "ce6b235f760e134feccad4d0a79f1d28";
	if(supportId === 1) {
		reportID = "2fef48b40a4cc9800f380511c7548b67";
	} else if(supportId === 2){
		reportID = "2fef48b40a4cc9800f380511c7d88b94";
	} else if(supportId === 3){
		reportID = "dc40704b7a9d5cfdee1dd63e6fecaf04";
	}
	getSupportReport(supportId, reportID, "phtml");
}

function getSupportReport(supportId, reportID, format){              
	
	var reportUrl = urlRoot + "definitions/" + reportID + "/reports/" + format;     

	//Put the report parameters	
	/*var report = getXmlHttp();
    var reportParamUrl = urlRoot + "reports/" + reportID + "/reportParameters"; 
	var reportParams = '{ "SupportId" : {"value":supportId, "displayValue": supportId } }';
    report.open("PUT", reportParamUrl, true);
    report.setRequestHeader("Content-type", "application/json");
    report.send(reportParams);
    console.log(report.status);*/    
    
    //Get the report
   /* report.open("GET", reportUrl, true);
    report.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    report.onreadystatechange = function() {
		if (report.readyState === 4) {
			console.log(report.responseText);
	
			if (report.status === 200) {
				// report ran successfully, we are now done with the run instance
				xRunLocation = report.getResponseHeader("X-RunLocation");
			}
		}
	};
	report.send();*/
	
	console.log(reportUrl);
    window.open(reportUrl);
    
}