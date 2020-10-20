const teams = require("./teams");

var substitutions = [];
var desertions = [];

//return copies of the arrays
exports.getSubstitutions = () => [...substitutions];
exports.getDesertions = () => [...desertions];

exports.addSubstitution = (username, team) => {
	if (this.getDesertedPlayer(username)) {
		const index = desertions.indexOf(username);
		desertions.splice(index, 1);
	} else if (!this.getSubbedPlayer(username)) {
		substitutions.push({ username, team });
	}
};

exports.addDesertion = (username, team) => {
	if (!this.getDesertedPlayer(username)) {
		desertions.push({ username, team });
	}
};

exports.getSubbedPlayer = (username) => {
	return substitutions.find((obj) => obj.username === username);
};

exports.getDesertedPlayer = (username) => {
	return desertions.find((obj) => obj.username === username);
};

exports.clear = () => {
	substitutions = [];
	desertions = [];
};
