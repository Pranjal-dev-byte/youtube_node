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
        console.log(res.url)
        return res
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}

export { uploadResult }