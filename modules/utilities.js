const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const { client } = require("../index.js");
const queue = require("./queue.js");

// exports.getRole = (role) => {
// 	if (!role) return null;
// 	if (typeof role === "object") return role;
// 	if (/<@&\d+>/.test(role) || !isNaN(role)) {
// 		//mention or ID
// 		role = client.guilds.get(process.env.GUILD).roles.get(role.match(/\d+/)[0]);
// 	} else {
// 		//name
// 		role = client.guilds.get(process.env.GUILD).roles.find((x) => x.name.toLowerCase() === role.toLowerCase());
// 	}
// 	return role || null;
// };

// exports.getUser = (user) => {
// 	if (!user) return null;
// 	if (typeof user === "object") return user;
// 	if (/<@!?\d+>/.test(user) || !isNaN(user)) {
// 		//mention or ID
// 		user = client.guilds.get(process.env.GUILD).members.get(user.match(/\d+/)[0]);
// 	} else if (/.+#\d{4}$/.test(user)) {
// 		//tag
// 		user = client.guilds
// 			.get(process.env.GUILD)
// 			.members.array()
// 			.find((x) => user === `${x.user.username}#${x.user.discriminator}`);
// 	} else {
// 		//name
// 		let guildMembers = client.guilds.get(process.env.GUILD).members;
// 		user = guildMembers.find((x) => x.user.username.toLowerCase() === user.toLowerCase()) || guildMembers.find((x) => (x.nickname || x.user.username).toLowerCase() === user.toLowerCase()) || guildMembers.find((x) => x.user.username.toLowerCase().includes(user.toLowerCase())) || guildMembers.find((x) => (x.nickname || x.user.username).toLowerCase().includes(user.toLowerCase()));
// 	}
// 	return user || null;
// };

// exports.getChannel = (channel) => {
// 	if (typeof channel === "object") return channel;
// 	return client.guilds.get(process.env.GUILD).channels.get(channel) || null;
// };

// exports.userHasRole = (user, role) => {
// 	user = this.getUser(user);
// 	role = this.getRole(role);
// 	if (!user || !role) return false;
// 	return client.guilds.get(process.env.GUILD).members.get(user.id).roles.has(role.id);
// };

// exports.addRole = (user, role, callback) => {
// 	user = this.getUser(user);
// 	if (!user) {
// 		if (callback) callback(false);
// 		return;
// 	}

// 	if (Array.isArray(role)) {
// 		//remove multiple roles
// 		let roles = role.map((x) => this.getRole(x)).filter(Boolean);

// 		client.guilds
// 			.get(process.env.GUILD)
// 			.members.get(user.id)
// 			.addRoles(roles)
// 			.then(
// 				() => {
// 					//success
// 					if (callback) callback(true);
// 				},
// 				(err) => {
// 					//error
// 					this.error(`Couldn't add a role to ${user.username}`, err);
// 					if (callback) callback(false);
// 				}
// 			);
// 	} else {
// 		//remove a single role
// 		role = this.getRole(role);
// 		if (!role) {
// 			if (callback) callback(false);
// 			return;
// 		}

// 		client.guilds
// 			.get(process.env.GUILD)
// 			.members.get(user.id)
// 			.addRole(role)
// 			.then(
// 				() => {
// 					//success
// 					if (callback) callback(true);
// 				},
// 				(err) => {
// 					//error
// 					this.error(`Couldn't add ${role.name} role to ${user.username}`, err);
// 					if (callback) callback(false);
// 				}
// 			);
// 	}
// };

// exports.removeRole = (user, role, callback) => {
// 	user = this.getUser(user);
// 	if (!user) {
// 		if (callback) callback(false);
// 		return;
// 	}

// 	if (Array.isArray(role)) {
// 		//remove multiple roles
// 		let roles = role.map((x) => this.getRole(x)).filter(Boolean);

// 		client.guilds
// 			.get(process.env.GUILD)
// 			.members.get(user.id)
// 			.removeRoles(roles)
// 			.then(
// 				() => {
// 					//success
// 					if (callback) callback(true);
// 				},
// 				(err) => {
// 					//error
// 					this.error(`Couldn't remove a role from ${user.username}`, err);
// 					if (callback) callback(false);
// 				}
// 			);
// 	} else {
// 		//remove a single role
// 		role = this.getRole(role);
// 		if (!role) {
// 			if (callback) callback(false);
// 			return;
// 		}

// 		client.guilds
// 			.get(process.env.GUILD)
// 			.members.get(user.id)
// 			.removeRole(role)
// 			.then(
// 				() => {
// 					//success
// 					if (callback) callback(true);
// 				},
// 				(err) => {
// 					//error
// 					this.error(`Couldn't remove ${role.name} role from ${user.username}`, err);
// 					if (callback) callback(false);
// 				}
// 			);
// 	}
// };

exports.plural = (val, text, suffix = "s", trim = 0) => {
	if (val === 1) {
		return text;
	} else {
		if (trim) text = text.slice(0, -trim);
		return text + suffix;
	}
};

