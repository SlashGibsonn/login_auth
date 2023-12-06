// Add this at the top with other requires
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Add this after creating the express app
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// ... your existing code ...

// New route to initiate the forgot password process
app.post('/users/forgot-password', async (req, res) => {
    const email = req.body.email;

    try {
        const user = await getUserByEmail(email);

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Generate a unique token
        const token = crypto.randomBytes(20).toString('hex');

        // Save the token to the user record in the database
        await db.query('UPDATE users SET reset_token = ? WHERE id = ?', [token, user.id]);

        // Send a reset email to the user
        const resetLink = `http://your-app.com/reset-password/${token}`;
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Click on the following link to reset your password: ${resetLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Internal Server Error');
            } else {
                console.log('Email sent: ' + info.response);
                res.send('Password reset instructions sent to your email');
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

// New route to handle password reset
app.post('/users/reset-password/:token', async (req, res) => {
    const token = req.params.token;
    const newPassword = req.body.newPassword;

    try {
        const user = await getUserByResetToken(token);

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }

        // Reset the password and clear the reset token
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = ?, reset_token = NULL WHERE id = ?', [hashedPassword, user.id]);

        res.send('Password reset successfully');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

// New function to get user by reset token
async function getUserByResetToken(token) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM users WHERE reset_token = ?', token, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0]);
            }
        });
    });
}
