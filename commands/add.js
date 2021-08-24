const util = require("../modules/utilities");
const match = require("../modules/match");
const queue = require("../modules/queue");

module.exports = {
	name: "add",
	description: "Add yourself to the queue",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	execute(message, args) {
		const status = message.member.presence?.status || "offline";
		if (match.isParticipating(message.member)) {
			message.channel.send("You **cannot add** to the queue while **participating** in a match");
		} else if (!util.canQueueWithStatus(status)) {
			const statusName = util.statusNames[status];
			message.channel.send(`You **cannot add** to the queue while you are **${statusName}** on Discord`);
		} else {
			queue.add(message.member);
		}
	},
};
