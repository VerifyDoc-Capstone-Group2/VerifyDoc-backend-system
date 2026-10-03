import express from 'express';
import cors from 'cors';
import userRoute from './routes/userRoute.js';
import adminRoute from './routes/adminRoute.js';
import organizationRoute from './routes/organizationRoute.js';
import institutionRoute from './routes/institutionRoute.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json());

app.use('/', userRoute);
app.use('/', organizationRoute);
app.use('/', institutionRoute);
app.use('/', adminRoute);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Global error handler
app.use(errorHandler);

export default app;