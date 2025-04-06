const { Router } = require("express")
const { userModel,subjectModel } = require("../db")
const jwt = require("jsonwebtoken")
const { JWT_USER_PASSWORD } = require("../config")
const { userMiddleware } = require("../middleware/user");
const bcrypt = require("bcrypt")
const saltRounds = 10
const zod = require("zod")

const userRouter = Router()

userRouter.post("/signup",async function(req,res){
    
    const signupSchema = zod.object({
        firstName: zod.string().nonempty("First name is required"),
        lastName: zod.string().nonempty("Last name is required"),
        email: zod.string().email("Invalid email address"),
        password: zod.string().min(6, "Password must be at least 6 characters long")
    })
    
    const result = signupSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    const {firstName,lastName,email,password}=req.body

    const hashedPassword=await bcrypt.hash(password,saltRounds)

    await userModel.create({
        firstName:firstName,
        lastName:lastName,
        email:email,
        password:hashedPassword
    })

    res.json({
        message:"Signup Successful"
    })
})

userRouter.post("/login",async function(req,res){
    
    const singinSchema=zod.object({
        email: zod.string().email("Invalid email address"),
        password: zod.string().min(6, "Password must be at least 6 characters long")
    })
    
    const result = singinSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors })
    }
    
    const { email,password }=req.body

    
    const user=await userModel.findOne({
        email:email,
    })

    if(!user)
        return res.status(400).json({error:"Invalid Credentials"})

    const decoded=await bcrypt.compare(password, user.password)
    if(!decoded){
        return res.status(400).json({ error: "Invalid credentials" })
    }

    const token=jwt.sing({
        id: user._id,
    },JWT_USER_PASSWORD)

    return res.status(200).json({ message: "Login successful", token })
})

userRouter.get("/dashboard",userMiddleware,function(req,res){

})

userRouter.get("/today-status",userMiddleware,function(req,res){

})