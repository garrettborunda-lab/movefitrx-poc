/**
 * CRITICAL INSTRUCTION: This script is a STABLE, PUBLICLY DEPLOYABLE DEMO.
 * It strictly adheres to the NO FIREBASE/Database SDKs rule.
 * All data operations (Referral, Payment Status Lookup, RWE results)
 * occur exclusively on local JavaScript arrays in memory.
 * * FLOW FIX: Implemented Local Polling/Observer functions (startPatientListObserver, 
 * startPatientResultObserver) to keep the UI in sync with local data, 
 * replacing the functionality of Firebase's onSnapshot.
 * * UPDATE:
 * 1. Fixed broken payment button in Patient Portal (missing arguments to switchTab).
 * 2. Fixed broken Clinician Progress view (blank page on click) and restored functionality.
 * 3. Added Regimen Steps and Completed status to the Clinician Progress view.
 */

// --- CORE DATA MODELS (Local Mock Data) ---
const CLINICIAN_DETAILS = {
    name: 'Dr. Jane Foster, MD',
    clinic: 'MoveFitRx Clinical Group',
    phone: '(555) 123-4567',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
};

const GYM_DETAILS = {
    name: 'Coronado Fitness Club',
    address: '875 Orange Ave suite 101, Coronado, CA 92118',
    website: 'https://www.coronadofitnessclub.com/',
};

const DIAGNOSES = [
    { id: 'SMT', name: 'Symptomatic Menopausal Transition', regimen: 'Hormonal Balance & Strength', code: 'E89.0' },
    { id: 'PHRM', name: 'Postmenopausal Health/Risk Management', regimen: 'Cardio Endurance & Insulin Sensitivity', code: 'Z00.00' },
    { id: 'OSTP', name: 'Osteopenia', regimen: 'Bone Density & Balance', code: 'M85.8' },
    { id: 'OSTE', name: 'Osteoporosis', regimen: 'Bone Density & Balance', code: 'M81.0' },
    { id: 'PCOS', name: 'PCOS', regimen: 'Cardio Endurance & Insulin Sensitivity', code: 'E28.2' },
    { id: 'HYPT', name: 'Hypertension', regimen: 'Cardio Vascular Health', code: 'I10' }, 
];

const WORKOUT_DETAILS = {
    'Hormonal Balance & Strength': {
        url: 'https://movefitrx.com/regimen/hormonal-strength',
        // Total of 3 distinct workout steps for regimen calculation
        totalSteps: 3, 
        steps: [
            { machine: 'Recumbent Bike', activity: 'Low Intensity Cardio 25 min', matrixWorkoutId: 'MXW-HRM-01' },
            { machine: 'Leg Press', activity: '3 Sets x 12 Reps', matrixWorkoutId: 'MXW-HRM-02' },
            { machine: 'Diverging Seated Row', activity: '3 Sets x 10 Reps', matrixWorkoutId: 'MXW-HRM-03' },
        ]
    },
    'Bone Density & Balance': {
        url: 'https://movefitrx.com/regimen/bone-density',
        totalSteps: 3,
        steps: [
            { machine: 'Treadmill', activity: 'Brisk Walk w/ Low Incline 30 min', matrixWorkoutId: 'MXW-BND-01' },
            { machine: 'Calf Extension', activity: '3 Sets x 15 Reps (Light)', matrixWorkoutId: 'MXW-BND-02' },
            { machine: 'Hip Adductor', activity: '3 Sets x 12 Reps', matrixWorkoutId: 'MXW-BND-03' },
        ]
    },
    'Cardio Endurance & Insulin Sensitivity': {
        url: 'https://movefitrx.com/regimen/cardio-insulin',
        totalSteps: 2,
        steps: [
            { machine: 'Ascent Trainer', activity: 'Steady State 45 min', matrixWorkoutId: 'MXW-CDI-01' },
            { machine: 'Pec Fly', activity: '3 Sets x 15 Reps (Circuit)', matrixWorkoutId: 'MXW-CDI-02' },
        ]
    },
    'Cardio Vascular Health': { 
        url: 'https://movefitrx.com/regimen/cardio-vascular-health',
        totalSteps: 2,
        steps: [
            { machine: 'Treadmill', activity: 'Aerobic Walk 40 min (Target HR: 110-130)', matrixWorkoutId: 'MXW-CVH-01' },
            { machine: 'Seated Leg Curl', activity: '2 Sets x 15 Reps (Low Resistance)', matrixWorkoutId: 'MXW-CVH-02' },
        ]
    },
};

// Global Mock Data Arrays - **Synthetic, Local Data Layer**
let MOCK_CREDENTIALS = [
    { matrixId: 'MFRX-AB001', gymAccessCode: '205101', used: false },
    { matrixId: 'MFRX-CD002', gymAccessCode: '205102', used: false },
    { matrixId: 'MFRX-EF003', gymAccessCode: '205103', used: false },
    { matrixId: 'MFRX-GH004', gymAccessCode: '205104', used: false },
    { matrixId: 'MFRX-IJ005', gymAccessCode: '205105', used: false },
    { matrixId: 'MFRX-KL006', gymAccessCode: '205106', used: false },
    { matrixId: 'MFRX-MN007', gymAccessCode: '205107', used: false },
    { matrixId: 'MFRX-OP008', gymAccessCode: '205108', used: false },
    { matrixId: 'MFRX-QR009', gymAccessCode: '205109', used: false },
    { matrixId: 'MFRX-ST010', gymAccessCode: '205110', used: false },
];
let REFERRED_PATIENTS = []; 
let PATIENT_RESULTS = []; 
let PENDING_PATIENT_DATA = null; 

// --- OBSERVER STATE ---
let CURRENT_DOCTOR_PROGRESS_MATRIX_ID = null;

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);

/**
 * Generates a mock date in the past 7 days for adherence simulation.
 * @returns {Date} A mock past date.
 */
function getMockPastDate() {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, 6)); 
    d.setHours(randomInt(9, 17));
    d.setMinutes(randomInt(0, 59));
    return d;
}

/**
 * Converts a Date object (or timestamp/string) to a readable date/time string.
 */
const getFormattedDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Finds the first unused credential and marks it as used in the local array.
 */
function getAndMarkAvailableCredential() {
    const credential = MOCK_CREDENTIALS.find(c => !c.used);
    if (credential) {
        credential.used = true; // Mark as used
        return credential;
    }
    return null;
}

/**
 * Finds a patient in the local REFERRED_PATIENTS array.
 */
function getPatientByMatrixId(matrixId) {
    return REFERRED_PATIENTS.find(p => p.matrixId === matrixId) || null;
}

/**
 * Determines the current status of the patient for the Clinician Portal display.
 * @param {string} matrixId 
 * @param {string} currentStatus 
 * @returns {string} The updated status string.
 */
