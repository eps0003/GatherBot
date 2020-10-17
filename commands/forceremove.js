const util = require("../modules/utilities");
const queue = require("../modules/queue");

module.exports = {
	name: "forceremove",
	aliases: ["forcerem"],
	description: "Force removes a player from the queue",
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

		if (queue.has(member)) {
			member.send("You have been **removed** from the Gather queue **by an admin**").catch(() => {});
		}

		queue.remove(member, " **by an admin**");
	},
};
