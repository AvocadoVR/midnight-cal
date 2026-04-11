/**
 * CONTEXTMENU.JS - User Interaction Tools
 */
let contextTargetDate = null;
let contextTargetIndex = 0; // Added to support multiple events per day
let contextClipboard = null; 

/**
 * UI TRIGGER
 */
function showContextMenu(x, y, dateStr) {
    contextTargetDate = dateStr;
    
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    menu.style.display = 'block';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Toggle Paste visibility based on clipboard status
    const pasteBtn = menu.querySelector('[onclick="contextPaste()"]');
    if (pasteBtn) {
        pasteBtn.style.opacity = contextClipboard ? "1" : "0.3";
        pasteBtn.style.pointerEvents = contextClipboard ? "auto" : "none";
    }
}

function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
}

/**
 * ACTIONS
 */
function contextCopy() {
    // Get events for the date from our DB logic
    const dayEvents = EventDB.getEventsForDate(contextTargetDate);
    if (!dayEvents || dayEvents.length === 0) return;
    
    // Copy the first event (or track index if UI allows selecting specific one)
    const eventToCopy = dayEvents[contextTargetIndex];
    
    // Store a deep copy (plain object)
    contextClipboard = JSON.parse(JSON.stringify(eventToCopy.toJSON()));
    
    hideContextMenu();
}

function contextPaste() {
    if (!contextClipboard || !contextTargetDate) return;


    // 3. Create new instance
const newEvent = new Event(
        contextClipboard.name,
        contextClipboard.startUtc,
        contextClipboard.endUtc,
        contextClipboard.hostShifts,
        contextClipboard.iconId || contextClipboard.icon,
        contextClipboard.specificIconPath 
    );
    // 4. Save via EventDB
    EventDB.save(contextTargetDate, newEvent);

    finishAction();
}

function contextDelete() {
    if (!contextTargetDate) return;
    
    if (confirm(`Delete event(s) for ${contextTargetDate}?`)) {
        // Option A: Delete specific index
        EventDB.delete(contextTargetDate, contextTargetIndex);
        
        // Option B: If you want to clear the whole day:
        // const data = EventDB.all();
        // delete data[contextTargetDate];
        // localStorage.setItem(DB_KEY, JSON.stringify(data));
        
        finishAction();
    }
}

function copyDiscordTimestamp() {
    const dayEvents = EventDB.getEventsForDate(contextTargetDate);
    const ev = dayEvents[contextTargetIndex];
    if (!ev) return;

    // Use the class's startUtc property
    const unix = Math.floor(new Date(ev.startUtc).getTime() / 1000);
    const tag = `<t:${unix}:F>`;
    
    navigator.clipboard.writeText(tag).then(() => {
        hideContextMenu();
        alert("Discord timestamp copied!");
    });
}

/**
 * THE BRIDGE
 */
function finishAction() {
    // Re-render the UI
    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof updateItinerary === 'function') updateItinerary();
    hideContextMenu();
}

/* RIGHT CLICK LISTENER */
document.addEventListener("contextmenu", (e) => {
    const cell = e.target.closest(".day-cell");
    if (!cell) return;

    e.preventDefault();
    e.stopPropagation();

    // Change this line to match the function name in contextmenu.js
    showContextMenu(e.clientX, e.clientY, cell.dataset.date); 
});


