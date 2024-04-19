import { AsyncHandler } from "../utils/AsyncHandler.js";
import fs from "fs";
import {
  DeleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Comment } from "../models/comment.model.js";

// Verifying video owner.
const isVideoOwner = async (userId, videoId) => {
  try {
    const videoData = await Video.findById(videoId);
    if (videoData?.owner.toString() === userId.toString()) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
};

const uploadAVideo = AsyncHandler(async (req, res) => {
  let videoLocalPath;
  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    Array.isArray(req.files.thumbnailFile) &&
    req.files.videoFile.length > 0 &&
    req.files.thumbnailFile.length > 0
  ) {
    videoLocalPath = req.files.videoFile[0].path;
    thumbnailLocalPath = req.files.thumbnailFile[0].path;
  }

  // const videoLocalPath = req.files?.videoFile[0]?.path
  // const thumbnailLocalPath = req.files?.thumbnailFile[0]?.path

  if (!req.auth) {
    // If not authenticated, then we'll cancel the operation and delete the files received.
    if (videoLocalPath) {
      fs.unlinkSync(videoLocalPath);
    }
    if (thumbnailLocalPath) {
      fs.unlinkSync(thumbnailLocalPath);
    }

    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  if (!req.validate) {
    // If all filed are not valid, then we'll cancel operation and delete the received files.
    if (videoLocalPath) {
      fs.unlinkSync(videoLocalPath);
    }
    if (thumbnailLocalPath) {
      fs.unlinkSync(thumbnailLocalPath);
    }
    return res
      .status(400)
      .json(new APIResponse(400, {}, req.validationWarning));
  }

  if (!(videoLocalPath && thumbnailLocalPath)) {
    // If any of the files are missing, we'll cancel the operation and delete received files.
    if (videoLocalPath) {
      fs.unlinkSync(videoLocalPath);
    }
    if (thumbnailLocalPath) {
      fs.unlinkSync(thumbnailLocalPath);
    }
    return res
      .status(400)
      .json(new APIResponse(400, {}, "All fields are required."));
  }

  let { title, description, isPublished = "true" } = req.body;

  const videoURI = await uploadOnCloudinary(videoLocalPath);
  const thumbnailURI = await uploadOnCloudinary(thumbnailLocalPath);

  let vidDurSec = Number(videoURI.duration);
  let vidDuration = Math.round(vidDurSec);
  // let vidDuration = String(tempSec)

  // if(tempSec > 60){
  //     let tempMin = tempSec / 60
  //     tempMin = tempMin.toFixed(2)
  //     let temp = tempMin
  //     let splVidDur = tempMin.toString().split('.')
  //     vidDuration = `${Number(splVidDur[0])}:${Number(splVidDur[1])}`
  //     console.log(vidDuration)
  //     if(temp > 60){
  //         temp /= 60
  //         temp = temp.toFixed(2)
  //         let splTempDur = temp.toString().split('.')
  //         vidDuration = `${Number(splTempDur[0])}:${Number(splTempDur[1])}:${Number(splVidDur[1])}`
  //     }
  // }

  const video = await Video.create({
    title,
    description,
    videoFile: videoURI.url,
    thumbnail: thumbnailURI.url,
    duration: vidDuration,
    owner: req.user?._id,
    isPublished: isPublished === "true" ? true : false,
  });

  return res
    .status(200)
    .json(new APIResponse(200, { video }, "Video uploaded successfully"));
});

const getAllVideos = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  let {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "asc",
    userId,
  } = req.query;

  limit = Number(limit);

  if (!isValidObjectId(userId)) {
    return res.status(400).json(new APIResponse(400, {}, "Not valid user Id."));
  }

  if (!query) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Empty query string."));
  }

  if (!(sortBy === "createdAt" || sortBy === "views")) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Sort by has not valid parameter."));
  }
  if (!(sortType === "asc" || sortType === "dec")) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Sort type has not valid parameter."));
  }

  if (limit <= 0 || limit > 20) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Exceeding max or min limit parameter."));
  }

  if (page <= 0) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Invalid page parameter."));
  }

  console.log("SORTBY: ", sortBy);
  console.log("SORTYPE: ", sortType);

  const allVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $match: {
        isPublished: true,
      },
    },
    {
      $match: {
        title: {
          $regex: new RegExp(`\\b${query}\\b`, "i"),
        },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              email: 1,
              avatarImage: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        sortBy: sortType === "asc" ? -1 : 1,
      },
    },
    {
      $facet: {
        metadata: [
          {
            $count: "totalVideos",
          },
          {
            $addFields: {
              pageNumber: page,
              totalPages: { $ceil: { $divide: ["$totalVideos", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ],
      },
    },
    {
      $addFields: {
        metadata: {
          $first: "$metadata",
        },
      },
    },
  ]);

  if (!allVideos?.length > 0) {
    return res.status(400).json(new APIResponse(400, {}, "No video found."));
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { videos: allVideos[0] },
        "Video fetched successfully"
      )
    );
});

