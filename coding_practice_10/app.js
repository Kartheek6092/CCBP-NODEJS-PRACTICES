const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStates = (statesObj) => {
  return {
    stateId: statesObj.state_id,
    stateName: statesObj.state_name,
    population: statesObj.population,
  };
};

const convertDistrict = (districtObj) => {
  return {
    districtId: districtObj.district_id,
    districtName: districtObj.district_name,
    stateId: districtObj.state_id,
    cases: districtObj.cases,
    cured: districtObj.cured,
    active: districtObj.active,
    deaths: districtObj.deaths,
  };
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send(`Invalid JWT Token`);
  } else {
    jwt.verify(jwtToken, "kartheek", async (error, user) => {
      if (error) {
        response.status(401);
        response.send(`Invalid JWT Token`);
      } else {
        next();
      }
    });
  }
};

//register API

app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "kartheek");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//get states list

app.get("/states/", authenticateToken, async (request, response) => {
  const getSatesQuery = `SELECT * FROM state;`;
  const getStates = await db.all(getSatesQuery);
  let statesList = [];
  for (let i of getStates) {
    statesList.push(convertStates(i));
  }
  response.send(statesList);
});

//get a particular state

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const getState = await db.get(getStateQuery);
  response.send(convertStates(getState));
});

//create new district

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName } = request.body;
  const getDistrictQuery = ` SELECT * FROM district 
    WHERE district_name = '${districtName}';`;
  const getDistrict = await db.get(getDistrictQuery);
  if (getDistrict === undefined) {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const createDistrictQuery = `INSERT INTO 
        district (district_name, state_id, cases, cured, active, deaths)
        VALUES 
                ('${districtName}',
                ${stateId},
                ${cases},
                ${cured},
                ${active},
                ${deaths}
                ) `;
    const district = await db.run(createDistrictQuery);
    response.send(`District Successfully Added`);
  } else {
    response.status(400);
    response.send(`District already existed`);
  }
});

//API to get district b id

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
    const getDistrict = await db.get(getDistrictQuery);
    response.send(convertDistrict(getDistrict));
  }
);

//delete district

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    const getDistrict = await db.run(getDistrictQuery);
    response.send(`District Removed`);
  }
);

//update district

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const getDistrictQuery = `UPDATE district 
        SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE district_id = ${districtId};`;
    const updatedDistrict = await db.run(getDistrictQuery);
    response.send(`District Details Updated`);
  }
);

//stats of state
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStatsQuery = `
    SELECT 
      SUM(cases) AS totalCases,
      SUM(cured) AS totalCured,
      SUM(active) AS totalActive,
      SUM(deaths) AS totalDeaths
    FROM state INNER JOIN district 
    ON state.state_id = district.state_id 
    AND state.state_id = ${stateId}; `;
    const getStats = await db.get(getStatsQuery);
    response.send(getStats);
  }
);

module.exports = app;
