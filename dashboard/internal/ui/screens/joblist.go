// Package screens contains the Bubble Tea UI screens.
package screens

import (
	"fmt"
	"sort"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/naukriclear/dashboard/internal/model"
	"github.com/naukriclear/dashboard/internal/theme"
)

// Messages emitted to the main app model.

// JobListClosedMsg is emitted when the user quits.
type JobListClosedMsg struct{}

// JobListOpenURLMsg requests the main app to open a URL in the browser.
type JobListOpenURLMsg struct{ URL string }

// JobListUpdateStatusMsg requests a status update for a job.
type JobListUpdateStatusMsg struct {
	URL    string
	Status string
}

// JobListRefreshMsg requests a full data reload from disk.
type JobListRefreshMsg struct{}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const (
	tabAll     = "all"
	tabPending = "pending"
	tabApplied = "applied"
	tabSkip    = "skip"
)

type tabDef struct{ filter, label string }

var allTabs = []tabDef{
	{tabAll, "ALL"},
	{tabPending, "PENDING"},
	{tabApplied, "APPLIED"},
	{tabSkip, "SKIP"},
}

// ── Sort modes ────────────────────────────────────────────────────────────────

const (
	sortDate    = "date"
	sortCompany = "company"
	sortRole    = "role"
	sortSource  = "source"
)

var sortCycle = []string{sortDate, sortCompany, sortRole, sortSource}

// ── Model ─────────────────────────────────────────────────────────────────────

// JobListModel is the Bubble Tea model for the main job-browser screen.
type JobListModel struct {
	all      []model.Job
	filtered []model.Job
	metrics  model.Metrics
	cursor   int
	scroll   int
	tab      int
	sortMode string
	search   bool
	query    string
	width    int
	height   int
	theme    theme.Theme
}

// NewJobListModel initialises the model with data and dimensions.
func NewJobListModel(t theme.Theme, jobs []model.Job, metrics model.Metrics, width, height int) JobListModel {
	m := JobListModel{
		theme:    t,
		all:      jobs,
		metrics:  metrics,
		sortMode: sortDate,
		width:    width,
		height:   height,
	}
	m.refilter()
	return m
}

// WithReloadedData returns a copy with fresh data applied.
func (m JobListModel) WithReloadedData(jobs []model.Job, metrics model.Metrics) JobListModel {
	m.all = jobs
	m.metrics = metrics
	m.refilter()
	if m.cursor >= len(m.filtered) && len(m.filtered) > 0 {
		m.cursor = len(m.filtered) - 1
	}
	return m
}

// Resize updates terminal dimensions.
func (m *JobListModel) Resize(w, h int) { m.width = w; m.height = h }

// Init implements tea.Model.
func (m JobListModel) Init() tea.Cmd { return nil }

// Update handles keyboard input and messages.
func (m JobListModel) Update(msg tea.Msg) (JobListModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.search {
			return m.handleSearchKey(msg)
		}
		return m.handleKey(msg)
	}
	return m, nil
}

func (m JobListModel) handleKey(msg tea.KeyMsg) (JobListModel, tea.Cmd) {
	switch msg.String() {

	// ── Quit ──────────────────────────────────────────────────────────
	case "q", "ctrl+c":
		return m, func() tea.Msg { return JobListClosedMsg{} }

	// ── Navigation ────────────────────────────────────────────────────
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
			m.clampScroll()
		}
	case "down", "j":
		if m.cursor < len(m.filtered)-1 {
			m.cursor++
			m.clampScroll()
		}
	case "g", "home":
		m.cursor, m.scroll = 0, 0
	case "G", "end":
		m.cursor = len(m.filtered) - 1
		m.clampScroll()
	case "pgup", "ctrl+u":
		m.cursor -= m.listHeight() / 2
		if m.cursor < 0 {
			m.cursor = 0
		}
		m.clampScroll()
	case "pgdown", "ctrl+d":
		m.cursor += m.listHeight() / 2
		if m.cursor >= len(m.filtered) {
			m.cursor = len(m.filtered) - 1
		}
		m.clampScroll()

	// ── Tab switching ─────────────────────────────────────────────────
	case "left", "h":
		if m.tab > 0 {
			m.tab--
			m.cursor, m.scroll = 0, 0
			m.refilter()
		}
	case "right", "l":
		if m.tab < len(allTabs)-1 {
			m.tab++
			m.cursor, m.scroll = 0, 0
			m.refilter()
		}

	// ── Sort ──────────────────────────────────────────────────────────
	case "s":
		for i, s := range sortCycle {
			if s == m.sortMode {
				m.sortMode = sortCycle[(i+1)%len(sortCycle)]
				break
			}
		}
		m.refilter()

	// ── Search ────────────────────────────────────────────────────────
	case "/":
		m.search = true

	// ── Refresh ───────────────────────────────────────────────────────
	case "r":
		return m, func() tea.Msg { return JobListRefreshMsg{} }

	// ── Actions ───────────────────────────────────────────────────────
	case "o":
		if len(m.filtered) > 0 {
			u := m.filtered[m.cursor].URL
			return m, func() tea.Msg { return JobListOpenURLMsg{URL: u} }
		}
	case "a":
		return m.emitStatus("applied")
	case "S":
		return m.emitStatus("skip")
	case "i":
		return m.emitStatus("pending")
	}

	return m, nil
}

