const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const todoRoutes = require("./routes/todos");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/todos", todoRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "MERN Todo API is running 🚀" });
});

// Connect to MongoDB and start server (only when not in test mode)
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mern-todo";

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected");
      app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => console.error("MongoDB connection error:", err));
}

module.exports = app;
