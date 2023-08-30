// Import necessary modules and dependencies
import express from 'express'; // Express.js framework for building web applications
const app = express(); // Create an instance of the Express app
import mysql from 'mysql2'; // MySQL database driver

// Create a router instance to define routes
const router = express.Router();

// Create a MySQL database connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "samplecourierdb"
});

// Define a route to fetch trip data based on user ID or for all users (admin)
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  //user is not admin, get details only of the particular user by id
  if (userId !== 'admin') {
    // Query to fetch trip data for a specific user
    const travelList = 'SELECT * FROM travel_log WHERE userId = ? AND start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL';

    //send the userId as parameter to the db query
    db.query(travelList, userId, (err, result) => {
      if (err) {
        console.log('Error fetching travel data:', err);
        res.status(500).send('Internal Server Error');
      } else {
        // Call the generateTripSummaryReportByUser function to process and send trip data  of particular userId
        generateTripSummaryReportByUser(res, userId);
      }
    });
  } else {
    // Query to fetch trip data for all users (admin)
    const travelList = 'SELECT * FROM travel_log WHERE start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL';

    db.query(travelList, (err, result) => {
      if (err) {
        console.log('Error fetching travel data:', err);
        res.status(500).send('Internal Server Error');
      } else {
        // Call the generateTripSummaryReport function to process and send trip data
        generateTripSummaryReport(res);
      }
    });
  }
});

