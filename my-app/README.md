# 🚀 My-App — Setup Guide

This project is built with:

* Next.js
* React
* Tailwind CSS
* TypeScript

To avoid any problems, please follow these steps exactly.

---

# 📦 Step 1 — Extract the Project

1. Download the `front.zip` file.
2. Extract it.
3. You should see a folder called:

```
my-app
```

Open a terminal inside that folder.

---

# 🖥 Step 2 — Install the Correct Node.js Version (IMPORTANT)

This project uses:

```
Node.js v20.20.0
```

You MUST use the same version.

---

## 🐧 If You Are Using Linux (Ubuntu, Kali, etc.)

### 1️⃣ Install NVM (Node Version Manager)

Run:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Then restart your terminal or run:

```bash
source ~/.bashrc
```

Check installation:

```bash
nvm --version
```

---

### 2️⃣ Install the Correct Node Version

```bash
nvm install 20.20.0
nvm use 20.20.0
```

Verify:

```bash
node -v
```

It should show:

```
v20.20.0
```

---

## 🪟 If You Are Using Windows

1. Download **nvm-windows** from:
   https://github.com/coreybutler/nvm-windows/releases

2. Install it.

3. Open Command Prompt or PowerShell and run:

```bash
nvm install 20.20.0
nvm use 20.20.0
node -v
```

It must show:

```
v20.20.0
```

---

# 📂 Step 3 — Go Inside the Project Folder

If you are not already inside it:

```bash
cd     projet-mi2-26/my-app
```

---

# 📥 Step 4 — Install Project Dependencies

Run:

```bash
npm install
```

This will install:

* Next.js
* React
* Tailwind CSS
* TypeScript
* All other required packages

⚠️ Do NOT install anything manually.

---

# ▶️ Step 5 — Run the Development Server

```bash
npm run dev
```

After that, open your browser and go to:

```
http://localhost:3000
```

---

# ✅ If Everything Works

You should now see the project running locally.

---

# 🛑 If You Get an Error

1. Check your Node version:

```bash
node -v
```

It must be:

```
v20.20.0
```

2. If not, switch using:

```bash
nvm use 20.20.0
```

3. Then run again:

```bash
npm install
npm run dev
```

---

# 📁 Project Structure Overview

```
projet-mi2-26/my-app
├── package.json
├── package-lock.json
├── tailwind.config.js
├── tsconfig.json
├── public/
├── src/
```

Do NOT delete any of these files.

---

# 🎯 That's It

Follow the steps in order and everything will work correctly.

If something fails, make sure the Node version is exactly:

```
v20.20.0
```

Enjoy 🚀

---

