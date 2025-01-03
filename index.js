const TelegramBot = require('node-telegram-bot-api');
const token = "7253153525:AAE78Ne_xHP0_kJVlWVpKRuVoeX01mmttsw"
const {PrismaClient} = require('@prisma/client');
const { check } = require('prisma');
//import { discoverOpenIDConfiguration, getAuthorizationUrl, getMyProfile} from './backend';

const prisma= new PrismaClient();


const issuer = "https://account.hubstaff.com";
const clientId = "lzFzi1Zxv1YNhWLcKQVodW_eL1nUustZvjyLwZukq0U";
const redirectUri = "https://67d4-103-157-230-17.ngrok-free.app/callback";
const client_secret = "fLaxNXpPSDjYYIf8YFmlmTR898o1nLedisVI3vFyiwn-bivTH8QritBjjsCqysO4a5mcRdholdD1S0a32n-imQ";
const scope = "openid profile email";
const bot = new TelegramBot(token, {polling: true});
const LockMessage = "<b> This command is inteded for group members only</b>";

// const groupId = "-1002455776773"

// const checkMember = async (chatId, userId)=>{
//     try{
//         const chatMember = await bot.getChatMember(groupId, userId);
//         if(['member', 'administrator','creator'].includes(chatMember.status)){
//             return true;
//         }
//         else{
//             return false;
//         }
//     }catch(error){
//         console.log("error checking membership", error);
//     }
// }

bot.on("message", (msg)=>{
    console.log(msg.chat);
})

bot.onText(/\/start/, (msg)=>{
    const chatId = msg.chat.id;
    const message = `<b>👋 Welcome to the PV Operations Bot!</b>  🔹 Need assistance? Simply type /help to see all available commands. `
    bot.sendMessage(chatId, message, {parse_mode:"HTML"});
})

bot.onText(/\/help/, (msg)=>{
      const chatId = msg.chat.id;
      const message = `
      👋 Welcome to PV Operations Bot!
      <i>Here are the available commands:</i>
      🔹/start - Displays the start message  
      🔹/dailyupdate - Submit your daily update  
      🔹/leave - Mark yourself as on leave  
      🔹/help - Display this help message  
      🔹/hubstaff - Authenticate your Hubstaff account  
      🔹/feedback - Provide feedback 
      
      <i>Type any command to get started!</i>`;
      
          bot.sendMessage(chatId, message, {
              parse_mode: 'HTML',
              reply_markup: {
                  keyboard: [
                      ['/start', '/help'],
                      ['/dailyupdate', '/leave'],
                      ['/hubstaff', '/stats'],
                      ['/addtask', '/listtask'],
                      ['/feedback']
                  ],
                  resize_keyboard: true
              }
          });
      });
      



bot.onText(/\/feedback/, (msg)=>{
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    // const member = checkMember(chatId, userId);
    // if(!member){
    //     bot.sendMessage(chatId, LockMessage, {parse_mode:"HTML"});
    //     return;
    // }
    bot.sendMessage(chatId,"Please type your feedback. To cancel, Type /cancel");
    bot.once("message", async (msg)=>{
        
            if(msg.text === '/cancel'){
                bot.sendMessage(chatId, "Feedback process canceled");
                return;
            }
            const feedbackmsg = msg.text;

            try{
                let user = await prisma.user.findUnique({
                    where:{ telegramId: userId.toString()}
                });
                if(!user){
                    user =await prisma.user.create({
                        data:{
                            telegramId: userId.toString(),
                            leave:false,
                            feedback:{
                                create:[{feedback: feedbackmsg}]
                            }
                        }
                    })
                }else{
                    await prisma.user.update({
                        where:{telegramId: userId.toString()},
                        data:{
                            feedback:{
                                create:[{feedback:feedbackmsg}]
                            }
                        }
                    })
                }
                bot.sendMessage(chatId, "Thank you for your feedback!")
            }catch(error){
                console.error("Error saving feedback", error);
                bot.sendMessage(chatId, "An error occured while saving you feedback. Please try again");
            }
        
        
    })

})



