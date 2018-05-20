var output = document.getElementById("output");


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
	updateProperty(issues, property)

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
function organizeIssues(issues) {
	var stories = {
		index:[],
		metrics:{
			done:[],
			total:0
		}};

	// go through each issues -- if it is undefined make a new issue object
	for(let i = 0; i < issues.length; i++) {
		var currentIssue = issues[i];
		if(stories[currentIssue.Key] === undefined) {
			stories[currentIssue.Key] = new Issue(
				currentIssue["Epic Link"],
				currentIssue["T"],
				currentIssue["Summary"],
				currentIssue["Changed Field"],
				currentIssue["Change Author"],
				currentIssue["Created"],
				currentIssue["Resolution"]
			);
			
			// add the issue to the index
			stories.index.push(currentIssue.Key);
		}
		// if it does already exist, then add the action to the existing issue object
		else {

			if(currentIssue["Change Time"] === "") {
				currentIssue["Change Time"] = issues[i+1]["Change Time"];
			}
			if(currentIssue["Changed Field"] === "status") {
				stories[currentIssue.Key].actions.push({
					"old":currentIssue["Old value"],
					"new":currentIssue["New Value"],
					"date":new Date(currentIssue["Change Time"])
				});
			}
			else if(currentIssue["Changed Field"] === "resolution") {
				stories[currentIssue.Key].finished = new Date(currentIssue["Change Time"]);
				if(currentIssue.Key === "USCISEM-1555") { // here here
					console.log(currentIssue["Change Time"],currentIssue["Changed Field"]);
				}
			}
		}
	}
	
	return stories;
}

// create a new issues object
function Issue (epic, pbiType, summary, actions, author, created, resolved) { // team
	this.epic = epic;
	this.pbiType = pbiType;
	this.actions = [];
	this.author = author;
	this.created = new Date(created);
	this.resolved = resolved;
	this.lead = 0;
	// this.team = team;
}

// go through the issues and figure out their lead time
function storyMetrics(stories) {
	var key = "";
	for(let i = 0; i < stories.index.length; i++) { 
		key = stories.index[i];
		// console.log(stories[key]);
		if(stories[key].resolved === "Done") {
			stories[key].lead = stories[key].finished - stories[key].created;
			stories.metrics.done.push(key);
		}
	}
	return stories;
}

// for each issue, go through and add up their lead times
function calcOutput(stories) {
	var key = "";
	for(let i = 0; i < stories.metrics.done.length; i++) {
		key = stories.metrics.done[i];
		// console.log(key);
		var lead = stories[key].lead;
		// console.log(lead);
		stories.metrics.total = stories.metrics.total + lead;
	}
	var cycle = stories.metrics.total / stories.index.length;
	stories.metrics.cycle = convertMS(cycle);
	return stories;
}

// the main controller moving data from function to function
function rolling(results) {
	var headers = results[0];
	console.log(headers);
	results = addHeaders(results, headers);
	console.log("Updated results", results);
	var issues = updatesIssues(results, headers);
	var stories = organizeIssues(issues);
	var overview = storyMetrics(stories);
	calcOutput(overview);
	console.log(overview);
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
