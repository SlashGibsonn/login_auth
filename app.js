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

app.post("/users",async(req,res)=>{   
    try{
        const salt = await bcrypt.genSalt(10);
        const hashedPasssword = await bcrypt.hash(req.body.password, salt);
        console.log(salt) // bisa diapus
        console.log(hashedPasssword) //bisa diapus
        const user ={ 
            name:req.body.name, 
            email:req.body.email, 
            password:hashedPasssword
        };
        db.query('INSERT INTO users SET ?', user, (error, result) => {
            if (error) {
                console.log(error);
                res.status(500).send("Internal Server Error");
            } else {
                console.log(result);
                res.status(201).send("User Created");
            }
        });
    }
    catch{
        res.status(500);
    }
})

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
process.on('SIGINT', () => {
    db.end((err) => {
        console.log('Database connection closed.');
        process.exit(err ? 1 : 0);
    });
});
app.listen(8000,()=>{
    console.log("server started on port 8000");
});