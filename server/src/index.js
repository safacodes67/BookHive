import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500";

app.use(cors({
  origin: clientOrigin,
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SECRET,
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Create an order for Razorpay Checkout
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body || {};
    if (!amount) {
      return res.status(400).json({ error: "amount is required (in paise)" });
    }

    const order = await razorpay.orders.create({
      amount, // integer paise: e.g. 50000 for ₹500.00
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });
    res.json({ order, keyId: process.env.RZP_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create order" });
  }
});

// Verify payment signature after successful payment
app.post("/api/payments/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: "Missing params" });
  }

  const hmac = crypto.createHmac("sha256", process.env.RZP_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const generatedSignature = hmac.digest("hex");

  const verified = generatedSignature === razorpay_signature;
  if (!verified) {
    return res.status(400).json({ verified: false });
  }
  res.json({ verified: true });
});

// Optional: Razorpay webhook handler
app.post("/api/payments/webhook", express.json({ type: "application/json" }), (req, res) => {
  // Implement webhook signature verification if you enable webhooks in Razorpay dashboard
  // const secret = process.env.RZP_WEBHOOK_SECRET
  // const receivedSignature = req.headers['x-razorpay-signature']
  // Verify HMAC with secret over raw body
  res.status(200).json({ received: true });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${port}`);
});


