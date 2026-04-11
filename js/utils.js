function ConvertToUTC(year, month, day, hour = 0, minute = 0, second = 0) {
    return new Date(year, month, day, hour, minute, second).toUTCString();
}

function ConvertToLocal(utcString) {
    return new Date(utcString).toLocaleString();
}

function ConvertToLocalShort(utcString) {
    if (!utcString) return "";
    
    const timezone = document.getElementById('timezoneSelect')?.value || 'UTC';

    try {
        const date = new Date(utcString);
        // Check if the date is valid (Date objects return NaN for invalid strings)
        if (isNaN(date.getTime())) {
             return utcString; // Return as-is if it's already a short time string
        }

        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    } catch (e) {
        console.error("Timezone conversion error:", e);
        // Safer fallback: only try to substring if 'T' actually exists
        return utcString.includes('T') ? utcString.split('T')[1].substring(0, 5) : utcString;
    }
}

function ConvertToUnix(utcString) {
    return Math.floor(new Date(utcString).getTime() / 1000);
}

function ConvertToIso(utcString) {
    return new Date(utcString).toISOString();
}

const DB_KEY = 'midnight_serenade_events';

const EventDB = {
    storageKey: DB_KEY,

    // Load All: Returns the raw object
    all: function() {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : {};
    },

    // Save: Takes a date string (YYYY-MM-DD) and an Event instance
    save: function(dateKey, eventInstance) {
        const data = this.all();
        if (!data[dateKey]) data[dateKey] = [];
        
        data[dateKey].push(eventInstance.toJSON());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    },

    // Update: Uses this.all() instead of loadAll()
    update: function(dateKey, index, eventInstance) {
        const data = this.all();
        if (data[dateKey] && data[dateKey][index]) {
            data[dateKey][index] = eventInstance.toJSON();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    },

    // Delete: Added missing function
    delete: function(dateKey, index) {
        const data = this.all();
        if (data[dateKey]) {
            data[dateKey].splice(index, 1);
            // Clean up empty date keys
            if (data[dateKey].length === 0) delete data[dateKey];
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    },

    rehydrateShifts: function(rawShifts) {
        return (rawShifts || []).map(s => {
            // Check for all naming variations to prevent undefined
            const start = s.startUtc || s.startTimeUTC || s.start;
            const end = s.endUtc || s.endTimeUTC || s.end;
            return new HostShift(s.host, s.role, start, end);
        });
    },

getEventsForDate: function(dateKey) {
    const data = this.all();
    const rawEvents = data[dateKey] || [];
    
    return rawEvents.map(e => {
        const shifts = this.rehydrateShifts(e.hostShifts);

        // Support new + old schema
        const iconId = e.iconId ?? e.icon ?? 0;
        const specificIconPath = e.specificIconPath ?? null;

        return new Event(
            e.name,
            e.startUtc,
            e.endUtc,
            shifts,
            iconId,
            specificIconPath
        );
    });
},

    getEventsForMonth: function(year, month) {
        const data = this.all();
        const monthEvents = {};
        const monthPad = String(parseInt(month) + 1).padStart(2, '0'); 
        const prefix = `${year}-${monthPad}`;

        Object.keys(data).forEach(dateKey => {
            if (dateKey.startsWith(prefix)) {
                const day = dateKey.split('-')[2];
                // Reuse the standardized rehydration logic
                monthEvents[day] = this.getEventsForDate(dateKey);
            }
        });

        return monthEvents;
    },
};
