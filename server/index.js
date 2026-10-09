
const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "Autonomous Supermarket",
  });
});

// --------------------------------------------------
// LATEST COMPLETED SIMULATION
// --------------------------------------------------
app.get("/api/report/commercial", (req, res) => {
  const query = `
    SELECT *
    FROM simulation_runs
    WHERE status = 'COMPLETED'
    ORDER BY id DESC
    LIMIT 1
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      console.error("Commercial report error:", err);
      return res.status(500).json({
        error: "Unable to retrieve commercial report",
      });
    }

    if (!row) {
      return res.status(404).json({
        error: "No completed simulation found",
      });
    }

    res.json(row);
  });
});

// --------------------------------------------------
// DAILY REPORT FOR THE LATEST COMPLETED RUN
// --------------------------------------------------
app.get("/api/report/day/:day", (req, res) => {
  const day = Number(req.params.day);

  if (!Number.isInteger(day) || day < 1 || day > 60) {
    return res.status(400).json({
      error: "Day must be between 1 and 60",
    });
  }

  const latestRunQuery = `
    SELECT id
    FROM simulation_runs
    WHERE status = 'COMPLETED'
    ORDER BY id DESC
    LIMIT 1
  `;

  db.get(latestRunQuery, [], (runError, run) => {
    if (runError) {
      console.error("Simulation lookup error:", runError);
      return res.status(500).json({
        error: "Unable to retrieve simulation",
      });
    }

    if (!run) {
      return res.status(404).json({
        error: "No completed simulation run found",
      });
    }

    const dayQuery = `
      SELECT *
      FROM daily_reports
      WHERE run_id = ? AND day_number = ?
      LIMIT 1
    `;

    db.get(dayQuery, [run.id, day], (err, row) => {
      if (err) {
        console.error("Daily report error:", err);
        return res.status(500).json({
          error: "Unable to retrieve daily report",
        });
      }

      if (!row) {
        return res.status(404).json({
          error: "Daily report not found",
        });
      }

      res.json(row);
    });
  });
});

// --------------------------------------------------
// REAL 60-DAY COMMERCIAL TOTALS
// --------------------------------------------------
app.get("/api/report/totals", (req, res) => {
  const latestRunQuery = `
    SELECT *
    FROM simulation_runs
    WHERE status = 'COMPLETED'
    ORDER BY id DESC
    LIMIT 1
  `;

  db.get(latestRunQuery, [], (runError, run) => {
    if (runError) {
      console.error("Simulation lookup error:", runError);
      return res.status(500).json({
        error: "Unable to retrieve simulation run",
      });
    }

    if (!run) {
      return res.status(404).json({
        error: "No completed simulation run found",
      });
    }

    const totalsQuery = `
      SELECT
        COUNT(*) AS days,
        COALESCE(SUM(customers), 0) AS customers,
        COALESCE(SUM(transactions), 0) AS transactions,
        COALESCE(SUM(units_sold), 0) AS unitsSold,
        ROUND(COALESCE(SUM(revenue), 0), 2) AS revenue,
        ROUND(COALESCE(SUM(cogs), 0), 2) AS cogs,
        ROUND(COALESCE(SUM(gross_profit), 0), 2) AS grossProfit,
        COALESCE(SUM(write_off_units), 0) AS expiredUnits,
        ROUND(COALESCE(SUM(write_off_value), 0), 2) AS writeOff,
        ROUND(COALESCE(SUM(replenishment_spend), 0), 2) AS replenishment
      FROM daily_reports
      WHERE run_id = ?
    `;

    db.get(totalsQuery, [run.id], (totalsError, totals) => {
      if (totalsError) {
        console.error("Commercial totals error:", totalsError);
        return res.status(500).json({
          error: "Unable to calculate commercial totals",
        });
      }

      const grossMargin =
        totals.revenue > 0
          ? Number(
              ((totals.grossProfit / totals.revenue) * 100).toFixed(2)
            )
          : 0;

      const conversionRate =
        totals.customers > 0
          ? Number(
              ((totals.transactions / totals.customers) * 100).toFixed(2)
            )
          : 0;

      res.json({
        runId: run.id,
        runName: run.run_name,
        status: run.status,
        days: totals.days,

        customers: totals.customers,
        transactions: totals.transactions,
        unitsSold: totals.unitsSold,

        revenue: totals.revenue,
        cogs: totals.cogs,
        grossProfit: totals.grossProfit,
        grossMargin,
        conversionRate,

        openingInventory: run.opening_inventory_cost,
        expiredUnits: totals.expiredUnits,
        writeOff: totals.writeOff,
        replenishment: totals.replenishment,

        openingCash: run.opening_cash,
        closingCash: run.closing_cash,
      });
    });
  });
});

// --------------------------------------------------
// ROOT
// --------------------------------------------------
app.get("/", (req, res) => {
  res.send("Autonomous Supermarket backend is running.");
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
