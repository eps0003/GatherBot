const config = require("../config.json");
const tcpr = require("./tcpr.js");
const match = require("./match.js");
const util = require("./utilities.js");

var blueTeam = [];
var redTeam = [];

exports.clear = () => {
	blueTeam = [];
	redTeam = [];
	util.clearRole(config.blue_team_role);
	util.clearRole(config.red_team_role);
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
		player.member.roles.remove(config.red_team_role);
		player.member.roles.add(config.blue_team_role);
	}
	for (let player of redTeam) {
		player.member.roles.remove(config.blue_team_role);
		player.member.roles.add(config.red_team_role);
	}

	syncTeams();
	match.decidedTeams();
};

exports.scramble = () => {
	this.splitIntoTeams(getPlayers());
};

function getPlayers() {
	return blueTeam.concat(redTeam);
}

function syncTeams() {
	let blueText = `string[] blue = {${blueTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	blueText += "getRules().set('blue_team', blue);\n";
	tcpr.socket.write(blueText);

	let redText = `string[] red = {${redTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	redText += "getRules().set('red_team', red);\n";
	tcpr.socket.write(redText);

	tcpr.socket.write(`getRules().set_bool('gather_teams_set', true);\n`);
}
