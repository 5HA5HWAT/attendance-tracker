const mongoose = require("mongoose")
const Schema = mongoose.Schema;

// User schema for authentication
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Subject schema to store user subjects
const subjectSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    totalClass: {
        type: Number,
        default: 0
    },
    totalPresent: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Add compound index to enforce unique subject names per user
subjectSchema.index({ userId: 1, name: 1 }, { unique: true });

// Schedule schema to store user schedules
const scheduleSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subject'
        },
        days: [String], // e.g., ['Monday', 'Wednesday', 'Friday']
        startTime: String,
        endTime: String
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Attendance schema to store daily attendance records
const attendanceSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    dayOfWeek: {
        type: String,
        enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    records: [{
        subject: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Present', 'Absent', 'No Class Today', 'Not Selected'],
            required: true
        }
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model("User", userSchema)
const Subject = mongoose.model("Subject", subjectSchema)
const Schedule = mongoose.model("Schedule", scheduleSchema)
const Attendance = mongoose.model("Attendance", attendanceSchema)

module.exports = {
    User,
    Subject,
    Schedule,
    Attendance
}