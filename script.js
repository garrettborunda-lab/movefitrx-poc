// ----------------------------------------------------------------------
// --- STABLE CONFIGURATION: FINAL SYNTHETIC DATA LAYER (NO LIVE FIREBASE) ---
// This version removes all Firebase dependencies and simulates all data actions locally.
// ----------------------------------------------------------------------
const mockFirebaseConfig = {
    apiKey: "AIzaSy_MOCK_API_KEY_1234567890", 
    authDomain: "movefitrx-mock.firebaseapp.com",
    projectId: "movefitrx-mock",
    storageBucket: "movefitrx-mock.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnop"
};

const appId = mockFirebaseConfig.projectId;

// --- SYNTHETIC GLOBAL OBJECTS (PREVENTS CRASHES) ---
// Define empty objects/variables where the original code expected to find the SDK results.
let app = {};
let db = {};
let auth = {};

let userId = 'MOCK_USER_ID';
let isAuthReady = true;
let pendingPatientData = null;

// Mock Arrays for In-Memory Demo Functionality
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

// --- CORE DATA MODELS (MOCK DATA FOR POC) ---
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

// MOCK: Simple Date Formatting (no reliance on Firestore Timestamp object)
const getFormattedDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);

// MOCK: Retrieves patient from local array
async function getPatientByMatrixId(matrixId) {
    return REFERRED_PATIENTS.find(p => p.matrixId === matrixId) || null;
}

// MOCK: Finds the first unused credential from local memory array
async function getAvailableCredential() {
    const unusedCredential = AVAILABLE_MOCK_CREDENTIALS.shift(); 
    
    if (!unusedCredential) {
        return null;
    }

    return {
        docId: unusedCredential.matrixId,
        data: unusedCredential
    };
}

