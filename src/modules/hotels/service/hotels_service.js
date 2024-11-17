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
  const { title, minPrice, maxPrice, limit, page } = req.query;

  let query = "SELECT * FROM hotels WHERE 1=1";
  let countQuery = "SELECT COUNT(*) FROM hotels WHERE 1=1";
  let params = [];
  let countParams = [];

  if (title) {
    query += ` AND LOWER(title) LIKE $${params.length + 1}`;
    countQuery += ` AND LOWER(title) LIKE $${countParams.length + 1}`;
    params.push(`%${title.toLowerCase()}%`);
    countParams.push(`%${title.toLowerCase()}%`);
  }

  if (minPrice && maxPrice) {
    query += ` AND price BETWEEN $${params.length + 1} AND $${
      params.length + 2
    }`;
    countQuery += ` AND price BETWEEN $${countParams.length + 1} AND $${
      countParams.length + 2
    }`;
    params.push(minPrice, maxPrice);
    countParams.push(minPrice, maxPrice);
  } else if (minPrice) {
    query += ` AND price >= $${params.length + 1}`;
    countQuery += ` AND price >= $${countParams.length + 1}`;
    params.push(minPrice);
    countParams.push(minPrice);
  } else if (maxPrice) {
    query += ` AND price <= $${params.length + 1}`;
    countQuery += ` AND price <= $${countParams.length + 1}`;
    params.push(maxPrice);
    countParams.push(maxPrice);
  }

  const itemsPerPage = parseInt(limit) || 5;
  const currentPage = parseInt(page) || 1;
  const offset = (currentPage - 1) * itemsPerPage;

  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(itemsPerPage, offset);

  try {
    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const data = await pool.query(query, params);
    const hotels = data.rows.map((hotel) => ({
      ...hotel,
      image: hotel.image
        ? `${req.protocol}://${req.get("host")}${hotel.image}`
        : null,
    }));

    return res.json({
      hotels,
      totalItems,
      currentPage,
      itemsPerPage,
      totalPages: Math.ceil(totalItems / itemsPerPage),
    });
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
  const imageUrl = hotel.image
    ? `${req.protocol}://${req.get("host")}${hotel.image}`
    : null;

  const response = {
    ...hotel,
    image: imageUrl,
  };

  if (hotel) res.json(response);
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
    const imageUrl = updatedHotel.image
    ? `${req.protocol}://${req.get("host")}${updatedHotel.image}`
    : null;

  const response = {
    ...updatedHotel,
    image: imageUrl,
  };
    return res.json(response);
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
