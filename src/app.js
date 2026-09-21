import { STREAMS_DATA } from './data/courses.js';
import { INITIAL_COLLEGES } from './data/initialData.js';

// Local storage keys
const STORAGE_KEY = 'robuverse_colleges_v1';
const CUSTOM_COURSES_KEY = 'robuverse_custom_courses_v1';

// Application State
let colleges = [];
let activeStream = 'Science';
let currentFormCourses = []; // [{ stream: 'Science', name: 'MBBS' }, ...]
let deleteTargetId = null;
let customCourses = {
  Science: [],
  Commerce: [],
  Humanities: []
};

// DOM Element References
const collegesGrid = document.getElementById('collegesGrid');
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');

// Stats Elements
const statCollegesCount = document.getElementById('statCollegesCount');
const statCoursesCount = document.getElementById('statCoursesCount');
const statScienceCount = document.getElementById('statScienceCount');
const statCommerceCount = document.getElementById('statCommerceCount');
const statHumanitiesCount = document.getElementById('statHumanitiesCount');

// Add/Edit Modal Elements
const collegeModal = document.getElementById('collegeModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const addCollegeBtn = document.getElementById('addCollegeBtn');
const collegeForm = document.getElementById('collegeForm');
const modalTitleText = document.getElementById('modalTitleText');
const editingCollegeId = document.getElementById('editingCollegeId');
const collegeNameInput = document.getElementById('collegeName');
const collegeCityInput = document.getElementById('collegeCity');
const coursesCheckboxGrid = document.getElementById('coursesCheckboxGrid');
const currentStreamDescription = document.getElementById('currentStreamDescription');
const selectAllStreamBtn = document.getElementById('selectAllStreamBtn');
const clearStreamBtn = document.getElementById('clearStreamBtn');
const customCourseInput = document.getElementById('customCourseInput');
const addCustomCourseBtn = document.getElementById('addCustomCourseBtn');

// Stream Tabs & Badges
const streamTabBtns = document.querySelectorAll('.stream-tab-btn');
const badgeScienceCount = document.getElementById('badgeScienceCount');
const badgeCommerceCount = document.getElementById('badgeCommerceCount');
const badgeHumanitiesCount = document.getElementById('badgeHumanitiesCount');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteCollegeName = document.getElementById('deleteCollegeName');

// Import Modal Elements
const importModal = document.getElementById('importModal');
const importBtn = document.getElementById('importBtn');
const importModalCloseBtn = document.getElementById('importModalCloseBtn');
const importCancelBtn = document.getElementById('importCancelBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');
const dropzoneArea = document.getElementById('dropzoneArea');
const fileInput = document.getElementById('fileInput');
const pasteJsonInput = document.getElementById('pasteJsonInput');
const importMergeCheckbox = document.getElementById('importMergeCheckbox');

// Export & JSON Preview Modal Elements
const exportBtn = document.getElementById('exportBtn');
const viewJsonBtn = document.getElementById('viewJsonBtn');
const jsonPreviewModal = document.getElementById('jsonPreviewModal');
const jsonPreviewCloseBtn = document.getElementById('jsonPreviewCloseBtn');
const jsonCodePreview = document.getElementById('jsonCodePreview');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// --- Helper Functions ---

/** Generate URL-safe slug from string */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Show Toast Notification */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconSvg = type === 'success'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/** Save colleges to LocalStorage */
function saveCollegesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colleges, null, 2));
  updateStats();
}

/** Load colleges from LocalStorage or Initial Seed Data */
function loadColleges() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      colleges = JSON.parse(rawData);
    } else {
      colleges = JSON.parse(JSON.stringify(INITIAL_COLLEGES));
      saveCollegesToStorage();
    }
  } catch (err) {
    console.error('Failed to parse colleges from localStorage:', err);
    colleges = JSON.parse(JSON.stringify(INITIAL_COLLEGES));
  }

  try {
    const customData = localStorage.getItem(CUSTOM_COURSES_KEY);
    if (customData) {
      customCourses = JSON.parse(customData);
    }
  } catch (err) {
    console.error('Failed to parse custom courses:', err);
  }
}

