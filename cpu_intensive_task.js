// cpu_intensive_task.js  (The CPU-Intensive Worker Thread)
//This file will contain the function that performs the heavy computation. Piscina will load and manage instances of this script.
// This script will be run by Piscina's worker threads.

// A CPU-intensive function (e.g., calculating the Nth Fibonacci number)
function calculateFibonacci(n) {
    if (n <= 1) {
        return n;
    }
    let a = 0, b = 1, temp;
    for (let i = 2; i <= n; i++) {
        temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// Piscina expects a function that takes data and returns a Promise or a value.
// The `data` argument will be whatever is passed to `piscina.run()`.
module.exports = async (data) => {
    const { number, requestId, workerPid } = data; // Destructure data from the main thread

    console.log(`[Piscina Worker ${process.pid}:${process.threadId}] Starting Fibonacci(${number}) for Req ID: ${requestId} from Cluster Worker PID: ${workerPid}`);

    // Perform the CPU-intensive calculation
    const result = calculateFibonacci(number);

    console.log(`[Piscina Worker ${process.pid}:${process.threadId}] Finished Fibonacci(${number}). Result: ${result}`);

    // Return the result. Piscina will send this back to the caller.
    return result;
};