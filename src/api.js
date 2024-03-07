import Tradingeconomics from './tradingeconomics.js';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { getJson, uploadJson } from './library/upload-s3.js';
import swagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const app = fastify();
app.register(fastifyCors);

app.register(swagger, {
  prefix: '/docs',
  swagger: {
    info: {
      title: 'API Trading Economics',
      version: '1.0',
      description: 'Get data price of date historical'
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

app.register((app, opts, done) => {
  const tradingeconomics = new Tradingeconomics();
  const rootDir = 'data/data_raw/tradingeconomics/commodity';

  app.get('/commodity', {
    schema: {
      description: 'for commodity',
      tags: ['Commodity'],
      querystring: {
        commodityName: { type: 'string' },
        timeFrame: {
          type: 'string',
          enum: ['1d', '1w', '1y', '5y', '10y', '25y']
        }
      },
    }
  }, async (req, res) => {
    let { commodityName, timeFrame } = req.query;
    timeFrame = timeFrame || '1d';
    let [date, hour] = new Date().toISOString().split('.')[0].split('T');
    hour = hour.split(':')[0];
    try {
      const path = `${rootDir}/${commodityName}/${date}/${timeFrame}.json`;
      const fromS3 = await getJson(path);
      if (fromS3) {
        if (timeFrame == '1d') {
          const isIncludeTheHour = fromS3.find((item) => item.date.includes(`T${hour}`));
          console.log(isIncludeTheHour);
          if (isIncludeTheHour) {
            console.log(`from s3 [${path}]`);
            return fromS3;
          }
        } else {
          console.log(`from s3 [${path}]`);
          return fromS3;
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
  done();
});

app.ready(() => {
  app.swagger();
});

app.listen({ port: 5720 }, (err, address) => {
  if (err) throw err;
  console.log(`Server running on ${address}`);
});
