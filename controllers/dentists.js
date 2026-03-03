const Appointment = require('../models/Appointment');
const Dentist = require('../models/Dentist');

//@desc Get all dentists
//@route GET /api/v1/dentists
//@access Public
exports.getDentists= async (req,res,next)=>{
    let query;

    //Copy req.query
    const reqQuery= {...req.query};

    //Fields to exclude
    const removeFields=['select','sort','page','limit'];

    //Loop over remove fields and delete them from reqQuery
    removeFields.forEach(param=>delete reqQuery[param]);
    console.log(reqQuery);

    //Create query string
    let queryStr=JSON.stringify(req.query);
    queryStr=queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match=>`$${match}`);

    query=Dentist.find(JSON.parse(queryStr)).populate('appointments');

    //Select
    if(req.query.select) {
        const fields=req.query.select.split(',').join(' ');
        query=query.select(fields);
    }
    //Sort
    if(req.query.sort) {
        const sortBy=req.query.sort.split(',').join(' ');
        query=query.sort(sortBy);
    }else{
        query=query.sort('-createdAt');
    }
    //Pagination
    const page=parseInt(req.query.page,10) || 1;
    const limit=parseInt(req.query.limit,10) || 25;
    const startIndex=(page-1)*limit;
    const endIndex=page*limit;

    try{
        const total=await Dentist.countDocuments();
        query=query.skip(startIndex).limit(limit);
        //Execute query
        const dentists = await query;

        const pagination ={};

        if(endIndex<total) {
            pagination.next={
                page:page+1,
                limit
            }
        }

        if(startIndex>0) {
            pagination.prev={
                page:page-1,
                limit
            }
        }
        
        res.status(200).json({success:true, count:dentists.length, pagination ,data:dentists});
    } catch(err) {
        res.status(400).json({success:false});
    }
}

//@desc Get single dentist
//@route GET /api/v1/dentists/:id
//@access Public
exports.getDentist= async(req,res,next)=>{
    try{
        const dentist = await Dentist.findById(req.params.id);
        
        if(!dentist) {
            return res.status(400).json({success:false});
        }

        res.status(200).json({success:true,data:dentist});
    } catch(err) {
        res.status(400).json({success:false});
    }
}

//@desc Create dentist
//@route POST /api/v1/dentists
//@access Private
exports.createDentist= async (req,res,next)=>{
    const dentist =await Dentist.create(req.body);
    res.status(201).json({
        success:true, 
        data: dentist
    });
}

//@desc Update single dentist
//@route PUT /api/v1/dentists/:id
//@access Private
exports.updateDentist= async(req,res,next)=>{
    try {
        const dentist = await Dentist.findByIdAndUpdate(req.params.id, req.body, {
            new:true,
            runValidators:true
        });

        if(!dentist) return res.status(400).json({success:false});

        res.status(200).json({success:true, data:dentist});
    } catch(err) {
        res.status(400).json({success:false});
    }
}

//@desc Delete single dentist
//@route DELETE /api/v1/dentists/:id
//@access Private
exports.deleteDentist= async(req,res,next)=>{
    try{
        const dentist = await Dentist.findById(req.params.id);

        if(!dentist) return res.status(400).json({success:false,message: `Dentist not found with id of ${req.params.id}`});

        await Appointment.deleteMany({dentist: req.params.id});
        await Dentist.deleteOne({_id: req.params.id});
        
        res.status(200).json({success:true, data: {}});
    } catch(err) {
        res.status(400).json({success:false});
    }
}

//@desc Get available time slots for a dentist
//@route GET /api/v1/dentists/:id/available-slots
//@access Public
exports.getAvailableSlots= async(req,res,next)=>{
    try {
        const dentist = await Dentist.findById(req.params.id);
        
        if(!dentist) {
            return res.status(404).json({success:false, message: 'Dentist not found'});
        }

        // Get date from query params (format: YYYY-MM-DD)
        const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
        const dayName = selectedDate.toLocaleString('en-US', { weekday: 'long' });

        // Check if dentist works on this day
        if(!dentist.workingDays.includes(dayName)) {
            return res.status(200).json({
                success: true,
                message: `Dentist does not work on ${dayName}`,
                date: selectedDate.toISOString().split('T')[0],
                availableSlots: []
            });
        }

        // Get all appointments for this dentist on this date
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            dentist: req.params.id,
            apptDate: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        // Parse working hours
        const [startHour, startMin] = dentist.workingHours.startTime.split(':').map(Number);
        const [endHour, endMin] = dentist.workingHours.endTime.split(':').map(Number);
        const [breakStartHour, breakStartMin] = dentist.workingHours.breakStartTime.split(':').map(Number);
        const [breakEndHour, breakEndMin] = dentist.workingHours.breakEndTime.split(':').map(Number);
        const duration = dentist.appointmentDuration;

        // Get booked times
        const bookedTimes = appointments.map(appt => {
            const time = new Date(appt.apptDate);
            const hours = time.getHours();
            const minutes = time.getMinutes();
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        });

        // Generate available slots
        const availableSlots = [];
        
        for(let hour = startHour; hour < endHour; hour++) {
            for(let min = 0; min < 60; min += duration) {
                if(hour === endHour && min > 0) break;

                const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                
                // Skip break time
                const isBreakTime = (hour > breakStartHour || (hour === breakStartHour && min >= breakStartMin)) &&
                                   (hour < breakEndHour || (hour === breakEndHour && min < breakEndMin));
                
                if(isBreakTime) continue;

                // Check if slot is already booked
                const isBooked = bookedTimes.includes(slotTime);
                
                if(!isBooked) {
                    availableSlots.push(slotTime);
                }
            }
        }

        res.status(200).json({
            success: true,
            date: selectedDate.toISOString().split('T')[0],
            dayName: dayName,
            dentistName: dentist.name,
            workingHours: dentist.workingHours,
            appointmentDuration: duration,
            availableSlots: availableSlots,
            bookedSlots: bookedTimes
        });

    } catch(err) {
        console.log(err);
        res.status(500).json({success:false, message: 'Error fetching available slots'});
    }
}
