const mongoose = require('mongoose');

const SearchSchema = new mongoose.Schema({
  keyword: String,
  usernames: [String],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Search', SearchSchema);
