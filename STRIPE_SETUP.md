# 🚀 Stripe Setup Guide voor ROCQET

## 📋 Stap 1: Stripe Products Aanmaken

### 1.1 Pro Tier Product
In Stripe Dashboard:
1. Ga naar **Products** → **Add product**
2. **Name**: "ROCQET Pro"
3. **Description**: "Unlimited prompts voor professionals"
4. **Pricing**:
   - Monthly: €9.00 / maand
   - Yearly: €90.00 / jaar (save €18)
5. **Billing period**: Recurring
6. **Usage type**: Licensed

### 1.2 Team Tier Product
1. **Name**: "ROCQET Team"
2. **Description**: "Team collaboration met seat-based pricing"
3. **Pricing Model**: **Graduated pricing** (voor volume discounts)
   
   **Monthly pricing tiers**:
   ```
   First 9 seats:     €15.00 per seat
   Next 10 seats:     €13.50 per seat (10% off)
   Next 30 seats:     €12.75 per seat (15% off)
   50+ seats:         €12.00 per seat (20% off)
   ```
   
   **Yearly pricing tiers**:
   ```
   First 9 seats:     €150.00 per seat
   Next 10 seats:     €135.00 per seat (10% off)
   Next 30 seats:     €127.50 per seat (15% off)
   50+ seats:         €120.00 per seat (20% off)
   ```

4. **Billing period**: Recurring
5. **Usage type**: Licensed per seat
6. **Aggregate usage**: Sum of usage values during period
7. **Allow quantity adjustments**: Yes

---

## 🔧 Stap 2: Environment Variables

Voeg deze toe aan je `.env.local`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product IDs (from Stripe Dashboard)
STRIPE_PRO_PRODUCT_ID=prod_...
STRIPE_PRO_PRICE_MONTHLY=price_...
STRIPE_PRO_PRICE_YEARLY=price_...

STRIPE_TEAM_PRODUCT_ID=prod_...
STRIPE_TEAM_PRICE_MONTHLY=price_...
STRIPE_TEAM_PRICE_YEARLY=price_...

# App URL for redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🪝 Stap 3: Webhook Endpoint

### In Stripe Dashboard:
1. Ga naar **Developers** → **Webhooks**
2. **Add endpoint**
3. **Endpoint URL**: `https://jouw-domein.com/api/stripe/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Kopieer de **Signing secret** naar `STRIPE_WEBHOOK_SECRET`

---

## 📊 Stap 4: Customer Portal Configuratie

1. Ga naar **Settings** → **Billing** → **Customer portal**
2. Configureer:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing address
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update subscription quantities (voor seat management)

---

## 💺 Stap 5: Seat Management Uitleg

### Hoe het werkt:
1. **Klant koopt Team subscription** → Kiest aantal seats (bijv. 10)
2. **Stripe factuureert** → €150/maand (10 × €15)
3. **Volume discount** → Automatisch toegepast door graduated pricing
4. **Seat pool** → 10 seats beschikbaar voor ALLE team workspaces
5. **Uitnodigen** → Tot 10 mensen totaal across workspaces

### Voorbeeld:
```
Klant heeft 25 seats gekocht:
- Marketing Team: 8 members
- Development Team: 10 members  
- Design Team: 5 members
- Nog 2 seats beschikbaar

Maandelijkse kosten:
- First 9: 9 × €15 = €135
- Next 10: 10 × €13.50 = €135
- Next 6: 6 × €12.75 = €76.50
- Totaal: €346.50/maand (ipv €375 zonder discount)
```

---

## 🧪 Stap 6: Test Mode

Voor development/testing:
1. Gebruik Stripe **test mode** keys (start met `sk_test_`)
2. Test credit cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 9995`
   - 3D Secure: `4000 0025 0000 3155`

---

## 🚀 Stap 7: Go Live Checklist

- [ ] Switch naar **live mode** keys in production
- [ ] Update webhook endpoint naar production URL
- [ ] Test met echte kleine betaling
- [ ] Enable Stripe Tax indien nodig
- [ ] Setup email receipts in Stripe
- [ ] Configure dunning settings (retry failed payments)

---

## 📝 Notities voor Jim:

### Seat Updates:
- Klanten kunnen seats toevoegen/verwijderen via Customer Portal
- Bij seat toevoeging → direct gefactureerd (prorated)
- Bij seat verwijdering → credit voor volgende factuur

### Billing Cycles:
- Monthly: Elke maand op dezelfde datum
- Yearly: Jaarlijks met 2 maanden gratis (€90 ipv €108)

### Team Seats Strategie:
- Start klein (2-5 seats)
- Groei makkelijk (add seats anytime)
- Volume discounts moedigen groei aan
- Geen seat waste (pool systeem)

---

## 🆘 Support

Bij vragen over Stripe setup:
- Stripe Docs: https://stripe.com/docs
- Graduated Pricing: https://stripe.com/docs/products-prices/pricing-models#graduated-pricing
- Webhooks: https://stripe.com/docs/webhooks