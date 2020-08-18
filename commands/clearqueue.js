const queue = require("../modules/queue");

module.exports = {
	name: "clearqueue",
	aliases: ["clear"],
	description: "Clears the queue",
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		const players = queue.getQueue();
		for (const player of players) {
			player.member.send("You have been **removed** from the Gather queue because it was cleared **by an admin**").catch(() => {});
		}

		queue.clear();
		message.channel.send("Cleared the queue");
		console.log("Queue cleared");
	},
};
