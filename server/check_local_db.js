require('dotenv').config();
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

async function checkDb() {
    console.log('--- CHECKING LOCAL DATABASE ---');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`Password: ${process.env.DB_PASSWORD ? '******' : '(empty)'}`);

    // 1. Check MySQL Connection (Server Level)
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        console.log('SUCCESS: Connected to MySQL Server.');
        
        // Check if database exists
        const [rows] = await connection.query(`SHOW DATABASES LIKE '${process.env.DB_NAME}'`);
        if (rows.length === 0) {
            console.log(`WARNING: Database '${process.env.DB_NAME}' does not exist.`);
            console.log('Attempting to create database...');
            await connection.query(`CREATE DATABASE \`${process.env.DB_NAME}\``);
            console.log(`SUCCESS: Database '${process.env.DB_NAME}' created.`);
        } else {
            console.log(`SUCCESS: Database '${process.env.DB_NAME}' exists.`);
        }
        await connection.end();
    } catch (e) {
        console.error('ERROR: Could not connect to MySQL Server:', e.message);
        console.log('SUGGESTION: Ensure MySQL is running and credentials in .env are correct.');
        return;
    }

    // 2. Check Sequelize Connection (App Level)
    const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: 'mysql',
            logging: false
        }
    );

    try {
        await sequelize.authenticate();
        console.log('SUCCESS: Sequelize connected to database.');
        
        // 3. Check Users Table
        const [results] = await sequelize.query("SELECT COUNT(*) as count FROM Users");
        const count = results[0].count;
        console.log(`\n--- USER STATISTICS ---`);
        console.log(`Total Users: ${count}`);
        
        if (count > 0) {
            const [users] = await sequelize.query("SELECT id, username, email, createdAt FROM Users");
            console.table(users);
        } else {
            console.log('No users found in local database.');
        }
        
    } catch (error) {
        if (error.original && error.original.code === 'ER_NO_SUCH_TABLE') {
            console.log('WARNING: Users table does not exist yet. Run the server to initialize tables.');
        } else {
            console.error('ERROR: Database query failed:', error.message);
        }
    } finally {
        await sequelize.close();
    }
}

checkDb();
