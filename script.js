// ----------------------------------------------------------------------
// --- FINAL STABLE LOGIC: SYNTHETIC DATA LAYER (NO FIREBASE SDK) ---
// This version is optimized for stability and implements the compliant Binkey/Type 2 NPI workflow.
// ----------------------------------------------------------------------

// --- SYNTHETIC GLOBAL OBJECTS (PREVENTS CRASHES) ---
let app = {};
let db = {};
let auth = {};
let userId = 'MOCK_USER_ID';
let isAuthReady = true;
let pendingPatientData = null;

// --- MOCK DATA LAYER (Local Memory) ---
let AVAILABLE_MOCK_CREDENTIALS = [
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
let CURRENT_DOCTOR_PROGRESS_MATRIX_ID = null;

// --- CORE DATA MODELS ---
const DIAGNOSES = [
    { id: 'SMT', name: 'Symptomatic Menopausal Transition', regimen: 'Hormonal Balance & Strength', code: 'E89.0' },
    { id: 'PHRM', name: 'Postmenopausal Health/Risk Management', regimen: 'Cardio Endurance & Insulin Sensitivity', code: 'Z00.00' },
    { id: 'OSTP', name: 'Osteopenia', regimen: 'Bone Density & Balance', code: 'M85.8' },
    { id: 'OSTE', name: 'Osteoporosis', regimen: 'Bone Density & Balance', code: 'M81.0' },
    { id: 'PCOS', name: 'PCOS', regimen: 'Cardio Endurance & Insulin Sensitivity', code: 'E28.2' },
    { id: 'HYPT', name: 'Hypertension', regimen: 'Cardio Vascular Health', code: 'I10' }, 
];

const CLINICIAN_DETAILS = {
    name: 'Dr. Jane Foster, MD',
    clinic: 'MoveFitRx Clinical Group',
    phone: '(555) 123-4567',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
};

const WORKOUT_DETAILS = {
    'Hormonal Balance & Strength': {
        url: 'https://movefitrx.com/regimen/hormonal-strength',
        steps: [
            { machine: 'Recumbent Bike', activity: 'Low Intensity Cardio 25 min', matrixWorkoutId: 'MXW-HRM-01' },
            { machine: 'Leg Press', activity: '3 Sets x 12 Reps', matrixWorkoutId: 'MXW-HRM-02' },
            { machine: 'Diverging Seated Row', activity: '3 Sets x 10 Reps', matrixWorkoutId: 'MXW-HRM-03' },
        ]
    },
    'Bone Density & Balance': {
        url: 'https://movefitrx.com/regimen/bone-density',
        steps: [
            { machine: 'Treadmill', activity: 'Brisk Walk w/ Low Incline 30 min', matrixWorkoutId: 'MXW-BND-01' },
            { machine: 'Calf Extension', activity: '3 Sets x 15 Reps (Light)', matrixWorkoutId: 'MXW-BND-02' },
            { machine: 'Hip Adductor', activity: '3 Sets x 12 Reps', matrixWorkoutId: 'MXW-BND-03' },
        ]
    },
    'Cardio Endurance & Insulin Sensitivity': {
        url: 'https://movefitrx.com/regimen/cardio-insulin',
        steps: [
            { machine: 'Ascent Trainer', activity: 'Steady State 45 min', matrixWorkoutId: 'MXW-CDI-01' },
            { machine: 'Pec Fly', activity: '3 Sets x 15 Reps (Circuit)', matrixWorkoutId: 'MXW-CDI-02' },
        ]
    },
    'Cardio Vascular Health': {
        url: 'https://movefitrx.com/regimen/cardio-vascular-health',
        steps: [
            { machine: 'Treadmill', activity: 'Aerobic Walk 40 min (Target HR: 110-130)', matrixWorkoutId: 'MXW-CVH-01' },
            { machine: 'Seated Leg Curl', activity: '2 Sets x 15 Reps (Low Resistance)', matrixWorkoutId: 'MXW-CVH-02' },
        ]
    },
};

const GYM_DETAILS = {
    name: 'Coronado Fitness Club',
    address: '875 Orange Ave suite 101, Coronado, CA 92118',
    website: 'https://www.coronadofitnessclub.com/',
};

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);

function getMockPastDate() {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, 6)); 
    d.setHours(randomInt(9, 17));
    d.setMinutes(randomInt(0, 59));
    return d;
}

const getFormattedDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getAndMarkAvailableCredential() {
    const credential = AVAILABLE_MOCK_CREDENTIALS.find(c => !c.used);
    if (credential) {
        credential.used = true;
        return credential;
    }
    return null;
}