exports.XMLHttpRequest = (callback, url) => {
	let xhttp = new XMLHttpRequest();
	xhttp.onload = function () {
		if (this.status === 200) {
			return callback(JSON.parse(xhttp.responseText));
		} else {
			return callback(null);
		}
	};
	xhttp.open("GET", url, true);
	xhttp.send();
};

exports.clearRole = (role) => {
	client.guilds.cache
		.get(process.env.GUILD)
		.roles.cache.get(role)
		.members.forEach((member) => member.roles.remove(role));
};

exports.updatePresence = () => {
	client.user.setActivity(`${queue.getPlayerCount()}/${queue.getSize()} in queue | ${process.env.PREFIX}help`, { type: "WATCHING" });
};

// exports.sendMessage = (channel, text, delete_message = false) => {
// 	channel = this.getChannel(channel);
// 	if (!channel) return;
// 	channel
// 		.send(text)
// 		.then((message) => {
// 			if (delete_message) {
// 				this.deleteMessage(message, process.env.DELETE_RESPONSE_SECS * 1000);
// 			}
// 		})
// 		.catch((err) => {
// 			this.error(`Couldn't send message in #${message.channel.name}`, err);
// 		});
// };

// exports.editMessage = (message, text, delete_message = false, callback) => {
// 	if (!message) return;
// 	message
// 		.edit(text)
// 		.then((message) => {
// 			if (callback) callback();
// 			if (delete_message) {
// 				this.deleteMessage(message, process.env.DELETE_RESPONSE_SECS * 1000);
// 			}
// 		})
// 		.catch((err) => {
// 			if (callback) return callback(err);
// 			this.error(`Couldn't edit message in #${message.channel.name}`, err);
// 		});
// };

// exports.deleteMessage = (message, delete_message = 0) => {
// 	if (!message || !message.guild) return;
// 	if (delete_message) {
// 		setTimeout(() => {
// 			message.delete().catch((err) => {
// 				this.error(`Couldn't auto delete message in #${message.channel.name}`, err);
// 			});
// 		}, process.env.DELETE_RESPONSE_SECS * 1000);
// 	} else {
// 		message.delete().catch((err) => {
// 			this.error(`Couldn't delete message in #${message.channel.name}`, err);
// 		});
// 	}
// };

// exports.fetchMessage = (callback, cfg_group) => {
// 	channel = this.getChannel(cfg_group.channel);
// 	if (!channel) {
// 		this.warn("Couldn't get channel to fetch message");
// 		if (callback) callback(null);
// 		return;
// 	}
// 	channel
// 		.fetchMessage(cfg_group.message)
// 		.then((message) => {
// 			if (callback) callback(message);
// 		})
// 		.catch((err) => {
// 			this.error(`Couldn't fetch message from #${channel.name}`, err);
// 		});
// };

// exports.isMod = (user) => {
// 	return process.env.MOD_ROLES.split(" ").some((role) => {
// 		return this.userHasRole(user, role);
// 	});
// };

// exports.updatePresence = (servers) => {
// 	let total_players = servers ? servers.reduce((t, x) => t + x.currentPlayers, 0) : 0;
// 	let text = `with ${total_players} ${this.plural(total_players, "fishy", "ies", 1)} | ${process.env.PREFIX}help`;
// 	client.user.setActivity(text, { type: "PLAYING" });
// };

// exports.sanitize = (data) => {
// 	//add zero width whitespace after the character to prevent the bot mentioning the channel/role/user
// 	//escape any discord markdown characters (\ * _ ` ~ >)
// 	return data.replace(/([@#])/g, "$1​").replace(/([\\\*_`~>])/g, "\\$1");
// };

// exports.pad = (number, size) => {
// 	let str = number.toString();
// 	let sign = Math.sign(str) === -1 ? "-" : "";
// 	return (
// 		sign +
// 		new Array(size)
// 			.concat([Math.abs(str)])
// 			.join("0")
// 			.slice(-size)
// 	);
// };

// exports.timestamp = (d = new Date()) => {
// 	let time = this.formatTime(d);
// 	let date = this.formatDate(d);
// 	return `[${date} ${time}]`;
// };

// exports.formatTime = (d = new Date()) => {
// 	return d.toTimeString().substr(0, 8);
// };

// exports.formatDate = (d = new Date()) => {
// 	let date = this.pad(d.getDate(), 2);
// 	let month = this.pad(d.getMonth() + 1, 2);
// 	let year = d.getFullYear(); //.toString().substr(2, 2);
// 	return `${date}/${month}/${year}`;
// };

// exports.log = (str) => {
// 	console.log(`${this.timestamp()} ${str}`);
// };

// exports.warn = (str) => {
// 	this.log(`WARN: ${str}`);
// };

// exports.error = (str, err) => {
// 	this.log(`ERROR: ${str} - ${err.message}`);
// };
