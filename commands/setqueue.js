const queue = require("../modules/queue");

module.exports = {
	name: "setqueue",
	aliases: ["queuesize", "sq", "qs"],
	description: "Sets the number of players required to begin a match",
	args: ["size"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		let size = args[0];
		if (isNaN(size)) {
			message.channel.send("Please specify a valid queue size");
			return;
		}

		size = Number(size);
		if (Math.round(size) !== size || size < 2) {
			message.channel.send("Please specify a valid queue size");
			return;
		}

		queue.setSize(size);
	},
};
