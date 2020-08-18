module.exports = {
	name: "ping",
	description: "Checks if the bot is alive",
	execute(message, args) {
		message.channel.send("Pong!");
	},
};
