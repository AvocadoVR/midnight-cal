class HostShift {
    constructor(host, role, startUtc, endUtc) {
        this.host = host;
        this.role = role;
        this.startUtc = startUtc; // UTC string
        this.endUtc = endUtc;     // UTC string
    }

    toObject() {
        return {
            host: this.host,
            role: this.role,
            startUtc: this.startUtc,
            endUtc: this.endUtc
        };
    }
}