const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializingDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`server is running at http://localhost:3000`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializingDbAndServer();

//API 1
app.post("/register", async (request, response) => {
  try {
    const userDetails = request.body;
    const { username, name, password, gender, location } = userDetails;
    const getUserQuery = `
        SELECT 
            * 
        FROM  
            user 
        WHERE 
            username = '${username}';`;
    const getUser = await db.get(getUserQuery);

    if (getUser === undefined && password.length >= 5) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
        INSERT INTO 
            user (username, name, password, gender, location) 
        VALUES (
            '${username}', 
            '${name}', 
            '${hashedPassword}', 
            '${gender}', 
            '${location}')`;
      const createdUser = await db.run(createUserQuery);
      response.status(200);
      response.send(`User created successfully`);
    } else if (password.length < 5) {
      response.status(400);
      response.send(`Password is too short`);
    } else {
      response.status(400);
      response.send(`User already exists`);
    }
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
});

//API 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const getUser = await db.get(getUserQuery);
  if (getUser === undefined) {
    response.status(400);
    response.send(`Invalid user`);
  } else {
    const isValidPassword = await bcrypt.compare(password, getUser.password);
    if (isValidPassword === false) {
      response.status(400);
      response.send(`Invalid password`);
    } else {
      response.status(200);
      response.send(`Login success!`);
    }
  }
});

//API 3

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const getUser = await db.get(getUserQuery);
  if (getUser === undefined) {
    response.status(400);
    response.send(`Invalid user`);
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, getUser.password);
    if (isValidPassword === false) {
      response.status(400);
      response.send(`Invalid current password`);
    } else if (newPassword.length < 5) {
      response.status(400);
      response.send(`Password is too short`);
    } else {
      const hashPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = ` UPDATE user SET password = '${hashPassword}'`;
      const passUpdate = await db.run(updatePasswordQuery);
      response.status(200);
      response.send(`Password updated`);
    }
  }
});

module.exports = app;