function getPatientDisplayStatus(matrixId, currentStatus) {
    if (currentStatus === 'PAID') {
        const results = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId);
        if (results.length > 0) {
            return 'EXERCISE_IN_PROGRESS';
        }
        return 'SIGNUP_COMPLETE';
    }
    return 'PENDING_PAYMENT';
}

/**
 * Calculates the percentage completion of the entire 12-week regimen.
 * Assumes 3 required workouts per week * 12 weeks = 36 total required workouts.
 * @param {string} matrixId 
 * @returns {number} Percentage from 0 to 100.
 */
function calculateRegimenCompletion(matrixId) {
    const totalRequiredWorkouts = 36; 
    const completedWorkouts = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId).length;
    
    // Cap percentage at 100%
    const percentage = Math.min(100, (completedWorkouts / totalRequiredWorkouts) * 100);
    return Math.round(percentage);
}

// --- FLOW FIX: LOCAL OBSERVER FUNCTIONS ---

let listObserverInterval = null;
let resultObserverInterval = null;

/**
 * Starts an observer that periodically re-renders the main patient list 
 * in the Clinician Portal to reflect status changes (e.g., payment complete, RWE start).
 */
function startPatientListObserver() {
    // Clear existing interval to avoid duplicates
    if (listObserverInterval) clearInterval(listObserverInterval); 

    // Re-render every 1 second (mimicking real-time update speed)
    listObserverInterval = setInterval(() => {
        // Only re-render if the doctor panel is currently active
        if (document.getElementById('doctor-panel').classList.contains('active') && 
            document.getElementById('doctor-progress').classList.contains('hidden')) {
            renderDoctorPatientList();
        }
    }, 1000);
}

/**
 * Starts an observer that periodically re-renders the detailed progress view 
 * for a specific patient to reflect new RWE results.
 */
function startPatientResultObserver(matrixId) {
    if (resultObserverInterval) clearInterval(resultObserverInterval); 
    CURRENT_DOCTOR_PROGRESS_MATRIX_ID = matrixId;

    resultObserverInterval = setInterval(() => {
        // Only re-render if the patient's progress view is currently active
        if (!document.getElementById('doctor-progress').classList.contains('hidden') && 
            CURRENT_DOCTOR_PROGRESS_MATRIX_ID === matrixId) {
            
            // Re-render both progress display and RWE results
            renderDoctorProgressDisplay(matrixId); 
            renderDoctorRweData(matrixId); 
        }
    }, 1000);
}

/**
 * Stops all observation intervals when switching away from the Doctor Portal.
 */
function stopAllObservers() {
    if (listObserverInterval) clearInterval(listObserverInterval);
    if (resultObserverInterval) clearInterval(resultObserverInterval);
    CURRENT_DOCTOR_PROGRESS_MATRIX_ID = null;
}

// --- MODAL HANDLERS ---

function closeClinicianNotificationModal() {
    document.getElementById('clinician-notification-modal').classList.add('hidden');
}

window.closeLMNModal = () => {
    document.getElementById('lmn-modal').classList.add('hidden');
}

window.closePatientWelcomeModal = () => {
    document.getElementById('patient-welcome-modal').classList.add('hidden');
}

// --- REFERRAL FLOW (Clinician Portal) ---

/**
 * Generates the content for the Letter of Medical Necessity (LMN).
 * Language is focused on the reimbursable MoveFitRx Program/Service.
 */
function generateLMNContent(patient, diagnosis) {
    const template = `To Whom It May Concern:

**Subject: Letter of Medical Necessity for Structured Exercise Prescription (MoveFitRx)**

Date: {{date}}

To Whom It May Concern:

This letter confirms that **{{patient_name}}** is under my care and has been diagnosed with the following condition:

**Primary Diagnosis:** {{diagnosis}} (ICD-10 Code: {{diagnosis_code}})

### Medical Necessity
Due to the patient's condition, a structured, medically necessary exercise regimen is required to mitigate symptoms, prevent disease progression, and improve overall health markers.

The prescribed program, **MoveFitRx**, is a certified physical therapy and corrective exercise intervention focusing on **{{regimen_name}}** (Regimen Code: {{matrix_id}}). This specific regimen is mandatory for managing the patient's diagnosed condition and cannot be achieved through general fitness programs. The exercise is delivered using specialized, clinically monitored equipment which provides Real-World Evidence (RWE) required for clinical oversight and tracking of adherence to the physician's prescription.

### Prescription Details
* **Referring Provider (Type 1 NPI):** {{doctor_name}}
* **Provider NPI (Type 1 - Referring):** 9876543210 (Mock NPI)
* **Prescribing Service (Type 2 NPI):** MoveFitRx Program/Service
* **Provider NPI (Type 2 - Prescribing Service):** 1234567890 (Mock NPI)
* **Prescription:** Structured exercise regimen, 3x per week for 12 weeks.

### Reimbursement Request
I have determined that participation in the MoveFitRx program—including the prescribed regimen, RWE tracking, and data reporting—is medically necessary for the treatment of **{{diagnosis}}**.

Please consider this letter a formal request to approve reimbursement for the necessary **MoveFitRx Program/Service** costs under the patient’s Health Savings Account (HSA) or Flexible Spending Account (FSA).

If you require any further documentation, please contact me at {{doctor_phone}}.

Sincerely,

{{doctor_name}}
{{clinic_name}}`;
    
    return template
        .replace('{{date}}', CLINICIAN_DETAILS.date)
        .replace('{{patient_name}}', patient.name)
        .replace(/{{diagnosis}}/g, diagnosis?.name || 'N/A')
        .replace('{{diagnosis_code}}', diagnosis?.code || 'N/A')
        .replace(/{{doctor_name}}/g, CLINICIAN_DETAILS.name)
        .replace('{{doctor_phone}}', CLINICIAN_DETAILS.phone)
        .replace('{{clinic_name}}', CLINICIAN_DETAILS.clinic)
        .replace('{{regimen_name}}', patient.regimenName)
        .replace('{{matrix_id}}', patient.matrixId);
}

window.openLMNModal = (patient, diagnosis) => {
    const lmnContent = generateLMNContent(patient, diagnosis);
    
    // Simple Markdown rendering for the modal for display
    let formattedContent = lmnContent
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    if (!formattedContent.startsWith('<h3>')) {
            formattedContent = `<p>${formattedContent}</p>`;
    } else {
        // Remove rogue line breaks after header
            formattedContent = formattedContent.replace(/<br>/g, '');
    }

    document.getElementById('lmn-content-display').innerHTML = formattedContent;
    document.getElementById('lmn-modal').classList.remove('hidden');
}

/**
 * Handles the successful referral completion, updates the UI, and triggers the welcome modal.
 */