func (m JobListModel) emitStatus(status string) (JobListModel, tea.Cmd) {
	if len(m.filtered) == 0 {
		return m, nil
	}
	u := m.filtered[m.cursor].URL
	return m, func() tea.Msg { return JobListUpdateStatusMsg{URL: u, Status: status} }
}

func (m JobListModel) handleSearchKey(msg tea.KeyMsg) (JobListModel, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.search = false
		m.query = ""
		m.refilter()
	case "enter":
		m.search = false
		m.refilter()
	case "ctrl+u":
		m.query = ""
		m.refilter()
	case "backspace":
		if len(m.query) > 0 {
			m.query = m.query[:len(m.query)-1]
			m.refilter()
		}
	default:
		if len(msg.Runes) > 0 {
			m.query += string(msg.Runes)
			m.refilter()
		}
	}
	return m, nil
}

func (m *JobListModel) refilter() {
	filter := allTabs[m.tab].filter
	q := strings.ToLower(m.query)

	var out []model.Job
	for _, j := range m.all {
		if filter != tabAll && j.Status != filter {
			continue
		}
		if q != "" {
			hay := strings.ToLower(j.Company + " " + j.Title + " " + j.Source + " " + model.SourceAbbrev(j.Source))
			if !strings.Contains(hay, q) {
				continue
			}
		}
		out = append(out, j)
	}

	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		switch m.sortMode {
		case sortCompany:
			if a.Company != b.Company {
				return a.Company < b.Company
			}
			return a.Date > b.Date
		case sortRole:
			if a.Title != b.Title {
				return a.Title < b.Title
			}
			return a.Date > b.Date
		case sortSource:
			if a.Source != b.Source {
				return a.Source < b.Source
			}
			return a.Date > b.Date
		default: // sortDate
			if a.Date != b.Date {
				return a.Date > b.Date
			}
			return a.Company < b.Company
		}
	})

	m.filtered = out
	if m.cursor >= len(m.filtered) {
		m.cursor = max(0, len(m.filtered)-1)
	}
}

// ── View ──────────────────────────────────────────────────────────────────────

func (m JobListModel) View() string {
	t := m.theme
	w := m.width

	dim := lipgloss.NewStyle().Foreground(t.Subtext)
	key := lipgloss.NewStyle().Foreground(t.Blue).Bold(true)
	sep := strings.Repeat("─", w)

	var b strings.Builder

	// ── Stats header ──────────────────────────────────────────────────
	header := lipgloss.NewStyle().
		Background(t.Surface).Foreground(t.Text).Bold(true).Width(w).Padding(0, 1).
		Render(fmt.Sprintf("NaukriClear Dashboard   %s total  %s pending  %s applied  %s skipped",
			lipgloss.NewStyle().Foreground(t.Text).Bold(true).Render(fmt.Sprintf("%d", m.metrics.Total)),
			lipgloss.NewStyle().Foreground(t.Sky).Render(fmt.Sprintf("%d", m.metrics.Pending)),
			lipgloss.NewStyle().Foreground(t.Green).Render(fmt.Sprintf("%d", m.metrics.Applied)),
			dim.Render(fmt.Sprintf("%d", m.metrics.Skip)),
		))
	b.WriteString(header + "\n")

	// ── Tab bar ───────────────────────────────────────────────────────
	for i, tb := range allTabs {
		s := lipgloss.NewStyle().Padding(0, 2)
		if i == m.tab {
			s = s.Background(t.Blue).Foreground(t.Base).Bold(true)
		} else {
			s = s.Foreground(t.Subtext)
		}
		b.WriteString(s.Render(tb.label))
	}
	b.WriteByte('\n')

	// ── Sort / search bar ─────────────────────────────────────────────
	if m.search {
		b.WriteString(fmt.Sprintf("  / %s_\n", m.query))
	} else if m.query != "" {
		b.WriteString(dim.Render(fmt.Sprintf("  filter: %q  (esc to clear)", m.query)) + "\n")
	} else {
		b.WriteString(dim.Render(fmt.Sprintf("  sort: %-8s  [s to cycle]", m.sortMode)) + "\n")
	}

	// ── Column header ─────────────────────────────────────────────────
	b.WriteString(dim.Render(sep) + "\n")
	rw := m.roleWidth()
	b.WriteString(
		"  " +
			colHead(t, "DATE", 11) +
			colHead(t, "COMPANY", 22) +
			colHead(t, "ROLE", rw) +
			colHeadR(t, "SRC", 6) +
			colHeadR(t, "STATUS", 9) +
			"\n",
	)
	b.WriteString(dim.Render(sep) + "\n")

	// ── Job rows ──────────────────────────────────────────────────────
	lh := m.listHeight()
	start := m.scroll
	end := start + lh
	if end > len(m.filtered) {
		end = len(m.filtered)
	}

	if len(m.filtered) == 0 {
		b.WriteString(dim.Render("  No jobs match this filter.\n"))
	}

	for i := start; i < end; i++ {
		j := m.filtered[i]
		selected := i == m.cursor
		b.WriteString(m.renderRow(j, selected, rw) + "\n")
	}

	// Fill unused rows so the help bar stays pinned
	for i := end - start; i < lh; i++ {
		b.WriteByte('\n')
	}

	// ── Help bar ──────────────────────────────────────────────────────
	b.WriteString(dim.Render(sep) + "\n")
	b.WriteString(dim.Render(fmt.Sprintf(
		"  %s browser  %s applied  %s skip  %s pending  %s search  %s refresh  %s quit",
		key.Render("o"), key.Render("a"), key.Render("S"), key.Render("i"),
		key.Render("/"), key.Render("r"), key.Render("q"),
	)))

	return b.String()
}

