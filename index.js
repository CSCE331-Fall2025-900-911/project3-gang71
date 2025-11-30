require('dotenv').config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg"); //  importing PostgreSQL
const session = require('express-session'); // securing webpages before sign in
const { createClient } = require("@deepgram/sdk");
const deepl = require('deepl-node');

// const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const fetch = require('node-fetch');

// Simple in-memory server-side cache to avoid repeated DeepL calls
const translationCacheServer = new Map(); // key => translatedText, key format: `${targetLang}:${text}`
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const kitchenStatus = new Map(); // map to hold kitchen order statuses
const kitchenBumped = new Set(); // set to hold bumped order IDs

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// session middleware
app.use(session({
  secret: process.env.MIDDLEWARE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true if using HTTPS
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  // ssl: { rejectUnauthorized: false }, // needed for secure remote connections
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/index.html');
  }
  next();
}

app.use(express.static(path.join(__dirname, 'public'))); // serve login page


// show inventory.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "inventory.html"));
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
    const search = req.query.search || ""; // get the search keyword or default to empty string

    // ILIKE for case-insensitive matching
    const result = await pool.query(
      `SELECT menuid, itemname, itemprice, itemcategory, itemdescrip
       FROM menu
       WHERE itemname ILIKE $1
       ORDER BY menuid;`,
      [`%${search}%`] // parameterized query to avoid SQL injection
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
              COUNT("orderid") AS "quantitySol
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

// login for employees
app.get('/api/employeeLogin', async (req, res) => {
  const { user, userPassword } = req.query;

  const result = await pool.query(
    'SELECT firstname, lastname, employeerole FROM employee WHERE username=$1 AND password=$2',
    [user, userPassword]
  );

  if (result.rows.length === 0) {
    return res.json([]); // ALWAYS return array
  }

  const userData = result.rows[0];

  // create session
  req.session.user = {
    firstname: userData.firstname,
    lastname: userData.lastname,
    role: userData.employeerole
  };

  return res.json([userData]);
});

// login for customers
app.get("/api/customerlogin", async (req,res) => {
  const phoneNumber = req.query.phone;
  
  const result = await pool.query(
    "SELECT firstName, lastName FROM customer WHERE phoneNumber = $1;",
    [phoneNumber]
  );

  if (result.rows.length === 0) {
    return res.json([]);
  }

  const userData = result.rows[0];

  req.session.user = {
    firstname: userData.firstname,
    lastname: userData.lastname,
    role: "Customer"
  };
    
  res.json([userData]);
});

// retrieve client id from .env file
app.get("/api/clientid", async (req, res) =>{
  res.json(process.env.OAUTH_CLIENT_ID);
});

// retrieve email from oauth
// app.get("/api/email", async (req, res) => {
//   try {
//     const accessToken = req.query.token;
//     var emailReq = new XMLHttpRequest();
//     emailReq.open('GET', 'https://www.googleapis.com/oauth2/v2/userinfo');
//     emailReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);

//     emailReq.onload = function() {
//       res.json(emailReq.responseText);
//     }

//     emailReq.send();
//   } catch(err) {
//     console.log(err);
//     console.log("Error acquiring OAuth email");
//   }
// });
app.get("/api/email", async (req, res) => {
  try {
    const accessToken = req.query.token;
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch email' });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error acquiring OAuth email' });
  }
});

// check for employee with oauth email
app.get("/api/employeeoauth", async (req, res) => {
  const email = req.query.email;
    
  const result = await pool.query(
    "SELECT firstName, lastName, employeeRole FROM employee WHERE email = $1;",
    [email]
  );

  if (result.rows.length === 0) {
    return res.json([]);
  }

  const userData = result.rows[0];

  req.session.user = {
    firstname: userData.firstname,
    lastname: userData.lastname,
    role: userData.role
  };
    
  res.json([userData]);
});

// check for customer with oauth email
app.get("/api/customeroauth", async (req, res) => {
  const email = req.query.email;
  
  const result = await pool.query(
    "SELECT firstName, lastName FROM customer WHERE email = $1;",
    [email]
  );

  if (result.rows.length === 0) {
    return res.json([]);
  }

  const userData = result.rows[0];

  req.session.user = {
    firstname: userData.firstname,
    lastname: userData.lastname,
    role: "Customer"
  };
    
  res.json([userData]);
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send("Logout failed");
    }
    res.clearCookie('connect.sid') // clears the cookie in browser
    res.redirect('public/index.html');
  });
});