function handleReferralComplete(name, patientData, isSuccess) {
    document.getElementById('clinician-notification-modal').classList.add('hidden');

    if (isSuccess) {
        document.getElementById('referral-status').textContent = `Success! Patient ${name} referred. Status: PENDING PAYMENT.`;
        document.getElementById('referral-status').className = 'text-green-600 mt-2';
        PENDING_PATIENT_DATA = patientData; // Save for patient welcome modal
        
        // Auto-switch to patient view and show the simulated email
        switchTab('patient');
    } else {
        document.getElementById('referral-status').textContent = `Failure: Referral failed.`;
        document.getElementById('referral-status').className = 'text-red-600 mt-2';
    }
}

/**
 * Handles the patient referral form submission using local array operations.
 */
function handleReferral(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const diagnosisId = form.diagnosis.value;
    
    const submitButton = document.getElementById('submit-referral');
    submitButton.disabled = true;
    submitButton.textContent = 'Acquiring Credentials...';
    
    // 1. Get the next available credential from the local array
    const credential = getAndMarkAvailableCredential();

    if (!credential) {
        document.getElementById('referral-status').textContent = `Failure: No available Matrix/Gym credentials.`;
        document.getElementById('referral-status').className = 'text-red-600 mt-2';
        submitButton.disabled = false;
        submitButton.textContent = 'Refer Patient';
        return;
    }
    
    const diagnosis = DIAGNOSES.find(d => d.id === diagnosisId);
    
    submitButton.textContent = 'Submitting Referral...';

    // 2. Create the patient record and add it to the local array
    const patientData = {
        name,
        email,
        diagnosisId,
        regimenName: diagnosis.regimen,
        matrixId: credential.matrixId,
        gymAccessCode: credential.gymAccessCode,
        status: 'PENDING_PAYMENT',
        createdAt: Date.now(), // Use standard timestamp
    };
    REFERRED_PATIENTS.unshift(patientData); // Add to the start for visibility
    
    form.reset();
    
    // Refresh the patient list display immediately (will be handled by observer, but faster to call directly)
    renderDoctorPatientList();

    // Show success modal
    showClinicianNotification({ name, matrixId: patientData.matrixId });

    // Reset button state after success flow starts
    submitButton.disabled = false;
    submitButton.textContent = 'Refer Patient';
}

/**
 * Shows a modal notification to the clinician after a successful referral.
 */
function showClinicianNotification(patient) {
    const modalEl = document.getElementById('clinician-notification-modal');
    const contentEl = document.getElementById('clinician-notification-content');
    
    contentEl.innerHTML = `
        <div class="p-6">
            <h3 class="text-2xl font-extrabold text-green-700 mb-4 flex items-center">
                <i class="fas fa-check-circle mr-3 text-green-500"></i> Referral Completed!
            </h3>
            <p class="text-gray-700 mb-4">
                The exercise prescription invitation has been successfully sent to <strong>${patient.name}</strong> (${patient.matrixId}).
            </p>
            
            <div class="bg-gray-50 p-4 rounded-lg space-y-3 shadow-inner">
                <p class="font-semibold text-sm text-gray-700">Next Step:</p>
                <p class="text-sm text-gray-600">The patient must use their unique ID to log in on the <strong>Patient Portal</strong> and complete the payment process.</p>
            </div>
        </div>
    `;
    // Pass the actual patient object instead of PENDING_PATIENT_DATA (which might be stale if multiple referrals happen fast)
    const patientObj = getPatientByMatrixId(patient.matrixId); 
    document.getElementById('close-clinician-notification-btn').onclick = () => handleReferralComplete(patient.name, patientObj, true);
    modalEl.classList.remove('hidden');
}

/**
 * Renders the list of referred patients in the clinician portal.
 */
function renderDoctorPatientList() {
    const patientsListEl = document.getElementById('patients-list');
    
    // Prevent re-rendering if data hasn't changed (simple check)
    const currentRenderedHtml = patientsListEl.innerHTML.trim();
    if (REFERRED_PATIENTS.length === 0 && currentRenderedHtml.includes('No patients referred yet')) return;

    patientsListEl.innerHTML = '';
    
    if (REFERRED_PATIENTS.length === 0) {
        patientsListEl.innerHTML = '<p class="text-gray-500">No patients referred yet.</p>';
        return;
    }
    
    const newHtml = REFERRED_PATIENTS
        .slice() 
        .sort((a, b) => b.createdAt - a.createdAt) 
        .map((patient) => {
            const diagnosisName = DIAGNOSES.find(d => d.id === patient.diagnosisId)?.name || 'N/A';
            
            // Calculate current status
            const statusKey = getPatientDisplayStatus(patient.matrixId, patient.status);
            
            let statusClass, statusText;
            if (statusKey === 'EXERCISE_IN_PROGRESS') {
                statusClass = 'border-blue-500';
                statusText = 'EXERCISE REGIMEN IN PROGRESS';
            } else if (statusKey === 'SIGNUP_COMPLETE') {
                statusClass = 'border-green-500';
                statusText = 'SIGNUP COMPLETE';
            } else {
                statusClass = 'border-yellow-500';
                statusText = 'SIGNUP PENDING';
            }

            // Must use JSON.stringify and escape for passing objects to inline handlers
            const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
            
            const percentage = calculateRegimenCompletion(patient.matrixId);

            return `
                <div class="card bg-white border-l-4 ${statusClass} cursor-pointer hover:bg-gray-50" 
                     onclick="showDoctorProgress(${patientJson})">
                    <p class="text-lg font-semibold">${patient.name}</p>
                    <p class="text-sm text-gray-600">DX: ${diagnosisName}</p>
                    <p class="text-xs font-bold ${statusKey === 'EXERCISE_IN_PROGRESS' ? 'text-blue-600' : (statusKey === 'SIGNUP_COMPLETE' ? 'text-green-600' : 'text-yellow-600')}">${statusText}</p>
                    <p class="text-xs text-gray-400">ID: ${patient.matrixId}</p>
                    ${statusKey === 'EXERCISE_IN_PROGRESS' ? 
                        `<p class="text-xs font-semibold mt-2 text-gray-700">Regimen Complete: ${percentage}%</p>
                        <div class="progress-container">
                            <div class="progress-bar-fill" style="width: ${percentage}%">
                                ${percentage > 5 ? `<span class="progress-text">${percentage}%</span>` : ''}
                            </div>
                        </div>` 
                        : ''}
                </div>
            `;
        }).join('');
    
    patientsListEl.innerHTML = newHtml;
}

/**
 * Sets up the clinician portal UI and starts the list observer.
 */
