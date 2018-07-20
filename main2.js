var overview = "";

var output = document.getElementById("output");

const statusMapping = {
		Ideas: "ideas",
		New: "ideas",
		"Analysis/Design In Progress": "analysis",
		"Analysis/Design To Do": "analysis",
		"In Design": "analysis",
		"Analysis/Design Done": "ready",
		"Ready for Dev": "ready",
		"On Deck": "queue",
		"Development: In Progress": "dev",
		"Development: Done": "test",
		"Ready for BA Review": "test",
		"BA Review: In Progress": "testing",
		"BA Review: Done": "po",
		"E2E: In Progress": "po",
		"E2E: Done": "po",
		"Ready for PO Review": "po",
		"PO Review": "po",
		// "Ready to Demo": "done",
		"Ready to Demo": "demo",
		Done: "done",
		Cancelled: "canceled",
		"To Do": "toDo",
		"In Progress": "inProgress"
	}

function upload(file) {
	var reader = new FileReader();

	reader.onload = function(e) {
		var text = reader.result;
		var results = parseCSV(text);
		rolling(results);
	}

	reader.readAsText(file);
}

function parseCSV(str) {
    var arr = [];
    var quote = false;  // true means we're inside a quoted field

    // iterate over each character, keep track of current row and column (of the returned array)
    for (var row = col = c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];        // current character, next character
        arr[row] = arr[row] || [];             // create a new row if necessary
        arr[row][col] = arr[row][col] || '';   // create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }  

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') { quote = !quote; continue; }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) { ++col; continue; }

        // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
        // and move on to the next row and move to column 0 of that new row
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

        // If it's a newline (LF or CR) and we're not in a quoted field,
        // move on to the next row and move to column 0 of that new row
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}

function addHeaders(results, headers) {
	for(let i = 1; i < results.length; i++) {
		var tempRow = {};
		for(let j = 0; j < headers.length; j++) {
			tempRow[headers[j]] = results[i][j];
		}
		results[i] = tempRow;
	}

	return results;
}

function updatesIssues(issues, values) {
	var property = "Key";
	updateProperty(issues, "Key");
	updateProperty(issues, "Change Time");

	return issues;
}

// for any given property, if it's blank, then assign the property from the previous row
function updateProperty(issues, property) {
	for(let i = 0; i < issues.length; i++) {
			if(issues[i][property] === "" && i > 0) {
			issues[i][property] = issues[i-1][property];
		}
	}
	return issues;
}

// create the various issues and bring them all together with various actions
function organizeIssues(results) {
	var info = {
		stories: {},
		lists:{ 
			storyIndex:[]
		},
		metrics:{
			done:[],
			total:0
		}};

	// go through each issues -- if it is undefined make a new issue object
	for(let i = 0; i < results.length; i++) {
		var currentRow = results[i]; // define the row we're working with

		if(info.stories[currentRow.Key] === undefined) { // if the key from this row we're working with doesn't exist, then create a new issue
			var actions = {};
			if(currentRow["Changed Field"] === "status") {
				actions = {
					oldVal: currentRow["Old value"],
					newVal: currentRow["New Value"],
					date: new Date(currentRow["Change Time"])
				}
			}
			info.stories[currentRow.Key] = new Issue(
				currentRow["Epic Link"],
				currentRow["T"],
				currentRow["Summary"],
				actions,
				currentRow["Change Author"],
				currentRow["Created"],
				currentRow["Resolution"],
				currentRow["Labels"],
				currentRow["P"],
				currentRow["Status"]
			);

			// add the issue to the lists
			info.lists.storyIndex.push(currentRow.Key);
		}
		// if it does already exist, then add the action to the existing issue object
		else {

			// if(currentRow["Change Time"] === "") {
			// 	if(results[i+1] === undefined) {
			// 		currentRow["Change Time"] = results[i-1]["Change Time"];
			// 	}
			// 	else {
			// 		currentRow["Change Time"] = results[i+1]["Change Time"];
			// 	}
			// }

			/*else*/ 
			if(currentRow["Changed Field"] === "status") {
				// var status = currentRow["New Value"];

				if((currentRow["New Value"] === "Done" || currentRow["New Value"] === "Ready to Demo") && info.stories[currentRow.Key].resolved !== "Done") {
					info.stories[currentRow.Key].resolved = "Done";
					info.stories[currentRow.Key].finished = new Date(currentRow["Change Time"]);
					info.stories[currentRow.Key].actions.push({
						"oldVal":currentRow["Old value"],
						"newVal":currentRow["New Value"],
						"date":new Date(currentRow["Change Time"])
					});

					var newStatus = statusMapping[currentRow["New Value"]];
					info.stories[currentRow.Key].statuses[newStatus] = new Date(currentRow["Change Time"])
				}
				else {
					info.stories[currentRow.Key].actions.push({
						"oldVal":currentRow["Old value"],
						"newVal":currentRow["New Value"],
						"date":new Date(currentRow["Change Time"])
					});

					var newStatus = statusMapping[currentRow["New Value"]];
					info.stories[currentRow.Key].statuses[newStatus] = new Date(currentRow["Change Time"])
				}
			}
			else if(currentRow["Changed Field"] === "resolution") {
				// info.stories[currentRow.Key].finished = new Date(currentRow["Change Time"]);
			}
		}
	}
	
	console.log("organizeIssues", info);

	return info;
}

