const { client } = require("../index.js");
const tcpr = require("./tcpr.js");
const util = require("./utilities.js");
const match = require("./match.js");
const link = require("./link.js");
const queue = require("./queue.js");

var blueTeam = [];
var redTeam = [];

exports.clear = () => {
	blueTeam = [];
	redTeam = [];

	util.clearRole(process.env.BLUE_TEAM_ROLE);
	util.clearRole(process.env.RED_TEAM_ROLE);
};

exports.getTeamName = (team) => {
	switch (team) {
		case 0:
			return "Blue Team";
		case 1:
			return "Red Team";
	}
	return "Spectator";
};

exports.getTeamNum = (member) => {
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

exports.setBlueTeam = (players) => {
	blueTeam = players;

	for (let player of players) {
		player.member.roles.remove(process.env.RED_TEAM_ROLE);
		player.member.roles.add(process.env.BLUE_TEAM_ROLE);
	}
};

exports.setRedTeam = (players) => {
	redTeam = players;

	for (let player of players) {
		player.member.roles.remove(process.env.BLUE_TEAM_ROLE);
		player.member.roles.add(process.env.RED_TEAM_ROLE);
	}
};

exports.setTeam = (team, players) => {
	switch (team) {
		case 0:
			this.setBlueTeam(players);
			break;
		case 1:
			this.setRedTeam(players);
			break;
	}
};

exports.getPlayerCount = () => {
	return blueTeam.length + redTeam.length;
};

exports.splitIntoTeams = (players) => {
	//for odd-sized queue, randomly select a team to be the larger team
	var blueSize = Math.random() > 0.5 ? Math.floor(players.length / 2) : Math.ceil(players.length / 2);
	this.setBlueTeam(players.splice(0, blueSize));
	this.setRedTeam(players);
	syncTeams();
};

exports.scramble = () => {
	this.splitIntoTeams(util.shuffle(this.getPlayers()));

	let blueTeam = this.getBlueTeam();
	let redTeam = this.getRedTeam();

	let blueTeamUsernames = blueTeam.map((player) => util.sanitise(player.username)).join(", ");
	let redTeamUsernames = redTeam.map((player) => util.sanitise(player.username)).join(", ");

	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**The teams have been scrambled**\n**Blue Team:** ${blueTeamUsernames}\n**Red Team:** ${redTeamUsernames}`);

	console.log("Teams scrambled");
	console.log(`Blue Team: ${blueTeam.map((player) => player.username).join(", ")}`);
	console.log(`Red Team: ${redTeam.map((player) => player.username).join(", ")}`);
};

exports.getPlayers = () => {
	return blueTeam.concat(redTeam);
};

exports.getTeam = (team) => {
	switch (team) {
		case 0:
			return this.getBlueTeam();
		case 1:
			return this.getRedTeam();
	}
	return [];
};

exports.swapPlayer = (currentMember, newMember) => {
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	let currentName = util.sanitise(currentMember.displayName);
	let newName = util.sanitise(newMember.displayName);

	if (!match.isParticipating(currentMember)) {
		channel.send(`**${currentName}** is not participating in a match`);
		return;
	}

	if (match.isParticipating(newMember)) {
		channel.send(`**${newName}** is already participating in a match`);
		return;
	}

	link.getKAGUsername(newMember, (username) => {
		if (username) {
			let team = this.getTeamNum(currentMember);
			let teamName = this.getTeamName(team);
			let players = this.getTeam(team);

			//swap
			for (let i in players) {
				let player = players[i];
				if (player.member == currentMember) {
					players[i] = { member: newMember, username };
					break;
				}
			}

			//remove team role
			let roles = [process.env.BLUE_TEAM_ROLE, process.env.RED_TEAM_ROLE];
			currentMember.roles.remove(roles[team]);

			//remove from queue
			if (queue.has(newMember)) {
				queue.remove(newMember);
			}

			//update team
			this.setTeam(team, players);
			this.syncUpdatedTeams();

			//announce sub
			channel.send(`**${newName}** has subbed in for **${currentName}** on **${teamName}**`);
			console.log(`${newMember.user.tag}** subbed in for **${currentMember.user.tag} on ${teamName}`);

			//dm user
			currentMember.send("You have been **subbed out** of your Gather match").catch(() => {});
		} else {
			channel.send(`**${newName}** is yet to link their Discord account to their KAG account`);
		}
	});
};

exports.announceTeams = () => {
	let blueTeam = this.getBlueTeam();
	let redTeam = this.getRedTeam();

	let blueTeamMentions = blueTeam.map((player) => player.member.toString()).join(" ");
	let redTeamMentions = redTeam.map((player) => player.member.toString()).join(" ");

	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**A Gather match is about to start!**\n**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`);

	console.log("Teams set");
	console.log(`Blue Team: ${blueTeam.map((player) => player.username).join(", ")}`);
	console.log(`Red Team: ${redTeam.map((player) => player.username).join(", ")}`);

	let players = this.getPlayers();
	for (let player of players) {
		player.member.send(`**Your Gather match is about to start!**\n**Blue Team:** ${blueTeamMentions}\n**Red Team:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`).catch(() => {});
	}
};

exports.syncUpdatedTeams = () => {
	tcprTeams();
	tcpr.socket.write(`getRules().set_bool('gather_teams_updated', true);\n`);
};

function syncTeams() {
	util.updatePresence();
	tcprTeams();
	tcpr.socket.write(`getRules().set_bool('gather_teams_set', true);\n`);
}

function tcprTeams() {
	let blueText = `string[] blue = {${blueTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	blueText += "getRules().set('blue_team', blue);\n";
	tcpr.socket.write(blueText);

	let redText = `string[] red = {${redTeam.map((player) => `'${player.username}'`).join(", ")}}; `;
	redText += "getRules().set('red_team', red);\n";
	tcpr.socket.write(redText);
}
