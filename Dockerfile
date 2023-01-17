# ------------
# ts-compiler
# ------------
FROM node:alpine as ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
# Bundle app source
COPY . .
RUN npm run prod

# ------------
# remove typescript compiler dependencies
# ------------
FROM node:alpine as ts-remover
WORKDIR /usr/app
# copy over only the compiled js files in 'dist'
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/.env ./
COPY --from=ts-compiler /usr/app/dist ./
COPY --from=ts-compiler /usr/app/public ./public
COPY --from=ts-compiler /usr/app/views ./views
# Build express app for production
RUN npm ci --only=production
EXPOSE 8000
CMD [ "node", "src/index.js" ]