/** Save custom courses */
function saveCustomCourses() {
  localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(customCourses));
}

/** Update Live Statistics in the Header */
function updateStats() {
  const totalColleges = colleges.length;
  let totalCourses = 0;
  let scienceCourses = 0;
  let commerceCourses = 0;
  let humanitiesCourses = 0;

  colleges.forEach(col => {
    if (Array.isArray(col.courses)) {
      totalCourses += col.courses.length;
      col.courses.forEach(c => {
        if (c.stream === 'Science') scienceCourses++;
        else if (c.stream === 'Commerce') commerceCourses++;
        else if (c.stream === 'Humanities') humanitiesCourses++;
      });
    }
  });

  statCollegesCount.textContent = totalColleges;
  statCoursesCount.textContent = totalCourses;
  statScienceCount.textContent = scienceCourses;
  statCommerceCount.textContent = commerceCourses;
  statHumanitiesCount.textContent = humanitiesCourses;
}

/** Render list of college cards */
function renderColleges(filterQuery = '') {
  collegesGrid.innerHTML = '';

  const query = filterQuery.toLowerCase().trim();

  const filteredColleges = colleges.filter(college => {
    if (!query) return true;
    const nameMatches = college.name.toLowerCase().includes(query);
    const cityMatches = college.city.toLowerCase().includes(query);
    const idMatches = (college.id || '').toLowerCase().includes(query);
    const courseMatches = (college.courses || []).some(
      c => c.name.toLowerCase().includes(query) || c.stream.toLowerCase().includes(query)
    );
    return nameMatches || cityMatches || idMatches || courseMatches;
  });

  if (filteredColleges.length === 0) {
    collegesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3>No colleges found</h3>
        <p>${query ? `No matching results for "${query}". Try searching another name, city, or stream.` : 'Your college database is empty. Click "+ Add College" or "Import JSON" to get started.'}</p>
        ${!query ? `<button class="btn btn-primary" onclick="document.getElementById('addCollegeBtn').click()" style="margin-top: 0.5rem;">+ Add College</button>` : ''}
      </div>
    `;
    return;
  }

  filteredColleges.forEach(college => {
    const card = document.createElement('article');
    card.className = 'college-card';
    card.setAttribute('data-id', college.id);

    // Group courses by stream
    const streamGroups = {
      Science: [],
      Commerce: [],
      Humanities: []
    };

    (college.courses || []).forEach(course => {
      if (streamGroups[course.stream]) {
        streamGroups[course.stream].push(course.name);
      } else {
        if (!streamGroups[course.stream]) streamGroups[course.stream] = [];
        streamGroups[course.stream].push(course.name);
      }
    });

    let streamGroupsHtml = '';
    const streamsWithCourses = Object.keys(streamGroups).filter(s => streamGroups[s].length > 0);

    if (streamsWithCourses.length === 0) {
      streamGroupsHtml = `<div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">No courses assigned</div>`;
    } else {
      streamsWithCourses.forEach(stream => {
        const courseNames = streamGroups[stream];
        streamGroupsHtml += `
          <div class="stream-group">
            <div class="stream-header">
              <div class="stream-title">
                <span class="stream-dot ${stream}"></span>
                <span>${stream}</span>
              </div>
              <span class="stream-count">${courseNames.length} Course${courseNames.length > 1 ? 's' : ''}</span>
            </div>
            <div class="course-badges-wrap">
              ${courseNames.map(cName => `<span class="course-pill ${stream}">${cName}</span>`).join('')}
            </div>
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-group">
          <h2 class="college-name">${college.name}</h2>
          <div class="city-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${college.city}</span>
          </div>
        </div>
        <span class="card-id-pill" title="Identifier: ${college.id}">${college.id}</span>
      </div>

      <div class="card-streams-section">
        ${streamGroupsHtml}
      </div>

      <div class="card-actions">
        <button class="btn btn-secondary btn-card-action edit-btn" data-id="${college.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
        <button class="btn btn-danger btn-card-action delete-btn" data-id="${college.id}" data-name="${college.name}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      </div>
    `;

    collegesGrid.appendChild(card);
  });

  // Attach Event Listeners to Edit and Delete Buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeleteModal(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
    });
  });
}

