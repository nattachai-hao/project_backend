const mongoose = require('mongoose');

const DentistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please add a dentist name'],
        unique: true,
        trim: true,
        maxlength: [50,'Name can not be more than 50 characters']
    },
    clinicAddress:{
        type: String,
        required: [true,'Please add a clinic address']
    },
    yearsOfExperience: {
        type: Number,
        required: [true, 'Please add years of experience']
    },
    areaOfExpertise: {
        type: String,
        required: [true, 'Please add area of expertise']
    },
    tel: {
        type: String
    },
    region: {
        type: String,
        required: [true,'Please add a region']
    },
    workingHours: {
        startTime: {
            type: String,
            default: '09:00'
        },
        endTime: {
            type: String,
            default: '17:00'
        },
        breakStartTime: {
            type: String,
            default: '12:00'
        },
        breakEndTime: {
            type: String,
            default: '13:00'
        }
    },
    workingDays: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    appointmentDuration: {
        type: Number,
        default: 60
    }
},{
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

DentistSchema.virtual('appointments',{
    ref: 'Appointment',
    localField: '_id',
    foreignField: 'dentist',
    justOne: false
});

module.exports=mongoose.model('Dentist',DentistSchema);
