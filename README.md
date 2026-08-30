# FoodMap

Hyperlocal Food Discovery & Real-Time Neighbor Cook Network.

## Architecture

```
FoodMap/
├── frontend/             # Vue 3, Vite, Tailwind CSS, Pinia, Vue Router, Socket.IO Client (Port 5000)
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── router/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   ├── vite.config.js
│   └── .env
│
├── backend/              # Node.js, Express, MongoDB Atlas, Socket.IO, JWT, Zod (Port 3000)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   ├── validations/
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── package.json
```

## Running the Application

### Full-Stack (Single Command)
```bash
npm run dev
```

### Or Separately:
```bash
# Backend (Port 3000)
cd backend && npm run dev

# Frontend (Port 5000)
cd frontend && npm run dev
```
