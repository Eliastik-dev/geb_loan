# 💻 GEB Equipment Loan Management System

[![Frontend](https://img.shields.io/badge/Frontend-React_TypeScript-blue.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_Express-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MySQL_Prisma-orange.svg?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker-blue.svg?style=flat-square&logo=docker)](https://www.docker.com/)

A modern, full-stack web application developed for **GEB Barthelemy Group** to manage IT equipment loans, track inventory, and streamline the checkout/return procedures. 

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
  - [Docker Deployment](#docker-deployment)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Environment Variables Reference](#-environment-variables-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality (MVP)
- **📦 Equipment Inventory Management**: View, add, update, and remove IT equipment.
- **🔄 Loan Checkout Process**: Seamless dual validation (IT + Collaborator).
- **✅ Return Process**: Integrated condition tracking with immediate validation.
- **📧 Automated Email Notifications**: Instant alerts for checkout and return actions.
- **🔐 Validation Code System**: Secure loan verification via codes.
- **🔍 Advanced Tracking**: Track all equipment easily by serial number.

---

## 🛠 Tech Stack

| Component     | Technologies Used                               |
| :------------ | :---------------------------------------------- |
| **Frontend**  | React, TypeScript, Material UI, Formik, Yup     |
| **Backend**   | Node.js, Express, TypeScript, Prisma ORM        |
| **Database**  | MySQL 8+                                        |
| **Mailing**   | Nodemailer with SMTP configuration (Office365)  |
| **Deployment**| Docker & Docker Compose                         |

---

## 📂 Project Structure

```text
geb-equipment-loan/
├── client/          # Frontend application (React + Vite)
│   ├── src/
│   │   ├── api/     # API integration
│   │   ├── components/# Reusable UI components
│   │   ├── pages/   # Page-level components
│   │   ├── types/   # TypeScript type definitions
│   │   └── theme.ts # Material UI custom theme
│   ├── Dockerfile
│   └── nginx.conf
├── server/          # Backend application (Express + Node.js)
│   ├── src/
│   │   ├── lib/     # Core libraries (e.g. Prisma client)
│   │   ├── middleware/# Express middlewares
│   │   ├── routes/  # API route definitions
│   │   ├── services/# Business logic and services
│   │   └── index.ts # Entry point
│   ├── prisma/
│   │   └── schema.prisma # Database models
│   ├── Dockerfile
│   └── .env.example
├── package.json     # Workspace management commands
└── docker-compose.yml
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **MySQL**: v8 or higher (alternatively, run via Docker)
- **NPM** or **Yarn**

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd geb-equipment-loan
   ```

2. **Configure Environment Variables**
   Duplicate the example environment files and apply your specific credentials:

   **Server Configuration:**
   ```bash
   cp server/.env.example server/.env
   # Update server/.env with your DATABASE_URL and SMTP credentials
   ```

   **Client Configuration:**
   ```bash
   cp client/.env.example client/.env
   # Ensure VITE_API_URL is correctly pointing to your local server
   ```

3. **Install Dependencies**
   Use the root-level scripts to seamlessly install dependencies for both applications:
   ```bash
   npm run install:all
   ```

4. **Initialize Database**
   Configure your MySQL server, then prepare the Prisma client and execute migrations:
   ```bash
   cd server
   npm run prisma:migrate
   npm run prisma:generate
   ```
   *(Optional)* Use the admin UI or custom scripts to seed initial equipment types.

5. **Run the Application**
   From the project root, start both the frontend and backend servers simultaneously:
   ```bash
   npm run dev
   ```
   - **Frontend App**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)

### Docker Deployment

To launch the entire stack using Docker Compose:

1. **Build and Run Containers**
   ```bash
   docker-compose up --build -d
   ```
2. **Access the Application**
   - **Frontend App**: [http://localhost](http://localhost)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)
3. **Graceful Shutdown**
   ```bash
   docker-compose down
   ```

### Production Deployment (Ubuntu + Native / No Docker)

To deploy natively on an Ubuntu server using PM2 (for the backend) and Nginx (for the frontend and reverse proxy):

1. **Prepare the Database**
   Connect to your existing native MySQL server and create a database and user:
   ```sql
   CREATE DATABASE geb_equipment;
   CREATE USER 'geb_user'@'localhost' IDENTIFIED BY 'StrongPassword!123';
   GRANT ALL PRIVILEGES ON geb_equipment.* TO 'geb_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Clone and Build the App**
   Clone the repository to `/var/www/geb-equipment-loan` (or your preferred location).
   ```bash
   cd /var/www/geb-equipment-loan
   npm run install:all
   npm run build
   ```

3. **Configure the Environment**
   Set up your `.env` files in both `server/` and `client/` directories, making sure `DATABASE_URL` connects to `localhost:3306`.
   ```bash
   cd server
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start Backend with PM2**
   Install PM2 globally if you haven't already: `npm install -g pm2`.
   Then start the backend using the provided configuration template:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow the prompted instructions
   ```

5. **Configure Nginx**
   Copy the provided Nginx configuration template to the sites-available directory:
   ```bash
   sudo cp nginx-ubuntu.conf /etc/nginx/sites-available/materiel.pn2.geb.conf
   # Note: Open the file and adjust root paths if your project is not in /var/www/geb-equipment-loan
   sudo ln -s /etc/nginx/sites-available/materiel.pn2.geb.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 🔌 API Endpoints

### Equipment Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/equipment` | Fetch all equipment records |
| `GET`  | `/api/equipment/available` | Fetch currently available equipment |
| `GET`  | `/api/equipment/types` | Retrieve valid equipment types |
| `POST` | `/api/equipment` | Add a new piece of equipment |
| `PUT`  | `/api/equipment/:id` | Update an existing equipment record |
| `DELETE` | `/api/equipment/:id` | Remove an equipment record |
| `GET`  | `/api/equipment/check-serial/:serialNumber` | Validate if a serial number is available |

### Loan & Checkout
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/loans/checkout` | Create a new loan (instant validation by default) |
| `GET`  | `/api/loans/pending/:email/:code` | (Legacy) Retrieve pending loan for user validation |
| `POST` | `/api/loans/validate-checkout/:code` | (Legacy) Validate an existing checkout process |
| `GET`  | `/api/loans/active?search=` | Query active loans, optional search capabilities |
| `POST` | `/api/loans/return/:loanId` | Process equipment returns seamlessly |

---

## 🗄 Database Schema

The comprehensive database structure is maintained via **Prisma ORM**. 
For the exact detailed schema, please refer to `server/prisma/schema.prisma`. 

**Core Entities Include:**
- `User`: Roles and access profiles
- `EquipmentType`: Categories of allocatable hardware
- `Equipment`: Physical assets with current state details
- `Loan`: Transaction history matching Users to Equipment 
- `LoanItem`: Individual items mapped within specific loans

*(Optional: Use `npx prisma studio` inside the `server/` directory for a visual schema explorer.)*

---

## ⚙️ Environment Variables Reference

Below is a reference snippet for mapping your local variables correctly:

### Server (`server/.env`)
```env
DATABASE_URL="mysql://<user>:<password>@<host>:3306/geb_equipment"
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_USER="hfannir@geb.fr"
SMTP_PASS="<your-password>"
JWT_SECRET="<your-jwt-secret>"
APP_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3000
```

### Client (`client/.env`)
```env
VITE_API_URL="http://localhost:3000/api"
```

---

## 🤝 Contributing

This application is an internally maintained project at **GEB Barthelemy Group**. For any feature requests, issues, or broader development inquiries, please contact the IT department directly.

---

## 📄 License

**Proprietary Software**  
Copyright © GEB Barthelemy Group. All rights reserved. Do not distribute.
