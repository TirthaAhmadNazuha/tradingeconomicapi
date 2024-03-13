import Tradingeconomics from './tradingeconomics.js';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { getJson, uploadJson } from './library/upload-s3.js';
import swagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import CreateCluster from './library/clustering.js';


async function main() {
  const app = fastify();
  app.register(fastifyCors);

  app.register(swagger, {
    prefix: '/docs',
    swagger: {
      info: {
        title: 'API Trading Economics',
        version: '1.0',
        description: 'Get data price of date historical\nSource: https://tradingeconomics.com/'
      },
      tags: [
        { name: 'Commodity', description: 'Get data historical price of date' }
      ]
    },
  });
  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    exposeRoute: true
  });
  const tradingeconomics = new Tradingeconomics();
  const rootDir = 'data/data_raw/tradingeconomics/commodity';
  let commodities = await getJson(`${rootDir}/commodities.json`);
  if (!commodities) {
    commodities = await tradingeconomics.getListCommodity();
    await uploadJson(`${rootDir}/commodities.json`, commodities);
  } else {
    commodities = commodities.Body;
  }

  app.register((app, opts, done) => {

    app.get('/commodity', {
      schema: {
        description: 'for commodity',
        tags: ['Commodity'],
        querystring: {
          commodityName: { type: 'string', enum: commodities },
          timeFrame: {
            type: 'string',
            enum: ['1d', '1w', '1y', '5y', '10y', '25y'],
            default: '1d'
          },
          force: { type: 'number', enum: [0, 1], default: 0 }
        },
      }
    }, async (req, res) => {
      let { commodityName, timeFrame, force } = req.query;
      timeFrame = timeFrame || '1d';
      let [date, hour] = new Date().toISOString().split('.')[0].split('T');
      hour = hour.split(':')[0];
      try {
        const path = `${rootDir}/${commodityName}/${date}/${timeFrame}.json`;
        console.log(force);
        if (!force) {
          const fromS3 = await getJson(path);
          if (fromS3) {
            if (timeFrame == '1d') {
              const lastMod = new Date(fromS3.LastModified).getTime();
              if (Math.floor(lastMod / 1000) + 3600 > Math.floor(new Date().getTime() / 1000)) {
                console.log(`from s3 [${path}]`);
                return fromS3.Body;
              }
            } else {
              console.log(`from s3 [${path}]`);
              return fromS3;
            }
          }
        }
        const fromFetch = await tradingeconomics.handler(commodityName, timeFrame);
        console.log(`from fetch: [${path}]`);
        await uploadJson(path, fromFetch);
        return fromFetch;
      } catch (err) {
        console.log(err);
        throw err;
      }
    });

    app.get('/list-commodity', {
      schema: {
        description: 'for commodity',
        tags: ['Commodity']
      }
    }, async (req, res) => {
      const path = `${rootDir}/commodities.json`;
      const fromS3 = await getJson(path);
      if (fromS3) {
        const lastMod = new Date(fromS3.LastModified).getTime();
        if (Math.floor(lastMod / 1000) + 3600 > Math.floor(new Date().getTime() / 1000)) {
          return fromS3.Body;
        }
      }
      const fromFetch = await tradingeconomics.getListCommodity();
      await uploadJson(path, fromFetch);
      return fromFetch;
    });
    done();
  });

  app.ready(() => {
    setTimeout(() => {
      app.swagger();
    }, 10);
  });

  // app.listen({ host: 'localhost', port: 5720 }, (err, address) => {
  app.listen({ host: '0.0.0.0', port: 5720 }, (err, address) => {
    if (err) throw err;
    console.log(`Server running on ${address}`);
    console.log(`Swagger api on ${address}/docs`);
  });
}

// main();
new CreateCluster(main, 10).start();
