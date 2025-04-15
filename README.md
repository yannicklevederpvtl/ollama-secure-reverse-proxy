# Ollama Reverse Proxy

A transparent reverse secure proxy for Ollama with OpenAI-compatible API key authentication. This proxy simply changes the port and adds API key authentication without modifying the request paths.

## Features

- Protects your Ollama server with API key authentication
- Uses the OpenAI-compatible Bearer token format
- Transparent forwarding of requests
- Simple health check endpoint
- Proper error handling

## Prerequisites

- Node.js (v14 or higher)
- npm
- Ollama server running on your machine

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yannicklevederpvtl/ollama-secure-reverse-proxy.git
   cd ollama-proxy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided template:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your secure API key and preferred port:
   ```
   API_KEY=your-secure-random-api-key
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   ```

## Usage

### Starting the Proxy

Start the server in development mode:
```bash
npm run dev
```

Or in production mode:
```bash
npm start
```

### Making Requests

Access your Ollama API through the proxy using the exact same API endpoints as Ollama, but with your API key as a Bearer token:

```bash
# List available models
curl -X GET http://localhost:3000/api/tags \
  -H "Authorization: Bearer your-secret-api-key-here"

# Generate completion
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer your-secret-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama2","prompt":"Hello, how are you?","stream":false}'
```

### Health Check

You can check if the proxy is running properly by accessing:
```bash
curl http://localhost:3000/health \
  -H "Authorization: Bearer your-secret-api-key-here"
```

## Testing

Run the test script to verify the proxy is working correctly:
```bash
npm test
```

## Deployment

### PM2 (Recommended for Production)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```bash
   pm2 start ollama-proxy.js --name ollama-proxy
   ```

3. Configure PM2 to start on boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### Using Docker

1. Create a `Dockerfile` in your project directory:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["node", "ollama-proxy.js"]
   ```

2. Build and run the Docker container:
   ```bash
   docker build -t ollama-proxy .
   docker run -p 3000:3000 --env-file .env ollama-proxy
   ```

## Security Considerations

- Never commit your `.env` file to version control
- Use a strong, random API key
- Consider implementing rate limiting for production use
- If exposing beyond localhost, use HTTPS with a proper SSL certificate
- Regularly update dependencies to patch security vulnerabilities

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.