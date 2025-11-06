require('dotenv').config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg"); //  importing PostgreSQL
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "html"))); // Serve /html folder

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }, // needed for secure remote connections
});

// show inventory.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "inventory.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// API route to get inventory data
app.get("/api/inventory", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT supplyid, supplyname, unit, quantityonhand FROM inventory ORDER BY supplyid;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query for inventory failed" });
  }
});


app.get("/api/menu/:category", async (req, res) => {
  try {
    const category = req.params.category;
    console.log("Category requested:", category); // <--- check this
    const result = await pool.query(
      "SELECT * FROM menu WHERE itemcategory = $1",
      [category]
    );
    console.log("Rows returned:", result.rows.length); // <--- check this
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});