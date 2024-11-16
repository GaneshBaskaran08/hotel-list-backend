import express from "express";
import {
  createHotel,
  deleteHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
} from "../service/hotels_service.js";
import upload from "../../../utils/upload.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const data = await getAllHotels(req, res);
  return data;
});

router.get("/:id", async (req, res) => {
  const data = await getHotelById(req, res);
  return data;
});

router.post("/", upload.single("image"), async (req, res) => {
  const data = await createHotel(req, res);
  return data;
});

router.put("/:id", upload.single("image"), async (req, res) => {
  const data = await updateHotel(req, res);
  return data;
});

router.delete("/:id", async (req, res) => {
  const data = await deleteHotel(req, res);
  return data;
});

export default router;
