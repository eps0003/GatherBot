const queue = require("../modules/queue");

module.exports = {
	name: "remove",
	aliases: ["rem"],
	description: "Remove yourself from the queue",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		queue.remove(message.member);
	},
};
