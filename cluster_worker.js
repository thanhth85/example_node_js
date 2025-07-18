// cluster_worker.js (The Express Server with Piscina)
//This script will be executed by each cluster worker. It sets up an Express server and uses Piscina for CPU-bound tasks
const express = require('express');
const cluster = require('cluster'); // Used for logging PID
const os = require('os');
const Piscina = require('piscina'); // Import Piscina

// Initialize Piscina worker pool for this cluster worker process
// It's common to have as many worker_threads as CPU cores within each cluster worker
// or a smaller number based on the nature of your CPU-bound tasks.
const piscina = new Piscina({
    filename: require.resolve('./cpu_intensive_task.js'), // Path to your worker thread script
    minThreads: os.cpus().length, // Keep a minimum number of threads alive
    maxThreads: os.cpus().length * 2, // Allow scaling up to double the CPU cores if needed
    idleTimeout: 30000, // Terminate idle threads after 30 seconds
    maxQueue: 1000 // Max tasks to queue before rejecting
});

const app = express();
const PORT = 3000;

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`[Cluster Worker ${process.pid}] ${req.method} ${req.url}`);
    next();
});

// --- Express Routes ---

// 1. Simple I/O-bound route (handled directly by this cluster worker's main thread)
app.get('/', (req, res) => {
    res.send(`Hello from Cluster Worker ${process.pid}! (I/O-bound task handled directly)\n`);
});

// 2. CPU-bound route (offloaded to Piscina worker pool)
app.get('/fibonacci/:n', async (req, res) => {
    const n = parseInt(req.params.n, 10);

    if (isNaN(n) || n < 0) {
        return res.status(400).send('Please provide a valid positive number for Fibonacci.\n');
    }

    console.log(`[Cluster Worker ${process.pid}] Offloading Fibonacci(${n}) to Piscina...`);

    try {
        // Submit the task to the Piscina pool
        // The data object will be passed to the 'cpu_intensive_task.js' module.exports function
        const result = await piscina.run({
            number: n,
            requestId: Date.now(), // Simple unique ID for tracing
            workerPid: process.pid // Pass the cluster worker's PID for logging in Piscina worker
        });

        res.send(`Fibonacci(${n}) = ${result} (Processed by Cluster Worker ${process.pid} via Piscina)\n`);
    } catch (error) {
        console.error(`[Cluster Worker ${process.pid}] Error processing Fibonacci(${n}) with Piscina:`, error);
        res.status(500).send(`Error processing Fibonacci: ${error.message}\n`);
    }
});

// Start the Express server
const server = app.listen(PORT, () => {
    console.log(`[Cluster Worker ${process.pid}] Express server listening on port ${PORT}`);
});

// --- Graceful Shutdown for Cluster Worker ---
// This is crucial to ensure Piscina workers are terminated when a cluster worker shuts down.

// Listen for SIGTERM (e.g., from `kill` command or orchestrator)
process.on('SIGTERM', async () => {
    console.log(`[Cluster Worker ${process.pid}] SIGTERM received. Initiating graceful shutdown.`);
    await shutdown();
});

// Listen for 'message' from master process (e.g., master sending 'shutdown')
process.on('message', async (msg) => {
    if (msg === 'shutdown') {
        console.log(`[Cluster Worker ${process.pid}] Master requested shutdown. Initiating graceful shutdown.`);
        await shutdown();
    }
});

async function shutdown() {
    // 1. Close the HTTP server (stop accepting new connections)
    server.close(async () => {
        console.log(`[Cluster Worker ${process.pid}] HTTP server closed.`);
        // 2. Terminate the Piscina worker pool
        await piscina.destroy();
        console.log(`[Cluster Worker ${process.pid}] Piscina pool destroyed.`);
        // 3. Exit the cluster worker process
        process.exit(0);
    });

    // Optional: Add a timeout if server.close() takes too long
    setTimeout(() => {
        console.warn(`[Cluster Worker ${process.pid}] Forcefully shutting down after timeout.`);
        process.exit(1);
    }, 10000); // 10 seconds timeout
}