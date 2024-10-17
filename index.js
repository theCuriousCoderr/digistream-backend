import express from "express";
import mongoose, { set } from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import cloudinary from "cloudinary";
import multer from "multer";
import bcrypt from "bcryptjs/dist/bcrypt.js";
import { DeptRegistration } from "./models/dept-registration.js";
import { Students } from "./models/student.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import verifyToken from "./middleware/auth.js";
import { Admins } from "./models/admins.js";

const PORT = process.env.PORT || 5000;

const cloudinarySDK = cloudinary.v2;

dotenv.config();
set("strictQuery", false);

const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
// Add cors middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const upload = multer({ dest: "/tmp/uploads" });

cloudinarySDK.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const registrationFilesField = [
  { name: "schoolFessReceiptFile", maxCount: 1 },
  { name: "departmentalDuesReceiptFile", maxCount: 1 },
  { name: "facultyDuesReceiptFile", maxCount: 1 },
  { name: "transcriptFile", maxCount: 1 },
  { name: "labFeesReceiptFile", maxCount: 1 },
  { name: "courseFormFile", maxCount: 1 },
];

let env = process.env.NODE_ENV;
let baseUrl, feURL, cookieSecure;
if (env === "development") {
  feURL = "http://localhost:3000";
} else {
  feURL = "https://intertwined-fe.vercel.app";
}

async function connectMongoDB() {
  let KEY = true
  while (KEY) {
    try {
      let connect = await mongoose.connect(process.env.MONGODB_URL);
      if (connect.connections) {
        console.log(`MongoDB Success: Database connected successfully`);
        console.log(`Loop Ended`);
        KEY = false;
      }
    } catch (error) {
      
      console.log(`Restarting MongoDB Connection ...`);
    }
  }
}
connectMongoDB();


// GET METHODS
app.get("/", async (req, res) => {
  // let count = await DeptRegistration.deleteMany({})
  res
    .status(200)
    .send(
      `Welcome to DigiStream 😊, Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`
    );
});

// process registration forms
app.post(
  "/registration",
  upload.fields(registrationFilesField),
  async (req, res) => {
    let deptField = {
      schoolFessReceiptFile: "",
      departmentalDuesReceiptFile: "",
      facultyDuesReceiptFile: "",
      transcriptFile: "",
      labFeesReceiptFile: "",
      courseFormFile: "",
    };

    // console.log(req.body);
    // console.log(req.files);
    // res.status(200).send({ data: "File Submitted Successfully" });

    // return


    try {
      // iterate over the object (dictionary)
      for (let file in req.files) {
        let data = req.files[file][0];
        let path = data.path;
        const result = await cloudinary.uploader.upload(path, {
          resource_type: "raw", // 'raw' is used for non-image files like PDFs
        });

        // if Cloudinary Opertation was successful
        if (result) {
          deptField[file] = result.secure_url;
        }
        // console.log(`url: ${result.secure_url}, id: ${result.public_id}`);
      }
      let registration = await DeptRegistration.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        middleName: req.body.middleName,
        matric: req.body.matric,
        level: req.body.level,
        schoolFeesReceipt: deptField.schoolFessReceiptFile,
        deptDuesReceipt: deptField.departmentalDuesReceiptFile,
        facultyDuesReceipt: deptField.facultyDuesReceiptFile,
        transcript: deptField.transcriptFile,
        labFeesReceipt: deptField.labFeesReceiptFile,
        courseForm: deptField.courseFormFile,
        status: "pending",
        date: new Date().toLocaleString(),
        comment: "-----",
        faculty: req.body.faculty,
        department: req.body.department,
      });

      if (registration) {
        res.status(200).send({ data: "File Submitted Successfully" });
      }
    } catch (err) {
      console.log("error");
    }
  }
);