function getPatientByMatrixId(matrixId) {
    return REFERRED_PATIENTS.find(p => p.matrixId === matrixId) || null;
}

// --- LOCAL OBSERVER FUNCTIONS (Simulating Real-Time Updates) ---

let listObserverInterval = null;
let resultObserverInterval = null;

function startPatientListObserver() {
    if (listObserverInterval) clearInterval(listObserverInterval); 
    listObserverInterval = setInterval(() => {
        if (document.getElementById('doctor-panel').classList.contains('active') && 
            document.getElementById('doctor-progress').classList.contains('hidden')) {
            renderDoctorPatientList();
        }
    }, 1000);
}

function startPatientResultObserver(matrixId) {
    if (resultObserverInterval) clearInterval(resultObserverInterval); 
    CURRENT_DOCTOR_PROGRESS_MATRIX_ID = matrixId;

    resultObserverInterval = setInterval(() => {
        if (!document.getElementById('doctor-progress').classList.contains('hidden') && 
            CURRENT_DOCTOR_PROGRESS_MATRIX_ID === matrixId) {
            renderDoctorRweData(matrixId); 
        }
    }, 1000);
}

function stopAllObservers() {
    if (listObserverInterval) clearInterval(listObserverInterval);
    if (resultObserverInterval) clearInterval(resultObserverInterval);
    CURRENT_DOCTOR_PROGRESS_MATRIX_ID = null;
}


// --- LMN and MODAL HANDLERS ---

/**
 * Generates the content for the Letter of Medical Necessity (LMN).
 * CRITICAL UPDATE: Implements Option 2/Binkey compliance requirements.
 */
function generateLMNContent(patient, diagnosis) {
    // NPI and CPT code included per compliance requirements 
    const MOVERITRX_NPI = '9876543210'; 
    const CPT_CODE = '97110 (Therapeutic Procedure)'; 

    const template = `To Whom It May Concern:

**Subject: Letter of Medical Necessity for Exercise Prescription**

Date: {{date}}

This letter confirms that **{{patient_name}}** is under my care and has been diagnosed with the following condition:

**Primary Diagnosis:** {{diagnosis}} (ICD-10 Code: {{diagnosis_code}})

### Medical Necessity
Due to the patient's condition, a structured, medically necessary exercise regimen is required to mitigate symptoms, prevent disease progression, and improve overall health markers.

The prescribed program, MoveFitRx, is a Digital Therapeutic Exercise Program focusing on **{{regimen_name}}** (Regimen Code: {{matrix_id}}). This service is **MANDATORY** for managing the patient's diagnosed condition and cannot be achieved through general fitness programs[cite: 1383, 1384]. The fee is strictly for the prescriptive regimen and clinical monitoring, and is **not for general health club access**[cite: 1910].

### Prescription Details
* **Prescribing Provider (MD):** ${CLINICIAN_DETAILS.name} (NPI: ${CLINICIAN_DETAILS.phone})
* **Billing Entity (MoveFitRx Clinical Group):** NPI: ${MOVERITRX_NPI} [cite: 1898]
* **Regimen CPT/Service Code:** ${CPT_CODE} [cite: 1901]
* **Prescription:** Structured exercise regimen, 3x per week for 12 weeks.

**Cost Estimate:** The monthly subscription fee covers the MoveFitRx Medically Prescribed Therapeutic Service and Clinical Oversight[cite: 1921].

I have determined that participation in this program is medically necessary for the treatment of **{{diagnosis}}**. Please consider this letter a formal request to approve reimbursement for the necessary program costs under the patient’s Health Savings Account (HSA) or Flexible Spending Account (FSA).

Sincerely,

${CLINICIAN_DETAILS.name}
${CLINICIAN_DETAILS.clinic}`;
    
    return template
        .replace('{{date}}', CLINICIAN_DETAILS.date)
        .replace('{{patient_name}}', patient.name)
        .replace(/{{diagnosis}}/g, diagnosis?.name || 'N/A')
        .replace('{{diagnosis_code}}', diagnosis?.code || 'N/A')
        .replace('{{regimen_name}}', patient.regimenName)
        .replace('{{matrix_id}}', patient.matrixId);
}

window.openLMNModal = (patient, diagnosis) => {
    const lmnContent = generateLMNContent(patient, diagnosis);
    
    let formattedContent = lmnContent
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    if (!formattedContent.startsWith('<h3>')) {
            formattedContent = `<p>${formattedContent}</p>`;
    } else {
            formattedContent = formattedContent.replace(/<br>/g, '');
    }

    document.getElementById('lmn-content-display').innerHTML = formattedContent;
    document.getElementById('lmn-modal').classList.remove('hidden');
}

