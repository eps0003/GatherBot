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

	tcpr.socket.on("connect", () => {
		let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
		channel.send("**The bot has successfully established a connection with the Gather server and is ready for use**");
	});

	tcpr.socket.on("data", (data) => {
		data = data.toString();

		const prefix = "<gather>";
		if (data.indexOf(prefix) !== 0) {
			return;
		}

		const args = data.slice(prefix.length).trim().split(/\s+/g);
		const command = args.shift().toLowerCase();

		if (command === "started") {
			match.matchStarted();
		} else if (command === "ended") {
			var winner = Number(args[0]);
			match.matchEnded(winner);
		} else if (command === "scramble") {
			teams.scramble();
		} else if (command === "status") {
			var blueTickets = Number(args[0]);
			var redTickets = Number(args[1]);

			let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
			channel.send(`**Blue Tickets:** ${blueTickets}\n**Red Tickets:** ${redTickets}`);
		}
	});
	tcpr.socket.on("end", () => {
		let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
		channel.send("**The Gather server just went down and, as a result, the bot will no longer be accepting some Gather-related commands. The bot will automatically attempt to re-establish a connection with the server**");

		//begin attempts at reconnecting
		tcpr.connect();
		queue.clear();
	});
});

client.on("message", async (message) => {
	let wrongGuild = message.guild && message.guild.id !== process.env.GUILD;
	let wrongChannel = message.channel.id !== process.env.GATHER_GENERAL;
	let botMessage = message.author.bot;
	let wrongPrefix = message.content.indexOf(process.env.PREFIX) !== 0;
	if (wrongGuild || wrongChannel || botMessage || wrongPrefix) {
		return;
	}

	const args = message.content.slice(process.env.PREFIX.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();
	const isAdmin = message.member.roles.cache.has(process.env.ADMIN_ROLE);

	if (command === "help") {
		let p = process.env.PREFIX;
		let commands = "**Commands:**";
		commands += `\`${p}ping\` - Pong!\n`;
		commands += `\`${p}link\` - Instructions for how to link your Discord account to your KAG account\n`;
		commands += `\`${p}add\` - Add yourself to the queue\n`;
		commands += `\`${p}remove/rem\` - Remove yourself from the queue\n`;
		commands += `\`${p}team\` - States which team you are in\n`;
		commands += `\`${p}teams\` - States the players in each team\n`;
		commands += `\`${p}status/tickets\` - Provides information about the current match\n`;
		commands += `**Admin Commands:\n`;
		commands += `\`${p}forceremove/forcerem\` - Force remove a user from the queue (admin only)\n`;
		commands += `\`${p}setqueue/queuesize\` - Sets the number of players required to begin a match (admin only)\n`;
		commands += `\`${p}clearqueue/clear\` - Clears the queue (admin only)\n`;
		commands += `\`${p}endmatch/end\` - Ends the match (admin only)`;
		message.member.send(commands);
	} else if (command === "ping") {
		message.channel.send("Pong!");
	} else if (command === "link") {
		link.showLinkInstructions();
	} else if (!tcpr.isConnected()) {
		message.channel.send("The bot is unable to connect to the Gather server right now. Please try again later");
	} else if (command === "add") {
		if (match.isParticipating(message.member)) {
			message.channel.send("You cannot add to the queue while participating in a match");
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
			let name = message.member.nickname || message.author.username;
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
	} else if (isAdmin) {
		//admin commands
		if (["forcerem", "forceremove"].includes(command)) {
			let member = message.mentions.members.first();

			if (args.length < 1 || !member) {
				message.channel.send("Please mention a user to remove from the queue");
				return;
			}

			queue.remove(member);
		} else if (["setqueue", "queuesize"].includes(command)) {
			if (args.length < 1) {
				message.channel.send("Please specify a queue size");
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
			queue.clear();
			message.channel.send("Cleared the queue");
		} else if (["end", "endmatch"].includes(command)) {
			if (match.isInProgress()) {
				match.endMatch();
			} else {
				message.channel.send("There is no match in progress");
			}
		}
	}
});

client.login();
