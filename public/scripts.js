// Get references to DOM elements
const loginForm = document.getElementById('loginForm');
const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popupMessage');
const popupButton = document.getElementById('popupButton');

let popupAction = null;

// Handle login form submission
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData);

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.status === 'user_not_found') {
        showPopup('User not found. Click below to sign up.', 'Sign Up', redirectToSignup);
    } else if (result.status === 'wrong_password') {
        showPopup('Wrong password. Click below to reset your password.', 'Reset Password', redirectToSignup);
    } else if (result.status === 'success') {
        window.location.href = result.redirect;
    }
});

// Show the popup with a custom message and action
function showPopup(message, buttonText, action) {
    popupMessage.textContent = message;
    popupButton.textContent = buttonText;
    popupAction = action;
    popup.classList.remove('hidden');
}

// Handle popup button click
function handlePopupAction() {
    if (popupAction) {
        popupAction();
    }
    popup.classList.add('hidden');
}

// Redirect to signup/reset link based on the platform
function redirectToSignup() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile ? "https://telegram.openinapp.co/s9p4p" : "https://web.telegram.org/k/#@PurveyorSoul";
    window.open(url, "_blank");
}

// Redirect to signup link based on the platform
function redirectToSignup() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
        ? "https://telegram.openinapp.co/s9p4p"
        : "https://web.telegram.org/k/#@PurveyorSoul";
    window.open(url, "_blank");
}
