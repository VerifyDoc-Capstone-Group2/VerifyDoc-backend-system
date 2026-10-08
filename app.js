import express from 'express';
import cors from 'cors';
import userRoute from './routes/userRoute.js';
import adminRoute from './routes/adminRoute.js';
import organizationRoute from './routes/organizationRoute.js';
import institutionRoute from './routes/institutionRoute.js';
import credentialVerificationRoute from './routes/credentialVerificationRoute.js';
import credentialRoute from './routes/credentialRoute.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.options(/.*/, cors(corsOptions)); // Enable pre-flight for all routes

app.use(express.json());

app.use('/', userRoute);
app.use('/', organizationRoute);
app.use('/', institutionRoute);
app.use('/', adminRoute);
app.use('/', credentialVerificationRoute);
app.use('/', credentialRoute);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Global error handler
app.use(errorHandler);

export default app;