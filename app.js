const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")("sk_test_51SEArYBgwz5zHNEJ1UaDLTlwUAKtl3flEQGDkEESC0DpByxbR7G1pcxXsMCgslGsfP9fc03Qkfx2PqDKOWLj5w0Z00JijURH3q");
const db = require("./db");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.json());

// homepage
app.get("/", (req, res) => {
    res.render("index");
});


app.post("/create-checkout-session", async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "MOMO Payment" },
                        unit_amount: 1000, // $10
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: "http://localhost:3000/cancel",
        });

        res.json({ url: session.url });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.get("/success", async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

    console.log(session)
    console.log(session.customer_details.email)

    db.query(
        "INSERT INTO payments (stripe_payment_id, amount, status) VALUES (?, ?, ?)",
        [session.payment_intent, session.amount_total, session.payment_status],
        (err) => {
            if (err) console.error("DB Insert Error:", err);
        }
    );

    res.send("Payment successful. =stripe payment id =" + session.payment_intent + " AND status =" + session.payment_status);
});

app.get("/cancel", (req, res) => {
    res.send("Payment cancelled.");
});

// View all payments
app.get("/payments", (req, res) => {
    db.query("SELECT * FROM payments", (err, results) => {
        if (err) return res.status(500).send("DB error");
        res.json(results);
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