// create a new issues object
function Issue (epic, pbiType, summary, actions, author, created, resolved, labels, priority, status) { // team
	this.epic = epic;
	this.pbiType = pbiType;
	this.summary = summary;
	this.actions = [actions];
	this.author = author;
	this.created = new Date(created);
	this.resolved = resolved;
	this.lead = 0;
	this.status = status;
	this.priority = priority;
	this.labels = labels;
	this.statuses = {
		ideas: new Date(created),
		analysis: 0,
		ready: 0,
		queue: 0,
		dev: 0,
		test: 0,
		testing: 0,
		po: 0,
		demo: 0,
		done: 0,
		canceled: 0,
		toDo: 0,
		inProgress: 0
	}
	
	if(actions.newVal === undefined) {
	}
	else {
		var newStatus = statusMapping[actions.newVal];
		this.statuses[newStatus] = new Date(actions.date);
	}

	var team = "";

	if(this.labels === undefined) {
		this.team = "";
	}
	else {
		if(this.labels.indexOf("BITS") > -1) {
			this.team = "BITS";
		}
		else if(this.labels.indexOf("Faux_Pa's") > -1) {
			this.team = "Faux_Pa's";
		}
		else if(this.labels.indexOf("big_sillies")  > -1) {
			this.team = "big_sillies";
		}
		else {
			this.team = "";
		}
	}
}

// go through the issues and figure out their lead time
function leadTime(info) { 
	var key = "";
	for(let i = 0; i < info.lists.storyIndex.length; i++) { 
		key = info.lists.storyIndex[i];
		
		if(info.stories[key].resolved === "Done") {
			info.stories[key].lead = info.stories[key].finished - info.stories[key].created;
			info.metrics.done.push(key);
			info.stories[key].statuses.done = info.stories[key].finished;
		}
	}
	return info;
}

function allStatuses(issues) {
	let key = "";
	issues.lists.allStatuses = [];
	let statuses = issues.lists.allStatuses;
	
	for(let i = 0; i < issues.lists.storyIndex.length; i++) {
		key = issues.lists.storyIndex[i];

		for(let j = 0; j < issues.stories[key].actions.length; j++) {
			let oldAction = issues.stories[key].actions[j].oldVal;
			let newAction = issues.stories[key].actions[j].newVal;

			if(statuses.includes(oldAction) === false) {
				statuses.push(oldAction);
			}
			if(statuses.includes(newAction) === false) {
				statuses.push(newAction);
			}
		}
	}

	return issues;
}

// for each issue, go through and add up their lead times
function calcAvglead(info) {
	var key = "";
	for(let i = 0; i < info.metrics.done.length; i++) {
		key = info.metrics.done[i];
		// console.log(key);
		var lead = info.stories[key].lead;
		// console.log(lead);
		info.metrics.total = info.metrics.total + lead;
	}
	var lead = info.metrics.total / info.metrics.done.length;
	info.metrics.lead = convertMS(lead);
	return info;
}

// the main controller moving data from function to function
function rolling(historyResults) {
	console.log(historyResults);
	var headers = historyResults[0];
	console.log(headers);
	var issues = massageResults(historyResults, headers); // turns history elements into an object for each issue
	overview = leadTime(issues); // calculate metrics based on stories
	allStatuses(overview); // collate all the statuses the an issue is ever in
	calcAvglead(overview); 
	isDevOps(overview); // assigns devOps flag to each story to ensure that the calculations work out correctly
	categorizeStatus(overview);
	// displayStatuses(overview);

	var notDone = $("#notDone").prop("checked");
	if(notDone === true) {
		displayNotDone(overview)
	}
	else {
		showOutput(overview)
	}
	// showOutput(overview); // output the result to the UI

	console.log(overview); // show the overview of data on the console
}

