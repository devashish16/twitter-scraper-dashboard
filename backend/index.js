const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./utils/db');
const authRoutes = require('./routes/auth');
const scrapeRoutes = require('./routes/scrape');


dotenv.config();        // Load environment variables
connectDB();            // Connect to MongoDB

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', scrapeRoutes);
app.use('/api/scrape', require('./routes/scrape'));




app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
