const util = require("./utilities.js");

var usernames = {};

exports.getKAGUsername = (member, callback) => {
	//get cached username
	if (usernames.hasOwnProperty(member.id)) {
		callback(usernames[member.id]);
		return;
	}

	//get username from api
	util.XMLHttpRequest((data) => {
		if (data && data.playerList.length > 0) {
			//store username in cache
			let username = data.playerList[0].username;
			usernames[member.id] = username;

			//found username
			callback(username);
		} else {
			//discord not linked to kag account
			callback("");
		}
	}, `https://api.kag2d.com/v1/players?filters=[{"field":"discord","op":"eq","value":"${member.id}"}]`);
};

exports.showLinkInstructions = () => {
	let channel = client.channels.cache.get(config.gather_general);
	channel.send("To link your Discord account to your KAG account, go to https://kag2d.com/en/discord and follow the instructions");
};
