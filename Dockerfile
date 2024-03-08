FROM jitesoft/node-base:20.7.0
COPY ./ /app
RUN node -v
RUN npm install npm@latest -g
RUN npm -v
WORKDIR /app
EXPOSE 5720
ENTRYPOINT ["npm", "deploy"]
