import { useEffect, useMemo, useState } from 'react'
import './Dashboard.css'

const statusOptions = ['PRESENT', 'LATE', 'ABSENT', 'REMOTE']
const emptyStudent = { name: '', studentId: '', role: '', department: '', email: '', phone: '', status: 'PRESENT' }
const today = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function App({ account, onLogout }) {
  const [students, setStudents] = useState([])
  const [view, setView] = useState(account.role === 'ADMIN' ? 'admin' : 'students')
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyStudent)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function loadStudents() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/attendance')
      if (!response.ok) throw new Error()
      const data = await response.json()
      setStudents(data)
      setSelectedId((current) => current ?? data[0]?.id ?? null)
    } catch {
      setError('Attendance service is unavailable. Please check the backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/attendance', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error()))
      .then((data) => {
        if (!cancelled) {
          setStudents(data)
          setSelectedId(data[0]?.id ?? null)
        }
      })
      .catch(() => { if (!cancelled) setError('Attendance service is unavailable. Please check the backend connection.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const counts = useMemo(() => Object.fromEntries(statusOptions.map((status) => [status, students.filter((student) => student.status === status).length])), [students])
  const visible = useMemo(() => students.filter((student) => {
    const matchesFilter = filter === 'ALL' || student.status === filter
    const haystack = `${student.name} ${student.role} ${student.department} ${student.studentId ?? ''}`.toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  }), [filter, query, students])
  const selected = account.role === 'STUDENT'
    ? students.find((student) => student.studentId?.toUpperCase() === account.studentId?.toUpperCase()) ?? students[0]
    : students.find((student) => student.id === selectedId) ?? students[0]
  const attendance = students.length ? Math.round(((counts.PRESENT + counts.LATE + counts.REMOTE) / students.length) * 100) : 0

  async function updateStatus(id, status) {
    setError('')
    try {
      const response = await fetch(`/api/attendance/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!response.ok) throw new Error()
      const updated = await response.json()
      setStudents((current) => current.map((student) => student.id === id ? updated : student))
      setNotice('Attendance updated')
    } catch {
      setError('Could not update attendance. Please try again.')
    }
  }

  async function addStudent(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/attendance', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        id: 0,
        name: form.name,
        role: form.role,
        department: form.department,
        status: form.status,
        checkIn: form.status === 'REMOTE' ? 'Remote' : form.status === 'ABSENT' ? '—' : '—',
        initials: initials(form.name),
        teamColor: ['blue', 'gold', 'rose', 'violet', 'sage'][students.length % 5],
        studentId: form.studentId,
        email: form.email,
        phone: form.phone,
      }) })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Could not add student')
      }
      const student = await response.json()
      setStudents((current) => [...current, student])
      setSelectedId(student.id)
      setForm(emptyStudent)
      setModalOpen(false)
      setNotice(`${student.name} was added to the register`)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }

  const exportReport = () => {
    const rows = [['Student ID', 'Name', 'Course', 'Department', 'Status', 'Check-in'], ...visible.map((student) => [student.studentId, student.name, student.role, student.department, student.status, student.checkIn])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'smart-attendance.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="sa-app">
      <aside className="sa-sidebar">
        <div className="sa-brand"><span className="brand-symbol">SA</span><div><strong>SmartAttend</strong><small>Campus register</small></div></div>
        <nav aria-label="Primary">
          <button className={view === 'admin' ? 'side-link active' : 'side-link'} onClick={() => setView('admin')}><span>⌂</span> Dashboard</button>
          <button className={view === 'students' ? 'side-link active' : 'side-link'} onClick={() => setView('students')}><span>◎</span> Students</button>
          <button className="side-link" onClick={() => setSelectedId(selected?.id)}><span>◫</span> Student profile</button>
        </nav>
        <div className="sidebar-callout"><span>Friday review</span><strong>4 check-ins need attention</strong><div className="review-track"><i /></div></div>
        <div className="admin-card"><span className="admin-avatar">AD</span><div><strong>{account.name}</strong><small>{account.role === 'ADMIN' ? 'Administrator' : 'Student'}</small></div><button onClick={onLogout} aria-label="Sign out" title="Sign out">↪</button></div>
      </aside>

      <main>
        <header className="sa-header">
          <div><span className="header-kicker">{view === 'admin' ? 'Administration' : 'Student view'}</span><strong>{today}</strong></div>
          <div className="header-actions"><button className="icon-button" onClick={loadStudents} aria-label="Refresh">↻</button><button className="view-switch" onClick={() => account.role === 'ADMIN' && setView(view === 'admin' ? 'students' : 'admin')}><span className="status-dot" />{account.role === 'ADMIN' ? (view === 'admin' ? 'Admin view' : 'Student view') : 'Student view'}{account.role === 'ADMIN' && <b>⌄</b>}</button></div>
        </header>

        {error && <div className="notice error"><span>!</span>{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        {notice && <div className="notice success"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

        {view === 'admin' ? (
          <>
            <section className="hero-row">
              <div><span className="overline">DAILY REGISTER · WEEK 42</span><h1>Good morning, Alex.</h1><p>{students.length} students are on today’s attendance register.</p></div>
              <div className="hero-actions"><button className="secondary-button" onClick={exportReport}>Export CSV</button><button className="primary-button" onClick={() => setModalOpen(true)}>＋ Add student</button></div>
            </section>

            <section className="pulse-grid">
              <article className="pulse-card featured"><div className="pulse-label"><span>Attendance pulse</span><small>Today</small></div><div className="pulse-number">{attendance}<sup>%</sup></div><div className="pulse-caption"><span>↑ 3.2%</span> from last Friday</div><div className="pulse-bars" aria-hidden="true">{[42,56,48,67,62,79,71,84,76,88,82,attendance].map((height,index) => <i key={index} style={{height: `${height}%`}} />)}</div></article>
              <article className="stat-card"><div className="stat-icon present">✓</div><span>Present</span><strong>{counts.PRESENT}</strong><small>{counts.PRESENT ? 'Checked in' : 'No check-ins yet'}</small></article>
              <article className="stat-card"><div className="stat-icon late">◷</div><span>Arriving late</span><strong>{counts.LATE}</strong><small>Before 10:00 AM</small></article>
              <article className="stat-card"><div className="stat-icon away">↗</div><span>Remote / away</span><strong>{counts.REMOTE + counts.ABSENT}</strong><small>{counts.REMOTE} remote · {counts.ABSENT} absent</small></article>
            </section>

            <section className="register-section">
              <div className="register-heading"><div><span className="overline">TODAY’S REGISTER</span><h2>Student attendance</h2></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or ID" /></label></div>
              <div className="register-controls"><div className="filter-pills">{[['ALL','Everyone'],['PRESENT','Present'],['LATE','Late'],['ABSENT','Absent'],['REMOTE','Remote']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<span>{key === 'ALL' ? students.length : counts[key]}</span></button>)}</div><span>{visible.length} records</span></div>
              <div className="student-table"><div className="table-head"><span>STUDENT</span><span>COURSE</span><span>CHECK-IN</span><span>STATUS</span><span /></div>
                {loading ? <div className="empty-row">Reading the register…</div> : visible.map((student) => (
                  <div className="table-row" key={student.id} onClick={() => setSelectedId(student.id)}>
                    <div className="student-name"><span className={`student-avatar tone-${student.teamColor}`}>{student.initials || initials(student.name)}</span><div><strong>{student.name}</strong><small>{student.studentId || `SA-${String(student.id).padStart(4,'0')}`}</small></div></div>
                    <div><strong className="course-name">{student.role}</strong><small>{student.department}</small></div>
                    <strong className={student.status === 'LATE' ? 'late-time' : 'check-time'}>{student.checkIn || '—'}</strong>
                    <select className={`status-select status-${student.status.toLowerCase()}`} value={student.status} onChange={(event) => updateStatus(student.id, event.target.value)} aria-label={`Update ${student.name}`}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="REMOTE">Remote</option></select>
                    <button className="row-action" onClick={() => setSelectedId(student.id)} aria-label={`View ${student.name}`}>›</button>
                  </div>
                ))}
                {!loading && !visible.length && <div className="empty-row">No students match this view.</div>}
              </div>
            </section>
          </>
        ) : (
          <section className="student-view">
            <div className="student-hero"><div><span className="overline">STUDENT SELF-SERVICE</span><h1>{selected?.name ?? 'Student portal'}</h1><p>{selected?.studentId || 'Choose a student to preview their portal'}</p></div><div className="today-chip"><span>Today</span><strong>{selected?.status ? selected.status.toLowerCase() : '—'}</strong></div></div>
            {selected && <><div className="profile-layout"><article className="identity-card"><div className={`student-avatar large tone-${selected.teamColor}`}>{selected.initials || initials(selected.name)}</div><h2>{selected.name}</h2><p>{selected.role}</p><dl><div><dt>Department</dt><dd>{selected.department}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{selected.phone || 'Not provided'}</dd></div></dl></article><article className="week-card"><div className="card-title"><div><span className="overline">THIS WEEK</span><h2>Attendance rhythm</h2></div><strong>{attendance}%</strong></div><div className="week-list">{['Mon','Tue','Wed','Thu','Fri'].map((day,index) => <div key={day}><span>{day}</span><i className={index === 4 ? 'today' : ''}><b /></i><small>{index === 4 ? selected.status : index === 2 ? 'LATE' : 'PRESENT'}</small></div>)}</div></article></div><div className="student-actions"><button onClick={() => setView('admin')}>Return to admin</button><button onClick={() => setModalOpen(true)} className="primary-button">Add another student</button></div></>}
          </section>
        )}
      </main>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="overline">NEW REGISTER ENTRY</span><h2 id="modal-title">Add a student</h2></div><button onClick={() => setModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={addStudent}><div className="form-grid"><label>Full name *<input required value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} placeholder="Student name" /></label><label>Student ID<input value={form.studentId} onChange={(event) => setForm({...form, studentId: event.target.value})} placeholder="SA-0013" /></label><label>Course / role *<input required value={form.role} onChange={(event) => setForm({...form, role: event.target.value})} placeholder="Computer science" /></label><label>Department *<input required value={form.department} onChange={(event) => setForm({...form, department: event.target.value})} placeholder="Engineering" /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} placeholder="student@campus.edu" /></label><label>Phone number<input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} placeholder="+91 98765 43210" /></label><label>Status<select value={form.status} onChange={(event) => setForm({...form, status: event.target.value})}>{statusOptions.map((status) => <option value={status} key={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Adding…' : 'Add student'}</button></div></form></section></div>}
    </div>
  )
}

export default App
