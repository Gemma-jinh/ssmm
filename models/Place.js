const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema({
  region: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
    required: true,
  },
  name: { type: String, required: true },
  address: { type: String, required: true },
});

const Place = mongoose.model("Place", placeSchema);

module.exports = Place;
