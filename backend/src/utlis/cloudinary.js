import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CN_CLOUD_NAME,
    api_key: process.env.CN_API_KEY,
    api_secret: process.env.CN_API_SECRET // Click 'View API Keys' above to copy your API secret
});

// Upload an image
const uploadResult = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const res = await cloudinary.uploader
            .upload(
                localFilePath, {
                resource_type: 'auto',
            }
            )
        fs.unlinkSync(localFilePath);
        return res
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}

const deleteOldAvatar = async(avatarUrl)=>{
    try {
        const publicId = avatarUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        console.log("Old avatar/coverImage deleted from Cloudinary:", publicId);
    } catch (error) {
        console.error("Failed to delete old avatar/coverImage from Cloudinary:", error);
    }
}

export { uploadResult,deleteOldAvatar }