function setupDoctorPortal() {
    const diagnosisSelect = document.getElementById('diagnosis-select');
    
    if (diagnosisSelect) {
        diagnosisSelect.innerHTML = DIAGNOSES.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    document.getElementById('referral-form').addEventListener('submit', handleReferral);
    
    // Start observing the patient list data for changes
    startPatientListObserver(); 
    
    // Initial render of the patient list
    renderDoctorPatientList();
}


// --- PATIENT PORTAL FUNCTIONS ---

/**
 * Simulates a successful payment by updating the patient status in the local array.
 */
function processPaymentSimulation(patientMatrixId) {
    const patient = REFERRED_PATIENTS.find(p => p.matrixId === patientMatrixId);
    
    if (patient && patient.status === 'PENDING_PAYMENT') {
        patient.status = 'PAID';
        patient.paidAt = Date.now();
        
        // Immediately trigger a UI refresh for both portals
        renderDoctorPatientList(); // Force list refresh in case we're on doctor tab
        return true;
    }
    return false;
}

/**
 * Shows a modal simulating the welcome email the patient receives.
 */
function showPatientWelcomeModal(patient) {
    const modalEl = document.getElementById('patient-welcome-modal');
    const contentEl = document.getElementById('patient-welcome-content');

    contentEl.innerHTML = `
        <div class="p-6 welcome-email-card rounded-xl">
            <h3 class="text-2xl font-extrabold text-blue-700 mb-4 flex items-center">
                <i class="fas fa-envelope mr-3 text-blue-500"></i> Welcome to MoveFitRx!
            </h3>
            <p class="text-gray-700 mb-3">
                Dear ${patient.name},
            </p>
            <p class="text-gray-700 mb-4">
                Your clinician, ${CLINICIAN_DETAILS.name}, has prescribed your movement program. Please use the unique <strong>Invitation Code</strong> below to access your personal prescription portal and complete your sign up.
            </p>
            
            <div class="bg-blue-100 p-4 rounded-lg space-y-3 border border-blue-300">
                <p class="font-semibold text-sm text-blue-800">Your Unique Invitation Code:</p>
                <div class="code-display text-2xl font-extrabold text-blue-700 bg-blue-50">${patient.matrixId}</div>
                <p class="text-xs text-gray-600">Use this code to log in on the Patient Portal.</p>
            </div>

            <p class="text-xs text-gray-500 mt-4">
                This is a simulated email notification.
            </p>
        </div>
    `;
    modalEl.classList.remove('hidden');
    PENDING_PATIENT_DATA = null; // Clear data once shown
    // Auto-populate the input field after showing the welcome email
    document.getElementById('matrix-id-input').value = patient.matrixId;
}

/**
 * Handles patient login using their unique Matrix ID.
 * FLOW FIX: Forces a re-render of the patient data every time, ensuring the latest status is shown.
 */
function handlePatientLogin(e) {
    if (e) e.preventDefault();
    
    const inputMatrixId = document.getElementById('matrix-id-input').value.trim().toUpperCase();
    
    if (!inputMatrixId) {
        document.getElementById('patient-status').textContent = 'Please enter your Invitation Code.';
        document.getElementById('patient-status').className = 'text-red-600 mt-2';
        return;
    }

    const patientDataEl = document.getElementById('patient-data');
    const patientStatusEl = document.getElementById('patient-status');
    
    patientStatusEl.textContent = 'Searching...';
    patientDataEl.classList.add('hidden');
    closePatientWelcomeModal();

    const patient = getPatientByMatrixId(inputMatrixId);

    if (!patient) {
        patientStatusEl.textContent = 'Invitation Code not found. Please check the code.';
        patientStatusEl.className = 'text-red-600 mt-2';
        return;
    }
    
    const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
    
    patientStatusEl.textContent = `Welcome, ${patient.name}.`;
    patientStatusEl.className = 'text-green-600 mt-2';
    patientDataEl.classList.remove('hidden');
    
    // Always render the latest patient data based on their status (PAID/PENDING)
    renderPatientData(patient, diagnosis); 
}

/**
 * Simulates the Matrix equipment pushing workout data to the local RWE array.
 */
function handleSimulatePush(e) {
    const button = e.target.closest('.simulate-push-btn');
    const patientMatrixId = button.dataset.patientId;
    const exercise = button.dataset.exercise;
    const machine = button.dataset.machine;
    
    if (!patientMatrixId) return;

    button.disabled = true;
    button.textContent = 'Pushing Data...';
    
    // Generate mock metrics based on exercise type
    let metrics;
    if (exercise.includes('min') || exercise.includes('Walk')) {
        const distance = randomFloat(1.0, 3.5);
        const avgHR = randomInt(120, 155);
        metrics = `Distance: ${distance} mi, Avg HR: ${avgHR} BPM`;
    } else if (exercise.includes('Sets')) {
        const weight = randomInt(20, 80);
        const sets = parseInt(exercise.split('Sets')[0].trim());
        const reps = parseInt(exercise.split('x')[1].trim().split('Rep')[0]);
        const totalVolume = weight * sets * reps;
        metrics = `Weight: ${weight} lbs, Total Volume: ${totalVolume} lbs`;
    } else {
        metrics = 'Metrics: Completed successfully';
    }

    const mockResultPayload = {
        patientMatrixId: patientMatrixId,
        machine: machine,
        exercise: exercise,
        metrics: metrics,
        completedAt: Date.now(),
        dataSource: 'Matrix-Validated-Result'
    };
    
    // Add the workout result to the local results array
    PATIENT_RESULTS.unshift(mockResultPayload); // Add to the start
    
    // Re-render the patient's prescription/history view immediately
    const patient = getPatientByMatrixId(patientMatrixId);
    if (patient) {
        const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
        // Rerender the whole view to ensure history and button state update
        renderPatientData(patient, diagnosis);
    }
    
    // Status update only for the specific button
    button.textContent = 'Data Pushed Successfully!';
    button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    button.classList.add('bg-green-500');
    
    // Reset button state after a delay
    setTimeout(() => {
        button.disabled = false;
        button.textContent = 'TRIGGER WORKOUT DATA PUSH';
        button.classList.remove('bg-green-500', 'bg-red-500');
        button.classList.add('bg-blue-500', 'hover:bg-blue-600');
    }, 3000);
}

/**
 * Renders the full patient portal view with prescription and history.
 */
function renderPatientData(patient, diagnosis) {
    const patientDataEl = document.getElementById('patient-data');
    
    // JSON stringify and escape for inline use in HTML attributes
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');

    // If payment is pending, show the payment wall
    if (patient.status === 'PENDING_PAYMENT') {
        // --- FIX: Ensure patient name and matrixId are passed to switchTab for payment ---
        const matrixId = patient.matrixId;
        const patientName = patient.name;
        
        patientDataEl.innerHTML = `
            <div class="card bg-blue-50 p-6 text-center">
                <i class="fas fa-heartbeat text-5xl text-blue-600 mb-4"></i>
                <h3 class="text-xl font-bold text-blue-800 mb-2">Ready to Start? Complete Your Enrollment!</h3>
                
                <p class="text-gray-700 mb-4">You're one step closer to activating your personalized, physician-prescribed movement program! Your prescription is reserved, and you can easily secure your access below. Remember, this investment qualifies for pre-tax <strong>HSA/FSA funds</strong>, making this final step towards the gym easy!</p>
                
                <a href="#" onclick="event.preventDefault(); openLMNModal(${patientJson}, ${diagnosisJson})" class="w-full inline-block py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 mb-4">
                    <i class="fas fa-file-alt mr-2"></i> View Letter of Medical Necessity (LMN)
                </a>
                
                <button onclick="switchTab('payment', '${matrixId}', '${patientName}', 'hsa')" class="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 mb-4">
                    <i class="fas fa-credit-card mr-2"></i> Pay with HSA/FSA (Simulation)
                </button>

                <button onclick="switchTab('payment', '${matrixId}', '${patientName}', 'cc')" class="w-full inline-block py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-150">
                    <i class="fas fa-credit-card mr-2"></i> Pay with Credit/Debit Card (Simulation)
                </button>

                <p class="text-xs text-gray-500 mt-3">Clicking either button takes you to a simulated payment page.</p>
            </div>
        `;
        return;
    }

    // If payment is complete, show the regimen details and data push buttons
    const regimenDetails = WORKOUT_DETAILS[patient.regimenName] || {};
    
    let html = `
        <h3 class="text-xl font-bold text-green-700 mb-4">Your Prescription Access</h3>
        
        <div class="card bg-gray-100 p-4">
            <p class="font-semibold text-gray-700 mb-2">Gym Access Code (For Facility Entry)</p>
            <div class="code-display bg-white text-green-700">${patient.gymAccessCode}</div>
            <p class="text-xs text-gray-500 mt-1">Present this code at the gym entrance desk or scanner.</p>
        </div>
        
        <div class="card bg-gray-100 p-4 mt-4">
            <p class="font-semibold text-gray-700 mb-2">Invitation Code (For Equipment Login)</p>
            <div class="code-display bg-white text-blue-700">${patient.matrixId}</div>
            <p class="text-xs text-gray-500 mt-1">Enter this ID directly into the Matrix cardio or strength machine console.</p>
        </div>

        <div class="card bg-green-50 p-4 mt-4 space-y-3">
            <p class="font-semibold text-green-700">Diagnosis: ${diagnosis.name}</p>
            <p class="font-semibold text-green-700">Regimen: ${patient.regimenName}</p>
            <a href="#" onclick="event.preventDefault(); openLMNModal(${patientJson}, ${diagnosisJson})" class="text-sm text-blue-500 hover:underline flex items-center">
                <i class="fas fa-file-alt mr-2"></i> View Letter of Medical Necessity (LMN)
            </a>
            <a href="${regimenDetails.url}" target="_blank" class="text-sm text-green-600 hover:underline flex items-center font-bold">
                <i class="fas fa-external-link-alt mr-2"></i> View Full Workout Content Page
            </a>
        </div>

        <h3 class="text-xl font-bold text-green-700 mt-6 mb-4">Regimen Steps & Invitation Codes (Simulate Equipment Use)</h3>
        <div id="regimen-list" class="space-y-3">
    `;
    
    // List of exercises in the regimen, each with a simulation button
    regimenDetails.steps.forEach(item => {
        html += `
            <div class="card bg-white border-l-4 border-blue-500">
                <p class="font-bold">${item.machine}</p>
                <p class="text-gray-700">${item.activity}</p>
                <p class="text-xs text-blue-600 font-mono mt-1">Invitation Code: ${item.matrixWorkoutId}</p>
                <button data-patient-id="${patient.matrixId}" data-exercise="${item.activity}" data-machine="${item.machine}" class="simulate-push-btn mt-2 w-full text-center py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-150">
                    <i class="fas fa-satellite-dish"></i> TRIGGER WORKOUT DATA PUSH
                </button>
            </div>
        `;
    });

    html += `</div>
        <h3 class="text-xl font-bold text-green-700 mt-6 mb-4">Completed History</h3>
        <div id="patient-history-list" class="space-y-3">
            <p class="text-gray-500">Loading history...</p>
        </div>
    `;
    
    patientDataEl.innerHTML = html;
    
    // Re-attach event listeners for simulation buttons
    document.querySelectorAll('.simulate-push-btn').forEach(button => {
        button.addEventListener('click', handleSimulatePush);
    });
    
    // Render workout history for this patient
    renderPatientHistory(patient.matrixId);
}

/**
 * Renders the workout history for the patient portal view.
 */
function renderPatientHistory(matrixId) {
    const historyListEl = document.getElementById('patient-history-list');
    
    // Filter the local PATIENT_RESULTS array for this patient
    const patientHistory = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId);
    
    if (patientHistory.length === 0) {
        historyListEl.innerHTML = '<p class="text-gray-500">No completed workouts recorded.</p>';
        return;
    }
    
    // Sort results by date (descending)
    patientHistory.sort((a, b) => b.completedAt - a.completedAt);
    
    const resultsHtml = patientHistory.map(result => `
        <div class="card bg-white border-l-4 border-green-500">
            <p class="font-semibold">${result.exercise} - <span class="text-blue-700">${result.metrics}</span></p>
            <p class="text-xs text-gray-500">On Machine: ${result.machine}</p>
            <p class="text-xs text-gray-500">Completed: ${getFormattedDate(result.completedAt)}</p>
        </div>
    `).join('');
    
    historyListEl.innerHTML = resultsHtml;
}

