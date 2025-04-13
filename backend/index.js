require('dotenv').config();  
const path = require("path");
const fs = require('fs');

const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors()); 

// Verify frontend paths
const staticPath = path.join(__dirname, "../frontend/public");
const landingPagePath = path.join(staticPath, "landing_page/index.html");

// Set cache control headers for all static files
app.use((req, res, next) => {
  if (req.url.includes('.css') || req.url.includes('.js') || req.url.includes('.html')) {
    // Disable caching for development
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Serve static files with proper MIME types
app.use(express.static(staticPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Import routes
const { userRouter } = require("./routes/user");
app.use("/api/v1/user", userRouter);

// Route for the landing page
app.get("/", (req, res) => {
  // Directly serve the HTML content to bypass any potential file system issues
  const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');
  res.contentType('text/html');
  res.send(landingPageContent);
});

// Handle direct CSS requests
app.get("/landing_page/style.css", (req, res) => {
  const cssPath = path.join(staticPath, "landing_page/style.css");
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  res.contentType('text/css');
  res.send(cssContent);
});

// Handle other HTML pages
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(staticPath, "dashboard/dashborad.html"));
});

// Handle login/signup
app.get("/signin", (req, res) => {
  res.sendFile(path.join(staticPath, "new_signin_signup/index.html"));
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Log request body for POST/PUT requests (excluding sensitive data)
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const sanitizedBody = { ...req.body };
    // Redact sensitive fields if present
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    console.log('Request body:', JSON.stringify(sanitizedBody));
  }
  
  // Capture and log response data
  const originalSend = res.send;
  res.send = function(data) {
    const statusCode = res.statusCode;
    
    // Log error responses
    if (statusCode >= 400) {
      console.error(`Error response ${statusCode} for ${req.method} ${req.url}:`, data);
    }
    
    // Continue with the original send
    originalSend.call(this, data);
  };
  
  next();
});

// Handle all other routes
app.get("*", (req, res, next) => {
  // Don't interfere with API routes or static files
  if (req.url.startsWith('/api/') || 
      req.url.includes('.')) {
    return next();
  }
  
  // For other routes, redirect to landing page
  res.redirect('/');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).send('Server Error');
});

async function main() {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect("mongodb+srv://shashwatm661:oPrTnCOYRLRXwdCe@cluster0.crstdf4.mongodb.net/new");
    console.log("Connected to MongoDB");

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Visit: http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

main()