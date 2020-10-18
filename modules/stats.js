const SQLite = require("better-sqlite3");
const sql = new SQLite('./stats.sqlite');
const teams = require("./teams");

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
			kills INTEGER NOT NULL DEFAULT 0,
			deaths INTEGER NOT NULL DEFAULT 0,
			assists INTEGER NOT NULL DEFAULT 0,
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
			CAST(SUM(team = winner) AS FLOAT) / NULLIF(COUNT(1), 0) as winrate,
			SUM(kills) AS kills,
			SUM(deaths) AS deaths,
			SUM(assists) AS assists,
			CAST(SUM(kills) AS FLOAT) / COALESCE(NULLIF(SUM(deaths), 0), 1) AS kdr,
			MAX(CAST(kills AS FLOAT) / COALESCE(NULLIF(deaths, 0), 1)) AS bestkdr,
			COUNT(1) as playcount,
			SUM(duration) AS playtime,
			AVG(kills) AS avgkills,
			AVG(deaths) AS avgdeaths,
			AVG(assists) AS avgassists,
			MIN(kills) AS minkills,
			MIN(deaths) AS mindeaths,
			MIN(assists) AS minassists,
			MAX(kills) AS maxkills,
			MAX(deaths) AS maxdeaths,
			MAX(assists) AS maxassists
		FROM PlayerMatches
		NATURAL JOIN Matches
	`;

	matchCompleted = sql.prepare("INSERT INTO Matches (duration, map, winner, blue_tickets, red_tickets, win_condition) VALUES (@duration, @map, @winner, @blueTickets, @redTickets, @cause)");
	addPlayerMatch = sql.prepare("INSERT INTO PlayerMatches VALUES (@matchID, @username, @team, @kills, @deaths, @assists)");
	getLastID = sql.prepare("SELECT last_insert_rowid() AS 'id'");
	getLeaderboard = sql.prepare(`${statsQuery} GROUP by username ORDER BY winrate DESC, wins DESC LIMIT ?`);
	getStats = sql.prepare(`${statsQuery} WHERE username LIKE ? GROUP by username`);
};

exports.getLeaderboard = (max = 20) => {
	return getLeaderboard.all(max);
}

exports.getStats = (username) => {
	return getStats.get(username);
}

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
};
