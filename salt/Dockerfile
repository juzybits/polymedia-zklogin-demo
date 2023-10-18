FROM node:18

# Create app directory
WORKDIR /usr/src/app/zklogin-demo-salt

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the application on port 5002
EXPOSE 5002

# Command to run the application
CMD [ "node", "salt-service.js" ]
