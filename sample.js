// Import necessary modules
import express from 'express'; // Express.js framework for building web applications
const app = express(); // Create an instance of the Express app
import bodyParser from'body-parser'; // Middleware for parsing request bodies
import cors from'cors'; // Middleware for enabling CORS (Cross-Origin Resource Sharing)
import mysql from'mysql2'; // MySQL database driver
import session from'express-session'; // Middleware for managing sessions
import cookieParser from'cookie-parser'; // Middleware for parsing cookies
import userRoute from './routes/Users.js'; // Import user routes
import travelRoute from './routes/Travel.js'; // Import travel routes

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

setInterval(() => fetchAndStoreData(), 30000);

const vehicleData = {};

function fetchAndStoreData() {

  const query = `SELECT * FROM vehicle_data_sgrmc`;

  db.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
    } else {
    
      for (const location of results) {
        const {
          date,
          speed,
          vehicleId,
          fuelLitre,
          digitalInput3
        } = location;

        if (!vehicleData[vehicleId]) {
  
          vehicleData[vehicleId] = {
            flag: false,
            previousRecordExists: false,
            previousFuelConsumed: 0,
            previousEvent: null,
          };
        }

        const {
          flag,
          previousRecordExists,
          previousFuelConsumed,
          previousEvent,
        } = vehicleData[vehicleId];

      
        if (digitalInput3 === 'yes' && speed === 0 && !vehicleData[vehicleId].flag) {
          
          const start_time = new Date(date);
          const initial_fuel = fuelLitre;
          const end_time = null;
          const final_fuel = 0;
          const fuelFilled = 0;
          const id = vehicleId;
          console.log('initial fuel ',initial_fuel);
          console.log('id ',vehicleId);
          const insertQuery = `INSERT INTO fuelFillLog (start_time, initial_fuel, end_time, final_fuel, vehicleId, fuelFilled) VALUES (?, ?, ?, ?, ?, ?)`;
          const insertValues = [start_time, initial_fuel, end_time, final_fuel, id, fuelFilled];

          //pass the insertValues containing values passing as input argument
          db.query(insertQuery, insertValues, (error, results) => {
            if (error) {
              console.error('Error inserting trip:', error);
            }
          });

          vehicleData[vehicleId].flag = true;
          vehicleData[vehicleId].previousRecordExists = true;
          vehicleData[vehicleId].previousFuelConsumed = fuelLitre;
        } 
        
        else if (digitalInput3 === 'no' && vehicleData[vehicleId].flag) {
      
          const end_time = new Date(date);
          const final_fuel = fuelLitre;
          const fuelrefill = fuelLitre - vehicleData[vehicleId].previousFuelConsumed;
          const id = vehicleId;

          console.log("initial fuel ",vehicleData[vehicleId].previousFuelConsumed);
          console.log("final fuel ", fuelLitre);
          console.log("fuel filled ",fuelrefill)
          console.log('id ',vehicleId);


          vehicleData[vehicleId].flag = false;
          vehicleData[vehicleId].previousEvent = 'OFF';

          console.log("fuel filled again",fuelrefill)


          const updateQuery = `UPDATE fuelFillLog SET end_time = ?, final_fuel = ?, fuelFilled = ? WHERE vehicleId = ? AND start_time IS NOT NULL`;
          const updateValues = [end_time, fuelLitre, fuelrefill, vehicleId];

          db.query(updateQuery, updateValues, (error, results) => {
            if (error) {
              console.error('Error updating trip:', error);
            }
          });

          // Reset vehicle data values
          vehicleData[vehicleId].previousRecordExists = false;
          vehicleData[vehicleId].previousFuelConsumed = 0;
        }
      }

      // This block will be executed once all data has been processed
      // console.log("vehicle data ",vehicleData);
      console.log("All data in the vehicle_data table has been processed.");
    }
  });
}

//user- login, get details of user based on id, edit user
app.use('/user', userRoute); // Route handling user-related requests

//get travel details for each user and all users
app.use('/travel', travelRoute); // Route handling travel-related requests

// Start the server
const PORT = process.env.PORT || 5001; // Use the provided port or default to 5000

const server = app.listen(PORT, () => {
  console.log('Server running on port 5001'); // Log a message when the server starts
});
