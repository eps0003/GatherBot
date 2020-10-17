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

		if (team > -1)
		{
			const teamName = teams.getTeamName(team);
			message.channel.send(`**${name}** is on **${teamName}**`);
		}
		else
		{
			message.channel.send(`**${name}** is **not participating** in this match`);
		}
	},
};