function massageResults(historyResults, headers) {
	let resultsWithHeaders = addHeaders(historyResults, headers); // add headers to each history element
	let resultsWithKey = updatesIssues(resultsWithHeaders, headers); // carry down the key to history elements where the key is blank to faciliate organization
	let stories = organizeIssues(resultsWithKey); // create issue objects that will be usable as stories, bugs, etc
	return stories;
}

function isDevOps(overview) {
	for(let i = 1; i < overview.lists.storyIndex.length; i++) {
		var key = overview.lists.storyIndex[i];
		var base = overview.stories[key];
		
		if(base.author === "Christopher Petro " || base.author === "Olumayowa Aladeojebi " || base.author === "Joshua Dorothy ") {
			base.devOps = true;
		}

		else if (base.actions.length === 0) {
			base.devOps = false;
		}

		else {
			for(let j = 0; j < base.actions.length; j++) {
				if(base.actions[j].oldVal === "To Do" || base.actions[j].oldVal === "In Progress" 
					|| base.actions[j].newVal === "To Do" || base.actions[j].newVal === "In Progress") {
					base.devOps = true;
				}
				else if(j === base.actions.length - 1) {
					base.devOps = false;
				}
				else {
					base.devOps = false;
				}
			}
		}
	}

	return overview;
}

// concert MS to a day, hour, etc object
function convertMS(ms) {
  var d, h, m, s;
  s = Math.floor(ms / 1000);
  m = Math.floor(s / 60);
  s = s % 60;
  h = Math.floor(m / 60);
  m = m % 60;
  d = Math.floor(h / 24);
  h = h % 24;
  return { d: d, h: h, m: m, s: s };
};

function categorizeStatus(info) {
	const statuses = {
		Ideas: 1,
		New: 1,
		"Analysis/Design In Progress": 2,
		"Analysis/Design To Do": 2,
		"In Design": 2,
		"Analysis/Design Done": 3,
		"Ready for Dev": 3,
		"On Deck": 4,
		"Development: In Progress": 5,
		"Development: Done": 6,
		"Ready for BA Review": 6,
		"BA Review: In Progress": 7,
		"BA Review: Done": 8,
		"E2E: In Progress": 9,
		"E2E: Done": 10,
		"Ready for PO Review": 11,
		"PO Review": 12,
		"Ready to Demo": 13,
		Done: 14,
		Cancelled: 15,
		"To Do": 20,
		"In Progress": 21
	}
	
	console.log("statuses", statuses);
	console.log("order", statusMapping);
}

function displayStatuses(overview) {
	let allStatuses = overview.lists.allStatuses;
	var $output = $("#output");
	$output.append($("<div id='statuses'><h2>Statuses</h2><br>Order | DevOps | Status<ul>"));
	
	let $statusOutput = $("#statuses");
	let numStatuses = allStatuses.length;
	for(let i = 0; i < numStatuses; i++) {
		$statusOutput.append("<li><input type='number' min='1' max='" + numStatuses + "' name='" + allStatuses[i] + "' id='status" + i + "' size='4'> <input type='checkbox' class='devOpsBox'> " + allStatuses[i]); 
	}
	$output.append($("<br><input type='submit' id='reorder' value='Re-order' onclick='reorderStatuses()'>"));
}

function reorderStatuses() {
	console.log("reorder");
	let numStatuses = overview.lists.allStatuses.length;

	let order = [];

	for(let i = 0; i < numStatuses; i++) {
		let currentOrder = Number($("#status" + i)[0].value);
		let currentStatus = $("#status" + i)[0].name;
		
		if(currentOrder > 0) {
			order.push([currentOrder,currentStatus]);
		}
		else {
			order.push([0,currentStatus]);
		}
	}
	order.sort(function(a, b){return a-b}); // here here stupid fucking sort not sorting numbers!!!
	console.log(order);

	let $statusOutput = $("#statuses");
	$statusOutput.replaceWith("<div id='statuses'><h2>Statuses</h2><br>Order | DevOps | Status<ul>")
	$statusOutput = $("#statuses");

	console.log($statusOutput);

	for(let j = 0; j < numStatuses; j++) {
		if(order[j][0] > 0) {
			$statusOutput.append("<li><input type='number' class='good' value='" + order[j][0] + "'min='1' max='" + numStatuses + "' name='" + order[j][1] + "' id='status" + j + "' size='4'> <input type='checkbox' class='devOpsBox'> " + order[j][1]);
		}
		else {
			$statusOutput.append("<li><input type='number' class='null' value='" + order[j][0] + "'min='1' max='" + numStatuses + "' name='" + order[j][1] + "' id='status" + j + "' size='4'> <input type='checkbox' class='devOpsBox'> " + order[j][1]);
		}
	}

	var example = [1,0,12,4,3,8,10,2,0,0,10];
	console.log(example.sort(function(a, b){return a-b}));

	var example2 = [[1,"apple"],[0,"zero"],[12,"muffin"],[4,"doug"],[3,"cat"],[8,"hat"],[10,"jump"],[2,"bog"],[0,"zip"],[0,"zilch"],[10,"jog"]];
	console.log(example2.sort(function(a, b){return a-b}));
}

