const { client } = require("../index");
const fetch = require("node-fetch");

var usernames = {};

exports.getKAGUsername = async (member, callback) => {
	//get cached username
	if (this.isUsernameCached(member)) {
		callback(usernames[member.id]);
		return;
	}

	//get username from api
	const data = await fetch(`https://api.kag2d.com/v1/players?filters=[{"field":"discord","op":"eq","value":"${member.id}"}]`).then((response) => response.json());
	if (data && data.playerList.length > 0) {
		//store in cache
		const username = data.playerList[0].username;
		this.cache(member, username);

		//found username
		callback(username);
	} else {
		//discord not linked to kag account or account doesnt exist
		callback("");
	}
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
	const index = Object.values(usernames).indexOf(username);
	if (index > -1) {
		const id = Object.keys(usernames)[index];
		return client.guilds.cache.get(process.env.GUILD).members.cache.get(id);
	}
	return null;
};

exports.getDiscordID = async (username, callback) => {
	//get cached member
	const cachedMemeber = this.getCachedMember(username);
	if (cachedMemeber) {
		const id = cachedMemeber.id;
		const username = usernames[id];
		callback(username, id);
		return;
	}

	const data = await fetch(`https://api.kag2d.com/v1/player/${username}`).then((response) => response.json());
	if (data && data.hasOwnProperty("playerInfo")) {
		//found discord id
		username = data.playerInfo.username;
		const id = data.playerExtra.discord_user_id;
		callback(username, id);
	} else {
		//kag account doesnt exist
		callback("", "0");
	}
};

exports.showLinkInstructions = (channel) => {
	channel.send(`To link your Discord account to your KAG account, go to **https://kag2d.com/en/discord** and follow the instructions. Keep in mind it **may take a few minutes to update** before you are able to ${process.env.PREFIX}add to the queue`);
};
