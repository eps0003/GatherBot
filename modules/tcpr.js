const net = require("net");
const config = require("../config.json");

var isConnected = false;
var sentWarning = false;

exports.socket;

//https://cs.lmu.edu/~ray/notes/jsnetexamples/
exports.connect = () => {
	exports.socket = new net.Socket();

	this.socket.connect({ port: config.server.port, host: config.server.host }, () => {
		this.socket.write(`${config.server.rcon_password}\n`);

		console.log(`Connected to ${this.socket.localAddress}:${this.socket.localPort}`);
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
				setTimeout(this.connect, config.tcpr_reconnect_interval);
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
};

exports.isConnected = () => {
	return isConnected;
};

function connectionEnded() {
	console.log("Lost connection with server");
	isConnected = false;
	setTimeout(exports.connect, config.tcpr_reconnect_interval);
}
