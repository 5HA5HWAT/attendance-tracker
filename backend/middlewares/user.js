const jwt = require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")

function userMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization
        
        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header missing"
            });
        }
        
        const token = authHeader.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({
                message: "Token missing"
            });
        }
        
        const decoded = jwt.verify(token, JWT_USER_PASSWORD)
        
        if (decoded && decoded.id) {
            req.userId = decoded.id
            next()
        } else {
            return res.status(401).json({
                message: "Invalid token"
            });
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Invalid token"
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Token expired"
            });
        } else {
            return res.status(500).json({
                message: "Authentication error"
            });
        }
    }
}

module.exports = {
    userMiddleware
}