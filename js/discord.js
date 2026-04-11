function copyDiscordFullList() {
    const year = document.getElementById('yearInput').value;
    const monthSelect = document.getElementById('monthSelect');
    const monthIndex = monthSelect.value;
    
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthLabel = monthNames[parseInt(monthIndex)];
    
    const allEvents = EventDB.getEventsForMonth(year, monthIndex);

    if (!allEvents || Object.keys(allEvents).length === 0) {
        alert(`No events found for ${monthLabel} ${year}.`);
        return;
    }

    let msg = `▬▬▬▬▬  ${monthLabel} ${year} SCHEDULE ▬▬▬▬▬\n`;


    const sortedDays = Object.keys(allEvents).sort((a, b) => parseInt(a) - parseInt(b));

    sortedDays.forEach(day => {
        const dayEvents = allEvents[day];
        dayEvents.sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));

        dayEvents.forEach(event => {
            const dayPadded = day.toString().padStart(2, '0');
            msg += `◈ ${monthLabel} ${dayPadded} ─ ${event.name.toUpperCase()}\n`;
            
            const startUnix = Math.floor(new Date(event.startUtc).getTime() / 1000);
            const endUnix = Math.floor(new Date(event.endUtc).getTime() / 1000);
            
            // Main event time (Full date for clarity)
            msg += `<t:${startUnix}:F> ─ <t:${endUnix}:t>\n`;

            // Individual Host Shifts

            console.log(event.hostShifts);
            if (event.hostShifts && event.hostShifts.length > 0) {
                event.hostShifts.forEach(shift => {
                    const sStartUnix = ConvertToUnix(shift.startUtc);
                    const sEndUnix = ConvertToUnix(shift.endUtc);
                    
                    // Format: ╰┈➤ Role: Name (7:00 PM - 9:00 PM)
                    msg += `╰┈➤ **${shift.role}**: ${shift.host} (<t:${sStartUnix}:t> ─ <t:${sEndUnix}:t>)\n`;
                });
            }
            msg += `\n`;
        });
    });

    msg += `*Official Midnight Serenade Program*`;

    navigator.clipboard.writeText(msg).then(() => {
        alert("Discord Schedule (with Host Times) copied!");
    });
}