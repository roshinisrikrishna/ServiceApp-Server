// Import necessary modules and dependencies
import dotenv from 'dotenv';
dotenv.config();
import express from 'express'; // Express.js framework for building web applications
const app = express(); // Create an instance of the Express app
import mysql from 'mysql2'; // MySQL database driver

// Create a router instance to define routes
const router = express.Router();

import travels from '../controllers/Travel.js';

// Create a MySQL database connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Define a route to fetch fuel fill data based on fuelFill signal
router.route("/fuelFill").get(travels.fuelTable);

router.route("/fuelTheft").get(travels.fuelTheft);

// Define a route to fetch trip data based on user ID or for all users (admin)
router.route('/:userId').get(travels.travelTable);
        
           
      

  export default router;