/**
 * Sets up the patient portal listeners.
 */
function setupPatientPortal() {
    document.getElementById('patient-search-form').addEventListener('submit', handlePatientLogin);
    
    // Show the welcome email modal if a referral was just completed
    if (PENDING_PATIENT_DATA) {
        showPatientWelcomeModal(PENDING_PATIENT_DATA);
    }
}


// --- DOCTOR PROGRESS VIEW FUNCTIONS ---

/**
 * Renders the adherence bar chart based on workout data. (Same as before)
 */
function renderAdherenceChart(data) {
    const container = document.getElementById('progress-chart-container');
    const maxVal = 3; // Target workouts per week
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toLocaleDateString('en-US'); 
        days.push({
            key: key,
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            value: data[key] || 0
        });
    }

    let chartHTML = `<div class="progress-chart h-48 w-full flex justify-around items-end">`;
    days.forEach(day => {
        const height = (day.value / maxVal) * 100;
        chartHTML += `
            <div class="bar-wrapper h-full">
                <div class="bar" style="height: ${Math.min(height, 100)}%;">
                    <span class="bar-label">${day.value}</span>
                </div>
            </div>
        `;
    });
    chartHTML += `</div><div class="flex justify-around mt-1">`;
    days.forEach(day => {
        chartHTML += `<div class="axis-label">${day.label}</div>`;
    });
    chartHTML += `</div>`;
    
    container.innerHTML = chartHTML;
}

/**
 * Renders the regimen completion percentage and summary details in the doctor progress view.
 */
