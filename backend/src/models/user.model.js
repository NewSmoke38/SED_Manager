import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"           

const userSchema = new Schema(
{
    username: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
        minlength: 1,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        maxlength: 20
    },
    fullName: {
      type: String,
      required: true,
      trim: true,             
      index: true,
      minlength: 1,
      maxlength: 30
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      default: "admin"
    },
},

{
    timestamps: true
}
)

userSchema.pre("save", async function (next) {        
  if (!this.isModified("password")) return next();     

  this.password = await bcrypt.hash(this.password, 10);
  next();
});




userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

// for genrating tokens <3
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};


export const User = mongoose.model("User", userSchema)