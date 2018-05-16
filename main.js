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
	var config = {
		delimiter: "",	// auto-detect
		newline: "",	// auto-detect
		quoteChar: '"',
		escapeChar: '"',
		header: true,
		trimHeader: false,
		dynamicTyping: false,
		preview: 0,
		encoding: "",
		worker: false,
		comments: false,
		step: undefined,
		complete: function(results, file) {
			rolling(results);
		},
		error: undefined,
		download: false,
		skipEmptyLines: false,
		chunk: undefined,
		fastMode: undefined,
		beforeFirstChunk: undefined,
		withCredentials: undefined
	}

	Papa.parse(file, config);
}

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

function updateProperty(issues, property) {
	for(let i = 0; i < issues.length; i++) {
			if(issues[i][property] === "" && i > 0) {
			issues[i][property] = issues[i-1][property];
		}
	}
	return issues;
}

function organizeIssues(issues) {
	var stories = {
		index:[],
		metrics:{
			done:[],
			total:0
		}};

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
			
			stories.index.push(currentIssue.Key);
		}
		else {
			if(currentIssue["Change Time"] === "") {
				currentIssue["Change Time"] = issues[i-1]["Change Time"];
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

function rolling(results) {
	console.log("Parsing complete:", results);
	var headers = showObject(results.data[0]);
	var issues = updatesIssues(results.data, headers);
	var stories = organizeIssues(issues);
	stories = storyMetrics(stories);
	calcOutput(stories);
	console.log(stories);
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