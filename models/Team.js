// models/Team.js

const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  // 기타 필요한 필드들...
});

const Team = mongoose.model("Team", TeamSchema);

module.exports = Team;
