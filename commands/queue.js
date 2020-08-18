const util = require("../modules/utilities");
const queue = require("../modules/queue");

module.exports = {
	name: "queue",
	aliases: ["list"],
	description: "Lists the players in the queue",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		if (queue.isEmpty()) {
			message.channel.send("The queue is **empty**");
		} else {
			const players = util.listUsernames(queue.getQueue());
			message.channel.send(`**Queue:** ${players}`);
		}
	},
};
