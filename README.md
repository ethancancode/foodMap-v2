# FoodMap: Hyperlocal Food Discovery & Neighborhood Cook Network

FoodMap connects home kitchens, neighborhood residents, and hyper-local couriers through live availability maps, atomic inventory deduction, intelligent match scoring, meal plan subscriptions, and surplus food rescue.

---

## 🚀 Quick Start & Demo Setup

### 1. Installation & Single-Command Start
The project uses a unified Express + Vite architecture running on `http://localhost:3000`:
```bash
# Install root and backend dependencies
npm install

# Run database seed (primes 4 roles, active meals, subscriptions, and demo orders)
npm run seed

# Launch full-stack platform (API + Frontend on Port 3000)
npm run dev
```

### 2. Development & Presentation Login Personas
Log in via the standard authentication interface (`http://localhost:3000`) using the provisioned mobile number and developer OTP (`123456`) or Google Authenticator TOTP. The system securely determines role permissions server-side and automatically routes to the appropriate portal:

| Role | Persona | Mobile | Default OTP | Primary Views & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | FoodMap Moderation Admin | `9999999999` | `123456` | `/admin` — Vendor verification approvals, user moderation, order oversight, KPI metrics |
| **Courier** | Rahul Sharma (Delivery Partner) | `8888888888` | `123456` | `/delivery` — Available delivery pool, claim order, live GPS location broadcaster |
| **Vendor** | Chef Ananya (Verified Kitchen) | `9876543210` | `123456` | `/vendor-dashboard` — Food listings, demand forecast, subscriptions, marketplace pantry |
| **Vendor** | Chef Vikram (Pending Approval) | `9876543222` | `123456` | Kitchen onboarding preview, pending badge verification workflow |
| **Resident** | Priya Mehta (Nut & Dairy Allergy) | `9820123456` | `123456` | `/radar` — Match scores, allergy shield warnings, surplus discounts, group cart |

---

## 🌟 Expanded Scope & Implemented Modules

### 1. Phase 1: Admin & Moderation Operations
- **System KPIs Dashboard**: Real-time counters for platform users, verified vs pending kitchens, active meals, today's order GMV, and rescued surplus food.
- **Vendor Verification Engine**: Review vendor FSSAI/kitchen credentials with one-click `APPROVE (VERIFIED)` or `REJECT` actions.
- **User & Kitchen Moderation**: Deactivate bad actors, toggle status, and inspect role permissions.
- **Content Moderation**: Instant deactivation of non-compliant food or pantry listings.
- **Live Orders Monitor**: Real-time table tracking all active community orders across kitchens and couriers.

### 2. Phase 2: Delivery Partner & Live GPS Tracking
- **Dedicated Courier Console (`/delivery`)**: Real-time interface for nearby riders to discover unassigned delivery orders.
- **Single-Courier Order Claiming**: Couriers claim orders atomically (`UNASSIGNED` -> `ASSIGNED`).
- **Real-Time GPS Broadcast**: Couriers transmit location via throttled Socket.IO (`courier:location`), seamlessly broadcasting coordinates to the resident.
- **Leaflet Map Integration (`OrderStatus.vue`)**: Resident view automatically displays active courier marker (`two_wheeler` pin), updates position live, and auto-fits map bounds between the home kitchen and rider.
- **Delivery Timeline Progression**: Order states transition from `ASSIGNED` -> `PICKED_UP` -> `EN_ROUTE` -> `DELIVERED`.

### 3. Phase 3: Lightweight Intelligence Engines
- **Resident Food Recommendation Scoring**:
  - Multi-factor algorithmic scoring (0–100%) calculated based on:
    - Dietary preference alignment (Vegetarian / Non-Veg match) (+25%)
    - Allergen safety shield (checks resident allergies against food allergen array) (-40% if collision)
    - Proximity distance penalty using Haversine formula (closer kitchens score higher)
    - Kitchen community rating multiplier (+15%)
    - Surplus rescue affordability bonus (+10%)
- **Vendor Demand Prediction Engine**:
  - Analyzes 30-day historical order velocity grouped by Day-of-Week.
  - Integrates recurring active subscription commitments (e.g., 8 guaranteed lunch tiffins).
  - Identifies peak delivery windows (e.g., 12:30 PM – 2:00 PM) and generates waste prevention recommendations.

### 4. Phase 4: Community, Social & Group Ordering
- **Chef Following & Community Updates**: Residents can follow home cooks; updates follower counts in real time.
- **In-App Notification Center**: Drawer for real-time alerts on order status changes, courier claims, meal plans, and surplus drops.
- **Group Ordering (`GroupOrderModal.vue`)**:
  - Resident creates a group session with an invite code (e.g., `FOOD-8492`).
  - Friends and colleagues join the same group order code, aggregate cart items, and split fulfillment charges.

### 5. Phase 5: Trust, Safety & Sustainability
- **Allergy Shield Transparency**: Food listings disclose allergens (`Dairy`, `Nuts`, `Gluten`, `Soy`, `Eggs`, etc.). Direct warnings appear on cards if an ingredient clashes with resident profile.
- **Vendor Verification Badges**: Verified green badge on vendor profiles and cards confirms physical address and hygiene review.
- **Surplus Food Waste Rescue**: Cooks can tag remaining end-of-day portions as `SURPLUS_RESCUE` with custom discounts (e.g., 30% off).
- **Hyperlocal Sustainability Metrics**:
  - Live community impact calculation: Total portions rescued, food waste prevented (kg), and CO₂ emissions mitigated ($2.5 \text{ kg CO}_2 / \text{portion}$).

