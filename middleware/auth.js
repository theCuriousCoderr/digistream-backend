import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function verifyToken(req, res, next) {
  if (req.headers["authorization"].length < 1) {
    res.status(201).send({ data: "Log In First" });
  }
  const tokens = req.headers["authorization"].split(";");

  let token = tokens[0].trim().split(" ")[1];
  let refreshToken = tokens[1].trim().split(" ")[1];

  if (!token && !refreshToken) {
    res.status(201).send({ data: "Log In First" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const decoded2 = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY);

    // if main token has expired and refresh token is still valid,
    // generate new main token
    if (!decoded && decoded2) {
      const newToken = jwt.sign(
        { userId: decoded2.userId },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "24h",
        }
      );
      req.newToken = newToken;
      next();
    }

    // if both main and refresh token has expired, ask user to login again
    if (!decoded && !decoded2) {
      req.newLogin = true;
      next();
    }

    // if main token is still valid
    if (decoded && decoded2 && decoded.userId === decoded2.userId) {
      req.matric = decoded.userId
      next();
    }
  } catch (error) {
    res.status(201).send({ data: "Invalid token" });
  }
}

export default verifyToken;
