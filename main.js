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
function organizeIssues(results) {
	var info = {
		stories: {},
		index:[],
		metrics:{
			done:[],
			total:0
		}};

	// go through each issues -- if it is undefined make a new issue object
	for(let i = 0; i < results.length; i++) {
		var currentRow = results[i]; // define the row we're working with
		if(info.stories[currentRow.Key] === undefined) { // if the key from this row we're working with doesn't exist, then create a new issue
			info.stories[currentRow.Key] = new Issue(
				currentRow["Epic Link"],
				currentRow["T"],
				currentRow["Summary"],
				currentRow["Changed Field"],
				currentRow["Change Author"],
				currentRow["Created"],
				currentRow["Resolution"]
			);
			
			// add the issue to the index
			info.index.push(currentRow.Key);
		}
		// if it does already exist, then add the action to the existing issue object
		else {

			if(currentRow["Change Time"] === "") {
				currentRow["Change Time"] = results[i+1]["Change Time"];
			}
			if(currentRow["Changed Field"] === "status") {
				info.stories[currentRow.Key].actions.push({
					"old":currentRow["Old value"],
					"new":currentRow["New Value"],
					"date":new Date(currentRow["Change Time"])
				});
			}
			else if(currentRow["Changed Field"] === "resolution") {
				info.stories[currentRow.Key].finished = new Date(currentRow["Change Time"]);
				if(currentRow.Key === "USCISEM-1555") { // here here
					console.log(currentRow["Change Time"],currentRow["Changed Field"]);
				}
			}
		}
	}
	
	return info;
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
function storyMetrics(info) {
	var key = "";
	for(let i = 0; i < info.index.length; i++) { 
		key = info.index[i];
		// console.log(stories[key]);
		if(info.stories[key].resolved === "Done") {
			info.stories[key].lead = info.stories[key].finished - info.stories[key].created;
			info.metrics.done.push(key);
		}
	}
	return info;
}

// for each issue, go through and add up their lead times
function calcOutput(info) {
	var key = "";
	for(let i = 0; i < info.metrics.done.length; i++) {
		key = info.metrics.done[i];
		// console.log(key);
		var lead = info.stories[key].lead;
		// console.log(lead);
		info.metrics.total = info.metrics.total + lead;
	}
	var cycle = info.metrics.total / info.index.length;
	info.metrics.cycle = convertMS(cycle);
	return info;
}

// the main controller moving data from function to function
function rolling(results) {
	var headers = results[0];
	console.log(headers);
	results = addHeaders(results, headers); // with headers
	console.log("Updated results", results);
	results = updatesIssues(results, headers); // with keys for all rows
	var info = organizeIssues(results); // create issues instead of just rows of a CSV
	var overview = storyMetrics(info); // calculate metrics based on stories
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
