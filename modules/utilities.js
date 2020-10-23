const { Discord, client } = require("../index");
const queue = require("./queue");
const match = require("./match");

exports.statusNames = Object.freeze({
	online: "online",
	idle: "idle",
	dnd: "do not disturb",
	offline: "offline",
});

exports.stateNames = ["Intermission", "Build Time", "In Progress", "Game Over"];

exports.plural = (val, text, suffix = "s", trim = 0) => {
	if (val === 1) {
		return text;
	} else {
		if (trim) text = text.slice(0, -trim);
		return text + suffix;
	}
};

exports.possessive = (text) => {
	return text + (text.endsWith("s") ? "'" : "'s");
};

exports.clearRole = (role) => {
	client.guilds.cache
		.get(process.env.GUILD)
		.roles.cache.get(role)
		.members.forEach((member) => member.roles.remove(role));
};

exports.updatePresence = () => {
	if (match.isInProgress()) {
		client.user.setActivity(`a match | ${process.env.PREFIX}help`, { type: "WATCHING" });
	} else {
		client.user.setActivity(`${queue.getPlayerCount()}/${queue.getSize()} in queue | ${process.env.PREFIX}help`, { type: "WATCHING" });
	}
};

exports.sanitise = (text) => {
	text = Discord.Util.escapeMarkdown(text);
	text = Discord.Util.removeMentions(text);
	return text;
};

//https://stackoverflow.com/a/2450976
exports.shuffle = (array) => {
	var currentIndex = array.length,
		temporaryValue,
		randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

exports.validateUsername = (username) => {
	return username.match(/^[a-z\d_-]{2,20}$/gi);
};

exports.validateUser = (user) => {
	return user.match(Discord.MessageMentions.USERS_PATTERN);
};

exports.listUsernames = (players, sanitise = true) => {
	return players.map((player) => (sanitise ? this.sanitise(player.username) : player.username)).join(", ");
};

exports.listUserMentions = (players) => {
	return players.map((player) => player.member.toString()).join(" ");
};

exports.canQueueWithStatus = (status) => {
	return !["idle", "offline"].includes(status);
};
