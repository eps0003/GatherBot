const { client } = require("../index");
const tcpr = require("./tcpr");
const util = require("./utilities");
const match = require("./match");
const link = require("./link");
const queue = require("./queue");
const subs = require("./substitutions");

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

exports.getShortTeamName = (team) => {
	switch (team) {
		case 0:
			return "Blue";
		case 1:
			return "Red";
	}
	return "Spec";
};

exports.getTeamNum = (any) => {
	if (blueTeam.some((player) => player.member === any || player.username === any)) {
		return 0;
	}

	if (redTeam.some((player) => player.member === any || player.username === any)) {
		return 1;
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

	for (const player of players) {
		player.member.roles.remove(process.env.RED_TEAM_ROLE);
		player.member.roles.add(process.env.BLUE_TEAM_ROLE);
	}
};

exports.setRedTeam = (players) => {
	redTeam = players;

	for (const player of players) {
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
	const blueSize = Math.random() > 0.5 ? Math.floor(players.length / 2) : Math.ceil(players.length / 2);
	this.setBlueTeam(players.splice(0, blueSize));
	this.setRedTeam(players);
	syncTeams();
};

exports.scramble = () => {
	this.splitIntoTeams(util.shuffle(this.getPlayers()));

	const blueTeam = this.getBlueTeam();
	const redTeam = this.getRedTeam();

	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**The teams have been scrambled**\n**${this.getTeamName(0)}:** ${util.listUsernames(blueTeam)}\n**${this.getTeamName(1)}:** ${util.listUsernames(redTeam)}`);

	console.log("Teams scrambled");
	console.log(`${this.getTeamName(0)}: ${util.listUsernames(blueTeam, false)}`);
	console.log(`${this.getTeamName(1)}: ${util.listUsernames(redTeam, false)}`);
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
	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	const currentName = util.sanitise(currentMember.displayName);
	const newName = util.sanitise(newMember.displayName);

	if (!match.isParticipating(currentMember)) {
		channel.send(`**${currentName}** is not participating in a match`);
		return;
	}

	if (match.isParticipating(newMember)) {
		channel.send(`**${newName}** is already participating in a match`);
		return;
	}

	link.getKAGUsername(newMember, (newUsername) => {
		if (!newUsername) {
			channel.send(`**${newName}** is yet to link their Discord account to their KAG account`);
			return;
		}

		const team = this.getTeamNum(currentMember);
		const teamName = this.getTeamName(team);
		const players = this.getTeam(team);

		//swap
		for (const i in players) {
			const player = players[i];
			if (player.member === currentMember) {
				players[i] = { member: newMember, username: newUsername };
				break;
			}
		}

		//remove team role
		const roles = [process.env.BLUE_TEAM_ROLE, process.env.RED_TEAM_ROLE];
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
		console.log(`${newMember.user.tag} subbed in for ${currentMember.user.tag} on ${teamName}`);

		//dm user
		currentMember.send("You have been **subbed out** of your Gather match").catch(() => {});

		//manage substitution/desertion
		link.getKAGUsername(currentMember, (currentUsername) => {
			subs.addSubstitution(newUsername, team);
			subs.addDesertion(currentUsername, team);
		});
	});
};

exports.removePlayer = (member, reason = "") => {
	const name = util.sanitise(member.displayName);
	const team = this.getTeamNum(member);
	const teamName = this.getTeamName(team);
	const players = this.getTeam(team);

	let removedPlayer = false;

	//remove player
	for (const i in players) {
		const player = players[i];
		if (player.member === member) {
			players.splice(i, 1);
			removedPlayer = true;
			console.log(`Removed ${player.username} (${member.user.tag}) from ${teamName}${reason}`);
			break;
		}
	}

	if (removedPlayer) {
		//apply updated team
		this.setTeam(team, players);

		//announce removed player
		const channel = client.channels.cache.get(process.env.GATHER_GENERAL);
		channel.send(`**${name}** has been **removed** from **${teamName}**${reason}`);

		if (match.isInProgress()) {
			//still enough players for a match. update teams
			this.syncUpdatedTeams();

			//remove team role from player
			member.roles.remove(process.env.BLUE_TEAM_ROLE);
			member.roles.remove(process.env.RED_TEAM_ROLE);
		} else {
			//removed last player. end match
			match.endMatch();
		}
	}
};

exports.announceTeams = () => {
	const blueTeam = this.getBlueTeam();
	const redTeam = this.getRedTeam();

	const blueTeamMentions = util.listUserMentions(blueTeam);
	const redTeamMentions = util.listUserMentions(redTeam);

	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`**A Gather match is about to start!**\n**${this.getTeamName(0)}:** ${blueTeamMentions}\n**${this.getTeamName(1)}:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`);

	console.log("Teams set");
	console.log(`${this.getTeamName(0)}: ${util.listUsernames(blueTeam, false)}`);
	console.log(`${this.getTeamName(1)}: ${util.listUsernames(redTeam, false)}`);

	const players = this.getPlayers();
	for (const player of players) {
		player.member.send(`**Your Gather match is about to start!**\n**${this.getTeamName(0)}:** ${blueTeamMentions}\n**${this.getTeamName(1)}:** ${redTeamMentions}\n**Address:** <kag://${tcpr.getAddress()}/>`).catch(() => {});
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
