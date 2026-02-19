const { exec } = require('child_process');

const PORT = 5001;

function killPort(port) {
    if (process.platform === 'win32') {
        const command = `netstat -ano | findstr :${port}`;
        exec(command, (err, stdout, stderr) => {
            if (err || !stdout) {
                console.log(`Port ${port} is free.`);
                return;
            }

            const lines = stdout.trim().split('\n');
            const pids = new Set();
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid) && pid !== '0') {
                    pids.add(pid);
                }
            });

            if (pids.size === 0) {
                 console.log(`No active process found on port ${port}.`);
                 return;
            }

            pids.forEach(pid => {
                console.log(`Killing process ${pid} on port ${port}...`);
                exec(`taskkill /F /PID ${pid}`, (killErr) => {
                    if (killErr) {
                        // Ignore error if process is already gone
                        // console.error(`Failed to kill process ${pid}:`, killErr.message);
                    } else {
                        console.log(`Successfully killed process ${pid}.`);
                    }
                });
            });
        });
    } else {
        // Linux/Mac/Unix
        const command = `lsof -i :${port} -t`;
        exec(command, (err, stdout) => {
             if (err || !stdout) {
                console.log(`Port ${port} is free.`);
                return;
            }
            const pids = stdout.trim().split('\n');
            pids.forEach(pid => {
                 if (pid) {
                     console.log(`Killing process ${pid} on port ${port}...`);
                     exec(`kill -9 ${pid}`);
                 }
            });
        });
    }
}

killPort(PORT);
