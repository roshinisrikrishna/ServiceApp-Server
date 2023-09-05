//This file contains all the function definitions of user
import dotenv from 'dotenv';
dotenv.config();
// Import necessary module
import mysql from 'mysql2'; // MySQL database driver

// Create a MySQL database connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  
/* Declare a global variable to store the username got from login and continue 
username to all other functions */
  let globalUsername = ''; 

// Define user-related controller functions
  const users = {
    // Controller function for user login
  login: (req, res) => {
        const { username, password } = req.body;
        
// SQL query to check user credentials - username & password
        const sqlLogin = 'SELECT * FROM users WHERE username = ? AND password = ?';
        
//pass username & password as parameter to query
        db.query(sqlLogin, [username, password], (err, result) => {
          if (err) {
            console.log("error ", err);
            res.status(500).send('Internal Server Error');
          } else {
//login returned correct result only if it is > 0
            if (result.length > 0) {
              const loggedInUser = result[0];
              const loggedInUserId = loggedInUser.id;
      
              // Assign the username to the global variable
              globalUsername = loggedInUser.username;
              req.session.username = loggedInUser.username;
      
              // Send the id along with the success status
              res.status(200).json({ status: 'success', id: loggedInUserId });
            } else {
              console.log('login unsuccessful');
              res.status(401).json({ status: 'unauthorized' });
            }
          }
        });
    },
    // Controller function to fetch user list - all users
  userList: (req, res) => {
        console.log('entered into home index');
    console.log('username at req session', globalUsername); // Access the global variable for the username
    
    if (globalUsername) {

      //check if logged-in user is not admin and return only that particular user details
      if (globalUsername !== 'admin') {
        console.log('username at users list index', globalUsername);
        const userList = 'SELECT * FROM users WHERE username = ?';
        db.query(userList, globalUsername, (err, result) => {
          res.send(result);
        });
      } else {
//check if logged-in user is admin and return all user details

        const userList = 'SELECT * FROM users';
        db.query(userList, (err, result) => {
          res.send(result);
        });
      }
   }
    },
    // Controller function for initiating forgot password
  /* this is to notify admin the list of users who have requested for password change by admin
  which is notified when user clicks forgot password */
  forgotPassword: async (req, res) => {
        try {
            const { username } = req.body;
        
            // Update the reset_password column value to true for the user
            const updateQuery = 'UPDATE users SET reset_password = 1 WHERE username = ?';
            await db.query(updateQuery, [username]);
        
            // Return a success response
            res.json({ status: 'success', message: 'Password reset initiated' });
          } catch (error) {
            console.error(error);
            res.status(500).json({ status: 'error', message: 'Internal server error' });
          }
    },
// Controller function to create a new user
    create: (req, res) => {
        console.log('entered users create server');

    //pass username, password, email, designation as user details
        const { username, password, email_id, designation } = req.body;
        const sqlInsert = 'INSERT INTO users (id, username, password, email_id, designation) VALUES (?, ?, ?, ?, ?)';
        const id = username.replace(/\s/g, '');//trim the whitespace in username to store as id
      
        //pass the values as input arguments
    db.query(sqlInsert, [id, username, password, email_id, designation], (error, result) => {
          if (error) {
            console.log(error);
          }
          console.log('created result ', result);
        });
      },
      // Controller function to fetch a specific user
  getOne: (req, res) => {
        const { id } = req.params; //get id from parameter url
        console.log('viewing', id);
        const userGet = 'SELECT * FROM users WHERE id = ?';

    //pass id as input argument to sql
        db.query(userGet, id, (err, result) => {
          if (err) {
            console.log(err);
          }
          console.log('result server', result);
          res.send(result);
        });
      },
      // Controller function to delete a user
  delete: (req, res) => {
        const { id } = req.params;//get id from parameter url
        const sqlDelete = 'DELETE FROM users WHERE id= ?';

        //pass id as input argument to sql
        db.query(sqlDelete, id, (error, result) => {
          if (error) {
            console.log(error);
          }
        });
      },
// Controller function to edit/update a user
      edit: (req, res) => {
        const { id } = req.params;//get id from parameter url

    //pass username, password, email, designation as user details
        const { username, password, email_id, designation } = req.body;
        const userUpdate = 'UPDATE users SET username = ?, password = ?, email_id = ?, designation = ?, reset_password = ?  WHERE id = ?';

    //pass the values as input arguments into sql
        db.query(userUpdate, [username, password, email_id, designation, 0, id], (error, result) => {
          if (error) {
            console.log(error);
          }
          res.send(result);
        });
      }
  };

export default users; // Export the users controller
