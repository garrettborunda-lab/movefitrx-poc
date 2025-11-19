// ----------------------------------------------------------------------
// --- STABLE CONFIGURATION: Uses Mock data with fallback to Canvas ---
// ----------------------------------------------------------------------
const mockFirebaseConfig = {
    apiKey: "AIzaSy_MOCK_API_KEY_1234567890", 
    authDomain: "movefitrx-mock.firebaseapp.com",
    projectId: "movefitrx-mock",
    storageBucket: "movefitrx-mock.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnop"
};

// Attempt to use Canvas resources, fall back to mock if not defined or if key is invalid
const appId = typeof __app_id !== 'undefined' ? __app_id : mockFirebaseConfig.projectId;
const firebaseConfig = (typeof __firebase_config !== 'undefined' && JSON.parse(__firebase_config).apiKey) ? JSON.parse(__firebase_config) : mockFirebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; 

// NOTE: THESE IMPORTS MUST BE PRESENT AND ARE THE REASON FOR HTTP/S HOSTING
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, query, where, onSnapshot, orderBy, serverTimestamp, runTransaction, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let app, db, auth, userId = 'loading';
let isAuthReady = false;
let pendingPatientData = null;
setLogLevel('debug');

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

const MOCK_CREDENTIALS = [
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

const PATIENTS_COLLECTION = `artifacts/${appId}/public/data/patients`;
const RESULTS_COLLECTION = `artifacts/${appId}/public/data/results`;
const CREDENTIALS_COLLECTION = `artifacts/${appId}/public/data/credentials`;

// --- GYM LOCATION DETAILS ---
const GYM_DETAILS = {
    name: 'Coronado Fitness Club',
    address: '875 Orange Ave suite 101, Coronado, CA 92118',
    website: 'https://www.coronadofitnessclub.com/',
};

const getFormattedDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);

