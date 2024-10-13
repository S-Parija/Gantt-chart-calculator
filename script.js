function togglePriorityInput() {
    const algorithm = document.getElementById("algorithm").value;
    const priorityContainer = document.getElementById("priorityContainer");

    // Show or hide the priority input based on the selected algorithm
    if (algorithm.includes("Priority")) {
        priorityContainer.style.display = "block";
    } else {
        priorityContainer.style.display = "none";
    }
}

function generateGanttChart() {
    // Clear any previous errors
    document.getElementById("errorMessages").innerHTML = "";
    
    // Retrieve input values
    var processes = parseInt(document.getElementById("processes").value);
    var arrivalTimes = document.getElementById("arrivalTimes").value.trim();
    var burstTimes = document.getElementById("burstTimes").value.trim();
    var priorities = document.getElementById("priorities").value.trim();
    var algorithm = document.getElementById("algorithm").value;

    // Validate input values
    if (isNaN(processes) || processes <= 0) {
        displayError("Number of processes must be a positive integer.");
        return;
    }

    var arrivalArray = arrivalTimes.split(",").map(Number);
    var burstArray = burstTimes.split(",").map(Number);
    var priorityArray = algorithm.includes("Priority") ? priorities.split(",").map(Number) : [];

    if (arrivalArray.length !== processes || burstArray.length !== processes || (algorithm.includes("Priority") && priorityArray.length !== processes)) {
        displayError("Number of arrival times, burst times, and priorities must match the number of processes.");
        return;
    }

    for (var i = 0; i < processes; i++) {
        if (isNaN(arrivalArray[i]) || isNaN(burstArray[i]) || 
            (algorithm.includes("Priority") && isNaN(priorityArray[i])) || 
            arrivalArray[i] < 0 || burstArray[i] <= 0 || 
            (algorithm.includes("Priority") && priorityArray[i] <= 0))  {
            displayError("Arrival times, burst times, and priorities must be non-negative integers.");
            return;
        }
    }

    var completionTimes = [];
    var turnaroundTimes = [];
    var waitingTimes = [];
    var executionOrder = []; // Track execution order

    switch (algorithm) {
        case "FCFS":
            performFCFS(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
            break;
        case "SJF":
            performSJF(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
            break;
        case "SRTF":
            performSRTF(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
            break;
        case "RR":
            let timeQuantum = parseInt(prompt("Enter time quantum for Round Robin:"));
            if (isNaN(timeQuantum) || timeQuantum <= 0) {
                displayError("Time quantum must be a positive integer.");
                return;
            }
            performRR(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, timeQuantum, executionOrder);
            break;
        case "Non-Preemptive Priority":
            performNonPreemptivePriority(processes, arrivalArray, burstArray, priorityArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
            break;
        case "Preemptive Priority":
            performPreemptivePriority(processes, arrivalArray, burstArray, priorityArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
            break;
        default:
            displayError("Selected algorithm is not supported.");
            return;
    }

    displayResults(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder);
}

function performFCFS(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    let currentTime = 0;
    for (let i = 0; i < processes; i++) {
        if (currentTime < arrivalArray[i]) {
            currentTime = arrivalArray[i];
        }
        executionOrder.push({ process: i + 1, start: currentTime, end: currentTime + burstArray[i] });
        completionTimes[i] = currentTime + burstArray[i];
        currentTime += burstArray[i];
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function performSJF(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    let remainingProcesses = [...Array(processes).keys()];
    let currentTime = 0;

    while (remainingProcesses.length > 0) {
        let availableProcesses = remainingProcesses.filter(i => arrivalArray[i] <= currentTime);
        
        if (availableProcesses.length > 0) {
            let shortestProcess = availableProcesses.reduce((a, b) => burstArray[a] < burstArray[b] ? a : b);
            executionOrder.push({ process: shortestProcess + 1, start: currentTime, end: currentTime + burstArray[shortestProcess] });
            completionTimes[shortestProcess] = currentTime + burstArray[shortestProcess];
            currentTime += burstArray[shortestProcess];
            remainingProcesses = remainingProcesses.filter(i => i !== shortestProcess);
        } else {
            currentTime++;
        }
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function performSRTF(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    let remainingBurst = [...burstArray];
    let currentTime = 0;
    const complete = Array(processes).fill(false);
    let completed = 0;

    while (completed < processes) {
        let availableProcesses = remainingBurst.map((bt, index) => (arrivalArray[index] <= currentTime && !complete[index]) ? index : -1).filter(index => index !== -1);
        
        if (availableProcesses.length > 0) {
            let shortestProcess = availableProcesses.reduce((a, b) => remainingBurst[a] < remainingBurst[b] ? a : b);
            remainingBurst[shortestProcess]--;

            if (remainingBurst[shortestProcess] === 0) {
                completionTimes[shortestProcess] = currentTime + 1;
                executionOrder.push({ process: shortestProcess + 1, start: currentTime, end: currentTime + 1 });
                complete[shortestProcess] = true;
                completed++;
            }
        }
        currentTime++;
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function performRR(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, timeQuantum, executionOrder) {
    let remainingBurst = [...burstArray];
    let currentTime = 0;
    const complete = Array(processes).fill(false);
    let completed = 0;

    while (completed < processes) {
        let allProcesses = [...Array(processes).keys()];
        let availableProcesses = allProcesses.filter(i => arrivalArray[i] <= currentTime && !complete[i]);

        if (availableProcesses.length > 0) {
            for (let i of availableProcesses) {
                if (remainingBurst[i] > 0) {
                    let timeSlice = Math.min(timeQuantum, remainingBurst[i]);
                    executionOrder.push({ process: i + 1, start: currentTime, end: currentTime + timeSlice });
                    currentTime += timeSlice;
                    remainingBurst[i] -= timeSlice;

                    if (remainingBurst[i] === 0) {
                        completionTimes[i] = currentTime;
                        complete[i] = true;
                        completed++;
                    }
                }
            }
        } else {
            currentTime++;
        }
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function performNonPreemptivePriority(processes, arrivalArray, burstArray, priorityArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    let remainingProcesses = [...Array(processes).keys()];
    let currentTime = 0;

    while (remainingProcesses.length > 0) {
        let availableProcesses = remainingProcesses.filter(i => arrivalArray[i] <= currentTime);
        
        if (availableProcesses.length > 0) {
            let highestPriorityProcess = availableProcesses.reduce((a, b) => priorityArray[a] < priorityArray[b] ? a : b);
            executionOrder.push({ process: highestPriorityProcess + 1, start: currentTime, end: currentTime + burstArray[highestPriorityProcess] });
            completionTimes[highestPriorityProcess] = currentTime + burstArray[highestPriorityProcess];
            currentTime += burstArray[highestPriorityProcess];
            remainingProcesses = remainingProcesses.filter(i => i !== highestPriorityProcess);
        } else {
            currentTime++;
        }
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function performPreemptivePriority(processes, arrivalArray, burstArray, priorityArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    let remainingBurst = [...burstArray];
    let currentTime = 0;
    const complete = Array(processes).fill(false);
    let completed = 0;

    while (completed < processes) {
        let availableProcesses = remainingBurst.map((bt, index) => (arrivalArray[index] <= currentTime && !complete[index]) ? index : -1).filter(index => index !== -1);
        
        if (availableProcesses.length > 0) {
            let highestPriorityProcess = availableProcesses.reduce((a, b) => priorityArray[a] < priorityArray[b] ? a : b);
            remainingBurst[highestPriorityProcess]--;

            if (remainingBurst[highestPriorityProcess] === 0) {
                completionTimes[highestPriorityProcess] = currentTime + 1;
                executionOrder.push({ process: highestPriorityProcess + 1, start: currentTime, end: currentTime + 1 });
                complete[highestPriorityProcess] = true;
                completed++;
            }
        }
        currentTime++;
    }
    calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes);
}

function calculateTimes(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes) {
    for (let i = 0; i < processes; i++) {
        turnaroundTimes[i] = completionTimes[i] - arrivalArray[i];
        waitingTimes[i] = turnaroundTimes[i] - burstArray[i];
    }
}

function displayResults(processes, arrivalArray, burstArray, completionTimes, turnaroundTimes, waitingTimes, executionOrder) {
    const ganttChart = document.getElementById("ganttChart");
    ganttChart.innerHTML = "";

    // Create a table for displaying the Gantt chart
    let table = "<table><tr><th>Process</th><th>Completion Time</th><th>Turnaround Time</th><th>Waiting Time</th></tr>";
    for (let i = 0; i < processes; i++) {
        table += `<tr><td>P${i + 1}</td><td>${completionTimes[i]}</td><td>${turnaroundTimes[i]}</td><td>${waitingTimes[i]}</td></tr>`;
    }
    table += "</table>";

    // Display execution order
    let executionTable = "<h3>Execution Order</h3><table><tr><th>Process</th><th>Start Time</th><th>End Time</th></tr>";
    executionOrder.forEach(exec => {
        executionTable += `<tr><td>P${exec.process}</td><td>${exec.start}</td><td>${exec.end}</td></tr>`;
    });
    executionTable += "</table>";

    ganttChart.innerHTML = table + executionTable;
}

function displayError(message) {
    document.getElementById("errorMessages").innerHTML = `<div class="error">${message}</div>`;
}


function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}
