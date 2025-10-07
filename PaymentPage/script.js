// Collect cart total from localStorage data and compute amount in paise
function calculateCartTotalPaise() {
  try {
    const items = JSON.parse(localStorage.getItem("data")) || [];
    const total = items.reduce((sum, item) => {
      const priceStr = (item.price || "0").toString().replace(/[^0-9.]/g, "");
      const price = Number(priceStr || 0);
      return sum + price;
    }, 0);
    // Convert to paise (assuming prices are in INR)
    return Math.max(1, Math.round(total * 100));
  } catch (e) {
    return 100; // default ₹1.00 in paise
  }
}

async function createOrder(amountPaise) {
  const backendUrl = "http://localhost:5000"; // adjust if different
  const res = await fetch(`${backendUrl}/api/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
  });
  if (!res.ok) throw new Error("Failed to create order");
  return res.json();
}

async function verifyPayment(payload) {
  const backendUrl = "http://localhost:5000";
  const res = await fetch(`${backendUrl}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function openCheckout({ keyId, order, customerName, customerEmail, method }) {
  const options = {
    key: keyId,
    amount: order.amount,
    currency: order.currency,
    name: "BookTown",
    description: order.receipt || "Order",
    order_id: order.id,
    prefill: {
      name: customerName || "",
      email: customerEmail || "",
    },
    notes: order.notes || {},
    theme: { color: "#dc3545" },
    method: {
      upi: method === "upi",
      card: method === "card",
      netbanking: false,
      wallet: method === "upi", // wallets like PhonePe/Paytm may appear
    },
    handler: async function (response) {
      const result = await verifyPayment(response);
      if (result && result.verified) {
        // Clear cart and redirect to thank-you
        localStorage.removeItem("data");
        window.location.href = "/BookTown-Proj/PaymentPage/success.html";
      } else {
        alert("Payment verification failed");
      }
    },
    modal: {
      ondismiss: function () {
        // User closed checkout
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("payment-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amountPaise = calculateCartTotalPaise();
    const method = document.querySelector('input[name="pay"]:checked')?.value || "upi";

    const name = document.querySelector('input[placeholder="Full Name"]')?.value || "";
    const email = document.querySelector('input[type="email"]')?.value || "";

    try {
      const { order, keyId } = await createOrder(amountPaise);
      openCheckout({ keyId, order, customerName: name, customerEmail: email, method });
    } catch (err) {
      alert("Failed initiating payment. Please try again.");
      // eslint-disable-next-line no-console
      console.error(err);
    }
  });
});


