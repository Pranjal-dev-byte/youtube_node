import { asyncHandler } from "../utlis/asyncHandler.js";
import {ApiError} from "../utlis/ApiError.js";
import {User} from "../models/user.model.js";
// import {upload} from "../middlewares/multer.middleware.js";
import {uploadResult,deleteOldAvatar} from "../utlis/cloudinary.js"
import {ApiResponse} from "../utlis/ApiResponse.js";
import jwt from "jsonwebtoken";

const genAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Error while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    // get user details 
    // validation-non empty
    // Check if user already exists
    // check for images, avatar
    // Upload them to cloudinary, avatar
    // create user object and create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res
    
    const {email, fullName, username, password} = req.body;
    
    if( [email,fullName,username,password].some((field) => {field.trim()===""})){
        throw new ApiError(400, "All fields are required");
    }    
    
    const userExists = await User.findOne({
        $or: [{username},{email}]
    })
    
    if(userExists){
        throw new ApiError(409,"User with email address or username already exists")
    }
    
    console.log(req.files?.avatar[0].path)
    
    const avatarLPath = req.files?.avatar[0].path;
    // const coverImgLPath = req.files?.coverImage[0].path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    console.log(avatarLPath)
    
    if(!avatarLPath){
        throw new ApiError(400,"Avatar is required");
    }
    
    const avatar = await uploadResult(avatarLPath);
    const coverImage = await uploadResult(coverImageLocalPath);
    
    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    const user = await User.create({fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username:username.toLowerCase(),
        password
    })
    
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
    if(!createdUser){
        throw new Error(500,"Error occurred while registering the user")
    }
    
    return res.status(201).json(new ApiResponse(200,createdUser,"User created successfully"));
})

const loginUser = asyncHandler(async (req,res)=>{
    
    // Fetch pass frm req.body
    // Validation username or email
    // Find the user
    // password check
    // refreshToken and access token
    // send cookie
    
    const {email,username,password} = req.body;
    
    console.log(!email || !username)
    
    if (!email && !username) {
        throw new ApiError(400, "Either username or email should be given");
    }
    
    const user = await User.findOne({
        $or:[{email},{username}]
    })
    
    if(!user){
        throw new ApiError(400, "User doesn't exists")
    }
    
    console.log(user)
    // console.log(User)
    
    const isPassValid = await user.isPasswordCorrect(password);
    
    if(!isPassValid){
        throw new ApiError(401, "Invalid password")
    }
    
    const {accessToken,refreshToken} = genAccessAndRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    
    const options ={
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
    
    
})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    
    const options ={
        httpOnly:true,
        secure:true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if(!incomingRefreshToken){
            throw new ApiError(400,"Unauthorized request")
        }
        
        const decodedToken = await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id);
        
        if(!user){
            throw new Error(401, "Invalid refresh token")
        }
        
        if(incomingRefreshToken !==user?.refreshToken){
            throw new Error(401, "Refresh token expired or used")
        }
        
        const {accessToken,newRefreshToken} = await genAccessAndRefreshToken(user._id)
        
        return res
        .status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken",newRefreshToken)
        .json(
            new ApiResponse(200, {accessToken,newRefreshToken},"Access code refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")   
    }
})

const changeCurrPass = asyncHandler(async(req,res)=>{
    const {oldPass, newPass} = req.body;
    const user = await User.findById(req.user._id);
    const isPassCorrect = await  user.isPasswordCorrect(oldPass);
    if (!isPassCorrect) {
        throw new ApiError(400,"Invalid password");
    }
    user.password = newPass;
    await user.save({validateBeforeSave:false});
    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
    
})

const getCurrUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"User fetched successfully")
})

const updateAccDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body;
    if(!email||!fullName){
        throw new Error(400,"All fields are required")
    }
    const user = User.findByIdAndUpdate(req.user._id,{
        $set:{
            fullName,
            email
        }
    }, {new:true}).select("-password")
    
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;
    
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }
     
    await deleteOldAvatar(avatarLocalPath);
    
    await User.findByIdAndUpdate(req.user._id,{$unset:{avatar:""}})
    
    const avatar = await uploadResult(avatarLocalPath);
    
    if (!avatar) {
        throw new ApiError(400,"Error while uploading avatar")
    }
    
    const user = await User.findByIdAndUpdate(req.user._id,{
        $set:{
            avatar:avatar.url
        }
    }, {new:true}).select("-password")
    
    return res.status(200).json(200,user,"Avatar updated successfully")
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;
    
    if (!coverImageLocalPath) {
        throw new ApiError(400,"Cover image is missing")
    }
    
    
    await deleteOldAvatar(coverImageLocalPath);
    
    await User.findByIdAndUpdate(req.user._id,{$unset:{coverImage:""}})
    
    const img = await uploadResult(coverImageLocalPath);
    
    if (!img) {
        throw new ApiError(400,"Error while uploading image")
    }
    
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            coverImage:coverImage.url
        }
    }, {new:true}).select("-password")
    
    return res.status(200).json(200,user,"Cover image updated successfully")
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrPass, getCurrUser, updateAccDetails, updateUserAvatar, updateUserCoverImage  }