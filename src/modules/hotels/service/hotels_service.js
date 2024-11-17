import pool from "../../../database/database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const deleteImageFile = (filePath) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const basename = path.basename(filePath);
  const projectRoot = path.resolve(__dirname, "../../../");
  const absolutePath = path.join(projectRoot, `database/uploads/${basename}`);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    console.log("File deleted:", absolutePath);
  } else {
    console.log("File not found:", absolutePath);
  }
};

export const getAllHotels = async (req, res) => {
  const { title, minPrice, maxPrice } = req.query;

  let query = "SELECT * FROM hotels WHERE 1=1";
  let params = [];

  if (title) {
    query += ` AND LOWER(title) LIKE $${params.length + 1}`;
    params.push(`%${title.toLowerCase()}%`);
  }

  if (minPrice && maxPrice) {
    query += ` AND price BETWEEN $${params.length + 1} AND $${
      params.length + 2
    }`;
    params.push(minPrice, maxPrice);
  } else if (minPrice) {
    query += ` AND price >= $${params.length + 1}`;
    params.push(minPrice);
  } else if (maxPrice) {
    query += ` AND price <= $${params.length + 1}`;
    params.push(maxPrice);
  }

  try {
    const data = await pool.query(query, params);
    const hotels = data.rows.map((hotel) => ({
      ...hotel,
      image: hotel.image
        ? `${req.protocol}://${req.get("host")}${hotel.image}`
        : null,
    }));
    return res.json(hotels);
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving hotels", error });
  }
};

export const getHotelById = async (req, res) => {
  const hotelId = req.params.id;
  if (!hotelId) {
    return res.status(400).json({ message: "Hotel ID is required" });
  }
  const data = await pool.query("SELECT * FROM hotels WHERE id = $1", [
    hotelId,
  ]);
  const hotel = data.rows[0];

  if (hotel) res.json(hotel);
  else res.status(404).json({ message: "Hotel not found" });
};

export const createHotel = async (req, res) => {
  const { title, description, latitude, longitude, price } = req.body;

  if (!title || !description || !latitude || !longitude || !price) {
    return res.status(400).json({
      message: "Missing required field",
    });
  }
  const image = req.file ? `/src/database/uploads/${req.file.filename}` : null;

  const data = await pool.query(
    "INSERT INTO hotels (image, title, description, latitude, longitude, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [image, title, description, latitude, longitude, price]
  );

  const hotel = data.rows[0];

  try {
    return res.status(201).json(hotel);
  } catch (error) {
    deleteImageFile(image);
    return res.status(500).json({ message: "Error creating hotel", error });
  }
};

export const updateHotel = async (req, res) => {
  const { title, description, latitude, longitude, price } = req.body;
  const hotelId = req.params.id;

  if (!hotelId) {
    return res.status(400).json({ message: "Hotel ID is required" });
  }

  const existingHotelData = await pool.query(
    "SELECT * FROM hotels WHERE id = $1",
    [hotelId]
  );
  const existingHotel = existingHotelData.rows[0];

  if (!existingHotel) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  const newImage = req.file
    ? `/src/database/uploads/${req.file.filename}`
    : existingHotel.image;

  if (req.file && existingHotel.image) {
    deleteImageFile(existingHotel.image);
  }

  try {
    const result = await pool.query(
      "UPDATE hotels SET image=$1, title=$2, description=$3, latitude=$4, longitude=$5, price=$6 WHERE id=$7 RETURNING *",
      [newImage, title, description, latitude, longitude, price, hotelId]
    );
    const updatedHotel = result.rows[0];
    return res.json(updatedHotel);
  } catch (error) {
    return res.status(500).json({ message: "Error updating hotel", error });
  }
};

export const deleteHotel = async (req, res) => {
  const hotelId = req.params.id;

  if (!hotelId) {
    return res.status(400).json({ message: "Hotel ID is required" });
  }
  const existingHotelData = await pool.query(
    "SELECT * FROM hotels WHERE id = $1",
    [hotelId]
  );
  const existingHotel = existingHotelData.rows[0];
  if (!existingHotel) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  try {
    deleteImageFile(existingHotel.image);
    await pool.query("DELETE FROM hotels WHERE id = $1", [hotelId]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Error deleting hotel", error });
  }
};
