const net = require("net");
const { client } = require("../index.js");
const queue = require("./queue.js");
const match = require("./match.js");
const teams = require("./teams.js");
const util = require("./utilities.js");

var isConnected = false;
var sentWarning = false;

exports.socket;

//https://cs.lmu.edu/~ray/notes/jsnetexamples/
exports.connect = () => {
	exports.socket = new net.Socket();

	this.socket.connect({ port: process.env.SERVER_PORT, host: process.env.SERVER_HOST }, () => {
		this.socket.write(`${process.env.RCON_PASSWORD}\n`);

		let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
		channel.send("**The bot has successfully established a connection with the Gather server and is ready for use**");
		console.log(`Connected to ${exports.getAddress()}`);

		isConnected = true;
		sentWarning = true;
	});

	this.socket.on("end", () => {
		connectionEnded();
	});

	this.socket.on("error", (err) => {
		switch (err.code) {
			case "ECONNREFUSED":
				if (!sentWarning) {
					console.log(`Cannot connect to ${err.address}:${err.port}`);
					sentWarning = true;
				}
				setTimeout(this.connect, process.env.TCPR_RECONNECT_INTERVAL_MS);
				break;
			case "ECONNRESET":
				connectionEnded();
				break;
			case "ERR_STREAM_DESTROYED":
				//suppress this error
				break;
			default:
				console.log(err);
		}
	});

	this.socket.on("data", (data) => {
		data = data.toString();

		const prefix = "<gather>";
		if (data.indexOf(prefix) !== 0) {
			return;
		}

		const args = data.slice(prefix.length).trim().split(/\s+/g);
		const command = args.shift().toLowerCase();

		if (command === "started") {
			match.matchStarted();
		} else if (command === "ended") {
			let cause = Number(args[0]);
			let winner = Number(args[1]);
			let duration = Number(args[2]);
			let map = args[3];
			let blueTickets = Number(args[4]);
			let redTickets = Number(args[5]);

			match.matchEnded(cause, winner, duration, map, blueTickets, redTickets);
		} else if (command === "scramble") {
			teams.scramble();
		} else if (command === "status") {
			let state = Number(args[0]);
			let blueTickets = Number(args[1]);
			let redTickets = Number(args[2]);
			let blueAlive = Number(args[3]);
			let redAlive = Number(args[4]);

			let stateNames = ["Intermission", "Warmup", "In Progress", "Game Over"];

			let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
			channel.send(`**State:** ${stateNames[state]}\n**Blue Team:** ${blueTickets} ${util.plural(blueTickets, "ticket")}, ${blueAlive} alive\n**Red Team:** ${redTickets} ${util.plural(redTickets, "ticket")}, ${redAlive} alive`);
		}
	});
};

exports.isConnected = () => {
	return isConnected;
};

exports.getAddress = () => {
	return `${exports.socket.remoteAddress}:${exports.socket.remotePort}`;
};

function connectionEnded() {
	isConnected = false;

	//end match
	if (match.isInProgress()) {
		match.matchEnded(match.matchEndCause.disconnected);
	}

	//announce server went down
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send("**The Gather server just went down and, as a result, the bot will no longer be accepting some Gather-related commands. The bot will automatically attempt to re-establish a connection with the server**");
	console.log(`Lost connection with ${exports.getAddress()}`);

	//message players in queue
	let players = queue.getQueue();
	for (let player of players) {
		player.member.send("You have been **removed** from the Gather queue because the **server went down**");
	}

	//clear queue
	queue.clear();

	//attempt to reconnect
	setTimeout(exports.connect, process.env.TCPR_RECONNECT_INTERVAL_MS);
}
