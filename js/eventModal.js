// Local state for the modal session
let currentSelectedDate = null; // Format: YYYY-MM-DD
let currentShifts = [];
let editingEventIndex = null; 

/**
 * Opens the modal for a specific date or existing event
 */
/**
 * Opens the modal for a specific date or existing event
 */
function openModal(dateStr, existingEvent = null, index = null) {
    currentSelectedDate = dateStr;
    editingEventIndex = index;
    
    const modal = document.getElementById('modalOverlay');
    modal.style.display = 'flex';

    if (existingEvent) {
        document.getElementById('eventName').value = existingEvent.name || "";
        document.getElementById('iconPicker').value = existingEvent.iconId || "0";

        const times = existingEvent.getLocalShort(); 
        document.getElementById('startTime').value = FormatForInput(times.start);
        document.getElementById('endTime').value = FormatForInput(times.end);

        currentShifts = [...(existingEvent.hostShifts || [])];

        // NEW: Pass the saved path to the preview handler
        handleDropdownChange(existingEvent.specificIconPath); 
    } else {
        document.getElementById('eventName').value = "";
        document.getElementById('startTime').value = "20:00";
        document.getElementById('endTime').value = "22:00";
        currentShifts = [];
        const iconPicker = document.getElementById('iconPicker');
        if (iconPicker) iconPicker.selectedIndex = 0;
        handleDropdownChange(); 
    }

    syncHostInputTimes();
    renderShiftTimeline();
}

function handleDropdownChange(savedPath = null) {
    const picker = document.getElementById('iconPicker');
    const previewContainer = document.getElementById('modalIconPreview');
    
    if (!picker || !previewContainer) return; // Safety exit

    const iconIndex = picker.value;
    const iconConfig = window.SYSTEM_CONFIG.icons[iconIndex];

    // FIX: Check if iconConfig exists before reading '.file'
    if (!iconConfig) {
        console.warn(`Icon config not found for index: ${iconIndex}`);
        return;
    }

    // Priority: 1. Manually saved variant path | 2. Global default from config
    const pathToShow = savedPath || iconConfig.file;

    previewContainer.innerHTML = `
        <img src="icons/${pathToShow}" 
             data-selected-path="${pathToShow}" 
             style="max-width: 70px; max-height: 70px; object-fit: contain;">`;
}

/**
 * Captures UI inputs and adds a HostShift to the temporary list
 */
function addShiftToTimeline() {
    const host = document.getElementById('shiftHostName').value;
    const role = document.getElementById('shiftRole').value;
    const start = document.getElementById('shiftStart').value;
    const end = document.getElementById('shiftEnd').value;

    if (!host || !start || !end) return alert("Please fill shift details.");

    const [y, m, d] = currentSelectedDate.split('-').map(Number);
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);

    const startUTC = ConvertToUTC(y, m - 1, d, sH, sM);
    const endUTC = ConvertToUTC(y, m - 1, d, eH, eM);

    // FIX: Changed startTimeUTC -> startUtc to match your class
    currentShifts.push({
        host: host,
        role: role,
        startUtc: startUTC, 
        endUtc: endUTC
    });

    // Clear host name for next entry
    document.getElementById('shiftHostName').value = "";
    renderShiftTimeline();
}

/**
 * Helper to convert "03:00 PM" or "3:00 PM" into "15:00" 
 * so the HTML input element accepts it.
 */
function FormatForInput(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    
    // Ensure 2-digit format (e.g., "09:00")
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}


function syncHostInputTimes() {
    const eStart = document.getElementById('startTime').value;
    const eEnd = document.getElementById('endTime').value;
    
    if (document.getElementById('shiftStart')) {
        document.getElementById('shiftStart').value = eStart;
    }
    if (document.getElementById('shiftEnd')) {
        document.getElementById('shiftEnd').value = eEnd;
    }
}

/**
 * Finalizes the Event object and saves via Utils
 */
function saveEvent() {
    const name = document.getElementById('eventName').value;
    const startT = document.getElementById('startTime').value;
    const endT = document.getElementById('endTime').value;
    const iconIndex = document.getElementById('iconPicker').value;

    // Grab the SPECIFIC path from the preview image
    const previewImg = document.querySelector('#modalIconPreview img');
    const specificIconPath = previewImg ? previewImg.getAttribute('data-selected-path') : null;

    if (!name || !startT || !endT) return alert("All event fields are required.");

    const [year, month, day] = currentSelectedDate.split('-').map(Number);
    const [sH, sM] = startT.split(':').map(Number);
    const [eH, eM] = endT.split(':').map(Number);

    const startUtc = ConvertToUTC(year, month - 1, day, sH, sM);
    const endUtc = ConvertToUTC(year, month - 1, day, eH, eM);

    // Pass specificIconPath as the 6th argument
    const newEvent = new Event(name, startUtc, endUtc, currentShifts, iconIndex, specificIconPath);
    
    if (editingEventIndex !== null) {
        EventDB.update(currentSelectedDate, editingEventIndex, newEvent);
    } else {
        EventDB.save(currentSelectedDate, newEvent);
    }

    closeModal();
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderItinerary === 'function') renderItinerary();
}

function deleteEvent() {
    // Only proceed if we are editing an existing event
    if (editingEventIndex === null) {
        closeModal();
        return;
    }

    const confirmDelete = confirm("Are you sure you want to remove this event?");
    if (confirmDelete) {
        // Use the utility to remove from storage
        EventDB.delete(currentSelectedDate, editingEventIndex);
        
        // UI Cleanup
        closeModal();
        
        // Refresh both views
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof renderItinerary === 'function') renderItinerary();
    }
}

