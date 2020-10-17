const SQLite = require("better-sqlite3");
const sql = new SQLite('./stats.sqlite');
const teams = require("./teams");

var getPlayer;
var playerWon;
var playerLost;
var matchCompleted;
var addPlayerMatch;
var getLastID;
var getLeaderboard;
var getStats;

exports.init = () => {
	//players table
	sql.prepare(`
		CREATE TABLE IF NOT EXISTS Players (
			username TEXT PRIMARY KEY NOT NULL,
			wins INTEGER NOT NULL DEFAULT 0,
			losses INTEGER NOT NULL DEFAULT 0
		);
	`).run();

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
			match_id INTEGER,
			username TEXT,
			team INTEGER NOT NULL,
			PRIMARY KEY (username, match_id),
			FOREIGN KEY(match_id) REFERENCES Matches(match_id),
			FOREIGN KEY(username) REFERENCES Players(username)
		);
	`).run();

	sql.pragma("synchronous = 1");

	const playcount = "wins + losses";
	const winrate = `wins / ${playcount}`;

	getPlayer = sql.prepare("SELECT * FROM Players WHERE username = ?");
	playerWon = sql.prepare("REPLACE INTO Players (username, wins) VALUES (@username, @wins)");
	playerLost = sql.prepare("REPLACE INTO Players (username, losses) VALUES (@username, @losses)");
	matchCompleted = sql.prepare("INSERT INTO Matches (duration, map, winner, blue_tickets, red_tickets, win_condition) VALUES (@duration, @map, @winner, @blueTickets, @redTickets, @cause)");
	addPlayerMatch = sql.prepare("INSERT INTO PlayerMatches VALUES (@matchID, @username, @team)");
	getLastID = sql.prepare("SELECT last_insert_rowid() AS 'id'");
	getLeaderboard = sql.prepare(`
		SELECT *,
			${playcount} AS playcount,
			${winrate} AS winrate
		FROM Players
		ORDER BY
			winrate DESC,
			playcount DESC,
			username ASC
		LIMIT ?
	`);
	getStats = sql.prepare(`
		SELECT *,
			${playcount} AS playcount,
			${winrate} AS winrate
		FROM Players
		WHERE username LIKE ?
	`);
};

exports.getLeaderboard = (max = 20) => {
	return getLeaderboard.all(max);
}

exports.getStats = (username) => {
	return getStats.get(username);
}

exports.saveMatch = (cause, winner, duration, map, blueTickets, redTickets) => {
	matchCompleted.run({ duration, map, winner, blueTickets, redTickets, cause });

	const matchID = getLastID.get().id;

	const winningTeam = teams.getTeam(winner);
	for (const player of winningTeam) {
		incrementWonPlayer(player);
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: winner
		});
	}

	const loser = (winner + 1) % 2;
	const losingTeam = teams.getTeam(loser);
	for (const player of losingTeam) {
		incrementLostPlayer(player);
		addPlayerMatch.run({
			username: player.username,
			matchID,
			team: loser
		});
	}
};

function incrementWonPlayer(player)
{
	let data = getPlayer.get(player.username);

	if (!data) {
		data = {
			username: player.username,
			wins: 0
		};
	}

	data.wins++;

	playerWon.run(data);
}

function incrementLostPlayer(player)
{
	let data = getPlayer.get(player.username);

	if (!data) {
		data = {
			username: player.username,
			losses: 0
		};
	}

	data.losses++;

	playerLost.run(data);
}