function renderDoctorProgressDisplay(matrixId) {
    const patient = getPatientByMatrixId(matrixId);
    if (!patient) return;
    
    const regimenDetails = WORKOUT_DETAILS[patient.regimenName] || {};
    const totalRequiredWorkouts = 36; // 3/week * 12 weeks
    const completedWorkouts = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId).length;
    const percentage = calculateRegimenCompletion(matrixId);
    
    const displayEl = document.getElementById('doctor-progress-details');
    
    displayEl.innerHTML = `
        <h3 class="text-xl font-bold mt-4 mb-2 text-green-700">Regimen Completion</h3>
        <div class="card bg-white p-4 space-y-3">
            <div class="flex justify-between text-sm font-semibold text-gray-700">
                <span>Total Workouts Assigned (12 weeks):</span>
                <span class="text-gray-900">${totalRequiredWorkouts}</span>
            </div>
            <div class="flex justify-between text-sm font-semibold text-gray-700">
                <span>Workouts Completed (RWE):</span>
                <span class="text-blue-600">${completedWorkouts}</span>
            </div>
            <div class="border-t pt-3">
                <p class="text-lg font-bold text-gray-800 mb-1">Regimen Progress: ${percentage}%</p>
                <div class="progress-container">
                    <div class="progress-bar-fill" style="width: ${percentage}%">
                        ${percentage > 5 ? `<span class="progress-text">${percentage}%</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders only the RWE results and adherence chart in the doctor progress view.
 */
function renderDoctorRweData(matrixId) {
    const patientResults = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId);
    
    const adherenceData = {};
    const resultsHtmlArray = [];

    patientResults.forEach(result => {
        const dateKey = new Date(result.completedAt).toLocaleDateString('en-US');
        
        // Adherence data for chart: Count workouts per day
        adherenceData[dateKey] = (adherenceData[dateKey] || 0) + 1;

        // Results list for RWE (Clinician View)
        resultsHtmlArray.push({
            date: result.completedAt,
            html: `
                <div class="card bg-white border-l-4 border-blue-500">
                    <p class="font-semibold">${result.exercise} - <span class="text-blue-700">${result.metrics}</span></p>
                    <p class="text-xs text-gray-500">On Machine: ${result.machine}</p>
                    <p class="text-xs text-gray-500">Completed: ${getFormattedDate(result.completedAt)}</p>
                </div>
            `
        });
    });

    resultsHtmlArray.sort((a, b) => b.date - a.date);
    
    const resultsListEl = document.getElementById('patient-results-list');
    resultsListEl.innerHTML = resultsHtmlArray.map(item => item.html).join('');
    if (resultsHtmlArray.length === 0) {
        resultsListEl.innerHTML = '<p class="text-gray-500">Awaiting first workout result...</p>';
    }

    renderAdherenceChart(adherenceData);
    renderDoctorProgressDisplay(matrixId); // Update progress summary
}

/**
 * Renders the list of assigned regimen steps for the Clinician Portal, marking them as complete or incomplete.
 */
