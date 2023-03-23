const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketTeam.db");

let db = null;

const initializingDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log(`server is running at http://localhost/3001`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};
initializingDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    jerseyNumber: dbObject.jersey_number,
    role: dbObject.role,
  };
};

//API 1

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    SELECT 
      * 
    FROM 
      cricket_team 
    ORDER BY 
      player_id;`;
  const players = await db.all(getPlayersQuery);
  let playerList = [];
  for (let i of players) {
    playerList.push(convertDbObjectToResponseObject(i));
  }
  response.send(playerList);
});

//API 2

app.post("/players/", async (request, response) => {
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;
  const addPlayerQuery = `
    INSERT INTO 
        cricket_team (player_name, jersey_number, role) 
    VALUES 
        ('${playerName}', '${jerseyNumber}', '${role}'); `;
  const player = await db.run(addPlayerQuery);
  const playerId = player.lastId;
  response.send(`Player Added to Team`);
});

//API 3

app.get("/players/:player_id/", async (request, response) => {
  const { player_id } = request.params;
  const getPlayerQuery = ` SELECT * FROM cricket_team WHERE player_id = ${player_id};`;
  const player = await db.get(getPlayerQuery);
  response.send(convertDbObjectToResponseObject(player));
});

//API 4

app.put("/players/:player_id/", async (request, response) => {
  const { player_id } = request.params;
  const playerDetails = request.body;
  const { playerName, jerseyNumber, role } = playerDetails;
  const addPlayerQuery = `
    UPDATE
        cricket_team 
    SET 
        player_name = '${playerName}', 
        jersey_number = '${jerseyNumber}', 
        role = '${role}' 
    WHERE 
        player_id = ${player_id};`;
  const playerUpdated = await db.run(addPlayerQuery);
  response.send(`Player Details Updated`);
});

//API 5

app.delete("/players/:player_id/", (request, response) => {
  const { player_id } = request.params;
  const getPlayerQuery = ` DELETE FROM cricket_team WHERE player_id = ${player_id};`;
  db.get(getPlayerQuery);
  response.send(`Player Removed`);
});

module.exports = app;
