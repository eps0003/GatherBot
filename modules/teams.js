const { client } = require("../index.js");
const tcpr = require("./tcpr.js");
const util = require("./utilities.js");

var blueTeam = [];
var redTeam = [];

exports.clear = () => {
	blueTeam = [];
	redTeam = [];
	util.clearRole(process.env.BLUE_TEAM_ROLE);
	util.clearRole(process.env.RED_TEAM_ROLE);
};

exports.getTeam = (member) => {
	for (let player of blueTeam) {
		if (player.member === member) {
			return 0;
		}
	}

	for (let player of redTeam) {
		if (player.member === member) {
			return 1;
		}
	}

	return -1;
};

exports.getBlueTeam = () => {
	return blueTeam;
};

exports.getRedTeam = () => {
	return redTeam;
};

exports.getPlayerCount = () => {
	return blueTeam.length + redTeam.length;
};

exports.splitIntoTeams = (players) => {
	//for odd-sized queue, randomly select a team to be the larger team
	var blueSize = Math.random() > 0.5 ? Math.floor(players.length / 2) : Math.ceil(players.length / 2);
	blueTeam = players.splice(0, blueSize);
	redTeam = players;

	//add team roles to players
	for (let player of blueTeam) {
		player.member.roles.remove(process.env.RED_TEAM_ROLE);
		player.member.roles.add(process.env.BLUE_TEAM_ROLE);
	}
	for (let player of redTeam) {
		player.member.roles.remove(process.env.BLUE_TEAM_ROLE);
		player.member.roles.add(process.env.RED_TEAM_ROLE);
	}

	syncTeams();
};

exports.scramble = () => {
	this.splitIntoTeams(getPlayers());
};

exports.getPlayers = () => {
	return blueTeam.concat(redTeam);
};

exports.announceTeams = () => {
	let blueTeam = this.getBlueTeam();
	let redTeam = this.getRedTeam();

	let blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
	let redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`);
	console.log(`Blue Team: ${blueTeam.map((player) => player.username).join(" ")}`);
	console.log(`Red Team: ${redTeam.map((player) => player.username).join(" ")}`);

	let players = this.getPlayers();
	for (let player of players) {
		player.member.send(`**Your Gather match is about to start!**\n**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`);
	}
};

function syncTeams() {
	let blueText = `string[] blue = {${blueTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	blueText += "getRules().set('blue_team', blue);\n";
	tcpr.socket.write(blueText);

	let redText = `string[] red = {${redTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	redText += "getRules().set('red_team', red);\n";
	tcpr.socket.write(redText);

	tcpr.socket.write(`getRules().set_bool('gather_teams_set', true);\n`);
}
