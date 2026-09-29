import 'dotenv/config';
import express from 'express';
import userRoute from './routes/userRoute.js';
import organizationRoute from './routes/organizationRoute.js'
import institutionRoute from './routes/institutionRoute.js'
import { connectDB } from './config/db.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRoutes } from "./routes/authRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.use('/auth/register', userRoute);
app.use('/auth/register-organization', organizationRoute);
app.use('/auth/register-institution', institutionRoute);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Global error handler
app.use(errorHandler)

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