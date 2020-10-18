const util = require("../modules/utilities");
const link = require("../modules/link");
const stats = require("../modules/stats");

module.exports = {
	name: "stats",
	description: "Check the stats of a player",
	args: ["Discord user/KAG username"],
	gatherGeneral: true,
	guildOnly: true,
	execute(message, args) {
		if (util.validateUser(args[0])) {
			//discord user mentioned

			const member = message.mentions.members.first();
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
				if (username) {
					displayStats(message, username);
				} else {
					message.channel.send(`**${name}** has not participated in a Gather match`);
				}
			});
		} else if (util.validateUsername(args[0])) {
			//kag username specified
			displayStats(message, args[0]);
		} else {
			//invalid argument
			message.channel.send("Please specify a valid Discord user or KAG username");
		}
	},
};

function displayStats(message, username) {
	const data = stats.getStats(username);
	if (!data) {
		message.channel.send(`**${util.sanitise(username)}** has not participated in a Gather match`);
	} else {
		const formattedWinrate = Math.floor(data.winrate * 100).toFixed(2);

		let text = `**${util.sanitise(data.username)}'s stats:**`;
		text += `\n${data.playcount} ${util.plural(data.playcount, "match", "es")}, ${data.wins} wins, ${data.losses} ${util.plural(data.losses, "loss", "es")}, ${formattedWinrate}% winrate`;
		text += `\n${data.kills} ${util.plural(data.kills, "kill")} (best: ${data.maxkills}), ${data.deaths} ${util.plural(data.deaths, "death")} (worst: ${data.maxdeaths}), ${data.kdr.toFixed(2)} KDR (best: ${data.bestkdr.toFixed(2)})`;
		message.channel.send(text);
	}
}
