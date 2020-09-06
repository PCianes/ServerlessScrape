const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');
const Crawls = require('../lib/models/crawls');
const utils = require('../lib/utils');

const crawls = new Crawls(process.env.CRAWLS_TABLE_NAME);

function parseEvent(event) {
  const isSNSEvent = (_.get(event, 'Records[0].EventSource') === 'aws:sns');
  const isHTTPEvent = (_.get(event, 'httpMethod'));
  if (isSNSEvent) {
    return {
      type: 'sns',
      payload: JSON.parse(event.Records[0].Sns.Message),
    };
  } else if (isHTTPEvent) {
    return {
      type: 'http',
      payload: JSON.parse(event.body),
    };
  }
  throw new Error('Unknown event type');
}

// The scrape function visits a single URL and scrapes data based on a specified mapping.
module.exports.run = (event, context, callback) => {
  console.log('scrape');
  const scrapeId = uuidv4();
  const eventBody = parseEvent(event);
  const { payload: { crawlId, url, mapping } } = eventBody;
  console.log(JSON.stringify(eventBody));

  return utils.launchBrowser()
    .then(() => utils.getHTML(url))
    .then(html => utils.scrapeHTML(html, mapping))
    .then(data => crawls.save({ crawlId, scrapeId, data }))
    .then((data) => { // Success response
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        },
        body: JSON.stringify({
          id: scrapeId,
          data,
        }),
      };
      callback(null, response);
    })
    .catch((error) => { // Chrome didn't launch correctly
      console.log(error.message);
      callback(error);
    });
};
