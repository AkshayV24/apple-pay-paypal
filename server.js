const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PayPal Sandbox credentials (use environment variables in production)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'Acy37FzE-CoPyIrok6n2hDTC3eFNWaHjT0tZBwojv4Ub9PzTF_qi6D6Hp6o48_jUND0u3I9iaJFvv3dX';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EHHoa_IR21FnQA_A60QkPb5GpHR9P9pS87iYx_dAa5WxdYna4yH3Jv3Ggzt9o0vkOFx2U-WRpUxlDo1q';
const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve Apple Pay domain association file
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

/**
 * Get PayPal access token using Basic Auth
 */
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * POST /api/orders
 * Creates a PayPal order for $10.00 USD
 */
app.post('/api/orders', async (req, res) => {
    try {
        const accessToken = await getPayPalAccessToken();

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: '10.00'
                    },
                    description: 'Test Product'
                }]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create order: ${error}`);
        }

        const order = await response.json();
        console.log('Order created:', order.id);
        res.json({ id: order.id });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/apple-pay/validate-merchant
 * Validates the merchant session with PayPal for Apple Pay
 */
app.post('/api/apple-pay/validate-merchant', async (req, res) => {
    try {
        const { validationUrl } = req.body;

        if (!validationUrl) {
            return res.status(400).json({ error: 'validationUrl is required' });
        }

        console.log('Validating merchant with URL:', validationUrl);

        const accessToken = await getPayPalAccessToken();
        console.log('Got access token');

        // Get the domain from request headers
        const domain = req.get('host') || 'apple-pay-paypal.onrender.com';
        console.log('Domain:', domain);

        const requestBody = {
            validationUrl: validationUrl,
            displayName: 'Test Store',
            domainName: domain
        };
        console.log('Request body:', JSON.stringify(requestBody));

        const response = await fetch(`${PAYPAL_API_BASE}/v1/apple-pay/validate-merchant-session`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('PayPal response status:', response.status);
        console.log('PayPal response:', responseText);

        if (!response.ok) {
            throw new Error(`Failed to validate merchant: ${responseText}`);
        }

        const merchantSession = JSON.parse(responseText);
        console.log('Merchant validated successfully');
        res.json(merchantSession);
    } catch (error) {
        console.error('Error validating merchant:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/orders/:orderID/capture
 * Captures/completes the PayPal order with Apple Pay token
 */
app.post('/api/orders/:orderID/capture', async (req, res) => {
    try {
        const { orderID } = req.params;
        const { applePayToken, shippingContact } = req.body;

        const accessToken = await getPayPalAccessToken();

        // Capture the order with Apple Pay payment source
        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payment_source: {
                    apple_pay: {
                        id: applePayToken.paymentData ? undefined : applePayToken,
                        stored_credential: {
                            payment_initiator: 'CUSTOMER',
                            payment_type: 'ONE_TIME'
                        },
                        vault_id: undefined,
                        decrypted_token: applePayToken.paymentData ? {
                            device_manufacturer_id: applePayToken.paymentData.header?.applicationPrimaryAccountNumber,
                            payment_data: applePayToken.paymentData
                        } : undefined
                    }
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to capture order: ${error}`);
        }

        const captureData = await response.json();
        console.log('Capture response:', JSON.stringify(captureData, null, 2));

        // Check the actual payment status in the nested response
        const captureStatus = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status;

        if (captureStatus === 'COMPLETED') {
            // Extract customer email from shipping contact if available
            const customerEmail = shippingContact?.emailAddress || 'N/A';
            console.log('Payment completed for:', customerEmail);

            res.json({
                success: true,
                orderID: captureData.id,
                status: captureStatus,
                customerEmail: customerEmail
            });
        } else {
            console.log('Payment not completed. Status:', captureStatus);
            res.json({
                success: false,
                orderID: captureData.id,
                status: captureStatus || captureData.status,
                message: 'Payment was not completed'
            });
        }
    } catch (error) {
        console.error('Error capturing order:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /
 * Serves the main index.html page
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log('Note: Apple Pay only works on HTTPS (use Render.com for testing)');
});
