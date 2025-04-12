const mongoose=require("mongoose")
const Schema=mongoose.Schema
const ObjectId=mongoose.Types.ObjectId

const userSchema=new Schema({
    fullName: String,
    email: {type: String , unique: true},
    password: String,
})

const subjectSchema=new Schema({
    subjectName: String,
    totalClass: Number,
    totalPresent: Number,
    userId: {
        type: ObjectId,
        ref: "user"
    }
})


const userModel=mongoose.model("user",userSchema)
const subjectModel=mongoose.model("subject",subjectSchema)

module.exports = {
    userModel,
    subjectModel
}