bot.onText(/\/dailyupdate/, async(msg)=>{
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    // const isMember = await checkMember(chatId, userId);

    // if(!isMember){
    //     bot.sendMessage(chatId, LockMessage, {parse_mode:"HTML"})
    //     return;
    // }
    
    try{
        let user = await prisma.user.findUnique({
            where:{telegramId: userId.toString()}

        })
        if(!user){
            user = await prisma.user.create({
                data:{
                    telegramId: userId.toString(),
                }
            })
        }
        bot.sendMessage(chatId, "Please type your daily update. To cancel, type /cancel.");
        bot.once("message", async (msg)=>{
           
                if(msg.text === '/cancel'){
                    bot.sendMessage(chatId, "Daily update process Canceled");
                    return;
                }
                const dailyupdateText = msg.text;

                try{
                    await prisma.dailyUpdate.create({
                        data:{
                            userId: user.id,
                            update: dailyupdateText
                        }
                    })
                    bot.sendMessage(chatId, "Your daily update has been saved. Thank you!");
                }catch(error){
                    bot.sendMessage(chatId, "An error occured while saving your update. Please try again")
                }
            
        })


    }catch(error){
                bot.sendMessage(chatId, "An error occured. Please try again");
    }
})

const scopes = "openid profile email";

bot.onText(/\/hubstaff/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Step 1: Discover OpenID configuration
        const config = await discoverOpenIDConfiguration(issuer);

        // Step 2: Generate the authorization URL
        const authUrl = getAuthorizationUrl(config, clientId, redirectUri, scopes);

        
        await bot.sendMessage(
            chatId,
            `To authenticate your Hubstaff account, please click the link below:\n\n[Authenticate with Hubstaff](${authUrl})`,
            { parse_mode: "Markdown" }
        );

        
        await bot.sendMessage(chatId, "After logging in, you will be redirected to the app and authenticated.");
    } catch (error) {
        console.error("Error handling /hubstaff command:", error.message);
        await bot.sendMessage(chatId, "Sorry, something went wrong while initiating the authentication process.");
    }
});
bot.onText(/\/leave/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if the user is a member
    // const isMember = await checkMember(chatId, userId);
    // if (!isMember) {
    //     bot.sendMessage(chatId, LockMessage, { parse_mode: 'HTML' });
    //     return;
    // }

    try {
        // Ask for leave reason
        bot.sendMessage(chatId, "Please type the reason for the leave! To cancel, type /cancel.");

        // Listen for the next message from the same user
        bot.once("message", async (responseMsg) => {
            // Ensure the response is from the same user
            if (responseMsg.from.id !== userId) return;

            const text = responseMsg.text.toLocaleLowerCase();

            const healthReasons = ["stomach","ache", "fever", "cold", "headache", "flu", "dizziness"];
         
            // Handle /cancel command
            if (text === '/cancel') {
                bot.sendMessage(chatId, "Your leave marking process has been canceled.");
                return;
            }
            const leaveReason = responseMsg.text.toLocaleLowerCase();
            const leavedata = leaveReason.split(" ");

            let responseMessage;
            if (/emergency/i.test(text)) {
                responseMessage = "🛑 Leave marked as Emergency. Take care!";
            } else if (/exam/i.test(text)) {
                responseMessage = "📚 Leave marked as Exam. Good luck with your studies!";
            } else if (/personal/i.test(text)) {
                responseMessage = "🌟 Leave marked as Personal. Hope everything goes well!";
            } else if (healthReasons.some((reason) => leavedata.includes(reason))) {
                responseMessage = "🤒 Leave marked as Health-related. Please take care of your health!";
            } else {
                responseMessage = "✅ Leave reason recorded: " + text;
            }

            // Update the database with the leave status and reason
            try {
                let user = await prisma.user.findUnique({
                    where: { telegramId: userId.toString() },
                });

                if (!user) {
                    // Create a new user if not found
                    await prisma.user.create({
                        data: {
                            telegramId: userId.toString(),
                            leave: true,
                            leaveReason: leaveReason,
                        },
                    });
                } else {
                    // Update the existing user's leave status and reason
                    await prisma.user.update({
                        where: { telegramId: userId.toString() },
                        data: {
                            leave: true,
                            leaveReason: leaveReason,
                        },
                    });
                }

                
                bot.sendMessage(chatId, responseMessage);
            } catch (dbError) {
                console.error("Error updating leave status:", dbError.message);
                bot.sendMessage(chatId, "An error occurred while updating your leave status. Please try again.");
            }
        });

    } catch (error) {
        console.error("Error handling leave command:", error.message);
        bot.sendMessage(chatId, "An error occurred while processing your leave request. Please try again.");
    }
});

//backend.js
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
        res.send("Authentication successfull")
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
