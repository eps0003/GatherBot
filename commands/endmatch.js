const match = require("../modules/match");

module.exports = {
	name: "endmatch",
	aliases: ["end"],
	description: "Ends the current match",
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		match.endMatch();
	},
};
