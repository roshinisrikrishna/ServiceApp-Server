//This file contains all the function definitions of travel
import dotenv from 'dotenv';
dotenv.config();
// Import necessary module
import mysql from 'mysql2'; // MySQL database driver
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';
import PDFDocument from 'pdfkit';
import fs from 'fs';


// Create a MySQL database connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });
  

  function generatePDF(emailContent) {
    // Create a PDF document
    const doc = new PDFDocument();
    const pdfFileName = 'fuel_report.pdf'; // Name of the PDF file
  
    // Pipe the PDF document to a writable stream (create the PDF file)
    const pdfStream = fs.createWriteStream(pdfFileName);
    doc.pipe(pdfStream);
  
    // Write the email content to the PDF
    doc.font('Helvetica').fontSize(18).text(emailContent, 50, 50);
  
    // Finalize the PDF
    doc.end();
  
    return pdfFileName; // Return the name of the generated PDF file
  }
  
  const travel = {
    travelTable: (req,res) =>{
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
    },
    fuelTable: (req, res) => {
        const vehicleData = {};
      
        // Calculate the date 48 hours ago from the current date
        const fortyEightHoursAgo = new Date();
fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
      
// Format the date in MySQL datetime format (assuming your `date` column is in DATETIME format)
const changedDate = fortyEightHoursAgo.toISOString().slice(0, 19).replace('T', ' ');

// Convert `changedDate` into epoch time in milliseconds
const epochTimeMilliseconds = Date.parse(changedDate);

// Query to fetch data from vehicle_data_sgrmc for the past 48 hours
const query = `SELECT * FROM vehicle_data_sgrmc WHERE date >= '${epochTimeMilliseconds}'`;

// const query = `SELECT * FROM vehicle_data_sgrmc`;

      // console.log('changed date',changedDate);
        // Fetch data from the database
        db.query(query, (error, results) => {
          if (error) {
            console.error('Error fetching data:', error);
          } else {
            // Iterate through the fetched data
            for (const location of results) {
              const {
                date,
                speed,
                vehicleId,
                fuelLitre,
                digitalInput3
              } = location;
      
              // If vehicle data doesn't exist in the vehicleData object, initialize it
              if (!vehicleData[vehicleId]) {
                vehicleData[vehicleId] = {
                  flag: false,
                  previousRecordExists: false,
                  previousStartTime: null,
                  previousFuelConsumed: 0,
                  finalFuelRecorded: 0,
                  count:0
                  // previousEvent: null,
                };
              }
      
              // Extract variables from the vehicle data object
              const {
                flag,
                previousRecordExists,
                previousStartTime,
                previousFuelConsumed,
                finalFuelRecorded,
                count
                // previousEvent,
              } = vehicleData[vehicleId];
      
              // Check if digitalInput3 is 'yes' and speed is 0 to detect fuel fill start
              if (digitalInput3 === 'yes' && speed === 0 && !vehicleData[vehicleId].flag) {
                // Store initial fuel data
                const start_time = new Date(date);
                const initial_fuel = fuelLitre;
                const end_time = null;
                const final_fuel = 0;
                const fuelFilled = 0;
                const id = vehicleId;
      
                // Insert data into the fuelFillLog table
                const insertQuery = `INSERT INTO fuelFillLog (start_time, initial_fuel, end_time, final_fuel, vehicleId, fuelFilled) VALUES (?, ?, ?, ?, ?, ?)`;
                const insertValues = [start_time, initial_fuel, end_time, final_fuel, id, fuelFilled];
      
                db.query(insertQuery, insertValues, (error, results) => {
                  if (error) {
                    console.error('Error inserting fuel fill data:', error);
                  }
                });
      
                // Update vehicle data
                vehicleData[vehicleId].flag = true;
                vehicleData[vehicleId].previousRecordExists = true;
                vehicleData[vehicleId].previousStartTime = start_time;
                vehicleData[vehicleId].previousFuelConsumed = fuelLitre;
vehicleData[vehicleId].finalFuelRecorded = 0;
                vehicleData[vehicleId].count = 0;


              } 
              // Check if digitalInput3 is 'no' and flag is true to detect fuel fill end
              // Check if digitalInput3 is 'no' and flag is true to detect fuel fill end
else if (digitalInput3 === 'no' && vehicleData[vehicleId].flag && vehicleData[vehicleId].previousRecordExists) {
                // Store end time and calculate fuel filled

  if (fuelLitre >= vehicleData[vehicleId].finalFuelRecorded && vehicleData[vehicleId].count < 3) {
    // Check if fuelLitre is equal to the previous finalFuelRecorded
    if (fuelLitre === vehicleData[vehicleId].finalFuelRecorded) {
      console.log("equal");
      console.log("fuel litre ", fuelLitre);
      console.log("final fuel ", vehicleData[vehicleId].finalFuelRecorded);
      vehicleData[vehicleId].count = vehicleData[vehicleId].count + 1;
    } else {
      console.log("not equal");
      console.log("fuel litre ", fuelLitre);
      console.log("final fuel ", vehicleData[vehicleId].finalFuelRecorded);
      vehicleData[vehicleId].count = 0;
    }
    vehicleData[vehicleId].finalFuelRecorded = fuelLitre;
  } else {
    // Calculate the decrease in fuelLitre
    const fuelDecrease = vehicleData[vehicleId].finalFuelRecorded - fuelLitre;

    if (fuelDecrease > 1) {
      console.log("gradual decrease", fuelDecrease);
      console.log("vehicle id ", vehicleId);
      console.log("fuel current ", fuelLitre);
      console.log("previous fuel ", vehicleData[vehicleId].finalFuelRecorded);

      // Calculate the average of fuelLitre for the next 5 entries
      let totalFuelSum = 0;
      let entryCount = 0;

      // Iterate through the next entries for the same vehicleId with digitalInput3 = 'no'
      for (let i = results.indexOf(location) + 1; i < results.length; i++) {
        const nextLocation = results[i];
        if (nextLocation.vehicleId === vehicleId && nextLocation.digitalInput3 === 'no' && entryCount < 5) {
          totalFuelSum += nextLocation.fuelLitre;
          entryCount++;
        } else {
          break; // Stop iterating when the vehicle or digitalInput3 changes or when 5 entries are processed
        }
      }

      if (entryCount > 0) {
        // Calculate the average
        const averageFuelLitre = totalFuelSum / entryCount;
        console.log("Average Fuel Litre for next 5 entries:", averageFuelLitre);

        // Update the final_fuel with the average value
        vehicleData[vehicleId].finalFuelRecorded = averageFuelLitre;
        console.log("Updated final_fuel with Average Fuel Litre:", vehicleData[vehicleId].finalFuelRecorded);
      }
    }

                const end_time = new Date(date);
                const final_fuel = vehicleData[vehicleId].finalFuelRecorded;
                const fuelrefill = vehicleData[vehicleId].finalFuelRecorded - vehicleData[vehicleId].previousFuelConsumed;
                const id = vehicleId;

    // Update fuel fill data in the fuelFillLog table
    const updateQuery = `UPDATE fuelFillLog SET end_time = ?, final_fuel = ?, fuelFilled = ? WHERE vehicleId = ? AND start_time IS NOT NULL AND start_time = ?`;
    const updateValues = [end_time, vehicleData[vehicleId].finalFuelRecorded, fuelrefill, vehicleId, previousStartTime];

    db.query(updateQuery, updateValues, (error, results) => {
      if (error) {
        console.error('Error updating fuel fill data:', error);
      }
      console.log("after update ", vehicleData[vehicleId].finalFuelRecorded);
    });
      
                // Update vehicle data
                vehicleData[vehicleId].flag = false;
                vehicleData[vehicleId].previousRecordExists = false;
    vehicleData[vehicleId].previousStartTime = null;
    vehicleData[vehicleId].previousFuelConsumed = 0;
    vehicleData[vehicleId].count = 0;
  }
}
      
                }

    
      
            // This block will be executed once all data has been processed
            
    //         const now = new Date();
    // const yesterday = new Date(now);
    // yesterday.setDate(now.getDate() - 1); // Yesterday's date
    // const today = new Date();
    
    // // Convert the dates to MySQL date format (YYYY-MM-DD)
    // const yesterdayDate = yesterday.toISOString().slice(0, 10);
    // const todayDate = today.toISOString().slice(0, 10);
    
    // Modify the SQL query to filter records with start_time between yesterday and today
            
    

            setTimeout(() => {

            let noDataFound = true; // Flag to track if any data is found

            const fuelList = `SELECT * FROM fuelFillLog`;
            // const fuelList = `SELECT * FROM fuelFillLog `;

            db.query(fuelList, (err, result) => {
              if (err) {
                console.error('Error querying fuel_fill table:', err);
                // Handle the error
                res.status(500).send('Error querying fuel_fill table');
              } else {
                const fuelData = result;
        
                if (result.length > 0) {
                  // Data is found for this vehicle, set the flag to false
                  // console.log("vehicle data ",result);
        
                  noDataFound = false;
            
                  // ... Your previous code to construct the table rows ...
                }
            
              // Create an object to store fuel data by vehicleId
              const fuelDataByVehicle = {};
            
              // Organize fuel data by vehicleId
              fuelData.forEach((entry) => {
                const { vehicleId, start_time, fuelFilled } = entry;
            
                if (!fuelDataByVehicle[vehicleId]) {
                  fuelDataByVehicle[vehicleId] = [];
                }
            
                fuelDataByVehicle[vehicleId].push({ start_time, fuelFilled });
              });
            
              let emailContent = '<html><body>';
              if(!noDataFound)
              {
                emailContent += '<h2 style="text-decoration: underline;">Fuel Fill Report</h2>';
                // ...

emailContent += '<table cellpadding="10" style="margin: 0 auto; text-align: center;">'; // Center the table and center-align text
emailContent += '<tr>';
emailContent += '<th style="font-size: 18px;">Vehicle</th>';
emailContent += '<th style="font-size: 18px;">Date</th>';
emailContent += '<th style="font-size: 18px;">Time</th>';
emailContent += '<th style="font-size: 18px;">Fuel Filled</th>';
emailContent += '</tr>';

// Iterate through each vehicle's fuel data
for (const vehicleId in fuelDataByVehicle) {
  if (Object.hasOwnProperty.call(fuelDataByVehicle, vehicleId)) {
    const vehicleData = fuelDataByVehicle[vehicleId];

    // Iterate through each fuel entry for the vehicle and add rows to the table
    let totalFuelFilled = 0;
    vehicleData.forEach((entry) => {
      const { start_time, fuelFilled } = entry;
      const formattedDateTime = start_time ? formatDateWord(start_time) : 'N/A';
      const [formattedDate, formattedTime] = formattedDateTime.split(' - ');

      emailContent += '<tr>';
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${vehicleId}</td>`; // Add padding to cells
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${formattedDate}</td>`; // Add padding to cells
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${formattedTime}</td>`; // Add padding to cells
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${fuelFilled.toFixed(2)} litres</td>`; // Add padding to cells
      emailContent += '</tr>';

      totalFuelFilled += fuelFilled;
    });

    // Add total fuel filled for the vehicle as a table row
    emailContent += '<tr>';
    emailContent += `<td colspan="4" style="padding: 10px; text-align: center; font-weight: bold; font-size: 16px;">Total Fuel Filled on ${formatDateWord(
      vehicleData[0].start_time
    )} consuming ${totalFuelFilled.toFixed(2)} litres</td>`; // Add padding to cells
    emailContent += '</tr>';
  }
}

emailContent += '</table>';
emailContent += '</body></html>';

            }
            else
            {
              emailContent+= `<h2>No vehicle has filled the fuel on '${changedDate}'</h2>`;
              emailContent += '</body></html>';

            }
              // After you have prepared the email content, generate the PDF
    const pdfFileName = generatePDF(emailContent);

    // Email configuration
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: 'Fuel Data Report',
      html: emailContent,
      // attachments: [
      //   {
      //     filename: 'fuel_report.pdf',
      //     path: pdfFileName,
      //   },
      // ],
    };

    // const emailSchedule = schedule.scheduleJob('0 8 * * *', () => {
      // Send the email with the PDF attachment
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        // Handle error sending email
        res.status(500).send('Error sending email');
      } else {
        console.log('Email sent:', info.response);
        // Handle successful email sending
        res.status(200).send('Email sent successfully');
                    // Handle successful email sending
                  }
                });
              }
            // });
            });      
          }, 6000); // Delay for 6000 milliseconds (6 seconds)

          console.log("All data in the vehicle_data table has been processed.");

          }
          
        });

    },
    fuelTheft: (req, res) => {
      const vehicleData = {};

    // Calculate the date 48 hours ago from the current date
const fortyEightHoursAgo = new Date();
fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

// Format the date in MySQL datetime format (assuming your `date` column is in DATETIME format)
const changedDate = fortyEightHoursAgo.toISOString().slice(0, 19).replace('T', ' ');

// Convert `changedDate` into epoch time in milliseconds
const epochTimeMilliseconds = Date.parse(changedDate);

// console.log('changed date', changedDate);
// console.log('Epoch time in milliseconds:', epochTimeMilliseconds);
// Query to fetch data from vehicle_data_sgrmc for the past 48 hours
const query = `SELECT * FROM vehicle_data_sgrmc WHERE date >= '${epochTimeMilliseconds}'`;

// const query = `SELECT * FROM vehicle_data_sgrmc`;

    
      // Fetch data from the database
      db.query(query, (error, results) => {
        if (error) {
          console.error('Error fetching data:', error);
        } else {
          // Iterate through the fetched data
          for (const location of results) {
            const {
              date,
              speed,
              vehicleId,
              fuelLitre,
              distanceCovered
            } = location;
    
            // If vehicle data doesn't exist in the vehicleData object, initialize it
            if (!vehicleData[vehicleId]) {
              vehicleData[vehicleId] = {
                flag: false,
                previousRecordExists: false,
                previousStartTime: null,
                previousFuelConsumed: 0,
                previousDistance: 0,
                // previousEvent: null,
              };
    }

            // Extract variables from the vehicle data object
            const {
              flag,
              previousRecordExists,
              previousStartTime,
              previousFuelConsumed,
              previousDistance,
              // previousEvent,
            } = vehicleData[vehicleId];
    
            // Check if digitalInput3 is 'yes' and speed is 0 to detect fuel fill start
            if (speed === 0 && !vehicleData[vehicleId].flag) {
              // Store initial fuel data
              const start_time = new Date(date);
              const fuel = fuelLitre;
              const end_time = null;
              // const speed = speed;
              const distance = distanceCovered;
              const fueldiff = 0;
              const ododiff = 0;
              const id = vehicleId;
              const signal = false;
    
              // Insert data into the fuel_theft_table table
              const insertQuery = `INSERT INTO fuel_theft_table (start_time, end_time, fuelLitre, vehicleId, speed, odo, fueldiff, ododiff, theftSignal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              const insertValues = [start_time, end_time, fuel, id, speed, distance, fueldiff, ododiff, signal,];
    
              db.query(insertQuery, insertValues, (error, results) => {
                if (error) {
                  console.error('Error inserting fuel fill data:', error);
  }
});

// Update vehicle data
              vehicleData[vehicleId].flag = true;
              vehicleData[vehicleId].previousRecordExists = true;
              vehicleData[vehicleId].previousStartTime = start_time;
              vehicleData[vehicleId].previousFuelConsumed = fuelLitre;
              vehicleData[vehicleId].previousDistance = distanceCovered;

            } 

          else if (speed > 0 && vehicleData[vehicleId].flag) {
            // Check if there's a previous record for this vehicleId and start_time
            if (vehicleData[vehicleId].previousRecordExists && vehicleData[vehicleId].previousStartTime) {
              // Delete the record for this vehicleId and start_time
              const deleteQuery = `DELETE FROM fuel_theft_table WHERE vehicleId = ? AND start_time = ?`;
              const deleteValues = [vehicleId, vehicleData[vehicleId].previousStartTime];

             db.query(deleteQuery, deleteValues, (error, results) => {
                if (error) {
                  console.error('Error deleting fuel theft record:', error);
                }
              });
            }

            // Reset vehicle data values
            vehicleData[vehicleId].flag = false;
            // vehicleData[vehicleId].previousEvent = 'OFF';
            vehicleData[vehicleId].previousRecordExists = false;
            vehicleData[vehicleId].previousStartTime = null;
            vehicleData[vehicleId].previousFuelConsumed = 0;
            vehicleData[vehicleId].previousDistance = 0;
          }


            // Check if digitalInput3 is 'no' and flag is true to detect fuel fill end
            else if (speed === 0 && vehicleData[vehicleId].flag) {
              // Store end time and calculate fuel filled
              // const fuel = fuelLitre;
              const end_time = new Date(date);
              const fueldiff = vehicleData[vehicleId].previousFuelConsumed - fuelLitre;
              const ododiff = distanceCovered - vehicleData[vehicleId].previousDistance ;
              const start_time = vehicleData[vehicleId].previousStartTime;
              const timeDiffInMilliseconds = end_time - start_time;
              const timeDiffInMinutes = timeDiffInMilliseconds / (1000 * 60); // 1000 milliseconds per second, 60 seconds per minute


         
              if(fueldiff >= 5 && ododiff < 5 && timeDiffInMinutes <= 5){
               
                // Update vehicle data
               
            
                // Update vehicle data
                // console.log('at fuel diff >= 5');
                // console.log('vehicle id ', vehicleId);
                // console.log('start time ', formatDateWord(start_time));
                // console.log('end time ', formatDateWord(end_time));
                // console.log('time diff (minutes)', timeDiffInMinutes);
                // console.log('fuel diff ', fueldiff);



              const id = vehicleId;
              const signal = true;

              

              const updateQuery = `UPDATE fuel_theft_table SET end_time = ?, fueldiff = ?, ododiff = ?, theftSignal = ? WHERE vehicleId = ? AND start_time IS NOT NULL AND start_time = ?`;
                const updateValues = [end_time, fueldiff, ododiff, signal ,vehicleId, previousStartTime];
      
                db.query(updateQuery, updateValues, (error, results) => {
                  if (error) {
                    console.error('Error updating fuel fill data:', error);
                  }
                });
      
vehicleData[vehicleId].flag = false;
              // vehicleData[vehicleId].previousEvent = 'OFF';
                // Reset vehicle data values
                vehicleData[vehicleId].previousRecordExists = false;
                vehicleData[vehicleId].previousStartTime = null;
                vehicleData[vehicleId].previousFuelConsumed = 0;
vehicleData[vehicleId].previousDistance = 0;


              }
           
    
             

              }
            }

  
      
            // This block will be executed once all data has been processed
            // console.log("vehicle data ",vehicleData);
            const deleteQuery = 'DELETE FROM fuel_theft_table WHERE theftSignal = 0';
            db.query(deleteQuery, (err, deleteResult) => {
              if (err) {
        console.error('Error deleting data: ' + err.message);
        return;
      };
      console.log('Deleted records where theftSignal is false:', deleteResult.affectedRows);

            });      
            const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1); // Yesterday's date
    const today = new Date();
    
    // Convert the dates to MySQL date format (YYYY-MM-DD)
    const yesterdayDate = yesterday.toISOString().slice(0, 10);
    const todayDate = today.toISOString().slice(0, 10);
    
                setTimeout(() => {

    let noDataFound = true; // Flag to track if any data is found

    // Modify the SQL query to filter records with start_time between yesterday and today
    const fuelList = `SELECT * FROM fuel_theft_table WHERE theftSignal = 1 AND start_time >= '${yesterdayDate}'`;
    db.query(fuelList, (err, result) => {
      if (err) {
        console.error('Error querying fuel_theft_table:', err);
        // Handle the error
        res.status(500).send('Error querying fuel_theft_table');
      } else {
        const fuelData = result;

        if (result.length > 0) {
          // Data is found for this vehicle, set the flag to false
          // console.log("vehicle data ",result);

          noDataFound = false;
    
          // ... Your previous code to construct the table rows ...
          }

        // Create an object to store fuel data by vehicleId
        const fuelDataByVehicle = {};
    
        // Organize fuel data by vehicleId
        fuelData.forEach((entry) => {
          const { vehicleId, start_time, end_time, fueldiff, ododiff } = entry;
    
          if (!fuelDataByVehicle[vehicleId]) {
            fuelDataByVehicle[vehicleId] = [];
          }
    
          fuelDataByVehicle[vehicleId].push({ start_time, end_time, fueldiff, ododiff });
        });

        // Prepare the email content
        let emailContent = 'Fuel Theft Report\n—------------------\n';

        if(!noDataFound)
        {
    // Prepare the email content with an HTML table
 emailContent = '<html><body>';
emailContent += '<h2 style="text-decoration: underline;">Fuel Theft Report</h2>';
// ...

emailContent += '<table cellpadding="10" style="margin: 0 auto; text-align: center;">'; // Center the table and center-align text
emailContent += '<tr>';
emailContent += '<th style="font-size: 18px;">Vehicle</th>'; // Increase font size
// emailContent += '<th>Date</th>';
emailContent += '<th style="font-size: 18px;">Start Time</th>'; // Increase font size
emailContent += '<th style="font-size: 18px;">End Time</th>'; // Increase font size
emailContent += '<th style="font-size: 18px;">Fuel Theft Amount</th>'; // Increase font size
emailContent += '<th style="font-size: 18px;">Distance Difference</th>'; // Increase font size
emailContent += '</tr>';

// Iterate through each vehicle's fuel data
for (const vehicleId in fuelDataByVehicle) {
  if (Object.hasOwnProperty.call(fuelDataByVehicle, vehicleId)) {
    const vehicleData = fuelDataByVehicle[vehicleId];

    // Iterate through each fuel entry for the vehicle and add rows to the table
    let totalFuelFilled = 0;
    vehicleData.forEach((entry) => {
      const { start_time, end_time, fueldiff, ododiff } = entry;
      const formattedStartTime = formatDateWord(start_time);
      const formattedEndTime = formatDateWord(end_time);

      emailContent += '<tr>';
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${vehicleId}</td>`; // Center-align text and increase font size
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${formattedStartTime}</td>`; // Center-align text and increase font size
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${formattedEndTime}</td>`; // Center-align text and increase font size
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${fueldiff.toFixed(2)} litres</td>`; // Center-align text and increase font size
      emailContent += `<td style="padding: 10px; text-align: center; font-size: 16px;">${ododiff.toFixed(2)} km</td>`; // Center-align text and increase font size
      emailContent += '</tr>';

      totalFuelFilled += fueldiff;
    });

    // Add total fuel filled for the vehicle
    emailContent += '<tr>';
    emailContent += `<td colspan="4" style="padding: 10px; text-align: center; font-weight: bold; font-size: 16px;">Total Fuel Filled for ${vehicleId} on ${formatDateWord(
      vehicleData[0].start_time
    )} with <span style="font-weight: bold;">${totalFuelFilled.toFixed(2)} litres</span></td>`; // Set the content to bold and increase font size
    emailContent += '<td></td>'; // Placeholder for Distance Difference since it's not provided in the original data
    emailContent += '</tr>';
    }
  }

emailContent += '</table>';
emailContent += '</body></html>';



            }
            else
            {
              emailContent = '<html><body>';
              emailContent+= `<h2>No vehicle has stolen the fuel on '${yesterdayDate}'</h2>`;
              emailContent += '</body></html>';

            }
       

        // console.log('email content ',emailContent);
    
        // After you have prepared the email content, generate the PDF
        const pdfFileName = generatePDF(emailContent);
    
        // Email configuration
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: 'Fuel Theft Data Report',
          html: emailContent,
          // attachments: [
          //   {
          //     filename: 'fuel_theft_report.pdf',
          //     path: pdfFileName,
          //   },
          // ],
        };
    
        // const emailSchedule = schedule.scheduleJob('0 8 * * *', () => {
          // Send the email with the PDF attachment
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              // Handle error sending email
              res.status(500).send('Error sending email');
            } else {
              console.log('Email sent:', info.response);
              // Handle successful email sending
              res.status(200).send('Email sent successfully');
            }
          });
        // });
      }
    });
              }, 6000); // Delay for 6000 milliseconds (6 seconds)

    console.log("All data in the fuel_theft_table has been processed.");
    
        }
      });
  }  

  
  }
// Function to format the date as "Month Dayth"
// Function to format the date as "Date (Month Dayth) - Timing (Hour:Minute am/pm)"
function formatDateWord(dateString) {
  const date = new Date(dateString);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedHours = hours % 12 || 12;

  const formattedDate = `${monthNames[monthIndex]} ${day}th`;
  const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  return `${formattedDate} - ${formattedTime}`;
}
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
            // previousEvent: null,
          };
        }

        const {
          flag,
          previousRecordExists,
          previousStartLocation,
          previousDistance,
          previousFuelConsumed,
          // previousEvent,
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
          // vehicleData[vehicleId].previousEvent = 'OFF';

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


  export default travel; // Export the router to make it available for use in other files
