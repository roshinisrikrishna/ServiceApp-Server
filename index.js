import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mysql from 'mysql2';
import axios from 'axios';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MySQLStore from 'express-mysql-session';

const app = express();
const db = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});
const sessionStore = new MySQLStore({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

let globalUsername = ''; // Declare a global variable to store the username

app.use(cors({
  origin: "http://sample.trackman.in", // Updated origin value
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(session({
  secret: 'secret', // secret key to encrypt session cookie
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  },
  store: sessionStore // set the session store
}));

app.post('/', (req, res) => {
  const { username, password } = req.body;

  const sqlLogin = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sqlLogin, [username, password], (err, result) => {
    if (err) {
      console.log("error ", err);
      res.sendStatus(500);
    } else {
      if (result.length > 0) {
        const loggedInUser = result[0].username;
        req.session.username = loggedInUser;
        res.sendStatus(200);
      } else {
        console.log('login unsuccessful');
        res.sendStatus(401);
      }
    }
  });
});

app.get('/users', (req, res) => {
  console.log('username at users list index', req.session.username);
  
  if (req.session.username) {
    if (req.session.username !== 'admin') {
      const userList = 'SELECT * FROM users WHERE username = ?';
      db.query(userList, req.session.username, (err, result) => {
        if (err) {
          console.error('Error fetching user:', err);
          res.status(500).send('Internal Server Error');
        } else {
          res.send(result);
        }
      });
    } else {
      const userList = 'SELECT * FROM users';
      db.query(userList, (err, result) => {
        if (err) {
          console.error('Error fetching users:', err);
          res.status(500).send('Internal Server Error');
        } else {
          res.send(result);
        }
      });
    }
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.post('/users/create', (req, res) => {
  const { username, password, email_id, designation } = req.body;
  const id = username.replace(/\s/g,'');

  const sqlInsert = 'INSERT INTO users (id, username, password, email_id, designation) VALUES (?, ?, ?, ?, ?)';
  db.query(sqlInsert, [id, username, password, email_id, designation], (error, result) => {
    if (error) {
      console.error('Error creating user:', error);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(result);
    }
  });
});

app.delete('/user/:id/delete', (req, res) => {
  const { id } = req.params;
  const sqlDelete = 'DELETE FROM users WHERE id = ?';
  db.query(sqlDelete, id, (error, result) => {
    if (error) {
      console.error('Error deleting user:', error);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(result);
    }
  });
});

app.get('/user/get/:id', (req, res) => {
  const { id } = req.params;
  const userGet = 'SELECT * FROM users WHERE id = ?';
  db.query(userGet, id, (err, result) => {
    if (err) {
      console.error('Error fetching user:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(result);
    }
  });
});

app.put('/user/update/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, email_id, designation } = req.body;
  const userUpdate = 'UPDATE users SET username = ?, password = ?, email_id = ?, designation = ? WHERE id = ?';
  db.query(userUpdate, [username, password, email_id, designation, id], (error, result) => {
    if (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(result);
    }
  });
});

// Function to format date in the required format (YYYY-MM-DD HH:MM:SS)
function formatDate(date) {
  if (date === null) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Function to fetch data from the travel_log table and generate trip summary report
function generateTripSummaryReportByUser(res, userId) {
  const query = `SELECT * FROM travel_log WHERE userId = ? ORDER BY start_time ASC`;
  db.query(query, userId, (err, results) => {
    if (err) {
      console.error('Error fetching travel data:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const tripSummaryData = results.map((trip) => {
        const { id, start_time, initial_location, end_time, final_location, distance } = trip;
        return {
          id,
          start_time: formatDate(start_time),
          initial_location,
          end_time: formatDate(end_time),
          final_location,
          distance,
          userId,
        };
      });
      res.send(tripSummaryData);
    }
  });
}

function generateTripSummaryReport(res) {
  const query = `SELECT * FROM travel_log ORDER BY start_time ASC`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching travel data:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const tripSummaryData = results.map((trip) => {
        const { id, start_time, initial_location, end_time, final_location, distance, userId } = trip;
        return {
          id,
          start_time: formatDate(start_time),
          initial_location,
          end_time: formatDate(end_time),
          final_location,
          distance,
          userId
        };
      });
      res.send(tripSummaryData);
    }
  });
}

app.get('/travel/:userId', (req, res) => {
  const { userId } = req.params;
  if (userId !== 'admin') {
    const travelList = 'SELECT * FROM travel_log WHERE userId = ?';
    db.query(travelList, userId, (err, result) => {
      if (err) {
        console.error('Error fetching travel data:', err);
        res.status(500).send('Internal Server Error');
      } else {
        generateTripSummaryReportByUser(res, userId);
      }
    });
  } else {
    const travelList = 'SELECT * FROM travel_log';
    db.query(travelList, (err, result) => {
      if (err) {
        console.error('Error fetching travel data:', err);
        res.status(500).send('Internal Server Error');
      } else {
        generateTripSummaryReport(res);
      }
    });
  }
});

// Fetch user IDs and API keys from the database
const getUsersQuery = `SELECT id, apiKey FROM users`;

db.query(getUsersQuery, (err, results) => {
  if (err) {
    console.error('Error fetching user IDs:', err);
  } else {
    if (results && results.length > 0) {
      results.forEach((row) => {
        const userId = row.id;
        const apiKey = row.apiKey;
        setInterval(() => fetchAndStoreData(userId, apiKey), 30000);
      });
    }
  }
});

function fetchAndStoreData(userId, apiKey) {
  const apiUrl = `http://gpsvts.net/apiMobile/getVehicleLocations?userId=${userId}&apiKey=${apiKey}`;

  axios.get(apiUrl)
    .then((response) => {
      const responseData = response.data;

      if (responseData && Array.isArray(responseData[0].vehicleLocations)) {
        const vehicleLocations = responseData[0].vehicleLocations;

        for (const location of vehicleLocations) {
          const { date, ignitionStatus, speed, address, odoDistance, vehicleId } = location;

          if (ignitionStatus === 'ON' && speed > 10) {
            const start_time = new Date(date);
            const initial_location = address;
            const end_time = null;
            const final_location = null;
            const distance = 0;
            const id = vehicleId;

            const query = `INSERT INTO travel_log (start_time, initial_location, end_time, final_location, distance, id, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [start_time, initial_location, end_time, final_location, distance, id, userId];

            db.query(query, values, (error, results) => {
              if (error) {
                console.error('Error inserting trip:', error);
              }
            });
          } else if (ignitionStatus === 'OFF') {
            const end_time = new Date(date);
            const final_location = address;
            const distance = odoDistance;
            const id = vehicleId;

            const checkQuery = `SELECT start_time, initial_location FROM travel_log WHERE id = ? AND start_time IS NOT NULL ORDER BY start_time DESC LIMIT 1`;
            const checkValues = [vehicleId];

            db.query(checkQuery, checkValues, (error, results) => {
              if (error) {
                console.error('Error checking trip start:', error);
              } else {
                if (results && results.length > 0) {
                  const { start_time, initial_location } = results[0];
                  const query = `UPDATE travel_log SET end_time = ?, final_location = ?, distance = ? WHERE id = ? AND start_time = ? AND initial_location = ?`;
                  const values = [end_time, final_location, distance, vehicleId, start_time, initial_location];

                  db.query(query, values, (error, results) => {
                    if (error) {
                      console.error('Error updating trip:', error);
                    }
                  });
                } else {
                  const query = `INSERT INTO travel_log (start_time, initial_location, end_time, final_location, distance, id, userId) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                  const values = [null, null, end_time, final_location, distance, vehicleId, userId];

                  db.query(query, values, (error, results) => {
                    if (error) {
                      console.error('Error inserting trip:', error);
                    }
                  });
                }
              }
            });
          }
        }
      }
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port 5000');
});
