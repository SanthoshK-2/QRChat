import { Buffer } from 'buffer';
import process from 'process';

window.global = window;
window.process = process;
window.Buffer = Buffer;

// Fix for simple-peer which relies on 'global'
if (typeof global === 'undefined') {
  window.global = window;
}

