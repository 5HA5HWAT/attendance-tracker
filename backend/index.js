require('dotenv').config();  
const path = require("path");

const express = require("express")
const mongoose = require("mongoose")
const app = express()
app.use(express.json())
app.use(require('cors')()); 

// Serve static files from frontend
app.use(express.static(path.join(__dirname, "../frontend/public")));

const { userRouter } = require("./routes/user");
app.use("/api/v1/user", userRouter);

// Default route serves index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/new_signin_signup/index.html"));
});

async function main() {
    try {
        await mongoose.connect("mongodb+srv://shashwatm661:oPrTnCOYRLRXwdCe@cluster0.crstdf4.mongodb.net/new")
        console.log("Connected to MongoDB successfully")
        app.listen(3000, () => {
            console.log("Server listening on port 3000")
        });
    } catch (err) {
        console.error("MongoDB connection error:", err)
        process.exit(1)
    }
}

main()