// --- Add / Edit Modal Controller ---

function updateFormTabBadges() {
  const scienceCount = currentFormCourses.filter(c => c.stream === 'Science').length;
  const commerceCount = currentFormCourses.filter(c => c.stream === 'Commerce').length;
  const humanitiesCount = currentFormCourses.filter(c => c.stream === 'Humanities').length;

  badgeScienceCount.textContent = scienceCount;
  badgeCommerceCount.textContent = commerceCount;
  badgeHumanitiesCount.textContent = humanitiesCount;
}

function getAllCoursesForStream(stream) {
  const defaultList = STREAMS_DATA[stream] || [];
  const customList = customCourses[stream] || [];
  return Array.from(new Set([...defaultList, ...customList]));
}

function renderCourseCheckboxes() {
  coursesCheckboxGrid.innerHTML = '';
  currentStreamDescription.textContent = `${activeStream} Courses (Multi-select)`;

  const availableCourses = getAllCoursesForStream(activeStream);

  availableCourses.forEach(courseName => {
    const isChecked = currentFormCourses.some(
      c => c.stream === activeStream && c.name === courseName
    );

    const label = document.createElement('label');
    label.className = `course-checkbox-label ${isChecked ? 'checked' : ''}`;

    label.innerHTML = `
      <div class="custom-checkbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>${courseName}</span>
    `;

    label.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCourse(activeStream, courseName);
    });

    coursesCheckboxGrid.appendChild(label);
  });

  updateFormTabBadges();
}

function toggleCourse(stream, courseName) {
  const existingIdx = currentFormCourses.findIndex(
    c => c.stream === stream && c.name === courseName
  );

  if (existingIdx >= 0) {
    currentFormCourses.splice(existingIdx, 1);
  } else {
    currentFormCourses.push({ stream, name: courseName });
  }

  renderCourseCheckboxes();
}

function openAddModal() {
  modalTitleText.textContent = 'Add New College';
  editingCollegeId.value = '';
  collegeNameInput.value = '';
  collegeCityInput.value = '';
  currentFormCourses = [];
  activeStream = 'Science';

  setActiveTab('Science');
  renderCourseCheckboxes();
  collegeModal.classList.add('active');
  collegeNameInput.focus();
}

function openEditModal(collegeId) {
  const target = colleges.find(c => c.id === collegeId);
  if (!target) return;

  modalTitleText.textContent = 'Edit College';
  editingCollegeId.value = target.id;
  collegeNameInput.value = target.name;
  collegeCityInput.value = target.city;
  currentFormCourses = JSON.parse(JSON.stringify(target.courses || []));

  // If the college only has commerce or humanities, switch to that tab automatically
  if (currentFormCourses.length > 0) {
    const streamsPresent = Array.from(new Set(currentFormCourses.map(c => c.stream)));
    if (streamsPresent.length === 1) {
      activeStream = streamsPresent[0];
    } else {
      activeStream = 'Science';
    }
  } else {
    activeStream = 'Science';
  }

  setActiveTab(activeStream);
  renderCourseCheckboxes();
  collegeModal.classList.add('active');
  collegeNameInput.focus();
}

function closeCollegeModal() {
  collegeModal.classList.remove('active');
}

function setActiveTab(streamName) {
  activeStream = streamName;
  streamTabBtns.forEach(btn => {
    if (btn.getAttribute('data-stream') === streamName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderCourseCheckboxes();
}

// Stream tab clicking
streamTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    setActiveTab(btn.getAttribute('data-stream'));
  });
});

// Select All Courses in Current Stream
selectAllStreamBtn.addEventListener('click', () => {
  const allStreamCourses = getAllCoursesForStream(activeStream);
  allStreamCourses.forEach(cName => {
    const exists = currentFormCourses.some(c => c.stream === activeStream && c.name === cName);
    if (!exists) {
      currentFormCourses.push({ stream: activeStream, name: cName });
    }
  });
  renderCourseCheckboxes();
});

// Clear All Courses in Current Stream
clearStreamBtn.addEventListener('click', () => {
  currentFormCourses = currentFormCourses.filter(c => c.stream !== activeStream);
  renderCourseCheckboxes();
});

