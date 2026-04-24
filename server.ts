import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Database Setup ---
  let pool: mysql.Pool | null = null;
  
  if (process.env.DB_HOST) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log("Connected to MySQL/MariaDB pool");
    } catch (err) {
      console.error("Failed to connect to MySQL:", err);
    }
  } else {
    console.warn("DB_HOST not found in environment. Running with in-memory storage.");
  }

  // --- In-Memory Fallback for Demo ---
  let records: any[] = [
    {
      id: '1',
      submittedAt: '2024-04-22',
      dsp: 'Manila',
      mobileNumber: '09123456789',
      simStatus: 'Ready',
      idType: 'National ID',
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Quincy',
      storeName: 'John\'s General Store',
      fullAddress: '123 Main St, Manila, Philippines',
      latitude: '14.5995',
      longitude: '120.9842',
      mpin: '123456',
      accountStatus: 'Active',
      progressStatus: 'Completed',
      onSystem: true,
      hasDti: true,
      hasSelfie: true,
      hasStorePhoto: true,
      hasSyncedGpo: true,
      remark: 'Verified'
    }
  ];

  // --- API Routes ---

  app.get("/api/accounts", async (req, res) => {
    if (pool) {
      try {
        const [rows] = await pool.query("SELECT * FROM accounts ORDER BY id DESC");
        return res.json(rows);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch accounts" });
      }
    }
    res.json(records);
  });

  app.post("/api/accounts", async (req, res) => {
    const data = req.body;
    if (pool) {
      try {
        const [result] = await pool.query(
          "INSERT INTO accounts SET ?",
          data
        );
        const insertId = (result as any).insertId;
        return res.json({ id: insertId, ...data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create account" });
      }
    }
    const newRecord = { ...data, id: Math.random().toString(36).substr(2, 9) };
    records.unshift(newRecord);
    res.json(newRecord);
  });

  app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (pool) {
      try {
        await pool.query("UPDATE accounts SET ? WHERE id = ?", [data, id]);
        return res.json({ id, ...data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update account" });
      }
    }
    records = records.map(r => r.id === id ? { ...r, ...data } : r);
    res.json({ id, ...data });
  });

  // --- Vite / Static Files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