window.closeLMNModal = () => {
    document.getElementById('lmn-modal').classList.add('hidden');
}

window.closePatientWelcomeModal = () => {
    document.getElementById('patient-welcome-modal').classList.add('hidden');
}

function closeClinicianNotificationModal() {
    document.getElementById('clinician-notification-modal').classList.add('hidden');
}

function handleReferralComplete(name, patientData, isSuccess) {
    document.getElementById('clinician-notification-modal').classList.add('hidden');

    if (isSuccess) {
        document.getElementById('referral-status').textContent = `Success! Patient ${name} referred. Status: SIGNUP PENDING.`;
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
 * Handles the patient referral form submission using purely local state (MOCK).
 */
async function handleReferral(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const diagnosisId = form.diagnosis.value;
    
    const submitButton = document.getElementById('submit-referral');
    submitButton.disabled = true;
    submitButton.textContent = 'Acquiring Credentials...';
    
    // 1. Get Mock Credential
    const credential = await getAvailableCredential(); 

    if (!credential) {
        document.getElementById('referral-status').textContent = `Failure: No available Matrix/Gym credentials.`;
        document.getElementById('referral-status').className = 'text-red-600 mt-2';
        submitButton.disabled = false;
        submitButton.textContent = 'Refer Patient';
        return;
    }

    const matrixId = credential.data.matrixId;
    const gymAccessCode = credential.data.gymAccessCode;
    const diagnosis = DIAGNOSES.find(d => d.id === diagnosisId);
    
    submitButton.textContent = 'Submitting Referral...';

    // Mock Patient Record Creation (Simulates successful database transaction)
    const patientData = {
        name,
        email,
        diagnosisId,
        regimenName: diagnosis.regimen,
        matrixId, 
        gymAccessCode, 
        userId: userId,
        status: 'PENDING_PAYMENT', 
        createdAt: Date.now()
    };
    
    // Update Local State & UI
    REFERRED_PATIENTS.unshift(patientData); 
    PENDING_PATIENT_DATA = patientData;
    
    form.reset();
    
    // Show success modal
    showClinicianNotification({name, matrixId: patientData.matrixId});

    // Final cleanup and button reset (simulates handleReferralComplete)
    submitButton.disabled = false;
    submitButton.textContent = 'Refer Patient';
}

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
    PENDING_PATIENT_DATA = null;
    document.getElementById('matrix-id-input').value = patient.matrixId;
}

/**
 * Renders the full patient portal view with prescription and history.
 */
function renderPatientData(patient, diagnosis) {
    const patientDataEl = document.getElementById('patient-data');
    
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');

    // If payment is pending, show the payment wall
    if (patient.status === 'PENDING_PAYMENT') {
        patientDataEl.innerHTML = `
            <div class="card bg-blue-50 p-6 text-center">
                <i class="fas fa-heartbeat text-5xl text-blue-600 mb-4"></i>
                <h3 class="text-xl font-bold text-blue-800 mb-2">Ready to Start? Complete Your Enrollment!</h3>
                
                <p class="text-gray-700 mb-4">You're one step closer to activating your personalized, physician-prescribed movement program! Your prescription is reserved, and you can easily secure your access below. Remember, this investment qualifies for pre-tax <strong>HSA/FSA funds</strong>, making this final step towards the gym easy!</p>
                
                <a href="#" onclick="event.preventDefault(); openLMNModal(${patientJson}, ${diagnosisJson})" class="w-full inline-block py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 mb-4">
                    <i class="fas fa-file-alt mr-2"></i> View Letter of Medical Necessity (LMN)
                </a>
                
                <button onclick="switchTab('payment', '${patient.matrixId}', '${patient.name}', 'binkey')" class="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 mb-4">
                    <i class="fas fa-credit-card mr-2"></i> Pay with Binkey/HSA/FSA (Simulation)
                </button>
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
    
    document.querySelectorAll('.simulate-push-btn').forEach(button => {
        button.addEventListener('click', handleSimulatePush);
    });
    
    renderPatientHistory(patient.matrixId);
}

// --- DOCTOR VIEW & DATA RENDERING ---

function renderDoctorPatientList() {
    const patientsListEl = document.getElementById('patients-list');
    
    if (REFERRED_PATIENTS.length === 0) {
        patientsListEl.innerHTML = '<p class="text-gray-500">No patients referred yet.</p>';
        return;
    }
    
    const newHtml = REFERRED_PATIENTS
        .slice() 
        .sort((a, b) => b.createdAt - a.createdAt) 
        .map((patient) => {
            const diagnosisName = DIAGNOSES.find(d => d.id === patient.diagnosisId)?.name || 'N/A';
            
            let statusClass, statusText;
            if (patient.status === 'PAID') {
                statusClass = 'border-green-500';
                statusText = 'SIGNUP COMPLETE';
            } else {
                statusClass = 'border-yellow-500';
                statusText = 'SIGNUP PENDING';
            }

            const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');

            return `
                <div class="card bg-white border-l-4 ${statusClass} cursor-pointer hover:bg-gray-50" 
                     onclick="showDoctorProgress(${patientJson})">
                    <p class="text-lg font-semibold">${patient.name}</p>
                    <p class="text-sm text-gray-600">DX: ${diagnosisName}</p>
                    <p class="text-xs font-bold ${patient.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}">${statusText}</p>
                    <p class="text-xs text-gray-400">ID: ${patient.matrixId}</p>
                </div>
            `;
        }).join('');
    
    patientsListEl.innerHTML = newHtml;
}

function renderPatientHistory(matrixId) {
    const historyListEl = document.getElementById('patient-history-list');
    
    const patientHistory = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId);
    
    if (patientHistory.length === 0) {
        historyListEl.innerHTML = '<p class="text-gray-500">No completed workouts recorded.</p>';
        return;
    }
    
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

function renderDoctorRweData(matrixId) {
    const patientResults = PATIENT_RESULTS.filter(r => r.patientMatrixId === matrixId);
    
    const adherenceData = {};
    const resultsHtmlArray = [];

    patientResults.forEach(result => {
        const dateKey = new Date(result.completedAt).toLocaleDateString('en-US');
        adherenceData[dateKey] = (adherenceData[dateKey] || 0) + 1;

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
        resultsListEl.innerHTML = '<p class="text-gray-500">No workout results received yet.</p>';
    }

    renderAdherenceChart(adherenceData);
}

window.showDoctorProgress = (patient) => {
    const doctorProgressEl = document.getElementById('doctor-progress');
    doctorProgressEl.classList.remove('hidden');
    
    document.getElementById('close-progress').onclick = () => {
        doctorProgressEl.classList.add('hidden');
        stopAllObservers(); 
        startPatientListObserver(); 
        renderDoctorPatientList(); 
    };

    const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
    
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');
    
    const statusDisplay = patient.status === 'PAID' ? 'SIGNUP COMPLETE' : 'SIGNUP PENDING';

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
                <p class="text-lg font-bold ${patient.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}">${statusDisplay}</p>
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

        <h3 class="text-xl font-bold mt-4 mb-2 text-green-700">Adherence Summary (Last 7 Days)</h3>
        <div id="progress-chart-container" class="card bg-white p-4">
            <p class="text-center text-gray-500">Loading adherence data...</p>
        </div>

        <h3 class="text-xl font-bold mt-6 mb-2 text-green-700">Completed Workouts (RWE Data)</h3>
        <div id="patient-results-list" class="space-y-3">
            <p class="text-gray-500">Awaiting workout results...</p>
        </div>
    `;
    
    document.getElementById('close-progress').onclick = () => {
        doctorProgressEl.classList.add('hidden');
        stopAllObservers();
        startPatientListObserver();
        renderDoctorPatientList(); 
    };

    renderDoctorRweData(patient.matrixId);
    startPatientResultObserver(patient.matrixId);
}


// --- MAIN APP INITIALIZATION AND NAVIGATION ---

/**
 * Switches between the Clinician, Patient, and Payment tabs/views.
 */
function switchTab(tabName, matrixId = null, patientName = null, paymentType = null) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    
    stopAllObservers();

    if (tabName !== 'payment') {
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    document.getElementById(`${tabName}-panel`).classList.add('active');

    const container = document.querySelector('.app-container');
    if (tabName === 'doctor') {
        container.classList.add('doctor-view');
        document.getElementById('doctor-progress').classList.add('hidden'); 
        startPatientListObserver(); 
    } else {
        container.classList.remove('doctor-view');
    }
    
    if (tabName === 'payment' && matrixId && patientName && paymentType) {
        setupPaymentForm(matrixId, patientName, paymentType);
    }
    
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
    setupDoctorPortal(); 
    setupPatientPortal();
}

window.onload = initializeApp;
window.switchTab = switchTab;