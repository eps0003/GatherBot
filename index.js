require("log-timestamp")(() => `[${new Date().toTimeString().split(" ")[0]}] %s`);
require("dotenv").config();

const fs = require("fs");
const Discord = require("discord.js");
const { Client, Collection, Intents } = Discord;

const client = new Client({
	intents: [
		//
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_PRESENCES,
	],
});

client.commands = new Collection();

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
	if (!util.canQueueWithStatus(newPresence.status) && queue.has(newPresence.member)) {
		const statusName = util.statusNames[newPresence.status];
		queue.remove(newPresence.member, ` because they went **${statusName}** on Discord`);
		newPresence.member.send(`You have been **removed** from the Gather queue because you went **${statusName}** on Discord`).catch(() => {});
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

client.on("messageCreate", async (message) => {
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
	if (command.guildOnly && (message.channel.type === "DM" || message.channel.type === "GROUP_DM")) return;

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
	if (command.args && args.length < command.args.length && !command.optionalArgs) {
		const joinedArgs = command.args.map((arg) => `[${arg}]`).join(" ");
		message.channel.send(`Invalid command usage: \`${process.env.PREFIX}${commandName} ${joinedArgs}\``);
		return;
	}

	command.execute(message, args);
});

client.login();
