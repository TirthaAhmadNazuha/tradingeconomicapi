import { launch } from 'puppeteer';

class Tradingeconomics {
  constructor() {
    this.domain = 'tradingeconomics.com';
    /** @type {import('puppeteer').Browser} */
    this.browser = null;
  }

  async handler(comodityName, timeFrame = '1d') {
    console.log(`Fetch ${comodityName} ${timeFrame}`);
    const browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    const page = (await browser.pages())[0];
    try {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
      await page.setUserAgent(ua);
      await page.goto(`https://tradingeconomics.com/commodity/${comodityName}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollTo(0, 500));
      await (await page.waitForSelector(`.iChart-menu2-bottom-cnt-horizontal > a[data-span="${timeFrame}"]`)).click();
      await new Promise((r) => setTimeout(r, 2000));
      const data = await page.evaluate(() => {
        return window.all_serires[0].data;
      });
      return data;
    } catch (error) {
      return { error: error.message };
    } finally {
      await browser.close();
    }
  }
}

export default Tradingeconomics;
