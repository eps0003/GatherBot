const util = require("./utilities.js");
const { client } = require("../index.js");

var usernames = {};

exports.getKAGUsername = (member, callback) => {
	//get cached username
	if (this.isUsernameCached(member)) {
		callback(usernames[member.id]);
		return;
	}

	//get username from api
	util.XMLHttpRequest((data) => {
		if (data && data.playerList.length > 0) {
			//store in cache
			let username = data.playerList[0].username;
			this.cache(member, username);

			//found username
			callback(username);
		} else {
			//discord not linked to kag account or account doesnt exist
			callback("");
		}
	}, `https://api.kag2d.com/v1/players?filters=[{"field":"discord","op":"eq","value":"${member.id}"}]`);
};

exports.cache = (member, username) => {
	usernames[member.id] = username;
};

exports.clearCache = () => {
	usernames = {};
};

exports.isUsernameCached = (member) => {
	return usernames.hasOwnProperty(member.id);
};

exports.getCachedMember = (username) => {
	let index = Object.values(usernames).indexOf(username);
	if (index > -1) {
		let id = Object.keys(usernames)[index];
		return client.guilds.cache.get(process.env.GUILD).members.cache.get(id);
	}
	return null;
};

exports.getDiscordID = (username, callback) => {
	//get cached member
	let cachedMemeber = this.getCachedMember(username);
	if (cachedMemeber) {
		let id = cachedMemeber.id;
		let username = usernames[id];
		callback(username, id);
		return;
	}

	util.XMLHttpRequest((data) => {
		if (data && data.hasOwnProperty("playerInfo")) {
			//found discord id
			username = data.playerInfo.username;
			let id = data.playerExtra.discord_user_id;
			callback(username, id);
		} else {
			//discord not linked to kag account or account doesnt exist
			callback("", 0);
		}
	}, `https://api.kag2d.com/v1/player/${username}`);
};

exports.showLinkInstructions = () => {
	let channel = client.channels.cache.get(process.env.GATHER_GENERAL);
	channel.send(`To link your Discord account to your KAG account, go to **https://kag2d.com/en/discord** and follow the instructions. Keep in mind it **may take a few minutes to update** before you are able to ${process.env.PREFIX}add to the queue`);
};
