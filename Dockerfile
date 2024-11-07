# Use an official Node runtime as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./


# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Build the application (uncomment if using TypeScript or need to build)
# RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"] 