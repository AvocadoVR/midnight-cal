class Event {
    constructor(name, startUtc, endUtc, hostShifts = [], iconId, specificIconPath) {
        this.name = name;
        this.startUtc = startUtc; 
        this.endUtc = endUtc;
        this.hostShifts = hostShifts;
        this.iconId = iconId;
        this.specificIconPath = specificIconPath;
    }

    // Returns object with local strings for both start and end
    getLocal() {
        return {
            start: ConvertToLocal(this.startUtc),
            end: ConvertToLocal(this.endUtc)
        };
    }

    getLocalShort() {
        return {
            start: ConvertToLocalShort(this.startUtc),
            end: ConvertToLocalShort(this.endUtc)
        };
    }

    // Returns object with Unix timestamps
    getUnix() {
        return {
            start: ConvertToUnix(this.startUtc),
            end: ConvertToUnix(this.endUtc)
        };
    }

    // Returns object with ISO strings
    getIso() {
        return {
            start: ConvertToIso(this.startUtc),
            end: ConvertToIso(this.endUtc)
        };
    }

    getIconPath() {
        if (this.specificIconPath) return this.specificIconPath;

        const cfg = window.SYSTEM_CONFIG.icons[this.iconId] 
                 || window.SYSTEM_CONFIG.icons[0];

        return cfg.file;
    }

    toJSON() {
        return {
            name: this.name,
            startUtc: this.startUtc,
            endUtc: this.endUtc,
            iconId: this.iconId,
            specificIconPath: this.specificIconPath,
            hostShifts: this.hostShifts.map(shift => 
                typeof shift.toObject === 'function' ? shift.toObject() : shift
            )
        };
    }
}