function generateLMNContent(patient, diagnosis) {
    const template = `To Whom It May Concern:

**Subject: Letter of Medical Necessity for Exercise Prescription**

Date: {{date}}

... (LMN content remains the same) ...`;
    
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

function closeLMNModal() {
    document.getElementById('lmn-modal').classList.add('hidden');
}
window.closeLMNModal = closeLMNModal;

function closePatientWelcomeModal() {
    document.getElementById('patient-welcome-modal').classList.add('hidden');
}
window.closePatientWelcomeModal = closePatientWelcomeModal;

async function handleReferralComplete(name, patientData, isSuccess) {
    document.getElementById('clinician-notification-modal').classList.add('hidden');

    if (isSuccess) {
        document.getElementById('referral-status').textContent = `Success! Patient ${name} referred. Status: SIGNUP PENDING.`;
        document.getElementById('referral-status').className = 'text-green-600 mt-2';
        window.patientWelcomeData = patientData; 
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
    
    // --- FINAL MOCK LOGIC START (Guaranteed Success or Credential Fail) ---
    
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

    // Mock Patient Record Creation
    const patientData = {
        name,
        email,
        diagnosisId,
        regimenName: diagnosis.regimen,
        matrixId, 
        gymAccessCode, 
        referrerId: userId,
        status: 'PENDING_PAYMENT', 
        createdAt: new Date().toISOString()
    };
    
    // Update Local State & UI
    REFERRED_PATIENTS.unshift(patientData); 
    pendingPatientData = patientData;
    
    form.reset();
    
    showClinicianNotification({name, matrixId});

    // Update Button Status (Success Path)
    handleReferralComplete(name, pendingPatientData, true); 
    submitButton.disabled = false;
    submitButton.textContent = 'Refer Patient';
    // --- FINAL MOCK LOGIC END ---
}

function showClinicianNotification(patient) {
    const modalEl = document.getElementById('clinician-notification-modal');
    const contentEl = document.getElementById('clinician-notification-content');
    
    contentEl.innerHTML = `
        <div class="p-6">
            <h3 class="text-2xl font-extrabold text-green-700 mb-4 flex items-center">
                <i class="fas fa-check-circle mr-3 text-green-500"></i> Referral Completed!
            </h3>
            <p class="text-gray-700 mb-4">
                The exercise prescription invitation has been successfully sent to ${patient.name} (${patient.matrixId}).
            </p>
            
            <div class="bg-gray-50 p-4 rounded-lg space-y-3 shadow-inner">
                <p class="font-semibold text-sm text-gray-700">Next Step:</p>
                <p class="text-sm text-gray-600">The patient must use their unique ID to log in and complete the payment process.</p>
            </div>
        </div>
    `;
    document.getElementById('close-clinician-notification-btn').onclick = () => handleReferralComplete(patient.name, pendingPatientData, true);
    modalEl.classList.remove('hidden');
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
    window.patientWelcomeData = null;
}

function renderAdherenceChart(data) {
    const container = document.getElementById('progress-chart-container');
    const maxVal = 3; 
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({
            key: d.toLocaleDateString('en-US').split(',')[0],
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            value: data[d.toLocaleDateString('en-US').split(',')[0]] || 0
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
    container.innerHTML = chartHTML;
}

function showDoctorProgress(patientDocId, patient) {
    const doctorProgressEl = document.getElementById('doctor-progress');
    doctorProgressEl.classList.remove('hidden');
    
    document.getElementById('close-progress').onclick = () => doctorProgressEl.classList.add('hidden');

    const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
    
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');
    
    const statusDisplay = patient.status === 'PAID' ? 'SIGNUP COMPLETE' : 'SIGNUP PENDING';

    doctorProgressEl.innerHTML = `
        <div class="flex justify-between items-center mb-4">
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
    
    document.getElementById('close-progress').onclick = () => doctorProgressEl.classList.add('hidden');

    const resultsListEl = document.getElementById('patient-results-list');
    // MOCK: RWE simulation is disabled in this version
    resultsListEl.innerHTML = '<p class="text-gray-500">RWE simulation disabled in this portable version.</p>';
    renderAdherenceChart({}); 

    switchTab('doctor'); 
}

function setupDoctorPortal() {
    const diagnosisSelect = document.getElementById('diagnosis-select');
    
    if (diagnosisSelect) {
        diagnosisSelect.innerHTML = DIAGNOSES.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } else {
        console.error("Error: Diagnosis select element not found.");
    }

    document.getElementById('referral-form').addEventListener('submit', handleReferral);
    
    const patientsListEl = document.getElementById('patients-list');
    patientsListEl.innerHTML = '';
    
    // MOCK REPLACEMENT: Iterate over local data array instead of Firestore snapshot
    if (REFERRED_PATIENTS.length === 0) {
        patientsListEl.innerHTML = '<p class="text-gray-500">No patients referred yet. Refer one above!</p>';
    } else {
        REFERRED_PATIENTS.forEach((patient, index) => {
            const diagnosisName = DIAGNOSES.find(d => d.id === patient.diagnosisId)?.name || 'N/A';
            
            let statusClass, statusText;
            if (patient.status === 'PAID') {
                statusClass = 'border-green-500';
                statusText = 'SIGNUP COMPLETE';
            } else {
                statusClass = 'border-yellow-500';
                statusText = 'SIGNUP PENDING';
            }

            const patientCard = document.createElement('div');
            patientCard.className = `card bg-white border-l-4 ${statusClass} cursor-pointer hover:bg-gray-50`;
            patientCard.innerHTML = `
                <p class="text-lg font-semibold">${patient.name}</p>
                <p class="text-sm text-gray-600">DX: ${diagnosisName}</p>
                <p class="text-xs font-bold ${patient.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}">${statusText}</p>
                <p class="text-xs text-gray-400">ID: ${patient.matrixId}</p>
            `;
            patientCard.onclick = () => showDoctorProgress(patient.matrixId, patient, diagnosis); 
            patientsListEl.appendChild(patientCard);
        });
    }
}

// MOCK FUNCTION: Simulates payment success/failure locally
async function processPaymentSimulation(patientMatrixId) {
    const patient = REFERRED_PATIENTS.find(p => p.matrixId === patientMatrixId);
    
    if (patient) {
        patient.status = 'PAID';
        patient.paidAt = new Date().toISOString();
        setupDoctorPortal(); 
        return true;
    }
    return false;
}

// MOCK FUNCTION: This function is no longer needed but kept for structure
async function handlePaymentCheck() {}

// MOCK FUNCTION: This function is no longer needed but kept for structure
async function handleSimulatePush(e) {
    const button = e.target.closest('.simulate-push-btn');
    button.textContent = 'RWE Mocked: Data Push Skipped';
    button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    button.classList.add('bg-gray-400');
    button.disabled = true;

    setTimeout(() => {
        button.disabled = false;
        button.textContent = 'TRIGGER WORKOUT DATA PUSH';
        button.classList.remove('bg-gray-400');
        button.classList.add('bg-blue-500', 'hover:bg-blue-600');
    }, 3000);
}

// MOCK FUNCTION: This function is no longer needed but kept for structure
async function initializeFirebase() {}

// MOCK FUNCTION: This function is no longer needed but kept for structure
async function seedCredentialsIfEmpty() {}

function setupPaymentForm(matrixId, patientName, type) {
    const paymentPanel = document.getElementById('payment-panel');
    
    const isHSA = type === 'hsa';
    const cardLabel = isHSA ? 'HSA/FSA Card Number' : 'Credit/Debit Card Number';
    const cardPlaceholder = isHSA ? 'XXXX XXXX XXXX XXXX' : '#### #### #### ####';
    const heading = isHSA ? 'HSA/FSA Enrollment Payment' : 'Credit/Debit Card Payment';

    paymentPanel.innerHTML = `
        <h2 class="text-2xl font-bold mb-4 text-green-700">${heading}</h2>
        <div class="alert-warning alert-card flex items-center mb-6">
            <i class="fas fa-exclamation-triangle mr-3"></i>
            This is a simulation of the payment process. No actual funds will be charged.
        </div>
        <form id="unified-payment-form" class="card bg-white p-6 space-y-4 shadow-lg">
            <input type="hidden" name="matrixId" value="${matrixId}">
            <p class="text-lg font-semibold text-gray-800 border-b pb-2">Enrollment for: <span class="text-blue-600">${patientName}</span></p>
            
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
                    <label for="expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input type="text" id="expiry-date" required pattern="(0[1-9]|1[0-2])/[0-9]{2}" title="MM/YY" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" placeholder="MM/YY">
                </div>
                <div>
                    <label for="cvv" class="block text-sm font-medium text-gray-700">CVV</label>
                    <input type="text" id="cvv" required pattern="[0-9]{3,4}" title="3 or 4 digits" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2" placeholder="123">
                </div>
            </div>
            <div class="pt-4">
                <button type="submit" class="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150">
                    Submit Payment ($99.00)
                </button>
            </div>
            <p id="payment-form-status" class="text-sm text-center text-red-600"></p>
        </form>
    `;

    document.getElementById('unified-payment-form').addEventListener('submit', handleUnifiedPaymentFormSubmit);
}

function handleUnifiedPaymentFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const matrixId = form.matrixId.value;

    const successModal = document.getElementById('payment-success-modal');
    successModal.classList.remove('hidden');

    document.getElementById('close-payment-success-btn').onclick = async () => {
        successModal.classList.add('hidden');
        
        const success = await processPaymentSimulation(matrixId);

        if (success) {
            const patient = await getPatientByMatrixId(matrixId);
            if (patient) {
                showGymReadyModal(patient);
            } else {
                switchTab('patient');
            }
        } else {
            document.getElementById('patient-status').textContent = 'Error finalizing enrollment. Please try logging in again.';
            document.getElementById('patient-status').className = 'text-red-600 mt-2';
            switchTab('patient');
        }
    };
}

function showGymReadyModal(patient) {
    const modalEl = document.getElementById('gym-ready-modal');
    const contentEl = document.getElementById('gym-ready-content');
    
    contentEl.innerHTML = `
        <div class="p-6 text-center">
            <i class="fas fa-dumbbell text-6xl text-blue-500 mb-6"></i>
            <h3 class="text-2xl font-extrabold text-gray-900 mb-4">You're Ready to Go!</h3>
            <p class="text-gray-700 mb-6">Your access is now active for **${GYM_DETAILS.name}**.</p>
            
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

    document.getElementById('close-gym-ready-btn').onclick = () => {
        modalEl.classList.add('hidden');
        switchTab('doctor');
    };
}

/**
 * Switches between the Clinician, Patient, and Payment tabs/views.
 */
function switchTab(tabName, matrixId = null, patientName = null, paymentType = null) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));

    if (tabName !== 'payment') {
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    document.getElementById(`${tabName}-panel`).classList.add('active');

    const container = document.querySelector('.app-container');
    if (tabName === 'doctor') {
        container.classList.add('doctor-view');
        document.getElementById('doctor-progress').classList.add('hidden');
        setupDoctorPortal(); 
    } else {
        container.classList.remove('doctor-view');
    }
    
    if (tabName === 'payment' && matrixId && patientName && paymentType) {
        setupPaymentForm(matrixId, patientName, paymentType);
    }
    
    if (tabName === 'patient' && window.patientWelcomeData) {
        showPatientWelcomeModal(window.patientWelcomeData);
    }
}

// --- INITIALIZATION ---
window.onload = () => {
    // 1. Skip loading message
    document.getElementById('loading-message').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');

    // 2. Mock necessary globals (These are now defined globally at the top)

    // 3. Directly run the setup functions to load the UI
    setupDoctorPortal(); 
    setupPatientPortal(); 
    
    // 4. Force display to doctor portal
    switchTab('doctor');

    console.log("MOCK DATA LAYER ENABLED: Firebase data interactions are now mocked in-memory.");
};
window.switchTab = switchTab;
window.DIAGNOSES = DIAGNOSES;