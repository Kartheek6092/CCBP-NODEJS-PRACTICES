const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

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
app.get("/todos/", async (request, response) => {
  const { status, priority, search_q } = request.query;

  const getTodoQuery = `
        SELECT
        *
        FROM
        todo
        WHERE
        todo LIKE '%${search_q}%' OR status LIKE '%${status}%'
        OR priority LIKE '%${priority}%';`;
  const todoArray = await db.all(getTodoQuery);
  response.send(todoArray);
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const getTodo = await db.get(getTodoQuery);
  response.send(getTodo);
});

//API 3

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status } = todoDetails;
  const getPostTodo = ` INSERT INTO todo(id, todo, priority, status)
    VALUES ('${id}','${todo}', '${priority}', '${status}'); 
    `;
  const postTodo = await db.run(getPostTodo);
  response.send(`Todo Successfully Added`);
});

//API 4.1

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;
  const { todo, priority, status } = todoDetails;
  if (priority === undefined && todo === undefined) {
    const updateTodoQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Status Updated`);
  } else if (status === undefined && todo === undefined) {
    const updateTodoQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Priority Updated`);
  } else if (status === undefined && priority === undefined) {
    const updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Todo Updated`);
  }
});

//API 5
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const delQuery = ` DELETE FROM todo WHERE id = ${todoId};`;
  const delTodo = await db.run(delQuery);
  response.send("Todo Deleted");
});

module.exports = app;
