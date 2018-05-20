var output = document.getElementById("output");

/* Drag drop stuff */
window.ondragover = function(e) {e.preventDefault()}

window.ondrop = function(e) 
{
	e.preventDefault();
	console.log("Reading...");
	var length = e.dataTransfer.items.length;
	if(length > 1)
	{
		console.log("Please only drop 1 file.");
	} else 
	{
		upload(e.dataTransfer.files[0]);
	}
}

/* main upload function */
function upload(file) 
{
	var config = buildConfig();
	// var config = {
	// 	chunkSize: 10485760,
	// 	comments: "",
	// 	delimiter: "",
	// 	dynamicTyping: false,
	// 	encoding: "",
	// 	error: undefined,
	// 	header: true,
	// 	preview: 0,
	// 	skipEmptyLines: false,
	// 	step: undefined,
	// 	worker: false,
	// 	complete: function(results, file) {
	// 		rolling(results);
	// 	},
	// }

	console.log(config);

	// var config = {
	// 	delimiter: "",	// auto-detect
	// 	newline: "",	// auto-detect
	// 	quoteChar: '"',
	// 	escapeChar: '"',
	// 	header: true,
	// 	trimHeader: false,
	// 	dynamicTyping: false,
	// 	preview: 0,
	// 	encoding: "",
	// 	worker: false,
	// 	comments: false,
	// 	step: undefined,
	// 	complete: function(results, file) {
	// 		rolling(results);
	// 	},
	// 	error: undefined,
	// 	download: false,
	// 	skipEmptyLines: true,
	// 	chunk: undefined,
	// 	fastMode: undefined,
	// 	beforeFirstChunk: undefined,
	// 	withCredentials: undefined
	// }

	Papa.parse(file, config);
}

// find the headers for the objects
function showObject(obj) {
  var result = [];
  for (var p in obj) {
    if( obj.hasOwnProperty(p) ) {
      result.push(p);
    } 
  }              
  return result;
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
	return stories;
}

// the main controller moving data from function to function
function rolling(results) {
	console.log("Raw results", results);
	var headers = showObject(results.data[0]);
	console.log(headers);
	results = fixParsing(results, headers);
	console.log("Parsing complete:", results);
	var issues = updatesIssues(results.data, headers);
	var stories = organizeIssues(issues);
	stories = storyMetrics(stories);
	calcOutput(stories);
	console.log(stories);
}

// fixing busted parsing that messed up complex fields with quotes, commands, and line breaks
function fixParsing(results, headers) {
	for(let i = 0; i < results.data.length; i++) {
		if(results.data[i].__parsed_extra === undefined) {
		}
		else {
			var mistakes = Math.ceil(results.data[i].__parsed_extra.length/headers.length);
			console.log(mistakes);
			for(let j = 0; j < mistakes; j++) {
				var modifier = (j+1)*(headers.length-1);
				var tempRow = {};
				tempRow[headers[0]] = "";
				
				for(let k = 0; k < headers.length-1; k++) {
					tempRow[headers[k+1]] = results.data[i].__parsed_extra[k+(j*modifier)];
				}
				results.data.splice(i+1, 0, tempRow);
			}
		}
	}
	return results;
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

function buildConfig()
{
	var enc = $('#encoding').val();
	console.log("enc",enc);

	return {
		
		delimiter: false,
		header: false,
		dynamicTyping: false,
		skipEmptyLines: false,
		preview: 0,
		step: false,
		worker: false,
		comments: "",
		complete: function(results, file) {
			rolling(results);
		},
		error: undefined,
		
		// delimiter: $('#delimiter').val(),
		// header: $('#header').prop('checked'),
		// dynamicTyping: $('#dynamicTyping').prop('checked'),
		// skipEmptyLines: $('#skipEmptyLines').prop('checked'),
		// preview: parseInt($('#preview').val() || 0),
		// step: $('#stream').prop('checked') ? stepFn : undefined,
		// encoding: $('#encoding').val(),
		// worker: $('#worker').prop('checked'),
		// comments: $('#comments').val(),
	};
}