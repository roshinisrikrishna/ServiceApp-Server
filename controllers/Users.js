import mysql from'mysql2';


const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "samplecourierdb"
  });
  
  let globalUsername = ''; 

  const users = {
    login : (req,res) =>{
        const { username, password } = req.body;
        
        const sqlLogin = 'SELECT * FROM users WHERE username = ? AND password = ?';
        
        db.query(sqlLogin, [username, password], (err, result) => {
          if (err) {
            console.log("error ", err);
            res.status(500).send('Internal Server Error');
          } else {
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
    userList: (req,res)=>{
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
    },
    forgotPassword: async(req,res)=>{
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
    create: (req, res) => {
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
      },
      getOne : (req, res) => {
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
      },
      delete : (req, res) => {
        const { id } = req.params;
        const sqlDelete = 'DELETE FROM users WHERE id= ?';
        db.query(sqlDelete, id, (error, result) => {
          if (error) {
            console.log(error);
          }
        });
      },
      edit: (req, res) => {
        const { id } = req.params;
        const { username, password, email_id, designation } = req.body;
        const userUpdate = 'UPDATE users SET username = ?, password = ?, email_id = ?, designation = ?, reset_password = ?  WHERE id = ?';
        db.query(userUpdate, [username, password, email_id, designation, 0, id], (error, result) => {
          if (error) {
            console.log(error);
          }
          res.send(result);
        });
      }
  };


export default users;