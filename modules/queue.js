const { client } = require("../index.js");
const link = require("./link.js");
const match = require("./match.js");
const teams = require("./teams.js");
const util = require("./utilities.js");

var queue = [];
var size = process.env.QUEUE_SIZE;

exports.add = (member) => {
	let name = member.displayName;
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	link.getKAGUsername(member, (username) => {
		if (username) {
			if (!this.has(member)) {
				queue.push({ member, username });
				member.roles.add(process.env.QUEUE_ROLE);

				channel.send(`**${name}** has been **added** to the queue (${queue.length}/${this.getSize()})`);
				console.log(`Added ${username} (${member.user.tag}) to the queue (${queue.length}/${this.getSize()})`);

				util.updatePresence();
				this.checkQueueFull();
			} else {
				channel.send(`**${name}** is already in the queue (${queue.length}/${this.getSize()})`);
			}
		} else {
			link.showLinkInstructions();
		}
	});
};

exports.remove = (member) => {
	let name = member.displayName;
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);

	for (let i in queue) {
		let player = queue[i];
		if (player.member === member) {
			queue.splice(i, 1);
			member.roles.remove(process.env.QUEUE_ROLE);
			util.updatePresence();
			channel.send(`**${name}** has been **removed** from the queue (${queue.length}/${this.getSize()})`);
			console.log(`Removed ${player.username} (${member.user.tag}) from the queue (${queue.length}/${this.getSize()})`);
			return;
		}
	}

	channel.send(`**${name}** was already not in the queue (${queue.length}/${this.getSize()})`);
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
	for (let player of queue) {
		if (player.member === member) {
			return true;
		}
	}
	return false;
};

exports.getSize = () => {
	return size;
};

exports.setSize = (newSize) => {
	size = newSize;

	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
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
		var players = shuffle(queue.splice(0, this.getSize()));

		// remove queue role from players
		for (let player of players) {
			player.member.roles.remove(process.env.QUEUE_ROLE);
		}

		util.updatePresence();
		teams.splitIntoTeams(players);
		teams.announceTeams();
	}
};

//https://stackoverflow.com/a/2450976
function shuffle(array) {
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
}