/**
 * Updates the UI list of shifts (stays the same, just calls )
 */
function renderShiftTimeline() {
    const container = document.getElementById('hostTimelineList');
    if (!container) return;

    if (currentShifts.length === 0) {
        container.innerHTML = `<div style="text-align:center; font-size:10px; color:#444; padding:20px;">NO SHIFTS SCHEDULED</div>`;
        return;
    }

    container.innerHTML = currentShifts.map((shift, index) => {
        // Use ConvertToLocalShort to turn that "Wed, 04 Feb..." into "08:00 PM"
        const startDisp = ConvertToLocalShort(shift.startUtc);
        const endDisp = ConvertToLocalShort(shift.endUtc);

        return `
            <div class="shift-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
                <span><strong>${shift.host}</strong> (${shift.role})</span>
                <span style="color: #ccc;">${startDisp} - ${endDisp} 
                    <button onclick="removeShift(${index})" style="background:none; border:none; color:#855; cursor:pointer; margin-left:10px; font-size:14px;">✕</button>
                </span>
            </div>
        `;
    }).join('');
}

function removeShift(index) {
    currentShifts.splice(index, 1);
    renderShiftTimeline();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}



// Add these inside your initialization or at the bottom of the script
const eventStartInput = document.getElementById('startTime');
const eventEndInput = document.getElementById('endTime');

// Whenever you change the EVENT time, sync the HOST ADD inputs and CLAMP existing shifts
eventStartInput.addEventListener('input', () => {
    // 1. Update the "Shift Start" input box automatically
    document.getElementById('shiftStart').value = eventStartInput.value;
    // 2. Force existing shifts to stay inside the new event time
    syncShiftsToEventBounds(); 
});

eventEndInput.addEventListener('input', () => {
    document.getElementById('shiftEnd').value = eventEndInput.value;
    syncShiftsToEventBounds();
});


/**
 * Opens the Variant Picker Popup
 */
function handleIconChange() {
    const picker = document.getElementById('iconPicker');
    // FIX: Check if picker exists and has a value
    if (!picker || !picker.value || !window.SYSTEM_CONFIG.icons[picker.value]) {
        console.warn("Please select a valid icon first.");
        return; 
    }

    const iconConfig = window.SYSTEM_CONFIG.icons[picker.value];

    // FIX: Only open if variants actually exist
    if (!iconConfig.variants || iconConfig.variants.length === 0) {
        alert("This icon has no variants to choose from.");
        return;
    }

    const overlay = document.getElementById('variantOverlay');
    const grid = document.getElementById('variantGrid');
    overlay.style.display = 'flex';

    // Get current preview path to mark "active" card
    const currentPreview = document.querySelector('#modalIconPreview img')?.getAttribute('data-selected-path');

    const defaultFile = iconConfig.defaultFile || iconConfig.file.split('/').pop();
    const defaultHtml = `
        <div class="variant-card ${currentPreview === defaultFile ? 'active' : ''}" onclick="selectDefaultVariant()">
            <img src="icons/${defaultFile}" style="width:100%;">
            <div style="font-size:9px; margin-top:5px; color: var(--gold);">DEFAULT</div>
        </div>
    `;

    const variantsHtml = iconConfig.variants.map(v => {
        const path = `${iconConfig.variantFolder}/${v}`;
        return `
            <div class="variant-card ${currentPreview === path ? 'active' : ''}" onclick="selectVariant('${iconConfig.variantFolder}', '${v}')">
                <img src="icons/${path}" style="width:100%;">
                <div style="font-size:9px; margin-top:5px;">${v.replace('.png', '')}</div>
            </div>
        `;
    }).join('');

    grid.innerHTML = defaultHtml + variantsHtml;
}

/**
 * Updates the current icon selection from the variant popup
 */
function selectVariant(folder, filename) {
    const previewContainer = document.getElementById('modalIconPreview');
    const path = `${folder}/${filename}`;

    if (previewContainer) {
        // Store the path in a data-attribute so saveEvent can grab it later
        previewContainer.innerHTML = `<img src="icons/${path}" data-selected-path="${path}" style="max-width: 70px; max-height: 70px;">`;
    }
    closeVariantPopup();
}

function selectDefaultVariant() {
    const picker = document.getElementById('iconPicker');
    const iconConfig = window.SYSTEM_CONFIG.icons[picker.value];
    const previewContainer = document.getElementById('modalIconPreview');
    
    // Get the base filename
    const path = iconConfig.defaultFile || iconConfig.file.split('/').pop();

    if (previewContainer) {
        previewContainer.innerHTML = `<img src="icons/${path}" data-selected-path="${path}" style="max-width: 70px; max-height: 70px;">`;
    }
    closeVariantPopup();
}

function closeVariantPopup() {
    document.getElementById('variantOverlay').style.display = 'none';
}

function filterVariants(query) {
    const cards = document.querySelectorAll('.variant-card');
    cards.forEach(card => {
        const name = card.innerText.toLowerCase();
        card.style.display = name.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

function syncShiftsToEventBounds() {
    const eventStart = document.getElementById('startTime').value;
    const eventEnd = document.getElementById('endTime').value;

    if (!eventStart || !eventEnd) return;

    // Iterate through current shifts and ensure they are within the new bounds
    currentShifts.forEach(shift => {
        const sTime = FormatForInput(ConvertToLocalShort(shift.startUtc));
        const eTime = FormatForInput(ConvertToLocalShort(shift.endUtc));

        // Logic to compare and clamp times can go here if needed
    });

    renderShiftTimeline();
}