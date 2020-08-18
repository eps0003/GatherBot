const link = require("../modules/link");

module.exports = {
	name: "clearcache",
	description: "Clears the cache of linked accounts",
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	execute(message, args) {
		link.clearCache();
		message.channel.send("The account link cache has been cleared");
	},
};
