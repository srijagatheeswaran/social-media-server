    const nodemailer = require("nodemailer");

    const sendEmail = async (email, subject, message) => {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS  
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject,
            text: message,
        });
    };

    module.exports = sendEmail;
