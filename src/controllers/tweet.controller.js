import { isValidObjectId, Mongoose } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import mongoose from "mongoose";
import { APIResponse } from "../utils/APIResponse.js";
import { Like } from "../models/like.model.js";

// Verifying tweet owner:
const isTweetOwner = async (userId, tweetId) => {
  try {
    const tweetData = await Tweet.findById(tweetId);
    if (tweetData?.owner.toString() === userId.toString()) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
};

const createTweet = AsyncHandler(async (req, res) => {
  //TODO: create tweet
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { content } = req.body;

  if (!(content && content.length > 0)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Tweet can not be empty."));
  }

  const createdTweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { tweet: createdTweet },
        "Tweet created successfully."
      )
    );
});

const getUserTweets = AsyncHandler(async (req, res) => {
  // TODO: get user tweets
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  let { userId, sortType = "asc", page = 1, limit = 10 } = req.query;

  page = Number(page);
  limit = Number(limit);

  if (!isValidObjectId(userId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid tweet id."));
  }

  let tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        createdAt: sortType === "asc" ? -1 : 1,
      },
    },
    {
      $lookup: { // Left joining of user details.
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: { // Filtering user details.
              fullName: 1,
              email: 1,
              avatarImage: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: { // Extracting from array field.
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $lookup: { // Left joining of likes
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: { // Length of likes array will be number of likes on tweet.
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      $facet: {
        metadata: [
          {
            $count: "totalTweets",
          },
          {
            $addFields: {
              pageNumber: page,
              totalPages: { $ceil: { $divide: ["$totalTweets", limit] } },
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
    // {
    //     $addFields: {
    //         metadata: {
    //             $first: '$metadata'
    //         }
    //     }
    // }
  ]);

  if (!tweets.length > 0) {
    return res.status(400).json(new APIResponse(400, {}, "No tweets found."));
  }

  tweets = tweets[0];
  tweets.metadata = { ...tweets.metadata[0], count: tweets.data.length };

  return res
    .status(200)
    .json(new APIResponse(200, { tweets }, "Tweets fetched successfully."));
});

const updateTweet = AsyncHandler(async (req, res) => {
  //TODO: update tweet
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid tweet Id."));
  }

  if (!content.length > 0) {
    return res.status(400).json(new APIResponse(400, {}, "No tweets found."));
  }

  const isValidOwner = await isTweetOwner(req.user?._id, tweetId);

  if (!isValidOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Tweet update failed."));
  }

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Tweet updated successfully."));
});

const deleteTweet = AsyncHandler(async (req, res) => {
  //TODO: delete tweet
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid tweet Id."));
  }

  const isValidOwner = await isTweetOwner(req.user?._id, tweetId);

  if (!isValidOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  const deleteLikesOfThisTweet = await Like.deleteMany({ tweet: tweetId });

  if (!deletedTweet) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Tweet deletion failed."));
  }

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Tweet deleted successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
