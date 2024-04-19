import fs from "fs";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  DeleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

// Generating accessToken & refreshToken:
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new APIError(400, "Failed to generate tokens.", error);
  }
};

const userSignup = AsyncHandler(async (req, res) => {
  // const avatarImageLocalPath = req.files?.avatarImage[0]?.path
  let avatarImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatarImage) &&
    req.files.avatarImage.length > 0
  ) {
    // First check if there is files, then array then length, to avoid error.
    avatarImageLocalPath = req.files.avatarImage[0].path;
  } else {
    return res.status(400).json(new APIResponse(400, {}, "Avatar is required"));
  }

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!req.validate) {
    // Validating file fields.
    fs.unlinkSync(avatarImageLocalPath);
    if (coverImageLocalPath) {
      fs.unlinkSync(coverImageLocalPath);
    }
    return res
      .status(400)
      .json(new APIResponse(400, {}, req.validationWarning));
  }

  const { username, fullName, email, password } = req.body;

  const isUserExist = await User.findOne({
    $or: [{ username }, { email }], // Checking either of the identifier present in database.
  });

  if (isUserExist) {
    return res
      .status(409)
      .json(new APIResponse(409, {}, "Username or email already registered"));
  }

  const avatar = await uploadOnCloudinary(avatarImageLocalPath); // Uploading to cloudinary.
  const cover = await uploadOnCloudinary(coverImageLocalPath); // Uploading to cloudinary.

  const createdUser = await User.create({
    username: username.trim().toLowerCase(),
    fullName,
    email: email.trim().toLowerCase(),
    password,
    avatarImage: avatar.url,
    coverImage: cover?.url || "",
  });

  const user = await User.findById(createdUser._id).select(
    "-password -role -watchHistory"
  );

  return res
    .status(201)
    .json(new APIResponse(200, { user }, "Signed up successfully"));
});

const userLogin = AsyncHandler(async (req, res) => {
  let { username, email, password } = req.body;

  username = username?.trim().toLowerCase();
  email = email?.trim().toLowerCase();

  if (!(username || email)) {
    throw new APIError(400, "Username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new APIError(400, "Username or email not registered");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); // Password validation.

  if (!isPasswordValid) {
    throw new APIError(400, "Incorrect username or password");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id); // Generating tokens.

  const loggedInUser = await User.findById(user._id).select(
    "-password -role -refreshToken -watchHistory"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .status(200)
    .json(
      new APIResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged in successfully"
      )
    );
});

const userLogout = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "Logged out successfully"));
});

const userChangePassword = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  if (!req.validate) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, req.validationWarning));
  }

  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new APIError(400, "Password could not be changed");
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword); // Checking either password is correct.

  if (!isPasswordValid) {
    throw new APIError(400, "Incorrect password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); // False, cause we don't want to update other fields.

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully"));
});

const userUpdateProfileDetails = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  if (!req.validate) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, req.validationWarning));
  }

  const { fullName, email } = req.body;

  const isEmailExist = await User.findOne({ email });

  if (isEmailExist) {
    throw new APIError(400, "Email already exists.");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Profile updated successfully"));
});

const userUpdateAvatar = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const avatarImageLocalPath = req.file?.path;

  if (!avatarImageLocalPath) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Avatar image missing"));
  }

  const avatar = await uploadOnCloudinary(avatarImageLocalPath);

  const user = await User.findById(req.user?._id);
  const prevAvatarURI = user?.avatarImage;

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatarImage: avatar.url,
      },
    },
    {
      new: true,
    }
  );

  await DeleteFromCloudinary(prevAvatarURI); // If pfp updated, then deleting previous one.

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Avatar updated successfully"));
});

const userUpdateCover = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Avatar image missing"));
  }

  const cover = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.findById(req.user?._id);
  const prevCoverImagePath = user?.coverImage;

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    {
      new: true,
    }
  );

  if (prevCoverImagePath) {
    DeleteFromCloudinary(prevCoverImagePath); // Updated cover image and if has cover image previously then deleting that one.
  }

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Cover updated successfully"));
});

const userCurrentProfile = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        // Left joining of subscribers.
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        // Left joining of subscribedTo.
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        // Getting counts.
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        avatarImage: 1,
        coverImage: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new APIResponse(200, user[0], "Current user fetched successfully"));
});

const userRefreshAccessToken = AsyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new APIError(400, "Invalid token");
  }

  try {
    const decodedToken = jwt.verify(
      // Decoding refreshToken
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      throw new APIError(400, "Tempered refresh token.");
    }

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new APIError(400, "Refresh token has been expired.");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user?._id); // Assigning new accessToken and refreshToken

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .status(200)
      .json(
        new APIResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token updated successfully"
        )
      );
  } catch (error) {
    throw new APIError(400, "Invalid token");
  }
});

const userChannelProfile = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { username } = req.params;
  console.log(username);

  if (!username) {
    throw new APIError(400, "Missing channel name");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.trim().toLowerCase(),
      },
    },
    {
      $lookup: {
        // Left joining of subscribers data.
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        // Left joining of subscribedTo data.
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // Counting.
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          // Checking subscribed or not.
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatarImage: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new APIError(400, "");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, channel[0], "Channel profile fetched successfully")
    );
});

const watchHistory = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        // Left joining of videos.
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              // Left joining of owner details.
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
              // Extracting owner details from array.
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        user[0].watchHistory,
        "Channel profile fetched successfully"
      )
    );
});

export {
  userSignup,
  userLogin,
  userLogout,
  userChangePassword,
  userUpdateProfileDetails,
  userUpdateAvatar,
  userUpdateCover,
  userCurrentProfile,
  userRefreshAccessToken,
  userChannelProfile,
};
