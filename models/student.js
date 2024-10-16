import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  middleName: String,
  matric: String,
  level: String,
  dept: String,
  faculty: String,
  gender: String,
  avatar: String,
  password: String
});

export const Students = mongoose.model("Students", studentSchema);
