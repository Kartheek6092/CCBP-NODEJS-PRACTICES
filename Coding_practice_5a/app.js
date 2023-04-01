const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "moviesData.db");


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

const convertDbMovieOutputToResponsive = (dbObject) => {
  return {
    movieName: `${dbObject.movie_name}`,
  };
};

//API 1

app.get("/movies/", async (request, response) => {
  const movieDetails = request.body;
  const movieTitleQuery = `
        SELECT * FROM movie ORDER BY movie_id;
    `;
  const movies = await db.all(movieTitleQuery);
  const moviesList = [];
  for (let i of movies) {
    moviesList.push(convertDbMovieOutputToResponsive(i));
  }
  response.send(moviesList);
});

//API 2

app.post("/movies/", async (request, response) => {
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;
  const addMovieQuery = `
    INSERT INTO 
        movie (director_id, movie_name, lead_actor) 
    VALUES 
        ('${directorId}', '${movieName}', '${leadActor}'); `;
  const movie = await db.run(addMovieQuery);
  const movieId = movie.lastId;
  response.send(`Movie Successfully Added`);
});

//API 3

app.get("/movies/:movie_id/", async (request, response) => {
  const { movie_id } = request.params;
  const getMovieQuery = `
    SELECT 
      * 
    FROM 
      movie 
    WHERE 
      movie_id = ${movie_id};`;

  const movie = await db.get(getMovieQuery);
  let convertMovieDb = (movie) => {
    return {
      movieId: movie.movie_id,
      directorId: movie.director_id,
      movieName: movie.movie_name,
      leadActor: movie.lead_actor,
    };
  };
  response.send(convertMovieDb(movie));
});

//API 4

app.put("/movies/:movie_id/", async (request, response) => {
  const { movie_id } = request.params;
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;
  const addMovieQuery = `
    UPDATE
        movie 
    SET 
        director_id = '${directorId}', 
        movie_name = '${movieName}', 
        lead_actor = '${leadActor}' 
    WHERE 
        director_id = ${directorId};`;
  const movieUpdated = await db.run(addMovieQuery);
  response.send(`Movie Details Updated`);
});

//API 5

app.delete("/movies/:movie_id/", async (request, response) => {
  const { movie_id } = request.params;
  const delMovieQuery = ` DELETE FROM movie WHERE movie_id = ${movie_id};`;
  const delMovie = await db.run(delMovieQuery);
  response.send(`Movie Removed`);
});

//API 6

app.get("/directors/", async (request, response) => {
  const directorDetails = request.body;
  const directorsListQuery = `
        SELECT * FROM director ORDER BY director_id;
    `;
  const directors = await db.all(directorsListQuery);
  const directorList = [];
  const directorConvert = (dirObject) => {
    return {
      directorId: dirObject.director_id,
      directorName: dirObject.director_name,
    };
  };
  for (let i of directors) {
    directorList.push(directorConvert(i));
  }
  response.send(directorList);
});

//API 7

app.get("/directors/:directorId/movies/", async (request, response) => {
  const movieDetails = request.body;
  const { directorId } = request.params;
  const getDirMoviesQuery = ` 
  SELECT 
    movie_name 
  FROM 
    movie
  WHERE 
    movie.director_id = ${directorId}
ORDER BY 
  movie_id;`;
  const getMovieNames = await db.all(getDirMoviesQuery);
  let movieNameList = [];
  let convertMovieNames = (movieNameObj) => {
    return {
      movieName: movieNameObj.movie_name,
    };
  };
  for (let i of getMovieNames) {
    movieNameList.push(convertMovieNames(i));
  }
  response.send(movieNameList);
});

module.exports = app;
