

import express from 'express';
const app = express();
import bodyParser from'body-parser';
import cors from'cors';
import mysql from'mysql2';
import session from'express-session';
import cookieParser from'cookie-parser';
import userRoute from './routes/Users.js';
import travelRoute from './routes/Travel.js';



const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "samplecourierdb"
});


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

app.use('/user',userRoute);
app.use('/travel',travelRoute);
  
  

  // Start the server
  const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log('Server running on port 5000');
});
  
 
  
  
  
  
  
  
