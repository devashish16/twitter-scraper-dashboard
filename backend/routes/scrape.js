const express = require('express');
const router = express.Router();
const Search = require('../models/Search.js');
const scrapeTwitter = require('../scraper/scrapeTwitter.js');
const scrapeAndStore=require('../scraper/scrapeAndStore.js')
// POST /api/scrape/dummy
router.post('/scrape/dummy', async (req, res) => {
  try {
    const dummyData = new Search({
      keyword: '#AI',
      usernames: ['@openai', '@elonmusk', '@nasa'],
    });

    await dummyData.save();

    res.status(201).json({ message: 'Dummy data saved successfully.' });
  } catch (error) {
    console.error('Error saving dummy data:', error.message);
    res.status(500).json({ message: 'Failed to save dummy data.' });
  }
});

router.post('/scrape', async (req, res) => {
  const { keyword } = req.body;

  try {
    const result = await scrapeAndStore(keyword);
    res.status(200).json(result); // contains total, users, keyword
  } catch (err) {
    console.error('❌ Route scrape error:', err.message);
    res.status(500).json({ message: 'Scraping failed' });
  }
});
router.get('/all', async (req, res) => {
  try {
    const allSearches = await Search.find();
    res.json(allSearches);
  } catch (err) {
    console.error('Error fetching records:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
