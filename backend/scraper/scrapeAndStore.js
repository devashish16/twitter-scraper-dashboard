const Search = require('../models/Search');
const scrapeTwitter = require('./scrapeTwitter');

const scrapeAndStore = async (keyword) => {
  const result = await scrapeTwitter(keyword);
  console.log(result)
  const search = new Search({
    keyword: result.keyword,
    usernames: result.users,
  });

  await search.save();

  return result;
};

module.exports = scrapeAndStore;
