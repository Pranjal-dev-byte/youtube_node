import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from"jsonwebtoken";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trime: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true, 
    },
    fullName: {
        type: String,
        required: true,
        trime: true,
        index: true
    }, 
    avatar: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trime: true,
        index: true
    }, 
    coverImage: {
        type: String
    }, 
    watchHistory: [
        {
            // *Similar To Foreign Key reference
            type: Schema.ObjectId,
            ref: "Video"
        }
    ], 
    password: {
        type: String,
        required: [true, 'Password is required']
    }, 
    refreshToken: {
        type: String
    }
},
    {
        timestamps: true
    }
)

// *Pre hook used to trigger some methods just before save
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)