const getVideoById = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid video Id."));
  }

  const requestedVideo = await Video.findByIdAndUpdate(
    // If someone clicked on video, then incrementing views by 1.
    videoId,
    {
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    }
  );

  if (!requestedVideo) {
    return res.status(400).json(new APIResponse(400, {}, "Video not found."));
  }

  return res
    .status(200)
    .json(new APIResponse(200, { video: requestedVideo }, "Invalid video Id."));
});

const updateVideo = AsyncHandler(async (req, res) => {
  let thumbnailLocalPath;
  if (req.file && req.file.path) {
    thumbnailLocalPath = req.file?.path;
  }

  if (!req.auth) {
    // If not authenticated, we'll cancel operation and delete received file.
    if (thumbnailLocalPath) {
      fs.unlinkSync(thumbnailLocalPath);
    }

    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  if (!thumbnailLocalPath) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Thumbnail is required"));
  }

  const { videoId } = req.params;

  const { title, description } = req.body;

  if (![title, description].every((field) => field?.length > 4)) {
    // If all fields are not valid, we will cancel operation and delete received file.
    if (thumbnailLocalPath) {
      fs.unlinkSync(thumbnailLocalPath);
    }
    return res
      .status(400)
      .json(new APIResponse(400, {}, "All fields are required."));
  }

  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid video id."));
  }

  const isValidOwner = await isVideoOwner(req.user?._id, videoId); // Verifying video owner.

  if (!isValidOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  const vid = await Video.findById(videoId);

  const tempURI = vid.thumbnail;

  const thumbnailURI = await uploadOnCloudinary(thumbnailLocalPath);

  await DeleteFromCloudinary(tempURI); // If new thumbnail updated, then deleting old thumbnail file.

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnailURI.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { video: updateVideo },
        "Video updated successfully."
      )
    );
});

const deleteVideo = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication.
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { videoId } = req.params;

  //TODO: delete video

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid Video id."));
  }

  const isValidOwner = await isVideoOwner(req.user?._id, videoId);

  if (!isValidOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  const vidData = await Video.findById(videoId);

  const vidURI = vidData.videoFile;

  const ThuURI = vidData.thumbnail;

  await DeleteFromCloudinary(vidURI); // Deleting video file from cloudinary.

  await DeleteFromCloudinary(ThuURI); // Deleting thumbnail file from cloudinary.

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  const deleteLikesOfThisVideo = await Like.deleteMany({ video: videoId }); // If video deleted, then deleting likes documents created for this video.
  const deleteCommentsOfThisVideo = await Comment.deleteMany({
    // If video deleted, then deleting comments documents created for this video.
    video: videoId,
  });
  const deleteVideoFromSavedPlaylists = await Playlist.updateMany(
    // If video deleted, then deleting from all playlist docs..
    {},
    {
      $pull: {
        videos: videoId,
      },
    }
  );

  //   console.log("Delete video: ", deletedVideo);
  //   console.log("Delete Like Of This Video: ", deleteLikesOfThisVideo);
  //   console.log("Delete Comments Of This Video: ", deleteCommentsOfThisVideo);
  //   console.log("Video removed from playlist: ", deleteVideoFromSavedPlaylists);

  return res
    .status(200)
    .json(new APIResponse(200, { deleteVideo }, "Video deleted successfully."));
});

// Toggle publish status:
const togglePublishStatus = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { videoId } = req.params;

  if (!videoId) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "No video parameter found."));
  }

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid video Id."));
  }

  const videoData = await Video.findById(videoId);

  const status = videoData.isPublished;

  const publishStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: status === true ? false : true,
      },
    },
    {
      new: true,
    }
  );

  let msg;
  if (publishStatus.isPublished) {
    msg = "Video published successfully";
  } else {
    msg = "Video unpublished successfully";
  }

  return res.status(200).json(new APIResponse(200, {}, msg));
});

export {
  uploadAVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
