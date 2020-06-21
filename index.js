require("log-timestamp")(() => `[${new Date().toTimeString().split(" ")[0]}] %s`);
require("dotenv").config();

const Discord = require("discord.js");
const client = new Discord.Client();
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
	util.updatePresence();

	tcpr.connect();
	queue.clear();
	teams.clear();
});

client.on("presenceUpdate", (oldPresence, newPresence) => {
	if (["idle", "offline"].includes(newPresence.status)) {
		if (queue.has(newPresence.member)) {
			queue.remove(newPresence.member);
			newPresence.member.send(`You have been **removed** from the Gather queue because you went **${newPresence.status}** on Discord`);
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

	if (command === "help") {
		let p = process.env.PREFIX;
		let commands = "**Commands:**\n";
		commands += `\`${p}ping\` - Pong!\n`;
		commands += `\`${p}link\` - Instructions for how to link your Discord account to your KAG account\n`;
		commands += `\`${p}add\` - Add yourself to the queue\n`;
		commands += `\`${p}remove/rem\` - Remove yourself from the queue\n`;
		commands += `\`${p}team\` - States which team you are in\n`;
		commands += `\`${p}teams\` - States the players in each team\n`;
		commands += `\`${p}status/tickets\` - Provides information about the current match\n`;
		commands += `**Admin Commands:**\n`;
		commands += `\`${p}forceadd [Discord user]\` - Force adds a user to the queue\n`;
		commands += `\`${p}forceremove/forcerem [Discord user]\` - Force remove a user from the queue\n`;
		commands += `\`${p}setqueue/queuesize [size]\` - Sets the number of players required to begin a match\n`;
		commands += `\`${p}clearqueue/clear\` - Clears the queue\n`;
		commands += `\`${p}endmatch/end\` - Ends the current match\n`;
		commands += `\`${p}templink [Discord user] [KAG username]\` - Temporarily links a Discord account to a KAG account`;
		message.member.send(commands);
		message.channel.send("Help has been sent to you through DMs");
	} else if (command === "ping") {
		message.channel.send("Pong!");
	} else if (wrongChannel) {
		let channel = client.guilds.cache.get(process.env.GUILD).channels.cache.get(process.env.GATHER_GENERAL);
		message.channel.send(`Please send Gather-related commands in ${channel.toString()}`);
		//commands after this need to be sent in gather general
	} else if (command === "link") {
		link.showLinkInstructions();
	} else if (!tcpr.isConnected()) {
		message.channel.send("The bot is unable to connect to the Gather server right now. Please try again later");
		//commands after this require the gather server to be online
	} else if (command === "add") {
		let status = message.member.presence.status;
		if (match.isParticipating(message.member)) {
			message.channel.send("You cannot add to the queue while participating in a match");
		} else if (["idle", "offline"].includes(status)) {
			message.channel.send(`You cannot add to the queue while you are ${status} on Discord`);
		} else {
			queue.add(message.member);
		}
	} else if (["rem", "remove"].includes(command)) {
		queue.remove(message.member);
	} else if (command === "queue") {
		if (queue.isEmpty()) {
			message.channel.send("The queue is empty");
		} else {
			let players = queue
				.getQueue()
				.map((player) => player.username)
				.join(", ");
			message.channel.send(`**Queue:** ${players}`);
		}
	} else if (command === "team") {
		if (match.isInProgress()) {
			let name = message.member.displayName;
			let team = teams.getTeam(message.member);
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
				.map((player) => player.username)
				.join(", ");
			let redTeam = teams
				.getRedTeam()
				.map((player) => player.username)
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

		link.getKAGUsername(member, (username) => {
			if (username) {
				queue.add(member);
			} else {
				message.channel.send(`**${message.member.displayName}** is yet to link their Discord account to their KAG account`);
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
		queue.remove(member);
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

		queue.clear();
		message.channel.send("Cleared the queue");
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
		let username = args[1];
		let name = message.member.displayName;

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot be linked to an account`);
			return;
		}

		//check if already linked
		link.getKAGUsername(member, (existingUsername) => {
			//already linked
			if (existingUsername) {
				message.channel.send(`**${name}** has already linked their Discord account to **${existingUsername}**`);
				return;
			}

			//check if valid username
			util.XMLHttpRequest((data) => {
				//invalid username
				if (!data || !data.hasOwnProperty("playerInfo")) {
					message.channel.send(`The KAG username **${username}** does not exist`);
					return;
				}

				//update username with correct capitalisation
				username = data.playerInfo.username;

				let cachedMember = link.getCachedMember(username);
				if (cachedMember) {
					message.channel.send(`**${username}** is already linked to the Discord account **${cachedMember.user.tag}**`);
					return;
				}

				//valid username. cache this
				link.cache(member, username);
				message.channel.send(`**${name}** has been temporarily linked to **${username}** for as long as the bot is online`);
			}, `https://api.kag2d.com/v1/player/${username}`);
		});
	} else if (command === "clearcache") {
		if (!isAdmin) {
			message.channel.send("Only an admin can use this command");
			return;
		}

		link.clearCache();
		message.channel.send("The account link cache has been cleared");
	}
});

client.login();
