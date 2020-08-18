const util = require("../modules/utilities");
const link = require("../modules/link");
const fetch = require("node-fetch");

module.exports = {
	name: "templink",
	description: "Temporarily links a KAG account to a Discord account",
	args: ["Discord user", "KAG username"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	async execute(message, args) {
		//invalid user
		if (!util.validateUser(args[0])) {
			message.channel.send("Please specify a valid Discord user");
			return;
		}

		const member = message.mentions.members.first();

		//user not in server
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		let username = args[1];

		//invalid username
		if (!util.validateUsername(username)) {
			message.channel.send("Please specify a valid KAG username");
			return;
		}

		const name = util.sanitise(member.displayName);

		//cannot link to bot
		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot be linked to an account`);
			return;
		}

		//check if valid username
		const data = await fetch(`https://api.kag2d.com/v1/player/${username}`).then((response) => response.json());

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
	},
};
