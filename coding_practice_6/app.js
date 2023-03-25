const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

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
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectToResponseObject = (distObj) => {
  return {
    districtId: distObj.district_id,
    districtName: distObj.district_name,
    stateId: distObj.state_id,
    cases: distObj.cases,
    cured: distObj.cured,
    active: distObj.active,
    deaths: distObj.deaths,
  };
};

//API 1

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT 
      * 
    FROM 
      state 
    ORDER BY 
      state_id;`;
  const states = await db.all(getStatesQuery);
  let statesList = [];
  for (let i of states) {
    statesList.push(convertDbObjectToResponseObject(i));
  }
  response.send(statesList);
});

//API 2

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = ` SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(state));
});

//API 3

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO 
        district (district_name, state_id, cases, cured, active, deaths) 
    VALUES 
        ('${districtName}', '${stateId}', '${cases}', '${cured}', '${active}', '${deaths}'); `;
  const district = await db.run(addDistrictQuery);
  response.send(`District Successfully Added`);
});

//API 4

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = ` SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictObjectToResponseObject(district));
});

//API 5

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const delDistrictQuery = ` DELETE FROM district WHERE district_id = ${districtId};`;
  const delDistrict = await db.run(delDistrictQuery);
  response.send(`District Removed`);
});

//API 6

app.put("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE
        district 
    SET 
        district_name = '${districtName}', 
        state_id = '${stateId}', 
        cases = '${cases}',
        cured = '${cured}',
        active = '${active}',
        deaths = '${deaths}' 
    WHERE 
        district_id = ${districtId};`;
  const district = await db.run(updateDistrictQuery);
  response.send(`District Details Updated`);
});

module.exports = app;

//API 7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured, SUM(active) AS totalActive, SUM(deaths) AS totalDeaths FROM district WHERE district.state_id = ${stateId};
    `;
  const getStats = await db.get(getStatsQuery);
  response.send(getStats);
});

//API 8

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `
    SELECT state_name FROM state LEFT JOIN district ON state.state_id = district.state_id
    WHERE district_id = ${districtId};
    `;
  const getStateName = await db.get(stateNameQuery);
  const convertStateName = (nameObj) => {
    return {
      stateName: nameObj.state_name,
    };
  };
  response.send(convertStateName(getStateName));
});
