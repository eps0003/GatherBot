const { client } = require("../index.js");
const teams = require("./teams.js");
const queue = require("./queue.js");
const tcpr = require("./tcpr.js");
const util = require("./utilities.js");
var format = require("format-duration");

var matchIsLive = false;
var matchEndReasons = ["because the server went offline", "prematurely by an admin", "by capturing the enemy flags", "by killing off the enemy"];
var matchEndReasonsShort = ["disconnected", "forced", "flags", "tickets"];

exports.matchEndCause = Object.freeze({
	disconnected: 0,
	forced: 1,
	capturedFlags: 2,
	tickets: 3,
});

exports.matchStarted = () => {
	matchIsLive = true;
	util.updatePresence();
	console.log("Match started");
};

exports.endMatch = () => {
	tcpr.socket.write("getRules().set_bool('gather_end_match', true);\n");
};

exports.matchEnded = (cause, winner, duration, map, blueTickets, redTickets) => {
	matchIsLive = false;

	//announce winner
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	let reason = matchEndReasons[cause];

	if ([this.matchEndCause.capturedFlags, this.matchEndCause.tickets].includes(cause)) {
		let teamName = teams.getTeamName(winner);
		channel.send(`**Match ended. ${teamName} won ${reason}!**`);
		console.log(`Match ended. ${teamName} won ${reason}!`);

		logMatch(cause, winner, duration, map, blueTickets, redTickets);
	} else {
		channel.send(`**Match ended ${reason}**`);
		console.log(`Match ended ${reason}`);
	}

	teams.clear();
	util.updatePresence();

	//queue might have become full while match was in progress
	queue.checkQueueFull();
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

function logMatch(cause, winner, duration, map, blueTickets, redTickets) {
	let blueTeam = teams.getBlueTeam();
	let redTeam = teams.getRedTeam();

	let blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
	let redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

	let winningTeamName = teams.getTeamName(winner);
	let durationFormatted = format(duration / 0.03);
	let reason = matchEndReasonsShort[cause];

	let channel = client.channels.cache.get(process.env.MATCH_HISTORY);
	channel.send(`**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Map: ** ${util.sanitise(map)}\n**Duration:** ${durationFormatted}\n**Tickets:** ${blueTickets} Blue - ${redTickets} Red\n**Winner:** ${winningTeamName} (${reason})`);
}
