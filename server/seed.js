const db = require("./database");

const products = [
  // Grocery & Pantry
  ["White Bread 700g", "Grocery & Pantry", "700g", 2.20, 4.20, 70, 1, 5],
  ["Wholemeal Bread 700g", "Grocery & Pantry", "700g", 2.40, 4.50, 55, 1, 5],
  ["Basmati Rice 1kg", "Grocery & Pantry", "1kg", 3.80, 7.50, 70, 0, null],
  ["Pasta Spaghetti 500g", "Grocery & Pantry", "500g", 1.60, 3.50, 60, 0, null],
  ["Pasta Sauce 500g", "Grocery & Pantry", "500g", 2.30, 4.80, 45, 0, null],
  ["Canned Tomatoes 400g", "Grocery & Pantry", "400g", 1.20, 2.50, 55, 0, null],
  ["Baked Beans 420g", "Grocery & Pantry", "420g", 1.40, 3.00, 50, 0, null],
  ["Breakfast Cereal 500g", "Grocery & Pantry", "500g", 3.50, 7.00, 45, 0, null],
  ["Peanut Butter 375g", "Grocery & Pantry", "375g", 2.80, 5.50, 35, 0, null],
  ["Instant Noodles 5 Pack", "Grocery & Pantry", "5 pack", 2.40, 5.00, 60, 0, null],

  // Dairy & Chilled
  ["Full Cream Milk 2L", "Dairy & Chilled", "2L", 2.40, 4.60, 70, 1, 8],
  ["Low Fat Milk 2L", "Dairy & Chilled", "2L", 2.40, 4.60, 50, 1, 8],
  ["Greek Yoghurt 500g", "Dairy & Chilled", "500g", 3.20, 6.20, 40, 1, 14],
  ["Cheddar Cheese 500g", "Dairy & Chilled", "500g", 5.00, 9.50, 40, 1, 30],
  ["Butter 500g", "Dairy & Chilled", "500g", 4.20, 7.50, 35, 1, 35],
  ["Eggs 12 Pack", "Dairy & Chilled", "12 pack", 4.20, 7.20, 55, 1, 21],

  // Fresh & Bakery
  ["Bananas 1kg", "Fresh & Bakery", "1kg", 2.00, 4.00, 55, 1, 6],
  ["Apples 1kg", "Fresh & Bakery", "1kg", 3.00, 5.50, 45, 1, 12],
  ["Oranges 1kg", "Fresh & Bakery", "1kg", 2.80, 5.00, 40, 1, 14],
  ["Tomatoes 500g", "Fresh & Bakery", "500g", 2.20, 4.50, 40, 1, 8],
  ["Avocado 2 Pack", "Fresh & Bakery", "2 pack", 2.50, 5.00, 35, 1, 7],
  ["Croissants 4 Pack", "Fresh & Bakery", "4 pack", 3.20, 6.00, 30, 1, 4],

  // Ready-to-Eat
  ["Chicken Sandwich", "Ready-to-Eat", "1 pack", 3.80, 8.50, 35, 1, 3],
  ["Vegetable Sandwich", "Ready-to-Eat", "1 pack", 3.20, 7.50, 30, 1, 3],
  ["Chicken Caesar Salad", "Ready-to-Eat", "1 bowl", 4.50, 9.50, 30, 1, 3],
  ["Vegetable Salad Bowl", "Ready-to-Eat", "1 bowl", 4.00, 8.50, 25, 1, 3],
  ["Chicken Wrap", "Ready-to-Eat", "1 pack", 4.00, 8.50, 30, 1, 3],
  ["Microwave Chicken Meal", "Ready-to-Eat", "1 meal", 4.80, 10.00, 35, 1, 7],

  // Drinks
  ["Still Water 600ml", "Drinks", "600ml", 0.80, 2.50, 100, 0, null],
  ["Sparkling Water 600ml", "Drinks", "600ml", 1.00, 3.00, 65, 0, null],
  ["Cola 600ml", "Drinks", "600ml", 1.40, 4.00, 85, 0, null],
  ["Orange Juice 1L", "Drinks", "1L", 2.50, 5.50, 50, 1, 21],
  ["Apple Juice 1L", "Drinks", "1L", 2.50, 5.50, 40, 1, 21],
  ["Energy Drink 250ml", "Drinks", "250ml", 1.60, 4.00, 60, 0, null],
  ["Iced Coffee 500ml", "Drinks", "500ml", 2.20, 5.00, 50, 1, 14],

  // Snacks & Confectionery
  ["Original Potato Chips 175g", "Snacks & Confectionery", "175g", 2.20, 5.00, 55, 0, null],
  ["Salt and Vinegar Chips 175g", "Snacks & Confectionery", "175g", 2.20, 5.00, 45, 0, null],
  ["Milk Chocolate Bar 180g", "Snacks & Confectionery", "180g", 2.50, 5.50, 55, 0, null],
  ["Chocolate Biscuits 200g", "Snacks & Confectionery", "200g", 2.20, 4.80, 45, 0, null],
  ["Muesli Bars 6 Pack", "Snacks & Confectionery", "6 pack", 2.80, 5.50, 40, 0, null],
  ["Mixed Nuts 200g", "Snacks & Confectionery", "200g", 3.50, 7.00, 35, 0, null],

  // Household Essentials
  ["Toilet Paper 8 Pack", "Household Essentials", "8 rolls", 5.50, 10.00, 35, 0, null],
  ["Paper Towels 2 Pack", "Household Essentials", "2 rolls", 3.00, 6.00, 30, 0, null],
  ["Dishwashing Liquid 500ml", "Household Essentials", "500ml", 2.00, 4.50, 30, 0, null],
  ["Laundry Liquid 1L", "Household Essentials", "1L", 4.50, 9.00, 25, 0, null],
  ["Garbage Bags 20 Pack", "Household Essentials", "20 pack", 2.50, 5.50, 25, 0, null],

  // Personal & Convenience
  ["Toothpaste 110g", "Personal & Convenience", "110g", 2.20, 5.00, 30, 0, null],
  ["Toothbrush Medium", "Personal & Convenience", "1 pack", 1.50, 4.00, 30, 0, null],
  ["Shampoo 400ml", "Personal & Convenience", "400ml", 3.50, 7.50, 25, 0, null],
  ["Hand Wash 250ml", "Personal & Convenience", "250ml", 2.00, 4.50, 25, 0, null]
];

const openingCost = products.reduce(
  (total, product) => total + product[3] * product[5],
  0
);

console.log(`Products prepared: ${products.length}`);
console.log(`Opening inventory cost: A$${openingCost.toFixed(2)}`);

if (openingCost > 40000) {
  console.error("ERROR: Opening inventory exceeds the A$40,000 client limit.");
  process.exit(1);
}

db.serialize(() => {
  // Safe during development: only seed if catalogue is empty.
  db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
    if (err) {
      console.error("Could not check product catalogue:", err.message);
      return;
    }

    if (row.count > 0) {
      console.log(
        `Catalogue already contains ${row.count} products. No duplicates added.`
      );
      return;
    }

    const statement = db.prepare(`
      INSERT INTO products (
        name,
        category,
        pack_size,
        purchase_cost,
        selling_price,
        initial_quantity,
        is_perishable,
        shelf_life_days
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    products.forEach((product) => {
      statement.run(product);
    });

    statement.finalize((err) => {
      if (err) {
        console.error("Product seeding error:", err.message);
        return;
      }

      db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
        if (err) {
          console.error(err.message);
          return;
        }

        console.log(`Product catalogue seeded successfully.`);
        console.log(`Products stored in SQLite: ${row.count}`);
      });
    });
  });
});