// models/Manager.js

const mongoose = require("mongoose");

const ManagerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  // 기타 필요한 필드들...
});

const Manager = mongoose.model("Manager", ManagerSchema);

module.exports = Manager;
