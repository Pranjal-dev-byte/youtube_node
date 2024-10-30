import { asyncHandler } from "../utlis/asyncHandler";
import {ApiError} from "../utlis/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadResult} from "../middlewares/multer.middleware.js";
import {ApiResponse} from "../utlis/ApiResponse.js";

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
    
    const {email, fullname, username, password} = req.body;
    
    if( [email,fullname,username,password].some((field) => {field.trim()===""})){
        throw new ApiError(400, "All fields are required");
    }    
    
    const userExists = User.findOne({
        $or: [{username},{email}]
    })
    
    if(userExists){
        throw new ApiError(409,"User with email address or username already exists")
    }
    
    const avatarLPath = res.files?.avatar[0].path;
    const coverImgLPath = res.files?.coverImg[0].path;
    
    if(!avatarLPath){
        throw new ApiError(400,"Avatar is required");
    }
    
    const avatar = await uploadResult(avatarLPath);
    const coverImage = await uploadResult(coverImgLPath);
    
    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    const user = await User.create({fullname,
        avatar:avatar.url,
        coverImage:avatar?.coverImage || "",
        email,
        fullname,
        username:username.toLowerCase(),
        password
    })
    
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    
    if(!createdUser){
        throw new Error(500,"Error occurred while registering the user")
    }
    
    return res.status(201).json(new ApiResponse(200,createdUser,"User created successfully"));
})

export default {registerUser}