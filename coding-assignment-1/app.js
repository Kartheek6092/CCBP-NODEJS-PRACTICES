const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializePathAndDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server is running at http://localhost:3000`);
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializePathAndDatabase();

const convertTodo = (todoObj) => {
  return {
    id: todoObj.id,
    todo: todoObj.todo,
    priority: todoObj.priority,
    status: todoObj.status,
    category: todoObj.category,
    dueDate: todoObj.due_date,
  };
};

const invalidDueDate = (request, response, next) => {
  const { date } = request.query;
  const newDate = new Date(date);
  const formatDate = format(new Date(newDate), "yyyy-MM-dd");
  const validDate = isValid(newDate);
  if (validDate === false) {
    response.status(400);
    response.send(`Invalid Due Date`);
  } else {
    next();
  }
};

//API 1.1

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q } = request.query;
  if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== undefined
  ) {
    response.status(400);
    response.send(`Invalid Todo Status`);
  } else if (
    priority !== "HIGH" &&
    priority !== "LOW" &&
    priority !== "MEDIUM" &&
    priority !== undefined
  ) {
    response.status(400);
    response.send(`Invalid Todo Priority`);
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== undefined
  ) {
    response.status(400);
    response.send(`Invalid Todo Category`);
  }

  const getTodoQuery = `SELECT * FROM todo 
    WHERE 
      status LIKE '%${status}%'
      OR priority LIKE '%${priority}%'
      OR category LIKE '%${category}%'
      OR (priority LIKE '%${priority}%' AND status LIKE '%${status}%')
      ;`;
  const getTodos = await db.all(getTodoQuery);
  let todoList = [];
  for (let i of getTodos) {
    todoList.push(convertTodo(i));
  }
  response.send(todoList);
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const getTodo = await db.get(getTodoQuery);
  response.send(convertTodo(getTodo));
});

//API 3

//get todo by date
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = new Date(date);
  const formatDate = format(new Date(newDate), "yyyy-MM-dd");
  const validDate = isValid(newDate);
  if (validDate === true) {
    const getTodoQuery = `SELECT * FROM todo 
    WHERE due_date = '${formatDate}';`;
    const getTodo = await db.get(getTodoQuery);
    response.send(convertTodo(getTodo));
  } else {
    response.status(400);
    response.send(`Invalid Due Date`);
  }
});

//API 4 create a todo

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  const getPostTodo = ` INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES ('${id}','${todo}', '${priority}', '${status}', '${category}','${dueDate}'); 
    `;
  const postTodo = await db.run(getPostTodo);
  response.send(`Todo Successfully Added`);
});

//API 5

//update a todo
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoDetails = request.body;
  const { todo, priority, status, category, dueDate } = todoDetails;
  if (status !== undefined) {
    const updateTodoQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Status Updated`);
  } else if (priority !== undefined) {
    const updateTodoQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Priority Updated`);
  } else if (todo !== undefined) {
    const updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Todo Updated`);
  } else if (category !== undefined) {
    const updateTodoQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Category Updated`);
  } else if (dueDate !== undefined) {
    const updateTodoQuery = `UPDATE todo SET due_date = '${dueDate}' WHERE id = ${todoId};`;
    const UpdatedTodo = await db.run(updateTodoQuery);
    response.send(`Due Date Updated`);
  }
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const delQuery = ` DELETE FROM todo WHERE id = ${todoId};`;
  const delTodo = await db.run(delQuery);
  response.send("Todo Deleted");
});

module.exports = app;
