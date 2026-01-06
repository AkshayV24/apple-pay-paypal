# Apple Pay + PayPal Integration

A complete Apple Pay integration using PayPal as the payment processor. This demo allows users to make payments using Apple Pay on supported devices (Safari on Mac with Touch ID, or iOS devices).

## Features

- Apple Pay checkout button
- PayPal sandbox integration
- Merchant validation
- Order creation and capture
- Customer email extraction from Apple Pay

## Prerequisites

- Node.js 18 or higher
- PayPal Developer account (sandbox)
- Domain with HTTPS (required for Apple Pay)

## Project Structure

```
apple-pay-paypal/
├── .well-known/
│   └── apple-developer-merchantid-domain-association
├── public/
│   └── index.html
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd apple-pay-paypal
npm install
```

### 2. Get PayPal Sandbox Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in with your PayPal account
3. Navigate to **Apps & Credentials**
4. Click **Create App** under Sandbox
5. Copy your **Client ID** and **Client Secret**

### 3. Set Environment Variables

For local development, you can set credentials directly in the code or use environment variables:

```bash
export PAYPAL_CLIENT_ID=your_client_id
export PAYPAL_CLIENT_SECRET=your_client_secret
```

### 4. Run Locally

```bash
npm start
```

Visit `http://localhost:3000` - Note that Apple Pay won't work locally without HTTPS.

## Deployment to Render.com

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Apple Pay + PayPal integration"
gh repo create apple-pay-paypal --public --source=. --push
```

Or manually create a repo on GitHub and push.

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `apple-pay-paypal`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `PAYPAL_CLIENT_ID`: Your PayPal sandbox client ID
   - `PAYPAL_CLIENT_SECRET`: Your PayPal sandbox client secret
6. Click **Create Web Service**

Your app will be deployed to `https://apple-pay-paypal.onrender.com` (or similar).

## After Deployment: Domain Association Setup

### Step 1: Get Your Render URL

After deployment, note your Render URL (e.g., `https://apple-pay-paypal.onrender.com`).

### Step 2: Download Domain Association File

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials** → Your App → **Apple Pay**
3. Click **Add Domain**
4. Enter your Render domain (without https://): `apple-pay-paypal.onrender.com`
5. Download the **Domain Association File**

### Step 3: Add File to Project

1. Replace the placeholder file at `.well-known/apple-developer-merchantid-domain-association` with the downloaded file
2. Commit and push:

```bash
git add .well-known/apple-developer-merchantid-domain-association
git commit -m "Add Apple Pay domain association file"
git push
```

3. Render will auto-deploy the update

### Step 4: Verify Domain

1. Back in PayPal Dashboard, click **Verify** next to your domain
2. PayPal will check that the file is accessible at:
   `https://your-domain/.well-known/apple-developer-merchantid-domain-association`
3. Once verified, your domain is registered for Apple Pay

## Testing

### Requirements for Testing

Apple Pay only works on:
- **Safari on macOS** with Touch ID or Apple Watch
- **iOS devices** (iPhone/iPad) with Apple Pay configured

It will NOT work on:
- Chrome, Firefox, or other browsers
- Windows or Android devices

### Test Steps

1. Open your Render URL in Safari on a supported device
2. If Apple Pay is available, you'll see the Apple Pay button
3. Click the button to initiate payment
4. Authenticate with Touch ID or Face ID
5. Use PayPal sandbox test cards for payment

### Sandbox Testing

In sandbox mode, payments are simulated. No real money is charged.

## Troubleshooting

### "Apple Pay is not available"

- Make sure you're using Safari on a Mac or iOS device
- Verify Apple Pay is set up on your device with a valid card
- Check that you're accessing via HTTPS

### "Merchant validation failed"

- Verify the domain association file is correctly placed
- Check that the domain is verified in PayPal Dashboard
- Ensure your PayPal credentials are correct

### Payment not completing

- Check server logs on Render for error details
- Verify PayPal sandbox credentials
- Make sure you're in sandbox mode (not production)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serves the main page |
| GET | `/.well-known/apple-developer-merchantid-domain-association` | Apple Pay domain verification |
| POST | `/api/orders` | Creates a PayPal order |
| POST | `/api/apple-pay/validate-merchant` | Validates merchant session |
| POST | `/api/orders/:orderID/capture` | Captures the payment |

## License

MIT
