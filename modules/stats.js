const SQLite = require("better-sqlite3");
const sql = new SQLite('./stats.sqlite');

exports.init = () => {
	sql.prepare(`
		CREATE TABLE IF NOT EXISTS Players (
			username TEXT PRIMARY KEY NOT NULL,
			playcount INTEGER DEFAULT 0,
			wins INTEGER DEFAULT 0,
			losses INTEGER DEFAULT 0,
			draws INTEGER DEFAULT 0,
			substitutions INTEGER DEFAULT 0,
			desertions INTEGER DEFAULT 0,
			substitution_wins INTEGER DEFAULT 0,
			desertion_losses INTEGER DEFAULT 0
		);
	`).run();

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

	sql.prepare(`
		CREATE TABLE IF NOT EXISTS PlayerMatches (
			username TEXT,
			match_id INTEGER,
			team INTEGER NOT NULL,
			PRIMARY KEY (username, match_id),
			FOREIGN KEY(username) REFERENCES Players(username),
			FOREIGN KEY(match_id) REFERENCES Matches(match_id)
		);
	`).run();

	sql.pragma("synchronous = 1");

	console.log("Initialised SQLite database");
};