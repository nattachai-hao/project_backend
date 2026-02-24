//import express กับ dotenvเข้า
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');

//Load env vars
dotenv.config({path:'./config/config.env'})

//Connect to database
connectDB();

//ให้app เป็นexpress
const app=express();
//cookie parser
app.use(cookieParser());
//Body parser
app.use(express.json());
//set ให้ใช้qury ได้
app.set('query parser','extended');

//Mount routers สร้างrouter เเยกเเต่ละตัว
const dentists = require (`./routes/dentists`);
const auth = require (`./routes/auth`);
const appointments = require(`./routes/appointments`);

//ถ้าreqเข้า มาที่ตำเเหน่งนี้ให้เรียกrouter นี้
app.use(`/api/v1/dentists`,dentists);
app.use(`/api/v1/auth`,auth);
app.use(`/api/v1/appointments`,appointments);

//บอกPortให้เข้าPortไหน เเละตอนnpm run ให้ขึ้นบอกว่ารันอยู่ไหน
const PORT=process.env.PORT || 5003;
const server = app.listen(PORT, console.log('Server runing in ', process.env.NODE_ENV,' mode on port ', PORT));

//Handle unhandled promise rejections
process.on('unhandledRejection',(err,promise)=> {
    console.log(`Error:${err.message}`);
    //Close server & exit
    server.close(()=>process.exit(1)); 
});