// Function to format a date into the required format
function formatDate(date) {
  if (date === null) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Function to generate trip summary report for a specific user by input userId
function generateTripSummaryReportByUser(res, userId) {
  // Query to fetch trip data for a specific user, ordered by start time in ascending order
  const query = `SELECT * FROM travel_log WHERE userId = ? AND start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL ORDER BY start_time ASC`;

  //pass the userId as input param to sql query
  db.query(query, userId, (err, results) => {
    if (err) {
      res.status(500).send('Internal Server Error');
    } else {
      // Prepare the trip summary data
      // for each trip in trips returned as results from travel_log table 
      //travel_log table contains all trips' logs of all vehicles

      //store all details of trip into tripSummaryData variable
      const tripSummaryData = results.map((trip) => {

        /*display only colums from all columns in travel_log: 
        id,
        start_time, - time at which trip started
        initial_location, - starting location 
        final_location, - destination location
        distance, -distance travelled by vehicle in trip from start to destination 
        userId, - company name where that vehicle belongs
        fuelLitre, - total fuel consumed by vehicle in that particular trip
        mileage - mileage of vehicle in that trip
        */
        const { id, start_time, initial_location, end_time, final_location, distance, userId, fuelLitre, mileage } = trip;
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

      //send that filtered data of trips of particular user (userId) as result
      res.send(tripSummaryData);
    }
  });
}

// Function to generate trip summary report for all users (admin)
function generateTripSummaryReport(res) {
  // Query to fetch trip data for all users, ordered by start time
  const query = `SELECT * FROM travel_log WHERE start_time IS NOT NULL AND initial_location IS NOT NULL AND end_time IS NOT NULL AND final_location IS NOT NULL ORDER BY start_time ASC`;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send('Internal Server Error');
    } else {
// Prepare the trip summary data
      // for each trip in trips returned as results from travel_log table 
      //travel_log table contains all trips' logs of all vehicles

      //store all details of trip into tripSummaryData variable
        const tripSummaryData = results.map((trip) => {
        
           /*display only colums from all columns in travel_log: 
        id,
        start_time, - time at which trip started
        initial_location, - starting location 
        final_location, - destination location
        distance, -distance travelled by vehicle in trip from start to destination 
        userId, - company name where that vehicle belongs
        fuelLitre, - total fuel consumed by vehicle in that particular trip
        mileage - mileage of vehicle in that trip
        */
          const { id, start_time, initial_location, end_time, final_location, distance, userId, fuelLitre, mileage } = trip;
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

      //send that filtered data of trips of all users since it is the admin as result
      res.send(tripSummaryData);
    }
  });
}

// Query to fetch user IDs and API keys from the users table
const getUsersQuery = `SELECT id, apiKey FROM users`;

// Fetch user IDs and API keys and set an interval to periodically fetch and store data
db.query(getUsersQuery, (err, results) => {
  if (err) {
    // Handle error if fetching user IDs fails
  } else {
    if (results && results.length > 0) {
      results.forEach((row) => {
        const userId = row.id;
        const apiKey = row.apiKey;
        // Set an interval to periodically fetch and store data for each user
        setInterval(() => fetchAndStoreData(userId, apiKey), 30000);
      });
    }
  }
});

// Store vehicle data and manage state between interval calls
//store all vehicleData from apiUrl as array into vehicleData array variable
const vehicleData = {};

// Function to fetch data from the API and insert into the travel_log table
function fetchAndStoreData(userId) {
  // Query to fetch vehicle data based on user ID 
  //ordId and userId - each company (such as SGRMC, AK LOGISTICS, SPN )
  const query = `SELECT * FROM vehicle_data WHERE orgId LIKE ?`;
  const userIdParam = `${userId.toUpperCase()}`;

  // Fetch vehicle data from the database with company name in userIdParam as argument
  db.query(query, [userIdParam], (error, results) => {
    if (error) {
      console.error('Error fetching data:', error);
    } else {
      // Process each location data entry
      //for each entry in apiUrl - only necessary columns
      /* 
      date - date of moment stored in apiUrl
      ignitionStatus - if ON , then vehicle engine is On, else if OFF, then vehicle engine is OFF
      speed - speed of the vehicle in that moment
      address - address stored for that moment
      distanceCovered - distance recorded in that moment
      vehicleId - registration number of that vehicle involved in that moment
      fuelLitre - fuel consumed by vehicle recorded as of that moment
      */

      //store all set of necessary columns into location variable
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

        // Initialize data for a new vehicle if necessary with vehicle reg.no as index
        if (!vehicleData[vehicleId]) {
          //if particular vehicle's data is not present already in vehicleData array

          /*unique trip and corresponding trip is identified based on flag, previousEvent, 
          previousStartLocation, - store the initial location
          previousDistance - to calculate distance - store distance recorded at start of trip
          previousFuelConsumed to calculate fuel consumed - store fuel consumed recorded at start of trip
          */
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

        /*we consider the trip has started only ignitionStatus is ON and speed id=s greater than 10
        we check that same moment as start is recorded again using flag
        */
        if (ignitionStatus === 'ON' && speed > 10 && !vehicleData[vehicleId].flag) {
          // Vehicle entered ignitionOn condition

          /*trip is started so store date as start_time and address as initial_location,
          fuel, distance of starting of trip also 
          so, set end_time, final_location (destination details) as null
          */
          const start_time = new Date(date);
          const initial_location = address;
          const end_time = null;
          const final_location = null;
          const distance = distanceCovered;
          const fuel = fuelLitre;
          const id = vehicleId;
          //check mileage is not equal to 0, so mileage doesn't become infinity
          const mileage = fuel !== 0 ? distance / fuel : 0; 

          // Insert the starting of trip record into the travel_log table
          const insertQuery = `INSERT INTO travel_log (start_time, initial_location, end_time, final_location, distance, id, userId, unique_id, fuelLitre, mileage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          const insertValues = [start_time, initial_location, end_time, final_location, distance, id, userId, null, fuel, mileage];

          //pass the insertValues containing values passing as input argument
          db.query(insertQuery, insertValues, (error, results) => {
            if (error) {
              console.error('Error inserting trip:', error);
            }
          });

          // Update vehicle data flags and values
          /*store distance into previousDistance, location into previousStartLocation, fuel into previousFuelConsumed,
           at starting of the trip for calculation with destination corresponding details
           */
          vehicleData[vehicleId].flag = true;
          vehicleData[vehicleId].previousRecordExists = true;
          vehicleData[vehicleId].previousStartLocation = initial_location;
          vehicleData[vehicleId].previousDistance = distance;
          vehicleData[vehicleId].previousFuelConsumed = fuel;
        } 
        /*we consider the destination of the trip when ignitionStatus is OFF, check flag so that only first destination
        is recorded correctly */
        else if (ignitionStatus === 'OFF' && vehicleData[vehicleId].flag) {
          // Vehicle entered ignitionOff condition
          /*
          end_time - store the destination date
          final_location - store the destination address
          distance - calculate total distance from difference between start and destination distance
          fuel - calculate total fuel from difference between start and destination fuel
          mileage - at the detination of trip
          */
          const end_time = new Date(date);
          const final_location = address;
          const distance = distanceCovered - vehicleData[vehicleId].previousDistance;
          const fuel = vehicleData[vehicleId].previousFuelConsumed > fuelLitre ? vehicleData[vehicleId].previousFuelConsumed - fuelLitre : fuelLitre - vehicleData[vehicleId].previousFuelConsumed;
          const mileage = fuel !== 0 ? distance / fuel : 0;
          const id = vehicleId;

          // Update vehicle data flags and values
          /*
          For destination, flag should be true, => set to false for capture the appropriate next trip start
          previousEvent record to OFF 
          */
          vehicleData[vehicleId].flag = false;
          vehicleData[vehicleId].previousEvent = 'OFF';

          // Update trip record in the travel_log table
          const updateQuery = `UPDATE travel_log SET end_time = ?, final_location = ?, distance = ?, fuelLitre = ?, mileage = ? WHERE id = ? AND start_time IS NOT NULL AND initial_location = ?`;
          const updateValues = [end_time, final_location, distance, fuel, mileage, vehicleId, previousStartLocation];

          //updated c=values are stored into updateValues variable passed as input argument to query
          db.query(updateQuery, updateValues, (error, results) => {
            if (error) {
              console.error('Error updating trip:', error);
            }
          });

          // Reset vehicle data values
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


  export default router; // Export the router to make it available for use in other files
