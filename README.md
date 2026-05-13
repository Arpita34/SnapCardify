# GreetCraft 🎨

GreetCraft is a full-stack MERN application that allows users to create beautifully personalized greeting cards for birthdays, anniversaries, festivals, and more. Users can choose from a variety of templates, add their custom photo and message, and instantly share or download the generated greeting card.

## 🚀 Features

- **Personalized Editor:** HTML5 Canvas-based editor to dynamically place your profile picture, name, and custom messages on templates.
- **Custom Uploads:** Upload your own profile pictures directly to Cloudinary.
- **Authentication:** Secure Local Auth (Email/Password) and Google OAuth integration using Passport.js and JWT.
- **Premium Subscriptions:** Razorpay integration to unlock premium templates and advanced features.
- **Quick Sharing:** Native sharing intent for WhatsApp, Email, Instagram, and "Copy Image to Clipboard" functionality.
- **Responsive UI:** Clean, flat design built with Tailwind CSS.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Axios

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose
- JSON Web Tokens (JWT) & Passport.js
- Razorpay (Payments)
- Cloudinary (Image Uploads)
- Sharp (Image Processing)

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/en/download/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)
- Cloudinary Account (for image uploads)
- Razorpay Test Account (for payments)
- Google Cloud Console Project (for Google OAuth)

---

## 🔑 Environment Variables

You will need to set up environment variables for both the backend and frontend.

### Backend (`/backend/.env`)
Create a `.env` file in the `backend` directory based on `backend/.env.example`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend (`/frontend/.env`)
Create a `.env` file in the `frontend` directory based on `frontend/.env.example`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

---

## 🚀 Installation & Setup

Follow these steps to get the project running locally.

### 1. Clone the repository
```bash
git clone https://github.com/Arpita34/SnapCardify.git
cd SnapCardify
```

### 2. Setup the Backend
Open a new terminal and run:
```bash
cd backend
npm install
npm run dev
```
The backend server will start on `http://localhost:5000`.

### 3. Setup the Frontend
Open a new terminal and run:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will start on `http://localhost:5173`.

---

## 📁 Folder Structure

```text
SnapCardify/
├── backend/
│   ├── src/
│   │   ├── config/       # Database and third-party configs (Passport)
│   │   ├── controllers/  # Route logic and request handling
│   │   ├── middleware/   # Authentication and File Upload middleware
│   │   ├── models/       # Mongoose Schemas (User, Template, Subscription)
│   │   ├── routes/       # Express route definitions
│   │   └── utils/        # JWT generators and verifiers
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI elements (Navbar, Cards)
│   │   ├── pages/        # Main application views
│   │   ├── services/     # Axios configuration and interceptors
│   │   └── store/        # Zustand state management
│   └── .env.example
│
└── README.md
```
