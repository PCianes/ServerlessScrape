const AWS = require('aws-sdk');
const https = require('https');

const httpsParams = {
  httpOptions: {
    agent: new https.Agent({
      keepAlive: false,
      ciphers: 'ALL',
      secureProtocol: 'TLSv1_method',
    }),
  },
};

/**
 * Persistence layer for storing and retrieving scraping results.
 */
class Crawls {
  constructor(tableName) {
    this.tableName = tableName;
    AWS.config.update({
      region: process.env.REGION,
    });
    this.db = new AWS.DynamoDB.DocumentClient(httpsParams);
  }

  /**
    * Retrieves the results of a crawl.
    *
    * @method find
    * @param {uuid} crawlId - identifier of a crawl run
    * @returns {Promise.Array.Object} - collection of results
    */
  find(crawlId) {
    console.log(`Crawls.find(${crawlId})`);
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': crawlId,
      },
    };
    return this.db.query(params).promise()
      .then(response => response.Items.map((item) => JSON.parse(item.data)));
  }

  /**
    * Saves the results of a single scrape.
    *
    * @method saves
    * @param {Object} args
    * @param {uuid} args.crawlId - identifier of a crawl run
    * @param {uuid} args.scrapeId - identifier of a scrape run
    * @param {uuid} args.data - Scraping result object
    * @returns {Promise.Object} - Original data
    */
  save({ crawlId, scrapeId, data }) {
    console.log('Crawls.save()');
    const params = {
      Item: {
        id: crawlId || scrapeId,
        scrapeId,
        data: JSON.stringify(data),
      },
      TableName: this.tableName,
    };
    return this.db.put(params).promise()
      .then(() => data);
  }
}

module.exports = Crawls;