function showOutput(info) {
	var $doneBox = $("#doneBox");
	$doneBox.remove();

	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const order = ["ideas", "analysis", "ready", "queue", "dev", "test", "testing", "po", "demo", "done"]		

	var $done = $("#output");
	$done.append($("<br><br><table id='summary'><tr><th>Key</th><th>PBI Type</th><th>lead Time</th><th>Summary</th><th>Start</th><th>End</th><th>Dev Ops</th><th>Team</th><th>Labels</th><th>Status</th><th>Priority</th><th>ideas</th><th>analysis</th><th>ready</th><th>queue</th><th>dev</th><th>test</th><th>testing</th><th>po</th><th>Demo</th><th>done</th></tr>"));
	for(i = 0; i < info.metrics.done.length; i++) {
		var key = info.metrics.done[i];
		var issue = info.stories[key];
		var pbiType = issue.pbiType;
		var summary = issue.summary

		var lead = convertMS(issue.lead);
		var time = (Math.round((lead.d + (lead.h/24))*100))/100;

		var startDate = issue.created;
		var finishDate = issue.finished;
		var start = startDate.getMonth()+1 + "/" + startDate.getDate() + "/" + startDate.getFullYear();
		var finish = finishDate.getMonth()+1 + "/" + finishDate.getDate() + "/" + finishDate.getFullYear();

		var devOps = issue.devOps;
		var team = issue.team;
		var labels = issue.labels;

		var priority = issue.priority;
		var status = issue.status;

		// var $rowOfStuff = $("<tr><td>").html(metrics.sprints[i].name + "</td></tr>");
		var statusReport = "";

		for(let j = 0; j < order.length; j++) {
			var currentDate = issue.statuses[order[j]];
			
			if(currentDate === 0) {
				if(j < order.length-1) {
					statusReport = statusReport + "</td><td>";
				}
				else {
					"</td></tr>"
				}
			}
			else if(j < order.length-1) {
				// statusReport = statusReport + monthNames[currentDate.getMonth()] + " " + currentDate.getDate() + "</td><td>"; // to use the month names instead of the number
				var monthNum = currentDate.getMonth()+1;
				statusReport = statusReport + monthNum + "/" + currentDate.getDate() + "/" + currentDate.getFullYear() + "</td><td>";
			}
			else {
				var monthNum = currentDate.getMonth()+1;
				statusReport = statusReport + monthNum + "/" + currentDate.getDate() + "/" + currentDate.getFullYear() + "</td></tr>";
			}
		}
		// console.log(key, statusReport);

		var $rowOfStuff = $("<tr><td>" + key + "</td><td>" + pbiType + "</td><td>" + time + /* " days" + */ "</td><td>" + summary + "</td><td>" + start + "</td><td>" + finish + "</td><td>" + devOps + "</td><td>" + team + "</td><td>" + labels + "</td><td>" + status + "</td><td>" + priority + "</td><td>" + statusReport + "</td></tr>");

		// var $sprintHeader = $("<h3>").html(metrics.sprints[i].name + "</h3>");
		// var $sprintData = (
		// 	"<p>Sprint Start: " + metrics.sprints[i].sprintStart + // .toDateString()
		// 	"<br>Sprint End: " + metrics.sprints[i].sprintEnd + // .toDateString()
		// 	"<br>Cards: " + metrics.sprints[i].cards.length + 
		// 	"<br>Average card lead time: " + days + " days");//metrics.sprints[i].leadAvg.h/24;// + Math.round((metrics.sprints[i].leadAvg.h/24),2));
		
		var $output = $("#summary");
		// $output.append($sprintHeader);
		// $output.append($sprintData);

		$output.append($rowOfStuff);
	}

	var lead = info.metrics.lead;
	var leadTime = $("<p>Total average lead time: " + lead.d + /* " days " + */ lead.h + " hours " + lead.m + " minutes " + lead.s + " seconds</p>");
	$("#output").append(leadTime);

	// var notDone = $("#notDone").prop("checked");
	// if(notDone === true) {
	// 	displayNotDone(info)
	// }
	// else {
	// 	console.log("Don't display work that isn't done");
	// }
}

