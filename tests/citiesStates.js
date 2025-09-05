const fs = require("fs");
const mysql = require("mysql2/promise");

// MySQL connection config
const dbConfig = {
    host: process.env.DB_HOST || "srv1674.hstgr.io",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "u658319120_ramesh",
    password: process.env.DB_PASSWORD || "F&86jx@9",
    database: process.env.DB_NAME || "u658319120_ramesh",
};


async function insertCities() {
    try {
        // Load JSON from given path
        const filePath = "D:/RameshTrader/rameshtradersBE/tests/citiesScript.json";
        const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // Connect DB
        const connection = await mysql.createConnection(dbConfig);

        for (const state of jsonData) {
            const { state_id, districts } = state;

            for (const city of districts) {
                await connection.execute(
                    "INSERT INTO cities (state_id, name, is_active) VALUES (?, ?, ?)",
                    [state_id, city, 1]
                );
            }

            console.log(`✅ Inserted ${districts.length} cities for state_id ${state_id} (${state.state_name})`);
        }

        await connection.end();
        console.log("🎉 All cities inserted successfully!");

    } catch (err) {
        console.error("❌ Error inserting cities:", err);
    }
}

insertCities();
