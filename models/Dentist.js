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
