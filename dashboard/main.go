package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/naukriclear/dashboard/internal/data"
	"github.com/naukriclear/dashboard/internal/model"
	"github.com/naukriclear/dashboard/internal/theme"
	"github.com/naukriclear/dashboard/internal/ui/screens"
)

// ── App model ─────────────────────────────────────────────────────────────────

type appModel struct {
	jobList screens.JobListModel
	dir     string
}

func newAppModel(t theme.Theme, dir string, width, height int) appModel {
	jobs := data.ParseJobs(dir)
	metrics := model.ComputeMetrics(jobs)
	return appModel{
		dir:     dir,
		jobList: screens.NewJobListModel(t, jobs, metrics, width, height),
	}
}

func (m appModel) Init() tea.Cmd { return nil }

func (m appModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		m.jobList.Resize(msg.Width, msg.Height)
		return m, nil

	// Delegate screen messages.
	case screens.JobListClosedMsg:
		return m, tea.Quit

	case screens.JobListOpenURLMsg:
		if err := openWithDefaultApp(msg.URL); err != nil {
			// Not fatal — just continue.
			_ = err
		}
		return m, nil

	case screens.JobListUpdateStatusMsg:
		if err := data.UpdateStatus(m.dir, msg.URL, msg.Status); err != nil {
			_ = err
		}
		// Reload so the UI reflects the persisted change.
		jobs := data.ParseJobs(m.dir)
		metrics := model.ComputeMetrics(jobs)
		m.jobList = m.jobList.WithReloadedData(jobs, metrics)
		return m, nil

	case screens.JobListRefreshMsg:
		jobs := data.ParseJobs(m.dir)
		metrics := model.ComputeMetrics(jobs)
		m.jobList = m.jobList.WithReloadedData(jobs, metrics)
		return m, nil
	}

	// Forward everything else into the screen.
	var cmd tea.Cmd
	m.jobList, cmd = m.jobList.Update(msg)
	return m, cmd
}

func (m appModel) View() string {
	return m.jobList.View()
}

// ── Entry point ───────────────────────────────────────────────────────────────

func main() {
	themeFlag := flag.String("theme", "auto", "Theme: auto | catppuccin-mocha | catppuccin-latte")
	dirFlag := flag.String("dir", "", "Project directory containing data/ (defaults to parent of dashboard/)")
	flag.Parse()

	dir := *dirFlag
	if dir == "" {
		// Default: the directory that contains the dashboard/ binary, i.e. the project root.
		exe, err := os.Executable()
		if err != nil {
			fmt.Fprintln(os.Stderr, "nc-dashboard: cannot locate executable:", err)
			os.Exit(1)
		}
		// Walk up past dashboard/
		dir = filepath.Dir(filepath.Dir(exe))
	}

	t := theme.NewTheme(*themeFlag)

	p := tea.NewProgram(
		newAppModel(t, dir, 80, 24),
		tea.WithAltScreen(),
	)
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "nc-dashboard:", err)
		os.Exit(1)
	}
}
