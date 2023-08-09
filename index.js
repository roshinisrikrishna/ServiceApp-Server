import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();
import bodyParser from'body-parser';
import cors from'cors';
import mysql from'mysql2';
import axios from'axios';
import session from'express-session';
import cookieParser from'cookie-parser';
import fetch from'node-fetch';


const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "samplecourierdb"
});

let globalUsername = ''; // Declare a global variable to store the username

app.use(cors({
  origin: "http://localhost:3000", // Updated origin value
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(session({
  secret: 'secret',// secret key to encrypt session cookie
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure:false,
    maxAge: 1000*60*60*24
  }//set the session cookie properties
}))

app.post('/', (req, res) => {
  const { username, password } = req.body;
  console.log('entered login');

  const sqlLogin = 'SELECT * FROM users WHERE username = ? AND password = ?';
  console.log('entered login');
  db.query(sqlLogin, [username, password], (err, result) => {
    if (err) {
      console.log("error ", err);
    } else {
      console.log(result);
      console.log(result.length);
      if (result.length > 0) {
        const loggedInUser = result[0].username;
        globalUsername = loggedInUser; // Assign the username to the global variable
        req.session.username = loggedInUser;
        console.log('req username at login',req.session.username);
        res.sendStatus(200);
      } else {
        console.log('login unsuccessful');
        res.status(401).send('Unauthorized');
      }
    }
  });
});

app.get('/users', (req, res) => {
  console.log('entered into home index');
  console.log('username at req session', globalUsername); // Access the global variable for the username
  
  if (globalUsername) {
    if (globalUsername !== 'admin') {
      console.log('username at users list index', globalUsername);
      const userList = 'SELECT * FROM users WHERE username = ?';
      db.query(userList, globalUsername, (err, result) => {
        res.send(result);
      });
    } else {
      const userList = 'SELECT * FROM users';
      db.query(userList, (err, result) => {
        res.send(result);
      });
    }
 }
});

app.post('/users/create', (req, res) => {
  console.log('entered users create server');
  const { username, password, email_id, designation } = req.body;
  const sqlInsert = 'INSERT INTO users (id, username, password, email_id, designation) VALUES (?, ?, ?, ?, ?)';
  const id = username.replace(/\s/g,'');

  db.query(sqlInsert, [id,username, password, email_id, designation], (error, result) => {
    if (error) {
      console.log(error);
    }
    console.log('created result ',result);
  });
});
  
    app.delete('/user/:id/delete', (req, res) => {
    const { id } = req.params;
    const sqlDelete = 'DELETE FROM users WHERE id= ?';
    db.query(sqlDelete, id, (error, result) => {
      if (error) {
        console.log(error);
      }
    });
  });
  
  app.get('/user/get/:id', (req, res) => {
    const { id } = req.params;
    console.log('viewing',id);
    const userGet = 'SELECT * FROM users WHERE id = ?';
    db.query(userGet, id, (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log('result server',result);
      res.send(result);
    });
  });
  
  app.put('/user/update/:id', (req, res) => {
    const { id } = req.params;
    const { username, password, email_id, designation } = req.body;
    const userUpdate = 'UPDATE users SET username = ?, password = ?, email_id = ?, designation = ? WHERE id = ?';
    db.query(userUpdate, [username, password, email_id, designation, id], (error, result) => {
      if (error) {
        console.log(error);
      }
      res.send(result);
    });
  });
  
  
  // Function to calculate distance based on odoDistance values
  
  
  // Function to format date in the required format (YYYY-MM-DD HH:MM:SS)
  function formatDate(date) {
    if(date===null)
    {
      return null;
    }
  
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  
  // Function to fetch data from the travel_log2 table and generate trip summary report
  function generateTripSummaryReportByUser(res,userId) {
    const query = `SELECT * FROM travel_log2 WHERE userId = ? AND start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL ORDER BY start_time ASC`;
    db.query(query, userId, (err, results) => {
      if (err) {
        // console.log('error');
        res.status(500).send('Internal Server Error');
      } else {
        // Prepare the trip summary data
        const tripSummaryData = results.map((trip) => {
          const { id, start_time, initial_location, end_time, final_location, distance, userId, fuelLitre, mileage} = trip;
          return {
            id,
            start_time: formatDate(start_time),
            initial_location,
            end_time: formatDate(end_time),
            final_location,
            distance,
            userId,
            fuelLitre,
            mileage
          };
        });
        // console.log('tripSummaryData ',tripSummaryData);
        res.send(tripSummaryData);
      }
    });
  }

  //for admin
  function generateTripSummaryReport(res) {
    const query = `SELECT * FROM travel_log2 WHERE start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL ORDER BY start_time ASC`;
    db.query(query, (err, results) => {
      if (err) {
        console.log('error');
        res.status(500).send('Internal Server Error');
      } else {
        // Prepare the trip summary data
        const tripSummaryData = results.map((trip) => {
          const { id, start_time, initial_location, end_time, final_location, distance, userId, fuelLitre, mileage} = trip;
          return {
            id,
            start_time: formatDate(start_time),
            initial_location,
            end_time: formatDate(end_time),
            final_location,
            distance,
            userId,
            fuelLitre,
            mileage

          };
        });
        // console.log('tripSummaryData ',tripSummaryData);
        res.send(tripSummaryData);
      }
    });
  }
  
  // API endpoint to fetch trip summary report for a specific user
  app.get('/travel/:userId', (req, res) => {
    const { userId } = req.params;
  
    if (userId !== 'admin') {
      const travelList = 'SELECT * FROM travel_log2 WHERE userId = ? AND start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL';
  
      db.query(travelList, userId, (err, result) => {
        if (err) {
          console.log('Error fetching travel data:', err);
          res.status(500).send('Internal Server Error');
        } else {
          // console.log('result ', result);
          generateTripSummaryReportByUser(res, userId);
        }
      });
    } else {
      const travelList = 'SELECT * FROM travel_log2 WHERE start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL';
  
      db.query(travelList, (err, result) => {
        if (err) {
          console.log('Error fetching travel data:', err);
          res.status(500).send('Internal Server Error');
        } else {
          // console.log('result ', result);
          generateTripSummaryReport(res);
        }
      });
    }
  });
  
  
  const getUsersQuery = `SELECT id, apiKey FROM users`;
  
  db.query(getUsersQuery, (err, results) => {
    if (err) {
      // console.error('Error fetching user IDs:', err);
    } else {
      if (results && results.length > 0) {
        // Iterate over the user IDs and call fetchAndStoreData function for each ID
        results.forEach((row) => {
          const userId = row.id;
          const apiKey = row.apiKey;
          // console.log('apiKey at query ',apiKey);
          setInterval(()=>fetchAndStoreData(userId,apiKey), 30000);
        });
      }
    }
  });
  
  // let flag = false;
  // let previousRecordExists;
  // let previousStartLocation;
  // let previousDistance;
  // let previousFuelConsumed;
  const vehicleData = {};

  
  // Function to fetch data from the API and insert into the travel_log2 table
  function fetchAndStoreData(userId) {
    const query = `SELECT * FROM vehicle_data WHERE orgId LIKE ?`;
    const userIdParam = `${userId.toUpperCase()}`;
  
    db.query(query, [userIdParam], (error, results) => {
      if (error) {
        console.error('Error fetching data:', error);
      } else {
        for (const location of results) {
          const {
            date,
            ignitionStatus,
            speed,
            address,
            distanceCovered,
            vehicleId,
            fuelLitre,
          } = location;
  
          if (!vehicleData[vehicleId]) {
            // Initialize data for a new vehicle
            vehicleData[vehicleId] = {
              flag: false,
              previousRecordExists: false,
              previousStartLocation: null,
              previousDistance: 0,
              previousFuelConsumed: 0,
              previousEvent: null,
            };
          }
  
          const {
            flag,
            previousRecordExists,
            previousStartLocation,
            previousDistance,
            previousFuelConsumed,
            previousEvent,
          } = vehicleData[vehicleId];
  
          if (ignitionStatus === 'ON' && speed > 10 && !vehicleData[vehicleId].flag) {
            // Entered ignitionOn condition
  
            const start_time = new Date(date);
            const initial_location = address;
            const end_time = null;
            const final_location = null;
            const distance = distanceCovered;
            const fuel = fuelLitre;
            const id = vehicleId;
            const mileage = fuel !== 0 ? distance / fuel : 0;
  
            console.log("");
            console.log('id at ON', vehicleId);
            console.log("start time ", start_time);
            console.log('vehicle data array at ON ', vehicleData[vehicleId]);
            console.log('flag at ON should be FALSE', vehicleData[vehicleId].flag);
            console.log('address at ignition ON', address);
            console.log('fuel at ON ', fuel);
  
            // Insert the trip record into the travel_log2 table
            const insertQuery = `INSERT INTO travel_log2 (start_time, initial_location, end_time, final_location, distance, id, userId, unique_id, fuelLitre, mileage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const insertValues = [start_time, initial_location, end_time, final_location, distance, id, userId, null, fuel, mileage];
  
            db.query(insertQuery, insertValues, (error, results) => {
              if (error) {
                console.error('Error inserting trip:', error);
              }
            });
            vehicleData[vehicleId].flag = true;
            vehicleData[vehicleId].previousRecordExists = true;
            vehicleData[vehicleId].previousStartLocation = initial_location;
            vehicleData[vehicleId].previousDistance = distance;
            vehicleData[vehicleId].previousFuelConsumed = fuel;
          } else if (ignitionStatus === 'OFF' && vehicleData[vehicleId].flag) {
            // Entered ignitionOff condition
            const end_time = new Date(date);
            const final_location = address;
            const distance = distanceCovered - vehicleData[vehicleId].previousDistance;
            const fuel = vehicleData[vehicleId].previousFuelConsumed > fuelLitre? vehicleData[vehicleId].previousFuelConsumed - fuelLitre : fuelLitre - vehicleData[vehicleId].previousFuelConsumed;
            const mileage = fuel !== 0 ? distance / fuel : 0;
            const id = vehicleId;
  
            console.log("");
            console.log('id at OFF ', vehicleId);
            console.log("end_time ", end_time);
            console.log('vehicle data array at OFF ', vehicleData[vehicleId]);
            console.log('flag at OFF should be true', vehicleData[vehicleId].flag);

            console.log('address at ignition OFF', address);
            console.log('fuel at OFF ', fuelLitre);
            console.log('CALCULATED FUEL ',fuel );

  
            vehicleData[vehicleId].flag = false;
            vehicleData[vehicleId].previousEvent = 'OFF';
  
            const updateQuery = `UPDATE travel_log2 SET end_time = ?, final_location = ?, distance = ?, fuelLitre = ?, mileage = ? WHERE id = ? AND start_time IS NOT NULL AND initial_location = ?`;
            const updateValues = [end_time, final_location, distance, fuel, mileage, vehicleId, previousStartLocation];
  
            db.query(updateQuery, updateValues, (error, results) => {
              if (error) {
                console.error('Error updating trip:', error);
              }
            });
  
            vehicleData[vehicleId].previousRecordExists = false;
            vehicleData[vehicleId].previousStartLocation = null;
            vehicleData[vehicleId].previousDistance = 0;
            vehicleData[vehicleId].previousFuelConsumed = 0;
          }
        }
  
        // This block will be executed once all data has been processed
        console.log("All data in the vehicle_data table has been processed.");
      }
    });
  }
  
  // Schedule the data fetching and storing process to run every hour (adjust as needed)
  // Start the server
  const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('Server running on port 5000');
});
  
 
  
  
  
  
  
  
