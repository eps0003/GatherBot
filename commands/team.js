const util = require("../modules/utilities");
const teams = require("../modules/teams");

module.exports = {
	name: "team",
	description: "States which team you are in",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		const name = util.sanitise(message.member.displayName);
		const team = teams.getTeamNum(message.member);
		switch (team) {
			case 0:
				message.channel.send(`**${name}** is on **Blue Team**`);
				break;
			case 1:
				message.channel.send(`**${name}** is on **Red Team**`);
				break;
			default:
				message.channel.send(`**${name}** is **not participating** in this match`);
		}
	},
};
