FROM node:20.7.0
COPY ./ /app
RUN apt-get update && \
    apt-get install -y npm
RUN npm install npm@latest -g
WORKDIR /app
EXPOSE 5720
ENTRYPOINT ["npm", "deploy"]