function attachCalendarDelegates() {
    /* LEFT CLICK - Modal & Menu Cleanup */
    document.addEventListener("click", (e) => {
        const cell = e.target.closest(".day-cell");
        const menu = document.getElementById('contextMenu');

        // Hide menu if clicking outside of it
        if (menu && !e.target.closest('#contextMenu')) hideContextMenu();

        if (cell) {
            const dateStr = cell.dataset.date;
            const dayEvents = EventDB.getEventsForDate(dateStr);
            const hasEvent = dayEvents && dayEvents.length > 0;
            
            // Pass the actual event object to openModal
            if (typeof openModal === 'function') {
                openModal(dateStr, hasEvent ? dayEvents[0] : null, hasEvent ? 0 : null);
            }
        }
    });

    /* RIGHT CLICK - Single Listener */
    document.addEventListener("contextmenu", (e) => {
        const cell = e.target.closest(".day-cell");
        if (!cell) return;

        e.preventDefault();
        e.stopPropagation();

        const dateStr = cell.dataset.date;
        const eventEl = e.target.closest(".event-item");
        
        // Update global context
        contextTargetDate = dateStr;
        contextTargetIndex = eventEl ? parseInt(eventEl.dataset.index) : 0;

        showContextMenu(e.clientX, e.clientY, dateStr);
    });

    /* DRAG & DROP - Move Events */
    document.addEventListener("dragstart", (e) => {
        const cell = e.target.closest(".day-cell");
        if (!cell) return;
        const dayEvents = EventDB.getEventsForDate(cell.dataset.date);
        if (dayEvents.length === 0) return e.preventDefault();

        cell.classList.add("dragging");
        e.dataTransfer.setData("text/plain", JSON.stringify({ sourceDate: cell.dataset.date, index: 0 }));
    });

    document.addEventListener("dragover", (e) => {
        if (e.target.closest(".day-cell")) e.preventDefault();
    });

    document.addEventListener("drop", (e) => {
        const cell = e.target.closest(".day-cell");
        if (!cell) return;
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData("text/plain"));
            if (data.sourceDate !== cell.dataset.date) {
                moveEvent(data.sourceDate, data.index, cell.dataset.date);
            }
        } catch (err) { console.error("Drop failed", err); }
    });
}

/**
 * Logic to move an event from one day to another
 */
/**
 * Logic to move an event from one day to another
 */
/**
 * Logic to move an event from one day to another using EventDB
 */
function moveEvent(sourceDate, index, targetDate) {
    const sourceDayEvents = EventDB.getEventsForDate(sourceDate);
    if (!sourceDayEvents || !sourceDayEvents[index]) return;

    const eventToMove = sourceDayEvents[index];

    // FIX: Use Date objects to preserve local time instead of string splitting
    const adjustDate = (oldUtc, newDateStr) => {
        const oldDate = new Date(oldUtc);
        const [y, m, d] = newDateStr.split('-').map(Number);
        
        // Construct new date using local time values
        const newDate = new Date(
            y, 
            m - 1, 
            d, 
            oldDate.getHours(), 
            oldDate.getMinutes(), 
            oldDate.getSeconds()
        );
        
        return newDate.toISOString(); // Returns the correct UTC equivalent of that local time
    };

    eventToMove.startUtc = adjustDate(eventToMove.startUtc, targetDate);
    eventToMove.endUtc = adjustDate(eventToMove.endUtc, targetDate);

    if (eventToMove.hostShifts) {
        eventToMove.hostShifts.forEach(shift => {
            shift.startUtc = adjustDate(shift.startUtc, targetDate);
            shift.endUtc = adjustDate(shift.endUtc, targetDate);
        });
    }

    EventDB.delete(sourceDate, index);
    EventDB.save(targetDate, eventToMove);

    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof renderItinerary === 'function') renderItinerary();
}
/**
 * The handler for right-clicking a cell
 */
function handleRightClick(e) {
    const cell = e.target.closest(".day-cell");
    if (!cell) return;
    
    e.preventDefault();
    if (typeof showContextMenu === 'function') {
        showContextMenu(e.clientX, e.clientY, cell.dataset.date);
    }
}

document.addEventListener("contextmenu", (e) => {
    // Check if we clicked a specific event item inside a cell
    const eventEl = e.target.closest(".event-item");
    const cell = e.target.closest(".day-cell");

    if (!cell) return;

    e.preventDefault();
    
    const dateStr = cell.dataset.date;
    const index = eventEl ? parseInt(eventEl.dataset.index) : 0;

    handleRightClick(e, dateStr, index);
});