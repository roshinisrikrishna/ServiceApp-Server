// Import necessary modules
import express from 'express'; // Express.js framework for building web applications
const app = express(); // Create an instance of the Express app
import bodyParser from 'body-parser'; // Middleware for parsing request bodies
import cors from 'cors'; // Middleware for enabling CORS (Cross-Origin Resource Sharing)
import mysql from 'mysql2'; // MySQL database driver
import session from 'express-session'; // Middleware for managing sessions
import cookieParser from 'cookie-parser'; // Middleware for parsing cookies
import userRoute from './routes/Users.js'; // Import user routes
import travelRoute from './routes/Travel.js'; // Import travel routes
import cron from 'node-cron'; // Import node-cron
import open from 'open';


// Create a MySQL database connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "samplecourierdb"
});

// Enable CORS with specific configuration
app.use(cors({
  origin: "http://localhost:3000", // Allow requests from this origin - client webURL
  methods: ["POST", "GET", "PUT", "DELETE"], // Allow these HTTP methods
  credentials: true // Allow sending cookies and other credentials
}));

// Set up request body parsers
app.use(express.json()); // Parse JSON-encoded request bodies
app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded request bodies
app.use(bodyParser.json()); // Parse JSON-encoded request bodies

// Set up cookie parsing and session management
app.use(cookieParser()); // Parse cookies from the incoming requests
app.use(session({
  secret: 'secret', // Secret key to encrypt session cookie
  resave: false, // Do not save the session if it wasn't modified
  saveUninitialized: true,
  cookie: {
    secure: false, // Not using HTTPS, so cookie is not secure
    maxAge: 1000 * 60 * 60 * 24 // Session cookie expiration time (1 day)
  }
}));

// user- login, get details of user based on id, edit user
app.use('/user', userRoute); // Route handling user-related requests

// get travel details for each user and all users
app.use('/travel', travelRoute); // Route handling travel-related requests

// ... (your existing code)

// Schedule the server to start at 8:56 PM every day
// cron.schedule('37 10 * * *', () => {
const PORT = process.env.PORT || 5001; // Use the provided port or default to 5000

const server = app.listen(PORT, () => {
  console.log('Server running on port 5001'); // Log a message when the server starts

    // Define the routes you want to open from the travelRoute
//     const routesToOpen = [
//       '/travel/fuelTheft',
//       '/travel/fuelFill'
//       // Add more routes as needed
//     ];

//     // Loop through the routes and open them in the default web browser
//     routesToOpen.forEach(route => {
//       const url = `http://localhost:5001${route}`;
//       open(url);
//     });
//   });
// }, {
//   timezone: 'Asia/Kolkata', // Set the timezone to Asia/Kolkata (New Delhi, India)
});
