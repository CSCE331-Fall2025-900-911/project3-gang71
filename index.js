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
  user: "gang_71",
  host: "csce-315-db.engr.tamu.edu",
  database: "gang_71_db",
  password: "nxzB4p7Y",
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
    res.status(500).json({ error: "Database query failed" });
  }
});
