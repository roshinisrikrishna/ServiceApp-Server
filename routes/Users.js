// Import necessary modules and dependencies
import express from 'express'; // Express.js framework for building web applications
const app = express(); // Create an instance of the Express app
import mysql from 'mysql2'; // MySQL database driver

// Create a router instance to define routes
const router = express.Router();

//controller contains the function definitions related to users
// Import user controller functions from '../controllers/Users.js'
import users from '../controllers/Users.js';

// Create a MySQL database connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "samplecourierdb"
});

// Define routes using the router
router.route("/login").post(users.login); // POST route for user login
router.route("").get(users.userList); // GET route to fetch list of users
router.route('/forgot-password').post(users.forgotPassword); // POST route for forgot password functionality
router.route('/create').post(users.create); // POST route to create a new user
router.route('/get/:id').get(users.getOne); // GET route to fetch a specific user by ID
router.route('/:id/delete').delete(users.delete); // DELETE route to delete a user by ID
router.route('/update/:id').put(users.edit); // PUT route to update a user by ID

export default router; // Export the router to make it available for use in other files
