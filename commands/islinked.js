const util = require("../modules/utilities");
const link = require("../modules/link");

module.exports = {
	name: "islinked",
	aliases: ["checklink"],
	description: "Checks whether a Discord user or KAG username is linked to an account",
	args: ["Discord user/KAG username"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	execute(message, args) {
		if (util.validateUser(args[0])) {
			//discord user mentioned

			const member = message.mentions.members.first();
			if (!member) {
				message.channel.send("The specified user is not a member of this Discord server");
				return;
			}

			const name = util.sanitise(member.displayName);

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
		} else if (util.validateUsername(args[0])) {
			//kag username specified

			const username = args[0];
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
		} else {
			//invalid argument
			message.channel.send("Please specify a valid Discord user or KAG username");
		}
	},
};
