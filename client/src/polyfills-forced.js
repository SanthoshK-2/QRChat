import { Buffer } from 'buffer';
import process from 'process';
import EventEmitter from 'events';

// Manually polyfill global objects for browser compatibility
if (typeof window !== 'undefined') {
    window.global = window;
    window.process = process;
    window.Buffer = Buffer;
    window.EventEmitter = EventEmitter;
    
    // Safety mock for process properties often accessed by libraries
    if (!window.process.version) window.process.version = '';
    if (!window.process.nextTick) window.process.nextTick = (cb) => setTimeout(cb, 0);
    if (!window.process.env) window.process.env = { NODE_DEBUG: false, NODE_ENV: 'production' };
}

// Ensure simple-peer can find these on 'global' if it looks there
if (typeof global !== 'undefined') {
    global.Buffer = Buffer;
    global.process = process;
}
