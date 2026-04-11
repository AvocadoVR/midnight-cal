/**
 * CALENDAR RENDER ENGINE
 */
function renderCalendar() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 1. Get current period from Sidebar inputs
    const currentMonth = parseInt(document.getElementById('monthSelect').value);
    const currentYear = parseInt(document.getElementById('yearInput').value);

    // 2. Setup Headers
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(label => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerText = label;
        grid.appendChild(header);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    document.getElementById('month-display').innerText = monthName.toUpperCase();

    // 3. Pad Start
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    // 4. Generate Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        grid.appendChild(createDayCell(d, dateStr));
    }
}

/**
 * CELL GENERATOR
 */
function createDayCell(day, dateStr) {
    const div = document.createElement('div');
    div.className = 'day-cell';
    div.dataset.date = dateStr;
    div.innerHTML = `<div class="day-number">${day}</div>`;

    const dayEvents = EventDB.getEventsForDate(dateStr);

    if (dayEvents.length > 0) {
        const ev = dayEvents[0];
        const times = ev.getLocalShort();

        // ✅ NEW: resolve correct icon (variant-aware)
        const iconPath = ev.getIconPath();

        div.setAttribute('draggable', 'true');

        div.innerHTML += `
            <img src="icons/${iconPath}" class="cell-icon">
            <div class="cell-content">${(ev.name || "UNTITLED").toUpperCase()}</div>
            <div class="cell-time">${times.start}</div>
        `;

        div.classList.add('has-event');

        // optional: mark variant visually
        if (ev.specificIconPath) {
            div.classList.add('has-variant-icon');
        }
    }

    return div;
}


async function downloadCalendar() {
    const exportArea = document.getElementById('export-area');
    const monthName = document.getElementById('month-display').innerText || 'Calendar';
    
    try {
        // Use html2canvas to render the div to a canvas
        const canvas = await html2canvas(exportArea, {
            backgroundColor: '#0a0a0c', // Matches your CSS background
            scale: 2, // Higher scale for better print quality
            logging: false,
            useCORS: true // Essential if using icons from external domains
        });

        // Convert canvas to image and trigger download
        const link = document.createElement('a');
        link.download = `MS-Calendar-${monthName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Failed to capture calendar:", err);
        alert("Error generating calendar image.");
    }
}

