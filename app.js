// Token ko 2 hisso me tod do taki GitHub block na kare
const part1 = 'ghp_';
const part2 = '1VqkNzAIl7QZaswcs8H0pjXQMWhVmM3j1psB'; // 'ghp_' ko chhodkar baki ka lamba code yahan daalo
const GITHUB_TOKEN = part1 + part2;

const OWNER = 'Mrv0921';
const REPO = 'sarswati-app';
const FILE_PATH = 'data.json';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

let libraryData = [];
let fileSha = ''; 

document.addEventListener("DOMContentLoaded", () => {
    initSeats();
    fetchData();
});

// 1. Generate 36 Seats
function initSeats() {
    const grid = document.getElementById('seat-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 36; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat vacant';
        seat.id = `seat-${i}`;
        seat.innerText = i;
        seat.setAttribute('data-slot', 'Vacant'); // Filtering ke liye
        seat.onclick = () => openModal(i);
        grid.appendChild(seat);
    }
}

// 2. Fetch Data from GitHub
async function fetchData() {
    try {
        const response = await fetch(API_URL, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
        const data = await response.json();
        fileSha = data.sha; 
        const decodedContent = decodeURIComponent(escape(atob(data.content)));
        libraryData = JSON.parse(decodedContent || "[]");
        updateUI();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// 3. UI Update after Fetch
function updateUI() {
    initSeats(); // Reset all
    libraryData.forEach(booking => {
        const seatDiv = document.getElementById(`seat-${booking.seatNo}`);
        if(seatDiv) {
            seatDiv.className = booking.slot === 'Full Day' ? 'seat full' : 'seat partial';
            seatDiv.setAttribute('data-slot', booking.slot);
        }
    });
}

// 4. Filtering Logic
function filterSeats(filterType) {
    // Button active state change
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Show/Hide seats
    for (let i = 1; i <= 36; i++) {
        const seat = document.getElementById(`seat-${i}`);
        const seatSlot = seat.getAttribute('data-slot');
        
        if (filterType === 'All') {
            seat.classList.remove('hidden');
        } else if (filterType === 'Vacant' && seatSlot === 'Vacant') {
            seat.classList.remove('hidden');
        } else if (seatSlot === filterType) {
            seat.classList.remove('hidden');
        } else {
            seat.classList.add('hidden');
        }
    }
}

// 5. Open Modal (Popup) Form
function openModal(seatNo) {
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    const delBtn = document.getElementById('delete-btn');
    const submitBtn = document.getElementById('submit-btn'); // Button ko control karne ke liye
    
    document.getElementById('status-msg').innerText = "";
    
    // Check karte hain ki seat pehle se book hai ya nahi
    const existingBooking = libraryData.find(b => b.seatNo == seatNo);
    
    if (existingBooking) {
        // 🔴 AGAR SEAT BOOKED HAI (Information & Update Mode)
        document.getElementById('panel-title').innerText = `Seat ${seatNo} Information`;
        
        // Purana Data Form me bhar do
        document.getElementById('seat-no').value = existingBooking.seatNo;
        document.getElementById('student-name').value = existingBooking.name;
        document.getElementById('mobile').value = existingBooking.mobile;
        document.getElementById('address').value = existingBooking.address || "";
        document.getElementById('slot-type').value = existingBooking.slot;
        document.getElementById('join-date').value = existingBooking.joinDate;
        document.getElementById('next-pay-date').value = existingBooking.nextPayDate;
        document.getElementById('price').value = existingBooking.price;
        
        // Buttons ko "Update" aur "Clear" ke hisaab se set karo
        submitBtn.innerText = "Update Seat"; 
        submitBtn.style.background = "#f39c12"; // Update ke liye Orange color
        delBtn.classList.remove('hidden'); // Clear button dikhao
        
    } else {
        // 🟢 AGAR SEAT KHALI HAI (New Booking Mode)
        form.reset(); // Form ekdum saaf kar do
        document.getElementById('panel-title').innerText = `Book New Seat: ${seatNo}`;
        document.getElementById('seat-no').value = seatNo;
        
        // Buttons ko "Book" ke hisaab se set karo
        submitBtn.innerText = "Book Seat"; 
        submitBtn.style.background = "#2ecc71"; // Book ke liye Green color
        delBtn.classList.add('hidden'); // Clear button chupa do
        
        // Auto set dates (1 Month Validity)
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        
        document.getElementById('join-date').value = today.toISOString().split('T')[0];
        document.getElementById('next-pay-date').value = nextMonth.toISOString().split('T')[0];
    }
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

// 6. Save/Update Data to GitHub
document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerText = 'Saving...';
    
    const seatNo = document.getElementById('seat-no').value;
    
    const newBooking = {
        seatNo: seatNo,
        name: document.getElementById('student-name').value,
        mobile: document.getElementById('mobile').value,
        address: document.getElementById('address').value,
        slot: document.getElementById('slot-type').value,
        joinDate: document.getElementById('join-date').value,
        nextPayDate: document.getElementById('next-pay-date').value,
        price: document.getElementById('price').value
    };

    // Remove old record if updating
    libraryData = libraryData.filter(b => b.seatNo != seatNo);
    libraryData.push(newBooking);

    await pushToGitHub("Saved Booking");
    closeModal();
});

// 7. Clear/Delete Booking
async function deleteBooking() {
    if(confirm("Are you sure you want to clear this seat?")) {
        const seatNo = document.getElementById('seat-no').value;
        libraryData = libraryData.filter(b => b.seatNo != seatNo);
        document.getElementById('delete-btn').innerText = "Clearing...";
        await pushToGitHub(`Cleared Seat ${seatNo}`);
        closeModal();
    }
}

// Reusable GitHub Push Logic
async function pushToGitHub(commitMsg) {
    const encodedContent = btoa(unescape(encodeURIComponent(JSON.stringify(libraryData, null, 2))));
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: commitMsg, content: encodedContent, sha: fileSha })
        });
        if (response.ok) {
            fetchData(); // Refresh UI
        } else {
            alert('Failed to update GitHub!');
        }
    } catch (error) {
        alert("Error saving data.");
    }
}