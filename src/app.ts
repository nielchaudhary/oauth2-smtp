import { google } from "googleapis";
import nodemailer from "nodemailer";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:8080/oauth2callback"
);

const generateAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.metadata",
    ],
    prompt: "consent",
  });
};

const sendEmailWithOAuth2 = async (
  accessToken: string,
  refreshToken: string
) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: refreshToken,
      accessToken: accessToken,
    },
    debug: true,
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "receiver's email",
      subject: "mail-server",
      text: "dummy text",
    });

    console.log("Email sent:", info);
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
  }
};

app.get("/auth", (req, res) => {
  const authUrl = generateAuthUrl();
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    oauth2Client.setCredentials(tokens);

    await sendEmailWithOAuth2(tokens.access_token!, tokens.refresh_token!);

    return res.send("email sent!");
  } catch (error) {
    console.error(error);

    return res.status(500).send(`Authentication failed: ${error}`);
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on port ${process.env.PORT || 8080}`);
});
