require("log-timestamp")(() => `[${new Date().toTimeString().split(" ")[0]}] %s`);
require("dotenv").config();

const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();
client.commands = new Discord.Collection();
exports.Discord = Discord;
exports.client = client;

const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const util = require("./modules/utilities");
const tcpr = require("./modules/tcpr");
const queue = require("./modules/queue");
const match = require("./modules/match");
const teams = require("./modules/teams");

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
			const statusName = util.statusNames[newPresence.status];
			queue.remove(newPresence.member, ` because they went **${statusName}** on Discord`);
			newPresence.member.send(`You have been **removed** from the Gather queue because you went **${statusName}** on Discord`).catch(() => {});
		}
	}
});

client.on("guildMemberRemove", (member) => {
	if (queue.has(member)) {
		queue.remove(member, " because they **left the Discord**");
	}

	if (match.isParticipating(member)) {
		teams.removePlayer(member, " because they **left the Discord**");
	}
});

client.on("message", async (message) => {
	const wrongGuild = message.guild && message.guild.id !== process.env.GUILD;
	const botMessage = message.author.bot;
	const wrongPrefix = !message.content.startsWith(process.env.PREFIX);
	if (wrongGuild || botMessage || wrongPrefix) {
		return;
	}

	const args = message.content.slice(process.env.PREFIX.length).trim().split(/\s+/g);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName) || client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

	//nonexistent command
	if (!command) return;

	//guild only command
	if (command.guildOnly && message.channel.type === "dm") return;

	//not sent in #gather-general
	//some commands can be sent in either #gather-general or through dm
	if (command.gatherGeneral && message.channel.id !== process.env.GATHER_GENERAL && message.channel.type !== "dm") return;

	//tcpr not connected
	if (command.tcprConnected && !tcpr.isConnected()) {
		message.channel.send("The bot is unable to connect to the Gather server right now. Please try again later");
		return;
	}

	//not admin for admin command
	if (command.adminOnly && !message.member.roles.cache.has(process.env.ADMIN_ROLE)) {
		message.channel.send("Only an admin can use this command");
		return;
	}

	//match not in progress
	if (command.matchInProgress && !match.isInProgress()) {
		message.channel.send("There is no match in progress");
		return;
	}

	//not enough args
	if (command.args && args.length < command.args.length) {
		const joinedArgs = command.args.map((arg) => `[${arg}]`).join(" ");
		message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${commandName} ${joinedArgs}\``);
		return;
	}

	command.execute(message, args);
});

client.login();
