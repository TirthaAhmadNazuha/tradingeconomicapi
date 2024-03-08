FROM jitesoft/node-base:20.7.0
COPY ./ /app
RUN node -v
RUN npm -v
WORKDIR /app
RUN npm install
EXPOSE 5720
ENTRYPOINT ["npm", "start"]
