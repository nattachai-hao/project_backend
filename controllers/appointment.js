const Appointment = require('../models/Appointment');
const Dentist = require('../models/Dentist');

//@desc Get all appointments
//@route GET /api/v1/appointments
//@access Private
exports.getAppointments=async (req,res,next)=> {
    let query;
    //General users can see only their appointment!
    if(req.user.role !== 'admin') {
        query=Appointment.find({user:req.user.id}).populate({
            path:'dentist',
            select: 'name yearsOfExperience areaOfExpertise tel'
        });
    }else {
        if(req.params.dentistId) {
            console.log(req.params.dentistId);

            query = Appointment.find({dentist: req.params.dentistId}).populate({
                path:'dentist',
                select:'name yearsOfExperience areaOfExpertise tel'
            });
        }else {
            query=Appointment.find().populate({
                path:'dentist',
                select:'name yearsOfExperience areaOfExpertise tel'
            });
        }
    }
    try{
        const appointments = await query;

        res.status(200).json({success: true, count: appointments.length, data:appointments});
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({
            success: false,
            message:"Cannot find Appointment"
        });
    }
}

//@desc Get single appointment
//@route GET /api/v1/appointment/:id
//@access Public
exports.getAppointment= async (req,res,next) => {
    try {
        const appointment=await Appointment.findById(req.params.id).populate({
            path: 'dentist',
            select: 'name yearsOfExperience areaOfExpertise tel'
        });

        if(!appointment) {
            return res.status(404).json({success:false, message:`No appointment with the id of ${req.params.id}`});
        }

        res.status(200).json({success: true, data: appointment});
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({success: false, message: 'Cannot find Appointment'});
    }
}

//@desc Add appointment
//@route POST /api/v1/dentists/:dentistId/appointment
//@access Private
exports.addAppointment=async (req,res,next)=>{
    try{
        req.body.dentist = req.params.dentistId;

        const dentist=await Dentist.findById(req.params.dentistId);

        if(!dentist) {
            return res.status(404).json({success:false, message: `No dentist with the id of ${req.params.dentistId}`});
        }
        console.log(req.body);

        // Validate appointment date and time
        const apptDate = new Date(req.body.apptDate);
        const dayName = apptDate.toLocaleString('en-US', { weekday: 'long' });

        // Check if dentist works on this day
        if(!dentist.workingDays.includes(dayName)) {
            return res.status(400).json({success:false, message: `Dentist does not work on ${dayName}`});
        }

        // Check if time is within working hours and not during break
        const apptHour = apptDate.getUTCHours();
        const apptMin = apptDate.getUTCMinutes();
        const apptTime = `${String(apptHour).padStart(2, '0')}:${String(apptMin).padStart(2, '0')}`;

        const [startHour, startMin] = dentist.workingHours.startTime.split(':').map(Number);
        const [endHour, endMin] = dentist.workingHours.endTime.split(':').map(Number);
        const [breakStartHour, breakStartMin] = dentist.workingHours.breakStartTime.split(':').map(Number);
        const [breakEndHour, breakEndMin] = dentist.workingHours.breakEndTime.split(':').map(Number);

        // Check working hours
        const apptMinutes = apptHour * 60 + apptMin;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if(apptMinutes < startMinutes || apptMinutes >= endMinutes) {
            return res.status(400).json({
                success:false, 
                message: `Appointment time must be between ${dentist.workingHours.startTime} and ${dentist.workingHours.endTime}`
            });
        }

        // Check break time
        const breakStartMinutes = breakStartHour * 60 + breakStartMin;
        const breakEndMinutes = breakEndHour * 60 + breakEndMin;
        if(apptMinutes >= breakStartMinutes && apptMinutes < breakEndMinutes) {
            return res.status(400).json({
                success:false, 
                message: `Dentist is on break from ${dentist.workingHours.breakStartTime} to ${dentist.workingHours.breakEndTime}`
            });
        }

        // Check for conflicting appointments
        const startOfDay = new Date(apptDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(apptDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflictingAppt = await Appointment.findOne({
            dentist: req.params.dentistId,
            apptDate: {
                $gte: new Date(apptDate.getTime() - dentist.appointmentDuration * 60000),
                $lt: new Date(apptDate.getTime() + dentist.appointmentDuration * 60000)
            }
        });

        if(conflictingAppt) {
            return res.status(400).json({
                success:false, 
                message: `Time slot at ${apptTime} is already booked. Please choose another time.`
            });
        }

        //add user Id to req.body
        req.body.user = req.user.id;
        //check for exited appointment
        const existedAppointments = await Appointment.find({user:req.user.id});

         //If the user is not an admin, they can only create 1 appointment.
        if(existedAppointments.length >= 1 && req.user.role !== 'admin') {
            return res.status(400).json({success:false,message:`The user with ID ${req.user.id} has already made 1 appointment`});
        }

        const appointment = await Appointment.create(req.body);
        res.status(200).json({success:true, data: appointment});

    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({success: false, message: 'Cannot create appointment'});
    }
}

//@desc Update appointment
//@route PUT /api/v1/appointment/:id
//@access Private
exports.updateAppointment=async (req,res,next)=>{
    try{
        let appointment = await Appointment.findById(req.params.id);

        if(!appointment) {
            return res.status(400).json({success:false,message: `No appt with id ${req.params.id}`});
        }

        //Make sure user is the appointment owner
        if(appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({success:false, message:`User ${req.user.id} is not authorized to update this appointment`});
        }

        appointment = await Appointment.findByIdAndUpdate(req.params.id,req.body),{new: true, runVaildators: true};
        res.status(200).json({success:true, data: appointment});
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({success:false,message:"Cannot update Appointment"});
    }
}

//@desc Delete appointment
//@route Delete /api/v1/appointment/:id
//@access Private
exports.deleteAppointment=async (req,res,next)=>{
    try{
        const appointment = await Appointment.findById(req.params.id);

        if(!appointment) {
            return res.status(404).json({success:false,message:`No appt with id ${req.params.id}`});
        }

        //Make sure user is the appointment owner
        if(appointment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({success:false, message:`User ${req.user.id} is not authorized to delete this appointment`});
        }

        await appointment.deleteOne();

        res.status(200).json({success:true, data: {}});
    } catch(err) {
        console.log(err.stack);
        return res.status(500).json({success:false,message:"Cannot delete Appointment"});
    }
}