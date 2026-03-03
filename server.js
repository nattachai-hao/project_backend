const { setServers } = require("node:dns/promises");
setServers(["1.1.1.1", "8.8.8.8"]);

//import express กับ dotenvเข้า
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const mongoSanitize=require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const {xss} = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

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
//Sanitize data ป้ปงกันใช้คำสั่งno sql log inเข้า
app.use(mongoSanitize());
//helmet ป้องกันในส่วนheader
app.use(helmet());
//xss ป้องกันโดนใส่script มาในbody 
app.use(xss());
//rate limiting จำกันการrequest ต่อ กี่นาที
const limiter=rateLimit({
    windowMs:10*60*1000, //10 mins
    max: 100
});
app.use(limiter);
//Prevent http param pollution
app.use(hpp());
//Enable cors
app.use(cors());

const swaggerOptions={
    swaggerDefinition:{
        openapi: '3.0.0',
        info: {
            title: 'Library API',
            version: '1.0.0',
            description: 'A simple Express API'
        },
        servers: [
            {
                url: 'http://localhost:5003/api/v1'
            }
        ],
    },
    apis:['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDocs));

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