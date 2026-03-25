const imageGrid = document.getElementById('imageGrid')
const cards = Array.from(document.querySelectorAll('.card'))
const categoryFilter = document.getElementById('categoryFilter')
const categoryFilterBtn = document.getElementById('categoryFilterBtn')
const categoryFilterDropdown = document.getElementById('categoryFilterDropdown')
const stateFilter = document.getElementById('stateFilter')
const stateFilterBtn = document.getElementById('stateFilterBtn')
const stateFilterDropdown = document.getElementById('stateFilterDropdown')
const displayFilter = document.getElementById('displayFilter')
const displayFilterBtn = document.getElementById('displayFilterBtn')
const displayFilterDropdown = document.getElementById('displayFilterDropdown')
const filenameSearch = document.getElementById('filenameSearch')
const sortOrder = document.getElementById('sortOrder')
const sortOrderBtn = document.getElementById('sortOrderBtn')
const sortOrderDropdown = document.getElementById('sortOrderDropdown')
const sortDirection = document.getElementById('sortDirection')
const summaryToggle = document.getElementById('summaryToggle')
const summaryBar = document.getElementById('summaryBar')
const recordCount = document.getElementById('recordCount')

const categoryOrder = [
  'Tour of Honor',
  'Madonna Trail',
  'Doughboys',
  'War Dogs / K9',
  'Hueys',
  'Gold Star Family',
  '9/11',
  'Merci Train',
  'Cemetery',
  'Statue of Liberty',
  'Other',
]
const categoryRank = new Map(categoryOrder.map((c, i) => [c.toLowerCase(), i]))
const getCategoryRank = (cat) => categoryRank.get(cat.toLowerCase()) ?? 999

let sortAscending = true

function applyFilters() {
  const category = categoryFilter.value.toLowerCase()
  const state = stateFilter.value.toLowerCase()
  const display = displayFilter.value.toLowerCase()
  const search = filenameSearch.value.trim().toLowerCase()
  const sort = sortOrder.value

  let visibleCards = []

  cards.forEach(card => {
    const c = card.dataset.category || ''
    const s = card.dataset.state || ''
    const status = card.dataset.status || 'inactive'
    const city = card.dataset.city || ''
    const file = card.dataset.filename || ''

    let show = true

    if (category && c !== category) show = false
    if (state && s !== state) show = false
    if (display === 'active' && status !== 'active') show = false
    if (search && !file.includes(search) && !city.includes(search)) show = false

    card.classList.toggle('hidden', !show)
    if (show) visibleCards.push(card)
  })

  if (sort === 'city') {
    visibleCards.sort((a, b) => {
      const categoryA = a.dataset.category || ''
      const categoryB = b.dataset.category || ''
      const rankA = getCategoryRank(categoryA)
      const rankB = getCategoryRank(categoryB)
      if (rankA !== rankB) return sortAscending ? rankA - rankB : rankB - rankA

      const cityA = a.dataset.city || ''
      const cityB = b.dataset.city || ''
      const fileA = a.dataset.filename || ''
      const fileB = b.dataset.filename || ''

      let result = cityA.localeCompare(cityB)
      if (result === 0) {
        result = fileA.localeCompare(fileB, undefined, { numeric: true })
      }
      return sortAscending ? result : -result
    })
  } else {
    visibleCards.sort((a, b) => {
      const categoryA = a.dataset.category || ''
      const categoryB = b.dataset.category || ''
      const rankA = getCategoryRank(categoryA)
      const rankB = getCategoryRank(categoryB)
      if (rankA !== rankB) return sortAscending ? rankA - rankB : rankB - rankA

      const fileA = a.dataset.filename || ''
      const fileB = b.dataset.filename || ''
      const result = fileA.localeCompare(fileB, undefined, { numeric: true })
      return sortAscending ? result : -result
    })
  }

  visibleCards.forEach(card => imageGrid.appendChild(card))
  recordCount.textContent = `${visibleCards.length.toLocaleString()} of ${cards.length.toLocaleString()} image(s)`
}

