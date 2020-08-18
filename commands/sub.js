const util = require("../modules/utilities");
const teams = require("../modules/teams");

module.exports = {
	name: "sub",
	aliases: ["swap"],
	description: "Subs a non-participating player in place of a participating player",
	args: ["current user", "new user"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		if (!util.validateUser(args[0]) || !util.validateUser(args[1])) {
			message.channel.send("Please specify two valid Discord users");
			return;
		}

		if (args[0] === args[1]) {
			message.channel.send("Please specify two different Discord users");
			return;
		}

		const members = message.mentions.members.first(2);
		const member1 = members[0];
		const member2 = members[1];
		if (!member1 || !member2) {
			message.channel.send("A specified user is not a member of this Discord server");
			return;
		}

		teams.swapPlayer(member1, member2);
	},
};
