/**
 * Backend Tests — Todo API
 * Uses mongodb-memory-server so no real DB is needed.
 * Run: cd backend && npm test
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");
const Todo = require("../models/Todo");

let mongoServer;

// ─── Setup & Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Todo.deleteMany(); // clean slate between tests
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/todos", () => {
  test("returns an empty array when no todos exist", async () => {
    const res = await request(app).get("/api/todos");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns all todos sorted by newest first", async () => {
    await Todo.create({ title: "First" });
    await Todo.create({ title: "Second" });

    const res = await request(app).get("/api/todos");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("Second"); // newest first
  });
});

describe("GET /api/todos/:id", () => {
  test("returns a single todo by ID", async () => {
    const todo = await Todo.create({ title: "Buy milk" });
    const res = await request(app).get(`/api/todos/${todo._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Buy milk");
  });

  test("returns 404 for a non-existent ID", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/todos/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Todo not found");
  });
});

describe("POST /api/todos", () => {
  test("creates a new todo successfully", async () => {
    const res = await request(app)
      .post("/api/todos")
      .send({ title: "Learn MERN" });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Learn MERN");
    expect(res.body.completed).toBe(false);
    expect(res.body._id).toBeDefined();
  });

  test("returns 400 when title is missing", async () => {
    const res = await request(app).post("/api/todos").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Title is required");
  });

  test("returns 400 when title is an empty string", async () => {
    const res = await request(app).post("/api/todos").send({ title: "   " });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Title is required");
  });
});

describe("PUT /api/todos/:id", () => {
  test("marks a todo as completed", async () => {
    const todo = await Todo.create({ title: "Write tests" });
    const res = await request(app)
      .put(`/api/todos/${todo._id}`)
      .send({ completed: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  test("updates the title of a todo", async () => {
    const todo = await Todo.create({ title: "Old title" });
    const res = await request(app)
      .put(`/api/todos/${todo._id}`)
      .send({ title: "New title" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("New title");
  });

  test("returns 404 when updating non-existent todo", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/todos/${fakeId}`)
      .send({ completed: true });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/todos/:id", () => {
  test("deletes a todo successfully", async () => {
    const todo = await Todo.create({ title: "Delete me" });
    const res = await request(app).delete(`/api/todos/${todo._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Todo deleted successfully");

    const found = await Todo.findById(todo._id);
    expect(found).toBeNull();
  });

  test("returns 404 when deleting non-existent todo", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/todos/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});
