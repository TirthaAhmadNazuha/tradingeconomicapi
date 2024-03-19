import { launch } from 'puppeteer';
import { getJson, uploadJson } from './library/upload-s3.js';

class Tradingeconomics {
  constructor() {
    this.domain = 'tradingeconomics.com';
    /** @type {import('puppeteer').Browser} */
    this.browser = null;
    this.indicatorPathS3 = 'data/data_raw/tradingeconomics/indicators/';
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
      await (await page.waitForSelector(`.iChart-menu2-bottom-cnt-horizontal > a[data-span="${timeFrame}"]`, { timeout: 5000 })).click();
      await new Promise((r) => setTimeout(r, 2000));
      const data = await page.evaluate(() => {
        const unit = document.querySelector('.iChart-bodylabels-ohlc').textContent;
        return window.all_serires[0].data.map((item) => {
          return {
            x: item.x,
            value: item.y,
            date: item.date,
            percentChange: item?.percentChange,
            change: item?.change,
            unit: unit.includes('(') ? unit.split('(')[1].split(')')[0] : null
          };
        });
      });
      return data;
    } catch (error) {
      return { error: error.message };
    } finally {
      await browser.close();
    }
  }

  async getListCommodity() {
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
      await page.goto('https://tradingeconomics.com/commodities', { waitUntil: 'domcontentloaded' });
      const as = await page.$$eval('.card td a', (as) => as.map(a => a.href.split('/commodity/')[1]).filter(a => a));
      return as;
    } catch (error) {
      return { error: error.message };
    } finally {
      await browser.close();
    }
  }

  async getIndicatorCountry(country_code, findIndicator = null) {
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
      await page.goto(`https://tradingeconomics.com/${country_code}/indicators`, { waitUntil: 'domcontentloaded' });
      const indicators = await page.$$eval('#pagemenutabs li.nav-item > a[data-bs-toggle="tab"]', (items) => items.map((i) => i.textContent.trim().toLowerCase()));
      console.log(indicators);
      const dataIndicators = {};
      await Promise.all(indicators.map(async (id) => {
        dataIndicators[id] = await this.parseTableIndicatorAndSave(id, page);
        await uploadJson(this.indicatorPathS3 + `${country_code}/${id}.json`, dataIndicators[id]);
      }));
      if (typeof findIndicator == 'string') {
        return dataIndicators[findIndicator];
      }
      return indicators;
    } catch (error) {
      return { error: error.message };
    } finally {
      await browser.close();
    }
  }

  async getDataIndicator(country_code, indicator_name) {
    const fromS3 = await getJson(this.indicatorPathS3 + `${country_code}/${indicator_name}.json`);
    if (fromS3) return [200, { result: fromS3.Body }];
    const fromFetch = await this.getIndicatorCountry(country_code, indicator_name);
    if (fromFetch) return [200, { result: fromFetch }];
    return [404, { result: null }];
  }

  /** @param {import('puppeteer').Page} page */
  async parseTableIndicatorAndSave(id, page) {
    const result = await page.evaluate((id) => {
      const tableProps = [
        'indicator',
        'last',
        'previous',
        'highest',
        'lowest',
        'unit',
        'date',
      ];
      const res = [];
      try {
        document.querySelectorAll(`#${id} table tbody tr`).forEach((tr) => {
          const row = {};
          tr.querySelectorAll('td').forEach((td, i) => {
            row[tableProps[i]] = td.textContent.trim();
          });
          res.push(row);
        });
        return res;
      } catch (error) {
        return null;
      }
    }, [id]);
    return result;
  }
}

export default Tradingeconomics;
