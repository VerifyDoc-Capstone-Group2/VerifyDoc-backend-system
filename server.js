import 'dotenv/config';
import express from 'express';
import { connectDB } from './config/db.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());


app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});


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