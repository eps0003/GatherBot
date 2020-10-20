const SQLite = require("better-sqlite3");
const sql = new SQLite('./stats.sqlite');
const { client } = require("../index");
const teams = require("./teams");
const { table, getBorderCharacters } = require("table");

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
			PRIMARY KEY (match_id, username),
			FOREIGN KEY(match_id) REFERENCES Matches(match_id)
		);
	`).run();

	sql.pragma("synchronous = 1");

	const statsQuery = `
		SELECT
			username,
			SUM(team = winner) as wins,
			SUM(team != winner) as losses,
			CAST(SUM(team = winner) AS FLOAT) / COUNT(1) as winrate,
			SUM(kills) AS kills,
			SUM(deaths) AS deaths,
			CAST(SUM(kills) AS FLOAT) / COALESCE(NULLIF(SUM(deaths), 0), 1) AS kdr,
			MAX(CAST(kills AS FLOAT) / COALESCE(NULLIF(deaths, 0), 1)) AS bestkdr,
			COUNT(1) as playcount,
			SUM(duration) AS playtime,
			AVG(kills) AS avgkills,
			AVG(deaths) AS avgdeaths,
			MIN(kills) AS minkills,
			MIN(deaths) AS mindeaths,
			MAX(kills) AS maxkills,
			MAX(deaths) AS maxdeaths
		FROM PlayerMatches
		NATURAL JOIN Matches
	`;

	const seasonCheck = process.env.SEASON_START ? `date >= DATETIME('${process.env.SEASON_START}')` : "1";

	matchCompleted = sql.prepare("INSERT INTO Matches (duration, map, winner, blue_tickets, red_tickets, win_condition) VALUES (@duration, @map, @winner, @blueTickets, @redTickets, @cause)");
	addPlayerMatch = sql.prepare("INSERT INTO PlayerMatches VALUES (@matchID, @username, @team, @kills, @deaths)");
	getLastID = sql.prepare("SELECT last_insert_rowid() AS 'id'");
	getLeaderboard = sql.prepare(`${statsQuery} WHERE ${seasonCheck} GROUP by username ORDER BY winrate DESC, wins DESC LIMIT ?`);
	getStats = sql.prepare(`${statsQuery} WHERE username LIKE ? AND ${seasonCheck} GROUP by username`);

	this.updateLeaderboardMessage();
};

exports.getLeaderboard = (max = 20) => {
	return getLeaderboard.all(max);
};

exports.getStats = (username) => {
	return getStats.get(username);
};

exports.saveMatch = (cause, winner, duration, map, blueTickets, redTickets, playerStats) => {
	matchCompleted.run({ duration, map, winner, blueTickets, redTickets, cause });

	const matchID = getLastID.get().id;

	const winningTeam = teams.getTeam(winner);
	for (const player of winningTeam) {
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: winner,
			...playerStats[player.username]
		});
	}

	const loser = (winner + 1) % 2;
	const losingTeam = teams.getTeam(loser);
	for (const player of losingTeam) {
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: loser,
			...playerStats[player.username]
		});
	}

	this.updateLeaderboardMessage();
};

exports.getLeaderboardText = (max = 20) => {
	const data = [["[Username]", "[Matches]", " [Wins] ", "[Losses]", "[Win %]", "[KDR]"]];

	const leaderboard = this.getLeaderboard(max);
	for (const x of leaderboard) {
		const formattedWinrate = Math.floor(x.winrate * 100).toFixed(2);
		data.push([x.username, x.playcount, x.wins, x.losses, `${formattedWinrate}%`, x.kdr.toFixed(2)]);
	}

	const config = {
		columns: {
			0: { width: 20, alignment: "center" },
			1: { alignment: "right" },
			2: { alignment: "right" },
			3: { alignment: "right" },
			4: { alignment: "right" },
			5: { alignment: "right" },
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
