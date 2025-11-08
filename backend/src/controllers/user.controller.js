import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const DEFAULT_ROLE = "admin";


const generateAccessAndRefreshTokens = async (userId) => {
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      user.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating refresh and access token")
   }
}

const registerUser = asyncHandler(async (req, res) => {

   const { fullName, email, username, password } = req.body
   console.log("email: ", email);


   if (
      [fullName, email, username, password].some((field) =>
         field?.trim() === "")
   ) {
      throw new ApiError(400, "All fields are required")
   }


   const existedUser = await User.findOne({
      $or: [{ username }, { email }]
   })

   if (existedUser) {
      throw new ApiError(409, "User with email or username already exists")
   }
   const user = await User.create({
      fullName,
      email,
      password,
      username: username.toLowerCase(),
      role: DEFAULT_ROLE
   });


   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)


   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
   }

   const options = {
      httpOnly: true,
      secure: true
   };


   return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(201, { user: createdUser, accessToken, refreshToken }, "User registered successfully!! ✨")
      )



})


const loginUser = asyncHandler(async (req, res) => {

   const { email, username, password } = req.body;

   if (!(username || email)) {
      throw new ApiError(400, "username or password is required");
   }

   const user = await User.findOne({ $or: [{ username }, { email }] });

   if (!user) {
      throw new ApiError(404, "user does not exist");
   }

   const isPasswordValid = await user.isPasswordCorrect(password);

   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials");
   }

   const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
      user._id
   );

   const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );

   const options = {
      httpOnly: true,
      secure: true
   };

   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
            200,
            { user: loggedInUser, accessToken, refreshToken },
            "User logged In Successfully"
         )
      );
});

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset: {
            refreshToken: 1
         }
      },
      {
         new: true
      }
   )

   const options = {
      httpOnly: true,
      secure: true
   };

   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out successfully"))

})


export {
   registerUser,
   loginUser,
   logoutUser,
};

