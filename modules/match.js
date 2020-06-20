const { client } = require("../index.js");
const teams = require("./teams.js");
const queue = require("./queue.js");
const tcpr = require("./tcpr.js");

var matchIsLive = false;

exports.decidedTeams = () => {
	let blueTeam = teams.getBlueTeam();
	let redTeam = teams.getRedTeam();

	let blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
	let redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

	//announce teams
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`);
	console.log(`Blue Team: ${blueTeam.map((player) => player.username).join(" ")}`);
	console.log(`Red Team: ${redTeam.map((player) => player.username).join(" ")}`);
};

exports.matchStarted = () => {
	matchIsLive = true;
	console.log("Match started");
};

exports.endMatch = () => {
	tcpr.socket.write("getRules().set_bool('gather_end_match', true);\n");
};

exports.matchEnded = (winner) => {
	matchIsLive = false;

	//clear teams
	teams.clear();

	//announce winner
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	if (winner == 0 || winner == 1) {
		var teamNames = ["Blue Team", "Red Team"];
		channel.send(`**Match ended. ${teamNames[winner]} won!**`);
		console.log(`Match ended. ${teamNames[winner]} won!`);
	} else {
		channel.send("**Match ended prematurely**");
		console.log("Match ended prematurely");
	}

	//queue might have become full while match was in progress
	queue.checkQueueFull();
};

exports.isInProgress = () => {
	return teams.getPlayerCount() > 0;
};

exports.isParticipating = (member) => {
	return teams.getTeam(member) > -1;
};

exports.isLive = () => {
	return matchIsLive;
};
