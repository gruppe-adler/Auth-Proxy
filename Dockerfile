FROM node:current-alpine3.20

# Copy application files
COPY . /app/

# Install node dependencies for the application
WORKDIR /app
RUN npm install

# Start application
CMD ["npm", "start"]

# Declare application port
EXPOSE 80
