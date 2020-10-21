const util = require("../modules/utilities");
const link = require("../modules/link");
const stats = require("../modules/stats");

module.exports = {
	name: "stats",
	description: "Check the stats of a player",
	args: ["Discord user"],
	optionalArgs: true,
	gatherGeneral: true,
	guildOnly: true,
	execute(message, args) {
		if (args.length && !util.validateUser(args[0])) {
			message.channel.send("Please specify a valid Discord user or omit the user to view your own stats");
			return;
		}

		const member = args.length ? message.mentions.members.first() : message.member;
		if (!member) {
			message.channel.send("The specified user is not a member of this Discord server");
			return;
		}

		const name = util.sanitise(member.displayName);

		if (member.user.bot) {
			message.channel.send(`**${name}** is a bot and cannot participate in Gather`);
			return;
		}

		link.getKAGUsername(member, (username) => {
			if (!username) {
				message.channel.send(`**${name}** has not participated in a Gather match`);
				return;
			}

			const data = stats.getStats(username);
			if (!data) {
				message.channel.send(`**${util.sanitise(username)}** has not participated in a Gather match`);
				return;
			}

			const formattedWinrate = (data.winrate * 100).toFixed(2);

			let text = `**${util.possessive(name)} stats:**`;
			text += `\nRank #${data.rank}, ${Math.floor(data.score)} score`;
			text += `\n${data.playcount} ${util.plural(data.playcount, "match", "es")}, ${data.wins} wins, ${data.losses} ${util.plural(data.losses, "loss", "es")}, ${formattedWinrate}% winrate`;
			text += `\n${data.kills} ${util.plural(data.kills, "kill")} (best: ${data.maxkills}), ${data.deaths} ${util.plural(data.deaths, "death")} (worst: ${data.maxdeaths}), ${data.kdr.toFixed(2)} KDR (best: ${data.bestkdr.toFixed(2)})`;
			text += `\n${data.substitutions} ${util.plural(data.substitutions, "substitution")}, ${data.desertions} ${util.plural(data.desertions, "desertion")}`;
			message.channel.send(text);
		});
	},
};
