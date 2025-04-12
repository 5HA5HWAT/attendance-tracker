const jwt=require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")

function userMiddleware(req,res,next){
    const x=req.headers.authorization
    const token = x && x.split(" ")[1];


    const decoded=jwt.verify(token,JWT_USER_PASSWORD)

    if(decoded){
        req.userId=decoded.id
        next()
    }
    else{
        res.status(403).json({
            message: "You are currently not signed in"
        })
    }
}

module.exports={
    userMiddleware:userMiddleware
}