const net = require("net");

var isConnected = false;
var sentWarning = false;

exports.socket;

//https://cs.lmu.edu/~ray/notes/jsnetexamples/
exports.connect = () => {
	exports.socket = new net.Socket();

	this.socket.connect({ port: process.env.SERVER_PORT, host: process.env.SERVER_HOST }, () => {
		this.socket.write(`${process.env.RCON_PASSWORD}\n`);

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
};

exports.isConnected = () => {
	return isConnected;
};

function connectionEnded() {
	console.log("Lost connection with server");
	isConnected = false;
	setTimeout(exports.connect, process.env.TCPR_RECONNECT_INTERVAL_MS);
}
