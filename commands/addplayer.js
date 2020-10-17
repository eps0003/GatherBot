const util = require("../modules/utilities");
const queue = require("../modules/queue");
const link = require("../modules/link");
const match = require("../modules/match");
const teams = require("../modules/teams");

const teamsArray = ["blue", "red", "random"];

module.exports = {
	name: "addplayer",
	description: "Adds a player to a team",
	args: [`team: ${teamsArray.join("/")}`, "Discord user"],
	gatherGeneral: true,
	adminOnly: true,
	guildOnly: true,
	tcprConnected: true,
	matchInProgress: true,
	execute(message, args) {
		const team = args[0].toLowerCase();
		if (!teamsArray.includes(team)) {
			message.channel.send(`Please specify a valid team (${teamsArray.join("/")})`);
			return;
		}

		if (!util.validateUser(args[1])) {
			message.channel.send("Please specify a valid Discord user");
			return;
		}

		const member = message.mentions.members.first();
		if (!member) {
			message.channel.send("The specified user is not a member of this Discord server");
			return;
		}

		const name = util.sanitise(member.displayName);

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot be added to a team`);
			return;
		}

		if (match.isParticipating(member)) {
			message.channel.send(`**${name}** is already participating in a match`);
			return;
		}

		link.getKAGUsername(member, (username) => {
			if (!username) {
				message.channel.send(`**${name}** is yet to link their Discord account to their KAG account`);
				return;
			}

			//get team
			const index = team === "random" ? Math.floor(Math.random() * 2) : teamsArray.indexOf(team);
			const teamName = teams.getTeamName(index);

			//add to team
			const players = teams.getTeam(index);
			players.push({ member, username });

			//apply teams
			teams.setTeam(team, players);
			teams.syncUpdatedTeams();

			//remove from queue
			if (queue.has(member)) {
				queue.remove(member);
			}

			//announce
			message.channel.send(`**${name}** has been **added** to **${teamName}**`);
			console.log(`Added ${username} (${member.user.tag}) to ${teamName}`);
		});
	},
};
