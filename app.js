const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({path: './.env'});
const app = express();
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD, 
    database: process.env.DATABASE,
})

db.connect((error)=>{
    if(error){
        console.log(error);
    }else{
        console.log("connected to MYSQL");
    }
})
app.get("/users",(req,res)=> {
    db.query('SELECT * FROM users', (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        } else {
            res.json(result);
        }
    });
});

app.post("/users", async (req, res) => {
    try {
        const existingUser = await getUserByEmail(req.body.email);

        if (existingUser) {
            // Email sudah terdaftar, kirim respons yang sesuai
            res.status(400).send("Email is already registered");
        } else {
            // Lanjutkan dengan pendaftaran baru
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            const newUser = {
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword
            };

            db.query('INSERT INTO users SET ?', newUser, (error, result) => {
                if (error) {
                    console.log(error);
                    res.status(500).send("Internal Server Error");
                } else {
                    console.log(result);
                    res.status(201).send("User Created");
                }
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

async function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM users WHERE email = ?', email, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0]);
            }
        });
    });
} // DARI CHATGPT INI!!!


app.post("/users/login", async (req, res) => {
    const email = req.body.email;
    db.query('SELECT * FROM users WHERE email = ?', email, async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        } else if (results.length > 0) {
            const user = results[0];
            try {
                if (await bcrypt.compare(req.body.password, user.password)) {
                    res.send('sukses');
                } else {
                    res.send('gagal');
                }
            } catch (error) {
                console.log(error);
                res.status(500).send("Internal Server Error");
            }
        } else {
            res.status(400).send("User not found");
        }
    });
});

app.delete("/users/:userId", (req, res) => {
    const userId = req.params.userId;

    db.query('DELETE FROM users WHERE id = ?', userId, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        } else if (result.affectedRows > 0) {
            res.send(User with ID ${userId} deleted successfully);
        } else {
            res.status(404).send(User with ID ${userId} not found);
        }
    });
});

process.on('SIGINT', () => {
    db.end((err) => {
        console.log('Database connection closed.');
        process.exit(err ? 1 : 0);
    });
});
app.listen(8000,()=>{
    console.log("server started on port 8000");
});
