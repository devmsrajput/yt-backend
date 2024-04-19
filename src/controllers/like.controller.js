import { isValidObjectId } from "mongoose";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { Like } from "../models/like.model.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { APIResponse } from "../utils/APIResponse.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { videoId } = req.params;
  // Toggle like on video

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new APIResponse(400, {}, "Not valid Id."));
  }

  const getVid = await Video.findById(videoId); // Verifying videoId from Database.

  if (!getVid) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid video Id."));
  }

  const likeData = await Like.aggregate([
    // Checking either this user has liked this video.
    {
      $match: {
        video: new mongoose.Types.ObjectId(getVid?._id),
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
  ]);

  if (likeData.length > 0) {
    // Toggling likes based on gathered likeData.
    await Like.findByIdAndDelete(likeData[0]?._id);
    return res
      .status(200)
      .json(new APIResponse(200, {}, "Unliked video successfully."));
  } else {
    await Like.create({
      video: getVid?._id,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(new APIResponse(200, {}, "Liked video successfully."));
  }
});

const toggleCommentLike = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { commentId } = req.params;
  // Toggle like on comment

  if (!isValidObjectId(commentId)) {
    return res.status(400).json(new APIResponse(400, {}, "Not valid Id."));
  }

  const getComment = await Comment.findById(commentId); // Verifying commentId

  if (!getComment) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid comment Id."));
  }

  const commentData = await Like.aggregate([
    {
      $match: {
        comment: new mongoose.Types.ObjectId(getComment?._id),
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
  ]);

  if (commentData.length > 0) {
    // Toggling like on comment.
    await Like.findByIdAndDelete(commentData[0]?._id);
    return res
      .status(200)
      .json(new APIResponse(200, {}, "Unliked comment successfully."));
  } else {
    await Like.create({
      comment: getComment?._id,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(new APIResponse(200, {}, "Liked comment successfully."));
  }
});

const toggleTweetLike = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { tweetId } = req.params;
  // Toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    return res.status(400).json(new APIResponse(400, {}, "Not valid Id."));
  }

  const getTweet = await Tweet.findById(tweetId); // Verifying tweetId from Database.

  if (!getTweet) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid tweet Id."));
  }

  const tweetData = await Like.aggregate([
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(getTweet?._id),
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
  ]);

  if (tweetData.length > 0) {
    // Toggling like on tweet.
    await Like.findByIdAndDelete(tweetData[0]?._id);
    return res
      .status(200)
      .json(new APIResponse(200, {}, "Unliked tweet successfully."));
  } else {
    await Like.create({
      tweet: getTweet?._id,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(new APIResponse(200, {}, "Liked tweet successfully."));
  }
});

const getLikedVideos = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  let { page = 1, limit = 10 } = req.query;

  page = Number(page);
  limit = Number(limit);

  let likedVideoData = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        // Left joining of Video file in Like through referenced videoId.
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              // Left joining for Video owner details.
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    // Filtering owner details specifically.
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
              // Here, we'll be getting owner as an array, extracting first array element.
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              // Filtering video fields.
              title: 1,
              videoFile: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        // Here, we'll be getting video as an array, extracting first array element.
        video: {
          $first: "$video",
        },
      },
    },
    {
      $facet: {
        metadata: [
          {
            $count: "totalVideos", // Total document count is total video.
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
  ]);

  likedVideoData = likedVideoData[0];

  //TODO: get all liked videos
  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { videos: likedVideoData },
        "Fetched liked videos successfully."
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
