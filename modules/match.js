const { client } = require("../index.js");
const teams = require("./teams.js");
const queue = require("./queue.js");
const tcpr = require("./tcpr.js");
const util = require("./utilities.js");
var format = require("format-duration");

var matchIsLive = false;

exports.matchStarted = () => {
	matchIsLive = true;
	util.updatePresence();
	console.log("Match started");
};

exports.endMatch = () => {
	tcpr.socket.write("getRules().set_bool('gather_end_match', true);\n");
};

exports.matchEnded = (winner = -1, duration, map) => {
	if (this.isInProgress()) {
		matchIsLive = false;

		logMatch(winner, duration, map);
		teams.clear();
		util.updatePresence();

		//announce winner
		let channel = client.channels.cache.get(process.env.GATHER_GENERAL);

		if (winner == 0 || winner == 1) {
			var teamName = teams.getTeamName(winner);
			channel.send(`**Match ended. ${teamName} won!**`);
			console.log(`Match ended. ${teamName} won!`);
		} else {
			channel.send("**Match ended prematurely**");
			console.log("Match ended prematurely");
		}

		//queue might have become full while match was in progress
		queue.checkQueueFull();
	}
};

exports.isInProgress = () => {
	return teams.getPlayerCount() > 0;
};

exports.isParticipating = (member) => {
	return teams.getTeamNum(member) > -1;
};

exports.isLive = () => {
	return matchIsLive;
};

function logMatch(winner, duration, map) {
	if (winner == 0 || winner == 1) {
		let blueTeam = teams.getBlueTeam();
		let redTeam = teams.getRedTeam();

		let blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
		let redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

		let winningTeamName = teams.getTeamName(winner);
		let durationFormatted = format(duration / 0.03);

		let channel = client.channels.cache.get(process.env.MATCH_HISTORY);
		channel.send(`**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Map: ** ${util.sanitise(map)}\n**Duration:** ${durationFormatted}\n**Winner:** ${winningTeamName}`);
	}
}
