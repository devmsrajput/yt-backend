import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // File has been uploaded successfully
    // console.log("File has been uploaded successfully.", response.url)
    fs.unlinkSync(localFilePath); // If file uploaded then removing from local storage.
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation got failed.
  }
};

const DeleteFromCloudinary = async (mediaURI) => {
  try {
    if (!mediaURI) {
      throw new Error("Media URI is missing");
    }

    const parsedUrl = new URL(mediaURI);
    const publicIdURI = parsedUrl.pathname.replace(/^\/|\/$/g, "");
    const splPublicIdURI = publicIdURI.split("/");
    const fileExt = splPublicIdURI[1];
    const publicIdExt = splPublicIdURI[splPublicIdURI.length - 1];
    const splPublicIdExt = publicIdExt.split(".");
    const publicId = splPublicIdExt[0];
    if (fileExt === "video") {
      const response = await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
        invalidate: true,
      });
      return response;
    }

    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
    throw error;
  }
};

export { uploadOnCloudinary, DeleteFromCloudinary };
