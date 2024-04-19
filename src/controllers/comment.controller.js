import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { APIResponse } from "../utils/APIResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

// Validating Owner for further actions:
const isCommentOwner = async (userId, commentId) => {
  const commentData = await Comment.findById(commentId);
  if (commentData?.owner.toString() === userId.toString()) {
    return true;
  } else {
    return false;
  }
};

// Get all comments of a video:
const getVideoComments = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authenticating
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { videoId } = req.params;

  let { page = 1, limit = 10 } = req.query;

  page = Number(page);
  limit = Number(limit);

  if (!isValidObjectId(videoId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object Id."));
  }

  let comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId), // Extracted all comments on the Video.
      },
    },
    {
      $lookup: {
        // Left joining of User information to comment.
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          // Used pipeline to filter out specific fields.
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
          // Extracted Owner object from array field.
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        createdAt: -1, // Sorted all comments
      },
    },
    {
      $facet: {
        metadata: [
          // Added pagination.
          {
            $count: "totalComments",
          },
          {
            $addFields: {
              pageNumber: page,
              totalPages: { $ceil: { $divide: ["$totalComments", limit] } },
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

  comments = comments[0];
  comments.metadata = { ...comments.metadata[0] };

  return res
    .status(200)
    .json(new APIResponse(200, { comments }, "Comments fetched successfully."));
});

// Add comment to video
const addComment = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { content } = req.body;

  if (!content.length > 0) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Comment can not be empty."));
  }

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Video Id is not valid."));
  }

  const getVideo = await Video.findById(videoId); // Validating video Id with database.

  console.log(getVideo);

  if (!getVideo) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Video not found to comment."));
  }

  await Comment.create({
    content,
    video: getVideo?._id,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Commented successfully."));
});

// Update comment:
const updateComment = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { content } = req.body;

  if (!content.length > 0) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Comment can not be empty."));
  }

  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) { // Checking either it's valid MongoDB objectId
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Comment Id is not valid."));
  }

  const isValidCommentOwner = await isCommentOwner(req.user?._id, commentId); // Validating comment owner before allowing to update

  if (!isValidCommentOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  await Comment.findByIdAndUpdate(
    commentId,
    {
      content,
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Comment updated successfully."));
});

// Delete comment:
const deleteComment = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Comment Id is not valid."));
  }

  const isValidCommentOwner = await isCommentOwner(req.user?._id, commentId); // Validating with comment owner before allowing to delete.

  if (!isValidCommentOwner) {
    return res
      .status(400)
      .json(
        new APIResponse(400, {}, "Not authorized to perform this operation.")
      );
  }

  await Comment.findByIdAndDelete(commentId);

  const deleteLikesOfThisComment = await Like.deleteMany({
    // If a comment has been removed, then removing all corresponding likes on it.
    comment: commentId,
  });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Comment deleted successfully."));
});

export { getVideoComments, addComment, updateComment, deleteComment };
