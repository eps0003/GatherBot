const { client } = require("../index");
const teams = require("./teams");
const queue = require("./queue");
const tcpr = require("./tcpr");
const stats = require("./stats");
const util = require("./utilities");
const subs = require("./substitutions");
const format = require("format-duration");

const matchEndReasons = ["because the server went offline", "prematurely by an admin", "by capturing the enemy flags", "by killing off the enemy"];
const matchEndReasonsShort = ["disconnected", "forced", "flags", "tickets"];

var matchIsLive = false;

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

exports.matchEnded = (cause, winner, duration, map, blueTickets, redTickets, playerStats) => {
	matchIsLive = false;

	//announce winner
	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	const reason = matchEndReasons[cause];

	if ([this.matchEndCause.capturedFlags, this.matchEndCause.tickets].includes(cause)) {
		const teamName = teams.getTeamName(winner);
		channel.send(`**Match ended. ${teamName} won ${reason}!**`);
		console.log(`Match ended. ${teamName} won ${reason}!`);

		logMatch(cause, winner, duration, map, blueTickets, redTickets);
		stats.saveMatch(cause, winner, duration, map, blueTickets, redTickets, playerStats);
	} else {
		channel.send(`**Match ended ${reason}**`);
		console.log(`Match ended ${reason}`);
	}

	teams.clear();
	subs.clear();
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
	const blueTeam = teams.getBlueTeam();
	const redTeam = teams.getRedTeam();

	const blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
	const redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

	const winningTeamName = teams.getTeamName(winner);
	const durationFormatted = format(duration / 0.03);
	const reason = matchEndReasonsShort[cause];

	const blueTicketText = blueTickets < 0 ? "∞" : blueTickets;
	const redTicketText = redTickets < 0 ? "∞" : redTickets;

	const channel = client.channels.cache.get(process.env.MATCH_HISTORY);
	channel.send(`**${teams.getTeamName(0)}:** ${blueTeamMentions}\n**${teams.getTeamName(1)}:** ${redTeamMentions}\n**Map: ** ${util.sanitise(map)}\n**Duration:** ${durationFormatted}\n**Tickets:** ${blueTicketText} ${teams.getShortTeamName(0)} - ${redTicketText} ${teams.getShortTeamName(1)}\n**Winner:** ${winningTeamName} (${reason})`);
}