function resetFilters() {
  categoryFilter.value = ''
  categoryFilterBtn.textContent = 'All Categories'
  stateFilter.value = ''
  stateFilterBtn.textContent = 'All States'
  displayFilter.value = 'active'
  displayFilterBtn.textContent = 'Active Only'
  sortOrder.value = 'memorial'
  sortOrderBtn.textContent = 'Memorial ID'
  sortDirection.innerHTML = '&#9650;'
  sortDirection.title = 'Ascending'
  sortAscending = true
  filenameSearch.value = ''
  document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'))
  applyFilters()
}

function exportToCSV() {
  const visibleCards = cards.filter(card => !card.classList.contains('hidden'))
  if (visibleCards.length === 0) {
    alert('No visible images to export.')
    return
  }

  const csvRows = ['Memorial Code,Filename,Category,State,City,Status']
  visibleCards.forEach(card => {
    const memorialCode = card.dataset.memorialCode || ''
    const filename = card.dataset.filename || ''
    const category = card.dataset.categoryOriginal || ''
    const state = card.dataset.stateOriginal || ''
    const city = card.dataset.cityOriginal || ''
    const status = card.dataset.status || ''
    csvRows.push(`"${memorialCode}","${filename}","${category}","${state}","${city}","${status}"`)
  })

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'filtered_memorial_images.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Custom select functionality - helper function
function setupCustomSelect(btnEl, dropdownEl, hiddenInputEl, defaultText) {
  btnEl.addEventListener('click', (e) => {
    e.stopPropagation()
    // Close other dropdowns
    document.querySelectorAll('.custom-select-dropdown.open').forEach(d => {
      if (d !== dropdownEl) d.classList.remove('open')
    })
    // Only toggle if we didn't just select an option
    if (btnEl.dataset.justSelected !== 'true') {
      dropdownEl.classList.toggle('open')
    }
    btnEl.dataset.justSelected = 'false'
  })

  document.addEventListener('click', (e) => {
    if (!btnEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.remove('open')
    }
  })

  dropdownEl.addEventListener('click', (e) => {
    const option = e.target.closest('.custom-select-option')
    if (!option) return

    e.stopPropagation()

    const value = option.dataset.value
    const text = option.textContent
    hiddenInputEl.value = value
    btnEl.textContent = text
    // Mark that we just selected, then close and apply filters
    btnEl.dataset.justSelected = 'true'
    dropdownEl.classList.remove('open')
    applyFilters()
  })
}

// Setup all custom selects
setupCustomSelect(categoryFilterBtn, categoryFilterDropdown, categoryFilter, 'All Categories')
setupCustomSelect(stateFilterBtn, stateFilterDropdown, stateFilter, 'All States')
setupCustomSelect(displayFilterBtn, displayFilterDropdown, displayFilter, 'Active Only')
setupCustomSelect(sortOrderBtn, sortOrderDropdown, sortOrder, 'Memorial ID')

filenameSearch.addEventListener('input', applyFilters)

document.getElementById('refreshButton').addEventListener('click', resetFilters);
document.getElementById('toTopButton').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
});
document.getElementById('exportButton').addEventListener('click', exportToCSV);
sortDirection.addEventListener('click', () => {
  sortAscending = !sortAscending
  sortDirection.innerHTML = sortAscending ? '&#9650;' : '&#9660;'
  sortDirection.title = sortAscending ? 'Ascending' : 'Descending'
  applyFilters()
})

summaryToggle.addEventListener('click', () => {
  const isCollapsed = summaryBar.classList.toggle('collapsed')
  summaryToggle.innerHTML = isCollapsed ? '&#9662;' : '&#9652;'
  summaryToggle.setAttribute('aria-expanded', String(!isCollapsed))
  summaryToggle.title = isCollapsed ? 'Show Stats' : 'Hide Stats'
})

applyFilters()