// Add Custom Course
addCustomCourseBtn.addEventListener('click', () => {
  const courseName = customCourseInput.value.trim();
  if (!courseName) return;

  if (!customCourses[activeStream]) customCourses[activeStream] = [];
  if (!customCourses[activeStream].includes(courseName)) {
    customCourses[activeStream].push(courseName);
    saveCustomCourses();
  }

  // Also auto-select it
  if (!currentFormCourses.some(c => c.stream === activeStream && c.name === courseName)) {
    currentFormCourses.push({ stream: activeStream, name: courseName });
  }

  customCourseInput.value = '';
  renderCourseCheckboxes();
  showToast(`Added "${courseName}" to ${activeStream}`);
});

customCourseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCustomCourseBtn.click();
  }
});

// Save College Form Submit
collegeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = collegeNameInput.value.trim();
  const city = collegeCityInput.value.trim();
  const editId = editingCollegeId.value;

  if (!name || !city) {
    showToast('Please fill in both College Name and City', 'error');
    return;
  }

  if (currentFormCourses.length === 0) {
    if (!confirm('No courses are selected for this college. Are you sure you want to save without courses?')) {
      return;
    }
  }

  if (editId) {
    // Update existing college
    const collegeIndex = colleges.findIndex(c => c.id === editId);
    if (collegeIndex >= 0) {
      colleges[collegeIndex].name = name;
      colleges[collegeIndex].city = city;
      colleges[collegeIndex].courses = JSON.parse(JSON.stringify(currentFormCourses));
      showToast(`Updated "${name}" successfully!`);
    }
  } else {
    // Add new college
    let newId = slugify(name);
    // Ensure unique ID
    let suffix = 1;
    while (colleges.some(c => c.id === newId)) {
      newId = `${slugify(name)}-${suffix++}`;
    }

    colleges.unshift({
      id: newId,
      name,
      city,
      courses: JSON.parse(JSON.stringify(currentFormCourses))
    });
    showToast(`Added "${name}" successfully!`);
  }

  saveCollegesToStorage();
  closeCollegeModal();
  renderColleges(searchInput.value);
});

// Modal close button bindings
modalCloseBtn.addEventListener('click', closeCollegeModal);
modalCancelBtn.addEventListener('click', closeCollegeModal);
addCollegeBtn.addEventListener('click', openAddModal);

// Close modal when clicking outside container
collegeModal.addEventListener('click', (e) => {
  if (e.target === collegeModal) closeCollegeModal();
});

// --- Delete Modal Controller ---

function openDeleteModal(id, name) {
  deleteTargetId = id;
  deleteCollegeName.textContent = name;
  deleteModal.classList.add('active');
}

function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deleteTargetId = null;
}

deleteModalCloseBtn.addEventListener('click', closeDeleteModal);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn.addEventListener('click', () => {
  if (!deleteTargetId) return;

  const targetCollege = colleges.find(c => c.id === deleteTargetId);
  const collegeName = targetCollege ? targetCollege.name : 'College';

  colleges = colleges.filter(c => c.id !== deleteTargetId);
  saveCollegesToStorage();
  closeDeleteModal();
  renderColleges(searchInput.value);
  showToast(`Deleted "${collegeName}"`, 'success');
});

// --- Export JSON & Preview ---

function generateCollegesJsonString() {
  // Ensure clean format according to specification:
  // [{ id, name, city, courses: [{ stream, name }] }]
  const cleanExport = colleges.map(c => ({
    id: c.id || slugify(c.name),
    name: c.name,
    city: c.city,
    courses: (c.courses || []).map(course => ({
      stream: course.stream,
      name: course.name
    }))
  }));

  return JSON.stringify(cleanExport, null, 2);
}

function triggerDownloadJson() {
  const jsonStr = generateCollegesJsonString();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'colleges.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('colleges.json exported successfully!');
}

exportBtn.addEventListener('click', triggerDownloadJson);

// View JSON Modal
viewJsonBtn.addEventListener('click', () => {
  jsonCodePreview.textContent = generateCollegesJsonString();
  jsonPreviewModal.classList.add('active');
});

