const match = require("../modules/match");
const tcpr = require("../modules/tcpr");

module.exports = {
	name: "status",
	aliases: ["tickets"],
	description: "Provides information about the current match",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		if (!match.isLive()) {
			message.channel.send("Waiting for players to ready");
		} else {
			tcpr.socket.write("getRules().set_bool('gather_status', true);\n");
		}
	},
};
