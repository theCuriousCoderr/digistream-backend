import mongoose from "mongoose";

const deptRegistrationSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  middleName: String,
  matric: String,
  level: String,
  schoolFeesReceipt: String,
  deptDuesReceipt: String,
  facultyDuesReceipt: String,
  transcript: String,
  labFeesReceipt: String,
  courseForm: String,
  status: String,
  date: String,
  comment: String,
  faculty: String,
  department: String,

});

export const DeptRegistration = mongoose.model(
  "DeptRegistration",
  deptRegistrationSchema
);
