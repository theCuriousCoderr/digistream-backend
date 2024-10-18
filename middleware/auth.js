import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function verifyToken(req, res, next) {
  if (req.headers["authorization"].length < 1) {
    res.status(201).send({ data: "1 Log In First" });
    return;
  }
  const tokens = req.headers["authorization"].split(";");

  let token = tokens[0].trim().split(" ")[1];
  let refreshToken = tokens[1].trim().split(" ")[1];

  if (!token && !refreshToken) {
    res.status(201).send({ data: "2 Log In First" });
    return;
  }

  let decoded, decoded2;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    decoded2 = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY);
    if (decoded.userId !== decoded2.userId ) {
      return res.status(201).send({ data: "Wrong Token Details" });
    }
  } catch (err) {
    let d2;

    try {
      d2 = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY);
      if (d2.userId !== req.body.matric ) {
        return res.status(201).send({ data: "Wrong Token Details" });
      }
    } catch (err) {
      req.newLogin = "True";
      req.newToken = "False";
      next();
    }

    const newToken = jwt.sign(
      { userId: d2.userId },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "24h",
      }
    );
    req.newToken = newToken;
    req.newLogin = "False";
    req.refreshToken = refreshToken;
    next();
  }

  if (decoded && decoded2 && decoded.userId === decoded2.userId) {
    req.matric = decoded.userId;
    req.newToken = "False";
    req.newLogin = "False";
    next();
  }
}

export default verifyToken;