function displayNotDone(info) { // display the stories that aren't done below the work that is done
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const order = ["ideas", "analysis", "ready", "queue", "dev", "test", "testing", "po", "demo", "done"]		

	var $done = $("#output2");
	$done.append($("<br><br><table id='summary2'><tr><th>Key</th><th>PBI Type</th><th>lead Time</th><th>Summary</th><th>Start</th><th>End</th><th>Dev Ops</th><th>Team</th><th>Status</th><th>Priority</th><th>Labels</th><th>ideas</th><th>analysis</th><th>ready</th><th>queue</th><th>dev</th><th>test</th><th>testing</th><th>po</th><th>demo</th><th>done</th></tr>"));
	for(i = 0; i < info.lists.storyIndex.length; i++) {
		var key = info.lists.storyIndex[i];
		var issue = info.stories[key];
		var pbiType = issue.pbiType;
		var summary = issue.summary

		var lead = convertMS(issue.lead);
		var time = (Math.round((lead.d + (lead.h/24))*100))/100;

		var startDate = issue.created;
		var finishDate = issue.finished;
		var start = startDate.getMonth()+1 + "/" + startDate.getDate() + "/" + startDate.getFullYear();
		
		if(finishDate === undefined) {
			var finish = "";
		}
		else {
			var finish = finishDate.getMonth()+1 + "/" + finishDate.getDate() + "/" + finishDate.getFullYear();
		}

		var devOps = issue.devOps;
		var team = issue.team;
		var labels = issue.labels;

		var priority = issue.priority;
		var status = issue.status;

		// var $rowOfStuff = $("<tr><td>").html(metrics.sprints[i].name + "</td></tr>");
		var statusReport = "";

		for(let j = 0; j < order.length; j++) {
			var currentDate = issue.statuses[order[j]];
			
			if(currentDate === 0) {
				if(j < order.length-1) {
					statusReport = statusReport + "</td><td>";
				}
				else {
					"</td></tr>"
				}
			}
			else if(j < order.length-1) {
				// statusReport = statusReport + monthNames[currentDate.getMonth()] + " " + currentDate.getDate() + "</td><td>"; // to use the month names instead of the number
				var monthNum = currentDate.getMonth()+1;
				statusReport = statusReport + monthNum + "/" + currentDate.getDate() + "/" + currentDate.getFullYear() + "</td><td>";
			}
			else {
				var monthNum = currentDate.getMonth()+1;
				statusReport = statusReport + monthNum + "/" + currentDate.getDate() + "/" + currentDate.getFullYear() + "</td></tr>";
			}
		}
		// console.log(key, statusReport);

		var $rowOfStuff = $("<tr><td>" + key + "</td><td>" + pbiType + "</td><td>" + time + /*" days" +*/ "</td><td>" + summary + "</td><td>" + start + "</td><td>" + finish + "</td><td>" + devOps + "</td><td>" + team + "</td><td>" + status + "</td><td>" + priority + "</td><td>" + labels + "</td><td>" + statusReport + "</td></tr>");

		// var $sprintHeader = $("<h3>").html(metrics.sprints[i].name + "</h3>");
		// var $sprintData = (
		// 	"<p>Sprint Start: " + metrics.sprints[i].sprintStart + // .toDateString()
		// 	"<br>Sprint End: " + metrics.sprints[i].sprintEnd + // .toDateString()
		// 	"<br>Cards: " + metrics.sprints[i].cards.length + 
		// 	"<br>Average card lead time: " + days + " days");//metrics.sprints[i].leadAvg.h/24;// + Math.round((metrics.sprints[i].leadAvg.h/24),2));
		
		var $output = $("#summary2");
		// $output.append($sprintHeader);
		// $output.append($sprintData);

		$output.append($rowOfStuff);
	}

	var lead = info.metrics.lead;
	var leadTime = $("<p>Total average lead time: " + lead.d + /* " days " + */ lead.h + " hours " + lead.m + " minutes " + lead.s + " seconds</p>");
	$("#output2").append(leadTime);
}