FROM node:20-alpine

WORKDIR /app
RUN echo -e "update-notifier=false\nloglevel=error" > ~/.npmrc
COPY package.json package-lock.json ./
RUN npm install --force
COPY . .
RUN npm run build
CMD ["node", "--no-warnings", "--no-deprecation", "--experimental-specifier-resolution=node", "dist/src/main.js"]
