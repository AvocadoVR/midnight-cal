/**
 * ELITE EVENT DESIGNER - CENTRAL CONTROL
 */

let clipboard = null; 

// 1. SYSTEM SETTINGS & ASSETS
window.SYSTEM_CONFIG = {
    icons: [
        { 
            name: "Main Logo", 
            file: "ms_logo.png",
            variantFolder: "ms_logo", 
            variants: [
                "logo-christmas.png", "logo-green.png", "logo-halloween.png", 
                "logo-purple.png", "logo-soft-spring.png", "logo-valentine-pink.png", "logo-valentine-red.png"
            ],
            currentVariant: 0
        },
        { name: "Jackbox Games", file: "jackbox.png" },
		{ name: "Goose Goose Duck", file: "ggd.png" }
    ],
    hosts: ["None", "Avocado", "Yui", "Astra", "nFinity", "Kinn", "Gaster", "Therisol", "DMAR", "TBA"],
    defaultIcon: "ms_logo.png" 
};

window.TZ_MAP = {
    "America/New_York":"EST", "America/Chicago":"CST", "America/Denver":"MST",
    "America/Los_Angeles":"PST", "Europe/London":"GMT", "Europe/Paris":"CET", "Australia/Sydney":"AEST"
};



// Update DOMContentLoaded to include hydration
document.addEventListener('DOMContentLoaded', () => {

    setupTimezone();
    initTimeSelectors();
    populateHostDropdowns();
    populateIconPicker();
    attachCalendarDelegates(); // Attach the listeners
    refreshAllViews();
});

/**
 * UI Population Helpers
 */
function populateHostDropdowns() {
    const hostSelect = document.getElementById('shiftHostName');
    if (!hostSelect) return;
    
    hostSelect.innerHTML = window.SYSTEM_CONFIG.hosts
        .map(h => `<option value="${h}">${h}</option>`)
        .join('');
}

function populateIconPicker() {
    const picker = document.getElementById('iconPicker');
    if (!picker) return;

    picker.innerHTML = window.SYSTEM_CONFIG.icons
        .map((icon, idx) => `<option value="${idx}">${icon.name}</option>`)
        .join('');
    
    // Trigger initial preview
    if (typeof handleDropdownChange === 'function') handleDropdownChange();
}

function initTimeSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearInput = document.getElementById('yearInput');
    if (!monthSelect || !yearInput) return;

    // Only set to "Now" if the inputs are currently empty or at a default
    if (monthSelect.innerHTML === "") {
        const now = new Date();
        
        const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        
        monthSelect.innerHTML = months.map((m, i) => 
            `<option value="${i}" ${i === now.getMonth() ? 'selected' : ''}>${m}</option>`
        ).join('');
        yearInput.value = now.getFullYear();
    }

    // Ensure the render function listens for changes
    monthSelect.onchange = () => refreshAllViews();
    yearInput.onchange = () => refreshAllViews();
}

/**
 * Synchronizes the UI with the browser's timezone and handles updates
 */
function setupTimezone() {
    const tzSelect = document.getElementById('timezoneSelect');
    if (!tzSelect) return;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Check if browser TZ is already in the list
    const hasOption = Array.from(tzSelect.options).some(opt => opt.value === browserTz);

    if (hasOption) {
        tzSelect.value = browserTz;
    } else {
        // Create a new option for the detected local timezone if not present
        const localLabel = window.TZ_MAP[browserTz] || browserTz.split('/').pop().replace('_', ' ');
        const newOpt = new Option(`${localLabel} (Local)`, browserTz);
        tzSelect.prepend(newOpt);
        tzSelect.value = browserTz;
    }

    // Single listener to refresh the UI when timezone changes
    tzSelect.onchange = () => {
        if (window.renderCalendar) renderCalendar();
        if (window.renderItinerary) renderItinerary();
    };
}

// Add to main.js
function refreshAllViews() {
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderItinerary === 'function') renderItinerary(); 
}

