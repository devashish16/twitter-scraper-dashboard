const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const cookiePath = path.join(__dirname, 'session', 'cookies.json');

const scrollAndScrapeUsersUntil24Hours = async (page) => {
  const seenHandles = new Set();
  const maxScrolls = 30;
  let scrolls = 0;

  while (scrolls < maxScrolls) {
    const { handles, lastDatetime } = await page.evaluate(() => {
      const handles = new Set();
      let lastTime = null;

      const articles = document.querySelectorAll('article');
      articles.forEach(article => {
        const usernameSpans = article.querySelectorAll('div[data-testid="User-Name"] a[href^="/"] span');
        let handle = null;

        usernameSpans.forEach(span => {
          const text = span.textContent.trim();
          if (text.startsWith('@')) handle = text;
        });

        if (handle) handles.add(handle);

        const timeTag = article.querySelector('time');
        if (timeTag) {
          lastTime = timeTag.getAttribute('datetime');
        }
      });

      return {
        handles: Array.from(handles),
        lastDatetime: lastTime
      };
    });

    handles.forEach(h => seenHandles.add(h));

    if (lastDatetime) {
      const tweetTime = new Date(lastDatetime);
      const now = new Date();
      const hoursDiff = (now - tweetTime) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        console.log(`Reached tweet older than 24h: ${tweetTime.toISOString()}`);
        break;
      }

      console.log(`Scroll ${scrolls + 1} — Last tweet ${hoursDiff.toFixed(1)}h ago — Users so far: ${seenHandles.size}`);
    }

    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(res => setTimeout(res, 2000));
    scrolls++;
  }

  await page.screenshot({ path: 'final_scroll_view.png', fullPage: true });

  return Array.from(seenHandles);
};

const scrapeTwitter = async (keyword) => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 80,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0 Safari/537.36"
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent);

    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('Loaded session cookies');
    }

    await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2' });

    const alreadyLoggedIn = await page.$('input[data-testid="SearchBox_Search_Input"]');
    if (!alreadyLoggedIn) {
      console.log('Logging in...');
      await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

      await page.waitForSelector('input[name="text"]', { visible: true });
      await page.type('input[name="text"]', process.env.TWITTER_USERNAME, { delay: 50 });
      await page.keyboard.press('Enter');
      await new Promise(res => setTimeout(res, 2000));

      if (await page.$('input[name="text"]')) {
        await page.type('input[name="text"]', process.env.TWITTER_USERNAME, { delay: 50 });
        await page.keyboard.press('Enter');
        await new Promise(res => setTimeout(res, 2000));
      }

      await page.waitForSelector('input[name="password"]', { visible: true, timeout: 10000 });
      await page.type('input[name="password"]', process.env.TWITTER_PASSWORD, { delay: 50 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('input[data-testid="SearchBox_Search_Input"]', { visible: true, timeout: 15000 });

      const cookies = await page.cookies();
      fs.mkdirSync(path.dirname(cookiePath), { recursive: true });
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log('Login successful — cookies saved');
    } else {
      console.log('Already logged in');
    }

    await page.type('input[data-testid="SearchBox_Search_Input"]', keyword);
    await page.keyboard.press('Enter');

    console.log('Waiting for Latest tab...');
    await page.waitForSelector('a[href*="&f=live"]', { timeout: 10000 });

    const latestTab = await page.$('a[href*="&f=live"]');
    if (latestTab) {
      await latestTab.click();
      console.log('Clicked Latest tab');
      await new Promise(res => setTimeout(res, 2000));
    }

    const users = await scrollAndScrapeUsersUntil24Hours(page);

    await browser.close();

    return {
      keyword,
      total: users.length,
      users,
    };

  } catch (err) {
    await browser.close();
    console.error('Scrape error:', err.message);
    throw new Error('Failed to scrape Twitter');
  }
};

module.exports = scrapeTwitter;
