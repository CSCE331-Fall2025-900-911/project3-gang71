require('dotenv').config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg"); //  importing PostgreSQL
const cors = require("cors");

// for local testing
require('dotenv').config();

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
  // ssl: { rejectUnauthorized: false }, // needed for secure remote connections
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
      "SELECT supplyid, supplyname, supplyprice, unit, quantityonhand FROM inventory ORDER BY supplyid;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query for inventory failed" });
  }
});

// API route to get employee data
app.get("/api/employee", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT employeeid, firstname, lastname, employeerole, payrate, hoursworked FROM employee ORDER BY employeeid;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query for employee failed" });
  }
});

// API route to get all menu items
app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT menuid, itemname, itemprice, itemcategory, itemdescrip FROM menu ORDER BY menuid;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query for menu failed" });
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

// API route to add an inventory item
app.post("/api/inventory", async (req, res) => {
  try {
    const { name, price, unit, quantity } = req.body;
    if (!name || isNaN(price) || !unit || isNaN(quantity)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const result = await pool.query(
      "INSERT INTO inventory (supplyname, supplyprice, unit, quantityonhand) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, unit, quantity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// API route to add a menu item
app.post("/api/menu", async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || isNaN(price) || !category) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Start a transaction
    await pool.query('BEGIN');

    // Get the next available menuid
    const maxIdResult = await pool.query('SELECT MAX(menuid) FROM menu');
    const nextId = (maxIdResult.rows[0].max || 0) + 1;

    const result = await pool.query(
      "INSERT INTO menu (menuid, itemname, itemprice, itemcategory, itemdescrip) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nextId, name, price, category, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

//API route to delete an inventory item
app.delete("/api/inventory/:name", async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await pool.query(
      "DELETE FROM inventory WHERE supplyname = $1 RETURNING *",
      [name]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database delete failed" });
  }
});


//API route to delete a menu item
app.delete("/api/menu/:name", async (req, res) => {
  try {
    const name = req.params.name;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await pool.query(
      "DELETE FROM menu WHERE itemname = $1 RETURNING *",
      [name]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database delete failed" });
  }
});

// API route to get daily sales
app.get("/api/dailySales", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT TO_CHAR("orderdate", 'YYYY-MM-DD') AS "productName",
              COUNT("orderid") AS "quantitySold",
              SUM("orderprice" + "salestax" + COALESCE("tips", 0)) AS "totalRevenue"
      FROM "order"
      WHERE "orderdate" BETWEEN $1 AND $2
      GROUP BY "orderdate"
      ORDER BY "orderdate";`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get weekly sales
app.get("/api/weeklySales", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT TO_CHAR("orderdate", 'IYYY-IW') AS "productName",
              COUNT("orderid") AS "quantitySold",
              SUM("orderprice" + "salestax" + COALESCE("tips", 0)) AS "totalRevenue"
      FROM "order"
      WHERE "orderdate" BETWEEN $1 AND $2
      GROUP BY TO_CHAR("orderdate", 'IYYY-IW')
      ORDER BY TO_CHAR("orderdate", 'IYYY-IW');`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get month sales
app.get("/api/monthlySales", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT TO_CHAR("orderdate", 'YYYY-MM') AS "productName",
              COUNT("orderid") AS "quantitySold",
              SUM("orderprice" + "salestax" + COALESCE("tips", 0)) AS "totalRevenue"
      FROM "order"
      WHERE "orderdate" BETWEEN $1 AND $2
      GROUP BY TO_CHAR("orderdate", 'YYYY-MM')
      ORDER BY TO_CHAR("orderdate", 'YYYY-MM');`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get yearly sales
app.get("/api/yearlySales", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT TO_CHAR("orderdate", 'YYYY') AS "productName",
              COUNT("orderid") AS "quantitySold",
              SUM("orderprice" + "salestax" + COALESCE("tips", 0)) AS "totalRevenue"
      FROM "order"
      WHERE "orderdate" BETWEEN $1 AND $2
      GROUP BY TO_CHAR("orderdate", 'YYYY')
      ORDER BY TO_CHAR("orderdate", 'YYYY');`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get top selling products
app.get("/api/topSellingProducts", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT m.itemname AS "productName",
              COUNT(d.drinkid) AS "quantitySold",
              SUM(d.totaldrinkprice) AS "totalRevenue"
      FROM drinks d
      JOIN menu m ON d.menuid = m.menuid
      JOIN "order" o ON d.orderid = o.orderid
      WHERE o.orderdate BETWEEN $1 AND $2
      GROUP BY m.itemname
      ORDER BY COUNT(d.drinkid) DESC
      LIMIT 10;`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get the restock report
app.get("/api/restockReport", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT supplyName AS "productName",
              quantityOnHand AS "quantitySold",
              0 AS "totalRevenue"
      FROM inventory
      WHERE quantityOnHand < 100
      ORDER BY quantityOnHand ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get employee performance
app.get("/api/employeePerformance", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT e.firstname || ' ' || e.lastname AS "productName",
              COUNT(o.orderid) AS "quantitySold",
              SUM(o.orderprice + o.salestax + COALESCE(o.tips, 0)) AS "totalRevenue"
      FROM "order" o
      JOIN employee e ON o.employeeid = e.employeeid
      WHERE o.orderdate BETWEEN $1 AND $2
      GROUP BY e.firstname, e.lastname
      ORDER BY "totalRevenue" DESC;`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get the product usage chart
app.get("/api/productUsageChart", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT i.supplyname AS "productName",
              SUM(r.quantity) AS "quantitySold",
              SUM(r.quantity * i.supplyprice) AS "totalRevenue"
      FROM "order" o
      JOIN drinks d ON o.orderid = d.orderid
      JOIN recipe r ON d.menuid = r.itemid
      JOIN inventory i ON r.supplyid = i.supplyid
      WHERE o.orderdate BETWEEN $1 AND $2
      GROUP BY i.supplyname
      ORDER BY SUM(r.quantity) DESC;`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get sales by item
app.get("/api/salesByItem", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const result = await pool.query(
      `SELECT m.itemname AS "productName",
              COUNT(d.drinkid) AS "quantitySold",
              SUM(d.totaldrinkprice) AS "totalRevenue"
      FROM drinks d
      JOIN menu m ON d.menuid = m.menuid
      JOIN "order" o ON d.orderid = o.orderid
      WHERE o.orderdate BETWEEN $1 AND $2
      GROUP BY m.itemname
      ORDER BY "totalRevenue" DESC;`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get Z report
app.get("/api/zReport", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT SUM(o.orderprice) AS totalSales,
              SUM(COALESCE(o.tips, 0)) AS totalTips,
              SUM(o.salestax) AS totalTax,
              e.employeeid,
              e.firstname || ' ' || e.lastname AS employeeName,
              SUM(o.orderprice) AS employeeSales
      FROM "order" o
      JOIN employee e ON o.employeeid = e.employeeid
      WHERE o.orderdate = CURRENT_DATE
      GROUP BY e.employeeid, e.firstname, e.lastname;`
    );
    let totalSales = 0, totalTips = 0, totalTax = 0;
    const employeeSales = {};
    result.rows.forEach(row => {
      totalSales += parseFloat(row.totalsales);
      totalTips += parseFloat(row.totaltips);
      totalTax += parseFloat(row.totaltax);
      employeeSales[row.employeeid] = {
        name: row.employeename,
        sales: parseFloat(row.employeesales)
      };
    });
    res.json({totalSales, totalTips, totalTax, employeeSales});
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// API route to get X report
app.get("/api/xReport", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT EXTRACT(HOUR FROM o.ordertime) AS hour,
              COUNT(DISTINCT o.orderid) AS numOrders,
              SUM(o.orderprice) AS totalSales,
              AVG(o.orderprice) AS avgOrderPrice,
              SUM(COALESCE(o.tips, 0)) AS totalTips,
              COUNT(d.drinkid) AS totalDrinks
      FROM "order" o
      LEFT JOIN drinks d ON o.orderid = d.orderid
      WHERE o.orderdate = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM o.ordertime)
      ORDER BY hour;`
    );
    const xReportData = result.rows.map(row => ({
      hour: parseInt(row.hour),
      numOrders: parseInt(row.numorders),
      totalSales: parseFloat(row.totalsales),
      avgOrderPrice: parseFloat(row.avgorderprice),
      totalTips: parseFloat(row.totaltips),
      totalDrinks: parseInt(row.totaldrinks),
    }));
    res.json(xReportData);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});



// API route to get customer data
app.get("/api/customer", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT customerid, firstname, lastname, phonenumber, loyaltypoints FROM customer ORDER BY customerid;"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query for customer failed" });
  }
});

// login
app.get("/api/login", async (req, res) => {
  try {
    const username = req.query.user;
    const password = req.query.userPassword;
    const result = await pool.query(
      "SELECT firstName, lastName, employeeRole FROM employee WHERE username = $1 AND password = $2;",
      [username, password]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error: ", err);
    res.status(500).json({error: "Database query for login failed"});
  }
});
