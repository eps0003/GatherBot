const SQLite = require("better-sqlite3");
const sql = new SQLite("./stats.sqlite");
const { client } = require("../index");
const teams = require("./teams");
const subs = require("./substitutions");
const { table } = require("table");

var addMatch;
var addPlayerMatch;
var getLastID;
var getLeaderboard;
var getStats;

exports.init = () => {
	sql.pragma("synchronous = 1");

	createTables();
	registerFunctions();
	prepareStatements();

	this.updateLeaderboardMessage();
};

exports.getLeaderboard = (max = 20) => getLeaderboard.all(max);

exports.getStats = (username) => getStats.get(username);

exports.saveMatch = (cause, winner, duration, map, blueTickets, redTickets, playerStats) => {
	//add match to database
	addMatch.run({ duration, map, winner, blueTickets, redTickets, cause });

	const matchID = getLastID.get().id;

	//add players of winning team to database
	const winningTeam = teams.getTeam(winner);
	for (const player of winningTeam) {
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: winner,
			substituted: subs.getSubbedPlayer(player.username) ? 1 : 0,
			deserted: 0,
			...playerStats[player.username],
		});

		delete playerStats[player.username];
	}

	//add players of losing team to database
	const loser = (winner + 1) % 2;
	const losingTeam = teams.getTeam(loser);
	for (const player of losingTeam) {
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: loser,
			substituted: subs.getSubbedPlayer(player.username) ? 1 : 0,
			deserted: 0,
			...playerStats[player.username],
		});

		delete playerStats[player.username];
	}

	//add remaining players to database
	//these players deserted the match or were subbed in and out
	const usernames = Object.keys(playerStats);
	for (const username of usernames) {
		addPlayerMatch.run({
			username,
			matchID,
			team: subs.getDesertedPlayer(username).team,
			substituted: subs.getSubbedPlayer(username) ? 1 : 0,
			deserted: 1,
			...playerStats[username],
		});
	}

	this.updateLeaderboardMessage();
};

exports.getLeaderboardText = (max = 20) => {
	const data = [["", "[Username]", "[Matches]", " [Wins] ", "[Losses]", "[Win %]", "[Score]"]];

	const leaderboard = this.getLeaderboard(max);
	for (const x of leaderboard) {
		data.push([x.rank, x.username, x.playcount, x.wins, x.losses, `${x.winrate.toFixed(2)}%`, Math.floor(x.score)]);
	}

	const config = {
		columns: {
			0: { alignment: "right", width: Math.max(1, leaderboard.length.toString().length) },
			1: { alignment: "center", width: 20 },
			2: { alignment: "right" },
			3: { alignment: "right" },
			4: { alignment: "right" },
			5: { alignment: "right" },
			6: { alignment: "right" },
			7: { alignment: "right" },
		},
		drawHorizontalLine: (index, size) => {
			return index === 0 || index === 1 || index === size;
		},
	};

	return "```ini\n" + table(data, config) + "```";
};

exports.updateLeaderboardMessage = () => {
	//disable leaderboard if an env variable is omitted
	if (!process.env.LEADERBOARD_CHANNEL || !process.env.LEADERBOARD_MESSAGE) return;

	//get channel
	const channel = client.channels.cache.get(process.env.LEADERBOARD_CHANNEL);
	if (!channel) {
		console.warn("Unable to find leaderboard channel");
		return;
	}

	//fetch message
	channel.messages
		.fetch(process.env.LEADERBOARD_MESSAGE)
		.then((message) => message.edit(this.getLeaderboardText(18)))
		.catch((err) => console.warn(`Unable to update leaderboard: ${err.message}`));
};

