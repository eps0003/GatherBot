const util = require("../modules/utilities");
const queue = require("../modules/queue");
const link = require("../modules/link");

module.exports = {
	name: "forceadd",
	description: "Force adds a player to the queue",
	args: ["Discord user"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		if (!util.validateUser(args[0])) {
			message.channel.send("Please specify a valid Discord user");
			return;
		}

		const member = message.mentions.members.first();
		if (!member) {
			message.channel.send("The specified user is not a member of this Discord server");
			return;
		}

		const name = util.sanitise(member.displayName);

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and **cannot be added** to the queue`);
			return;
		}

		link.getKAGUsername(member, (username) => {
			if (username) {
				queue.add(member, " **by an admin**");
			} else {
				message.channel.send(`**${name}** is **yet to link** their Discord account to their KAG account`);
			}
		});
	},
};
