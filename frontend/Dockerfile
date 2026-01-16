FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY public ./public
COPY src ./src

EXPOSE 3000

ENV CI=false
CMD ["npm", "start"]
