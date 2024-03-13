FROM jitesoft/node-base:20.7.0
COPY ./ /app
RUN apk update && apk add --no-cache bash \
        chromium \
        chromium-chromedriver
WORKDIR /app
RUN npm install
EXPOSE 5720
ENTRYPOINT ["npm", "start"]
