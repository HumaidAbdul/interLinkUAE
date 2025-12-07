// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authenticate   = require('./middleware/authMiddleware');


const app = express();

app.use(cors({
  origin: process.env.APP_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  index: false,
  fallthrough: false,
}));

app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/employer', require('./routes/employerRoutes'));
app.use('/api/internship', require('./routes/internshipRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));



const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