function renderDoctorRegimenSteps(patient) {
    const regimenDetails = WORKOUT_DETAILS[patient.regimenName] || {};
    const patientWorkouts = PATIENT_RESULTS.filter(r => r.patientMatrixId === patient.matrixId);
    
    // Collect all unique matrixWorkoutIds that the patient has completed
    const completedWorkoutIds = new Set(patientWorkouts.map(w => {
        // Simple logic: check if the machine/activity combo exists in the workout details steps
        const matchingStep = regimenDetails.steps.find(s => s.machine === w.machine && s.activity === w.exercise);
        return matchingStep ? matchingStep.matrixWorkoutId : null;
    }).filter(id => id !== null));

    let html = `
        <h3 class="text-xl font-bold mt-6 mb-2 text-green-700">Assigned Regimen Steps</h3>
        <div id="regimen-steps-list" class="space-y-3">
    `;

    regimenDetails.steps.forEach(item => {
        // For a true count, we'll mark a step as completed if the patient has any RWE data matching that step's details.
        const isCompleted = completedWorkoutIds.has(item.matrixWorkoutId);
        const icon = isCompleted ? '<i class="fas fa-check-circle text-green-500 mr-2"></i>' : '<i class="fas fa-clock text-yellow-500 mr-2"></i>';
        const borderColor = isCompleted ? 'border-green-500' : 'border-gray-300';
        
        html += `
            <div class="card bg-white border-l-4 ${borderColor}">
                <p class="font-bold flex items-center">${icon}${item.machine}</p>
                <p class="text-gray-700 ml-5">${item.activity}</p>
                <p class="text-xs text-gray-500 ml-5">Workout ID: ${item.matrixWorkoutId}</p>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}


/**
 * Displays the detailed progress view for a selected patient in the clinician portal.
 */
window.showDoctorProgress = (patient) => {
    const doctorProgressEl = document.getElementById('doctor-progress');
    doctorProgressEl.classList.remove('hidden');
    
    // Set up the close handler to stop the observer
    const closeHandler = () => {
        doctorProgressEl.classList.add('hidden');
        stopAllObservers(); // Stop the result observer
        startPatientListObserver(); // Restart the list observer
        renderDoctorPatientList(); // Re-render the main list view
    };
    
    // We will attach the close handler *after* setting innerHTML
    
    const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
    
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');
    
    const statusKey = getPatientDisplayStatus(patient.matrixId, patient.status);
    const statusDisplay = statusKey === 'EXERCISE_IN_PROGRESS' ? 'EXERCISE REGIMEN IN PROGRESS' : 
                          (statusKey === 'SIGNUP_COMPLETE' ? 'SIGNUP COMPLETE' : 'SIGNUP PENDING');
    const statusColor = statusKey === 'EXERCISE_IN_PROGRESS' ? 'text-blue-600' : 
                          (statusKey === 'SIGNUP_COMPLETE' ? 'text-green-600' : 'text-yellow-600');

    // --- RE-RENDER MAIN PROGRESS DASHBOARD STRUCTURE (Fix) ---
    // Note: The close-progress button handler must be re-attached after setting innerHTML.
    doctorProgressEl.innerHTML = `
        <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 z-30 border-b">
            <h2 class="text-2xl font-bold text-green-700">${patient.name}'s Progress</h2>
            <button id="close-progress" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="card bg-gray-50">
                <p class="font-semibold text-sm">Diagnosis:</p>
                <p class="text-lg text-blue-600 font-bold">${diagnosis?.name || 'N/A'}</p>
            </div>
            <div class="card bg-gray-50">
                <p class="font-semibold text-sm">Status:</p>
                <p class="text-lg font-bold ${statusColor}">${statusDisplay}</p>
            </div>
            <div class="card bg-gray-50 col-span-2">
                <p class="font-semibold text-sm mb-1">Credentials:</p>
                <p class="text-xs">Invitation Code: <span class="font-mono">${patient.matrixId}</span></p>
                <p class="text-xs">Gym Code: <span class="font-mono">${patient.gymAccessCode}</span></p>
                <a href="#" onclick="event.preventDefault(); openLMNModal(${patientJson}, ${diagnosisJson})" class="text-xs text-blue-500 hover:underline flex items-center mt-2 font-semibold">
                    <i class="fas fa-file-alt mr-1"></i> View Letter of Medical Necessity (Clinician Copy)
                </a>
            </div>
        </div>
        
        <div id="doctor-progress-details">
            </div>

        ${renderDoctorRegimenSteps(patient)}

        <h3 class="text-xl font-bold mt-4 mb-2 text-green-700">Adherence Summary (Last 7 Days)</h3>
        <div id="progress-chart-container" class="card bg-white p-4">
            <p class="text-center text-gray-500">Loading adherence data...</p>
        </div>

        <h3 class="text-xl font-bold mt-6 mb-2 text-green-700">Completed Workouts (RWE Data)</h3>
        <div id="patient-results-list" class="space-y-3">
            <p class="text-gray-500">Awaiting workout results...</p>
        </div>
    `;
    
    // Re-attach close handler
    document.getElementById('close-progress').onclick = closeHandler;

    // Initial render of RWE data and progress display
    renderDoctorRweData(patient.matrixId);

    // Start the RWE result observer for real-time updates
    startPatientResultObserver(patient.matrixId);
}


// --- PAYMENT VIEW FUNCTIONS ---

/**
 * Renders the simulated HSA/FSA (Binkey Pay) or Credit Card payment form, 
 * incorporating UX best practices.
 */
function setupPaymentForm(matrixId, patientName, type) {
    const paymentPanel = document.getElementById('payment-panel');
    
    const isHSA = type === 'hsa';
    const cardLabel = isHSA ? 'HSA/FSA Card Number' : 'Credit/Debit Card Number';
    const cardPlaceholder = isHSA ? 'XXXX XXXX XXXX XXXX' : '#### #### #### ####';
    
    let heading, actionButtonText, simulationAlert, iconClass;

    if (isHSA) {
        heading = 'Binkey Pay Secure Checkout';
        actionButtonText = '<i class="fas fa-hand-holding-usd mr-2"></i> Verify & Pay with Binkey Pay ($99.00)';
        iconClass = 'fa-hand-holding-usd';
        simulationAlert = `
            <div class="alert-success alert-card flex items-center mb-6">
                <i class="fas fa-shield-alt mr-3"></i>
                **HSA/FSA Eligible:** The MoveFitRx prescription is qualified by your physician's LMN.
            </div>
        `;
    } else {
        heading = 'Credit/Debit Card Payment';
        actionButtonText = 'Complete Purchase ($99.00)';
        iconClass = 'fa-credit-card';
        simulationAlert = `
            <div class="alert-warning alert-card flex items-center mb-6">
                <i class="fas fa-exclamation-triangle mr-3"></i>
                **Simulation Warning:** This is a demo payment page. No actual funds will be charged.
            </div>
        `;
    }

    // UX Best Practice: Order Summary
    const orderSummary = `
        <div class="card bg-gray-50 p-4 mb-4">
            <h4 class="text-md font-bold text-gray-800 mb-2">Order Summary</h4>
            <div class="flex justify-between text-sm text-gray-600">
                <span>MoveFitRx 12-Week Prescription</span>
                <span>$99.00</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
                <span>Taxes & Fees</span>
                <span>$0.00</span>
            </div>
            <div class="flex justify-between pt-2 border-t mt-2 text-lg font-extrabold text-gray-900">
                <span>Total Due</span>
                <span>$99.00</span>
            </div>
        </div>
    `;

    paymentPanel.innerHTML = `
        <button onclick="switchTab('patient')" class="text-blue-500 hover:underline mb-4 flex items-center">
            <i class="fas fa-arrow-left mr-2"></i> Back to Enrollment
        </button>
        <h2 class="text-2xl font-bold mb-4 text-green-700">${heading}</h2>
        
        ${orderSummary}
        
        ${simulationAlert}
        
        <form id="unified-payment-form" data-payment-type="${type}" class="card bg-white p-6 space-y-4 shadow-lg">
            <input type="hidden" name="matrixId" value="${matrixId}">
            <h3 class="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center">
                <i class="fas ${iconClass} mr-2 text-gray-500"></i> Payment Details
            </h3>

            <div>
                <label for="cardholder-name" class="block text-sm font-medium text-gray-700">Cardholder Name</label>
                <input type="text" id="cardholder-name" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" value="${patientName}">
            </div>
            <div>
                <label for="card-number" class="block text-sm font-medium text-gray-700">${cardLabel}</label>
                <input type="text" id="card-number" required pattern="[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{4}" title="16 digits separated by spaces" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" placeholder="${cardPlaceholder}">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date (MM/YY)</label>
                    <input type="text" id="expiry-date" required pattern="(0[1-9]|1[0-2])/[0-9]{2}" title="MM/YY" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" placeholder="MM/YY">
                </div>
                <div>
                    <label for="cvv" class="block text-sm font-medium text-gray-700">CVV / Security Code</label>
                    <input type="text" id="cvv" required pattern="[0-9]{3,4}" title="3 or 4 digits" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" placeholder="123">
                </div>
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150">
                    ${actionButtonText}
                </button>
            </div>
            
            <p id="payment-form-status" class="text-sm text-center text-red-600"></p>
            
            <div class="security-seal">
                <i class="fas fa-lock text-green-500 mr-2"></i> 
                ${isHSA ? 'Securely powered by Binkey Pay' : 'SSL Secure Transaction'}
            </div>
        </form>
    `;

    document.getElementById('unified-payment-form').addEventListener('submit', handleUnifiedPaymentFormSubmit);
}

/**
 * Handles the unified payment form submission, shows success modal, and completes enrollment.
 */
function handleUnifiedPaymentFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const matrixId = form.matrixId.value;
    const paymentType = form.dataset.paymentType; // Get the payment type (hsa or cc)
    const statusEl = document.getElementById('payment-form-status');
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = paymentType === 'hsa' ? 'Verifying with Binkey Pay...' : 'Processing Payment...';
    statusEl.textContent = '';


    // Simulate API delay and processing
    setTimeout(() => {
        // Show the standard success modal
        const successModal = document.getElementById('payment-success-modal');
        const successMessage = paymentType === 'hsa' 
            ? 'Eligibility verified and payment successful via Binkey Pay! Your prescription is now active.'
            : 'Payment successful! Your prescription is now active.';
        
        document.getElementById('payment-success-content').querySelector('p').textContent = successMessage;
        successModal.classList.remove('hidden');

        // Set the handler for the modal close button (Go to the Gym)
        document.getElementById('close-payment-success-btn').onclick = () => {
            successModal.classList.add('hidden');
            
            // Finalize payment in local array
            const success = processPaymentSimulation(matrixId);

            if (success) {
                const patient = getPatientByMatrixId(matrixId);
                if (patient) {
                    // 1. Show the final gym details modal
                    showGymReadyModal(patient);
                    
                    // 2. Auto-login the patient to display their new prescription view (renders behind the modal)
                    document.getElementById('matrix-id-input').value = patient.matrixId;
                    handlePatientLogin(null);
                } else {
                    // Fallback: just switch to patient view and force re-login
                    document.getElementById('patient-status').textContent = 'Error finalizing enrollment. Please try logging in again.';
                    document.getElementById('patient-status').className = 'text-red-600 mt-2';
                    switchTab('patient');
                }
            } else {
                document.getElementById('patient-status').textContent = 'Error finalizing enrollment. Please try logging in again.';
                document.getElementById('patient-status').className = 'text-red-600 mt-2';
                switchTab('patient');
            }
        };

        // Re-enable button state (in case user doesn't close modal and clicks back)
        submitButton.disabled = false;
        const originalText = paymentType === 'hsa' ? '<i class="fas fa-hand-holding-usd mr-2"></i> Verify & Pay with Binkey Pay ($99.00)' : 'Complete Purchase ($99.00)';
        submitButton.innerHTML = originalText;

    }, 1500); // Simulate 1.5 second API call/processing delay
}

/**
 * Shows the final modal with gym details and membership ID.
 */
function showGymReadyModal(patient) {
    const modalEl = document.getElementById('gym-ready-modal');
    const contentEl = document.getElementById('gym-ready-content');
    
    contentEl.innerHTML = `
        <div class="p-6 text-center">
            <i class="fas fa-dumbbell text-6xl text-blue-500 mb-6"></i>
            <h3 class="text-2xl font-extrabold text-gray-900 mb-4">You're Ready to Go!</h3>
            <p class="text-gray-700 mb-6">Your access is now active for <strong>${GYM_DETAILS.name}</strong>.</p>
            
            <div class="bg-gray-100 p-4 rounded-lg space-y-3">
                <p class="font-semibold text-sm text-gray-700">Your Membership Number:</p>
                <div class="code-display text-xl font-extrabold text-green-700 bg-white">${patient.gymAccessCode}</div>
            </div>

            <div class="mt-6 text-left space-y-3">
                <p class="text-sm font-semibold text-gray-700 flex items-center">
                    <i class="fas fa-map-marker-alt text-red-500 mr-2"></i> Address: ${GYM_DETAILS.address}
                </p>
                <p class="text-sm font-semibold text-gray-700 flex items-center">
                    <i class="fas fa-globe text-blue-500 mr-2"></i> Website: <a href="${GYM_DETAILS.website}" target="_blank" class="text-blue-600 hover:underline">${GYM_DETAILS.website}</a>
                </p>
            </div>
        </div>
    `;

    modalEl.classList.remove('hidden');

    // **FLOW FIX: Change from switching to 'doctor' to switching to 'patient'**
    document.getElementById('close-gym-ready-btn').onclick = () => {
        modalEl.classList.add('hidden');
        switchTab('patient'); // User lands on their active prescription page
    };
}


// --- MAIN APP INITIALIZATION AND NAVIGATION ---

/**
 * Switches between the Clinician, Patient, and Payment tabs/views.
 * FLOW FIX: Stops and starts the correct observers based on the view.
 */
function switchTab(tabName, matrixId = null, patientName = null, paymentType = null) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    
    stopAllObservers(); // Stop all observers first

    // Handle button activation/view state
    if (tabName !== 'payment') {
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    document.getElementById(`${tabName}-panel`).classList.add('active');

    const container = document.querySelector('.app-container');
    if (tabName === 'doctor') {
        container.classList.add('doctor-view');
        // Hide patient progress view when switching back to main doctor list
        document.getElementById('doctor-progress').classList.add('hidden'); 
        startPatientListObserver(); // Start list observer
    } else {
        container.classList.remove('doctor-view');
    }
    
    // Setup the payment form context if switching to payment
    if (tabName === 'payment' && matrixId && patientName && paymentType) {
        setupPaymentForm(matrixId, patientName, paymentType);
    }
    
    // Show the welcome modal if referral data is pending and we switch to patient view
    if (tabName === 'patient' && PENDING_PATIENT_DATA) {
        showPatientWelcomeModal(PENDING_PATIENT_DATA);
    }
}

/**
 * Initial application setup function.
 */
function initializeApp() {
    // Seed some mock patient data for immediate progress review:
    const initialPatient1 = getAndMarkAvailableCredential();
    const initialPatient2 = getAndMarkAvailableCredential();

    if (initialPatient1) {
        REFERRED_PATIENTS.push({
            name: 'Sarah Connor',
            email: 'sarah.connor@email.com',
            diagnosisId: 'SMT',
            regimenName: 'Hormonal Balance & Strength',
            matrixId: initialPatient1.matrixId,
            gymAccessCode: initialPatient1.gymAccessCode,
            status: 'PAID', // Already paid
            createdAt: Date.now() - 86400000 * 5, // 5 days ago
        });
        // Seed some mock RWE data for Sarah
        PATIENT_RESULTS.push(
            { patientMatrixId: initialPatient1.matrixId, machine: 'Recumbent Bike', exercise: 'Low Intensity Cardio 25 min', metrics: 'Distance: 1.5 mi, Avg HR: 130 BPM', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Leg Press', exercise: '3 Sets x 12 Reps', metrics: 'Weight: 60 lbs, Total Volume: 2160 lbs', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Diverging Seated Row', exercise: '3 Sets x 10 Reps', metrics: 'Weight: 45 lbs, Total Volume: 1350 lbs', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Recumbent Bike', exercise: 'Low Intensity Cardio 25 min', metrics: 'Distance: 1.6 mi, Avg HR: 132 BPM', completedAt: getMockPastDate().getTime() },
            { patientMatrixId: initialPatient1.matrixId, machine: 'Leg Press', exercise: '3 Sets x 12 Reps', metrics: 'Weight: 60 lbs, Total Volume: 2160 lbs', completedAt: getMockPastDate().getTime() },
        );
    }

    if (initialPatient2) {
        REFERRED_PATIENTS.push({
            name: 'Jessica Jones',
            email: 'jessica.jones@email.com',
            diagnosisId: 'OSTE',
            regimenName: 'Bone Density & Balance',
            matrixId: initialPatient2.matrixId,
            gymAccessCode: initialPatient2.gymAccessCode,
            status: 'PENDING_PAYMENT', // Still pending payment
            createdAt: Date.now() - 86400000 * 2, // 2 days ago
        });
    }

    // Perform initial UI setups and start the main observer
    setupDoctorPortal(); // This starts the list observer
    setupPatientPortal();
}

// Attach the main initialization function to the window load event
window.onload = initializeApp;

// Expose necessary functions globally for HTML attributes (onclick)
window.switchTab = switchTab;
window.DIAGNOSES = DIAGNOSES;