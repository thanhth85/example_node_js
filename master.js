// master.js (The Cluster Master)
//This is the main script you'll execute to start your application.
const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length; // Get the number of CPU cores

if (cluster.isMaster) {
    console.log(`[Master ${process.pid}] Master process is running.`);
    console.log(`[Master ${process.pid}] Forking ${numCPUs} worker processes...`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Listen for workers to come online
    cluster.on('online', (worker) => {
        console.log(`[Master ${process.pid}] Worker ${worker.process.pid} is online.`);
    });

    // Listen for workers to exit and respawn them for fault tolerance
    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[Master ${process.pid}] Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
        console.log(`[Master ${process.pid}] Starting a new worker...`);
        cluster.fork(); // Respawn a new worker
    });

    // --- Graceful Shutdown for the Master Process ---
    process.on('SIGTERM', () => {
        console.log(`[Master ${process.pid}] SIGTERM received. Shutting down all workers.`);
        let workersCount = Object.keys(cluster.workers).length;

        // Send shutdown message to each worker
        for (const id in cluster.workers) {
            cluster.workers[id].send('shutdown');
        }

        // Wait for all workers to exit
        const checkWorkersInterval = setInterval(() => {
            if (Object.keys(cluster.workers).length === 0) {
                clearInterval(checkWorkersInterval);
                console.log(`[Master ${process.pid}] All workers terminated. Master exiting.`);
                process.exit(0);
            }
        }, 500); // Check every 500ms

        // Optional: Force shutdown after a timeout if workers don't exit gracefully
        setTimeout(() => {
            if (Object.keys(cluster.workers).length > 0) {
                console.warn(`[Master ${process.pid}] Forcefully terminating remaining workers.`);
                for (const id in cluster.workers) {
                    cluster.workers[id].kill(); // Force kill
                }
                process.exit(1);
            }
        }, 15000); // 15 seconds timeout for all workers to shut down
    });

} else {
    // If not the master, this is a worker process.
    // Execute the cluster worker script which sets up Express and Piscina.
    require('./cluster_worker.js');
}