import express from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cors from "cors";
import routes from "./src/routes/routes.js"
import path from "path"
config();

const app = express();
const port = process.env.PORT || 8000;
app.use(bodyParser.json());
app.use(cors());

app.use('/src/database/uploads', express.static('src/database/uploads'))
app.use("/api/v1", routes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(port, () => {
  console.log(`Wearapp-Backend listening on port:${port}`);
});