// get order number for cashier view
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT MAX(orderid) FROM \"order\";"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Place order endpoint
app.post('/api/orders/place', async (req, res) => {
  const { orderNumber, paymentMethod, subtotal, tax, total, items, timestamp } = req.body;
  
  try {
    // Get current date and time
    const orderDateTime = new Date(timestamp);
    const orderDate = orderDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const orderTime = orderDateTime.toTimeString().split(' ')[0]; // HH:MM:SS
    
    // Get the employeeID from session
    // You'll need to modify your login to also store employeeID in the session
    // For now, we'll query it based on the employee name in session
    const employeeName = req.session.user ? `${req.session.user.firstname} ${req.session.user.lastname}` : null;
    
    if (!employeeName) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Get employeeID from the employee table
    const empResult = await pool.query(
      'SELECT employeeid FROM employee WHERE firstname = $1 AND lastname = $2',
      [req.session.user.firstname, req.session.user.lastname]
    );
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeID = empResult.rows[0].employeeid;
    
    // Insert the order into the order table
    const orderQuery = `
      INSERT INTO "order" (orderid, orderprice, salestax, orderdate, ordertime, tips, employeeid)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING orderid
    `;
    
    await pool.query(orderQuery, [
      orderNumber,
      parseFloat(total),
      parseFloat(tax),
      orderDate,
      orderTime,
      0, // tips - starts at 0
      employeeID
    ]);
    
    // Now insert each drink into the drinks table
    // Get the current max drinkID to generate new IDs
    const maxDrinkIdResult = await pool.query('SELECT COALESCE(MAX(drinkid), 0) as maxid FROM drinks');
    let currentDrinkId = maxDrinkIdResult.rows[0].maxid;
    
    for (const item of items) {
      // For each quantity of the same drink
      for (let i = 0; i < item.quantity; i++) {
        currentDrinkId++;
        
        // Get the menuID for the drink by name
        const menuIdResult = await pool.query(
          'SELECT menuid FROM menu WHERE itemname = $1',
          [item.name]
        );
        
        if (menuIdResult.rows.length === 0) {
          console.error(`Menu item not found: ${item.name}`);
          continue;
        }
        
        const menuID = menuIdResult.rows[0].menuid;
        
        // Map size to menuID (you may need to adjust these based on your actual menu table)
        let cupSize = null;
        if (item.modifications.size === 'small') {
          const sizeResult = await pool.query("SELECT menuid FROM menu WHERE itemname ILIKE '%small%' LIMIT 1");
          cupSize = sizeResult.rows.length > 0 ? sizeResult.rows[0].menuid : null;
        } else if (item.modifications.size === 'medium') {
          const sizeResult = await pool.query("SELECT menuid FROM menu WHERE itemname ILIKE '%medium%' LIMIT 1");
          cupSize = sizeResult.rows.length > 0 ? sizeResult.rows[0].menuid : null;
        } else if (item.modifications.size === 'large') {
          const sizeResult = await pool.query("SELECT menuid FROM menu WHERE itemname ILIKE '%large%' LIMIT 1");
          cupSize = sizeResult.rows.length > 0 ? sizeResult.rows[0].menuid : null;
        }
        
        // Map sugar level to menuID
        let sugarLevel = null;
        const sugarResult = await pool.query("SELECT menuid FROM menu WHERE itemname ILIKE $1 LIMIT 1", [`%${item.modifications.sweetness}%sugar%`]);
        sugarLevel = sugarResult.rows.length > 0 ? sugarResult.rows[0].menuid : null;
        
        // Map ice amount to menuID
        let iceAmount = null;
        const iceResult = await pool.query("SELECT menuid FROM menu WHERE itemname ILIKE $1 LIMIT 1", [`%${item.modifications.ice}%ice%`]);
        iceAmount = iceResult.rows.length > 0 ? iceResult.rows[0].menuid : null;
        
        // Get topping menuIDs
        const topping1 = item.modifications.toppings[0] ? parseInt(item.modifications.toppings[0].id) : null;
        const topping2 = item.modifications.toppings[1] ? parseInt(item.modifications.toppings[1].id) : null;
        
        // Insert the drink
        const drinkQuery = `
          INSERT INTO drinks (drinkid, orderid, menuid, cupsize, sugarlevel, iceamount, topping1, topping2, totaldrinkprice)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        
        await pool.query(drinkQuery, [
          currentDrinkId,
          orderNumber,
          menuID,
          cupSize,
          sugarLevel,
          iceAmount,
          topping1,
          topping2,
          parseFloat(item.price)
        ]);
      }
    }
    
    res.json({ 
      success: true, 
      orderId: orderNumber,
      orderNumber: orderNumber 
    });
    
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order', details: error.message });
  }
});

app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    // Make request to Deepgram TTS
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-2-thalia-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    const stream = await response.getStream();
    const chunks = [];

    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
    
    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": buffer.length,
    });

    res.send(buffer);

  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "Failed to generate TTS" });
  }
});

// // Translation endpoint using DeepL API
// app.post("/api/translate", async (req, res) => {
//   try {
//     const { text, targetLang } = req.body;
//     if (!text || !targetLang) {
//       return res.status(400).json({ error: "Missing text or targetLang" });
//     }

//     // Normalize target language to DeepL format (ES, EN)
//     const targetNormalized = (typeof targetLang === 'string')
//       ? (targetLang.length === 2 ? targetLang.toUpperCase() : targetLang.toUpperCase())
//       : 'ES';

//     const deeplApiKey = process.env.DEEPL_API_KEY;
//     // using deepl-node client
//     if (deeplApiKey) {
//       try {
//         const translator = new deepl.Translator(deeplApiKey);
//         const result = await translator.translateText(text, null, targetNormalized);
//         // deepl-node returns .text for single translation
//         const translated = result?.text                                 //if result.text exists use that  
//           || (result?.translations && result.translations[0]?.text)     //otherwise, if result.translations[0].text exists, use that
//           || text;                                                      //otherwise, fall back to the original text 

//         return res.json({ translatedText: translated });
//       } catch (clientErr) {
//         console.error("DeepL client error:", clientErr);
//         // fallthrough to mock fallback below
//       }
//     }

//     // ---------Fallback mock translations for development (no external API)------------------
//     const mockDict = {
//       "La Colombe Cold Brews": "La Colombe Cold Brews", 
//       "Cart": "Carrito",
//       "Log out": "Cerrar sesión",
//       "Add to order": "Añadir al pedido",
//       "Seasonal Specials": "Especiales de temporada"
//     };

//     // Check if text exists in dictionary
//     if (mockDict[text]) {
//       return res.json({ translatedText: mockDict[text] });
//     }

//   } catch (err) {
//     console.error("Translation endpoint error:", err);
//     res.status(500).json({ error: "Translation request failed" });
//   }
// });

// Translation endpoint using DeepL API with server-side cache
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: "Missing text or targetLang" });
    }

    // Normalize target language to DeepL format (ES, EN)
    const targetNormalized = (typeof targetLang === 'string')
      ? (targetLang.length === 2 ? targetLang.toUpperCase() : targetLang.toUpperCase())
      : 'ES';

    const originalKey = text.trim();
    // const cacheKey = `${targetNormalized}:${originalKey}`;
    const cacheKey = `${targetNormalized}:${originalKey}`;

    // Check server-side cache first
    if (translationCacheServer.has(cacheKey)) {
      const cached = translationCacheServer.get(cacheKey);
      return res.json({ translatedText: cached });
    }

    const deeplApiKey = process.env.DEEPL_API_KEY;
    // using deepl-node client when key is present
    if (deeplApiKey) {
      try {
        const translator = new deepl.Translator(deeplApiKey);
        const result = await translator.translateText(originalKey, null, targetNormalized);
        const translated = result?.text || (result?.translations && result.translations[0]?.text) || originalKey;

        // cache the result
        translationCacheServer.set(cacheKey, translated);

        return res.json({ translatedText: translated });
      } catch (clientErr) {
        console.error("DeepL client error:", clientErr);
        // fallthrough to mock fallback below
      }
    }

    // Fallback mock translations for development (no external API)
    const mockDict = {
      'La Colombe Cold Brews': 'Cervezas Frías La Colombe',
      'Milk Teas': 'Tés con Leche',
      'Matcha': 'Matcha',
      'Slushes': 'Granizados',
      'Classics': 'Clásicos',
      'Punches': 'Ponches',
      'Milk Strikes': 'Golpes de Leche',
      'Oat Strikes': 'Golpes de Avena',
      'Milk Caps': 'Gorras de Leche',
      'Coffees': 'Cafés',
      'Yogurts': 'Yogures',
      'Cart': 'Carrito',
      'Logout': 'Cerrar Sesión',
      'Enable TTS': 'Habilitar TTS',
      'Cup Size:': 'Tamaño de Taza:',
      'Small': 'Pequeño',
      'Medium (+$0.50)': 'Mediano (+$0.50)',
      'Large (+$1.00)': 'Grande (+$1.00)',
      'Sweetness:': 'Dulzura:',
      'Ice:': 'Hielo:',
      'Toppings:': 'Coberturas:',
      'Topping 1': 'Cobertura 1',
      'Topping 2': 'Cobertura 2',
      'Boba': 'Boba',
      'Crystal Boba': 'Boba de Cristal',
      'Pudding': 'Pudín',
      'Grass Jelly': 'Gelatina de Hierba',
      'Cancel': 'Cancelar',
      'Add to Cart': 'Añadir al Carrito',
      '0%': '0%',
      '50%': '50%',
      '75%': '75%',
      '100%': '100%',
      '120%': '120%'
    };

    const fallback = mockDict[originalKey] || originalKey;
    // cache fallback as well to avoid repeated failed API attempts
    translationCacheServer.set(cacheKey, fallback);
    return res.json({ translatedText: fallback });

  } catch (err) {
    console.error("Translation endpoint error:", err);
    res.status(500).json({ error: "Translation request failed" });
  }
});


app.get('/weather', async (req, res) => {
  const city = 'College Station';
  const apiKey = process.env.OPENWEATHER_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

// api route to get kitchen order statuses
app.get("/api/kitchen/orders", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.orderid,
        o.orderdate,
        o.ordertime,
        COALESCE(c.firstname || ' ' || c.lastname, ' ') AS customername,
        d.drinkid,
        d.quantity,
        m.itemname
      FROM "order" o
      JOIN drinks d ON o.orderid = d.orderid
      JOIN menu m ON d.menuid = m.menuid
      LEFT JOIN customer c ON o.customerid = c.customerid
      WHERE o.orderdate = CURRENT_DATE
      ORDER BY o.orderdate, o.ordertime, o.orderid, d.drinkid;
      `);
      
      const rows = result.rows;
      const ordersMap = new Map();

      rows.forEach(r => {
        if (kitchenBumped.has(r.orderid)) {
          return; // skip bumped orders
        }

        if (!ordersMap.has(r.orderid)) {
          ordersMap.set(r.orderid, {
            orderid: r.orderid,
            orderdate: r.orderdate,
            ordertime: r.ordertime,
            customername: r.customername,
            status: kitchenStatus.get(r.orderid) || "New",
            items: [],
          });
        }

        ordersMap.get(r.orderid).items.push({
          drinkid: r.drinkid,
          name: r.itemname,
          quantity: r.quantity,
        });
      });

      res.json(Array.from(ordersMap.values()));
  } catch (err) {
    console.error("Database error (kitchen orders):", err);
    res.status(500).json({error: "Database query for kitchen orders failed" });
  }
});

// order status update (new -> in progress -> done)
app.patch("/api/kitchen/orders/:id/status", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !["New", "In Progress", "Done"].includes(status)) {
    return res.status(400).json({error: "Invalid Status"});
  }

  kitchenStatus.set(id, status);
  kitchenBumped.delete(id); // un-bump if previously bumped

  res.json({ orderid: id, status });
});

// bump an order (remove from kitchen view)
app.delete("/api/kitchen/orders/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  kitchenBumped.add(id);
  kitchenStatus.delete(id); // remove status tracking
  res.status(204).send();
});

// kitchen view
app.use("/manager", requireLogin, express.static(path.join(__dirname, "html", "manager")));
app.use("/kitchenView", requireLogin, express.static(path.join(__dirname, "html", "kitchenView")));
app.get("/kitchen", requireLogin, (req, res) => {
  res.redirect("/kitchenView/kitchen.html");
})

app.use(requireLogin, express.static(path.join(__dirname, "html")));
app.use(express.static(path.join(__dirname, "menuBoard")));

// start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