function createTables() {
	const matches = sql.prepare(`
		CREATE TABLE IF NOT EXISTS Matches (
			match_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			duration INTEGER,
			map TEXT,
			winner INTEGER,
			blue_tickets INTEGER,
			red_tickets INTEGER,
			win_condition INTEGER
		);
	`);

	const playerMatches = sql.prepare(`
		CREATE TABLE IF NOT EXISTS PlayerMatches (
			match_id INTEGER NOT NULL,
			username TEXT NOT NULL,
			team INTEGER NOT NULL,
			kills INTEGER,
			deaths INTEGER,
			substituted INTEGER NOT NULL DEFAULT 0,
			deserted INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (match_id, username),
			FOREIGN KEY(match_id) REFERENCES Matches(match_id)
		);
	`);

	matches.run();
	playerMatches.run();
}

function registerFunctions() {
	sql.function("SQRT", (x) => Math.sqrt(x));
	sql.function("PERC", (a, b) => a / Math.max(b, 1));
	sql.function("CI", (pos, n) => {
		//https://gist.github.com/honza/5050540
		const z = 1.96;
		const phat = (1 * pos) / n;
		return (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
	});
}

function prepareStatements() {
	const wins = "SUM(team = winner AND (NOT deserted OR substituted))";
	const losses = "SUM(team != winner)";
	const winrate = `PERC(${wins}, COUNT(1)) * 100`;
	const kdr = "PERC(SUM(kills), SUM(deaths))";
	const score = `CI(${wins}, ${wins} + ${losses}) * 1000`;
	const seasonCheck = process.env.SEASON_START ? `date >= DATETIME('${process.env.SEASON_START}')` : "1";
	const order = `${score} DESC, ${winrate} DESC, ${wins} DESC, ${kdr} DESC, username COLLATE NOCASE`;
	const statsQuery = `
		SELECT
			username,
			${wins} as wins,
			${losses} as losses,
			${winrate} as winrate,
			SUM(kills) AS kills,
			SUM(deaths) AS deaths,
			${kdr} AS kdr,
			MAX(PERC(kills, deaths)) AS bestkdr,
			SUM(substituted) AS substitutions,
			SUM(deserted AND NOT substituted) AS desertions,
			COUNT(1) as playcount,
			SUM(duration) AS playtime,
			AVG(kills) AS avgkills,
			AVG(deaths) AS avgdeaths,
			MIN(kills) AS minkills,
			MIN(deaths) AS mindeaths,
			MAX(kills) AS maxkills,
			MAX(deaths) AS maxdeaths,
			${score} AS score,
			rank,
			players
		FROM PlayerMatches
		NATURAL JOIN Matches
		NATURAL JOIN (SELECT COUNT(DISTINCT username) AS players FROM PlayerMatches)
		NATURAL JOIN (
			SELECT username, RANK() OVER (ORDER BY ${order}) rank
			FROM PlayerMatches
			NATURAL JOIN Matches
			GROUP by username
		)
	`;

	addMatch = sql.prepare(`
		INSERT INTO Matches (duration, map, winner, blue_tickets, red_tickets, win_condition)
		VALUES (@duration, @map, @winner, @blueTickets, @redTickets, @cause)
	`);

	addPlayerMatch = sql.prepare(`
		INSERT INTO PlayerMatches
		VALUES (@matchID, @username, @team, @kills, @deaths, @substituted, @deserted)`);

	getLastID = sql.prepare(`
		SELECT last_insert_rowid() AS 'id'
	`);

	getLeaderboard = sql.prepare(`
		${statsQuery}
		WHERE ${seasonCheck}
		GROUP by username
		ORDER BY ${order}
		LIMIT ?
	`);

	getStats = sql.prepare(`
		${statsQuery}
		WHERE ${seasonCheck} AND username LIKE ?
		GROUP by username
	`);

	getGatherStats = sql.prepare(`
		SELECT
			COUNT(1) AS total_matches,
			(SELECT COUNT(1) AS season_matches FROM Matches WHERE ${seasonCheck}) AS season_matches,
			MAX(duration) AS longest_match,
			MIN(duration) AS shortest_match
		FROM Matches;
	`);
}
