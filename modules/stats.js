const SQLite = require("better-sqlite3");
const sql = new SQLite('./stats.sqlite');
const { client } = require("../index");
const teams = require("./teams");
const subs = require("./substitutions");
const { table } = require("table");

var matchCompleted;
var addPlayerMatch;
var getLastID;
var getLeaderboard;
var getStats;

exports.init = () => {
	//matches table
	sql.prepare(`
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
	`).run();

	//player matches table
	sql.prepare(`
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
	`).run();

	sql.function("SQRT", (x) => Math.sqrt(x));

	sql.pragma("synchronous = 1");

	const wins = "SUM(team = winner AND (NOT deserted OR substituted))";
	const losses = "SUM(team != winner)";
	const winrate = `(CAST(${wins} AS FLOAT) / COUNT(1))`;
	const kdr = "(CAST(SUM(kills) AS FLOAT) / IFNULL(NULLIF(SUM(deaths), 0), 1))";

	const n = `(${wins} + ${losses})`;
	const score = `(((${wins} + 1.9208) / ${n} - 1.96 * SQRT((${wins} * ${losses}) / ${n} + 0.9604) / ${n}) / (1 + 3.8416 / ${n}) * 1000)`;

	const statsQuery = `
		SELECT
			username,
			${wins} as wins,
			${losses} as losses,
			${winrate} as winrate,
			SUM(kills) AS kills,
			SUM(deaths) AS deaths,
			${kdr} AS kdr,
			MAX(CAST(kills AS FLOAT) / IFNULL(NULLIF(deaths, 0), 1)) AS bestkdr,
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
			RANK() OVER (ORDER BY ${score} DESC, ${winrate} DESC, ${wins} DESC, ${kdr} DESC, username COLLATE NOCASE) rank
		FROM PlayerMatches
		NATURAL JOIN Matches
	`;

	const seasonCheck = process.env.SEASON_START ? `date >= DATETIME('${process.env.SEASON_START}')` : "1";

	matchCompleted = sql.prepare("INSERT INTO Matches (duration, map, winner, blue_tickets, red_tickets, win_condition) VALUES (@duration, @map, @winner, @blueTickets, @redTickets, @cause)");
	addPlayerMatch = sql.prepare("INSERT INTO PlayerMatches VALUES (@matchID, @username, @team, @kills, @deaths, @substituted, @deserted)");
	getLastID = sql.prepare("SELECT last_insert_rowid() AS 'id'");
	getLeaderboard = sql.prepare(`${statsQuery} WHERE ${seasonCheck} GROUP by username ORDER BY rank LIMIT ?`);
	getStats = sql.prepare(`${statsQuery} WHERE username LIKE ? AND ${seasonCheck} GROUP by username`);

	this.updateLeaderboardMessage();
};

exports.getLeaderboard = (max = 20) => getLeaderboard.all(max);

exports.getStats = (username) =>  getStats.get(username);

exports.saveMatch = (cause, winner, duration, map, blueTickets, redTickets, playerStats) => {
	matchCompleted.run({ duration, map, winner, blueTickets, redTickets, cause });

	const matchID = getLastID.get().id;

	winner = 0;
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

exports.getLeaderboardText = (max = 200) => {
	const data = [["", "[Username]", "[Matches]", " [Wins] ", "[Losses]", "[Win %]", "[KDR]", "[Score]"]];

	const leaderboard = this.getLeaderboard(max);
	for (const x of leaderboard) {
		const formattedWinrate = (x.winrate * 100).toFixed(2);
		data.push([x.rank, x.username, x.playcount, x.wins, x.losses, `${formattedWinrate}%`, x.kdr.toFixed(2), Math.floor(x.score)]);
	}

	const config = {
		columns: {
			0: { alignment: "right", width: max.toString().length },
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
	channel.messages.fetch(process.env.LEADERBOARD_MESSAGE).then((message) => {
		message.edit(this.getLeaderboardText());
	}).catch((err) => {
		console.warn("Unable to find leaderboard message");
	});
};