### 6. Additional Feature 1: Meal Plan Subscriptions
- **Recurring Kitchen Tiffins**: Vendors create monthly lunch/dinner plans with daily delivery schedules.
- **Subscriber Priority Allocation**: Reserving a guaranteed inventory batch (`subscriberReservedQty`) prevents home cooks from selling out their subscribed meals during lunch rushes.
- **Resident Subscription Console**: Discovery, activation, and real-time remaining meal tracking.

### 7. Additional Feature 2: FoodMap Marketplace
- **Home Pantry & Artisan Goods**: Dedicated discovery tab for packaged dry snacks, homemade pickles, jams, spice blends, and bakery items.
- **Dual Fulfillment Filter**: Toggle between `Cooked Meals (Immediate)` and `Marketplace Pantry (Deliverable goods)`.

---

## 🎯 14 Presentation Demonstration Scenarios

| # | Demo Scenario | Instructions / Steps |
| :- | :--- | :--- |
| **1** | **Admin Dashboard Overview** | Log in as Admin (`9999999999`). View platform KPIs, active users, and system GMV. |
| **2** | **Vendor Verification Flow** | Open Admin -> **Vendor Approvals** tab. Review pending kitchen "Chef Vikram" and click **Verify Vendor**. |
| **3** | **User Account Moderation** | Open Admin -> **Users Directory**. Toggle user active status to demonstrate safety controls. |
| **4** | **Delivery Partner Portal** | Log in as Courier (`8888888888`). View unassigned delivery order `#FM4821`. |
| **5** | **Courier Claim & Progression** | Click **Claim Delivery** on `#FM4821`. Progress status from `PICKED_UP` to `EN_ROUTE`. |
| **6** | **Live Courier GPS Tracking** | Open Resident tracker (`OrderStatus.vue`) in second window. Watch courier bike marker update live via Socket.IO. |
| **7** | **Recommendation Scoring** | Log in as Priya (`9820123456`). Switch Radar to "Recommendations". See percentage match scores. |
| **8** | **Allergy Shield Warning** | Priya has a nut allergy. Notice high-contrast warning badge on cashew/nut dishes. |
| **9** | **Vendor Demand Forecasting** | Log in as Chef Ananya (`9876543210`). Open **Demand Forecast** tab to view predicted volume and peak hours. |
| **10** | **Surplus Food Rescue & Sustainability** | Filter Radar by "Surplus Rescue". View 30% discounted evening meals and sustainability metrics. |
| **11** | **Meal Subscription Creation** | In Vendor Dashboard, click **Subscription Plans** -> Create a 20-meal recurring plan with 10 priority seats. |
| **12** | **Resident Meal Plan Subscription** | Resident clicks **Meal Plans** on Radar, subscribes to "Executive Lunch Tiffin", and views remaining meals. |
| **13** | **Marketplace Pantry Discovery** | On Food Radar, tap **Marketplace Pantry** filter. Browse Kerala banana chips and mango pickles. |
| **14** | **Group Order Session** | Resident taps **Group Order** on Radar, creates code `FOOD-1042`, and invites a peer to pool cart orders. |

---

## 🛠️ Architecture & Tech Stack

```
FoodMap-v2/
├── frontend/                     # Vue 3 Single-Page App
│   ├── src/
│   │   ├── components/           # ResidentFoodCard, AppSidebar, Admin & Delivery modals
│   │   ├── views/                # FoodRadar, AdminDashboard, DeliveryPartnerDashboard, OrderStatus
│   │   ├── services/             # Axios API client & Socket.IO real-time client
│   │   └── stores/               # Pinia state stores (auth, food, order, vendor)
│   └── vite.config.js
│
├── backend/                      # Node.js + Express API
│   ├── models/                   # User, Vendor, Food, Order, Subscription, GroupOrder, Notification
│   ├── controllers/              # adminController, orderController, subscriptionController, demand
│   ├── services/                 # recommendationService, demandService, orderService, authService
│   ├── sockets/                  # orderSocket.js (courier GPS broadcast & order lifecycle rooms)
│   ├── scripts/                  # seedDemoData.js (1-click presentation data primer)
│   └── server.js                 # Unified Express server hosting API & Vite SPA
```

- **Frontend**: Vue 3 (Composition API, `<script setup>`), Pinia 2, Vue Router 4, Leaflet Maps, Tailwind CSS.
- **Backend**: Node.js, Express, MongoDB Atlas, Mongoose 8, Socket.IO 4.
- **Authentication**: JWT, Phone OTP verification with TOTP 2FA option.
- **Inventory Concurrency**: Atomic MongoDB operations (`$inc: { quantity: -qty }` with `{ quantity: { $gte: qty } }`).

---

## 🔒 Academic Integrity & Production Boundaries

| Feature Area | Current Live Implementation | Future Production Scope |
| :--- | :--- | :--- |
| **Payment Gateway** | Simulated instant payment & order authorization | Integration with Razorpay / Stripe Webhooks |
| **Courier GPS Tracking** | Real-time Socket.IO coordinate broadcast with Leaflet ping | Native Android/iOS background geolocation service |
| **Demand Forecasting** | Day-of-week moving averages + active subscription reservations | Deep learning LSTM / Prophet time-series models |
| **Surplus Rescue** | Vendor manual discount trigger with live platform countdown | Automated shelf-life image recognition via computer vision |

---

## 📄 License
Academic Coursework Project — Team FoodMap.