func (m JobListModel) renderRow(j model.Job, selected bool, rw int) string {
	t := m.theme

	prefix := "  "
	if selected {
		prefix = lipgloss.NewStyle().Foreground(t.Blue).Bold(true).Render("▶ ")
	}

	textColor := t.Text
	if selected {
		textColor = t.Text
	}

	dateStr := cell(textColor, j.Date, 11)
	companyStr := cellBold(t, j.Company, 22, selected)
	roleStr := cell(textColor, truncate(j.Title, rw-1), rw)
	srcStr := lipgloss.NewStyle().Width(6).Align(lipgloss.Right).Foreground(t.Mauve).Render(model.SourceAbbrev(j.Source))

	var statusColor lipgloss.Color
	switch j.Status {
	case "applied":
		statusColor = t.Green
	case "skip":
		statusColor = t.Red
	default:
		statusColor = t.Subtext
	}
	statusStr := lipgloss.NewStyle().Width(9).Align(lipgloss.Right).Foreground(statusColor).Render(strings.ToUpper(j.Status))

	row := prefix + dateStr + companyStr + roleStr + srcStr + statusStr
	if selected {
		row = lipgloss.NewStyle().Background(t.Surface).Width(m.width).Render(row)
	}
	return row
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (m JobListModel) listHeight() int {
	// header(1) + tabs(1) + sortbar(1) + sep(1) + colhdr(1) + sep(1) + sep(1) + helpbar(1) = 8
	h := m.height - 8
	if h < 1 {
		return 1
	}
	return h
}

func (m JobListModel) roleWidth() int {
	// 2(prefix) + 11(date) + 22(company) + 6(src) + 9(status) = 50
	w := m.width - 2 - 11 - 22 - 6 - 9
	if w < 20 {
		return 20
	}
	return w
}

func (m *JobListModel) clampScroll() {
	h := m.listHeight()
	if m.cursor < m.scroll {
		m.scroll = m.cursor
	}
	if m.cursor >= m.scroll+h {
		m.scroll = m.cursor - h + 1
	}
	if m.scroll < 0 {
		m.scroll = 0
	}
}

func colHead(t theme.Theme, label string, w int) string {
	return lipgloss.NewStyle().Width(w).Foreground(t.Subtext).Bold(true).Render(label)
}

func colHeadR(t theme.Theme, label string, w int) string {
	return lipgloss.NewStyle().Width(w).Foreground(t.Subtext).Bold(true).Align(lipgloss.Right).Render(label)
}

func cell(color lipgloss.Color, s string, w int) string {
	return lipgloss.NewStyle().Width(w).Foreground(color).Render(truncate(s, w-1))
}

func cellBold(t theme.Theme, s string, w int, bold bool) string {
	st := lipgloss.NewStyle().Width(w).Foreground(t.Text)
	if bold {
		st = st.Bold(true)
	}
	return st.Render(truncate(s, w-1))
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 1 {
		return "…"
	}
	return s[:maxLen-1] + "…"
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
