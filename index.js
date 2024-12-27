const TelegramBot = require('node-telegram-bot-api');
const token = "7253153525:AAE78Ne_xHP0_kJVlWVpKRuVoeX01mmttsw"
const {PrismaClient} = require('@prisma/client');
const { check } = require('prisma');
const prisma= new PrismaClient();



const bot = new TelegramBot(token, {polling: true});
const LockMessage = "<b> This command is inteded for group members only</b>";

const groupId = "933767902"

const checkMember = async (chatId, userId)=>{
    try{
        const chatMember = await bot.getChatMember(groupId, userId);
        if(['member', 'administrator','creator'].includes(chatMember.status)){
            return true;
        }
        else{
            return false;
        }
    }catch(error){
        console.log("error checking membership", error);
    }
}

bot.on("message", (msg)=>{
    console.log(msg.chat);
})

bot.onText(/\/help/, (msg)=>{
      const chatId = msg.chat.id;
      const message = `
      <b>👋 Welcome to PV Operations Bot!</b>
      <i>Here are the available commands:</i>

      - <code>/start</code> - Displays the start message
      - <code>/dailyupdate</code> - Submit your daily update
      - <code>/leave</code> - Mark yourself as on leave
      - <code>/help</code> - Display this help message
      - <code>/feedback</code> - Used to give feedback

      <i>Type any command to get started!</i>`;
    
      bot.sendMessage( chatId, message, {parse_mode:"HTML"});
})


bot.onText(/\/start/, (msg)=>{
    const chatId = msg.chat.id;
    const message = "👋<b> Welcome to the PV Operations Bot!</b> \n🔹 Need assistance? Simply type /help to see all available commands."
    
    bot.sendMessage(chatId, message, {parse_mode:"HTML"})

})

bot.onText(/\/feedback/, (msg)=>{
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const member = checkMember(chatId, userId);
    if(!member){
        bot.sendMessage(chatId, LockMessage, {parse_mode:"HTML"});
        return;
    }
    bot.sendMessage(chatId,"Please type your feedback. To cancel, Type /cancel");
    bot.once("message", async (msg)=>{
        if(msg.from.id === userId){
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
        }
        
    })

})

// bot.onText(/\/addtask/, async (msg) => {
//     const chatId = msg.chat.id;
//     const userId = msg.from.id;

//     // Check if the user is a member of the group
//     const isMember = checkMember(chatId, groupId);
//     if (!isMember) {
//         bot.sendMessage(chatId, LockMessage, { parse_mode: "HTML" });
//         return;
//     }

//     try {
//         // Check if the user exists in the database
//         const user = await prisma.user.findUnique({
//             where: { telegramId: userId.toString() },
//         });

//         if (!user) {
//             bot.sendMessage(chatId, "You have not registered in the database.");
//             return;
//         }

//         // Prompt user to enter tasks
//         bot.sendMessage(
//             chatId,
//             "Please type your tasks separated by commas. To cancel, type /cancel."
//         );

//         // Listen for the user's task input
//         const onMessageHandler = async (response) => {
//             if (response.from.id !== userId) return; // Ignore messages from other users

//             if (response.text === "/cancel") {
//                 bot.sendMessage(chatId, "Task adding process canceled.");
//                 bot.removeListener("message", onMessageHandler); // Clean up listener
//                 return;
//             }

//             const taskInput = response.text;
//             const tasks = taskInput
//                 .split(",")
//                 .map((task) => task.trim())
//                 .filter((task) => task !== "");

//             if (tasks.length === 0) {
//                 bot.sendMessage(chatId, "No valid tasks entered.");
//                 bot.removeListener("message", onMessageHandler); // Clean up listener
//                 return;
//             }

//             try {
//                 // Save tasks in the database
//                 await prisma.task.createMany({
//                     data: tasks.map((task) => ({
//                         userId: userId,
//                         name: task,
//                     })),
//                 });

//                 // Confirm the tasks were added
//                 bot.sendMessage(
//                     chatId,
//                     `Tasks added:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
//                 );
//             } catch (error) {
//                 console.error("Error saving tasks:", error);
//                 bot.sendMessage(chatId, "An error occurred while saving your tasks. Please try again.");
//             } finally {
//                 bot.removeListener("message", onMessageHandler); // Clean up listener
//             }
//         };

//         // Attach the event listener
//         bot.on("message", onMessageHandler);
//     } catch (error) {
//         console.error("Error in addtask command:", error);
//         bot.sendMessage(chatId, "An unexpected error occurred. Please try again.");
//     }
// });


bot.onText(/\/dailyupdate/, async(msg)=>{
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isMember = await checkMember(chatId, userId);

    if(!isMember){
        bot.sendMessage(chatId, LockMessage, {parse_mode:"HTML"})
        return;
    }
    
    try{
        let user = await prisma.user.findUnique({
            where:{telegramId: userId.toString()}

        })
        if(!user){
            bot.sendMessage(chatId, "You are not registered yet. Please use the bot and try again");
            return;
        }
        bot.sendMessage(chatId, "Please type your daily update. To cancel, type /cancel.");
        bot.once("message", async (msg)=>{
            if(msg.from.id == userId){
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
            }
        })


    }catch(error){
                bot.sendMessage(chatId, "An error occured. Please try again");
    }
})

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
    const isMember = await checkMember(chatId, userId);
    if (!isMember) {
        bot.sendMessage(chatId, LockMessage, { parse_mode: 'HTML' });
        return;
    }

    try {
        // Ask for leave reason
        bot.sendMessage(chatId, "Please type the reason for the leave! To cancel, type /cancel.");

        // Listen for the next message from the same user
        bot.once("message", async (responseMsg) => {
            // Ensure the response is from the same user
            if (responseMsg.from.id !== userId) return;

            const text = responseMsg.text;

            // Handle /cancel command
            if (text === '/cancel') {
                bot.sendMessage(chatId, "Your leave marking process has been canceled.");
                return;
            }

            const leaveReason = text;

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

                bot.sendMessage(chatId, "✅Your leave reason has been recorded, and you have been marked on leave.");
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
