const CDP = require('chrome-remote-interface');
const launchChrome = require('@serverless-chrome/lambda');
const scrapeIt = require('scrape-it');

const CHROME_OPTS = { // TODO: Refactor this to utils
  flags: ['--window-size=1280x1696', '--hide-scrollbars'],
};

function launchBrowser() {
  return launchChrome(CHROME_OPTS);
}

function getHTML(url) {
  console.log(`getHTML ${url}`);
  if (!url) {
    return Promise.reject('Missing url for getHTML');
  }

  return new Promise((resolve, reject) => {
    CDP((client) => {
      const { Page, Runtime } = client;

      // Evaluate outerHTML after page has loaded
      Page.loadEventFired(() => {
        Runtime.evaluate({ expression: 'document.body.outerHTML' }).then((result) => {
          resolve(result.result.value); // HTML
          client.close();
        });
      });

      // Enable events on domains we are interested in
      Promise.all([
        Page.enable(),
      ])
        .then(() => Page.navigate({ url }));
    }).on('error', (err) => {
      console.error('getHTML: Cannot connect to browser:', err);
      reject();
    });
  });
}

function scrapeHTML(html, mapping) {
  console.log('scrapeHTML');
  if (!html || !mapping) {
    return Promise.reject('Missing arguments for scrapeHTML');
  }

  console.log(html);
  return new Promise((resolve, reject) => {
    try {
      const data = scrapeIt.scrapeHTML(html, mapping);
      console.log(data);
      resolve(data);
    } catch (e) {
      console.log(e.message);
      reject(e);
    }
  });
}

module.exports = {
  launchBrowser,
  getHTML,
  scrapeHTML,
};