jsonPreviewCloseBtn.addEventListener('click', () => {
  jsonPreviewModal.classList.remove('active');
});

jsonPreviewModal.addEventListener('click', (e) => {
  if (e.target === jsonPreviewModal) jsonPreviewModal.classList.remove('active');
});

copyJsonBtn.addEventListener('click', async () => {
  const jsonStr = generateCollegesJsonString();
  try {
    await navigator.clipboard.writeText(jsonStr);
    showToast('JSON copied to clipboard!');
  } catch (err) {
    showToast('Failed to copy to clipboard', 'error');
  }
});

downloadJsonBtn.addEventListener('click', () => {
  triggerDownloadJson();
  jsonPreviewModal.classList.remove('active');
});

// --- Import JSON Modal Controller ---

function openImportModal() {
  pasteJsonInput.value = '';
  importMergeCheckbox.checked = false;
  importModal.classList.add('active');
}

function closeImportModal() {
  importModal.classList.remove('active');
}

importBtn.addEventListener('click', openImportModal);
importModalCloseBtn.addEventListener('click', closeImportModal);
importCancelBtn.addEventListener('click', closeImportModal);
importModal.addEventListener('click', (e) => {
  if (e.target === importModal) closeImportModal();
});

// Drag & drop dropzone
dropzoneArea.addEventListener('click', () => fileInput.click());

dropzoneArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzoneArea.classList.add('dragover');
});

dropzoneArea.addEventListener('dragleave', () => {
  dropzoneArea.classList.remove('dragover');
});

dropzoneArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzoneArea.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFileImport(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFileImport(e.target.files[0]);
  }
});

function handleFileImport(file) {
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showToast('Please upload a valid .json file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    pasteJsonInput.value = e.target.result;
    showToast(`Loaded file: ${file.name}`);
  };
  reader.readAsText(file);
}

confirmImportBtn.addEventListener('click', () => {
  const rawText = pasteJsonInput.value.trim();
  if (!rawText) {
    showToast('Please provide a JSON file or paste JSON content', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(rawText);

    if (!Array.isArray(parsed)) {
      throw new Error('Imported JSON must be an array of colleges [ ... ]');
    }

    // Validate and sanitize records
    const sanitizedColleges = parsed.map((item, index) => {
      if (!item.name || !item.city) {
        throw new Error(`Item #${index + 1} is missing required "name" or "city" field.`);
      }

      return {
        id: item.id || slugify(item.name),
        name: String(item.name).trim(),
        city: String(item.city).trim(),
        courses: Array.isArray(item.courses)
          ? item.courses.map(c => ({
              stream: String(c.stream || 'Science'),
              name: String(c.name || '').trim()
            })).filter(c => c.name.length > 0)
          : []
      };
    });

    const isMerge = importMergeCheckbox.checked;

    if (isMerge) {
      // Merge: Update existing if id matches, otherwise append
      sanitizedColleges.forEach(newCol => {
        const existingIdx = colleges.findIndex(c => c.id === newCol.id);
        if (existingIdx >= 0) {
          colleges[existingIdx] = newCol;
        } else {
          colleges.push(newCol);
        }
      });
      showToast(`Merged ${sanitizedColleges.length} colleges successfully!`);
    } else {
      // Replace
      colleges = sanitizedColleges;
      showToast(`Imported ${sanitizedColleges.length} colleges successfully!`);
    }

    saveCollegesToStorage();
    closeImportModal();
    renderColleges(searchInput.value);
  } catch (err) {
    console.error('Import Error:', err);
    showToast(`Import Failed: ${err.message}`, 'error');
  }
});

// --- Search Filter Controller ---

searchInput.addEventListener('input', (e) => {
  const val = e.target.value;
  searchClearBtn.style.display = val ? 'block' : 'none';
  renderColleges(val);
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  renderColleges('');
  searchInput.focus();
});

// Keyboard shortcuts (Escape closes modals)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCollegeModal();
    closeDeleteModal();
    closeImportModal();
    jsonPreviewModal.classList.remove('active');
  }
});

// --- Initialization ---

function init() {
  loadColleges();
  updateStats();
  renderColleges();
}

init();
