const util = require("../modules/utilities");
const match = require("../modules/match");
const teams = require("../modules/teams");

module.exports = {
	name: "removeplayer",
	aliases: ["remplayer"],
	description: "Removes a player from the current match",
	args: ["Discord user"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		if (!util.validateUser(args[0])) {
			message.channel.send("Please specify a valid Discord user");
			return;
		}

		const member = message.mentions.members.first();
		if (!member) {
			message.channel.send(`The specified user is not a member of this Discord server`);
			return;
		}

		const name = util.sanitise(member.displayName);

		if (!match.isParticipating(member)) {
			message.channel.send(`**${name}** is not participating in a match`);
			return;
		}

		teams.removePlayer(member);
	},
};