async function getPatientByMatrixId(matrixId) {
    try {
        // This query will now execute successfully against a live, but empty, Firestore project
        const q = query(collection(db, PATIENTS_COLLECTION), where('matrixId', '==', matrixId), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            return snapshot.docs[0].data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching patient by Matrix ID:", error);
        return null;
    }
}

function generateLMNContent(patient, diagnosis) {
    const template = `To Whom It May Concern:

**Subject: Letter of Medical Necessity for Exercise Prescription**

Date: {{date}}

To Whom It May Concern:

This letter confirms that **{{patient_name}}** is under my care and has been diagnosed with the following condition:

**Primary Diagnosis:** {{diagnosis}} (ICD-10 Code: {{diagnosis_code}})

### Medical Necessity
Due to the patient's condition, a structured, medically necessary exercise regimen is required to mitigate symptoms, prevent disease progression, and improve overall health markers.

The prescribed program, MoveFitRx, is a physical therapy and corrective exercise intervention focusing on **{{regimen_name}}** (Regimen Code: {{matrix_id}}). This specific regimen is mandatory for managing the patient's diagnosed condition and cannot be achieved through general fitness programs. The exercise equipment is essential for accurately tracking adherence and progress, providing Real-World Evidence (RWE) required for clinical oversight.

### Prescription Details
* **Provider Name:** {{doctor_name}}
* **Provider NPI:** 9876543210 (Mock NPI)
* **Prescription:** Structured exercise regimen, 3x per week for 12 weeks.
* **Cost Estimate:** The monthly membership fee (or equivalent) covers the access to the required facilities and specialized, clinically monitored exercise machines.

I have determined that participation in this program is medically necessary for the treatment of **{{diagnosis}}**. Please consider this letter a formal request to approve reimbursement for the necessary facility access and program costs under the patient’s Health Savings Account (HSA) or Flexible Spending Account (FSA).

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

/**
 * Finds the first unused credential in Firestore.
 * NOTE: THIS WILL FAIL IF NO CREDENTIALS EXIST ON THE LIVE FIREBASE PROJECT.
 */
async function getAvailableCredential() {
    // This API call is the immediate bottleneck if permissions are wrong or data is missing.
    const q = query(collection(db, CREDENTIALS_COLLECTION), where('used', '==', false), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return null;
    }
    
    const unusedCredentials = snapshot.docs.map(doc => ({
        docId: doc.id,
        data: doc.data()
    }));
    
    return unusedCredentials[0];
}

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
 * Handles the patient referral form submission using a Firestore Transaction.
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
    
    let referralSuccess = false;

    // --- CRITICAL CHANGE: HARDENING THE REFERRAL PROCESS ---
    // The previous implementation used a try...catch block which was masking 
    // the source of the failure. We must restore this to handle the async Firestore calls.
    
    try {
        const credential = await getAvailableCredential();

        if (!credential) {
            document.getElementById('referral-status').textContent = `Failure: No available Matrix/Gym credentials.`;
            document.getElementById('referral-status').className = 'text-red-600 mt-2';
            return;
        }
        
        const matrixId = credential.data.matrixId;
        const gymAccessCode = credential.data.gymAccessCode;
        const diagnosis = DIAGNOSES.find(d => d.id === diagnosisId);
        
        submitButton.textContent = 'Submitting Referral...';

        // NOTE: This transaction relies on permissions and data existing in the live database.
        await runTransaction(db, async (transaction) => {
            const credRef = doc(db, CREDENTIALS_COLLECTION, credential.docId);
            transaction.update(credRef, { 
                used: true, 
                patientName: name,
                assignedAt: serverTimestamp() 
            });

            const patientRef = doc(collection(db, PATIENTS_COLLECTION));
            const patientData = {
                name,
                email,
                diagnosisId,
                regimenName: diagnosis.regimen,
                matrixId, 
                gymAccessCode, 
                referrerId: userId,
                status: 'PENDING_PAYMENT', 
                createdAt: serverTimestamp()
            };
            transaction.set(patientRef, patientData);
            pendingPatientData = patientData;
        });
        
        form.reset();
        referralSuccess = true;
        
        showClinicianNotification({name, matrixId});

    } catch (error) {
        console.error("Error submitting referral:", error);
        // This is the error path we are currently stuck in.
        referralSuccess = false;
        handleReferralComplete(name, null, referralSuccess);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Refer Patient';
    }
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
    window.patientWelcomeData = null; // Clear data once shown
}

/**
 * Renders the adherence bar chart based on workout data.
 */
function renderAdherenceChart(data) {
    const container = document.getElementById('progress-chart-container');
    const maxVal = 3; // Target workouts per week
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
    chartHTML += `</div>`;
    
    container.innerHTML = chartHTML;
}

/**
 * Displays the detailed progress view for a selected patient in the clinician portal.
 */
function showDoctorProgress(patientDocId, patient) {
    const doctorProgressEl = document.getElementById('doctor-progress');
    doctorProgressEl.classList.remove('hidden');
    
    document.getElementById('close-progress').onclick = () => doctorProgressEl.classList.add('hidden');

    const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
    
    // JSON stringify and escape for inline use in HTML attributes
    const patientJson = JSON.stringify(patient).replace(/"/g, '&quot;');
    const diagnosisJson = JSON.stringify(diagnosis).replace(/"/g, '&quot;');
    
    const statusDisplay = patient.status === 'PAID' ? 'SIGNUP COMPLETE' : 'SIGNUP PENDING';

    // Use innerHTML to dynamically render the progress dashboard
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
    
    // Re-attach close handler
    document.getElementById('close-progress').onclick = () => doctorProgressEl.classList.add('hidden');

    const resultsListEl = document.getElementById('patient-results-list');
    // Query for Real-World Evidence (RWE) results for the specific patient
    const q = query(
        collection(db, RESULTS_COLLECTION), 
        where('patientMatrixId', '==', patient.matrixId)
    );
    
    // Listen for results in real-time
    onSnapshot(q, (snapshot) => {
        const resultsData = {};
        const resultsHtmlArray = [];

        snapshot.docs.forEach(doc => {
            const result = doc.data();
            const dateKey = getFormattedDate(result.completedAt).split(',')[0];
            
            // Adherence data for chart
            resultsData[dateKey] = (resultsData[dateKey] || 0) + 1;

            // Results list for RWE
            resultsHtmlArray.push({
                date: result.completedAt.toDate ? result.completedAt.toDate().getTime() : new Date(result.completedAt).getTime(),
                html: `
                <div class="card bg-white border-l-4 border-blue-500">
                    <p class="font-semibold">${result.exercise} - <span class="text-blue-700">${result.metrics}</span></p>
                    <p class="text-xs text-gray-500">On Machine: ${result.machine}</p>
                    <p class="text-xs text-gray-500">Completed: ${getFormattedDate(result.completedAt)}</p>
                </div>
                `
            });
        });
        
        // Sort results array by date (descending)
        resultsHtmlArray.sort((a, b) => b.date - a.date);
        
        resultsListEl.innerHTML = resultsHtmlArray.map(item => item.html).join('');
        if (snapshot.empty) {
            resultsListEl.innerHTML = '<p class="text-gray-500">No workout results received yet.</p>';
        }

        renderAdherenceChart(resultsData); // Update the chart with new data
    }, (error) => {
        console.error("Error fetching patient results: ", error);
        resultsListEl.innerHTML = '<p class="text-red-600">Error loading results.</p>';
    });
    
    switchTab('doctor'); // Ensure the doctor tab is active
}

/**
 * Sets up the clinician portal listeners and initial data fetch.
 */
function setupDoctorPortal() {
    const diagnosisSelect = document.getElementById('diagnosis-select');
    
    if (diagnosisSelect) {
        diagnosisSelect.innerHTML = DIAGNOSES.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    } else {
        console.error("Error: Diagnosis select element not found.");
    }

    document.getElementById('referral-form').addEventListener('submit', handleReferral);
    
    const patientsListEl = document.getElementById('patients-list');
    // Query for all referred patients
    const qPatients = query(collection(db, PATIENTS_COLLECTION), orderBy('createdAt', 'desc'));
    
    // Listen for patient list changes in real-time
    onSnapshot(qPatients, (snapshot) => {
        patientsListEl.innerHTML = '';
        if (snapshot.empty) {
            patientsListEl.innerHTML = '<p class="text-gray-500">No patients referred yet.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const patient = doc.data();
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
            patientCard.onclick = () => showDoctorProgress(doc.id, patient, diagnosis);
            patientsListEl.appendChild(patientCard);
        });
    }, (error) => {
        console.error("Error fetching patients: ", error);
        patientsListEl.innerHTML = '<p class="text-red-600">Error loading patient list.</p>';
    });
}

/**
 * Simulates a successful payment by updating the patient status in Firestore.
 */
async function processPaymentSimulation(patientMatrixId) {
    try {
        const q = query(collection(db, PATIENTS_COLLECTION), where('matrixId', '==', patientMatrixId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const patientDocRef = doc(db, PATIENTS_COLLECTION, snapshot.docs[0].id);
            await setDoc(patientDocRef, { status: 'PAID', paidAt: serverTimestamp() }, { merge: true });
            console.log(`Patient ${patientMatrixId} status successfully updated to PAID.`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error processing payment update:", error);
        return false;
    }
}


/**
 * Checks URL parameters for a payment success flag and updates status if found.
 */
async function handlePaymentCheck() {
    if (!isAuthReady) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const patientMatrixId = urlParams.get('id');

    if (paymentStatus === 'success' && patientMatrixId) {
        // Remove the URL parameters to prevent re-triggering the payment logic on reload
        window.history.replaceState({}, document.title, window.location.pathname); 

        const success = await processPaymentSimulation(patientMatrixId);
        
        if (success) {
            const patient = await getPatientByMatrixId(patientMatrixId);
            
            if (patient) {
                showGymReadyModal(patient);
                document.getElementById('matrix-id-input').value = patientMatrixId;
            } else {
                handlePatientLogin(null, patientMatrixId); // Fallback to prescription view
            }
        }
    }
}

/**
 * Handles patient login using their unique Matrix ID.
 */
async function handlePatientLogin(e, inputMatrixIdFromUrl = null) {
    if (e) e.preventDefault();
    const inputMatrixId = inputMatrixIdFromUrl || document.getElementById('matrix-id-input').value.trim();
    
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

    try {
        // Find patient document by matrixId
        const patient = await getPatientByMatrixId(inputMatrixId);


        if (!patient) {
            patientStatusEl.textContent = 'Invitation Code not found. Please check the code.';
            patientStatusEl.className = 'text-red-600 mt-2';
            return;
        }
        
        const diagnosis = DIAGNOSES.find(d => d.id === patient.diagnosisId);
        
        patientStatusEl.textContent = `Welcome, ${patient.name}.`;
        patientStatusEl.className = 'text-green-600 mt-2';
        patientDataEl.classList.remove('hidden');
        
        // We need the document ID for the render function, so we re-fetch the snapshot temporarily
        const qDoc = query(collection(db, PATIENTS_COLLECTION), where('matrixId', '==', inputMatrixId), limit(1));
        const snapshot = await getDocs(qDoc);

        renderPatientData(snapshot.docs[0].id, patient, diagnosis);

    } catch (error) {
        console.error("Error during patient login:", error);
        patientStatusEl.textContent = `Error accessing data. Check console for database errors.`;
        patientStatusEl.className = 'text-red-600 mt-2';
    }
}

/**
 * Simulates the Matrix equipment pushing workout data to Firestore (RWE).
 */
async function handleSimulatePush(e) {
    const button = e.target.closest('.simulate-push-btn');
    const patientMatrixId = button.dataset.patientId;
    const exercise = button.dataset.exercise;
    const machine = button.dataset.machine;
    
    if (!patientMatrixId) return;

    button.disabled = true;
    button.textContent = 'Pushing Data...';
    
    try {
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
            completedAt: serverTimestamp(),
            dataSource: 'Matrix-Validated-Result'
        };
        
        // Add the workout result to the results collection
        await setDoc(doc(collection(db, RESULTS_COLLECTION)), mockResultPayload);
        
        button.textContent = 'Data Pushed Successfully!';
        button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        button.classList.add('bg-green-500');
        
    } catch (error) {
        console.error("Error pushing data:", error);
        button.textContent = 'Error Pushing Data';
        button.classList.add('bg-red-500');
    }
    
    // Reset button state after a delay
    setTimeout(() => {
        button.disabled = false;
        button.textContent = 'TRIGGER WORKOUT DATA PUSH';
        button.classList.remove('bg-green-500', 'bg-red-500');
        button.classList.add('bg-blue-500', 'hover:bg-blue-600');
    }, 3000);
}

/**
 * Initializes Firebase and sets up authentication listeners.
 */
async function initializeFirebase() {
    document.getElementById('loading-message').classList.remove('hidden');
    document.getElementById('content').classList.add('hidden');

    try {
        const firebaseConfigToUse = firebaseConfig;
        const initialAuthTokenToUse = initialAuthToken; 

        if (Object.keys(firebaseConfigToUse).length === 0 || !firebaseConfigToUse.projectId) {
            console.error("Critical: Firebase config missing or invalid.");
            document.getElementById('content').innerHTML = '<p class="text-red-600 p-4">Error: Firebase configuration missing. Cannot run demo.</p>';
            return;
        }
        app = initializeApp(firebaseConfigToUse);
        db = getFirestore(app);
        auth = getAuth(app);
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Authenticated as:", userId);
                
                try {
                    // Seed credentials if the collection is empty
                    await seedCredentialsIfEmpty(); 
                } catch (e) {
                    console.error("CRITICAL: Failed to seed credentials. Referral will fail.", e);
                }
                
                setupDoctorPortal(); 
                setupPatientPortal(); 
                
                await handlePaymentCheck(); // Check for URL payment success
                
                document.getElementById('loading-message').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } else {
                // Sign in if a token is available, otherwise sign in anonymously
                if (initialAuthTokenToUse) {
                    await signInWithCustomToken(auth, initialAuthTokenToUse);
                } else {
                    await signInAnonymously(auth);
                }
            }
        });
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        document.getElementById('loading-message').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
        document.getElementById('doctor-panel').innerHTML = `<p class="text-red-600 p-4">Error initializing Firebase: ${error.message}. Check console for details.</p>`;
    }
}

/**
 * Seeds the mock credentials collection if it is empty.
 */
async function seedCredentialsIfEmpty() {
    try {
        const q = query(collection(db, CREDENTIALS_COLLECTION), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("Seeding mock credentials...");
            await Promise.all(MOCK_CREDENTIALS.map(cred => 
                setDoc(doc(db, CREDENTIALS_COLLECTION, cred.matrixId), cred)
            ));
            console.log("Credentials seeded successfully.");
        }
    } catch (error) {
        console.error("FATAL ERROR during credential seeding:", error);
        throw new Error("Credential seeding failed.");
    }
}

/**
 * Switches between the Clinician, Patient, and Payment tabs/views.
 */
function switchTab(tabName, matrixId = null, patientName = null, paymentType = null) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));

    // The payment panel doesn't have a header button, so we handle active class differently
    if (tabName !== 'payment') {
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    document.getElementById(`${tabName}-panel`).classList.add('active');

    const container = document.querySelector('.app-container');
    if (tabName === 'doctor') {
        container.classList.add('doctor-view');
        // Hide patient progress view when switching back to main doctor list
        document.getElementById('doctor-progress').classList.add('hidden'); 
    } else {
        container.classList.remove('doctor-view');
    }
    
    // Setup the payment form context if switching to payment
    if (tabName === 'payment' && matrixId && patientName && paymentType) {
        setupPaymentForm(matrixId, patientName, paymentType);
    }
    
    // Show the welcome modal if referral data is pending and we switch to patient view
    if (tabName === 'patient' && window.patientWelcomeData) {
        showPatientWelcomeModal(window.patientWelcomeData);
    }
}

window.onload = () => {
    // 1. Skip loading message
    document.getElementById('loading-message').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');

    // 2. Mock necessary globals (userId, isAuthReady)
    userId = 'MOCK_USER_ID';
    isAuthReady = true;

    // 3. Directly run the setup functions to load the UI
    setupDoctorPortal(); 
    setupPatientPortal(); 
    
    // 4. Force display to doctor portal if that's the intended default
    switchTab('doctor');

    console.log("DIAGNOSTIC MODE: Firebase initialization was bypassed.");
};
window.switchTab = switchTab;
window.DIAGNOSES = DIAGNOSES;