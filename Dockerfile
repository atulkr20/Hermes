# Use Node as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (better for Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the Prisma folder and generate the client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of your code
COPY . .

# Build the TypeScript code (assumes you have a "build" script in package.json)
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Start the application (assumes you have a "start" script in package.json)
CMD ["npm", "start"]