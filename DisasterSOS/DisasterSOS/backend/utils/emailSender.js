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
      subject: "DisasterSOS - Password Reset Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DisasterSOS Password Reset Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
                  <!-- Header Banner -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 32px 28px; text-align: center;">
                      <div style="display: inline-block; background-color: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 20px; margin-bottom: 12px;">
                        <span style="color: #FEE2E2; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">CDRRMO Malaybalay City</span>
                      </div>
                      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">DisasterSOS</h1>
                      <p style="color: #FECACA; font-size: 13px; margin: 6px 0 0 0;">Emergency Alert & Citizen Response System</p>
                    </td>
                  </tr>
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 36px 32px 28px 32px;">
                      <h2 style="color: #111827; font-size: 19px; font-weight: 700; margin: 0 0 12px 0;">Password Reset Verification Code</h2>
                      <p style="color: #4B5563; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                        We received a request to reset the password for your DisasterSOS account. Use the secure 6-digit verification code below to proceed:
                      </p>
                      <!-- Code Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                        <tr>
                          <td align="center" style="background: #F9FAFB; border: 2px dashed #DC2626; border-radius: 12px; padding: 22px;">
                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #DC2626; display: inline-block; margin-left: 8px;">${otp}</span>
                            <div style="color: #6B7280; font-size: 12px; margin-top: 8px; font-weight: 500;">
                              ⏱ This code expires in <strong style="color: #DC2626;">10 minutes</strong>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                        <p style="color: #991B1B; font-size: 12px; line-height: 18px; margin: 0;">
                          <strong>Security Notice:</strong> Never share this verification code with anyone. CDRRMO emergency responders will never ask for your password or reset code.
                        </p>
                      </div>
                      <p style="color: #6B7280; font-size: 13px; line-height: 20px; margin: 0;">
                        If you did not request a password reset, you can safely ignore this email. Your account remains protected.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center;">
                      <p style="color: #9CA3AF; font-size: 11px; line-height: 16px; margin: 0;">
                        City Disaster Risk Reduction & Management Office (CDRRMO)<br/>
                        City Hall Compound, Malaybalay City, Bukidnon, Philippines<br/>
                        Emergency Hotline: 911 / CDRRMO Operations Center
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
