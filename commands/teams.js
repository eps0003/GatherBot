const util = require("../modules/utilities");
const teams = require("../modules/teams");

module.exports = {
	name: "teams",
	description: "Lists the players in the queue",
	gatherGeneral: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		const blueTeam = util.listUsernames(teams.getBlueTeam());
		const redTeam = util.listUsernames(teams.getRedTeam());
		message.channel.send(`**${this.getTeamName(0)}:** ${blueTeam}\n**${this.getTeamName(1)}:** ${redTeam}`);
	},
};
