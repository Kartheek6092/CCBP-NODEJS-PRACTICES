const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializingDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log(`Server is running at http://localhost:3001`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializingDbAndServer();

const convertPlayerToResponsive = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchToResponsive = (matchObj) => {
  return {
    matchId: matchObj.match_id,
    match: matchObj.match,
    year: matchObj.year,
  };
};

//API 1

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT * FROM player_details ORDER BY player_id;
    `;
  const players = await db.all(getPlayersQuery);
  const playersList = [];
  for (let i of players) {
    playersList.push(convertPlayerToResponsive(i));
  }
  response.send(playersList);
});

//API 2

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = ` SELECT * FROM player_details WHERE player_id = ${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerToResponsive(player));
});

//API 3

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    UPDATE
        player_details 
    SET 
        player_name = '${playerName}'
    WHERE 
        player_id = ${playerId};`;
  const player = await db.run(updatePlayerQuery);
  response.send(`Player Details Updated`);
});

//API 4

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = ` SELECT * FROM match_details WHERE match_id = ${matchId};`;
  const match = await db.get(getMatchQuery);
  response.send(convertMatchToResponsive(match));
});

//API 5

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `SELECT * FROM match_details LEFT JOIN player_match_score ON match_details.match_id = player_match_score.match_id
    WHERE player_id = ${playerId} ORDER BY match_id;`;
  const getPlayerMatches = await db.all(getPlayerMatchesQuery);
  const matchesList = [];
  for (let i of getPlayerMatches) {
    matchesList.push(convertMatchToResponsive(i));
  }
  response.send(matchesList);
});

//API 6

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `SELECT * FROM player_match_score 
    LEFT JOIN player_details 
    ON player_match_score.player_id = player_details.player_id
    WHERE player_match_score.match_id = ${matchId}
  ;`;
  const getMatchPlayers = await db.all(getMatchPlayersQuery);
  const playersList = [];
  for (let i of getMatchPlayers) {
    playersList.push(convertPlayerToResponsive(i));
  }
  response.send(playersList);
});

//API 7
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getStatsQuery = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes
    FROM player_details INNER JOIN player_match_score 
    ON player_details.player_id = player_match_score.player_id 
    AND player_details.player_id = ${playerId}; `;
  const getStats = await db.get(getStatsQuery);
  response.send(getStats);
});

module.exports = app;
