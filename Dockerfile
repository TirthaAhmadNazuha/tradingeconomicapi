FROM jitesoft/node-base:20.7.0
COPY ./ /app
RUN node -v
RUN npm -v
RUN apk update \
    && apk install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apk update \
    && apk install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN npm install
EXPOSE 5720
ENTRYPOINT ["npm", "start"]
