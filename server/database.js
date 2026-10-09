const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(__dirname, "supermarket.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  }
});

// Turn on foreign-key checking
db.run("PRAGMA foreign_keys = ON");

// Create all database tables
db.serialize(() => {

  // --------------------------------------------------
  // PRODUCTS
  // Base supermarket product catalogue
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      pack_size TEXT,
      purchase_cost REAL NOT NULL,
      selling_price REAL NOT NULL,
      initial_quantity INTEGER NOT NULL,
      is_perishable INTEGER NOT NULL DEFAULT 0,
      shelf_life_days INTEGER
    )
  `);

  // --------------------------------------------------
  // SIMULATION RUNS
  // One record for every 60-day simulation
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS simulation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'RUNNING',
      opening_inventory_cost REAL NOT NULL,
      opening_cash REAL NOT NULL DEFAULT 15000,
      closing_cash REAL,
      submitted_run INTEGER NOT NULL DEFAULT 0,
      model_config TEXT NOT NULL
    )
  `);

  // --------------------------------------------------
  // RUN PRODUCTS
  // Frozen copy of product configuration for each run
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS run_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchase_cost REAL NOT NULL,
      selling_price REAL NOT NULL,
      initial_quantity INTEGER NOT NULL,
      is_perishable INTEGER NOT NULL,
      shelf_life_days INTEGER,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // --------------------------------------------------
  // DAILY REPORTS
  // Summary evidence for every simulated day
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      customers INTEGER NOT NULL DEFAULT 0,
      transactions INTEGER NOT NULL DEFAULT 0,
      units_sold INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      cogs REAL NOT NULL DEFAULT 0,
      gross_profit REAL NOT NULL DEFAULT 0,
      write_off_units INTEGER NOT NULL DEFAULT 0,
      write_off_value REAL NOT NULL DEFAULT 0,
      replenishment_spend REAL NOT NULL DEFAULT 0,
      opening_cash REAL NOT NULL,
      closing_cash REAL NOT NULL,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id),
      UNIQUE (run_id, day_number)
    )
  `);

  // --------------------------------------------------
  // TRANSACTIONS
  // One record for each completed customer purchase
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      customer_type TEXT,
      shopping_mission TEXT,
      transaction_total REAL NOT NULL,
      transaction_cogs REAL NOT NULL,
      units INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // TRANSACTION ITEMS
  // Products contained inside each transaction
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      run_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // INVENTORY BATCHES
  // Tracks stock age so perishables can expire correctly
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      received_day INTEGER NOT NULL,
      expiry_day INTEGER,
      quantity_received INTEGER NOT NULL,
      quantity_remaining INTEGER NOT NULL,
      source TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // INVENTORY EVENTS
  // Audit trail for stock movements
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // REPLENISHMENT ORDERS
  // Orders placed by the autonomous Store Brain
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS replenishment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      order_day INTEGER NOT NULL,
      arrival_day INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // STORE BRAIN EVENTS
  // Explainable alerts and autonomous decisions
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS store_brain_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      product_id INTEGER,
      event_type TEXT NOT NULL,
      condition_detected TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      outcome TEXT,
      cash_constrained INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  // --------------------------------------------------
  // CASH EVENTS
  // Audit trail for revenue and replenishment spending
  // --------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS cash_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      reference_id INTEGER,
      notes TEXT,
      FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
    )
  `);

  console.log("Database tables are ready.");
});

module.exports = db;