require("log-timestamp")(() => `[${new Date().toTimeString().split(" ")[0]}] %s`);
require("dotenv").config();

const Discord = require("discord.js");
const client = new Discord.Client();
exports.Discord = Discord;
exports.client = client;

const util = require("./modules/utilities.js");
const tcpr = require("./modules/tcpr.js");
const queue = require("./modules/queue.js");
const match = require("./modules/match.js");
const teams = require("./modules/teams.js");
const link = require("./modules/link.js");

client.on("error", console.error);

client.on("ready", () => {
	console.log(`Logged into Discord as ${client.user.username}`);

	tcpr.connect();
	queue.clear();
	teams.clear();
	util.updatePresence();
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
	if (newPresence.status !== "online") {
		if (queue.has(newPresence.member)) {
			let statusName = util.statusNames[newPresence.status];
			queue.remove(newPresence.member, ` because they went **${statusName}** on Discord`);
			newPresence.member.send(`You have been **removed** from the Gather queue because you went **${statusName}** on Discord`).catch(() => {});
		}
	}
});

client.on("message", async (message) => {
	let wrongGuild = message.guild && message.guild.id !== process.env.GUILD;
	let botMessage = message.author.bot;
	let wrongPrefix = message.content.indexOf(process.env.PREFIX) !== 0;
	let wrongChannel = message.channel.id !== process.env.GATHER_GENERAL;
	if (wrongGuild || botMessage || wrongPrefix) {
		return;
	}

	const args = message.content.slice(process.env.PREFIX.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();
	const isAdmin = message.member.roles.cache.has(process.env.ADMIN_ROLE);

	if (["help", "commands"].includes(command)) {
		let p = process.env.PREFIX;
		let commands = "**Commands:**\n";
		commands += `\`${p}link\` - Instructions for how to link your Discord account to your KAG account\n`;
		commands += `\`${p}add\` - Add yourself to the queue\n`;
		commands += `\`${p}remove/rem\` - Remove yourself from the queue\n`;
		commands += `\`${p}queue/list\` - Lists the players in the queue\n`;
		commands += `\`${p}team\` - States which team you are in\n`;
		commands += `\`${p}teams\` - Lists the players in each team\n`;
		commands += `\`${p}status/tickets\` - Provides information about the current match\n`;
		commands += `**Admin Commands:**\n`;
		commands += `\`${p}ping\` - Checks if the bot is alive\n`;
		commands += `\`${p}forceadd [Discord user]\` - Force adds a player to the queue\n`;
		commands += `\`${p}forceremove/forcerem [Discord user]\` - Force removes a player from the queue\n`;
		commands += `\`${p}addblue/addred [Discord user]\` - Adds a player to a team\n`;
		commands += `\`${p}removeplayer/remplayer [Discord user]\` - Removes a player from the current match\n`;
		commands += `\`${p}sub/swap [Current user] [New user]\` - Subs a non-participating player in place of a participating player\n`;
		commands += `\`${p}setqueue/queuesize [size]\` - Sets the number of players required to begin a match\n`;
		commands += `\`${p}clearqueue/clear\` - Clears the queue\n`;
		commands += `\`${p}endmatch/end\` - Ends the current match\n`;
		commands += `\`${p}templink [Discord user] [KAG username]\` - Temporarily links a Discord account to a KAG account\n`;
		commands += `\`${p}clearcache\` - Clears the cache of linked accounts\n`;
		commands += `\`${p}islinked [Discord user/KAG username]\` - Checks whether a Discord user or KAG username is linked to an account`;
		message.member.send(commands);
		message.channel.send("Help has been sent to you through DMs");
	} else if (command === "ping" && isAdmin) {
		message.channel.send("Pong!");
	} else if (wrongChannel) {
		//commands after this need to be sent in gather general
	} else if (command === "link") {
		link.showLinkInstructions();
	} else if (command === "templink") {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (args.length !== 2 || !args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user] [KAG username]\``);
			return;
		}

		let member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		let username = args[1];
		let name = util.sanitise(member.displayName);

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot be linked to an account`);
			return;
		}

		//check if valid username
		util.XMLHttpRequest((data) => {
			//invalid username
			if (!data || !data.hasOwnProperty("playerInfo")) {
				message.channel.send(`The KAG username **${util.sanitise(username)}** does not exist`);
				return;
			}

			//update username with correct capitalisation
			username = data.playerInfo.username;

			//valid username. cache this
			link.cache(member, username);
			message.channel.send(`**${name}** has been temporarily linked to **${util.sanitise(username)}** for as long as the bot is online`);
		}, `https://api.kag2d.com/v1/player/${username}`);
	} else if (command === "clearcache") {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		link.clearCache();
		message.channel.send("The account link cache has been cleared");
	} else if (["islinked", "checklink"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (args.length !== 1) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user/KAG username]\``);
			return;
		}

		if (args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			//discord user mentioned

			let member = message.mentions.members.first();
			if (!member) {
				message.channel.send(`The specified user is not a member of this Discord server`);
				return;
			}

			let name = util.sanitise(member.displayName);

			if (member.user.bot) {
				message.channel.send(`**${name}** is a bot and cannot be linked to an account`);
				return;
			}

			link.getKAGUsername(member, (username) => {
				if (username) {
					message.channel.send(`**${name}** is linked to **${util.sanitise(username)}**`);
				} else {
					message.channel.send(`**${name}** is not linked to a KAG account`);
				}
			});
		} else {
			//kag username specified

			let username = args[0];
			link.getDiscordID(username, (correctUsername, id) => {
				if (!correctUsername) {
					message.channel.send(`**${util.sanitise(username)}** is not a valid KAG username`);
					return;
				}

				if (id != 0) {
					message.channel.send(`**${util.sanitise(correctUsername)}** is linked to **<@${id}>**`);
				} else {
					message.channel.send(`**${util.sanitise(correctUsername)}** is not linked to a Discord account`);
				}
			});
		}
	} else if (!tcpr.isConnected()) {
		message.channel.send("The bot is unable to connect to the Gather server right now. Please try again later");
		//commands after this require the gather server to be online
	} else if (command === "add") {
		let status = message.member.presence.status;
		if (match.isParticipating(message.member)) {
			message.channel.send("You **cannot add** to the queue while **participating** in a match");
		} else if (status !== "online") {
			let statusName = util.statusNames[status];
			message.channel.send(`You **cannot add** to the queue while you are **${statusName}** on Discord`);
		} else {
			queue.add(message.member);
		}
	} else if (["rem", "remove"].includes(command)) {
		queue.remove(message.member);
	} else if (["queue", "list"].includes(command)) {
		if (queue.isEmpty()) {
			message.channel.send("The queue is **empty**");
		} else {
			let players = queue
				.getQueue()
				.map((player) => util.sanitise(player.username))
				.join(", ");
			message.channel.send(`**Queue:** ${players}`);
		}
	} else if (command === "team") {
		if (match.isInProgress()) {
			let name = util.sanitise(message.member.displayName);
			let team = teams.getTeamNum(message.member);
			switch (team) {
				case 0:
					message.channel.send(`**${name}** is on **Blue Team**`);
					break;
				case 1:
					message.channel.send(`**${name}** is on **Red Team**`);
					break;
				default:
					message.channel.send(`**${name}** is **not participating** in this match`);
			}
		} else {
			message.channel.send(`There is no match in progress`);
		}
	} else if (command === "teams") {
		if (match.isInProgress()) {
			let blueTeam = teams
				.getBlueTeam()
				.map((player) => util.sanitise(player.username))
				.join(", ");
			let redTeam = teams
				.getRedTeam()
				.map((player) => util.sanitise(player.username))
				.join(", ");
			message.channel.send(`**Blue Team:** ${blueTeam}\n**Red Team:** ${redTeam}`);
		} else {
			message.channel.send("There is no match in progress");
		}
	} else if (["tickets", "status"].includes(command)) {
		if (match.isInProgress()) {
			if (!match.isLive()) {
				message.channel.send("Waiting for players to ready");
			} else {
				tcpr.socket.write("getRules().set_bool('gather_status', true);\n");
			}
		} else {
			message.channel.send("There is no match in progress");
		}
	} else if (command === "forceadd") {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (args.length !== 1 || !args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user]\``);
			return;
		}

		let member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		link.getKAGUsername(member, (username) => {
			if (username) {
				queue.add(member, " **by an admin**");
			} else {
				let name = util.sanitise(message.member.displayName);
				message.channel.send(`**${name}** is yet to link their Discord account to their KAG account`);
			}
		});
	} else if (["forcerem", "forceremove"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (args.length !== 1 || !args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user]\``);
			return;
		}

		let member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		if (queue.has(member)) {
			member.send("You have been **removed** from the Gather queue **by an admin**").catch(() => {});
		}

		queue.remove(member, " **by an admin**");
	} else if (["setqueue", "queuesize"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (args.length !== 1) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [size]\``);
			return;
		}

		let size = args[0];
		if (isNaN(size)) {
			message.channel.send("Please specify valid queue size");
			return;
		}

		size = Number(size);
		if (Math.round(size) !== size || size < 2) {
			message.channel.send("Please specify valid queue size");
			return;
		}

		queue.setSize(size);
	} else if (["clear", "clearqueue"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		let players = queue.getQueue();
		for (let player of players) {
			player.member.send("You have been **removed** from the Gather queue because the queue was cleared **by an admin**").catch(() => {});
		}

		queue.clear();
		message.channel.send("Cleared the queue");
		console.log("Queue cleared");
	} else if (["end", "endmatch"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (match.isInProgress()) {
			match.endMatch();
		} else {
			message.channel.send("There is no match in progress");
		}
	} else if (["swap", "sub"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		if (!match.isInProgress()) {
			message.channel.send("There is no match in progress");
			return;
		}

		if (args.length !== 2 || !args[0].match(Discord.MessageMentions.USERS_PATTERN) || !args[1].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Current user] [New user]\``);
			return;
		}

		let members = message.mentions.members.first(2);
		let member1 = members[0];
		let member2 = members[1];
		if (!member1 || !member2) {
			message.channel.send(`A specified user is not a member of this Discord server`);
			return;
		}

		teams.swapPlayer(member1, member2);
	} else if (["addblue", "addred"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can add a player to a team");
			return;
		}

		if (!match.isInProgress()) {
			message.channel.send("There is no match in progress");
			return;
		}

		if (args.length !== 1 || !args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user]\``);
			return;
		}

		let member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		let name = util.sanitise(member.displayName);

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot be added to a team`);
			return;
		}

		if (match.isParticipating(member)) {
			message.channel.send(`**${name}** is already participating in a match`);
			return;
		}

		link.getKAGUsername(member, (username) => {
			if (username) {
				let team = ["addblue", "addred"].indexOf(command);
				let teamName = teams.getTeamName(team);

				let players = teams.getTeam(team);
				players.push({ member, username });

				teams.setTeam(team, players);
				teams.syncUpdatedTeams();

				message.channel.send(`**${name}** has been **added** to **${teamName}**`);
				console.log(`Added ${username} (${member.user.tag}) to ${teamName}`);
			} else {
				message.channel.send(`**${name}** is yet to link their Discord account to their KAG account`);
			}
		});
	} else if (["remplayer", "removeplayer"].includes(command)) {
		if (!isAdmin) {
			message.channel.send("Only an admin can remove a player from a team");
			return;
		}

		if (!match.isInProgress()) {
			message.channel.send("There is no match in progress");
			return;
		}

		if (args.length !== 1 || !args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
			message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${command} [Discord user]\``);
			return;
		}

		let member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		let name = util.sanitise(member.displayName);

		if (!match.isParticipating(member)) {
			message.channel.send(`**${name}** is not participating in a match`);
			return;
		}

		let team = teams.getTeamNum(member);
		let teamName = teams.getTeamName(team);
		let players = teams.getTeam(team);

		//remove player
		for (let i in players) {
			let player = players[i];
			if (player.member == member) {
				players.splice(i, 1);
				console.log(`Removed ${player.username} (${member.user.tag}) from ${teamName}`);
				break;
			}
		}

		teams.setTeam(team, players);
		message.channel.send(`**${name}** has been **removed** from **${teamName}**`);

		if (match.isInProgress()) {
			//still enough players for a match. update teams
			teams.syncUpdatedTeams();

			//remove team role from player
			member.roles.remove(process.env.BLUE_TEAM_ROLE);
			member.roles.remove(process.env.RED_TEAM_ROLE);
		} else {
			//removed last player. end match
			match.endMatch();
		}
	}
});

client.login();
