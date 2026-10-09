const db = require("./database");

const DAYS = 60;
const OPENING_CASH = 15000;

// Customer model:
// Weekends are busier than weekdays.
// Each customer has a shopping mission that affects basket size.
const missions = [
  { name: "Quick Convenience", weight: 40, minItems: 1, maxItems: 3 },
  { name: "Meal Purchase", weight: 30, minItems: 2, maxItems: 5 },
  { name: "Top-Up Shop", weight: 20, minItems: 3, maxItems: 7 },
  { name: "Household Shop", weight: 10, minItems: 4, maxItems: 8 },
];

const categoryWeights = {
  "Grocery & Pantry": 20,
  "Dairy & Chilled": 18,
  "Fresh & Bakery": 14,
  "Ready-to-Eat": 14,
  Drinks: 14,
  "Snacks & Confectionery": 10,
  "Household Essentials": 6,
  "Personal & Convenience": 4,
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedChoice(items, weightGetter) {
  const total = items.reduce((sum, item) => sum + weightGetter(item), 0);
  let value = Math.random() * total;

  for (const item of items) {
    value -= weightGetter(item);
    if (value <= 0) return item;
  }

  return items[items.length - 1];
}

function chooseMission() {
  return weightedChoice(missions, (mission) => mission.weight);
}

function chooseProduct(products) {
  return weightedChoice(
    products,
    (product) => categoryWeights[product.category] || 5
  );
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function availableQuantity(runId, productId) {
  const row = await dbGet(
    `SELECT COALESCE(SUM(quantity_remaining), 0) AS qty
     FROM inventory_batches
     WHERE run_id = ? AND product_id = ? AND quantity_remaining > 0`,
    [runId, productId]
  );

  return row.qty;
}

async function consumeStock(runId, productId, quantity) {
  let remainingToSell = quantity;

  const batches = await dbAll(
    `SELECT *
     FROM inventory_batches
     WHERE run_id = ?
       AND product_id = ?
       AND quantity_remaining > 0
     ORDER BY
       CASE WHEN expiry_day IS NULL THEN 999999 ELSE expiry_day END ASC,
       received_day ASC,
       id ASC`,
    [runId, productId]
  );

  for (const batch of batches) {
    if (remainingToSell <= 0) break;

    const used = Math.min(batch.quantity_remaining, remainingToSell);

    await dbRun(
      `UPDATE inventory_batches
       SET quantity_remaining = quantity_remaining - ?
       WHERE id = ?`,
      [used, batch.id]
    );

    remainingToSell -= used;
  }

  return quantity - remainingToSell;
}

async function receiveReplenishments(runId, day, productsById) {
  const orders = await dbAll(
    `SELECT *
     FROM replenishment_orders
     WHERE run_id = ?
       AND arrival_day = ?
       AND status = 'ORDERED'`,
    [runId, day]
  );

  for (const order of orders) {
    const product = productsById[order.product_id];

    const expiryDay = product.is_perishable
      ? day + product.shelf_life_days
      : null;

    await dbRun(
      `INSERT INTO inventory_batches
       (
         run_id,
         product_id,
         received_day,
         expiry_day,
         quantity_received,
         quantity_remaining,
         source
       )
       VALUES (?, ?, ?, ?, ?, ?, 'REPLENISHMENT')`,
      [
        runId,
        order.product_id,
        day,
        expiryDay,
        order.quantity,
        order.quantity,
      ]
    );

    await dbRun(
      `INSERT INTO inventory_events
       (run_id, day_number, product_id, event_type, quantity, value, notes)
       VALUES (?, ?, ?, 'REPLENISHMENT_RECEIVED', ?, ?, ?)`,
      [
        runId,
        day,
        order.product_id,
        order.quantity,
        order.total_cost,
        `Order ${order.id} received`,
      ]
    );

    await dbRun(
      `UPDATE replenishment_orders
       SET status = 'RECEIVED'
       WHERE id = ?`,
      [order.id]
    );
  }
}

async function removeExpiredStock(runId, day, productsById) {
  const expiredBatches = await dbAll(
    `SELECT *
     FROM inventory_batches
     WHERE run_id = ?
       AND expiry_day IS NOT NULL
       AND expiry_day <= ?
       AND quantity_remaining > 0`,
    [runId, day]
  );

  let units = 0;
  let value = 0;

  for (const batch of expiredBatches) {
    const product = productsById[batch.product_id];
    const expiredQty = batch.quantity_remaining;
    const expiredValue = expiredQty * product.purchase_cost;

    units += expiredQty;
    value += expiredValue;

    await dbRun(
      `UPDATE inventory_batches
       SET quantity_remaining = 0
       WHERE id = ?`,
      [batch.id]
    );

    await dbRun(
      `INSERT INTO inventory_events
       (run_id, day_number, product_id, event_type, quantity, value, notes)
       VALUES (?, ?, ?, 'EXPIRED', ?, ?, 'Expired stock removed before customers arrived')`,
      [runId, day, batch.product_id, expiredQty, expiredValue]
    );

    await dbRun(
      `INSERT INTO store_brain_events
       (
         run_id,
         day_number,
         product_id,
         event_type,
         condition_detected,
         action_taken,
         outcome,
         cash_constrained
       )
       VALUES (?, ?, ?, 'EXPIRY', ?, ?, ?, 0)`,
      [
        runId,
        day,
        batch.product_id,
        `${expiredQty} unit(s) expired`,
        "Removed expired stock from sale",
        `Write-off value A$${expiredValue.toFixed(2)}`,
      ]
    );
  }

  return { units, value };
}

async function getRecentSales(runId, productId, day) {
  const fromDay = Math.max(1, day - 6);

  const row = await dbGet(
    `SELECT COALESCE(SUM(ti.quantity), 0) AS qty
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE ti.run_id = ?
       AND ti.product_id = ?
       AND t.day_number BETWEEN ? AND ?`,
    [runId, productId, fromDay, day]
  );

  return row.qty;
}

async function runStoreBrain(runId, day, products, currentCash) {
  let cash = currentCash;
  let replenishmentSpend = 0;

  for (const product of products) {
    const stock = await availableQuantity(runId, product.id);
    const recentSales = await getRecentSales(runId, product.id, day);

    // Different products have different target stock levels.
    const targetStock = product.is_perishable ? 35 : 50;
    const lowStockThreshold = product.is_perishable ? 10 : 15;

    let eventType = null;
    let condition = null;

    if (stock === 0) {
      eventType = "SOLD_OUT";
      condition = "Product has no available stock";
    } else if (stock <= lowStockThreshold) {
      eventType = "LOW_STOCK";
      condition = `Closing stock ${stock} is at or below threshold ${lowStockThreshold}`;
    } else if (day >= 14 && recentSales <= 2 && stock >= targetStock) {
      await dbRun(
        `INSERT INTO store_brain_events
         (
           run_id,
           day_number,
           product_id,
           event_type,
           condition_detected,
           action_taken,
           outcome,
           cash_constrained
         )
         VALUES (?, ?, ?, 'SLOW_MOVING', ?, ?, ?, 0)`,
        [
          runId,
          day,
          product.id,
          `Only ${recentSales} unit(s) sold in recent 7-day window while stock remains ${stock}`,
          "Flagged for manager attention; no automatic replenishment",
          "Stock retained and monitored",
        ]
      );

      continue;
    }

    if (!eventType) continue;

    // No Day 60 replenishment because there is no Day 61.
    if (day === DAYS) {
      await dbRun(
        `INSERT INTO store_brain_events
         (
           run_id,
           day_number,
           product_id,
           event_type,
           condition_detected,
           action_taken,
           outcome,
           cash_constrained
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          runId,
          day,
          product.id,
          eventType,
          condition,
          "Reported closing condition",
          "No replenishment placed because simulation ends on Day 60",
        ]
      );

      continue;
    }

    // Perishables are replenished more conservatively to reduce waste.
    const desiredStock = product.is_perishable
      ? Math.max(20, Math.ceil((recentSales / 7) * 5))
      : Math.max(targetStock, Math.ceil((recentSales / 7) * 10));

    const orderQty = Math.max(0, desiredStock - stock);

    if (orderQty === 0) {
      await dbRun(
        `INSERT INTO store_brain_events
         (
           run_id,
           day_number,
           product_id,
           event_type,
           condition_detected,
           action_taken,
           outcome,
           cash_constrained
         )
         VALUES (?, ?, ?, ?, ?, 'Monitor stock', 'No order required', 0)`,
        [runId, day, product.id, eventType, condition]
      );

      continue;
    }

    const orderCost = orderQty * product.purchase_cost;

    if (orderCost > cash) {
      await dbRun(
        `INSERT INTO store_brain_events
         (
           run_id,
           day_number,
           product_id,
           event_type,
           condition_detected,
           action_taken,
           outcome,
           cash_constrained
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          runId,
          day,
          product.id,
          eventType,
          condition,
          "Replenishment not placed",
          `Insufficient operating cash for A$${orderCost.toFixed(2)} order`,
        ]
      );

      continue;
    }

    const order = await dbRun(
      `INSERT INTO replenishment_orders
       (
         run_id,
         product_id,
         order_day,
         arrival_day,
         quantity,
         unit_cost,
         total_cost,
         status,
         reason
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ORDERED', ?)`,
      [
        runId,
        product.id,
        day,
        day + 1,
        orderQty,
        product.purchase_cost,
        orderCost,
        eventType,
      ]
    );

    cash -= orderCost;
    replenishmentSpend += orderCost;

    await dbRun(
      `INSERT INTO cash_events
       (
         run_id,
         day_number,
         event_type,
         amount,
         balance_after,
         reference_id,
         notes
       )
       VALUES (?, ?, 'REPLENISHMENT_SPEND', ?, ?, ?, ?)`,
      [
        runId,
        day,
        -orderCost,
        cash,
        order.id,
        `${orderQty} units of ${product.name}`,
      ]
    );

    await dbRun(
      `INSERT INTO store_brain_events
       (
         run_id,
         day_number,
         product_id,
         event_type,
         condition_detected,
         action_taken,
         outcome,
         cash_constrained
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        runId,
        day,
        product.id,
        eventType,
        condition,
        `Ordered ${orderQty} unit(s) for Day ${day + 1}`,
        `A$${orderCost.toFixed(2)} deducted from operating cash`,
      ]
    );
  }

  return { cash, replenishmentSpend };
}

async function simulateCustomer(runId, day, products, cashBeforeSale) {
  const mission = chooseMission();
  const requestedItems = randomInt(mission.minItems, mission.maxItems);

  const basket = new Map();

  for (let i = 0; i < requestedItems; i++) {
    const product = chooseProduct(products);
    const stock = await availableQuantity(runId, product.id);

    if (stock <= 0) continue;

    const existingQty = basket.get(product.id) || 0;

    if (existingQty < stock) {
      basket.set(product.id, existingQty + 1);
    }
  }

  if (basket.size === 0) {
    return {
      completed: false,
      cash: cashBeforeSale,
      units: 0,
      revenue: 0,
      cogs: 0,
    };
  }

  let total = 0;
  let cogs = 0;
  let units = 0;
  const lines = [];

  for (const [productId, requestedQty] of basket.entries()) {
    const product = products.find((p) => p.id === productId);
    const stock = await availableQuantity(runId, productId);
    const qty = Math.min(requestedQty, stock);

    if (qty <= 0) continue;

    await consumeStock(runId, productId, qty);

    const lineTotal = qty * product.selling_price;
    const lineCogs = qty * product.purchase_cost;

    total += lineTotal;
    cogs += lineCogs;
    units += qty;

    lines.push({
      product,
      qty,
      lineTotal,
    });

    await dbRun(
      `INSERT INTO inventory_events
       (run_id, day_number, product_id, event_type, quantity, value, notes)
       VALUES (?, ?, ?, 'SALE', ?, ?, 'Stock sold through customer transaction')`,
      [runId, day, productId, -qty, lineCogs]
    );
  }

  if (units === 0) {
    return {
      completed: false,
      cash: cashBeforeSale,
      units: 0,
      revenue: 0,
      cogs: 0,
    };
  }

  const transaction = await dbRun(
    `INSERT INTO transactions
     (
       run_id,
       day_number,
       customer_type,
       shopping_mission,
       transaction_total,
       transaction_cogs,
       units,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId,
      day,
      mission.name,
      mission.name,
      total,
      cogs,
      units,
      new Date().toISOString(),
    ]
  );

  for (const line of lines) {
    await dbRun(
      `INSERT INTO transaction_items
       (
         transaction_id,
         run_id,
         product_id,
         product_name,
         quantity,
         unit_price,
         unit_cost,
         line_total
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        runId,
        line.product.id,
        line.product.name,
        line.qty,
        line.product.selling_price,
        line.product.purchase_cost,
        line.lineTotal,
      ]
    );
  }

  const newCash = cashBeforeSale + total;

  await dbRun(
    `INSERT INTO cash_events
     (
       run_id,
       day_number,
       event_type,
       amount,
       balance_after,
       reference_id,
       notes
     )
     VALUES (?, ?, 'SALE_REVENUE', ?, ?, ?, 'Customer transaction')`,
    [runId, day, total, newCash, transaction.id]
  );

  return {
    completed: true,
    cash: newCash,
    units,
    revenue: total,
    cogs,
  };
}

async function createRun() {
  const products = await dbAll("SELECT * FROM products ORDER BY id");

  if (products.length === 0) {
    throw new Error("No products found. Run node seed.js first.");
  }

  const openingInventoryCost = products.reduce(
    (sum, product) =>
      sum + product.purchase_cost * product.initial_quantity,
    0
  );

  if (openingInventoryCost > 40000) {
    throw new Error("Opening inventory exceeds A$40,000.");
  }

  const modelConfig = {
    simulationDays: 60,
    openingCash: OPENING_CASH,
    location: "Swanston Street / Melbourne Town Hall vicinity, Melbourne CBD",
    customerModel:
      "Weekends are busier than weekdays. Shopping missions influence basket size.",
    demandModel:
      "Category-weighted product selection creates non-uniform demand.",
    expiryModel:
      "Perishable stock is batch-tracked and removed before customers arrive on its expiry day.",
    storeBrain:
      "Rule-based low-stock, sold-out, slow-moving, expiry and replenishment logic with one-day lead time and cash constraint.",
  };

  const run = await dbRun(
    `INSERT INTO simulation_runs
     (
       run_name,
       started_at,
       status,
       opening_inventory_cost,
       opening_cash,
       model_config
     )
     VALUES (?, ?, 'RUNNING', ?, ?, ?)`,
    [
      `60-Day Simulation ${new Date().toISOString()}`,
      new Date().toISOString(),
      openingInventoryCost,
      OPENING_CASH,
      JSON.stringify(modelConfig),
    ]
  );

  const runId = run.id;

  for (const product of products) {
    await dbRun(
      `INSERT INTO run_products
       (
         run_id,
         product_id,
         product_name,
         category,
         purchase_cost,
         selling_price,
         initial_quantity,
         is_perishable,
         shelf_life_days
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runId,
        product.id,
        product.name,
        product.category,
        product.purchase_cost,
        product.selling_price,
        product.initial_quantity,
        product.is_perishable,
        product.shelf_life_days,
      ]
    );

    const expiryDay = product.is_perishable
      ? product.shelf_life_days
      : null;

    await dbRun(
      `INSERT INTO inventory_batches
       (
         run_id,
         product_id,
         received_day,
         expiry_day,
         quantity_received,
         quantity_remaining,
         source
       )
       VALUES (?, ?, 0, ?, ?, ?, 'OPENING')`,
      [
        runId,
        product.id,
        expiryDay,
        product.initial_quantity,
        product.initial_quantity,
      ]
    );

    await dbRun(
      `INSERT INTO inventory_events
       (
         run_id,
         day_number,
         product_id,
         event_type,
         quantity,
         value,
         notes
       )
       VALUES (?, 0, ?, 'OPENING_STOCK', ?, ?, 'Opening inventory')`,
      [
        runId,
        product.id,
        product.initial_quantity,
        product.purchase_cost * product.initial_quantity,
      ]
    );
  }

  return { runId, products, openingInventoryCost };
}

async function simulate60Days() {
  console.log("Starting 60-day Autonomous Supermarket simulation...");

  const { runId, products, openingInventoryCost } = await createRun();

  const productsById = {};
  products.forEach((product) => {
    productsById[product.id] = product;
  });

  let cash = OPENING_CASH;

  await dbRun(
    `INSERT INTO cash_events
     (
       run_id,
       day_number,
       event_type,
       amount,
       balance_after,
       notes
     )
     VALUES (?, 0, 'OPENING_CASH', ?, ?, 'Opening operating cash')`,
    [runId, OPENING_CASH, OPENING_CASH]
  );

  for (let day = 1; day <= DAYS; day++) {
    const openingCash = cash;

    await receiveReplenishments(runId, day, productsById);

    const expiry = await removeExpiredStock(
      runId,
      day,
      productsById
    );

    // Monday = Day 1.
    // Days 6/7, 13/14, etc. are weekends.
    const dayOfWeek = ((day - 1) % 7) + 1;
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;

    // Plausible small CBD supermarket traffic.
    const customerCount = isWeekend
      ? randomInt(85, 120)
      : randomInt(60, 90);

    let transactions = 0;
    let unitsSold = 0;
    let revenue = 0;
    let cogs = 0;

    for (let customer = 0; customer < customerCount; customer++) {
      const result = await simulateCustomer(
        runId,
        day,
        products,
        cash
      );

      cash = result.cash;

      if (result.completed) {
        transactions++;
        unitsSold += result.units;
        revenue += result.revenue;
        cogs += result.cogs;
      }
    }

    const brain = await runStoreBrain(
      runId,
      day,
      products,
      cash
    );

    cash = brain.cash;

    const grossProfit = revenue - cogs;

    await dbRun(
      `INSERT INTO daily_reports
       (
         run_id,
         day_number,
         customers,
         transactions,
         units_sold,
         revenue,
         cogs,
         gross_profit,
         write_off_units,
         write_off_value,
         replenishment_spend,
         opening_cash,
         closing_cash
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runId,
        day,
        customerCount,
        transactions,
        unitsSold,
        revenue,
        cogs,
        grossProfit,
        expiry.units,
        expiry.value,
        brain.replenishmentSpend,
        openingCash,
        cash,
      ]
    );

    console.log(
      `Day ${day}: customers=${customerCount}, transactions=${transactions}, revenue=A$${revenue.toFixed(
        2
      )}, closing cash=A$${cash.toFixed(2)}`
    );
  }

  await dbRun(
    `UPDATE simulation_runs
     SET status = 'COMPLETED',
         completed_at = ?,
         closing_cash = ?
     WHERE id = ?`,
    [new Date().toISOString(), cash, runId]
  );

  const totals = await dbGet(
    `SELECT
       SUM(customers) AS customers,
       SUM(transactions) AS transactions,
       SUM(units_sold) AS units_sold,
       SUM(revenue) AS revenue,
       SUM(cogs) AS cogs,
       SUM(gross_profit) AS gross_profit,
       SUM(write_off_units) AS write_off_units,
       SUM(write_off_value) AS write_off_value,
       SUM(replenishment_spend) AS replenishment_spend
     FROM daily_reports
     WHERE run_id = ?`,
    [runId]
  );

  console.log("\n==========================================");
  console.log("60-DAY SIMULATION COMPLETE");
  console.log("==========================================");
  console.log(`Run ID: ${runId}`);
  console.log(`Opening inventory: A$${openingInventoryCost.toFixed(2)}`);
  console.log(`Opening cash: A$${OPENING_CASH.toFixed(2)}`);
  console.log(`Customers: ${totals.customers}`);
  console.log(`Transactions: ${totals.transactions}`);
  console.log(`Units sold: ${totals.units_sold}`);
  console.log(`Revenue: A$${totals.revenue.toFixed(2)}`);
  console.log(`COGS: A$${totals.cogs.toFixed(2)}`);
  console.log(`Gross profit: A$${totals.gross_profit.toFixed(2)}`);
  console.log(`Expired units: ${totals.write_off_units}`);
  console.log(`Write-off value: A$${totals.write_off_value.toFixed(2)}`);
  console.log(
    `Replenishment spend: A$${totals.replenishment_spend.toFixed(2)}`
  );
  console.log(`Closing operating cash: A$${cash.toFixed(2)}`);
  console.log("==========================================");

  return runId;
}

if (require.main === module) {
  simulate60Days()
    .then(() => {
      console.log("Simulation history saved successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Simulation failed:", error);
      process.exit(1);
    });
}

module.exports = {
  simulate60Days,
};