module.exports = {
	name: "help",
	aliases: ["commands"],
	description: "Shows a complete list of commands",
	execute(message, args) {
		const { commands } = message.client;

		let data = [];
		data.push("**Commands:**");
		data = data.concat(commands.filter((cmd) => !cmd.adminOnly).map(formatCommand));
		data.push("**Admin Commands:**");
		data = data.concat(commands.filter((cmd) => cmd.adminOnly).map(formatCommand));

		message.author
			.send(data.join("\n"), { split: true })
			.then(() => {
				if (message.channel.type !== "dm") {
					message.channel.send("Help has been sent to you through DMs");
				}
			})
			.catch(() => {
				message.channel.send("I am unable to send a DM to you. Please change your privacy settings");
			});
	},
};

function formatCommand(cmd) {
	const prefix = process.env.PREFIX;

	let joinedAliases = "";
	if (cmd.aliases && cmd.aliases.length) {
		joinedAliases = "/" + cmd.aliases.join("/");
	}

	let joinedArgs = "";
	if (cmd.args && cmd.args.length) {
		joinedArgs = " " + cmd.args.map((arg) => `[${arg}]`).join(" ");
	}

	return `\`${prefix}${cmd.name}${joinedAliases}${joinedArgs}\` - ${cmd.description}`;
}
