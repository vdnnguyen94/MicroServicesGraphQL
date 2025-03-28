const express = require('express');
const { ApolloServer } = require('@apollo/server');  // Apollo Server 4
const { ApolloGateway } = require('@apollo/gateway');
const { RemoteGraphQLDataSource } = require('@apollo/gateway');
const { expressMiddleware } = require('@apollo/server/express4');  // Middleware for Apollo Server 4 with Express
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const config = require('./config');  // Your existing MongoDB config

// Initialize an Express application
const app = express();
const port = 4000;
app.use(cookieParser());
app.use(express.json());
// CORS Setup
const allowedOrigins = [
  'http://localhost:3010', 
  'http://localhost:3011', 
  'http://localhost:3015', 
  'http://localhost:4000', 
  'https://studio.apollographql.com',
  'https://sandbox.embed.apollographql.com',
];



// Middleware to parse cookies and set the CORS headers dynamically

app.use(function(req, res, next) {
  console.log("Debug: Incoming request URL:", req.originalUrl);
  // console.log("Debug: Incoming request headers:", req.headers); 
  // console.log("Debug: Incoming request Origin:", req.headers.origin);  
  // console.log("Debug: Incoming request Referer:", req.headers.referer);
  const origin = req.headers.origin;  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);  
  }
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
  });

// Create the Apollo Gateway
const gateway = new ApolloGateway({
  serviceList: [
    { name: 'student', url: 'http://localhost:3001/graphql' },
    { name: 'vitalSigns', url: 'http://localhost:3002/graphql' },
    { name: 'products', url: 'http://localhost:3003/graphql' },
    { name: 'auth', url: 'http://localhost:3004/graphql' },
  ],
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        // Forward incoming cookies (if needed)
        if (context.req && context.req.headers.cookie) {
          request.http.headers.set('Cookie', context.req.headers.cookie);
        }
      },
      didReceiveResponse({ response, context }) {
        // Explicitly forward 'Set-Cookie' header from the Auth microservice
        const setCookieHeader = response.http.headers.get('set-cookie');
        if (setCookieHeader && context.res) {
          context.res.setHeader('Set-Cookie', setCookieHeader);  // Set cookies in the response
        }
        return response;
      },
    });
  },
});

// Setup context for Apollo Server to handle authentication via JWT
app.use((req, res, next) => {
  console.log("Debug: Cookies received:", req.cookies); 
  console.log("Debug: Cookies School System:", req.cookies.SchoolSystem); 
  const token = req.cookies[config.jwtSecret];
  // res.on('finish', () => {
  //   console.log('Response headers:', res.getHeaders());
  // });
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
      console.log("Debug: Token is valid, user:", req.user);
    } catch (e) {
      req.user = null;
    }
  }else {
    console.log("Debug: No token found in cookies");
  }
  next();
});

// Initialize Apollo Server with the Apollo Gateway
const server = new ApolloServer({
  gateway,
  subscriptions: false,  // Disable subscriptions
  context: ({ req, res }) => ({ req, res, user: req.user  }),
});

// Adding a 10-second delay before starting the Apollo Server
setTimeout(async () => {
  await server.start();
  app.use('/graphql', 
    cors({
      origin: allowedOrigins, 
      credentials: true,
    }),
    expressMiddleware(server, { 
      context: async ({ req, res }) => ({ req, res, user: req.user || null })
    })
  );

  // Start the Express server
  app.listen(port, () =>
    console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
  );
}, 10000);  // 10-second delay
