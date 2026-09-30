import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import userRoute from './routes/userRoute.js';
import adminRoute from './routes/adminRoute.js';
import organizationRoute from './routes/organizationRoute.js';
import institutionRoute from './routes/institutionRoute.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

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

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Server is running on: http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  };
};

startServer();