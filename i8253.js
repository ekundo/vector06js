"use strict";

function Counter() {
    this.latch_value = 0;    
    this.write_state = 0;
    this.latch_mode = 3;

    this.out = 1;
    this.value = 0;
    this.mode_int = 0;
    this.armed = false;

    this.write_lsb = 0;
    this.write_msb = 0;
    this.loadvalue = undefined;
    this.load = false;
    this.enabled = false;
    this.borrow = 0;

    this.SetMode(0);
}

const WRITE_DELAY = 8;
const LATCH_DELAY = 6;
const READ_DELAY = 0;

Counter.prototype.Latch = function(w8) {
    this.Count(LATCH_DELAY);
    this.borrow = LATCH_DELAY;
    this.latch_value = this.value;
};

Counter.prototype.SetMode = function(new_mode, new_latch_mode) {
    this.Count(WRITE_DELAY);
    this.borrow = WRITE_DELAY;

    if ((new_mode & 0x04) == 2) {
        this.mode_int = 2;
    } else if ((new_mode & 0x04) == 3) {
        this.mode_int = 3;
    } else {
        this.mode_int = new_mode;
    }

    switch(this.mode_int) {
        case 0:
            this.out = 0;
            this.armed = true;
            this.enabled = false;
            break;
        case 1:
            this.out = 1;
            this.enabled = false;
            this.armed = true;
            break;
        case 2:
            this.out = 1;
            this.enabled = false;
            break;
        default:
            this.out = 1;
            this.enabled = false;

            break;
    }
    this.load = false;
    this.latch_mode = new_latch_mode;
    this.write_state = 0;
};

Counter.prototype.write_value = function(w8) {
    this.Count(WRITE_DELAY);
    this.borrow = WRITE_DELAY;

    if (this.latch_mode == 3) {
        // lsb, msb             
        switch (this.write_state) {
            case 0:
                this.write_lsb = w8;
                this.write_state = 1;
                break;
            case 1:
                this.write_msb = w8;
                this.write_state = 0;
                this.loadvalue = ((this.write_msb << 8) & 0xffff) | (this.write_lsb & 0xff);
                this.load = true;
                break;
            default:
                break;
        }
    } else if (this.latch_mode == 1) {
        // lsb only
        this.value = (this.value & 0xff00) | w8;
        this.value &= 0xffff;
        this.loadvalue = this.value;
        this.load = true;
    } else if (this.latch_mode == 2) {
        // msb only 
        this.value = (this.value & 0x00ff) | (w8 << 8);
        this.value &= 0xffff;
        this.loadvalue = this.value;
        this.load = true;
    }
};

Counter.prototype.read_value = function() {
    this.Count(READ_DELAY);
    this.borrow = READ_DELAY;
    var value;
    switch (this.latch_mode) {
    case 0:
        // impossibru
        break;
    case 1:
        value = this.latch_value ? this.latch_value : this.value;
        this.latch_value = undefined; 
        return value & 0xff;
    case 2:
        value = this.latch_value ? this.latch_value : this.value;
        this.latch_value = undefined; 
        return (value >> 8) & 0xff;
    case 3:
        value = this.latch_value ? this.latch_value : this.value;
        switch(this.write_state) {
        case 0:
            this.write_state = 1;
            return value & 0xff;
        case 1:
            this.latch_value = undefined;
            this.write_state = 0;
            return (value >> 8) & 0xff;
        default:
            break;
        }
        break;
    default:
        break;
    }
    return 0; // impossible
};

Counter.prototype.Count = function(cycles) {
    if (this.borrow !== 0) {
        cycles -= this.borrow;
        if (cycles < 0) {
            this.borrow = -cycles;
            return this.out;
        } else {
            this.borrow = 0;
        }
    }
    switch (this.mode_int) {
        case 0: // Interrupt on terminal count
            if (this.load) {
                this.value = this.loadvalue;
                this.enabled = true;
                this.load = false;
            }
            if (this.enabled) {
                this.value -= cycles;
                if (this.value <= 0) {
                    this.value += 65535;
                    if (this.armed) {
                        this.out = 1;
                        this.armed = false;
                    }
                }
            }
            break;
        case 1: // Programmable one-shot
            if (!this.enabled && this.load) {
                //this.value = this.loadvalue; — quirk!
                this.enabled = true;
                cycles -= 3;
            }
            this.load = false;
            if (this.enabled && cycles > 0) {
                this.value -= cycles;
                if (this.value <= 0) {
                    this.value += this.loadvalue;
                }
            }

            break;
        case 2: // Rate generator
            if (!this.enabled && this.load) {
                this.value = this.loadvalue;
                this.enabled = true;
            }
            this.load = false;
            if (this.enabled && cycles > 0) {
                this.value -= cycles;
                if (this.value <= 0) {
                    this.value += this.loadvalue;
                }
            }
            // out will go low for one clock pulse but in our machine it should not be 
            // audible
            break;
        case 3: // Square wave generator
            if (!this.enabled && this.load) {
                this.value = this.loadvalue;
                this.enabled = true;

                // odd adjust immediately to make the main loop tighter
                if ((this.value & 1) == 1) {
                    this.value -= this.out === 0 ? 3 : 1;
                    --cycles;
                }
            }
            this.load = false;
            if (this.enabled) {
                if ((this.value -= cycles << 1) <= 0) {
                    this.value += this.loadvalue;
                    this.out ^= 1;
                    // odd adjust immediately to make the main loop tighter
                    if ((this.value & 1) == 1) {
                        this.value -= this.out === 0 ? 3 : 1;
                        this.borrow = 1;
                    }

                }
            }
            break;
        case 4: // Software triggered strobe
            break;
        case 5: // Hardware triggered strobe
            break;
        default:
            break;
    }

    return this.out;
};

function I8253() {
	this.counters = [new Counter(), new Counter(), new Counter()];
    this.control_word = 0;
}

I8253.prototype.write_cw = function(w8) {
	this.control_word = w8;

    var counter_set = (w8 >> 6) & 3;
    var mode_set = (w8 >> 1) & 3;
    var latch_set = (w8 >> 4) & 3;
    var bcd_set = (w8 & 1);

    var ctr = this.counters[counter_set];
	if (latch_set === 0) {
    	ctr.Latch(latch_set);
	} else {
		ctr.SetMode(mode_set, latch_set);
	}
};

I8253.prototype.Write = function(addr, w8) {
    switch (addr & 3) {
        case 0x03:
            return this.write_cw(w8);
        default:
            return this.counters[addr & 3].write_value(w8);
    }
};

I8253.prototype.Read = function(addr) {
    switch (addr & 3) {
        case 0x03:
            return this.control_word;
        default:
            return this.counters[addr & 3].read_value();
    }
};

I8253.prototype.Count = function(cycles) {
    return this.counters[0].Count(cycles) +
         this.counters[1].Count(cycles) +
         this.counters[2].Count(cycles);
};

function TimerWrapper(timer) {
    this.timer = timer;
    this.sound = 0;
    this.average_count = 0;
}

TimerWrapper.prototype.step = function(cycles) {
    this.sound += this.timer.Count(cycles);
    this.average_count += 8; // so that it's not too loud
};

TimerWrapper.prototype.unload = function() {
    var result = this.sound / this.average_count;
    this.sound = this.average_count = 0;
    return result;
};