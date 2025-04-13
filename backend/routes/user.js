const { Router } = require("express")
const { User, Subject, Schedule, Attendance } = require("../db")
const jwt = require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")
const { userMiddleware } = require("../middlewares/user");
const bcrypt = require("bcrypt")
const saltRounds = 10
const zod = require("zod")
const mongoose = require("mongoose")
const { JWT_SECRET } = require('../config');

const userRouter = Router()

userRouter.post("/signup", async function(req, res) {
    try {
        console.log("Signup attempt:", req.body);
        
        // Support both field naming conventions
        const fullName = req.body.fullName || req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                details: { 
                    fullName: !fullName ? "Full name is required" : null,
                    email: !email ? "Email is required" : null,
                    password: !password ? "Password is required" : null
                }
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User with this email already exists" });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        await User.create({
            username: fullName,
            email,
            password: hashedPassword,
        });
        
        res.json({
            message: "Signup Successful"
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

userRouter.post("/signin", async function(req, res) {
    try {
        console.log("Signin attempt:", req.body);
        
        const email = req.body.email;
        const password = req.body.password;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                details: { 
                    email: !email ? "Email is required" : null,
                    password: !password ? "Password is required" : null
                }
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found:", email);
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        // Handle both hashed and unhashed passwords for backward compatibility
        let passwordMatch = false;
        
        // Check if password is already hashed
        if (user.password.startsWith('$2')) {
            // Compare hashed password
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Plain text comparison for older users (temporary)
            passwordMatch = (password === user.password);
            
            // Update to hashed password if match
            if (passwordMatch) {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                user.password = hashedPassword;
                await user.save();
                console.log("Updated user to hashed password");
            }
        }
        
        if (!passwordMatch) {
            console.log("Password mismatch for:", email);
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        console.log("Login successful for:", email);
        
        // Create and sign JWT
        const token = jwt.sign({
            id: user._id,
        }, JWT_USER_PASSWORD || 'fallback-secret-key');
        
        return res.status(200).json({ 
            message: "Signin successful", 
            token,
            username: user.username || ""
        });
    } catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
});

// Get user subjects
userRouter.get("/subjects", userMiddleware, async function(req, res) {
    try {
        const subjects = await Subject.find({ userId: req.userId });
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch subjects" });
    }
})

/* 
// Get a single subject by ID - REMOVED DURING ROLLBACK
userRouter.get("/subjects/:id", userMiddleware, async function(req, res) {
    try {
        const subjectId = req.params.id;
        
        // Verify the subject belongs to the user
        const subject = await Subject.findOne({
            _id: subjectId,
            userId: req.userId
        });
        
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or not authorized" });
        }
        
        // Get attendance records for this subject
        const attendanceRecords = await Attendance.find({
            userId: req.userId,
            'records.subject': subject.name
        });
        
        // Calculate attendance statistics
        const presentCount = subject.totalPresent || 0;
        const totalClasses = subject.totalClass || 0;
        
        // Calculate streak information
        let currentStreak = 0;
        let bestStreak = 0;
        let latestDate = null;
        
        // Sort attendance records by date (newest first)
        const sortedRecords = attendanceRecords
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate streaks from attendance records
        let tempStreak = 0;
        for (const record of sortedRecords) {
            const subjectRecord = record.records.find(r => r.subject === subject.name);
            
            if (!subjectRecord) continue;
            
            if (!latestDate) {
                latestDate = new Date(record.date);
            }
            
            if (subjectRecord.status === 'Present') {
                tempStreak++;
                if (tempStreak > bestStreak) {
                    bestStreak = tempStreak;
                }
            } else {
                // Break streak on absence
                if (tempStreak > 0) {
                    if (currentStreak === 0) {
                        currentStreak = tempStreak;
                    }
                    tempStreak = 0;
                }
            }
        }
        
        // If we're still counting a streak at the end, update current streak
        if (tempStreak > 0 && currentStreak === 0) {
            currentStreak = tempStreak;
        }
        
        // Calculate total hours (assuming each class is 1 hour for simplicity)
        const totalHours = presentCount;
        
        // Get recent activity records (last 10)
        const recentActivities = sortedRecords
            .slice(0, 10)
            .map(record => {
                const subjectRecord = record.records.find(r => r.subject === subject.name);
                if (!subjectRecord) return null;
                
                return {
                    date: record.date,
                    status: subjectRecord.status,
                    notes: subjectRecord.notes || ''
                };
            })
            .filter(activity => activity !== null);
        
        // Prepare attendance history data (last 30 days)
        const historyData = {
            labels: [],
            present: [],
            absent: [],
            late: []
        };
        
        // Calculate attendance percentage
        const attendancePercentage = totalClasses > 0 
            ? Math.round((presentCount / totalClasses) * 100) 
            : 0;
        
        // Send the response with all the subject details
        res.json({
            _id: subject._id,
            name: subject.name,
            presentCount,
            absentCount: totalClasses - presentCount,
            lateCount: 0, // Add actual late count if you track this
            totalClasses,
            attendancePercentage,
            currentStreak,
            bestStreak,
            totalHours,
            activities: recentActivities,
            history: historyData
        });
    } catch (error) {
        console.error("Error fetching subject details:", error);
        res.status(500).json({ error: "Failed to fetch subject details" });
    }
})
*/

// Create a new subject
userRouter.post("/subjects", userMiddleware, async function(req, res) {
    const subjectSchema = zod.object({
        name: zod.string().nonempty("Subject name is required")
    })
    
    const result = subjectSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    try {
        const { name } = req.body;
        
        // Check if a subject with the same name exists for this user
        const existingSubject = await Subject.findOne({ 
            userId: req.userId,
            name: name
        });
        
        if (existingSubject) {
            // Return success with existing subject instead of error
            return res.status(200).json({ 
                message: "Subject already exists", 
                subject: existingSubject,
                existing: true
            });
        }
        
        // Create new subject if it doesn't exist
        const newSubject = await Subject.create({
            name,
            userId: req.userId,
            totalClass: 0,
            totalPresent: 0
        });
        
        res.status(201).json({ 
            message: "Subject created successfully", 
            subject: newSubject 
        });
    } catch (error) {
        console.error("Error creating subject:", error);
        res.status(500).json({ error: "Failed to create subject", details: error.message });
    }
})

// Delete a subject
userRouter.delete("/subjects/:id", userMiddleware, async function(req, res) {
    try {
        const subjectId = req.params.id;
        
        // Verify the subject belongs to the user
        const subject = await Subject.findOne({
            _id: subjectId,
            userId: req.userId
        });
        
        if (!subject) {
            return res.status(404).json({ error: "Subject not found or not authorized" });
        }
        
        // Check if subject is used in a schedule
        const schedule = await Schedule.findOne({
            userId: req.userId,
            'subjects.subjectId': subjectId
        });
        
        if (schedule) {
            // Remove the subject from the schedule
            schedule.subjects = schedule.subjects.filter(item => 
                item.subjectId.toString() !== subjectId.toString()
            );
            await schedule.save();
        }
        
        // Also delete attendance records for this subject
        if (mongoose.models.Attendance) {
            await Attendance.deleteMany({
                userId: req.userId,
                'records.subject': subject.name
            });
        }
        
        // Delete the subject
        await Subject.deleteOne({ _id: subjectId });
        
        res.json({ 
            message: "Subject deleted successfully",
            subjectName: subject.name
        });
    } catch (error) {
        console.error("Error deleting subject:", error);
        res.status(500).json({ error: "Failed to delete subject" });
    }
})

// Get schedule
userRouter.get("/schedule", userMiddleware, async function(req, res) {
    try {
        const schedule = await Schedule.findOne({ userId: req.userId })
            .populate('subjects.subjectId');
        
        if (!schedule) {
            return res.status(200).json({ hasSchedule: false });
        }
        
        res.json({ 
            hasSchedule: true,
            schedule 
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch schedule" });
    }
})

// Create or update schedule
userRouter.post("/schedule", userMiddleware, async function(req, res) {
    const scheduleSchema = zod.object({
        subjects: zod.array(zod.object({
            subjectId: zod.string(),
            days: zod.array(zod.string()),
            startTime: zod.string(),
            endTime: zod.string()
        }))
    })
    
    const result = scheduleSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    try {
        const { subjects } = req.body;
        
        // Process each subject to get actual IDs
        const processedSubjects = [];
        
        for (const item of subjects) {
            // Check if subjectId is a MongoDB ObjectId or a subject name
            let subjectId = item.subjectId;
            
            if (!mongoose.Types.ObjectId.isValid(subjectId)) {
                // It's a subject name, find the corresponding subject
                const subject = await Subject.findOne({ 
                    userId: req.userId,
                    name: subjectId
                });
                
                if (!subject) {
                    // Create the subject if it doesn't exist
                    const newSubject = await Subject.create({
                        userId: req.userId,
                        name: subjectId,
                        totalClass: 0,
                        totalPresent: 0
                    });
                    
                    subjectId = newSubject._id;
                } else {
                    subjectId = subject._id;
                }
            }
            
            processedSubjects.push({
                subjectId,
                days: item.days,
                startTime: item.startTime,
                endTime: item.endTime
            });
        }
        
        // Check if schedule already exists
        let schedule = await Schedule.findOne({ userId: req.userId });
        
        if (schedule) {
            // Update existing schedule
            schedule.subjects = processedSubjects;
            schedule.updated_at = new Date();
            await schedule.save();
        } else {
            // Create new schedule
            schedule = await Schedule.create({
                userId: req.userId,
                subjects: processedSubjects,
            });
        }
        
        res.json({ 
            message: "Schedule updated successfully", 
            schedule 
        });
    } catch (error) {
        console.error("Failed to update schedule:", error);
        res.status(500).json({ error: "Failed to update schedule" });
    }
})

// Get user dashboard data
userRouter.get("/dashboard", userMiddleware, async function(req, res) {
    try {
        console.log(`Fetching dashboard data for user ${req.userId}`);
        const subjects = await Subject.find({ userId: req.userId });
        const user = await User.findById(req.userId).select('-password');
        const schedule = await Schedule.findOne({ userId: req.userId })
            .populate('subjects.subjectId');
        
        console.log(`Found ${subjects.length} subjects for user ${req.userId}`);
        
        res.json({
            user,
            subjects: subjects || [],
            hasSchedule: !!schedule,
            schedule: schedule || null
        });
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
})

// Record attendance for a day
userRouter.post("/attendance", userMiddleware, async function(req, res) {
    const attendanceSchema = zod.object({
        date: zod.string().refine(val => !isNaN(new Date(val).getTime()), {
            message: "Invalid date format"
        }),
        dayOfWeek: zod.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
        records: zod.array(zod.object({
            subject: zod.string(),
            status: zod.enum(['Present', 'Absent', 'No Class Today', 'Not Selected'])
        }))
    });
    
    const result = attendanceSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors });
    }
    
    try {
        const { date, dayOfWeek, records } = req.body;
        const dateObj = new Date(date);
        
        // Better date formatting for debug purposes
        const formattedDate = dateObj.toISOString().split('T')[0];
        console.log(`Recording attendance for user ${req.userId} on ${formattedDate}`);
        
        // First, delete any existing attendance record for this day to prevent duplicates
        // Get start and end of the day for comparison
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        console.log(`Looking for existing attendance between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);
        
        // Find and delete existing attendance record for this day
        const existingAttendance = await Attendance.findOne({
            userId: req.userId,
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        });
        
        if (existingAttendance) {
            console.log(`Found existing attendance record (${existingAttendance._id}) for ${formattedDate}, deleting it`);
            await Attendance.deleteOne({ _id: existingAttendance._id });
        }
        
        // Update subject attendance counts first
        const updatedSubjects = [];
        
        // If we had existing attendance, we need to reverse previous counts
        if (existingAttendance) {
            for (const oldRecord of existingAttendance.records) {
                if (oldRecord.status === 'Present' || oldRecord.status === 'Absent') {
                    const subject = await Subject.findOne({ 
                        userId: req.userId,
                        name: oldRecord.subject
                    });
                    
                    if (subject) {
                        // Decrement totalClass for both present and absent
                        subject.totalClass = Math.max(0, subject.totalClass - 1);
                        
                        // Only decrement totalPresent if present
                        if (oldRecord.status === 'Present') {
                            subject.totalPresent = Math.max(0, subject.totalPresent - 1);
                        }
                        
                        await subject.save();
                        updatedSubjects.push(subject.name);
                    }
                }
            }
        }
        
        // Now process the new records
        for (const record of records) {
            if (record.status === 'Present' || record.status === 'Absent') {
                const subject = await Subject.findOne({ 
                    userId: req.userId,
                    name: record.subject
                });
                
                if (subject) {
                    // Increment totalClass for both present and absent
                    subject.totalClass += 1;
                    
                    // Only increment totalPresent if present
                    if (record.status === 'Present') {
                        subject.totalPresent += 1;
                    }
                    
                    await subject.save();
                } else {
                    // If subject doesn't exist in DB but is in attendance records, create it
                    await Subject.create({
                        userId: req.userId,
                        name: record.subject,
                        totalClass: 1,
                        totalPresent: record.status === 'Present' ? 1 : 0
                    });
                }
            }
        }
        
        // Create new attendance record
        const attendance = await Attendance.create({
            userId: req.userId,
            date: dateObj,
            dayOfWeek,
            records
        });
        
        res.json({
            message: existingAttendance ? "Attendance updated successfully" : "Attendance recorded successfully",
            attendance
        });
    } catch (error) {
        console.error("Failed to record attendance:", error);
        res.status(500).json({ error: "Failed to record attendance" });
    }
});

// Get attendance for a specific day
userRouter.get("/attendance/day", userMiddleware, async function(req, res) {
    try {
        const { date } = req.query;
        
        if (!date || isNaN(new Date(date).getTime())) {
            return res.status(400).json({ error: "Valid date parameter is required" });
        }
        
        const dateObj = new Date(date);
        
        const attendance = await Attendance.findOne({
            userId: req.userId,
            date: {
                $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                $lt: new Date(dateObj.setHours(23, 59, 59, 999))
            }
        });
        
        if (!attendance) {
            return res.json({
                hasAttendance: false,
                records: []
            });
        }
        
        res.json({
            hasAttendance: true,
            attendance
        });
    } catch (error) {
        console.error("Failed to fetch attendance:", error);
        res.status(500).json({ error: "Failed to fetch attendance" });
    }
});

// Get attendance for current day (today)
userRouter.get("/attendance/today", userMiddleware, async function(req, res) {
    try {
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[today.getDay()];
        
        // First check if there's an attendance record for today
        const attendance = await Attendance.findOne({
            userId: req.userId,
            date: {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999))
            }
        });
        
        if (attendance) {
            return res.json({
                hasAttendance: true,
                attendance
            });
        }
        
        // If no attendance record, get scheduled subjects for today
        const schedule = await Schedule.findOne({ userId: req.userId });
        
        // If no schedule, return empty
        if (!schedule) {
            return res.json({
                hasAttendance: false,
                dayOfWeek,
                records: []
            });
        }
        
        // Get all subjects
        const subjects = await Subject.find({ userId: req.userId });
        
        // Get subjects scheduled for today
        const todaySubjects = [];
        
        if (schedule && schedule.subjects) {
            for (const item of schedule.subjects) {
                if (item.days.includes(dayOfWeek)) {
                    const subject = subjects.find(s => s._id.toString() === item.subjectId.toString());
                    if (subject) {
                        todaySubjects.push(subject.name);
                    }
                }
            }
        }
        
        res.json({
            hasAttendance: false,
            dayOfWeek,
            records: todaySubjects.map(subject => ({
                subject,
                status: 'Not Selected'
            }))
        });
    } catch (error) {
        console.error("Failed to fetch today's attendance:", error);
        res.status(500).json({ error: "Failed to fetch today's attendance" });
    }
});

module.exports = {
    userRouter,
}