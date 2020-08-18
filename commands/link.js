const link = require("../modules/link");

module.exports = {
	name: "link",
	description: "Instructions for how to link your Discord account to your KAG account",
	gatherGeneral: true,
	execute(message, args) {
		link.showLinkInstructions(message.channel);
	},
};
