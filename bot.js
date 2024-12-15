const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Replace with your actual token
const token = '7580691994:AAH0xnbZVDh9ClBMIgjhb4aH5KmlC5-Bkg4';
const bot = new TelegramBot(token, { polling: true });

// Path to the users data file
const usersFile = './users.json';

// Ensure users.json exists or create it
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
}

// Helper function to read users
function readUsers() {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
}

// Helper function to write users
function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Check if user exists
function getUser(chatId) {
    const users = readUsers();
    return users.find(u => u.username === chatId.toString());
}

// Update or create user
function saveUser(chatId, phone, password, country) {
    const users = readUsers();
    const existingUser = users.find(u => u.username === chatId.toString());
    if (existingUser) {
        // Update
        if (phone) existingUser.phoneno = phone;
        if (password) existingUser.password = password;
        if (country) existingUser.country = country;
    } else {
        // Create new
        users.push({
            username: chatId.toString(),
            password: password || '',
            phoneno: phone || '',
            country: country || ''
        });
    }
    writeUsers(users);
}

// Fetch country from AbstractAPI using native fetch
async function getCountryFromPhone(phoneNumber) {
    // We assume phoneNumber is a string like '919063858036'
    // Ensure phoneNumber is in full international format with country code

    const apiKey = '5517946b85704e7087e51c0634bff107'; // provided in the prompt
    const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${phoneNumber}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching country info: ${response.statusText}`);
            return '';
        }
        const data = await response.json();
        if (data && data.country && data.country.name) {
            return data.country.name.toLowerCase();
        }
    } catch (err) {
        console.error('Error fetching country info:', err);
    }
    return '';
}

// We will maintain a small state machine in memory for users currently in the signup or password change process
// state[chatId] = { step: 'awaiting_phone' | 'awaiting_password' | 'awaiting_change_password' }
const state = {};

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);
    if (user && user.phoneno && user.password) {
        // Already signed up
        bot.sendMessage(chatId, "You have already signed up. To change your password, send /change");
    } else {
        // Not signed up: ask for phone number
        state[chatId] = { step: 'awaiting_phone' };
        bot.sendMessage(chatId, `Hey ${msg.from.first_name}, share your mobile number to signup`, {
            reply_markup: {
                keyboard: [[{ text: "Share your number", request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        });
    }
});

// Handle contact message (phone number)
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    if (state[chatId] && state[chatId].step === 'awaiting_phone') {
        const phoneNumber = msg.contact.phone_number;
        // Normalize phone number (remove any leading '+' if present)
        const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;

        // Fetch country info
        const country = await getCountryFromPhone(normalizedPhone);

        // Save phone number temporarily
        state[chatId].phone = normalizedPhone;
        state[chatId].country = country;

        // Now ask for password
        state[chatId].step = 'awaiting_password';
        bot.sendMessage(chatId, `Your ChatID: \`${chatId}\`\nPlease set a password to complete the signup:`, {
            parse_mode: 'Markdown',
            reply_markup: { remove_keyboard: true }
        });
    }
});

// Handle text messages for setting password or changing password
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return; // If it's not text, ignore

    // If user is awaiting password during signup
    if (state[chatId] && state[chatId].step === 'awaiting_password') {
        // This message should be the password
        const password = text.trim();

        // Basic password validation (optional)
        if (password.length < 4) {
            bot.sendMessage(chatId, "Password too short. Please enter a password with at least 4 characters.");
            return;
        }

        const phoneNumber = state[chatId].phone;
        const country = state[chatId].country;

        // Save to file
        saveUser(chatId, phoneNumber, password, country);

        // Cleanup state
        delete state[chatId];

        bot.sendMessage(chatId, "Signup completed successfully!");
    }

    // If user is awaiting password during change
    if (state[chatId] && state[chatId].step === 'awaiting_change_password') {
        const password = text.trim();

        // Basic password validation (optional)
        if (password.length < 4) {
            bot.sendMessage(chatId, "Password too short. Please enter a password with at least 4 characters.");
            return;
        }

        const user = getUser(chatId);
        if (user) {
            // Update password
            saveUser(chatId, null, password, null);
            bot.sendMessage(chatId, "Password updated successfully!");
        } else {
            bot.sendMessage(chatId, "You have not signed up yet. Please send /start");
        }
        delete state[chatId];
    }
});

// Handle /change command
bot.onText(/\/change/, (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);
    if (!user || !user.phoneno || !user.password) {
        bot.sendMessage(chatId, "You are not signed up yet. Please send /start to sign up.");
        return;
    }
    // User exists, ask for new password
    state[chatId] = { step: 'awaiting_change_password' };
    bot.sendMessage(chatId, "Send the new password to update:");
});

// Handle /send command
bot.onText(/\/send/, (msg) => {
    const chatId = msg.chat.id;
    const user = getUser(chatId);
    if (user && user.phoneno && user.password) {
        bot.sendMessage(chatId, "You are already a member. Send /change to update your password.");
    } else {
        // Not specified what to do here if not a member
        // Let's just tell them to /start
        bot.sendMessage(chatId, "You are not a member yet. Please send /start to sign up.");
    }
});