// For students
app.post("/get-registrations", verifyToken, async (req, res) => {
  console.log(req.matric);
  const { regType } = req.body;
  console.log(regType);

  try {
    let registrations;
    if (regType === "Departmental") {
      registrations = await DeptRegistration.find({
        facultyDuesReceipt: "",
        matric: req.matric,
      });
    } else {
      registrations = await DeptRegistration.find({
        deptDuesReceipt: "",
        matric: req.matric,
      });
    }
    console.log(registrations.length);
    res.status(200).send({ data: registrations });
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Couldnt Fetch Registrations" });
  }
});

// For Departments
app.post("/get-dept-registrations", verifyToken, async (req, res) => {
  // console.log(req.body)
  const { regType, role } = req.body;
  try {
    let registrations;
    if (role === "department") {
      registrations = await DeptRegistration.find({
        department: regType,
        facultyDuesReceipt: ""
      });
    } else {
      registrations = await DeptRegistration.find({
        faculty: regType,
        deptDuesReceipt: ""
      });
    }
    // console.log(registrations);
    res.status(200).send({ data: registrations });
  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Couldnt Fetch Registrations" });
  }
});

// handle departmental registrations approvals
app.post("/dept-registrations-approval", async (req, res) => {
  console
  let { id, matric, dept, comment, handle } = req.body;
  if (comment === "") {
    comment = "No Comment"
  }
  try {
    let studentReg = await DeptRegistration.findById({_id: id});
    if (!studentReg) {
      res.status(201).send({ data: "Document doesn't exist" });
      return
    }
    if (studentReg && studentReg.status !== "pending") {
      res.status(201).send({ data: "Action has been taken already" });
      return
    }
    if (studentReg && studentReg.status === "pending") {
      studentReg.comment = comment;
      studentReg.status = handle;
      await studentReg.save()
      res.status(200).send({ data: "Status Updated Successfully" });
    }

  } catch (err) {
    console.log(err);
    res.status(500).send({ data: "Couldnt Complete Action" });

  }
  console.log(req.body)
})

app.post("/signup", async (req, res) => {
  try {
    const { matric, password } = req.body;
    const student = await Students.findOne({ matric });
    if (student) {
      res.status(201).send({ data: "Account Exists Already" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = await Students.create({
      matric: matric,
      password: hashedPassword,
    });

    if (newStudent) {
      res.status(200).send({ data: "Account Creation Successful" });
    } else {
      res.status(500).send({ data: "Account Creation Failed" });
    }
  } catch (error) {
    res.status(500).send({ data: "Account Creation Failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { matric, password, role } = req.body;

    // let fullName="";
    if (role === "department" || role === "faculty") {
      const admin = await Admins.findOne({ id: matric });
      if (!admin) {
        return res.status(201).send({ data: "Incorrect Id" });
      }
      console.log("---------")
      console.log(admin.role)
      console.log(role)
      console.log("---------")
      if (admin.role !== role) {
        return res.status(201).send({ data: "Incorrect Role" });
      }
      if (admin.password !== password) {
        return res.status(201).send({ data: "Incorrect Password" });
      }
    }

    
    if (role === "student") {
      const student = await Students.findOne({ matric });
      if (!student) {
        return res.status(201).send({ data: "Incorrect Matric" });
      }
      const passwordMatch = await bcrypt.compare(password, student.password);
      if (!passwordMatch) {
        return res.status(201).send({ data: "Incorrect Password" });
      }
      // fullName = `${student.lastName} ${student.firstName} ${student.middleName}`
    }

    const token = jwt.sign(
      { userId: matric }, 
      process.env.JWT_SECRET_KEY, 
      {
      expiresIn: "24h",
    });

    const refreshToken = jwt.sign(
      { userId: matric },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).send({
      data: "Login Successful",
      token: token,
      refreshToken: refreshToken,
      matric: matric,
    });
  } catch (error) {
    res.status(500).send({ data: "Connection Error" });
  }
});

app.post("/student-dashboard", verifyToken, async (req, res) => {
  // console.log(req.newToken);
  // console.log(req.newLogin);
  res.status(200).send({ data: "Working" });
});

server.listen(PORT, (req, res) => {
  console.log(`Server is running on PORT ${PORT}`);
});
