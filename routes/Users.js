import express from 'express';
const app = express();
import mysql from'mysql2';

const router = express.Router();
import users from '../controllers/Users.js';

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "samplecourierdb"
  });
  
  let globalUsername = ''; // Declare a global variable to store the username


router.route("/login").post(users.login);
router.route("").get(users.userList);
router.route('/forgot-password').post(users.forgotPassword);
router.route('/create').post(users.create);
router.route('/get/:id').get(users.getOne);
router.route('/:id/delete').delete(users.delete);
router.route('/update/:id').put(users.edit);

export default router;