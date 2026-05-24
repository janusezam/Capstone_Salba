import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: "DisasterSOS - Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">DisasterSOS Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Use the code below to reset your password:</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
            <h1 style="color: #d32f2f; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">© SALBA DisasterSOS - Emergency Alert System</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return false;
  }
};

export const sendVerificationEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Welcome to DisasterSOS",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">Welcome to DisasterSOS!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been successfully created. You can now log in with your phone number and password.</p>
          <p style="margin: 20px 0;">
            <strong>Your registered email:</strong> ${email}
          </p>
          <p>If you forget your password, you can use this email to reset it.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">© SALBA DisasterSOS - Emergency Alert System</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    return false;
  }
};
