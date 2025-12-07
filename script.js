/**
 * CRITICAL INSTRUCTION: This script is a STABLE, PUBLICLY DEPLOYABLE DEMO.
 * It strictly adheres to the NO FIREBASE/Database SDKs rule.
 * All data operations (Referral, Payment Status Lookup, RWE results)
 * occur exclusively on local JavaScript arrays in memory.
 * * * UPDATE SUMMARY:
 * 1. Aesthetic and UX improvements (professional color palette, Binkey Pay simulation, card design).
 * 2. Clinician Progress View enhancements (Adherence status, Completion %, Regimen Steps).
 * 3. FIX: Removed internal window.onload and replaced with document.addEventListener('DOMContentLoaded', initializeApp);
 * 4. FIX: Added specific populateDiagnosisDropdown() to ensure element manipulation integrity.
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
                <i class="fas fa-check-circle mr-3 color-primary-green"></i> Referral Completed!
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
            
            let statusClass, statusText, statusTextColor;
            if (statusKey === 'EXERCISE_IN_PROGRESS') {
                statusClass = 'border-secondary-blue';
                statusText = 'EXERCISE REGIMEN IN PROGRESS';
                statusTextColor = 'text-blue-600';
            } else if (statusKey === 'SIGNUP_COMPLETE') {
                statusClass = 'border-primary-green';
                statusText = 'SIGNUP COMPLETE';
                statusTextColor = 'text-green-600';
            } else {
                statusClass = 'border-yellow-500';
                statusText = 'SIGNUP PENDING';
                statusTextColor = 'text-yellow-600';
            }

            // Must use JSON.stringify and escape for passing objects to inline handlers
            const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
            
            const percentage = calculateRegimenCompletion(patient.matrixId);

            return `
                <div class="card bg-white border-l-4 ${statusClass} cursor-pointer hover:bg-gray-50" 
                     onclick="showDoctorProgress(${patientJson})">
                    <p class="text-lg font-semibold">${patient.name}</p>
                    <p class="text-sm text-gray-600">DX: ${diagnosisName}</p>
                    <p class="text-xs font-bold ${statusTextColor}">${statusText}</p>
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
 * NEW FUNCTION: Specifically targets and populates the Diagnosis Select element.
 */
function populateDiagnosisDropdown() {
    const diagnosisSelect = document.getElementById('diagnosis-select');
    
    // Check if the element exists before trying to populate it (essential safety check)
    if (diagnosisSelect) {
        diagnosisSelect.innerHTML = DIAGNOSES.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
}

/**
 * Sets up the clinician portal UI and starts the list observer.
 */
function setupDoctorPortal() {
    
    // --- CRITICAL FIX CALL: Ensure the dropdown is populated immediately ---
    populateDiagnosisDropdown(); 
    
    // Attach the referral form handler
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
    const patient = REFERRED_PATIENTS