const { client } = require("../index");
const link = require("./link");
const match = require("./match");
const teams = require("./teams");
const util = require("./utilities");

var queue = [];
var size = process.env.QUEUE_SIZE;

exports.add = (member, reason = "") => {
	const name = util.sanitise(member.displayName);
	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	link.getKAGUsername(member, (username) => {
		if (username) {
			if (!this.has(member)) {
				queue.push({ member, username });
				member.roles.add(process.env.QUEUE_ROLE);

				channel.send(`**${name}** has been **added** to the queue${reason} **(${queue.length}/${this.getSize()})**`);
				console.log(`Added ${username} (${member.user.tag}) to the queue (${queue.length}/${this.getSize()})`);

				util.updatePresence();
				this.checkQueueFull();
			} else {
				channel.send(`**${name}** is already in the queue`);
			}
		} else {
			link.showLinkInstructions(channel);
		}
	});
};

exports.remove = (member, reason = "") => {
	const name = util.sanitise(member.displayName);
	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	for (const i in queue) {
		const player = queue[i];

		if (player.member === member) {
			queue.splice(i, 1);

			member.roles.remove(process.env.QUEUE_ROLE);
			util.updatePresence();

			channel.send(`**${name}** has been **removed** from the queue${reason} **(${queue.length}/${this.getSize()})**`);
			console.log(`Removed ${player.username} (${member.user.tag}) from the queue (${queue.length}/${this.getSize()})`);

			return;
		}
	}

	channel.send(`**${name}** is already not in the queue`);
};

exports.clear = () => {
	queue = [];

	util.clearRole(process.env.QUEUE_ROLE);
	util.updatePresence();
};

exports.getPlayerCount = () => {
	return queue.length;
};

exports.has = (member) => {
	return queue.some((player) => player.member === member);
};

exports.getSize = () => {
	return size;
};

exports.setSize = (newSize) => {
	size = newSize;

	const channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`The queue has been changed to a size of **${size} ${util.plural(size, "player")}**`);
	console.log(`Set queue size to ${size} ${util.plural(size, "player")}`);

	util.updatePresence();
	this.checkQueueFull();
};

exports.isFull = () => {
	return queue.length >= this.getSize();
};

exports.isEmpty = () => {
	return queue.length === 0;
};

exports.getQueue = () => {
	return queue;
};

exports.checkQueueFull = () => {
	if (this.isFull() && !match.isInProgress()) {
		const players = util.shuffle(queue.splice(0, this.getSize()));

		// remove queue role from players
		for (const player of players) {
			player.member.roles.remove(process.env.QUEUE_ROLE);
		}

		util.updatePresence();
		teams.splitIntoTeams(players);
		teams.announceTeams();
	}
};
