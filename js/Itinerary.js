function renderItinerary() {
    const container = document.getElementById('itinerary-content');
    if (!container) return;

    const year = document.getElementById('yearInput').value;
    const monthIndex = document.getElementById('monthSelect').value;
    
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthLabel = monthNames[parseInt(monthIndex)];

    const rawEvents = EventDB.getEventsForMonth(year, monthIndex);
    let allEvents = [];
    
    if (rawEvents && typeof rawEvents === 'object') {
        Object.values(rawEvents).forEach(dayArray => {
            if (Array.isArray(dayArray)) allEvents.push(...dayArray);
        });
    }

    // Standardize sorting
    allEvents.sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));

    if (allEvents.length === 0) {
        container.innerHTML = `<div class="no-events-msg">NO EVENTS SCHEDULED</div>`;
        return;
    }

    let html = `
        <div class="itinerary-header-container">
            <h1 class="itinerary-main-title">PROGRAM OF EVENTS</h1>
        </div>
    `;

    html += allEvents.map(event => {
        const startDisp = ConvertToLocalShort(event.startUtc);
        const endDisp = ConvertToLocalShort(event.endUtc);
        // Fix: Use local date to ensure the day label matches the calendar cell
        const dayLabel = new Date(event.startUtc).getDate(); 

        return `
            <div class="sched-item">
                <div class="sched-date">${monthLabel} ${dayLabel}</div>
                <div class="sched-title">${event.name.toUpperCase()}</div>
                <div class="sched-main-time">${startDisp} — ${endDisp}</div>
                <div class="sched-divider"></div>
                <div class="sched-host-section">
                    <div class="sched-host-label">HOST SCHEDULE</div>
                    ${event.hostShifts && event.hostShifts.length > 0 ? event.hostShifts.map(shift => `
                        <div class="shift-row">
                            <div class="shift-info"><span class="shift-name">${shift.host}</span><span class="shift-role">${shift.role}</span></div>
                            <div class="shift-times">${ConvertToLocalShort(shift.startUtc)} — ${ConvertToLocalShort(shift.endUtc)}</div>
                        </div>
                    `).join('') : `
                        <div class="shift-row">
                            <div class="shift-info"><span class="shift-name" style="opacity:0.5;">TBA</span></div>
                            <div class="shift-times">${startDisp} — ${endDisp}</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Sync function name with your HTML toggle
 */
function toggleRightTab() {
    const tab = document.getElementById('itinerary-tab');
    if (!tab) return;
    
    tab.classList.toggle('open');
    if (tab.classList.contains('open')) {
        renderItinerary();
    }
}

/**
 * Captures the Itinerary/List view as a PNG image.
 */
async function downloadItinerary() {
    const itineraryArea = document.getElementById('itinerary-capture-box');
    
    // Check if there is content to download
    if (!itineraryArea || itineraryArea.innerText.includes("No events")) {
        return alert("Itinerary is empty. Add events first!");
    }

    try {
        const canvas = await html2canvas(itineraryArea, {
            backgroundColor: '#0a0a0c',
            scale: 2,
            logging: false,
            useCORS: true
        });

        const link = document.createElement('a');
        link.download = `MS-Itinerary-List.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Failed to capture itinerary:", err);
        alert("Error generating itinerary image.");
    }
}