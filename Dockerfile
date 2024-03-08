FROM node:20.7.0
COPY ./ /app
RUN apt-get update && \
    apt-get install -y gnupg && \
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0E98404D386FA1D9 6ED0E7B82643E131 F8D2585B8783D481 54404762BBB6E853 BDE6D2B9216EC7A8 && \
    apt-get update && \
    apt-get install -y npm && \
    apt-get clean
RUN npm install npm@latest -g
WORKDIR /app
EXPOSE 5720
ENTRYPOINT ["npm", "deploy"]
