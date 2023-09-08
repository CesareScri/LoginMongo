import express from "express";
import { MongoClient } from "mongodb";
import { ObjectId } from "mongodb";

const app = express();
app.use(express.json());
app.use(express.static("public"));
let db;

const connectToDb = async () => {
  try {
    const dbUser = await MongoClient.connect(
      "mongodb+srv://dbUser:dbUserPassword@cluster0.etrlw3p.mongodb.net/userDB?retryWrites=true&w=majority"
    );
    const clientDb = await dbUser.db("userDB");
    db = clientDb;
    startServer();
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
};

connectToDb();

// Middleware to check if DB connection is alive
app.use((req, res, next) => {
  if (!db) {
    return res.status(500).json({ error: "Database connection error" });
  }
  next();
});

// Route to fetch data from the "user" collection
app.get("/users", async (req, res) => {
  try {
    const data = await db.collection("user").find({}).toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Start server after connecting to DB
const PORT = 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
};

app.post("/signup", async (req, res) => {
  const data = req.body;
  try {
    const dbData = await signUp(data);
    res.status(200).json(dbData);
  } catch (error) {
    res.status(200).json({ error }); // It's better to use error.message to get the error description
  }
});

app.post("/post", async (req, res) => {
  const data = req.body;

  try {
    const dbData = await doLogin(data);
    res.status(200).json(dbData);
  } catch (error) {
    res.status(200).json(error);
  }
});

const doLogin = (data) => {
  return new Promise(async (resolve, reject) => {
    const dbData = await db.collection("user").findOne({ email: data.email });

    // Check if user is found
    if (dbData) {
      // Check if passwords match
      if (dbData.password === data.password) {
        resolve({ msg: "Success", id: dbData._id, success: true });
      } else {
        reject({
          msg: "Oops! Something's not matching up. Please double-check your details and try again.",
          success: false,
        });
      }
    } else {
      reject({
        msg: "Oops! We couldn't find an account with that information. Please double-check and try again.",
        success: false,
      });
    }
  });
};

const signUp = (data) => {
  return new Promise(async (resolve, reject) => {
    const dbData = await db.collection("user").findOne({ email: data.email });
    if (dbData) {
      reject({
        msg: "Oops! That email is already registered. Try logging in or using a different email.",
        code: 200,
        success: false,
      });
    } else {
      const insertDb = await db.collection("user").insertOne(data);
      if (insertDb.acknowledged) {
        resolve({
          msg: "Registration successful! Welcome aboard.",
          code: 200,
          success: true,
          id: insertDb.insertedId,
        });
      }
    }
  });
};

app.get("/userInfo", async (req, res) => {
  const authorizationHeader = req.header("Authorization");

  if (!authorizationHeader) {
    return res.status(401).json({ error: "Authorization header is missing" });
  }

  const [bearer, id] = authorizationHeader.split(" ");

  if (bearer !== "Bearer" || !id) {
    return res.status(401).json({
      error: "Invalid Authorization format. Expected format: Bearer <ID>",
    });
  }

  try {
    const request = await getUser(id);
    console.log(request);
    res.status(200).json(request);
  } catch (error) {
    res.status(401).json({
      error: "Invalid Authorization id.",
    });
  }
});

const getUser = async (us) => {
  console.log("Searching for ID:", us);
  return new Promise(async (resolve, reject) => {
    try {
      // Use findOne() instead of find()
      const dbData = await db
        .collection("user")
        .findOne({ _id: new ObjectId(us) });
      console.log("Found in database:", dbData);

      if (dbData) {
        resolve({
          success: true,
          name: dbData.name,
          lastName: dbData.lastName,
          email: dbData.email,
          code: 200,
        });
      } else {
        reject({
          msg: "No user found with this id",
          code: 401,
          success: false,
        });
      }
    } catch (err) {
      reject({
        msg: "Database error: " + err.message,
        code: 500,
        success: false,
      });
    }
  });
};
