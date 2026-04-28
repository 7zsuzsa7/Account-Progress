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
      submitted_at: '2024-04-22',
      dsp: 'Manila',
      mobile_number: '09123456789',
      sim_status: 'Ready',
      id_type: 'National ID',
      first_name: 'John',
      last_name: 'Doe',
      middle_name: 'Smith',
      store_name: 'John\'s General Store',
      address_full: '123 Main St, Manila, Philippines',
      latitude: '14.5995',
      longitude: '120.9842',
      passwords: '123456',
      account_status: 'Active',
      progress_status: 'Fully Verified',
      is_on_system: 1,
      dti_done: 1,
      selfie_done: 1,
      store_photo_done: 1,
      synced_to_gpo: 1,
      remark: 'Verified'
    },
    {
      id: '2',
      submitted_at: '2024-04-25',
      dsp: 'Cebu',
      mobile_number: '09876543213',
      sim_status: 'Ready',
      id_type: 'UMID',
      first_name: 'Jane',
      last_name: 'Smith',
      middle_name: 'Marie',
      store_name: 'Jane Bakery',
      address_full: '456 Second St, Cebu City',
      latitude: '10.3157',
      longitude: '123.8854',
      passwords: 'password123',
      account_status: 'Pending',
      progress_status: 'Step 2 Done',
      is_on_system: 1,
      dti_done: 1,
      selfie_done: 0,
      store_photo_done: 0,
      synced_to_gpo: 0,
      remark: 'Waiting for Step 3 GPO sync'
    }
  ];

  // --- API Routes ---

  function csvEscape(value: any) {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  }

  app.get("/api/accounts", async (req, res) => {
    try {
      const { keyword = '', dsp = '', progress_status = '', account_status = '', start_time = '', end_time = '' } = req.query as any;

      if (pool) {
        let sql = `SELECT * FROM gpo_account_progress WHERE 1 = 1`;
        const params: any[] = [];
        if (keyword) {
          sql += ` AND (mobile_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR middle_name LIKE ? OR store_name LIKE ? OR remark LIKE ?)`;
          params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }
        if (dsp) { sql += ` AND dsp = ? `; params.push(dsp); }
        if (progress_status) { sql += ` AND progress_status = ? `; params.push(progress_status); }
        if (account_status) { sql += ` AND account_status = ? `; params.push(account_status); }
        if (start_time) { sql += ` AND submitted_at >= ? `; params.push(start_time); }
        if (end_time) { sql += ` AND submitted_at <= ? `; params.push(end_time); }
        sql += ` ORDER BY id DESC `;
        const [rows] = await pool.execute(sql, params);
        return res.json(rows);
      }
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Query failed' });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    const data = req.body;
    if (pool) {
      try {
        const [result] = await pool.execute(
          `INSERT INTO gpo_account_progress (
            submitted_at, dsp, latitude, longitude, mobile_number, passwords, id_type, first_name, last_name, middle_name, store_name, address_full, account_status, sim_status, progress_status, dti_done, selfie_done, store_photo_done, is_on_system, synced_to_gpo, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [data.submitted_at, data.dsp, data.latitude, data.longitude, data.mobile_number, data.passwords, data.id_type, data.first_name, data.last_name, data.middle_name, data.store_name, data.address_full, data.account_status, data.sim_status, data.progress_status, data.dti_done, data.selfie_done, data.store_photo_done, data.is_on_system, data.remark]
        );
        const insertId = (result as any).insertId;
        return res.json({ id: insertId, ...data });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to create account" });
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
        await pool.execute(
          `UPDATE gpo_account_progress SET 
            submitted_at=?, dsp=?, latitude=?, longitude=?, mobile_number=?, passwords=?, id_type=?, first_name=?, last_name=?, middle_name=?, store_name=?, address_full=?, account_status=?, sim_status=?, progress_status=?, dti_done=?, selfie_done=?, store_photo_done=?, is_on_system=?, remark=?
          WHERE id = ?`,
          [data.submitted_at, data.dsp, data.latitude, data.longitude, data.mobile_number, data.passwords, data.id_type, data.first_name, data.last_name, data.middle_name, data.store_name, data.address_full, data.account_status, data.sim_status, data.progress_status, data.dti_done, data.selfie_done, data.store_photo_done, data.is_on_system, data.remark, id]
        );
        return res.json({ id, ...data });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to update account" });
      }
    }
    records = records.map(r => r.id === id ? { ...r, ...data } : r);
    res.json({ id, ...data });
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    if (pool) {
      try {
        await pool.execute(`DELETE FROM gpo_account_progress WHERE id = ?`, [id]);
        return res.json({ message: "Deleted successfully" });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    records = records.filter(r => r.id !== id);
    res.json({ message: "Deleted from memory" });
  });

  app.get("/api/accounts/export", async (req, res) => {
    try {
      const { keyword = '', dsp = '', progress_status = '', account_status = '', start_time = '', end_time = '' } = req.query as any;
      let rows = records;
      
      if (pool) {
        let sql = `SELECT * FROM gpo_account_progress WHERE 1 = 1`;
        const params: any[] = [];
        if (keyword) {
          sql += ` AND (mobile_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR middle_name LIKE ? OR store_name LIKE ? OR remark LIKE ?)`;
          params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }
        if (dsp) { sql += ` AND dsp = ? `; params.push(dsp); }
        if (progress_status) { sql += ` AND progress_status = ? `; params.push(progress_status); }
        if (account_status) { sql += ` AND account_status = ? `; params.push(account_status); }
        if (start_time) { sql += ` AND submitted_at >= ? `; params.push(start_time); }
        if (end_time) { sql += ` AND submitted_at <= ? `; params.push(end_time); }
        sql += ` ORDER BY id DESC `;
        const [result] = await pool.execute(sql, params);
        rows = result as any[];
      }

      const header = ['Submitted At', 'DSP', 'Latitude', 'Longitude', 'Mobile Number', 'Password', 'ID Type', 'First Name', 'Last Name', 'Middle Name', 'Store Name', 'Full Address', 'Account Status', 'SIM Status', 'Progress Status', 'DTI', 'Selfie', 'Store Photo', 'On System', 'Synced GPO', 'Remark'];
      const csvLines = [
        header.map(csvEscape).join(','),
        ...rows.map((row: any) => [
          row.submitted_at || '', row.dsp || '', row.latitude || '', row.longitude || '', row.mobile_number || '', row.passwords || '', row.id_type || '', row.first_name || '', row.last_name || '', row.middle_name || '', row.store_name || '', row.address_full || '', row.account_status || '', row.sim_status || '', row.progress_status || '', row.dti_done ? '✅' : '', row.selfie_done ? '✅' : '', row.store_photo_done ? '✅' : '', row.is_on_system ? '✅' : '', row.synced_to_gpo ? '✅' : '', row.remark || ''
        ].map(csvEscape).join(','))
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="export_${Date.now()}.csv"`);
      res.send('\uFEFF' + csvLines.join('\n'));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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
