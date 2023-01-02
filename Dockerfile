FROM node:alpine
WORKDIR /src/app

# Copy app dependencies
COPY package*.json ./
COPY tsconfig.json ./

# Build dependencies for production
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose ports
EXPOSE 8000 3000
CMD [ "node", "dist/src/index.js" ]