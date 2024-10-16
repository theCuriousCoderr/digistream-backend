import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  role: String,
  id: String,
  password: String
});

export const Admins = mongoose.model("Admins", adminSchema);