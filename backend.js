// backend.js
const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const { verify } = require("crypto");
const router = express.Router();

const app = express();

async function discoverOpenIDConfiguration(issuerUrl) {
    try {
        const configUrl = `${issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
        const response = await axios.get(configUrl);
        return response.data;
    } catch (error) {
        console.error("Failed to discover OpenID configuration:", error.message);
        throw error;
    }
}

const issuer = "https://account.hubstaff.com";
const clientId = "lzFzi1Zxv1YNhWLcKQVodW_eL1nUustZvjyLwZukq0U";
const redirectUri = "http://localhost:4000/callback";
const client_secret = "fLaxNXpPSDjYYIf8YFmlmTR898o1nLedisVI3vFyiwn-bivTH8QritBjjsCqysO4a5mcRdholdD1S0a32n-imQ";
const scope = "openid profile email";

function generateNounce() {
    return Math.random().toString(36).substring(2);
}

function getAuthorizationUrl(config, clientId, redirectUri, scopes) {
    const nonce = generateNounce();
    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid profile email",
        nonce: nonce,
    });
    console.log(`${config.authorization_endpoint}?${params.toString()}`)
    return `${config.authorization_endpoint}?${params.toString()}`;
}

async function getOpenIDConfig() {
    const configUrl = `${issuer}/.well-known/openid-configuration`;
    const response = await axios.get(configUrl);
    return response.data;
}

// Define callback route
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send("Authorization code is missing");
    }
    const config = await getOpenIDConfig();
    try {
        const response = await axios.post(config.token_endpoint, querystring.stringify({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: client_secret,
            code: code,
            redirect_uri: redirectUri,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const tokens = response.data;
        res.json(tokens);
    } catch (error) {
        console.error("Error exchanging code for tokens", error.message);
        res.status(500).send("Error during token exchange");
    }
});

async function getMyProfile(accessToken) {
    try {
        const response = await axios.get('https://api.hubstaff.com/v2/users/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log("User Profile:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("API error:", error.response.data);
        } else {
            console.error("Error", error.message);
        }
    }
}

app.listen(4000);

// Exporting router and methods to be used in index.js
module.exports = {
    router,
    discoverOpenIDConfiguration,
    getAuthorizationUrl,
    getMyProfile
};
